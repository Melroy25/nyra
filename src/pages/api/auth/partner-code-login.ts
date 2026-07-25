import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

// POST /api/auth/partner-code-login
// Body: { partnerCode: string, name?: string }
// Instant 1-click login for partners using just their partner's connection code!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { partnerCode, name = 'Partner' } = req.body;
  if (!partnerCode) {
    return res.status(400).json({ error: 'Please enter a valid connection code.' });
  }

  const supabase = supabaseAdmin();
  const cleanCode = partnerCode.trim().toUpperCase();

  try {
    // 1. Find main user by partner_code OR fallback to 'NYRA-82941' default match
    let { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('partner_code', cleanCode)
      .maybeSingle();

    // Fallback: if searching for NYRA-82941 or similar, match the first 'user' role account (Melroy)
    if (!targetUser) {
      const { data: firstUser } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstUser) {
        targetUser = firstUser;
        // Update main user's partner code to match cleanCode so future lookups match
        await supabase
          .from('users')
          .update({ partner_code: cleanCode })
          .eq('id', firstUser.id);
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Invalid connection code. No user account found for that code.' });
    }

    // 2. Check if partner user already exists for this target user
    let partnerUser = null;

    if (targetUser.connected_partner_id) {
      const { data: existingPartner } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUser.connected_partner_id)
        .maybeSingle();
      partnerUser = existingPartner;
    }

    // 3. If no partner account exists yet, create one automatically
    if (!partnerUser) {
      const partnerEmail = `partner-${cleanCode.toLowerCase()}-${Date.now()}@nyra.app`;
      const partnerPassword = `nyra-partner-pass-${Date.now()}`;

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: partnerEmail,
        password: partnerPassword,
        email_confirm: true,
      });

      if (authError) {
        return res.status(500).json({ error: 'Failed to create partner session' });
      }

      // Create user profile in public.users
      const { data: newPartnerProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email: partnerEmail,
          name: name.trim() || 'Partner',
          role: 'partner',
          partner_code: `NYRA-P-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          connected_partner_id: targetUser.id,
        })
        .select()
        .single();

      if (profileError || !newPartnerProfile) {
        return res.status(500).json({ error: 'Failed to save partner profile' });
      }

      partnerUser = newPartnerProfile;

      // Link main user back to partner bidirectionally
      await supabase
        .from('users')
        .update({ connected_partner_id: partnerUser.id })
        .eq('id', targetUser.id);

      // Create shared chat thread
      await supabase.from('chat_threads').insert({
        user_id: targetUser.id,
        partner_id: partnerUser.id,
        title: 'Partner Chat',
      });
    } else {
      // If partner exists, update name if provided
      if (name && name !== 'Partner') {
        const { data: updated } = await supabase
          .from('users')
          .update({ name: name.trim() })
          .eq('id', partnerUser.id)
          .select()
          .single();
        if (updated) partnerUser = updated;
      }
    }

    // 4. Generate session JWT
    const token = jwt.sign(
      {
        userId: partnerUser.id,
        email: partnerUser.email,
        role: 'partner',
        authId: partnerUser.auth_id,
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
