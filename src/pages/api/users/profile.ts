import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/users/profile       → fetch current user's full profile
// PATCH /api/users/profile      → update profile fields
// PUT  /api/users/onboarding    → complete onboarding, update cycle info

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });
    return res.status(200).json({ user: data });
  }

  if (req.method === 'PATCH') {
    const { name, age, dateOfBirth, cycleLength, periodDuration, goals, avatarUrl } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (age !== undefined) updates.age = age;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
    if (cycleLength !== undefined) updates.cycle_length = cycleLength;
    if (periodDuration !== undefined) updates.period_duration = periodDuration;
    if (goals !== undefined) updates.goals = goals;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', authUser.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update profile' });
    return res.status(200).json({ user: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
