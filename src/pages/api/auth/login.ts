import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { authRateLimiter, getClientIp } from '../../../lib/rateLimit';
import { isValidEmail, isValidPassword, sanitizeString } from '../../../lib/validator';
import { logger } from '../../../lib/logger';

// POST /api/auth/login
// Body: { email, password }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate Limiting
  const allowed = await authRateLimiter(req, res, req.body?.email);
  if (!allowed) return;

  const emailRaw = req.body?.email;
  const password = req.body?.password;

  if (!emailRaw || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isValidEmail(emailRaw) || !isValidPassword(password)) {
    logger.security('INVALID_LOGIN_INPUT_FORMAT', { ip: getClientIp(req), email: emailRaw });
    return res.status(400).json({ error: 'Invalid email or password format.' });
  }

  const email = emailRaw.trim().toLowerCase();

  // Use ANON key client for signInWithPassword (Supabase auth)
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. Sign in via Supabase Auth using anon client
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      logger.security('FAILED_LOGIN_ATTEMPT', { ip: getClientIp(req), email });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const supabase = supabaseAdmin();

    // 2. Fetch user profile using admin client
    let { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      // Profile missing but auth exists — create basic profile
      const partnerCode = `NYRA-${Math.floor(10000 + Math.random() * 90000)}`;
      const { data: newProfile, error: createProfileErr } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email,
          name: sanitizeString(authData.user.user_metadata?.name || email.split('@')[0], 50),
          role: 'user',
          partner_code: partnerCode,
        })
        .select()
        .single();

      if (createProfileErr || !newProfile) {
        logger.error('Failed to auto-create user profile', createProfileErr);
        return res.status(500).json({ error: 'User profile initialization failed.' });
      }

      userProfile = newProfile;
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

    // 4. Sign JWT with strong secret & standard payload
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is missing from environment variables');
      return res.status(500).json({ error: 'Server authentication configuration error.' });
    }

    const token = jwt.sign(
      {
        userId: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        authId: authData.user.id,
      },
      secret,
      { expiresIn: '30d' }
    );

    logger.info('User logged in successfully', { userId: userProfile.id, ip: getClientIp(req) });

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
    logger.error('Login handler unexpected error', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
