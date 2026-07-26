import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/chat/messages?threadId=xxx → fetch messages for a thread (or auto-find/create thread for connected partner)
// POST /api/chat/messages               → send a new message with text, sticker, or mediaUrl/mediaType

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    let { threadId } = req.query;

    if (!threadId || threadId === 'auto') {
      // 1. Fetch user profile to get connected partner
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      if (!userProfile?.connected_partner_id) {
        return res.status(200).json({ messages: [], threadId: null });
      }

      // 2. Find existing shared thread between user & connected partner
      let { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id')
        .or(`and(user_id.eq.${authUser.userId},partner_id.eq.${userProfile.connected_partner_id}),and(user_id.eq.${userProfile.connected_partner_id},partner_id.eq.${authUser.userId})`)
        .maybeSingle();

      if (!existingThread) {
        // Create shared thread
        const { data: newThread } = await supabase
          .from('chat_threads')
          .insert({
            user_id: authUser.userId,
            partner_id: userProfile.connected_partner_id,
            title: 'Private Partner Chat',
          })
          .select()
          .single();
        existingThread = newThread;
      }

      threadId = existingThread?.id;
    }

    if (!threadId) return res.status(200).json({ messages: [], threadId: null });

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*, sender:sender_id(id, name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });
    return res.status(200).json({ messages: messages || [], threadId });
  }

  if (req.method === 'POST') {
    let { threadId, text, sticker, mediaUrl, mediaType } = req.body;

    if (!threadId || threadId === 'auto') {
      // Auto-resolve thread ID
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, connected_partner_id')
        .eq('id', authUser.userId)
        .single();

      if (!userProfile?.connected_partner_id) {
        return res.status(400).json({ error: 'You are not connected to a partner yet.' });
      }

      let { data: existingThread } = await supabase
        .from('chat_threads')
        .select('id')
        .or(`and(user_id.eq.${authUser.userId},partner_id.eq.${userProfile.connected_partner_id}),and(user_id.eq.${userProfile.connected_partner_id},partner_id.eq.${authUser.userId})`)
        .maybeSingle();

      if (!existingThread) {
        const { data: newThread } = await supabase
          .from('chat_threads')
          .insert({
            user_id: authUser.userId,
            partner_id: userProfile.connected_partner_id,
            title: 'Private Partner Chat',
          })
          .select()
          .single();
        existingThread = newThread;
      }

      threadId = existingThread?.id;
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

  // PATCH: add reaction
  if (req.method === 'PATCH') {
    const { messageId, reaction } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId is required' });

    const { data, error } = await supabase
      .from('chat_messages')
      .update({ reaction })
      .eq('id', messageId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to add reaction' });
    return res.status(200).json({ message: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
