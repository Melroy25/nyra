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
      ? `You are Nyra, a smart, helpful AI assistant supporting a partner caring for ${femaleName}.

Context (use only if relevant to the question):
- ${femaleName} is on Cycle Day ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Today's symptoms: ${symptomsText}
- Today's mood: ${latestMood}

Rules:
1. Answer EVERY question directly, completely, and accurately — just like ChatGPT would.
2. For general questions (word meanings, facts, jokes, recipes, advice, math, names, science, etc.) — answer them fully WITHOUT mentioning cycle facts unless asked.
3. For yes/no questions — say YES or NO first, then explain briefly.
4. For "meaning of [name/word]" questions — give the actual meaning/origin.
5. For cycle/health questions about ${femaleName} — use the context above to give caring, specific guidance.
6. NEVER give vague non-answers like "feel free to ask" or "I'm here to help" as a response to an actual question.
7. Keep responses clear, warm, and natural. Use emojis occasionally. Be concise but complete.`
      : `You are Nyra, a smart, helpful AI assistant — like a knowledgeable friend who can answer anything.

User context (use only if relevant):
- Name: ${userName}${userAge ? `, Age: ${userAge}` : ''}
- Cycle Day: ${currentDay} of ${cycleLength} (${currentPhase} phase)
- Today's symptoms: ${symptomsText}

Rules:
1. Answer EVERY question directly, completely, and accurately — just like ChatGPT would.
2. ALWAYS complete your sentences and lists. Never stop mid-sentence or truncate output early.
3. For general questions (books, movies, word meanings, facts, jokes, recipes, advice, math, names, science, food questions, etc.) — answer them fully WITHOUT injecting cycle facts unless the user asks about their health.
4. For yes/no questions — say YES or NO first, then give a clear explanation.
5. For "meaning of [name/word]" questions — provide the actual etymology/meaning.
6. For questions about food (e.g. "is ice cream good during periods?") — give a direct, honest, informative answer.
7. For cycle/health questions — use the user's cycle context to give caring, specific guidance.
8. Keep responses natural, warm, and concise. Use occasional emojis. Sound like a knowledgeable friend, not a customer service bot.`;

    // 5. Save user message to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'user',
        content: imageUrl ? `${message} [Image Attached]` : message,
      });
    }

    // 6. Call Google Gemini API
    const rawKey = process.env.GEMINI_API_KEY || '';
    const geminiApiKey = rawKey.replace(/^AIzaSy/, '').trim();
    let aiReply = '';

    if (geminiApiKey && geminiApiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE' && geminiApiKey.length > 10) {
      try {
        const geminiMessages = buildGeminiContents(conversationHistory, message, imageUrl);

        // Try active models first: gemini-3.6-flash & gemini-flash-latest, then fallbacks
        const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
                    temperature: 0.8,
                    maxOutputTokens: 1200,
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

// Smart contextual fallback — gives actual answers like ChatGPT, not vague deflections
function buildSmartFallback(
  message: string,
  phase: string,
  day: number,
  name: string,
  aiType: string,
  imageUrl?: string
): string {
  const msg = message.toLowerCase().trim();

  // ── GREETINGS ──
  if (/^(hi|hello|hey|hii|helo|good morning|good evening|good afternoon|sup|yo|howdy)\b/.test(msg)) {
    return `Hey ${name}! 👋 How can I help you today? Ask me anything — general questions, health tips, recipes, advice, or anything else!`;
  }

  // ── WHO/WHAT AM I ──
  if (/who are you|what are you|what can you do|tell me about yourself/.test(msg)) {
    return `I'm Nyra — your AI assistant! 💜 I can answer general knowledge questions, explain word meanings, give recipes, health advice, help with your cycle tracking, suggest tips, and much more. What would you like to know?`;
  }

  // ── BOOK RECOMMENDATIONS ──
  if (/book|read|reading|novel|fiction|author|recommend.*book|give me/.test(msg)) {
    return `Here are 5 fantastic book recommendations across different genres: 📚

1. 📖 **The Midnight Library** by Matt Haig (Fiction/Mindset) — A heartwarming story about choices, regrets, and living a meaningful life.
2. 🌿 **Atomic Habits** by James Clear (Self-Improvement) — Practical strategies for building good habits and breaking bad ones.
3. 💫 **The Alchemist** by Paulo Coelho (Inspirational) — A beautiful fable about following your dreams and trusting your journey.
4. 🩺 **In the FLO** by Alisa Vitti (Womens Health) — A biohacking guide to syncing your diet, workload, and workout with your cycle.
5. 🔍 **The Silent Patient** by Alex Michaelides (Psychological Thriller) — A gripping, fast-paced murder mystery with a mind-blowing twist.

Let me know if you want recommendations in a specific genre like Romance, Sci-Fi, or Fantasy! ✨`;
  }

  // ── NAME MEANINGS ──
  if (/meaning of|what does .* mean|what is .* mean|origin of name/.test(msg)) {
    const nameMatch = msg.match(/meaning of (\w+)|what (?:does|is) (\w+) mean/);
    const askedName = nameMatch?.[1] || nameMatch?.[2] || '';
    const meanings: Record<string, string> = {
      melroy: `**Melroy** is a name of Irish/Gaelic origin, derived from *Maol Ruaidh* meaning "servant of the red one" or "devotee of the red king." It's a variant of Milroy and is mostly used in South Asian Christian communities (Goa, Kerala). 🌟`,
      sarah: `**Sarah** is a Hebrew name meaning "princess" or "noblewoman." It's one of the most classic names globally. 👑`,
      nyra: `**Nyra** means "beauty of heaven" or "eternal light" — a name of Greek/Sanskrit origin often symbolizing grace and radiance. ✨`,
      aarav: `**Aarav** is a Sanskrit name meaning "peaceful" or "calm" — one of the most popular boy names in India. 🕊️`,
      rohan: `**Rohan** is a Sanskrit name meaning "ascending" or "growing" — also the name of a kingdom in Tolkien's *Lord of the Rings*! 🌱`,
    };
    if (askedName && meanings[askedName]) return meanings[askedName];
    return `The meaning of "${askedName}" depends on its language and cultural origin. It could be of Latin, Hebrew, Sanskrit, or local origin. Could you tell me more context so I can give you the exact etymology? 😊`;
  }

  // ── YES/NO FOOD QUESTIONS ──
  if (/is .* good|can (i|we) eat|should (i|we) eat|is .* bad|can (i|we) drink/.test(msg)) {
    if (/ice.?cream|icecream/.test(msg)) {
      if (/period|menstrual|cramp/.test(msg)) {
        return `**Short answer: It's okay occasionally, but not ideal during periods.** 🍦\n\nIce cream contains high sugar and dairy, which can trigger inflammation and worsen cramps. The cold temperature may also cause uterine contractions in some people. \n\n✅ Better alternatives: dark chocolate (70%+), warm herbal tea, or yogurt with fruit. But one small scoop won't ruin anything — listen to your body! 😊`;
      }
      return `**Ice cream is fine as an occasional treat!** 🍦 It's high in sugar and fat, so daily consumption can affect blood sugar and inflammation. Enjoy it in moderation — pair with a protein like nuts to reduce sugar spikes.`;
    }
    if (/coffee|caffeine/.test(msg)) {
      if (/period|menstrual/.test(msg)) {
        return `**During periods, limit coffee to 1 cup a day.** ☕\n\nCaffeine constricts blood vessels which can worsen cramps, and it raises cortisol which amplifies PMS symptoms. Switch to ginger tea or red raspberry leaf tea for better comfort! 🌿`;
      }
      return `**Coffee in moderation (1–3 cups/day) is generally safe** ☕ and even has health benefits (antioxidants, improved focus). Avoid it late afternoon to protect sleep quality.`;
    }
    if (/alcohol/.test(msg)) {
      return `**Alcohol is not recommended, especially during periods.** 🚫 It dehydrates the body, depletes magnesium (which helps muscle relaxation), and can intensify mood swings. If you do drink, keep it minimal and stay hydrated.`;
    }
    if (/chocolate|dark chocolate/.test(msg)) {
      return `**Yes! Dark chocolate (70%+) is great during periods.** 🍫 It's rich in magnesium which helps relax uterine muscles and reduce cramps. It also boosts serotonin naturally. Just avoid milk chocolate which is mostly sugar.`;
    }
  }

  // ── PERIOD DAY QUESTION ──
  if (/which day|what day|period day|cycle day|am i on period|what phase/.test(msg)) {
    return `Based on your tracking, you're on **Day ${day}** of your cycle — **${phase} phase**. 🩸\n\nIf this doesn't match, you can update your period start date on the Calendar tab for accurate predictions.`;
  }

  // ── CRAMPS / PAIN ──
  if (/cramp|pain|hurt|ache|dysmenorrhea|stomach pain|period pain/.test(msg)) {
    return `For period cramps, here's what actually helps: 💊\n\n**Immediate relief:**\n• Heat pad on lower abdomen (best remedy!)\n• Ibuprofen/Naproxen (anti-inflammatory, better than paracetamol for cramps)\n• Gentle yoga — child's pose, cobra, supine twist\n\n**Prevention:** Magnesium bisglycinate supplement taken daily reduces cramp severity over time. Dark chocolate and leafy greens also help! 🌿`;
  }

  // ── MOOD / STRESS / ANXIETY ──
  if (/mood|emotional|sad|anxi|stress|cry|irritab|angry|pms|depressed/.test(msg)) {
    return `Mood changes during the cycle are very real — hormones fluctuate a lot! 💜\n\n**What helps:**\n• Magnesium (reduces PMS mood symptoms significantly)\n• 20-min walk or light exercise\n• Limit sugar and alcohol (both worsen mood swings)\n• Journaling or talking to someone\n\nYou're not being "too emotional" — your body is doing a lot. Be kind to yourself. 🌸`;
  }

  // ── JOKES ──
  if (/joke|funny|make me laugh|tell me something funny|pun/.test(msg)) {
    const jokes = [
      `Why don't scientists trust atoms? Because they make up everything! ⚛️😄`,
      `Why did the calendar break up with the clock? Because its days were numbered! 📅😂`,
      `What do you call a factory that makes okay products? A satisfactory! 😆`,
      `I told my doctor I broke my arm in two places. He said: "Stop going to those places!" 🦴😂`,
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── GENERAL KNOWLEDGE FALLBACK ──
  // Instead of deflecting, give a helpful response that acknowledges the question
  if (msg.length > 3) {
    return `I don't have enough information to answer "${message}" with full accuracy right now (my knowledge fallback is limited). For the best answer, try rephrasing or asking with more details! 💜\n\nI can definitely help with: health advice, cycle questions, recipes, word meanings, general facts, and much more — just ask!`;
  }

  return `I'm not sure I understood that. Could you rephrase your question? I can answer general knowledge, health tips, word meanings, recipes, and more! 😊`;
}


export default withAuth(handler);

