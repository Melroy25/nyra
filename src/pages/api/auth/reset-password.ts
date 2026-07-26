import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// POST /api/auth/reset-password
// Body: { step: 'request', email } OR { step: 'reset', email, otp, newPassword }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, email, otp, newPassword } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const supabase = supabaseAdmin();
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    if (step === 'request') {
      // 1. Check if user exists
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (!userProfile) {
        // Return 200 to avoid email enumeration security leak
        return res.status(200).json({ success: true, message: 'If an account exists, a password reset link/OTP has been sent.' });
      }

      // 2. Send reset password OTP via Supabase Auth
      const { error } = await supabaseAnon.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ success: true, message: 'Reset code/link sent to your email.' });
    }

    if (step === 'reset') {
      if (!otp || !newPassword) {
        return res.status(400).json({ error: 'OTP code and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Verify OTP and reset password
      const { data, error } = await supabaseAnon.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'recovery',
      });

      if (error || !data.session) {
        return res.status(401).json({ error: error?.message || 'Invalid or expired OTP code' });
      }

      // Update password with admin client for the verified user
      const { error: updateError } = await supabase.auth.admin.updateUserById(data.session.user.id, {
        password: newPassword,
      });

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update password. Please try again.' });
      }

      return res.status(200).json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
    }

    return res.status(400).json({ error: 'Invalid step specified' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
