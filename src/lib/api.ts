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

export const apiPartnerCodeLogin = (partnerCode: string, email: string, password: string, name?: string) =>
  request<{ token: string; user: any }>('/api/auth/partner-code-login', {
    method: 'POST',
    body: JSON.stringify({ partnerCode, email, password, name }),
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

export const apiGetCycleMetrics = () =>
  request<{
    currentDay: number;
    currentPhase: string;
    nextPeriodDaysLeft: number;
    cycleLength: number;
    periodDuration: number;
    lastPeriodDate: string | null;
    todayMood: string | null;
    todaySymptoms: string[];
    todayNotes: string | null;
  }>('/api/cycle/metrics');

// ── CHAT ─────────────────────────────────────

export const apiGetMessages = (threadId: string = 'auto') =>
  request<{ messages: any[]; threadId: string }>(`/api/chat/messages?threadId=${threadId}`);

export const apiSendMessage = (threadId: string = 'auto', text?: string, sticker?: string, mediaUrl?: string, mediaType?: string) =>
  request<{ message: any; threadId: string }>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ threadId, text, sticker, mediaUrl, mediaType }),
  });

export const apiAddReaction = (messageId: string, reaction: string) =>
  request<{ message: any }>('/api/chat/messages', {
    method: 'PATCH',
    body: JSON.stringify({ messageId, reaction }),
  });

export const apiEditMessage = (messageId: string, text: string) =>
  request<{ message: any }>('/api/chat/messages', {
    method: 'PATCH',
    body: JSON.stringify({ messageId, text }),
  });

export const apiDeleteMessage = (messageId: string) =>
  request<{ success: boolean }>('/api/chat/messages', {
    method: 'DELETE',
    body: JSON.stringify({ messageId }),
  });

export const apiClearChat = (threadId: string, clearForMe: boolean) =>
  request<{ success: boolean; cleared: string }>('/api/chat/messages', {
    method: 'DELETE',
    body: JSON.stringify({ threadId, clearForMe }),
  });

// ── AI CHAT ───────────────────────────────────

export const apiAiChat = (threadId: string, message: string, aiType: 'nyra' | 'partner' = 'nyra') =>
  request<{ reply: string }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ threadId, message, aiType }),
  });

// ── ROUTINES ──────────────────────────────────

export const apiGetRoutines = () =>
  request<{ routines: any[] }>('/api/routines');

export const apiCreateRoutine = (data: { name: string; time?: string; frequency?: string; type?: string; amount?: string }) =>
  request<{ routine: any }>('/api/routines', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const apiToggleRoutine = (id: string, completed: boolean) =>
  request<{ routine: any }>('/api/routines', {
    method: 'PATCH',
    body: JSON.stringify({ id, completed }),
  });

export const apiDeleteRoutine = (id: string) =>
  request<{ success: boolean }>(`/api/routines?id=${id}`, {
    method: 'DELETE',
  });

// ── DAILY LOGS & WATER ────────────────────────

export const apiGetDailyLog = () =>
  request<{ log: any }>('/api/daily-logs');

export const apiUpdateWaterIntake = (waterIntake: number, waterGoal?: number) =>
  request<{ log: any }>('/api/daily-logs', {
    method: 'POST',
    body: JSON.stringify({ waterIntake, waterGoal }),
  });

// ── AI THREADS & HISTORY ──────────────────────

export const apiGetAiThreads = () =>
  request<{ threads: any[] }>('/api/ai/threads');

export const apiCreateAiThread = (title?: string) =>
  request<{ thread: any }>('/api/ai/threads', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

export const apiRenameAiThread = (threadId: string, title: string) =>
  request<{ thread: any }>('/api/ai/threads', {
    method: 'PATCH',
    body: JSON.stringify({ threadId, title }),
  });

export const apiDeleteAiThread = (threadId: string) =>
  request<{ success: boolean }>(`/api/ai/threads?threadId=${threadId}`, {
    method: 'DELETE',
  });

export const apiGetAiMessages = (threadId: string) =>
  request<{ messages: any[] }>(`/api/ai/messages?threadId=${threadId}`);

// ── NOTIFICATION SETTINGS ─────────────────────

export const apiGetNotificationSettings = () =>
  request<{ settings: any }>('/api/settings/notifications');

export const apiUpdateNotificationSettings = (updates: Record<string, any>) =>
  request<{ settings: any }>('/api/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

// ── ACCOUNT MANAGEMENT & AUTH HELPERS ─────────

export const apiDeleteAccount = (password: string) =>
  request<{ success: boolean; message?: string }>('/api/users/delete-account', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const apiRequestPasswordReset = (email: string) =>
  request<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ step: 'request', email }),
  });

export const apiResetPassword = (email: string, otp: string, newPassword: string) =>
  request<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ step: 'reset', email, otp, newPassword }),
  });


