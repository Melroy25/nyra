import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/cycle/logs?month=2025-07  → fetch all logs for a month
// POST /api/cycle/logs                 → upsert a log entry for a date

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { month } = req.query; // format: YYYY-MM

    let query = supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('date', { ascending: true });

    if (month) {
      query = query
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch cycle logs' });
    return res.status(200).json({ logs: data });
  }

  if (req.method === 'POST') {
    const { date, isPeriod, isPredicted, isOvulation, flow, symptoms, mood, notes, severity } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    const { data, error } = await supabase
      .from('cycle_logs')
      .upsert(
        {
          user_id: authUser.userId,
          date,
          is_period: isPeriod ?? false,
          is_predicted: isPredicted ?? false,
          is_ovulation: isOvulation ?? false,
          flow: flow ?? null,
          symptoms: symptoms ?? [],
          mood: mood ?? null,
          notes: notes ?? null,
          severity: severity ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save cycle log' });
    return res.status(200).json({ log: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
