import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/partner/dashboard
// Fetches connected user's real cycle phase, day, energy, cravings, and AI suggestions for the partner

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  try {
    // 1. Get current partner user profile
    const { data: me } = await supabase
      .from('users')
      .select('id, role, connected_partner_id')
      .eq('id', authUser.userId)
      .single();

    if (!me) return res.status(404).json({ error: 'User not found' });

    // Determine target user ID to inspect (either connected partner, or self if user)
    const targetUserId = me.role === 'partner' ? me.connected_partner_id : me.id;

    if (!targetUserId) {
      return res.status(200).json({
        isConnected: false,
        message: 'No partner connected yet.',
      });
    }

    // 2. Fetch target user's profile
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name, cycle_length, period_duration, partner_code')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user profile not found' });
    }

    // 3. Fetch latest cycle logs for target user
    const { data: recentLogs } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .limit(30);

    // Calculate current day & phase
    const periodLogs = (recentLogs || []).filter((l) => l.is_period && !l.is_predicted);
    const lastPeriodDate = periodLogs.length > 0 ? periodLogs[0].date : null;

    let currentDay = 18;
    let currentPhase = 'Luteal Phase';
    let daysLeft = 4;

    if (lastPeriodDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastPeriodDate).getTime()) / (1000 * 60 * 60 * 24));
      currentDay = daysSince + 1;
      const cycleLength = targetUser.cycle_length || 28;
      const periodDuration = targetUser.period_duration || 5;

      daysLeft = Math.max(1, cycleLength - currentDay);

      if (currentDay <= periodDuration) currentPhase = 'Menstrual Phase';
      else if (currentDay <= 13) currentPhase = 'Follicular Phase';
      else if (currentDay <= 16) currentPhase = 'Ovulation Phase';
      else currentPhase = 'Luteal Phase';
    }

    // 4. Extract latest symptoms, mood, cravings, energy
    const latestLog = recentLogs && recentLogs.length > 0 ? recentLogs[0] : null;
    const latestSymptoms: string[] = Array.isArray(latestLog?.symptoms) ? latestLog.symptoms : [];
    const latestMood: string = latestLog?.mood || (currentPhase.includes('Ovulation') ? 'Energetic & Happy' : currentPhase.includes('Menstrual') ? 'Sensitive & Resting' : 'Calm & Balanced');

    // Cravings & Energy logic
    let energyLevel = 'Normal Energy';
    if (currentPhase.includes('Menstrual') || currentPhase.includes('Luteal')) {
      energyLevel = 'Low Energy';
    } else if (currentPhase.includes('Ovulation')) {
      energyLevel = 'High Energy';
    }

    let cravings = 'Dark Chocolate & Chamomile Tea';
    if (latestSymptoms.includes('Cramps') || latestSymptoms.includes('Bloating')) {
      cravings = 'Warm Herbal Tea & Dark Chocolate';
    } else if (latestSymptoms.includes('Fatigue') || energyLevel === 'Low Energy') {
      cravings = 'Magnesium Smoothie & Fresh Fruit';
    }

    // 5. Generate AI Suggestions for Partner based on real phase & user data
    const suggestions = [
      {
        title: `Craving Alert: ${cravings}`,
        desc: `Based on ${targetUser.name}'s current ${currentPhase} phase and logged data, surprising her with ${cravings.toLowerCase()} will brighten her day!`,
      },
      {
        title: currentPhase.includes('Menstrual') ? 'Comfort & Heating Support' : currentPhase.includes('Ovulation') ? 'Date Night & Social Outing' : 'Cozy Evening & Rest',
        desc: currentPhase.includes('Menstrual') 
          ? `${targetUser.name} is on Day ${currentDay} of her period. Provide a warm heating pad or herbal tea to soothe her cramps.`
          : currentPhase.includes('Ovulation')
          ? `${targetUser.name}'s energy and mood are at their peak right now! Great time for a date night.`
          : `Her energy level is in ${currentPhase}. A quiet evening and helping with small chores will mean a lot to her.`,
      },
      {
        title: 'Emotional & Care Support',
        desc: `Her current mood is "${latestMood}". Be an attentive listener, offer a warm hug, and give her extra reassurance today.`,
      },
    ];

    return res.status(200).json({
      isConnected: true,
      partner: targetUser,
      cycleMetrics: {
        currentDay,
        currentPhase,
        daysLeft,
        updatedText: 'Updated just now',
        energyLevel,
        cravings,
        latestMood,
        latestSymptoms,
      },
      suggestions,
    });
  } catch (err: any) {
    console.error('Partner dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
