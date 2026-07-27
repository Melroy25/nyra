import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET    /api/chat/messages?threadId=xxx → fetch messages
// POST   /api/chat/messages              → send message
// PATCH  /api/chat/messages              → add reaction / edit message text
// DELETE /api/chat/messages              → delete message(s) / clear chat

async function resolveThread(supabase: any, userId: string, connectedPartnerId?: string | null) {
  if (connectedPartnerId) {
    const { data: shared } = await supabase
      .from('chat_threads')
      .select('id')
      .or(
        `and(user_id.eq.${userId},partner_id.eq.${connectedPartnerId}),and(user_id.eq.${connectedPartnerId},partner_id.eq.${userId})`
      )
      .maybeSingle();

    if (shared) return shared.id;

    const { data: created } = await supabase
      .from('chat_threads')
      .insert({ user_id: userId, partner_id: connectedPartnerId, title: 'Private Partner Chat' })
      .select('id')
      .single();
    return created?.id ?? null;
  }

  // Fallback: find any thread for this user
  const { data: fallback } = await supabase
    .from('chat_threads')
    .select('id')
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .maybeSingle();

  if (fallback) return fallback.id;

  const { data: created } = await supabase
    .from('chat_threads')
    .insert({ user_id: userId, title: 'Private Partner Chat' })
    .select('id')
    .single();
  return created?.id ?? null;
}

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    let { threadId } = req.query;

    if (!threadId || threadId === 'auto') {
      const { data: profile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      const tid = await resolveThread(supabase, authUser.userId, profile?.connected_partner_id);
      if (!tid) return res.status(200).json({ messages: [], threadId: null });
      threadId = tid;
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*, sender:sender_id(id, name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });
    return res.status(200).json({ messages: messages || [], threadId });
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let { threadId, text, sticker, mediaUrl, mediaType } = req.body;

    if (!threadId || threadId === 'auto') {
      const { data: profile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      const tid = await resolveThread(supabase, authUser.userId, profile?.connected_partner_id);
      if (!tid) return res.status(400).json({ error: 'Could not resolve chat thread.' });
      threadId = tid;
    }

    if (!text && !sticker && !mediaUrl) {
      return res.status(400).json({ error: 'Message content, sticker, or media attachment is required.' });
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: authUser.userId,
        text: text || null,
        sticker: sticker || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select('*, sender:sender_id(id, name, avatar_url)')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to send message' });
    return res.status(201).json({ message, threadId });
  }

  // ── PATCH (reaction / edit) ───────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { messageId, reaction, text: editedText } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId is required' });

    const updatePayload: Record<string, any> = {};
    if (reaction !== undefined) updatePayload.reaction = reaction;
    if (editedText !== undefined) { updatePayload.text = editedText; updatePayload.is_edited = true; }

    const { data, error } = await supabase
      .from('chat_messages')
      .update(updatePayload)
      .eq('id', messageId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update message' });
    return res.status(200).json({ message: data });
  }

  // ── DELETE (single message OR clear thread) ──────────────────────────────
  if (req.method === 'DELETE') {
    const { messageId, threadId, clearForMe } = req.body;

    if (messageId) {
      // Delete a single message (only if sender)
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', authUser.userId);
      if (error) return res.status(500).json({ error: 'Failed to delete message' });
      return res.status(200).json({ success: true });
    }

    if (threadId) {
      if (clearForMe) {
        // Soft-delete: only remove sender's own messages
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('thread_id', threadId)
          .eq('sender_id', authUser.userId);
        if (error) return res.status(500).json({ error: 'Failed to clear your messages' });
        return res.status(200).json({ success: true, cleared: 'mine' });
      } else {
        // Clear all messages in thread (both sides)
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('thread_id', threadId);
        if (error) return res.status(500).json({ error: 'Failed to clear all messages' });
        return res.status(200).json({ success: true, cleared: 'all' });
      }
    }

    return res.status(400).json({ error: 'messageId or threadId required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
