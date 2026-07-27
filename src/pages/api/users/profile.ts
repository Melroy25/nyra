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

// GET  /api/users/profile       → fetch current user's full profile
// PATCH /api/users/profile      → update profile fields
// PUT  /api/users/onboarding    → complete onboarding, update cycle info

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data: rawUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    if (error || !rawUser) return res.status(404).json({ error: 'Profile not found' });

    let connectedPartner = null;
    if (rawUser.connected_partner_id) {
      const { data: partner } = await supabase
        .from('users')
        .select('id, name, email, role, partner_code')
        .eq('id', rawUser.connected_partner_id)
        .maybeSingle();
      connectedPartner = partner;
    }

    // Fallback: if last_period_date missing on user row, pull earliest real period from cycle_logs
    let lastPeriodDate = rawUser.last_period_date || null;
    if (!lastPeriodDate) {
      const { data: firstLog } = await supabase
        .from('cycle_logs')
        .select('date')
        .eq('user_id', authUser.userId)
        .eq('is_period', true)
        .eq('is_predicted', false)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstLog?.date) {
        lastPeriodDate = firstLog.date;
        // Back-fill the users table so future calls are fast
        await supabase
          .from('users')
          .update({ last_period_date: lastPeriodDate })
          .eq('id', authUser.userId);
      }
    }

    const formattedUser = {
      id: rawUser.id,
      email: rawUser.email,
      name: rawUser.name,
      role: rawUser.role,
      age: rawUser.age,
      dateOfBirth: rawUser.date_of_birth,
      cycleLength: rawUser.cycle_length || 28,
      periodDuration: rawUser.period_duration || 5,
      lastPeriodDate,
      goals: rawUser.goals || [],
      partnerCode: rawUser.partner_code,
      connectedPartnerId: rawUser.connected_partner_id,
      connectedPartner,
      onboardingCompleted: rawUser.onboarding_completed || false,
      avatarUrl: rawUser.avatar_url,
    };

    return res.status(200).json({ user: formattedUser });
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

    if (error || !data) return res.status(500).json({ error: error?.message || 'Failed to update profile' });

    const formattedUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      age: data.age,
      dateOfBirth: data.date_of_birth,
      cycleLength: data.cycle_length || 28,
      periodDuration: data.period_duration || 5,
      goals: data.goals || [],
      partnerCode: data.partner_code,
      connectedPartnerId: data.connected_partner_id,
      onboardingCompleted: data.onboarding_completed || false,
      avatarUrl: data.avatar_url,
    };

    return res.status(200).json({ user: formattedUser });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
