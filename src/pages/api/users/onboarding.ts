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
  } = req.body || {};

  const supabase = supabaseAdmin();

  try {
    // 1. Build sanitized update payload
    const updateObj: Record<string, any> = {
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    if (name) updateObj.name = String(name).trim();
    if (age) updateObj.age = parseInt(String(age), 10) || null;
    if (dateOfBirth) updateObj.date_of_birth = dateOfBirth;
    if (lastPeriodDate) updateObj.last_period_date = lastPeriodDate;
    if (cycleLength) updateObj.cycle_length = parseInt(String(cycleLength), 10) || 28;
    if (periodDuration) updateObj.period_duration = parseInt(String(periodDuration), 10) || 5;
    if (Array.isArray(goals)) updateObj.goals = goals;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateObj)
      .eq('id', authUser.userId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[onboarding] Update user profile error:', updateError);
      return res.status(500).json({ error: updateError.message || 'Failed to update profile' });
    }

    // 2. Seed period cycle logs (isolated try-catch)
    if (lastPeriodDate) {
      try {
        const startDate = new Date(lastPeriodDate);
        const cycleLogs = [];
        const numPeriodDays = parseInt(String(periodDuration), 10) || 5;
        const numCycleDays = parseInt(String(cycleLength), 10) || 28;

        for (let d = 0; d < numPeriodDays; d++) {
          const logDate = new Date(startDate);
          logDate.setDate(logDate.getDate() + d);
          cycleLogs.push({
            user_id: authUser.userId,
            date: logDate.toISOString().split('T')[0],
            is_period: true,
            is_predicted: false,
            flow: d === 0 || d === numPeriodDays - 1 ? 'light' : 'medium',
          });
        }

        for (let cycle = 1; cycle <= 3; cycle++) {
          const nextPeriodStart = new Date(startDate);
          nextPeriodStart.setDate(nextPeriodStart.getDate() + cycle * numCycleDays);

          for (let d = 0; d < numPeriodDays; d++) {
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

        await supabase.from('cycle_logs').upsert(cycleLogs, { onConflict: 'user_id,date' });
      } catch (e) {
        console.error('[onboarding] Cycle log seed error:', e);
      }
    }

    // 3. Seed default routines (isolated try-catch)
    try {
      const defaultRoutines = [
        { user_id: authUser.userId, name: 'Morning Hydration 💧', time: '08:00', type: 'wellness' },
        { user_id: authUser.userId, name: 'Evening Stretch 🌙', time: '20:00', type: 'exercise' },
        { user_id: authUser.userId, name: 'Iron + Vitamins 💊', time: '09:00', type: 'supplement' },
        { user_id: authUser.userId, name: 'Cycle Log 📅', time: '21:00', type: 'tracking' },
      ];
      await supabase.from('routines').insert(defaultRoutines);
    } catch (e) {}

    // 4. Create initial chat thread (isolated try-catch)
    try {
      await supabase.from('chat_threads').insert({
        user_id: authUser.userId,
        title: 'Partner Chat',
      });
    } catch (e) {}

    // 5. Create initial AI thread (isolated try-catch)
    try {
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
          content: `Hi ${name || 'there'}! 🌸 I'm Nyra, your AI wellness companion. I'm here to help you understand your cycle, track your health, and offer personalized support. What would you like to explore today?`,
        });
      }
    } catch (e) {}

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error('Onboarding handler error:', err);
    return res.status(500).json({ error: 'Internal server error while saving profile.' });
  }
}

export default withAuth(handler);
