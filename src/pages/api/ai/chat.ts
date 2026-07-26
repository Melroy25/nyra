import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/ai/chat
// Body: { threadId, message, aiType }
// aiType: 'nyra' (for User) | 'partner' (for Partner)
// Calls Google Gemini API with cycle-context system prompt or provides smart fallback

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { threadId, message, aiType = 'nyra' } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const supabase = supabaseAdmin();

  try {
    // 1. Auto-resolve threadId if 'auto' or missing
    if (!threadId || threadId === 'auto') {
      let { data: existingThread } = await supabase
        .from('ai_threads')
        .select('id')
        .eq('user_id', authUser.userId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (!existingThread) {
        const { data: newThread } = await supabase
          .from('ai_threads')
          .insert({
            user_id: authUser.userId,
            title: aiType === 'partner' ? 'Partner Support AI' : 'Nyra Wellness Companion',
          })
          .select()
          .single();
        existingThread = newThread;
      }
      threadId = existingThread?.id;
    }

    // 2. Fetch user profile + recent cycle logs for context
    const { data: userProfile } = await supabase
      .from('users')
      .select('name, age, cycle_length, period_duration')
      .eq('id', authUser.userId)
      .maybeSingle();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentLogs } = await supabase
      .from('cycle_logs')
      .select('date, is_period, is_ovulation, flow, symptoms, mood')
      .eq('user_id', authUser.userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(15);

    const periodDays = recentLogs?.filter((l: any) => l.is_period) || [];
    const lastPeriodDate = periodDays.length > 0 ? periodDays[0].date : null;
    let currentDay = 1;
    let currentPhase = 'Follicular';

    if (lastPeriodDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastPeriodDate).getTime()) / (1000 * 60 * 60 * 24));
      currentDay = daysSince + 1;
      if (currentDay <= (userProfile?.period_duration || 5)) currentPhase = 'Menstrual';
      else if (currentDay <= 13) currentPhase = 'Follicular';
      else if (currentDay <= 16) currentPhase = 'Ovulation';
      else currentPhase = 'Luteal';
    }

    // 3. Fetch last 10 AI messages for conversation context
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (previousMessages || []).reverse();

    // 4. Build system prompt
    const userName = userProfile?.name || 'there';
    const systemPrompt = aiType === 'partner'
      ? `You are Nyra, an empathetic AI wellness companion helping a partner understand and support their partner's menstrual health.
         The tracked user is currently on Cycle Day ${currentDay}, in the ${currentPhase} phase (cycle length: ${userProfile?.cycle_length || 28} days).
         Answer the partner's question with empathy, practical tips, and sensitivity. Keep responses warm and under 4 sentences. Use appropriate emojis.`
      : `You are Nyra, a warm, empathetic, knowledgeable AI wellness companion for women's health and menstrual cycle support.
         User: ${userName}, Age: ${userProfile?.age || 'unknown'}, Currently Cycle Day ${currentDay} (${currentPhase} phase, cycle length: ${userProfile?.cycle_length || 28} days).
         Answer the user's specific question with personalised, caring, evidence-based advice. Be conversational and direct. Use 2-4 sentences with emojis. Never give the same response twice.`;

    // 5. Save user message to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'user',
        content: message,
      });
    }

    // 6. Call Google Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiReply = '';

    if (geminiApiKey && geminiApiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE' && geminiApiKey.length > 10) {
      try {
        const geminiMessages = [
          ...conversationHistory.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ];

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 350,
              },
            }),
          }
        );

        const geminiData = await geminiResponse.json();
        aiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!aiReply && geminiData?.error) {
          console.log('Gemini error:', geminiData.error);
        }
      } catch (e) {
        console.log('Gemini API call failed, using smart fallback:', e);
      }
    }

    // 7. Smart contextual fallback (if Gemini key not set or call fails)
    if (!aiReply) {
      aiReply = buildSmartFallback(message, currentPhase, currentDay, userName, aiType);
    }

    // 8. Save AI reply to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'assistant',
        content: aiReply,
      });
    }

    return res.status(200).json({ reply: aiReply, threadId });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'AI service error' });
  }
}

// Smart keyword-aware fallback when Gemini is not configured
function buildSmartFallback(message: string, phase: string, day: number, name: string, aiType: string): string {
  const msg = message.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|hii|helo|good morning|good evening|sup|yo)\b/.test(msg)) {
    return `Hello ${name}! 🌸 I'm Nyra, your cycle wellness companion. You're on Day ${day} of your cycle (${phase} phase). How can I help you today?`;
  }

  // How are you / what are you
  if (/how are you|who are you|what are you|what can you do/.test(msg)) {
    return `I'm Nyra, your AI wellness companion! 💜 I can help you understand your cycle phases, manage symptoms, give nutrition tips, track moods, and support your overall wellbeing. What's on your mind today?`;
  }

  // Cramps / pain
  if (/cramp|pain|hurt|ache|dysmenorrhea/.test(msg)) {
    return `Cramps can be really tough 💝 During the ${phase} phase, try a heating pad on your lower abdomen, gentle yoga stretches, and magnesium-rich foods like dark chocolate or bananas. Ibuprofen or naproxen taken at the first sign of cramps works best. Stay warm and rest when needed!`;
  }

  // Bloating
  if (/bloat|bloating|puffy|water retention/.test(msg)) {
    return `Bloating is super common around your cycle, especially in the Luteal phase 🌿 Try reducing sodium and processed foods, drink more water (it actually helps flush excess fluid), and gentle walks or yoga can relieve pressure. Peppermint tea is also great for bloating!`;
  }

  // Mood / emotional / sad / anxiety
  if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms|pmdd/.test(msg)) {
    return `Your emotions are valid and closely tied to your hormones 💜 In the ${phase} phase (Day ${day}), hormonal shifts can significantly affect mood. Try journaling, light exercise, magnesium supplements, and reducing caffeine. If mood swings feel severe, it's worth discussing with a doctor — you're not alone!`;
  }

  // Fatigue / tired / energy
  if (/tired|fatigue|exhausted|energy|sleep|sleepy|weak/.test(msg)) {
    return `Feeling tired is so normal during the ${phase} phase! 🌙 Your body uses a lot of energy managing hormonal changes. Prioritize 7-9 hours of sleep, eat iron-rich foods (spinach, lentils), and try a short 20-minute power nap. Light movement like a walk can actually boost energy levels too!`;
  }

  // Food / nutrition / cravings / diet
  if (/food|eat|diet|nutrition|crav|hungry|appetite|meal|recipe/.test(msg)) {
    const phaseFood: Record<string, string> = {
      Menstrual: 'iron-rich foods like spinach, lentils, and red meat. Add vitamin C (oranges, bell peppers) to boost iron absorption 🍊',
      Follicular: 'light, energising foods like salads, eggs, fermented foods, and lean protein to support rising oestrogen 🥗',
      Ovulation: 'anti-inflammatory foods like berries, fatty fish, and leafy greens to manage the ovulation surge ✨',
      Luteal: 'complex carbs, dark chocolate, and magnesium-rich foods like pumpkin seeds and avocado to ease PMS 🍫',
    };
    return `During your ${phase} phase, focus on ${phaseFood[phase] || 'balanced whole foods'}. Staying hydrated is always key too — aim for 8 glasses of water a day!`;
  }

  // Ovulation / fertility
  if (/ovulat|fertile|fertility|conceive|pregnant|ttc/.test(msg)) {
    return `Ovulation typically occurs around Day 14 of a 28-day cycle, but varies for everyone 🌟 Signs include clear, stretchy discharge (like egg white), a slight rise in basal body temperature, and mild pelvic discomfort. Currently you're on Day ${day} (${phase} phase). Tracking BBT and LH strips can give you the most accurate fertility window!`;
  }

  // Exercise / workout
  if (/exercise|workout|gym|yoga|run|fitness|sport|walk/.test(msg)) {
    const phaseExercise: Record<string, string> = {
      Menstrual: 'gentle yoga, stretching, or light walks — your body is in recovery mode 🧘',
      Follicular: 'increasing intensity is great now — try HIIT, strength training, or cycling as energy rises 💪',
      Ovulation: 'peak performance time! Great for challenging workouts, heavy lifting, or group fitness ✨',
      Luteal: 'moderate intensity — pilates, swimming, or moderate strength training work well as energy dips 🌿',
    };
    return `In your ${phase} phase, the best exercise is: ${phaseExercise[phase] || 'whatever feels good for your body'}. Always listen to your body and rest when you need it!`;
  }

  // Period late / missed
  if (/late|missed period|no period|irregular|period not coming/.test(msg)) {
    return `A late or missed period can be caused by stress, significant weight changes, over-exercise, illness, or hormonal imbalances — not just pregnancy 🌸 If it's more than a week late and a pregnancy test is negative, it's worth tracking for a few months. If irregularity persists, a gynaecologist visit is recommended to rule out conditions like PCOS or thyroid issues.`;
  }

  // PCOS / hormones / endometriosis
  if (/pcos|polycystic|endometriosis|hormone|hormonal|thyroid/.test(msg)) {
    return `These are important health topics that deserve proper medical evaluation 💜 PCOS and endometriosis are common but often under-diagnosed. Symptoms can include irregular cycles, excess hair growth, pelvic pain, and heavy periods. I'd recommend tracking your symptoms in the Cycle tab and discussing them with a gynaecologist — you deserve clear answers and proper care!`;
  }

  // Partner-specific
  if (aiType === 'partner') {
    if (/support|help|what can i do|how to help/.test(msg)) {
      return `Supporting your partner during their ${phase} phase means a lot 💕 Right now, the most helpful things are: showing patience, asking how they feel rather than assuming, offering warmth (a hot water bottle or their favourite snack), and just being present. Small gestures matter more than grand ones!`;
    }
    return `Your partner is currently on Day ${day} of their cycle (${phase} phase) 💜 Every person's experience is unique, but during this phase, emotional support, patience, and checking in gently go a long way. What specific way would you like to help them today?`;
  }

  // Default contextual response
  const phaseContext: Record<string, string> = {
    Menstrual: `Day ${day}: Rest, warmth, and iron-rich foods are your allies right now. Be gentle with yourself 💝`,
    Follicular: `Day ${day}: Your energy is building — great time for new plans, social activities, and lighter meals 🌱`,
    Ovulation: `Day ${day}: Peak energy and confidence! Your body is thriving — make the most of it ✨`,
    Luteal: `Day ${day}: Hormones are shifting — prioritize sleep, nourishing meals, and managing stress 🌙`,
  };

  return `${phaseContext[phase] || `You're on Day ${day} of your cycle.`} I'm here for any specific questions about symptoms, nutrition, mood, or your cycle! 🌸`;
}

export default withAuth(handler);
