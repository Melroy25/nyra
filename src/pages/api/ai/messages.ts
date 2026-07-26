import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/ai/messages?threadId=xxx
async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { threadId } = req.query;
  if (!threadId) return res.status(400).json({ error: 'threadId is required' });

  const supabase = supabaseAdmin();

  const { data: messages, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch AI messages' });
  return res.status(200).json({ messages: messages || [] });
}

export default withAuth(handler);
