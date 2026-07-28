import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/ai/chat
// Body: { threadId, message, aiType }
// aiType: 'nyra' (for User) | 'partner' (for Partner)

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

    // 2. Fetch current user & determine target female user ID
    const { data: me } = await supabase
      .from('users')
      .select('id, name, age, role, connected_partner_id, cycle_length, period_duration')
      .eq('id', authUser.userId)
      .maybeSingle();

    const isPartner = aiType === 'partner' || me?.role === 'partner';
    const targetUserId = isPartner && me?.connected_partner_id ? me.connected_partner_id : authUser.userId;

    // Fetch target user profile
    const { data: targetProfile } = await supabase
      .from('users')
      .select('name, age, cycle_length, period_duration')
      .eq('id', targetUserId)
      .maybeSingle();

    // Fetch actual last period log (not predicted)
    const { data: lastActualLog } = await supabase
      .from('cycle_logs')
      .select('date, symptoms, mood')
      .eq('user_id', targetUserId)
      .eq('is_period', true)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest general cycle log for symptoms & mood
    const { data: latestLog } = await supabase
      .from('cycle_logs')
      .select('symptoms, mood')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastPeriodDate = lastActualLog?.date || null;
    const cycleLength = Math.max(21, targetProfile?.cycle_length || 28);
    const periodDuration = Math.max(3, targetProfile?.period_duration || 5);

    let currentDay = 1;
    let currentPhase = 'Follicular';

    if (lastPeriodDate) {
      const diffMs = Date.now() - new Date(lastPeriodDate).getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysSince >= 0) {
        currentDay = (daysSince % cycleLength) + 1;
      } else {
        currentDay = 1;
      }
    } else {
      currentDay = 14; // Default mid-cycle when no log available
    }

    // Phase bounds
    if (currentDay <= periodDuration) currentPhase = 'Menstrual';
    else if (currentDay <= Math.floor(cycleLength * 0.46)) currentPhase = 'Follicular';
    else if (currentDay <= Math.floor(cycleLength * 0.58)) currentPhase = 'Ovulation';
    else currentPhase = 'Luteal';

    const latestSymptoms: string[] = Array.isArray(latestLog?.symptoms) ? latestLog.symptoms : [];
    const latestMood: string = latestLog?.mood || (currentPhase === 'Ovulation' ? 'Energetic & Happy' : currentPhase === 'Menstrual' ? 'Sensitive & Resting' : 'Calm & Balanced');
    const symptomsText = latestSymptoms.length > 0 ? latestSymptoms.join(', ') : 'No specific symptoms logged today';

    // 3. Fetch last 20 AI messages for conversation context
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (previousMessages || []).reverse();

    // 4. Build system prompt — conversational, natural, NOT scripted
    const femaleName = targetProfile?.name || 'your partner';
    const userName = targetProfile?.name || me?.name || 'there';
    const userAge = targetProfile?.age || me?.age;

    const systemPrompt = isPartner
      ? `You are Nyra, a warm AI friend helping a partner support their loved one through her menstrual cycle.

Context about the person being supported:
- Name: ${femaleName}
- Cycle day: ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms: ${symptomsText}
- Mood: ${latestMood}

Chat rules (VERY IMPORTANT):
- Reply like a real person texting — casual, warm, natural
- Keep it SHORT: 1-3 sentences usually. Max 4 short paragraphs only if really needed
- NEVER start with "Of course!", "Absolutely!", "Great question!" or any filler
- Just answer what was asked directly, like a friend would
- Use an emoji occasionally (not every sentence)
- If it's small talk, just chat normally like a real person
- Only bring up ${femaleName}'s cycle/symptoms when it's actually relevant to the question`
      : `You are Nyra, a caring AI friend who knows everything about women's health and cycles.

About the user:
- Name: ${userName}${userAge ? `, Age: ${userAge}` : ''}
- Cycle day: ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms: ${symptomsText}
- Mood: ${latestMood}

Chat rules (VERY IMPORTANT):
- Reply like a real friend texting — casual, warm, natural, human
- Keep it SHORT: 1-3 sentences usually. Only go longer if the topic genuinely needs it
- NEVER start with "Of course!", "Absolutely!", "Great question!" or any filler opener
- Answer what she actually asked, directly. Don't pad or repeat yourself
- Vary how you start each reply so you don't sound like a bot
- Small talk? Just chat back normally
- Health topic? Give a real, specific answer without lecturing
- Only mention her cycle phase when it's genuinely relevant
- Be warm and encouraging, never preachy`;

    // 5. Save user message to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'user',
        content: message,
      });
    }

    // 6. Call Google Gemini API (if key configured)
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: geminiMessages,
              generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 400,
                topP: 0.95,
                topK: 40,
              },
            }),
          }
        );

        const geminiData = await geminiResponse.json();
        console.log('[Gemini] Response status:', geminiResponse.status, 'candidates:', geminiData?.candidates?.length);
        aiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!aiReply && geminiData?.error) {
          console.log('[Gemini] API error:', geminiData.error);
        }
      } catch (e) {
        console.log('Gemini API call failed, using smart fallback:', e);
      }
    } else {
      console.log('[Gemini] No API key configured, using fallback. Key present:', !!geminiApiKey);
    }

    // 7. Smart contextual fallback
    if (!aiReply) {
      aiReply = buildSmartFallback(message, currentPhase, currentDay, femaleName, aiType);
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
  const trackedName = name === 'Partner' || !name ? 'your partner' : name;

  // ── PARTNER AI BRANCH ──
  if (aiType === 'partner') {
    if (/^(hi|hello|hey|hii|helo|good morning|good evening|sup|yo)\b/.test(msg)) {
      return `Hello! 🌸 I'm Nyra, your partner support assistant. ${trackedName} is currently in her ${phase} phase (Day ${day}). How can I help you support her today?`;
    }

    if (/how are you|who are you|what are you|what can you do/.test(msg)) {
      return `I'm Nyra Partner AI! 💜 I help you understand ${trackedName}'s cycle phases, emotional changes, energy levels, and cravings so you can offer the best support possible. Ask me anything!`;
    }

    if (/cramp|pain|hurt|ache/.test(msg)) {
      return `During the ${phase} phase, ${trackedName} may experience abdominal cramps. A hot water bottle, warm tea, gentle massage, and bringing her a comforting meal or dark chocolate are wonderful ways to help!`;
    }

    if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms/.test(msg)) {
      return `During her ${phase} phase, hormonal shifts can heighten emotional sensitivity. The best support is active listening, avoiding arguing over minor things, offering a warm hug, and helping with small daily tasks!`;
    }

    if (/food|eat|diet|crav|hungry|snack/.test(msg)) {
      return `In her ${phase} phase, ${trackedName} may crave comforting foods or sweets. Dark chocolate, warm chamomile tea, iron-rich meals, and plenty of water are super thoughtful gestures right now!`;
    }

    if (/support|help|what can i do|how to help/.test(msg)) {
      return `Right now in her ${phase} phase (Day ${day}), key ways to support ${trackedName} are: 1) Be extra patient & reassuring, 2) Offer warmth and tea, 3) Help with chores without being asked, and 4) Give her space or quiet companionship if she's tired. 💕`;
    }

    return `${trackedName} is currently in her ${phase} phase (Day ${day}) 💜 Being patient, attentive, and offering quiet companionship or a warm drink is a great way to support her today! How else can I help?`;
  }

  // ── USER AI BRANCH (FEMALE USER) ──
  if (/^(hi|hello|hey|hii|helo|good morning|good evening|sup|yo)\b/.test(msg)) {
    return `Hello ${name}! 🌸 I'm Nyra, your cycle wellness companion. You're on Day ${day} of your cycle (${phase} phase). How can I help you today?`;
  }

  if (/how are you|who are you|what are you|what can you do/.test(msg)) {
    return `I'm Nyra, your AI wellness companion! 💜 I can help you understand your cycle phases, manage symptoms, give nutrition tips, track moods, and support your overall wellbeing. What's on your mind today?`;
  }

  if (/cramp|pain|hurt|ache|dysmenorrhea/.test(msg)) {
    return `Cramps can be really tough 💝 During the ${phase} phase, try a heating pad on your lower abdomen, gentle yoga stretches, and magnesium-rich foods like dark chocolate or bananas. Stay warm and rest when needed!`;
  }

  if (/bloat|bloating|puffy|water retention/.test(msg)) {
    return `Bloating is super common around your cycle, especially in the Luteal phase 🌿 Try reducing sodium and processed foods, drink more water (it flushes excess fluid), and gentle walks or peppermint tea can relieve pressure!`;
  }

  if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms|pmdd/.test(msg)) {
    return `Your emotions are valid and closely tied to your hormones 💜 In the ${phase} phase (Day ${day}), hormonal shifts can affect mood. Try journaling, light exercise, magnesium supplements, and reducing caffeine!`;
  }

  if (/tired|fatigue|exhausted|energy|sleep|sleepy|weak/.test(msg)) {
    return `Feeling tired is so normal during the ${phase} phase! 🌙 Your body uses energy managing hormonal changes. Prioritize 7-9 hours of sleep, eat iron-rich foods, and try a short 20-minute power nap!`;
  }

  if (/food|eat|diet|nutrition|crav|hungry|appetite|meal|recipe/.test(msg)) {
    const phaseFood: Record<string, string> = {
      Menstrual: 'iron-rich foods like spinach, lentils, and warm soups 🍊',
      Follicular: 'light, energising foods like salads, eggs, and lean protein 🥗',
      Ovulation: 'anti-inflammatory foods like berries, avocado, and leafy greens ✨',
      Luteal: 'complex carbs, dark chocolate, and magnesium-rich foods 🍫',
    };
    return `During your ${phase} phase, focus on ${phaseFood[phase] || 'balanced whole foods'}. Staying hydrated is key too!`;
  }

  if (/ovulat|fertile|fertility|conceive|pregnant|ttc/.test(msg)) {
    return `Ovulation typically occurs around Day 14 of a 28-day cycle 🌟 Currently you're on Day ${day} (${phase} phase). Tracking BBT and LH strips can give you the most accurate fertility window!`;
  }

  if (/exercise|workout|gym|yoga|run|fitness|sport|walk/.test(msg)) {
    const phaseExercise: Record<string, string> = {
      Menstrual: 'gentle yoga, stretching, or light walks 🧘',
      Follicular: 'HIIT, strength training, or cycling as energy rises 💪',
      Ovulation: 'challenging workouts or group fitness ✨',
      Luteal: 'pilates, swimming, or moderate strength training 🌿',
    };
    return `In your ${phase} phase, recommended exercise: ${phaseExercise[phase] || 'whatever feels good'}. Always listen to your body!`;
  }

  if (/late|missed period|no period|irregular/.test(msg)) {
    return `A late or missed period can be caused by stress, weight shifts, illness, or hormonal changes 🌸 If it's more than a week late and a test is negative, track your cycle for a few months. If irregularity continues, consult a gynaecologist.`;
  }

  if (/pcos|polycystic|endometriosis|hormone|hormonal|thyroid/.test(msg)) {
    return `These health topics deserve proper medical care 💜 Symptoms like irregular cycles, pain, or heavy flow should be tracked and discussed with a gynaecologist — you deserve clear answers!`;
  }

  // Default contextual response
  const phaseContext: Record<string, string> = {
    Menstrual: `Day ${day}: Rest, warmth, and iron-rich foods are your best allies right now 💝`,
    Follicular: `Day ${day}: Your energy is building — great time for new plans and social activities 🌱`,
    Ovulation: `Day ${day}: Peak energy and confidence! Your body is thriving ✨`,
    Luteal: `Day ${day}: Prioritize sleep, nourishing meals, and managing stress 🌙`,
  };

  return `${phaseContext[phase] || `You're on Day ${day} of your cycle.`} How can I help you today? 🌸`;
}

export default withAuth(handler);
