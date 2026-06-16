// Vercel Serverless Function: POST /api/chat
// This keeps the OpenAI API key secure on the server side

declare const process: any;

export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are Nyra, a warm, empathetic, and knowledgeable women's health & wellness AI assistant. You specialize in menstrual cycle health, hormonal wellness, nutrition guidance, and emotional support.

PERSONALITY:
- Warm, caring, and non-judgmental
- Use a gentle, supportive tone like a trusted friend who happens to be a health expert
- Include relevant emojis sparingly for warmth (💜, 🌸, ✨, 💪)
- Keep responses concise but informative (2-4 short paragraphs max)

EXPERTISE AREAS:
- Menstrual cycle phases (Menstrual, Follicular, Ovulatory, Luteal) and their effects
- Hormone fluctuations (estrogen, progesterone) and their impact on mood, energy, cravings
- Cycle-based nutrition and cravings explanations
- PMS/PMDD symptom management
- Bloating, cramps, headaches, fatigue explanations and relief tips
- Mood changes and emotional wellbeing
- Sleep optimization during different cycle phases
- Exercise recommendations by cycle phase
- Hydration and supplement guidance

GUIDELINES:
- Always acknowledge the user's feelings first before offering advice
- Explain WHY symptoms occur (link to hormones/cycle phase) before giving tips
- Provide actionable, practical suggestions
- If the user shares their cycle phase/day, personalize your response
- Never diagnose medical conditions — suggest consulting a healthcare provider for persistent/severe symptoms
- Be inclusive and sensitive about reproductive health topics
- If asked about topics outside women's health, gently redirect while being helpful

RESPONSE FORMAT:
- Start with a warm acknowledgment
- Explain the science briefly
- Give 2-3 practical tips
- End with encouragement`;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, cycleContext } = await req.json();

    // Build context-aware system message
    let systemMessage = SYSTEM_PROMPT;
    if (cycleContext) {
      systemMessage += `\n\nCURRENT USER CONTEXT:
- Cycle Day: ${cycleContext.cycleDay}
- Phase: ${cycleContext.phaseName}
- Estrogen Level: ${cycleContext.estrogenLevel}
- Progesterone Level: ${cycleContext.progesteroneLevel}
- Fertility Status: ${cycleContext.fertilityStatus}
- Days Until Next Period: ${cycleContext.daysUntilNextPeriod}`;
    }

    // Prepare messages for OpenAI (last 20 messages for context window)
    const chatMessages = [
      { role: 'system', content: systemMessage },
      ...messages.slice(-20).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI API error: ${error}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
