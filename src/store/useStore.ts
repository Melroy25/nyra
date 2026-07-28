import { create } from 'zustand';
import { User, CycleLog, FlowLevel, ChatMessage, ChatThread, RoutineItem } from '../types';
import { mockUser, mockPartner } from '../data/users';
import { mockCycleLogs, generateInitialCycleLogs } from '../data/cycles';
import { mockMessages } from '../data/chat';
import { chatService } from '../services/chatService';

interface AppState {
  // Appearance
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Authentication & Onboarding
  user: User | null;
  onboardingStep: number;
  onboardingData: {
    name: string;
    age: number;
    dob: string;
    lastPeriodDate: string;
    averageCycleLength: number;
    periodDuration: number;
    goals: string[];
  };
  partnerConnectionCode: string;
  isPartnerConnected: boolean;

  // Cycle Logging
  cycleLogs: CycleLog[];
  currentCycleDay: number;
  currentCyclePhase: string;
  nextPeriodDaysLeft: number;

  // Multiple Chat Threads
  chatThreads: ChatThread[];
  activeThreadId: string;
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Partner AI Chat Threads
  partnerAiThreads: ChatThread[];
  activePartnerAiThreadId: string;

  // Routines & Reminders
  routines: RoutineItem[];
  waterIntake: number; // in ml
  waterGoal: number; // in ml

  // Feature Toggles
  featureToggles: {
    waterEnabled: boolean;
    moodEnabled: boolean;
    symptomsEnabled: boolean;
    chatNotifsEnabled: boolean;
    skincareNotifsEnabled: boolean;
  };
  setFeatureToggle: (key: 'waterEnabled' | 'moodEnabled' | 'symptomsEnabled' | 'chatNotifsEnabled' | 'skincareNotifsEnabled', value: boolean) => void;

  // Actions
  setUser: (user: User | null) => void;
  setOnboardingStep: (step: number) => void;
  updateOnboardingData: (data: Partial<AppState['onboardingData']>) => void;
  completeOnboarding: () => void;
  setPartnerConnectionCode: (code: string) => void;
  connectPartner: (code: string) => boolean;

  // Cycle Actions
  startPeriod: (date: string) => void;
  endPeriod: (date: string) => void;
  logFlow: (date: string, flow: FlowLevel | null) => void;
  logSymptom: (date: string, symptom: string) => void;
  removeSymptom: (date: string, symptom: string) => void;
  logMood: (date: string, mood: string | null) => void;
  logNotes: (date: string, notes: string) => void;
  setSeverity: (date: string, severity: number) => void;
  recalculateCycleMetrics: () => void;
  seedCycleLogs: (lastPeriodDate: string, periodDuration: number, cycleLength: number) => void;
  deleteMoodLog: (date: string) => void;
  deleteSymptomLog: (date: string) => void;
  deletePeriodLog: (date: string) => void;
  setCycleLogs: (logs: CycleLog[]) => void;

  // Chat Actions
  setActiveThreadId: (id: string) => void;
  createChatThread: (title?: string) => string;
  renameChatThread: (id: string, title: string) => void;
  deleteChatThread: (id: string) => void;
  addMessage: (text: string, sticker?: string) => void;
  addReaction: (messageId: string, reaction: string) => void;

  // Partner AI Chat Actions
  setActivePartnerAiThreadId: (id: string) => void;
  createPartnerAiThread: (title?: string) => string;
  renamePartnerAiThread: (id: string, title: string) => void;
  deletePartnerAiThread: (id: string) => void;
  addPartnerAiMessage: (text: string, isAi?: boolean, imageUrl?: string) => void;

  // Routine Actions
  toggleRoutine: (id: string) => void;
  addRoutine: (name: string, time: string, frequency: string, type: RoutineItem['type']) => void;
  deleteRoutine: (id: string) => void;
  addWater: (amount: number) => void;
  setWaterGoal: (goal: number) => void;
  resetWater: () => void;
}

// Initial default routines
const defaultRoutines: RoutineItem[] = [
  { id: 'rot-1', name: 'Multivitamin', time: '08:00 AM', frequency: 'Daily', type: 'supplement', completed: false },
  { id: 'rot-2', name: 'Morning Skincare', time: '08:30 AM', frequency: 'Daily', type: 'skincare_morning', completed: false },
  { id: 'rot-3', name: 'Magnesium', time: '09:00 PM', frequency: 'Daily', type: 'supplement', completed: false },
  { id: 'rot-4', name: 'Night Skincare', time: '10:00 PM', frequency: 'Daily', type: 'skincare_night', completed: false },
];

export const useStore = create<AppState>((set, get) => ({
  // Appearance
  darkMode: false,
  toggleDarkMode: () => {
    const nextDark = !get().darkMode;
    set({ darkMode: nextDark });
    if (typeof window !== 'undefined') {
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  // Feature Toggles
  featureToggles: {
    waterEnabled: true,
    moodEnabled: true,
    symptomsEnabled: true,
    chatNotifsEnabled: true,
    skincareNotifsEnabled: true,
  },

  setFeatureToggle: (key, value) =>
    set((state) => {
      const nextToggles = { ...state.featureToggles, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyra_feature_toggles', JSON.stringify(nextToggles));
      }
      return { featureToggles: nextToggles };
    }),

  // Auth state — start as null to match SSR (cache restored in _app.tsx useEffect)
  user: null,
  onboardingStep: 1,
  onboardingData: {
    name: '',
    age: 0,
    dob: '',
    lastPeriodDate: '',
    averageCycleLength: 28,
    periodDuration: 5,
    goals: ['Track cycle'],
  },
  partnerConnectionCode: '',
  isPartnerConnected: false,

  // Cycle state — start as [] to match SSR (restored in _app.tsx useEffect)
  cycleLogs: [],
  currentCycleDay: 1,
  currentCyclePhase: 'Follicular',
  nextPeriodDaysLeft: 28,

  // Chat state with initial threads
  chatThreads: [
    {
      id: 'thread-1',
      title: 'Chat #1',
      messages: mockMessages,
    },
    {
      id: 'thread-2',
      title: 'Chat #2',
      messages: [
        {
          id: 'msg-init-t2',
          senderId: 'partner-john',
          text: 'Hey! Ready for yoga recovery session? 🧘',
          timestamp: '2026-01-01T00:00:00.000Z',
        }
      ],
    }
  ],
  activeThreadId: 'thread-1',
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),

  // Partner AI Chat state
  partnerAiThreads: [
    {
      id: 'p-thread-1',
      title: 'Partner Support Chat',
      messages: [],
    },
  ],
  activePartnerAiThreadId: 'p-thread-1',

  // Routines state
  routines: defaultRoutines,
  waterIntake: 750,
  waterGoal: 2000,

  // Auth actions
  setUser: (user) => {
    const uAny = user as any;
    const normalized = user ? {
      ...user,
      dob: user.dateOfBirth || uAny?.date_of_birth || user.dob || '',
      dateOfBirth: user.dateOfBirth || uAny?.date_of_birth || user.dob || '',
      lastPeriodDate: user.lastPeriodDate || uAny?.last_period_date || '',
      cycleLength: user.cycleLength || uAny?.cycle_length || 28,
      periodDuration: user.periodDuration || uAny?.period_duration || 5,
    } : null;

    set({ user: normalized });
    if (typeof window !== 'undefined') {
      if (normalized) {
        localStorage.setItem('nyra_cached_user', JSON.stringify(normalized));
      } else {
        localStorage.removeItem('nyra_cached_user');
      }
    }
    setTimeout(() => { get().recalculateCycleMetrics(); }, 50);
  },
  seedCycleLogs: (lastPeriodDate, periodDuration, cycleLength) => {
    // Only seed if localStorage & state have zero real period logs
    const existing = get().cycleLogs.filter((l) => l.isPeriod && !l.isPredicted);
    if (existing.length === 0 && lastPeriodDate) {
      const logs = generateInitialCycleLogs(lastPeriodDate, periodDuration, cycleLength);
      set({ cycleLogs: logs });
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      }
      get().recalculateCycleMetrics();
    }
  },
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  updateOnboardingData: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),
  completeOnboarding: () => {
    const data = get().onboardingData;
    const newUser: User = {
      id: 'user-sarah',
      name: data.name,
      age: data.age,
      dob: data.dob,
      averageCycleLength: data.averageCycleLength,
      cycleLength: data.averageCycleLength || 28,
      periodDuration: data.periodDuration,
      goals: data.goals,
      partnerCode: 'NYRA-82941',
      connectedPartnerCode: 'partner-john',
      role: 'user',
    };
    // Auto-generate period, predicted, and ovulation logs from onboarding answers
    const initialLogs = generateInitialCycleLogs(
      data.lastPeriodDate,
      data.periodDuration || 5,
      data.averageCycleLength || 28
    );
    set({ user: newUser, onboardingStep: 1, cycleLogs: initialLogs });
    get().recalculateCycleMetrics();
  },
  setPartnerConnectionCode: (partnerConnectionCode) => set({ partnerConnectionCode }),
  connectPartner: (code) => {
    if (code === 'NYRA-82941') {
      set({ user: mockPartner, isPartnerConnected: true });
      return true;
    }
    return false;
  },

  // Cycle actions
  startPeriod: (date) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        logs[index] = { ...logs[index], isPeriod: true, flow: 'medium' };
      } else {
        logs.push({ date, isPeriod: true, isPredicted: false, isOvulation: false, flow: 'medium', symptoms: [], mood: null });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  endPeriod: (date) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        logs[index] = { ...logs[index], isPeriod: false, flow: null };
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  logFlow: (date, flow) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      const isPeriod = flow !== null;
      if (index > -1) {
        logs[index] = { ...logs[index], flow, isPeriod };
      } else {
        logs.push({ date, isPeriod, isPredicted: false, isOvulation: false, flow, symptoms: [], mood: null });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  logSymptom: (date, symptom) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        const symptoms = logs[index].symptoms.includes(symptom)
          ? logs[index].symptoms
          : [...logs[index].symptoms, symptom];
        logs[index] = { ...logs[index], symptoms };
      } else {
        logs.push({ date, isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: [symptom], mood: null });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  removeSymptom: (date, symptom) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        const symptoms = logs[index].symptoms.filter((s) => s !== symptom);
        logs[index] = { ...logs[index], symptoms };
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  logMood: (date, mood) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        logs[index] = { ...logs[index], mood };
      } else {
        logs.push({ date, isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: [], mood });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  logNotes: (date, notes) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        logs[index] = { ...logs[index], notes };
      } else {
        logs.push({ date, isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: [], mood: null, notes });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  setSeverity: (date, severity) =>
    set((state) => {
      const logs = [...state.cycleLogs];
      const index = logs.findIndex((l) => l.date === date);
      if (index > -1) {
        logs[index] = { ...logs[index], severity };
      } else {
        logs.push({ date, isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: [], mood: null, severity });
      }
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  deleteMoodLog: (date) =>
    set((state) => {
      const logs = state.cycleLogs
        .map((l) => (l.date === date ? { ...l, mood: null, notes: '' } : l))
        .filter((l) => l.isPeriod || l.isOvulation || (l.symptoms && l.symptoms.length > 0) || l.mood !== null);
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  deleteSymptomLog: (date) =>
    set((state) => {
      const logs = state.cycleLogs
        .map((l) => (l.date === date ? { ...l, symptoms: [], severity: undefined } : l))
        .filter((l) => l.isPeriod || l.isOvulation || (l.symptoms && l.symptoms.length > 0) || l.mood !== null);
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  deletePeriodLog: (date) =>
    set((state) => {
      const logs = state.cycleLogs
        .map((l) => (l.date === date ? { ...l, isPeriod: false, flow: null } : l))
        .filter((l) => l.isPeriod || l.isOvulation || (l.symptoms && l.symptoms.length > 0) || l.mood !== null);
      if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
      return { cycleLogs: logs };
    }),

  setCycleLogs: (logs) => {
    if (typeof window !== 'undefined') localStorage.setItem('nyra_cycle_logs', JSON.stringify(logs));
    set({ cycleLogs: logs });
  },

  recalculateCycleMetrics: () => {
    const userObj = get().user;
    const rawDate = userObj?.lastPeriodDate || (userObj as any)?.last_period_date || get().onboardingData.lastPeriodDate || null;
    const actualLogs = get().cycleLogs.filter((l) => l.isPeriod && !l.isPredicted);
    
    let lastLogDate = rawDate;
    if (actualLogs.length > 0) {
      const sorted = [...actualLogs].sort((a, b) => a.date.localeCompare(b.date));
      lastLogDate = sorted[sorted.length - 1].date;
    }

    let currentDay = 1;
    let phase = 'Follicular';
    const cycleLength = userObj?.cycleLength || (userObj as any)?.cycle_length || get().onboardingData.averageCycleLength || 28;
    const periodDur = userObj?.periodDuration || (userObj as any)?.period_duration || get().onboardingData.periodDuration || 5;

    if (lastLogDate) {
      const parts = lastLogDate.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const lastPeriodLocal = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffMs = todayLocal.getTime() - lastPeriodLocal.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          currentDay = (diffDays % cycleLength) + 1;
        }
      }
    }

    if (isNaN(currentDay) || currentDay < 1) currentDay = 1;

    if (currentDay <= periodDur) {
      phase = 'Menstrual';
    } else if (currentDay <= Math.floor(cycleLength * 0.46)) {
      phase = 'Follicular';
    } else if (currentDay <= Math.floor(cycleLength * 0.58)) {
      phase = 'Ovulation';
    } else {
      phase = 'Luteal';
    }

    const nextPeriod = cycleLength - currentDay + 1;

    set({
      currentCycleDay: currentDay,
      currentCyclePhase: phase,
      nextPeriodDaysLeft: nextPeriod > 0 ? nextPeriod : cycleLength,
    });
  },

  // Multi-Chat Actions
  setActiveThreadId: (activeThreadId) => set({ activeThreadId }),
  
  createChatThread: (title) => {
    const newId = `thread-${Date.now()}`;
    const newTitle = title || `Chat #${get().chatThreads.length + 1}`;
    
    set((state) => ({
      chatThreads: [
        ...state.chatThreads,
        {
          id: newId,
          title: newTitle,
          messages: [
            {
              id: `msg-welcome-${Date.now()}`,
              senderId: 'partner-john',
              text: 'A new secure chat space has been opened. 🌸',
              timestamp: new Date().toISOString(),
            }
          ],
        }
      ],
      activeThreadId: newId,
    }));
    return newId;
  },

  renameChatThread: (id, title) =>
    set((state) => ({
      chatThreads: state.chatThreads.map((t) =>
        t.id === id ? { ...t, title } : t
      ),
    })),

  deleteChatThread: (id) =>
    set((state) => {
      const remaining = state.chatThreads.filter((t) => t.id !== id);
      const active = state.activeThreadId === id 
        ? (remaining[0]?.id || '') 
        : state.activeThreadId;
      return {
        chatThreads: remaining,
        activeThreadId: active,
      };
    }),

  addMessage: (text, sticker) => {
    const user = get().user;
    const activeId = get().activeThreadId;
    const senderId = user?.role === 'partner' ? 'partner-john' : 'user-sarah';
    
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      text,
      sticker,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      chatThreads: state.chatThreads.map((t) =>
        t.id === activeId 
          ? { ...t, messages: [...t.messages, newMsg] } 
          : t
      ),
    }));

    // Simulate response delay in active thread
    if (user?.role === 'user' && text) {
      setTimeout(() => {
        const replyText = chatService.getSimulatedPartnerReply(text);
        const partnerMsg: ChatMessage = {
          id: `msg-reply-${Date.now()}`,
          senderId: 'partner-john',
          text: replyText,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          chatThreads: state.chatThreads.map((t) =>
            t.id === activeId 
              ? { ...t, messages: [...t.messages, partnerMsg] } 
              : t
          ),
        }));
      }, 1500);
    }
  },

  addReaction: (messageId, reaction) =>
    set((state) => ({
      chatThreads: state.chatThreads.map((t) =>
        t.id === state.activeThreadId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === messageId ? { ...m, reaction } : m
              ),
            }
          : t
      ),
    })),

  // Partner AI Multi-Chat Actions
  setActivePartnerAiThreadId: (activePartnerAiThreadId) => set({ activePartnerAiThreadId }),

  createPartnerAiThread: (title) => {
    const newId = `p-thread-${Date.now()}`;
    const newTitle = title || `Support Chat #${get().partnerAiThreads.length + 1}`;
    
    set((state) => ({
      partnerAiThreads: [
        ...state.partnerAiThreads,
        {
          id: newId,
          title: newTitle,
          messages: [
            {
              id: `p-ai-init-${Date.now()}`,
              senderId: 'nyra-ai',
              text: `Hello John! This is "${newTitle}". How can I help you support Sarah today?`,
              timestamp: new Date().toISOString(),
            }
          ],
        }
      ],
      activePartnerAiThreadId: newId,
    }));
    return newId;
  },

  renamePartnerAiThread: (id, title) =>
    set((state) => ({
      partnerAiThreads: state.partnerAiThreads.map((t) =>
        t.id === id ? { ...t, title } : t
      ),
    })),

  deletePartnerAiThread: (id) =>
    set((state) => {
      const filtered = state.partnerAiThreads.filter((t) => t.id !== id);
      const nextActiveId = filtered.length > 0 ? filtered[0].id : '';
      return {
        partnerAiThreads: filtered,
        activePartnerAiThreadId: state.activePartnerAiThreadId === id ? nextActiveId : state.activePartnerAiThreadId,
      };
    }),

  addPartnerAiMessage: (text, isAi = false, imageUrl?: string) => {
    const activeId = get().activePartnerAiThreadId;
    if (!activeId || (!text.trim() && !imageUrl)) return;

    const newMsg: ChatMessage = {
      id: `p-${isAi ? 'ai' : 'user'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: isAi ? 'nyra-ai' : 'user',
      text: text.trim(),
      imageUrl,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      partnerAiThreads: state.partnerAiThreads.map((t) =>
        t.id === activeId
          ? { ...t, messages: [...t.messages, newMsg] }
          : t
      ),
    }));
  },

  // Routine Actions
  toggleRoutine: (id) =>
    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r
      ),
    })),

  addRoutine: (name, time, frequency, type) =>
    set((state) => ({
      routines: [
        ...state.routines,
        { id: `rot-${Date.now()}`, name, time, frequency, type, completed: false },
      ],
    })),

  deleteRoutine: (id) =>
    set((state) => ({
      routines: state.routines.filter((r) => r.id !== id),
    })),

  addWater: (amount) =>
    set((state) => ({
      waterIntake: Math.min(state.waterIntake + amount, 4000),
    })),

  setWaterGoal: (goal) => set({ waterGoal: goal }),

  resetWater: () => set({ waterIntake: 0 }),
}));
