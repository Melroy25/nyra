import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

// POST /api/auth/partner-code-login
// NEW FLOW: Partner must have their own registered account (role='partner')
// Body: { partnerCode, email, password }
// 1. Validate their email+password credentials
// 2. Find the main user by partnerCode
// 3. Bidirectionally link both accounts
// 4. Return JWT for the partner

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { partnerCode, email, password } = req.body;

  if (!partnerCode || !email || !password) {
    return res.status(400).json({ error: 'Partner code, email, and password are all required.' });
  }

  const supabase = supabaseAdmin();
  const cleanCode = partnerCode.trim().toUpperCase();

  try {
    // 1. Authenticate the partner using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    // 2. Lookup partner's user profile from our public.users table
    const { data: partnerUser, error: partnerLookupError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (partnerLookupError || !partnerUser) {
      return res.status(404).json({ error: 'Partner account profile not found. Please create an account first.' });
    }

    if (partnerUser.role !== 'partner') {
      return res.status(403).json({ error: 'This account is not a partner account. Use regular Sign In instead.' });
    }

    // 3. Find the main user by their partner_code
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, name, email, role, partner_code, cycle_length, period_duration, connected_partner_id')
      .eq('partner_code', cleanCode)
      .maybeSingle();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: 'No user found with that partner code. Please double-check the code.' });
    }

    // 4. Don't allow connecting to your own account
    if (targetUser.id === partnerUser.id) {
      return res.status(400).json({ error: "You can't connect to your own account." });
    }

    // 5. Check if target user is already linked to a DIFFERENT partner
    if (
      targetUser.connected_partner_id &&
      targetUser.connected_partner_id !== partnerUser.id
    ) {
      return res.status(409).json({ error: 'This user is already linked to another partner.' });
    }

    // 6. Bidirectional link: partner → user AND user → partner
    await supabase
      .from('users')
      .update({ connected_partner_id: targetUser.id })
      .eq('id', partnerUser.id);

    await supabase
      .from('users')
      .update({ connected_partner_id: partnerUser.id })
      .eq('id', targetUser.id);

    // 7. Ensure shared chat thread exists
    const { data: existingThread } = await supabase
      .from('chat_threads')
      .select('id')
      .or(
        `and(user_id.eq.${targetUser.id},partner_id.eq.${partnerUser.id}),and(user_id.eq.${partnerUser.id},partner_id.eq.${targetUser.id})`
      )
      .maybeSingle();

    if (!existingThread) {
      await supabase.from('chat_threads').insert({
        user_id: targetUser.id,
        partner_id: partnerUser.id,
        title: 'Partner Chat',
      });
    }

    // 8. Sign JWT for partner session
    const token = jwt.sign(
      {
        userId: partnerUser.id,
        email: partnerUser.email,
        role: 'partner',
        authId: authData.user.id,
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
          partnerCode: targetUser.partner_code,
        },
      },
    });
  } catch (err: any) {
    console.error('Partner code login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
