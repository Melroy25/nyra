import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET  /api/settings/notifications  → Fetch user's notification settings
// PATCH /api/settings/notifications → Update user's notification settings

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    let { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', authUser.userId)
      .maybeSingle();

    if (!settings) {
      // Create defaults if missing
      const { data: newSettings } = await supabase
        .from('notification_settings')
        .insert({ user_id: authUser.userId })
        .select()
        .single();
      settings = newSettings;
    }

    return res.status(200).json({ settings });
  }

  if (req.method === 'PATCH') {
    const {
      period_reminders,
      fertile_window_alerts,
      partner_updates,
      daily_checkins,
      water_reminders,
      reminder_time,
    } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (period_reminders !== undefined) updates.period_reminders = period_reminders;
    if (fertile_window_alerts !== undefined) updates.fertile_window_alerts = fertile_window_alerts;
    if (partner_updates !== undefined) updates.partner_updates = partner_updates;
    if (daily_checkins !== undefined) updates.daily_checkins = daily_checkins;
    if (water_reminders !== undefined) updates.water_reminders = water_reminders;
    if (reminder_time !== undefined) updates.reminder_time = reminder_time;

    const { data: updated, error } = await supabase
      .from('notification_settings')
      .update(updates)
      .eq('user_id', authUser.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update notification settings' });

    return res.status(200).json({ settings: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
