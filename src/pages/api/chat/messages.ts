import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/chat/messages?threadId=xxx → fetch messages for a thread
// POST /api/chat/messages               → send a new message

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { threadId } = req.query;
    if (!threadId) return res.status(400).json({ error: 'threadId is required' });

    // Verify user has access to this thread
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('id, user_id, partner_id')
      .eq('id', threadId)
      .or(`user_id.eq.${authUser.userId},partner_id.eq.${authUser.userId}`)
      .single();

    if (!thread) return res.status(403).json({ error: 'Access denied to this thread' });

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*, sender:sender_id(id, name, avatar_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });
    return res.status(200).json({ messages });
  }

  if (req.method === 'POST') {
    const { threadId, text, sticker } = req.body;
    if (!threadId) return res.status(400).json({ error: 'threadId is required' });
    if (!text && !sticker) return res.status(400).json({ error: 'text or sticker is required' });

    // Verify access
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('id', threadId)
      .or(`user_id.eq.${authUser.userId},partner_id.eq.${authUser.userId}`)
      .single();

    if (!thread) return res.status(403).json({ error: 'Access denied to this thread' });

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: authUser.userId,
        text: text || null,
        sticker: sticker || null,
      })
      .select('*, sender:sender_id(id, name, avatar_url)')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to send message' });
    return res.status(201).json({ message });
  }

  // PATCH: add reaction to message
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
