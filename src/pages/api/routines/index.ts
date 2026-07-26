import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET    /api/routines  → List all routines for user
// POST   /api/routines  → Create a new routine
// PATCH  /api/routines  → Toggle completion or update fields
// DELETE /api/routines  → Delete routine

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('time', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch routines' });
    return res.status(200).json({ routines: routines || [] });
  }

  if (req.method === 'POST') {
    const { name, time, frequency = 'Daily', type = 'wellness', amount } = req.body;
    if (!name) return res.status(400).json({ error: 'Routine name is required' });

    const { data: newRoutine, error } = await supabase
      .from('routines')
      .insert({
        user_id: authUser.userId,
        name,
        time: time || '08:00',
        frequency,
        type,
        amount,
        completed: false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create routine' });
    return res.status(201).json({ routine: newRoutine });
  }

  if (req.method === 'PATCH') {
    const { id, completed, name, time, frequency, type, amount } = req.body;
    if (!id) return res.status(400).json({ error: 'Routine ID is required' });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (completed !== undefined) updates.completed = completed;
    if (name !== undefined) updates.name = name;
    if (time !== undefined) updates.time = time;
    if (frequency !== undefined) updates.frequency = frequency;
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = amount;

    const { data: updated, error } = await supabase
      .from('routines')
      .update(updates)
      .eq('id', id)
      .eq('user_id', authUser.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update routine' });
    return res.status(200).json({ routine: updated });
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string) || req.body?.id;
    if (!id) return res.status(400).json({ error: 'Routine ID is required' });

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.userId);

    if (error) return res.status(500).json({ error: 'Failed to delete routine' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
