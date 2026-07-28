import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/cycle/metrics
// Returns the current user's live cycle metrics computed from actual DB logs

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  try {
    // 1. Get user profile for cycle length + period duration + last period date
    const { data: userProfile } = await supabase
      .from('users')
      .select('cycle_length, period_duration, last_period_date, name')
      .eq('id', authUser.userId)
      .single();

    const cycleLength = userProfile?.cycle_length || 28;
    const periodDuration = userProfile?.period_duration || 5;

    // 2. Fetch recent cycle logs (ordered ascending by date)
    const { data: logs } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('date', { ascending: true });

    // 3. Find last ACTUAL period start date using block start detection
    const periodLogs = (logs || []).filter((l) => l.is_period && !l.is_predicted);
    let lastPeriodDate = userProfile?.last_period_date || null;

    if (periodLogs.length > 0) {
      const dates = Array.from(new Set(periodLogs.map((l) => l.date))).sort((a, b) => a.localeCompare(b));
      const todayStr = new Date().toISOString().split('T')[0];

      // Find period block start dates (dates where previous day is not a logged period day)
      const periodStarts: string[] = [];
      for (const dStr of dates) {
        const parts = dStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() - 1);
        const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!dates.includes(prevStr)) {
          periodStarts.push(dStr);
        }
      }

      const validStarts = periodStarts.filter((s) => s <= todayStr);
      if (validStarts.length > 0) {
        lastPeriodDate = validStarts[validStarts.length - 1];
      } else if (periodStarts.length > 0) {
        lastPeriodDate = periodStarts[periodStarts.length - 1];
      } else {
        lastPeriodDate = dates[0];
      }
    }

    let currentDay = 1;
    let currentPhase = 'Follicular';
    let nextPeriodDaysLeft = cycleLength;

    if (lastPeriodDate) {
      const parts = lastPeriodDate.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const lastLocal = new Date(parts[0], parts[1] - 1, parts[2]);
        const now = new Date();
        const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((todayLocal.getTime() - lastLocal.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          currentDay = (diffDays % cycleLength) + 1;
        }

        const multiplier = Math.max(1, Math.ceil((diffDays + 1) / cycleLength));
        const nextPeriodDate = new Date(lastLocal);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + multiplier * cycleLength);
        const msLeft = nextPeriodDate.getTime() - todayLocal.getTime();
        const daysLeft = Math.round(msLeft / (1000 * 60 * 60 * 24));
        nextPeriodDaysLeft = daysLeft > 0 ? daysLeft : cycleLength;
      }

      if (currentDay <= periodDuration) {
        currentPhase = 'Menstrual';
      } else if (currentDay <= Math.floor(cycleLength * 0.46)) {
        currentPhase = 'Follicular';
      } else if (currentDay <= Math.floor(cycleLength * 0.58)) {
        currentPhase = 'Ovulation';
      } else {
        currentPhase = 'Luteal';
      }
    }

    // 4. Today's log data
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = (logs || []).find((l) => l.date === todayStr);

    return res.status(200).json({
      currentDay,
      currentPhase,
      nextPeriodDaysLeft,
      cycleLength,
      periodDuration,
      lastPeriodDate,
      todayMood: todayLog?.mood || null,
      todaySymptoms: todayLog?.symptoms || [],
      todayNotes: todayLog?.notes || null,
    });
  } catch (err: any) {
    console.error('Cycle metrics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
