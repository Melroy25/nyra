import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// POST /api/auth/partner-code-login
// Partner Access requiring: { partnerCode, email, password, name }
// 1. Authenticate partner (or auto-create partner account if missing)
// 2. Validate partnerCode exists
// 3. Bidirectionally link both accounts
// 4. Return JWT token for the partner
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { partnerCode, email, password, name } = req.body;

  if (!partnerCode || !email || !password) {
    return res.status(400).json({ error: 'Partner code, email, and password are required.' });
  }

  const supabase = supabaseAdmin();
  const cleanCode = partnerCode.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  // 1. First, check if the partnerCode exists in public.users
  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, name, email, role, partner_code, connected_partner_id')
    .eq('partner_code', cleanCode)
    .maybeSingle();

  if (targetError || !targetUser) {
    return res.status(404).json({ error: 'Invalid partner code. Please double-check the code provided by your partner.' });
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    let authUser = null;

    // Try signing in
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authData?.user) {
      authUser = authData.user;
    } else {
      // Auto-register partner account if sign in failed
      const partnerName = name?.trim() || cleanEmail.split('@')[0];
      const { data: newAuthUser, error: createAuthErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { name: partnerName, role: 'partner' },
      });

      if (createAuthErr || !newAuthUser?.user) {
        return res.status(401).json({ error: authError?.message || 'Invalid email or password.' });
      }

      authUser = newAuthUser.user;
    }

    // Lookup or create partner's profile row in public.users
    let { data: partnerUser } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!partnerUser) {
      const partnerName = name?.trim() || authUser.user_metadata?.name || cleanEmail.split('@')[0];
      const myPartnerCode = `NYRA-${Math.floor(10000 + Math.random() * 90000)}`;

      const { data: createdPartner, error: insertErr } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          email: cleanEmail,
          name: partnerName,
          role: 'partner',
          partner_code: myPartnerCode,
          connected_partner_id: targetUser.id,
          onboarding_completed: true,
        })
        .select()
        .single();

      if (insertErr || !createdPartner) {
        return res.status(500).json({ error: 'Failed to create partner profile record.' });
      }
      partnerUser = createdPartner;
    }

    if (partnerUser.id === targetUser.id) {
      return res.status(400).json({ error: 'You cannot connect to your own partner code.' });
    }

    // 4. Bidirectionally link both accounts
    await supabase
      .from('users')
      .update({ connected_partner_id: targetUser.id, updated_at: new Date().toISOString() })
      .eq('id', partnerUser.id);

    await supabase
      .from('users')
      .update({ connected_partner_id: partnerUser.id, updated_at: new Date().toISOString() })
      .eq('id', targetUser.id);

    // 5. Sign JWT token
    const token = jwt.sign(
      {
        userId: partnerUser.id,
        email: partnerUser.email,
        role: 'partner',
        authId: authUser.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: partnerUser.id,
        email: partnerUser.email,
        name: partnerUser.name,
        role: 'partner',
        partnerCode: partnerUser.partner_code,
        connectedPartnerId: targetUser.id,
        connectedPartner: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
        onboardingCompleted: true,
      },
    });
  } catch (err: any) {
    console.error('Partner login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
