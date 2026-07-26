import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET    /api/ai/threads  → Fetch all AI threads for user
// POST   /api/ai/threads  → Create new AI thread
// PATCH  /api/ai/threads  → Rename AI thread
// DELETE /api/ai/threads  → Delete AI thread

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data: threads, error } = await supabase
      .from('ai_threads')
      .select('*, ai_messages(*)')
      .eq('user_id', authUser.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch AI threads' });
    return res.status(200).json({ threads: threads || [] });
  }

  if (req.method === 'POST') {
    const { title = 'New Conversation' } = req.body;

    const { data: newThread, error } = await supabase
      .from('ai_threads')
      .insert({
        user_id: authUser.userId,
        title,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create AI thread' });

    // Insert welcome message
    await supabase.from('ai_messages').insert({
      thread_id: newThread.id,
      role: 'assistant',
      content: "Hello! 🌸 I'm Nyra AI, your cycle wellness & self-care assistant. How can I help you today?",
    });

    return res.status(201).json({ thread: newThread });
  }

  if (req.method === 'PATCH') {
    const { threadId, title } = req.body;
    if (!threadId || !title) return res.status(400).json({ error: 'threadId and title required' });

    const { data: updated, error } = await supabase
      .from('ai_threads')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .eq('user_id', authUser.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to rename thread' });
    return res.status(200).json({ thread: updated });
  }

  if (req.method === 'DELETE') {
    const threadId = (req.query.threadId as string) || req.body?.threadId;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const { error } = await supabase
      .from('ai_threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', authUser.userId);

    if (error) return res.status(500).json({ error: 'Failed to delete thread' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
