import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/daily-logs  → Fetch today's daily log (water intake, water goal)
// POST /api/daily-logs → Upsert today's daily log (add water intake, set goal)

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();
  const todayDate = new Date().toISOString().split('T')[0];

  if (req.method === 'GET') {
    let { data: log } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', authUser.userId)
      .eq('date', todayDate)
      .maybeSingle();

    if (!log) {
      // Create empty record for today if none exists
      const { data: newLog } = await supabase
        .from('daily_logs')
        .insert({
          user_id: authUser.userId,
          date: todayDate,
          water_intake: 0,
          water_goal: 2000,
        })
        .select()
        .single();
      log = newLog;
    }

    return res.status(200).json({ log });
  }

  if (req.method === 'POST') {
    const { waterIntake, waterGoal, mood, energyLevel } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (waterIntake !== undefined) updates.water_intake = waterIntake;
    if (waterGoal !== undefined) updates.water_goal = waterGoal;
    if (mood !== undefined) updates.mood = mood;
    if (energyLevel !== undefined) updates.energy_level = energyLevel;

    const { data: log, error } = await supabase
      .from('daily_logs')
      .upsert(
        {
          user_id: authUser.userId,
          date: todayDate,
          ...updates,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update daily log' });
    return res.status(200).json({ log });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
