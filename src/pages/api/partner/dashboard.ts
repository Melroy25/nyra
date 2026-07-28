import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/partner/dashboard
async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  try {
    // 1. Get current user profile (could be either role)
    const { data: me } = await supabase
      .from('users')
      .select('id, name, role, connected_partner_id')
      .eq('id', authUser.userId)
      .single();

    if (!me) return res.status(404).json({ error: 'User not found' });

    // Determine whose cycle data to show
    // - If partner role → show connected female user's data
    // - If female user → show their own data (for their dashboard)
    const targetUserId = me.connected_partner_id || me.id;

    if (!me.connected_partner_id && me.role === 'partner') {
      return res.status(200).json({ isConnected: false, message: 'No partner connected yet.' });
    }

    // 2. Fetch target user's profile
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name, cycle_length, period_duration, partner_code')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) return res.status(404).json({ error: 'Target user profile not found' });

    // 3. Fetch last 60 cycle logs ordered by date desc
    const { data: recentLogs } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .limit(60);

    // Calculate current day & phase from last ACTUAL (non-predicted) period
    const periodLogs = (recentLogs || []).filter((l) => l.is_period && !l.is_predicted);
    const lastPeriodDate = periodLogs.length > 0 ? periodLogs[0].date : null;

    let currentDay = 18;
    let currentPhase = 'Luteal Phase';
    let daysLeft = 4;

    if (lastPeriodDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastPeriodDate).getTime()) / (1000 * 60 * 60 * 24));
      currentDay = Math.max(1, daysSince + 1);
      const cycleLength = targetUser.cycle_length || 28;
      const periodDuration = targetUser.period_duration || 5;
      daysLeft = Math.max(1, cycleLength - currentDay);

      if (currentDay <= periodDuration) currentPhase = 'Menstrual Phase';
      else if (currentDay <= 13) currentPhase = 'Follicular Phase';
      else if (currentDay <= 16) currentPhase = 'Ovulation Phase';
      else currentPhase = 'Luteal Phase';
    }

    // 4. Find the most recent log that actually has mood OR symptoms filled in
    //    (could be different from the absolute most recent log date)
    const allLogs = recentLogs || [];
    const latestLogWithMood = allLogs.find((l) => l.mood && l.mood.trim() !== '');
    const latestLogWithSymptoms = allLogs.find((l) => Array.isArray(l.symptoms) && l.symptoms.length > 0);
    const latestLog = allLogs[0]; // Most recent overall

    // Extract best available mood & symptoms
    const latestMood: string =
      latestLogWithMood?.mood ||
      latestLog?.mood ||
      (currentPhase.includes('Ovulation')
        ? 'Energetic & Happy'
        : currentPhase.includes('Menstrual')
        ? 'Sensitive & Resting'
        : 'Calm & Balanced');

    const latestSymptoms: string[] =
      (latestLogWithSymptoms?.symptoms?.length ? latestLogWithSymptoms.symptoms : null) ||
      (Array.isArray(latestLog?.symptoms) ? latestLog.symptoms : []);

    const symptomsText =
      latestSymptoms.length > 0 ? latestSymptoms.join(', ') : 'None logged recently';

    const userName = targetUser.name || 'her';

    // 5. Energy level
    let energyLevel = 'Moderate Energy';
    const moodLower = latestMood.toLowerCase();
    const hasAnxiety = moodLower.includes('anxious') || moodLower.includes('anxiety') || moodLower.includes('stress');
    const hasSadness = moodLower.includes('sad') || moodLower.includes('low') || moodLower.includes('depress');
    const hasHeadache = latestSymptoms.some((s) => s.toLowerCase().includes('headache') || s.toLowerCase().includes('migraine'));
    const hasCramps = latestSymptoms.some((s) => s.toLowerCase().includes('cramp'));
    const hasFatigue = latestSymptoms.some((s) => s.toLowerCase().includes('fatigue') || s.toLowerCase().includes('tired'));

    if (hasFatigue || currentPhase.includes('Menstrual') || hasSadness) {
      energyLevel = 'Low Energy';
    } else if (currentPhase.includes('Ovulation')) {
      energyLevel = 'High Energy';
    }

    // 6. Smart cravings based on real symptoms + mood
    let cravings = 'Dark Chocolate & Chamomile Tea';
    if (hasHeadache) {
      cravings = 'Water, Ginger Tea & Magnesium';
    } else if (hasCramps) {
      cravings = 'Warm Herbal Tea & Dark Chocolate';
    } else if (hasFatigue || energyLevel === 'Low Energy') {
      cravings = 'Magnesium Smoothie & Iron-rich Foods';
    } else if (hasAnxiety) {
      cravings = 'Chamomile Tea, Bananas & Comfort Food';
    }

    // 7. Dynamic AI suggestions based on REAL mood & symptoms
    const suggestions = [];

    // Suggestion 1 — Symptom-specific care
    if (hasHeadache) {
      suggestions.push({
        icon: '🤕',
        title: 'Headache Relief',
        desc: `${userName} has logged a headache. Dim lights, offer water and a cold compress on her forehead. A gentle scalp massage or a quiet room can help more than medicine right now.`,
      });
    } else if (hasCramps) {
      suggestions.push({
        icon: '💊',
        title: 'Cramp Comfort',
        desc: `${userName} is experiencing cramps. A warm heating pad on her lower abdomen and a cup of chamomile or ginger tea can provide real relief. Stay close and be patient.`,
      });
    } else if (hasFatigue) {
      suggestions.push({
        icon: '😴',
        title: 'Energy Support',
        desc: `${userName} is feeling fatigued. Help her rest by taking small tasks off her plate. Iron-rich foods like lentils or spinach and staying hydrated will help her recover energy.`,
      });
    } else {
      suggestions.push({
        icon: '🌸',
        title: `Craving Alert: ${cravings}`,
        desc: `Based on ${userName}'s ${currentPhase} phase, surprising her with ${cravings.toLowerCase()} will genuinely brighten her day!`,
      });
    }

    // Suggestion 2 — Mood-specific support
    if (hasAnxiety) {
      suggestions.push({
        icon: '🧘',
        title: 'Anxiety Support',
        desc: `${userName}'s mood is logged as "${latestMood}". Avoid heated topics today. Offer calm reassurance, a cozy movie night, or just sitting with her quietly. Your presence matters most.`,
      });
    } else if (hasSadness) {
      suggestions.push({
        icon: '💜',
        title: 'Emotional Check-in',
        desc: `${userName} seems low today. A simple "I'm here for you" text, a warm hug, or surprising her with her favourite snack can make a big difference. Don't try to fix — just listen.`,
      });
    } else {
      suggestions.push({
        icon: currentPhase.includes('Menstrual') ? '🛋️' : currentPhase.includes('Ovulation') ? '💃' : '☕',
        title: currentPhase.includes('Menstrual')
          ? 'Rest & Comfort Time'
          : currentPhase.includes('Ovulation')
          ? 'Date Night Energy!'
          : 'Cozy Evening Together',
        desc: currentPhase.includes('Menstrual')
          ? `${userName} is in her period phase (Day ${currentDay}). Provide warmth, gentle care, and avoid making big plans.`
          : currentPhase.includes('Ovulation')
          ? `${userName}'s energy is at its peak — perfect time for a date or an adventure together!`
          : `A calm, cozy evening with her favourite food and your company is exactly what she needs right now.`,
      });
    }

    // Suggestion 3 — Mood summary always shown
    suggestions.push({
      icon: '❤️',
      title: 'Today\'s Mood',
      desc: `${userName} is feeling "${latestMood}" today. ${
        hasAnxiety
          ? 'Try not to add any extra pressure. Keep things calm and light around her.'
          : hasSadness
          ? 'Be extra gentle and check in on her through the day.'
          : 'A warm acknowledgment and a kind gesture will go a long way today!'
      }`,
    });

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
        symptomsText,
      },
      suggestions,
    });
  } catch (err: any) {
    console.error('Partner dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
