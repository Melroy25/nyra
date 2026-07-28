import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '../../../lib/withAuth';
import { strictApiRateLimiter, getClientIp } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

// POST /api/users/delete-account
// Body: { password }
async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const allowed = await strictApiRateLimiter(req, res, authUser.userId);
  if (!allowed) return;

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password is required to confirm account deletion.' });
  }

  const supabase = supabaseAdmin();

  try {
    // 1. Fetch user's email to verify password
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('email, auth_id')
      .eq('id', authUser.userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // 2. Verify password with Supabase Auth (using anon client)
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: userProfile.email,
      password,
    });

    if (authError) {
      logger.security('FAILED_ACCOUNT_DELETION_PASSWORD', { userId: authUser.userId, ip: getClientIp(req) });
      return res.status(401).json({ error: 'Incorrect password. Account deletion canceled.' });
    }

    // 3. Delete user profile from public.users table
    await supabase.from('users').delete().eq('id', authUser.userId);

    // 4. Delete user from Supabase Auth if auth_id exists
    if (userProfile.auth_id) {
      await supabase.auth.admin.deleteUser(userProfile.auth_id);
    }

    logger.security('ACCOUNT_DELETED', { userId: authUser.userId, ip: getClientIp(req) });

    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (err: any) {
    logger.error('Delete account handler error', err);
    return res.status(500).json({ error: 'An error occurred while deleting account.' });
  }
}

export default withAuth(handler);
