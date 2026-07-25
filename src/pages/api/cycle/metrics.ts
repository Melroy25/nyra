import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/cycle/metrics
// Returns the current user's live cycle metrics computed from actual DB logs

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  try {
    // 1. Get user profile for cycle length + period duration
    const { data: userProfile } = await supabase
      .from('users')
      .select('cycle_length, period_duration, name')
      .eq('id', authUser.userId)
      .single();

    const cycleLength = userProfile?.cycle_length || 28;
    const periodDuration = userProfile?.period_duration || 5;

    // 2. Fetch recent cycle logs (last 60 days + future predictions)
    const { data: logs } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('date', { ascending: false })
      .limit(60);

    // 3. Find last ACTUAL (not predicted) period start
    const periodLogs = (logs || []).filter((l) => l.is_period && !l.is_predicted);
    const lastPeriodDate = periodLogs.length > 0 ? periodLogs[0].date : null;

    let currentDay = 1;
    let currentPhase = 'Follicular';
    let nextPeriodDaysLeft = cycleLength;

    if (lastPeriodDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastPeriodDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      currentDay = (daysSince % cycleLength) + 1;

      if (currentDay <= periodDuration) {
        currentPhase = 'Menstrual';
      } else if (currentDay <= 13) {
        currentPhase = 'Follicular';
      } else if (currentDay <= 16) {
        currentPhase = 'Ovulation';
      } else {
        currentPhase = 'Luteal';
      }

      nextPeriodDaysLeft = Math.max(0, cycleLength - currentDay);
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
