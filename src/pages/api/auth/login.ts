import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// POST /api/auth/login
// Body: { email, password }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Use ANON key client for signInWithPassword (this is what Supabase auth requires)
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. Sign in via Supabase Auth using anon client
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData?.user) {
      console.error('Supabase auth error:', authError?.message);
      return res.status(401).json({ error: authError?.message || 'Invalid email or password' });
    }

    const supabase = supabaseAdmin();

    // 2. Fetch user profile using admin client
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError?.message, 'auth_id:', authData.user.id);
      // Profile missing but auth exists — create basic profile
      const partnerCode = `NYRA-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: newProfile } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email: email.trim().toLowerCase(),
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: 'user',
          partner_code: partnerCode,
        })
        .select()
        .single();

      if (!newProfile) {
        return res.status(404).json({ error: 'User profile not found. Please create an account.' });
      }

      const token = jwt.sign(
        { userId: newProfile.id, email: newProfile.email, role: newProfile.role, authId: authData.user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: newProfile.id,
          email: newProfile.email,
          name: newProfile.name,
          role: newProfile.role,
          partnerCode: newProfile.partner_code,
          connectedPartnerId: null,
          connectedPartner: null,
          onboardingCompleted: false,
        },
      });
    }

    // 3. Fetch connected partner info if any
    let connectedPartner = null;
    if (userProfile.connected_partner_id) {
      const { data: partner } = await supabase
        .from('users')
        .select('id, name, email, role, partner_code')
        .eq('id', userProfile.connected_partner_id)
        .maybeSingle();
      connectedPartner = partner;
    }

    // 4. Sign JWT
    const token = jwt.sign(
      {
        userId: userProfile.id,
        email: userProfile.email,
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
        lastPeriodDate: userProfile.last_period_date || null,
        goals: userProfile.goals || [],
        partnerCode: userProfile.partner_code,
        connectedPartnerId: userProfile.connected_partner_id,
        connectedPartner,
        onboardingCompleted: userProfile.onboarding_completed,
        avatarUrl: userProfile.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
