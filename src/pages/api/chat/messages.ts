import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

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
  const supabase = supabaseAdmin();

  // ── GET: fetch messages + partner info ────────────────────────────────────
  if (req.method === 'GET') {
    let { threadId } = req.query;

    // Update active user's presence/activity timestamp
    try {
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', authUser.userId);
    } catch (e) {}

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

    // Mark unread messages sent to this user as read
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .neq('sender_id', authUser.userId);
    } catch (e) {}

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*, sender:sender_id(id, name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[chat GET] fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Fetch partner info with updated_at timestamp for real-time online status & read receipts
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, avatar_url, connected_partner_id')
      .eq('id', authUser.userId)
      .single();

    let partnerInfo = null;
    if (profile?.connected_partner_id) {
      const { data: partner } = await supabase
        .from('users')
        .select('id, name, avatar_url, updated_at')
        .eq('id', profile.connected_partner_id)
        .maybeSingle();
      partnerInfo = partner ?? null;
    }

    return res.status(200).json({ messages: messages || [], threadId, partnerInfo });
  }

  // ── POST: send message ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let { threadId, text, sticker, mediaUrl, mediaType } = req.body;

    if (!text && !sticker && !mediaUrl) {
      return res.status(400).json({ error: 'No content provided.' });
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
    if (text) insertPayload.text = text;
    if (sticker) insertPayload.sticker = sticker;
    if (mediaUrl) insertPayload.media_url = mediaUrl;
    if (mediaType) insertPayload.media_type = mediaType;

    let { data: message, error } = await supabase
      .from('chat_messages')
      .insert(insertPayload)
      .select('*, sender:sender_id(id, name, avatar_url)')
      .single();

    // If media columns are missing from schema, retry without them
    if (error && (error.message?.includes('media_type') || error.message?.includes('media_url'))) {
      console.warn('[chat POST] media columns missing, retrying without media fields');
      const fallbackPayload: Record<string, any> = {
        thread_id: threadId,
        sender_id: authUser.userId,
      };
      if (text) fallbackPayload.text = text;
      if (sticker) fallbackPayload.sticker = sticker;
      const { data: msg2, error: err2 } = await supabase
        .from('chat_messages')
        .insert(fallbackPayload)
        .select('*, sender:sender_id(id, name, avatar_url)')
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
      // Only set is_edited if the column exists — safe to try
      updatePayload.is_edited = true;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .update(updatePayload)
      .eq('id', messageId)
      .select('*, sender:sender_id(id, name, avatar_url)')
      .single();

    if (error) {
      // If is_edited column doesn't exist, retry without it
      if (error.message?.includes('is_edited') && editedText !== undefined) {
        const fallback: Record<string, any> = { text: editedText };
        if (reaction !== undefined) fallback.reaction = reaction;
        const { data: d2, error: e2 } = await supabase
          .from('chat_messages')
          .update(fallback)
          .eq('id', messageId)
          .select()
          .single();
        if (e2) return res.status(500).json({ error: e2.message });
        return res.status(200).json({ message: d2 });
      }
      console.error('[chat PATCH] error:', error);
      return res.status(500).json({ error: error.message });
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
