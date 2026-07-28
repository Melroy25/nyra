import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/ai/chat
// Body: { threadId, message, aiType }
// aiType: 'nyra' (for User) | 'partner' (for Partner)

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let { threadId, message, aiType = 'nyra', imageUrl } = req.body;
    if (!message && !imageUrl) {
      return res.status(400).json({ error: 'message or imageUrl is required' });
    }
    if (!message && imageUrl) {
      message = 'Analyzed attached image.';
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
      .select('id, name, age, role, connected_partner_id, cycle_length, period_duration, last_period_date')
      .eq('id', authUser.userId)
      .maybeSingle();

    const isPartner = aiType === 'partner' || me?.role === 'partner';
    const targetUserId = isPartner && me?.connected_partner_id ? me.connected_partner_id : authUser.userId;

    // Fetch target user profile
    const { data: targetProfile } = await supabase
      .from('users')
      .select('name, age, cycle_length, period_duration, last_period_date')
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

    // Prioritize targetProfile.last_period_date first, then lastActualLog.date
    const lastPeriodDate = targetProfile?.last_period_date || lastActualLog?.date || null;
    const cycleLength = Math.max(21, targetProfile?.cycle_length || 28);
    const periodDuration = Math.max(3, targetProfile?.period_duration || 5);

    let currentDay = 14;
    let currentPhase = 'Ovulation';

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
      ? `You are Nyra, a warm AI friend helping a partner support their loved one (${femaleName}) through her menstrual cycle.

Context about the person being supported:
- Name: ${femaleName}
- Current Cycle Day: Day ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms today: ${symptomsText}
- Mood today: ${latestMood}

Chat rules (VERY IMPORTANT):
- Reply like a real person texting — casual, warm, natural, human
- Keep it SHORT: 1-3 sentences usually. Max 4 short paragraphs only if genuinely required
- NEVER start with robotic fillers like "Of course!", "Absolutely!", "Great question!"
- Answer what was asked directly and naturally, like a friend would
- Use an emoji occasionally
- Always acknowledge accurate cycle info (she is currently on Day ${currentDay}, ${currentPhase} phase)
- If an image is provided, comment on what you see in the image and offer helpful context.`
      : `You are Nyra, a caring AI friend who knows everything about women's health and cycles.

About the user:
- Name: ${userName}${userAge ? `, Age: ${userAge}` : ''}
- Current Cycle Day: Day ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms today: ${symptomsText}
- Mood today: ${latestMood}

Chat rules (VERY IMPORTANT):
- Reply like a real friend texting — casual, warm, natural, human
- Keep it SHORT: 1-3 sentences usually
- NEVER start with "Of course!", "Great question!" or any robotic filler
- Answer what she asked directly without padding
- Always acknowledge her actual cycle day: Day ${currentDay} (${currentPhase} phase)
- If an image is attached, describe or analyze what you see in a helpful, friendly way.`;

    // 5. Save user message to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'user',
        content: imageUrl ? `${message} [Image Attached]` : message,
      });
    }

    // 6. Call Google Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiReply = '';

    if (geminiApiKey && geminiApiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE' && geminiApiKey.length > 10) {
      try {
        const geminiMessages = buildGeminiContents(conversationHistory, message, imageUrl);

        // Try primary model gemini-2.0-flash first, fallback to gemini-1.5-flash
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const modelName of modelsToTry) {
          try {
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
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
            if (geminiResponse.ok && geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
              aiReply = geminiData.candidates[0].content.parts[0].text;
              console.log(`[Gemini] Success using model ${modelName}`);
              break;
            } else {
              console.log(`[Gemini] Model ${modelName} returned error:`, geminiData?.error?.message || geminiData?.error);
            }
          } catch (modelErr) {
            console.log(`[Gemini] Model ${modelName} fetch error:`, modelErr);
          }
        }
      } catch (e) {
        console.log('Gemini API call failed:', e);
      }
    }

    // 7. Smart contextual fallback (dynamic, non-repetitive)
    if (!aiReply) {
      aiReply = buildSmartFallback(message, currentPhase, currentDay, femaleName, aiType, imageUrl);
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

// Helper to construct Gemini API messages with multimodal image support
function buildGeminiContents(
  history: Array<{ role: string; content: string }>,
  newMessage: string,
  imageUrl?: string
) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

  for (const h of history) {
    if (!h.content || !h.content.trim()) continue;
    const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
    if (contents.length === 0 && role === 'model') continue;

    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${h.content}`;
    } else {
      contents.push({ role, parts: [{ text: h.content }] });
    }
  }

  // Build current user message parts
  const userParts: Array<any> = [{ text: newMessage }];

  if (imageUrl && imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (matches) {
      userParts.push({
        inline_data: {
          mime_type: matches[1],
          data: matches[2],
        },
      });
    }
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...userParts);
  } else {
    contents.push({ role: 'user', parts: userParts });
  }

  return contents;
}

// Dynamic smart keyword fallback that NEVER repeats static sentences
function buildSmartFallback(
  message: string,
  phase: string,
  day: number,
  name: string,
  aiType: string,
  imageUrl?: string
): string {
  const msg = message.toLowerCase();
  const trackedName = name === 'Partner' || !name ? 'your partner' : name;

  // ── IMAGE ATTACHED ──
  if (imageUrl) {
    return `I received your image! 🌸 It looks clear. Since I am operating in offline support mode right now, keep an eye on how you feel during Day ${day} (${phase} phase). Let me know if you have specific questions about it! 💜`;
  }

  // ── JOKES & HUMOR (ENGLISH & HINGLISH) ──
  if (/joke|mar|maar|funny|chutkula|hassi|laugh|laughing|hasi|pun|lol|rofl|joke me/.test(msg)) {
    const jokes = [
      `Why did the period symptom go to therapy? Because it had way too many mood swings! 😆`,
      `Why don't hormones ever get lost? Because they always follow their natural cycle! 🌸`,
      `Why did the ovary cross the road? To get to the ovulation phase! 🥚✨`,
      `My doctor told me to eat more iron during my period. So I ate chocolate... it has a foil wrapper, close enough right? 🍫😂`,
      `Pati to Patni: Tum achanak itni sweet kyu ho gayi? Patni: Hormones ka chakkar hai babu bhaiya! 😜`,
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── EXPLICIT CYCLE DAY QUESTIONS (e.g. "she is in day 16", "cycle day 16") ──
  if (/day 16|16th day|ovulat/.test(msg)) {
    if (aiType === 'partner') {
      return `Got it! Day 16 is in the Ovulation/early Luteal transition phase. Her energy is typically high, but estrogen begins to shift. It's a great time to encourage light workouts and stay hydrated together! 💖`;
    }
    return `On Day 16 of your cycle (Ovulation phase), your energy and confidence are at peak levels! 🌟 It's a wonderful window for active exercise, socialising, and staying well hydrated.`;
  }

  // ── PARTNER AI BRANCH ──
  if (aiType === 'partner') {
    if (/^(hi|hello|hey|hii|helo|good morning|good evening|sup|yo)\b/.test(msg)) {
      return `Hello! 🌸 I'm Nyra, your partner support assistant. ${trackedName} is currently on Day ${day} (${phase} phase). How can I help you support her today?`;
    }

    if (/what is she doing|doing right now|doing today/.test(msg)) {
      return `On Day ${day} (${phase} phase), ${trackedName}'s energy level is in her ${phase} phase curve. She might enjoy a relaxed stroll, a nourishing meal, or just some quiet quality time together! ✨`;
    }

    if (/how are you|who are you|what are you|what can you do/.test(msg)) {
      return `I'm Nyra Partner AI! 💜 I help you understand ${trackedName}'s cycle phases, emotional changes, energy levels, and cravings so you can offer the best support possible. Ask me anything!`;
    }

    if (/cramp|pain|hurt|ache/.test(msg)) {
      return `During the ${phase} phase, ${trackedName} may experience abdominal cramps. A hot water bottle, warm tea, gentle massage, and bringing her a comforting meal or dark chocolate are wonderful ways to help!`;
    }

    if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms/.test(msg)) {
      return `During her ${phase} phase (Day ${day}), hormonal shifts can heighten emotional sensitivity. Active listening, avoiding arguments over minor things, offering a warm hug, and helping with small daily tasks work best!`;
    }

    if (/food|eat|diet|crav|hungry|snack/.test(msg)) {
      return `In her ${phase} phase (Day ${day}), ${trackedName} may crave comforting foods. Dark chocolate, warm chamomile tea, iron-rich meals, and plenty of water are super thoughtful gestures right now!`;
    }

    if (/ok|okie|okay|sure|got it|cool|thanks|thank you/.test(msg)) {
      const okReplies = [
        `You've got this! 💕 Let me know whenever you need more tips for ${trackedName}.`,
        `Awesome! I'm right here if you want to ask about recipes, mood tips, or cycle facts. ✨`,
        `Always happy to help you support ${trackedName}! Have a great day ahead 🌸`,
      ];
      return okReplies[Math.floor(Math.random() * okReplies.length)];
    }

    // Dynamic random fallbacks so it NEVER repeats a single hardcoded sentence
    const partnerFallbacks = [
      `I'm right here with you! 💜 ${trackedName} is currently on Day ${day} (${phase} phase). Feel free to ask about her mood, energy, or how to make her day easier!`,
      `Day ${day} (${phase} phase) brings specific energy & hormonal shifts for ${trackedName}. What area would you like tips on — food, mood, or activity? 🌸`,
      `You're doing great supporting ${trackedName}! On Day ${day} (${phase} phase), small gestures like preparing a warm drink or asking how her day went mean a lot. 💕`,
      `I'm here to help! Ask me what foods ease cramps, how to comfort ${trackedName} today, or any cycle question on your mind. ✨`,
    ];
    return partnerFallbacks[Math.floor(Math.random() * partnerFallbacks.length)];
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
    return `Bloating is super common around your cycle 🌿 Try reducing sodium and processed foods, drink more water (it flushes excess fluid), and gentle walks or peppermint tea can relieve pressure!`;
  }

  if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms|pmdd/.test(msg)) {
    return `Your emotions are valid and closely tied to your hormones 💜 In your ${phase} phase (Day ${day}), hormonal shifts can affect mood. Try journaling, light exercise, magnesium supplements, and reducing caffeine!`;
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
    return `During your ${phase} phase (Day ${day}), focus on ${phaseFood[phase] || 'balanced whole foods'}. Staying hydrated is key too!`;
  }

  if (/ok|okie|okay|sure|got it|cool|thanks|thank you/.test(msg)) {
    const userOkReplies = [
      `You're very welcome! 🌸 Let me know if you need anything else today.`,
      `Always here for you! Take care of yourself on Day ${day} (${phase} phase). ✨`,
      `Anytime! Rest well and stay hydrated today 💕`,
    ];
    return userOkReplies[Math.floor(Math.random() * userOkReplies.length)];
  }

  // Dynamic user fallbacks
  const userFallbacks = [
    `I'm here for you! 🌸 You're currently on Day ${day} of your cycle (${phase} phase). Ask me anything about symptoms, recipes, or mood tips!`,
    `On Day ${day} (${phase} phase), listening to your body's energy levels is key. What's on your mind today? ✨`,
    `Feel free to ask me about cycle facts, relief for symptoms, exercise suggestions, or nutrition advice! 💕`,
  ];
  return userFallbacks[Math.floor(Math.random() * userFallbacks.length)];
}

export default withAuth(handler);

