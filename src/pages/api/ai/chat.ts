import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { withAuth, AuthUser } from '../../../lib/withAuth';

// POST /api/ai/chat
// Body: { threadId, message, aiType }
// aiType: 'nyra' (for Sarah) | 'partner' (for John)
// Calls Google Gemini API with cycle-context system prompt

async function handler(req: NextApiRequest, res: NextApiResponse, authUser: AuthUser) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { threadId, message, aiType = 'nyra' } = req.body;
  if (!threadId || !message) {
    return res.status(400).json({ error: 'threadId and message are required' });
  }

  const supabase = supabaseAdmin();

  try {
    // 1. Verify thread belongs to user
    const { data: thread } = await supabase
      .from('ai_threads')
      .select('id, title')
      .eq('id', threadId)
      .eq('user_id', authUser.userId)
      .single();

    if (!thread) return res.status(403).json({ error: 'Thread not found' });

    // 2. Fetch user profile + recent cycle logs for context
    const { data: userProfile } = await supabase
      .from('users')
      .select('name, age, cycle_length, period_duration')
      .eq('id', authUser.userId)
      .single();

    // Get last 30 days of cycle logs for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentLogs } = await supabase
      .from('cycle_logs')
      .select('date, is_period, is_ovulation, flow, symptoms, mood')
      .eq('user_id', authUser.userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(15);

    // Calculate current cycle day/phase from logs
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

    // 4. Build system prompt based on AI type
    const userName = userProfile?.name || 'Sarah';
    const systemPrompt = aiType === 'partner'
      ? `You are Nyra, an AI wellness companion specifically helping a partner (likely male) understand and support ${userName}'s menstrual health and cycle.
         
         Current Cycle Data for ${userName}:
         - Cycle Day: ${currentDay} of ${userProfile?.cycle_length || 28}
         - Current Phase: ${currentPhase}
         - Recent symptoms: ${recentLogs?.flatMap(l => l.symptoms || []).slice(0, 5).join(', ') || 'none logged'}
         
         Your role: Give empathetic, practical, specific advice on how the partner can support ${userName} right now based on her actual phase. 
         Keep responses warm, actionable, and under 3 sentences. Never use clinical jargon.`
      : `You are Nyra, a warm, empathetic AI wellness companion for women's health. You specialize in menstrual cycle education, self-care, nutrition, and emotional wellness.
         
         Current data for ${userName}:
         - Age: ${userProfile?.age || 'unknown'}
         - Cycle Day: ${currentDay} of ${userProfile?.cycle_length || 28}  
         - Current Phase: ${currentPhase}
         - Average cycle length: ${userProfile?.cycle_length || 28} days
         - Recent symptoms: ${recentLogs?.flatMap(l => l.symptoms || []).slice(0, 5).join(', ') || 'none logged'}
         - Recent moods: ${recentLogs?.map(l => l.mood).filter(Boolean).slice(0, 3).join(', ') || 'not tracked'}
         
         Provide personalized, caring, evidence-based advice. Be conversational, supportive, and use emojis occasionally. Keep responses concise (2-4 sentences) unless the user asks for detail.`;

    // 5. Save user message to DB
    await supabase.from('ai_messages').insert({
      thread_id: threadId,
      role: 'user',
      content: message,
    });

    // 6. Call Google Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      // Fallback response if Gemini key not set yet
      const fallbackReply = `I'm here to help! Currently in the ${currentPhase} phase (Day ${currentDay}), ${
        currentPhase === 'Luteal' ? 'your body may need extra rest and nourishment. Prioritizing gentle movement and warm foods can make a big difference! 🌸' :
        currentPhase === 'Menstrual' ? 'be gentle with yourself. Rest, warmth, and iron-rich foods are your best friends right now. 💝' :
        currentPhase === 'Ovulation' ? 'your energy is at its peak! Great time for social activities and exercise. ✨' :
        'your energy is building beautifully. This is a great time for new projects and social connections! 🌟'
      }`;
      
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'assistant',
        content: fallbackReply,
      });

      return res.status(200).json({ reply: fallbackReply });
    }

    // Build Gemini API request
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
    const aiReply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm here to support you! Let me know what you need. 🌸";

    // 7. Save AI reply to DB
    await supabase.from('ai_messages').insert({
      thread_id: threadId,
      role: 'assistant',
      content: aiReply,
    });

    return res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'AI service error' });
  }
}

export default withAuth(handler);
