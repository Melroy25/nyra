import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/ai/chat
// Body: { threadId, message, aiType }
// aiType: 'nyra' (for Sarah/User) | 'partner' (for Partner)
// Calls Google Gemini API with cycle-context system prompt or provides wellness fallback

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
        .eq('ai_type', aiType)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (!existingThread) {
        const { data: newThread } = await supabase
          .from('ai_threads')
          .insert({
            user_id: authUser.userId,
            title: aiType === 'partner' ? 'Partner Support AI' : 'Nyra Wellness Companion',
            ai_type: aiType,
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
      const cycleLength = userProfile?.cycle_length || 28;
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
    const userName = userProfile?.name || 'Partner';
    const systemPrompt = aiType === 'partner'
      ? `You are Nyra, an AI wellness companion specifically helping a partner understand and support their partner's menstrual health.
         Current Cycle Data: Cycle Day ${currentDay} of ${userProfile?.cycle_length || 28}, Phase: ${currentPhase}.
         Give empathetic, practical advice under 3 sentences.`
      : `You are Nyra, a warm, empathetic AI wellness companion for women's health.
         Current data for ${userName}: Age: ${userProfile?.age || 'unknown'}, Cycle Day: ${currentDay} (${currentPhase} phase).
         Provide personalized, caring, evidence-based advice in 2-4 sentences with emojis.`;

    // 5. Save user message to DB
    if (threadId) {
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'user',
        content: message,
      });
    }

    // 6. Call Google Gemini API (or fallback if key not present / rate limited)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiReply = '';

    if (geminiApiKey && geminiApiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE') {
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
                temperature: 0.7,
                maxOutputTokens: 300,
              },
            }),
          }
        );

        const geminiData = await geminiResponse.json();
        aiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e) {
        console.log('Gemini API call failed, using fallback:', e);
      }
    }

    if (!aiReply) {
      aiReply = `I'm here to support you! Currently in the ${currentPhase} phase (Day ${currentDay}), ${
        currentPhase === 'Luteal' ? 'your body may need extra rest and nourishment. Prioritizing gentle movement and warm foods can make a big difference! 🌸' :
        currentPhase === 'Menstrual' ? 'be gentle with yourself. Rest, warmth, and iron-rich foods are your best friends right now. 💝' :
        currentPhase === 'Ovulation' ? 'your energy is at its peak! Great time for social activities and exercise. ✨' :
        'your energy is building beautifully. This is a great time for new projects and social connections! 🌟'
      }`;
    }

    // 7. Save AI reply to DB
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

export default withAuth(handler);
