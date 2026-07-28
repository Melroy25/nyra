import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';
import { sendPushToUser } from '../push/send';
import { apiRateLimiter } from '../../../lib/rateLimit';
import { sanitizeString } from '../../../lib/validator';
import { logger } from '../../../lib/logger';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getOrCreateThread(supabase: any, userId: string, connectedPartnerId?: string | null): Promise<string | null> {
  if (connectedPartnerId) {
    // Try to find existing shared thread
    const { data: t1 } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('user_id', userId)
      .eq('partner_id', connectedPartnerId)
      .maybeSingle();
    if (t1?.id) return t1.id;

    const { data: t2 } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('user_id', connectedPartnerId)
      .eq('partner_id', userId)
      .maybeSingle();
    if (t2?.id) return t2.id;

    // Create new shared thread
    const { data: created, error: createErr } = await supabase
      .from('chat_threads')
      .insert({ user_id: userId, partner_id: connectedPartnerId, title: 'Partner Chat' })
      .select('id')
      .single();
    if (createErr) console.error('[chat] thread create error:', createErr);
    return created?.id ?? null;
  }

  // No connected partner — find or create solo thread
  const { data: solo } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .is('partner_id', null)
    .maybeSingle();
  if (solo?.id) return solo.id;

  const { data: created2, error: createErr2 } = await supabase
    .from('chat_threads')
    .insert({ user_id: userId, title: 'Partner Chat' })
    .select('id')
    .single();
  if (createErr2) console.error('[chat] solo thread create error:', createErr2);
  return created2?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const allowed = await apiRateLimiter(req, res, authUser.userId);
  if (!allowed) return;

  const supabase = supabaseAdmin();

  // ── GET: fetch messages + partner info ────────────────────────────────────
  if (req.method === 'GET') {
    let { threadId, markRead, heartbeat } = req.query;

    // Only update user's presence when chat tab is actively open (heartbeat=1)
    // NOT on every background poll — prevents fake "Online" status
    if (heartbeat === '1') {
      try {
        await supabase
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', authUser.userId);
      } catch (e) {}
    }

    if (!threadId || threadId === 'auto') {
      const { data: profile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      const tid = await getOrCreateThread(supabase, authUser.userId, profile?.connected_partner_id);
      if (!tid) return res.status(200).json({ messages: [], threadId: null, partnerInfo: null });
      threadId = tid;
    }

    // Only mark messages as read when the user has the chat tab OPEN (markRead=1)
    // NOT during background polling — prevents premature blue ticks
    if (markRead === '1') {
      try {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('thread_id', threadId)
          .neq('sender_id', authUser.userId)
          .eq('is_read', false);
      } catch (e) {}
    }

    let messages: any[] = [];
    let fetchError: any = null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      messages = data || [];
      fetchError = error;
    } catch (e: any) {
      fetchError = e;
    }

    if (fetchError) {
      console.warn('[chat GET] fetch error, returning empty list:', fetchError.message || fetchError);
      return res.status(200).json({ messages: [], threadId, partnerInfo: null });
    }

    // Fetch partner info with updated_at timestamp for real-time online status & read receipts
    let partnerInfo = null;
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('id, name, avatar_url, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      if (profile?.connected_partner_id) {
        const { data: partner } = await supabase
          .from('users')
          .select('id, name, avatar_url, updated_at')
          .eq('id', profile.connected_partner_id)
          .maybeSingle();
        partnerInfo = partner ?? null;
      }
    } catch (e) {}

    return res.status(200).json({ messages, threadId, partnerInfo, myUserId: authUser.userId });
  }

  // ── POST: send message ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let { threadId, text, sticker, mediaUrl, mediaType, replyTo } = req.body || {};

    if (!text && !sticker && !mediaUrl) {
      return res.status(400).json({ error: 'No content provided.' });
    }

    // Input sanitization & size limits
    if (text && typeof text === 'string' && text.length > 5000) {
      return res.status(400).json({ error: 'Message text exceeds limit of 5000 characters.' });
    }

    // Validate mediaUrl if provided (prevent SSRF/XSS javascript: URLs)
    if (mediaUrl && typeof mediaUrl === 'string') {
      if (!mediaUrl.startsWith('data:') && !mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://') && !mediaUrl.startsWith('/')) {
        return res.status(400).json({ error: 'Invalid media URL scheme.' });
      }
    }

    if (!threadId || threadId === 'auto') {
      const { data: profile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      const tid = await getOrCreateThread(supabase, authUser.userId, profile?.connected_partner_id);
      if (!tid) return res.status(500).json({ error: 'Could not create or find a chat thread.' });
      threadId = tid;
    }

    const insertPayload: Record<string, any> = {
      thread_id: threadId,
      sender_id: authUser.userId,
    };
    if (text) insertPayload.text = sanitizeString(text, 5000);
    if (sticker) insertPayload.sticker = sanitizeString(sticker, 100);
    if (mediaUrl) insertPayload.media_url = mediaUrl;
    if (mediaType) insertPayload.media_type = sanitizeString(mediaType, 50);
    if (replyTo) insertPayload.reply_to = replyTo;

    let { data: message, error } = await supabase
      .from('chat_messages')
      .insert(insertPayload)
      .select('*')
      .single();

    // If media/reply columns are missing from schema, retry without optional columns
    if (error && (error.message?.includes('media_type') || error.message?.includes('media_url') || error.message?.includes('reply_to'))) {
      console.warn('[chat POST] optional columns missing, retrying with fallback payload');
      const fallbackPayload: Record<string, any> = {
        thread_id: threadId,
        sender_id: authUser.userId,
      };
      if (text) fallbackPayload.text = text;
      if (sticker) fallbackPayload.sticker = sticker;
      const { data: msg2, error: err2 } = await supabase
        .from('chat_messages')
        .insert(fallbackPayload)
        .select('*')
        .single();
      if (err2) {
        console.error('[chat POST] fallback insert error:', err2);
        return res.status(500).json({ error: err2.message });
      }
      message = msg2;
      error = null;
    }

    if (error) {
      console.error('[chat POST] insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // ── Server-side Web Push: wake recipient device even when screen is off ──
    try {
      // Find which user in this thread is NOT the sender (the recipient)
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('user_id, partner_id')
        .eq('id', threadId)
        .maybeSingle();

      const recipientId = thread
        ? (thread.user_id === authUser.userId ? thread.partner_id : thread.user_id)
        : null;

      if (recipientId) {
        // Get sender name for notification title
        const { data: sender } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', authUser.userId)
          .maybeSingle();

        const senderName = sender?.name || 'Partner';
        const bodyText = text || (sticker ? 'Sent a sticker 😊' : 'Sent an attachment 📎');

        // Fire-and-forget — don't block the response
        sendPushToUser(recipientId, {
          title: `${senderName} ❤️`,
          body: bodyText,
          icon: sender?.avatar_url || '/logo.png',
          url: '/partner?tab=chat',
          tag: `chat-${message?.id || Date.now()}`,
        }).catch(() => {});
      }
    } catch (pushErr) {
      // Never fail the message send because of push notification error
      console.warn('[chat POST] push notification error:', pushErr);
    }

    return res.status(201).json({ message, threadId });
  }

  // ── PATCH: react or edit ──────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { messageId, reaction, text: editedText } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });

    const updatePayload: Record<string, any> = {};
    if (reaction !== undefined) updatePayload.reaction = reaction;
    if (editedText !== undefined) {
      updatePayload.text = editedText;
      updatePayload.is_edited = true;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .update(updatePayload)
      .eq('id', messageId)
      .select('*')
      .single();

    if (error) {
      // Fallback if is_edited or reaction column doesn't exist yet
      if (editedText !== undefined) {
        const { data: d2, error: e2 } = await supabase
          .from('chat_messages')
          .update({ text: editedText })
          .eq('id', messageId)
          .select()
          .single();
        if (e2) return res.status(500).json({ error: e2.message });
        return res.status(200).json({ message: d2 });
      }
      console.warn('[chat PATCH] error:', error?.message);
      return res.status(200).json({ success: true });
    }
    return res.status(200).json({ message: data });
  }

  // ── DELETE: single message or clear thread ────────────────────────────────
  if (req.method === 'DELETE') {
    const { messageId, threadId, clearForMe } = req.body;

    if (messageId) {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', authUser.userId);
      if (error) {
        console.error('[chat DELETE msg] error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    if (threadId) {
      const q = supabase.from('chat_messages').delete().eq('thread_id', threadId);
      if (clearForMe) q.eq('sender_id', authUser.userId);
      const { error } = await q;
      if (error) {
        console.error('[chat DELETE thread] error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'messageId or threadId required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
