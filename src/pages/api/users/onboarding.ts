import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/users/onboarding
// Body: { name, age, dateOfBirth, lastPeriodDate, cycleLength, periodDuration, goals }
// Completes onboarding: updates profile + seeds initial cycle logs

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name,
    age,
    dateOfBirth,
    lastPeriodDate,
    cycleLength = 28,
    periodDuration = 5,
    goals = [],
  } = req.body;

  const supabase = supabaseAdmin();

  try {
    // 1. Update user profile
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        age,
        date_of_birth: dateOfBirth,
        last_period_date: lastPeriodDate || null,
        cycle_length: cycleLength,
        period_duration: periodDuration,
        goals,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.userId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: 'Failed to update profile' });

    // 2. Seed period cycle logs from lastPeriodDate
    if (lastPeriodDate) {
      const startDate = new Date(lastPeriodDate);
      const cycleLogs = [];

      // Log actual period days
      for (let d = 0; d < periodDuration; d++) {
        const logDate = new Date(startDate);
        logDate.setDate(logDate.getDate() + d);
        cycleLogs.push({
          user_id: authUser.userId,
          date: logDate.toISOString().split('T')[0],
          is_period: true,
          is_predicted: false,
          flow: d === 0 || d === periodDuration - 1 ? 'light' : 'medium',
        });
      }

      // Predict next 3 periods
      for (let cycle = 1; cycle <= 3; cycle++) {
        const nextPeriodStart = new Date(startDate);
        nextPeriodStart.setDate(nextPeriodStart.getDate() + cycle * cycleLength);

        for (let d = 0; d < periodDuration; d++) {
          const logDate = new Date(nextPeriodStart);
          logDate.setDate(logDate.getDate() + d);
          cycleLogs.push({
            user_id: authUser.userId,
            date: logDate.toISOString().split('T')[0],
            is_period: true,
            is_predicted: true,
            flow: 'medium',
          });
        }

        // Mark ovulation (14 days before next period)
        const ovulationDate = new Date(nextPeriodStart);
        ovulationDate.setDate(ovulationDate.getDate() - 14);
        cycleLogs.push({
          user_id: authUser.userId,
          date: ovulationDate.toISOString().split('T')[0],
          is_period: false,
          is_ovulation: true,
          is_predicted: true,
        });
      }

      // Upsert all cycle logs
      await supabase.from('cycle_logs').upsert(cycleLogs, { onConflict: 'user_id,date' });
    }

    // 3. Seed default routines
    const defaultRoutines = [
      { user_id: authUser.userId, name: 'Morning Hydration 💧', time: '08:00', type: 'wellness', amount: '500ml' },
      { user_id: authUser.userId, name: 'Evening Stretch 🌙', time: '20:00', type: 'exercise' },
      { user_id: authUser.userId, name: 'Iron + Vitamins 💊', time: '09:00', type: 'supplement' },
      { user_id: authUser.userId, name: 'Cycle Log 📅', time: '21:00', type: 'tracking' },
    ];
    await supabase.from('routines').insert(defaultRoutines);

    // 4. Create initial chat thread for partner chat
    await supabase.from('chat_threads').insert({
      user_id: authUser.userId,
      title: 'Partner Chat',
    });

    // 5. Create initial AI thread for Nyra AI
    const { data: aiThread } = await supabase
      .from('ai_threads')
      .insert({
        user_id: authUser.userId,
        title: 'My Wellness Chat',
        ai_type: 'nyra',
      })
      .select()
      .single();

    if (aiThread) {
      await supabase.from('ai_messages').insert({
        thread_id: aiThread.id,
        role: 'assistant',
        content: `Hi ${name}! 🌸 I'm Nyra, your AI wellness companion. I'm here to help you understand your cycle, track your health, and offer personalized support. What would you like to explore today?`,
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (err: any) {
    console.error('Onboarding error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
