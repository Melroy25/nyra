// Client-side service for calling the AI chat API
// Uses the Vercel serverless function in production, or direct OpenAI call in development

interface CycleContext {
  cycleDay: number;
  phaseName: string;
  estrogenLevel: string;
  progesteroneLevel: string;
  fertilityStatus: string;
  daysUntilNextPeriod: number;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export const sendChatMessage = async (
  messages: ChatMessage[],
  cycleContext?: CycleContext
): Promise<string> => {
  // Try the Vercel serverless API route first
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, cycleContext })
    });

    if (response.ok) {
      const data = await response.json();
      return data.reply;
    }

    // If API route returns error, try direct call with client-side key as fallback
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      return await directOpenAICall(messages, cycleContext, apiKey);
    }

    throw new Error('API not available');
  } catch (error) {
    // Fallback: try direct OpenAI call if client-side key exists
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      try {
        return await directOpenAICall(messages, cycleContext, apiKey);
      } catch {
        // Fall through to simulated response
      }
    }

    // Final fallback: return null to trigger simulated response
    throw new Error('AI service unavailable');
  }
};

async function directOpenAICall(
  messages: ChatMessage[],
  cycleContext: CycleContext | undefined,
  apiKey: string
): Promise<string> {
  let systemPrompt = `You are Nyra, a warm women's health & wellness AI assistant. Keep responses concise (2-3 paragraphs). Use gentle, supportive tone with occasional emojis (💜, 🌸). Explain WHY symptoms occur, give practical tips, and encourage consulting a doctor for severe symptoms.`;

  if (cycleContext) {
    systemPrompt += ` User is on cycle day ${cycleContext.cycleDay} (${cycleContext.phaseName} phase). Estrogen: ${cycleContext.estrogenLevel}, Progesterone: ${cycleContext.progesteroneLevel}.`;
  }

  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-15).map(m => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
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

  if (!response.ok) throw new Error('OpenAI API error');

  const data = await response.json();
  return data.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
}
