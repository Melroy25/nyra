import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

// POST /api/auth/login
// Body: { email, password }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const supabase = supabaseAdmin();

  try {
    // 1. Sign in via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*, notification_settings(*)')
      .eq('auth_id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // 3. Fetch connected partner info if any
    let connectedPartner = null;
    if (userProfile.connected_partner_id) {
      const { data: partner } = await supabase
        .from('users')
        .select('id, name, email, role, partner_code')
        .eq('id', userProfile.connected_partner_id)
        .single();
      connectedPartner = partner;
    }

    // 4. Sign JWT
    const token = jwt.sign(
      {
        userId: userProfile.id,
        email,
        role: userProfile.role,
        authId: authData.user.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
        age: userProfile.age,
        dateOfBirth: userProfile.date_of_birth,
        cycleLength: userProfile.cycle_length,
        periodDuration: userProfile.period_duration,
        goals: userProfile.goals || [],
        partnerCode: userProfile.partner_code,
        connectedPartnerId: userProfile.connected_partner_id,
        connectedPartner,
        onboardingCompleted: userProfile.onboarding_completed,
        avatarUrl: userProfile.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
