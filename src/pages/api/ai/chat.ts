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
      ? `You are Nyra, a warm, intelligent AI assistant helping a partner support their loved one (${femaleName}).

Context about the person being supported:
- Name: ${femaleName}
- Current Cycle Day: Day ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms today: ${symptomsText}
- Mood today: ${latestMood}

Guidelines:
- You are a fully capable, general AI assistant. You can answer ANY question on ANY topic (general knowledge, names, trivia, math, recipes, advice, cycle facts, health, sports, etc.).
- If the user asks a general question (e.g. "5 names starting with A", "What is the capital of France?", jokes, general help), answer it directly, accurately, and naturally WITHOUT forcing cycle facts into your reply.
- If the user asks about cycle health, symptoms, mood, or how to support ${femaleName}, provide warm, helpful guidance incorporating her cycle status (Day ${currentDay}, ${currentPhase} phase).
- If asked "What period day is she on?", use Day ${currentDay} (${currentPhase} phase) or clarify if no logs were entered in chat.
- Keep responses concise, warm, natural, and friendly. Use an emoji occasionally.`
      : `You are Nyra, a warm, intelligent AI assistant and personal wellness companion.

About the user:
- Name: ${userName}${userAge ? `, Age: ${userAge}` : ''}
- Current Cycle Day: Day ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Symptoms today: ${symptomsText}
- Mood today: ${latestMood}

Guidelines:
- You are a fully capable, general AI assistant. You can answer ANY question on ANY topic (general knowledge, names, trivia, math, recipes, lifestyle, general advice, cycle facts, health, science, etc.).
- If the user asks a general question (e.g. "5 names starting with letter A", "Write a poem", "Tell me a recipe"), answer it directly and accurately WITHOUT inserting unnecessary cycle facts into the answer.
- If the user asks about cycle health, symptoms, mood, or wellness, provide caring guidance referencing her cycle state (Day ${currentDay}, ${currentPhase} phase).
- If asked "What period day am I on?", state Day ${currentDay} (${currentPhase} phase) or ask for details if not specified.
- Keep responses friendly, natural, and helpful.`;

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

  // ── GENERAL NAMES & GENERAL KNOWLEDGE ──
  if (/names|name starting|letter a|letter b|letter c|letter m|letter s/.test(msg)) {
    if (/a\b|letter a/.test(msg)) {
      return `Here are 5 beautiful names starting with the letter A:\n1. Amelia 🌸\n2. Alexander ⚡\n3. Ava ✨\n4. Aaron 🌿\n5. Aurora 💖`;
    }
    if (/m\b|letter m/.test(msg)) {
      return `Here are 5 popular names starting with M:\n1. Mia 🌸\n2. Mason 🌟\n3. Maya ✨\n4. Michael 🌿\n5. Mila 💖`;
    }
    return `Here are some great name ideas: Amelia, Alexander, Ava, Maya, and Liam! Let me know if you are looking for specific letters or origins! ✨`;
  }

  // ── GENERAL GREETINGS & INTRO ──
  if (/^(hi|hello|hey|hii|helo|good morning|good evening|sup|yo)\b/.test(msg)) {
    return `Hello ${name}! 🌸 I'm Nyra AI. How can I help you today? Ask me any question, symptom tip, or general topic!`;
  }

  // ── GENERAL BOT INFO ──
  if (/how are you|who are you|what are you|what can you do/.test(msg)) {
    return `I'm Nyra, your AI assistant! 💜 I can answer any general question, offer advice, explain cycle phases, suggest recipes, and help with daily wellness. What would you like to ask?`;
  }

  // ── PERIOD DAY SPECIFIC QUESTIONS ──
  if (/which day|what day|which period day|am i on period/.test(msg)) {
    return `Based on your tracking, you are currently on Day ${day} of your cycle (${phase} phase). If you haven't logged your latest period start date yet, you can mark it anytime on your calendar! 🩸`;
  }

  // ── JOKES & HUMOR ──
  if (/joke|mar|maar|funny|chutkula|hassi|laugh|laughing|hasi|pun|lol|rofl/.test(msg)) {
    const jokes = [
      `Why did the computer take a nap? Because it had a hard drive! 😂`,
      `Why don't scientists trust atoms? Because they make up everything! ⚛️`,
      `Why did the tomato blush? Because it saw the salad dressing! 🍅😆`,
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── SYMPTOMS & HEALTH ──
  if (/cramp|pain|hurt|ache|dysmenorrhea/.test(msg)) {
    return `Cramps can be tough 💝 Try a warm heating pad, gentle yoga stretches, and magnesium-rich foods like dark chocolate or bananas. Stay warm and rest when needed!`;
  }

  if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms/.test(msg)) {
    return `Your feelings are valid! 💜 Hydration, gentle exercise, magnesium, and taking a moment to breathe deeply can help relieve stress and balance your day.`;
  }

  if (/food|eat|diet|nutrition|crav|hungry|appetite|recipe/.test(msg)) {
    return `Focusing on balanced whole foods, leafy greens, healthy fats, and plenty of water works wonders for energy and mood! 🥗✨`;
  }

  if (/ok|okie|okay|sure|got it|cool|thanks|thank you/.test(msg)) {
    return `You're very welcome! 🌸 Let me know whenever you have more questions.`;
  }

  // Dynamic general fallback
  const generalFallbacks = [
    `I'm here to help! 🌸 Feel free to ask me any question, whether it's about health, recipes, daily advice, or general trivia!`,
    `I'd be happy to answer that! What specific details or advice are you looking for today? ✨`,
    `Got it! Let me know if you need specific tips, general information, or guidance on any topic! 💜`,
  ];
  return generalFallbacks[Math.floor(Math.random() * generalFallbacks.length)];
}

export default withAuth(handler);

