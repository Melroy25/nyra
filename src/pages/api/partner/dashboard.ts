import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// GET /api/partner/dashboard
async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = supabaseAdmin();

  try {
    // 1. Get current user profile
    const { data: me } = await supabase
      .from('users')
      .select('id, name, role, connected_partner_id')
      .eq('id', authUser.userId)
      .single();

    if (!me) return res.status(404).json({ error: 'User not found' });

    const targetUserId = me.connected_partner_id || me.id;

    if (!me.connected_partner_id && me.role === 'partner') {
      return res.status(200).json({ isConnected: false, message: 'No partner connected yet.' });
    }

    // 2. Fetch target user's profile
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name, cycle_length, period_duration, last_period_date, partner_code')
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

    // 4. Calculate current cycle day & phase from last real period
    const periodLogs = (recentLogs || []).filter((l) => l.is_period && !l.is_predicted);
    const lastPeriodDate = periodLogs.length > 0
      ? periodLogs[periodLogs.length - 1].date
      : targetUser.last_period_date || null;

    const cycleLength = targetUser.cycle_length || 28;
    const periodDuration = targetUser.period_duration || 5;
    let currentDay = 1;
    let currentPhase = 'Follicular Phase';
    let daysLeft = cycleLength;

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
      }
      daysLeft = Math.max(1, cycleLength - currentDay + 1);

      if (currentDay <= periodDuration) currentPhase = 'Menstrual Phase';
      else if (currentDay <= Math.floor(cycleLength * 0.46)) currentPhase = 'Follicular Phase';
      else if (currentDay <= Math.floor(cycleLength * 0.58)) currentPhase = 'Ovulation Phase';
      else currentPhase = 'Luteal Phase';
    }

    // 5. ONLY use TODAY's logged mood & symptoms — never fallback to old logs or phase defaults
    const todayStr = new Date().toISOString().split('T')[0]; // "2026-07-28"
    const allLogs = recentLogs || [];
    const todayLog = allLogs.find((l) => l.date === todayStr);

    // null means not logged today
    const latestMood: string | null = todayLog?.mood?.trim() || null;
    const latestSymptoms: string[] =
      todayLog && Array.isArray(todayLog.symptoms) && todayLog.symptoms.length > 0
        ? todayLog.symptoms
        : [];

    const moodLogged = latestMood !== null;
    const symptomsLogged = latestSymptoms.length > 0;
    const symptomsText = symptomsLogged ? latestSymptoms.join(', ') : null;

    const userName = targetUser.name || 'her';

    // 6. Symptom/mood flags — only from real today's data
    const moodLower = (latestMood || '').toLowerCase();
    const hasAnxiety = moodLogged && (moodLower.includes('anxious') || moodLower.includes('anxiety') || moodLower.includes('stress'));
    const hasSadness = moodLogged && (moodLower.includes('sad') || moodLower.includes('low') || moodLower.includes('depress'));
    const hasHeadache = symptomsLogged && latestSymptoms.some((s) => s.toLowerCase().includes('headache') || s.toLowerCase().includes('migraine'));
    const hasCramps = symptomsLogged && latestSymptoms.some((s) => s.toLowerCase().includes('cramp'));
    const hasFatigue = symptomsLogged && latestSymptoms.some((s) => s.toLowerCase().includes('fatigue') || s.toLowerCase().includes('tired'));

    // 7. Energy level (phase-based is fine — it's cycle math, not user input)
    let energyLevel = 'Moderate Energy';
    if (hasFatigue || hasSadness || currentPhase.includes('Menstrual')) {
      energyLevel = 'Low Energy';
    } else if (currentPhase.includes('Ovulation')) {
      energyLevel = 'High Energy';
    }

    // 8. Cravings — only meaningful when symptoms/mood logged
    let cravings: string | null = null;
    if (hasHeadache) {
      cravings = 'Water, Ginger Tea & Magnesium';
    } else if (hasCramps) {
      cravings = 'Warm Herbal Tea & Dark Chocolate';
    } else if (hasFatigue) {
      cravings = 'Magnesium Smoothie & Iron-rich Foods';
    } else if (hasAnxiety) {
      cravings = 'Chamomile Tea, Bananas & Comfort Food';
    }

    // 9. Smart AI suggestions based on real logged data
    const suggestions: any[] = [];

    if (!moodLogged && !symptomsLogged) {
      // Nothing logged today — show phase-based general tip + prompt to check in
      suggestions.push({
        icon: currentPhase.includes('Menstrual') ? '🛋️' : currentPhase.includes('Ovulation') ? '💃' : currentPhase.includes('Follicular') ? '🌱' : '☕',
        title: `${currentPhase} — Day ${currentDay}`,
        desc: currentPhase.includes('Menstrual')
          ? `${userName} is in her period phase. Provide warmth, gentle care, and check in on how she's feeling today.`
          : currentPhase.includes('Ovulation')
          ? `${userName}'s energy is likely at its peak this phase — great time for a date or a fun activity together!`
          : currentPhase.includes('Follicular')
          ? `${userName}'s energy is gradually building. A supportive and positive presence is perfect right now.`
          : `${userName} may appreciate some extra patience and a quiet cozy evening together.`,
      });
      suggestions.push({
        icon: '💬',
        title: 'Mood & Symptoms Not Yet Logged Today',
        desc: `${userName} hasn't logged her mood or symptoms yet today. Check in with her and ask how she's feeling — your care means everything! 💜`,
      });
    } else {
      // Symptom-specific suggestion
      if (hasHeadache) {
        suggestions.push({
          icon: '🤕',
          title: 'Headache Relief',
          desc: `${userName} has logged a headache today. Dim lights, offer water and a cold compress on her forehead. A gentle scalp massage or a quiet room can help more than medicine right now.`,
        });
      } else if (hasCramps) {
        suggestions.push({
          icon: '💊',
          title: 'Cramp Comfort',
          desc: `${userName} is experiencing cramps today. A warm heating pad on her lower abdomen and a cup of chamomile or ginger tea can provide real relief. Stay close and be patient.`,
        });
      } else if (hasFatigue) {
        suggestions.push({
          icon: '😴',
          title: 'Energy Support',
          desc: `${userName} is feeling fatigued today. Help her rest by taking small tasks off her plate. Iron-rich foods like lentils or spinach and staying hydrated will help her recover energy.`,
        });
      } else if (symptomsLogged) {
        suggestions.push({
          icon: '🌸',
          title: 'Logged Symptoms Today',
          desc: `${userName} logged: ${symptomsText}. Keep an eye on how she's feeling and offer comfort if needed 💕`,
        });
      }

      // Mood suggestion
      if (hasAnxiety) {
        suggestions.push({
          icon: '🧘',
          title: 'Anxiety Support',
          desc: `${userName}'s mood is logged as "${latestMood}" today. Avoid heated topics. Offer calm reassurance, a cozy movie night, or just sitting with her quietly. Your presence matters most.`,
        });
      } else if (hasSadness) {
        suggestions.push({
          icon: '💜',
          title: 'Emotional Check-in',
          desc: `${userName} seems low today. A simple "I'm here for you" text, a warm hug, or surprising her with her favourite snack can make a big difference. Don't try to fix — just listen.`,
        });
      } else if (moodLogged) {
        suggestions.push({
          icon: '❤️',
          title: `Today's Mood: ${latestMood}`,
          desc: `${userName} is feeling "${latestMood}" today. A warm acknowledgment and a kind gesture will go a long way! 💜`,
        });
      }

      // Phase tip
      suggestions.push({
        icon: currentPhase.includes('Menstrual') ? '🛋️' : currentPhase.includes('Ovulation') ? '💃' : '☕',
        title: `${currentPhase} — Day ${currentDay}`,
        desc: currentPhase.includes('Menstrual')
          ? `${userName} is in her period phase. Provide warmth, gentle care, and avoid making big plans.`
          : currentPhase.includes('Ovulation')
          ? `${userName}'s energy is at its peak — perfect time for a date or an adventure together!`
          : `A calm, cozy evening with her favourite food and your company is exactly what she needs right now.`,
      });
    }

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
        latestMood,          // null = not logged today
        latestSymptoms,
        symptomsText,        // null = not logged today
        moodLogged,
        symptomsLogged,
      },
      suggestions,
    });
  } catch (err: any) {
    console.error('Partner dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
