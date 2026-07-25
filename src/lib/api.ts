// Central API client for Nyra backend
// All calls use JWT from localStorage for auth

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nyra_token');
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

// ── AUTH ──────────────────────────────────────

export const apiLogin = (email: string, password: string) =>
  request<{ token: string; user: any }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const apiRegister = (email: string, password: string, name: string, role: string) =>
  request<{ token: string; user: any }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  });

export const apiPartnerCodeLogin = (partnerCode: string, name?: string) =>
  request<{ token: string; user: any }>('/api/auth/partner-code-login', {
    method: 'POST',
    body: JSON.stringify({ partnerCode, name }),
  });

// ── USER ──────────────────────────────────────

export const apiGetProfile = () =>
  request<{ user: any }>('/api/users/profile');

export const apiUpdateProfile = (updates: Record<string, any>) =>
  request<{ user: any }>('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const apiCompleteOnboarding = (data: Record<string, any>) =>
  request<{ success: boolean; user: any }>('/api/users/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const apiConnectPartner = (partnerCode: string) =>
  request<{ success: boolean; connectedPartner: any }>('/api/users/connect-partner', {
    method: 'POST',
    body: JSON.stringify({ partnerCode }),
  });

export const apiRegenerateCode = () =>
  request<{ success: boolean; user: any }>('/api/users/regenerate-code', {
    method: 'POST',
  });


export const apiGetPartnerDashboard = () =>
  request<{
    isConnected: boolean;
    partner?: any;
    cycleMetrics?: {
      currentDay: number;
      currentPhase: string;
      daysLeft: number;
      updatedText: string;
      energyLevel: string;
      cravings: string;
      latestMood: string;
      latestSymptoms: string[];
    };
    suggestions?: { title: string; desc: string }[];
  }>('/api/partner/dashboard');

// ── CYCLE LOGS ────────────────────────────────

export const apiGetCycleLogs = (month?: string) =>
  request<{ logs: any[] }>(`/api/cycle/logs${month ? `?month=${month}` : ''}`);

export const apiSaveCycleLog = (log: Record<string, any>) =>
  request<{ log: any }>('/api/cycle/logs', {
    method: 'POST',
    body: JSON.stringify(log),
  });

// ── CHAT ─────────────────────────────────────

export const apiGetMessages = (threadId: string) =>
  request<{ messages: any[] }>(`/api/chat/messages?threadId=${threadId}`);

export const apiSendMessage = (threadId: string, text?: string, sticker?: string) =>
  request<{ message: any }>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ threadId, text, sticker }),
  });

export const apiAddReaction = (messageId: string, reaction: string) =>
  request<{ message: any }>('/api/chat/messages', {
    method: 'PATCH',
    body: JSON.stringify({ messageId, reaction }),
  });

// ── AI CHAT ───────────────────────────────────

export const apiAiChat = (threadId: string, message: string, aiType: 'nyra' | 'partner' = 'nyra') =>
  request<{ reply: string }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ threadId, message, aiType }),
  });
