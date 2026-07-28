import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { authRateLimiter, getClientIp } from '../../../lib/rateLimit';
import { isValidEmail, isValidPassword, sanitizeString } from '../../../lib/validator';
import { logger } from '../../../lib/logger';

// POST /api/auth/register
// Body: { email, password, name, role }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate Limiting
  const allowed = await authRateLimiter(req, res, req.body?.email);
  if (!allowed) return;

  const { email: emailRaw, password, name: nameRaw, role = 'user' } = req.body || {};
  if (!emailRaw || !password || !nameRaw) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  if (!isValidEmail(emailRaw)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
  }

  const email = emailRaw.trim().toLowerCase();
  const name = sanitizeString(nameRaw, 60);
  const allowedRoles = ['user', 'partner'];
  const sanitizedRole = allowedRoles.includes(role) ? role : 'user';

  const supabase = supabaseAdmin();

  try {
    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(400).json({ error: 'Registration failed. Please check your details.' });
    }

    // 2. Generate unique partner code
    const partnerCode = `NYRA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 3. Create or update user profile in public.users (resilient against duplicate emails/auth_ids)
    let userProfile = null;

    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          auth_id: authData.user.id,
          name,
          role: sanitizedRole,
          partner_code: existingProfile.partner_code || partnerCode,
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (!updateError && updatedProfile) {
        userProfile = updatedProfile;
      }
    }

    if (!userProfile) {
      const { data: createdProfile, error: insertError } = await supabase
        .from('users')
        .upsert(
          {
            auth_id: authData.user.id,
            email,
            name,
            role: sanitizedRole,
            partner_code: partnerCode,
          },
          { onConflict: 'email' }
        )
        .select()
        .single();

      if (insertError) {
        logger.error('Failed to create user profile in DB', insertError);
        const { data: fallbackProfile } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (fallbackProfile) {
          userProfile = fallbackProfile;
        } else {
          await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
          return res.status(400).json({ error: insertError.message || 'Failed to complete registration profile.' });
        }
      } else {
        userProfile = createdProfile;
      }
    }

    // 4. Create default notification settings
    await supabase.from('notification_settings').insert({ user_id: userProfile.id });

    // 5. Sign JWT for session
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET missing during registration');
      return res.status(500).json({ error: 'Server authentication configuration error.' });
    }

    const token = jwt.sign(
      { userId: userProfile.id, email, role: sanitizedRole, authId: authData.user.id },
      secret,
      { expiresIn: '30d' }
    );

    logger.info('New user registered successfully', { userId: userProfile.id, ip: getClientIp(req) });

    return res.status(201).json({
      token,
      user: {
        id: userProfile.id,
        email,
        name,
        role: sanitizedRole,
        partnerCode,
        onboardingCompleted: false,
      },
    });
  } catch (err: any) {
    logger.error('Register handler unexpected error', err);
    return res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
}
