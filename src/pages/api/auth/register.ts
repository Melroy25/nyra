import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// POST /api/auth/register
// Body: { email, password, name, role }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, role = 'user' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const supabase = supabaseAdmin();

  try {
    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      return res.status(400).json({ error: authError.message });
    }

    // 2. Generate unique partner code
    const partnerCode = `NYRA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 3. Create user profile in public.users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        email,
        name,
        role,
        partner_code: partnerCode,
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // 4. Create default notification settings
    await supabase.from('notification_settings').insert({ user_id: userProfile.id });

    // 5. Sign JWT for the session
    const token = jwt.sign(
      { userId: userProfile.id, email, role, authId: authData.user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: userProfile.id,
        email,
        name,
        role,
        partnerCode,
        onboardingCompleted: false,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
