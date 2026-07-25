import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/users/connect-partner
// Body: { partnerCode }
// Links current user bidirectionally to the partner with that code

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { partnerCode } = req.body;
  if (!partnerCode) return res.status(400).json({ error: 'Partner code is required' });

  const supabase = supabaseAdmin();

  // 1. Ensure the code isn't your own
  const { data: self } = await supabase
    .from('users')
    .select('id, partner_code')
    .eq('id', authUser.userId)
    .single();

  if (self?.partner_code === partnerCode.trim().toUpperCase()) {
    return res.status(400).json({ error: "You can't connect to your own code" });
  }

  // 2. Look up the target user by partner code
  const { data: targetUser, error } = await supabase
    .from('users')
    .select('id, name, email, role, partner_code')
    .eq('partner_code', partnerCode.trim().toUpperCase())
    .single();

  if (error || !targetUser) {
    return res.status(404).json({ error: 'No user found with that partner code' });
  }

  // 3. Check if target is already connected to someone else
  const { data: targetFull } = await supabase
    .from('users')
    .select('connected_partner_id')
    .eq('id', targetUser.id)
    .single();

  if (targetFull?.connected_partner_id && targetFull.connected_partner_id !== authUser.userId) {
    return res.status(409).json({ error: 'This user is already connected to a partner' });
  }

  // 4. Bidirectional link: both users point to each other
  await supabase
    .from('users')
    .update({ connected_partner_id: targetUser.id })
    .eq('id', authUser.userId);

  await supabase
    .from('users')
    .update({ connected_partner_id: authUser.userId })
    .eq('id', targetUser.id);

  // 5. Create shared chat thread if not already exists
  const { data: existingThread } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('user_id', authUser.userId)
    .eq('partner_id', targetUser.id)
    .maybeSingle();

  if (!existingThread) {
    await supabase.from('chat_threads').insert({
      user_id: authUser.userId,
      partner_id: targetUser.id,
      title: 'Partner Chat',
    });
  }

  return res.status(200).json({
    success: true,
    connectedPartner: targetUser,
  });
}

export default withAuth(handler);
