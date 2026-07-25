import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/users/regenerate-code
// Generates a new unique partner code, severs any existing partner connection,
// and returns the updated user profile.

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  // 1. Generate unique partner code
  let newCode = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    newCode = `NYRA-${randomNum}`;

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('partner_code', newCode)
      .maybeSingle();

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    return res.status(500).json({ error: 'Failed to generate unique partner code. Please try again.' });
  }

  // 2. Clear bidirectional connection with existing partner if linked
  await supabase
    .from('users')
    .update({ connected_partner_id: null })
    .eq('connected_partner_id', authUser.userId);

  // 3. Update caller's row with new partner code and null connected_partner_id
  const { data: updatedUser, error: updateErr } = await supabase
    .from('users')
    .update({
      partner_code: newCode,
      connected_partner_id: null,
    })
    .eq('id', authUser.userId)
    .select('id, email, name, role, partner_code, connected_partner_id, avatar_url, created_at')
    .single();

  if (updateErr || !updatedUser) {
    return res.status(500).json({ error: updateErr?.message || 'Failed to update partner code' });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      partnerCode: updatedUser.partner_code,
      connectedPartnerId: updatedUser.connected_partner_id,
      connectedPartner: null,
      avatarUrl: updatedUser.avatar_url,
      createdAt: updatedUser.created_at,
    },
  });
}

export default withAuth(handler);
