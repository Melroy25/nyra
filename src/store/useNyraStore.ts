import { create } from 'zustand';
import type { DailyLog, Cycle, UserProfile, NotificationSettings, Medication } from '../types';
import { generateMockData, generateCyclesList, formatDate } from '../data/mockData';
import * as fs from '../services/firestoreService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  images?: string[]; // base64 data URLs
  timestamp: string; // ISO string
}

export interface NyraState {
  view: 'landing' | 'onboarding' | 'dashboard' | 'analytics' | 'chat' | 'nutrition' | 'profile';
  onboardingStep: number;
  profile: UserProfile;
  notifications: NotificationSettings;
  logs: DailyLog[];
  cycles: Cycle[];
  chats: { id: string; name?: string; messages: ChatMessage[] }[];
  activeChatId: string;
  darkMode: boolean;
  medications: Medication[];
  userId: string | null;
  isLoading: boolean;
  
  // Core Actions
  setView: (view: NyraState['view']) => void;
  setOnboardingStep: (step: number) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  addOrUpdateLog: (log: DailyLog) => void;
  completeOnboarding: (
    name: string,
    age: number,
    cycleLength: number,
    periodLength: number,
    lastPeriodStart: string,
    lastPeriodEnd: string
  ) => void;
  
  // Chat Actions
  createNewChat: () => void;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  addChatMessage: (sender: 'user' | 'ai', text: string, images?: string[]) => void;
  clearChat: () => void;
  renameChat: (id: string, name: string) => void;
  
  addWaterCup: (dateStr: string) => void;
  removeWaterCup: (dateStr: string) => void;
  toggleDarkMode: () => void;
  
  // Medication Actions
  addMedication: (name: string, times: string[], durationDays: number) => void;
  removeMedication: (id: string) => void;

  // Auth & Data Actions
  setUserId: (userId: string | null) => void;
  loadUserData: (userId: string) => Promise<void>;
  resetState: () => void;
}

// Initial default profile with dynamic dates relative to current date (Day 12 today)
const today = new Date();
const twelveDaysAgo = new Date(today);
twelveDaysAgo.setDate(today.getDate() - 12);
const eightDaysAgo = new Date(today);
eightDaysAgo.setDate(today.getDate() - 8);

const defaultProfile: UserProfile = {
  name: 'Aria',
  age: 26,
  avgCycleLength: 28,
  avgPeriodLength: 5,
  isPremium: true,
  lastPeriodStart: formatDate(twelveDaysAgo),
  lastPeriodEnd: formatDate(eightDaysAgo),
  hydrationGoal: 8
};

// Initial default notifications
const defaultNotifications: NotificationSettings = {
  periodReminders: true,
  ovulationReminders: true,
  dailyCheckIn: true,
  dailyCheckInTime: '20:00',
  medicationReminders: false,
  waterReminders: true
};

// Generate default mock data based on 28 day cycle
const initialData = generateMockData(28, 5, 180, formatDate(twelveDaysAgo), formatDate(eightDaysAgo));

const defaultChats = [
  {
    id: 'chat-default',
    messages: [
      {
        id: 'welcome',
        sender: 'ai' as const,
        text: "Hello, I'm Nyra, your AI wellness companion. How can I support you on your wellness journey today? Feel free to ask me about your cycle phase, mood changes, nutrition, or cravings.",
        timestamp: new Date().toISOString()
      }
    ]
  }
];

const defaultMedications: Medication[] = [
  { id: 'med-1', name: 'Iron Supplement', times: ['08:00'], durationDays: 30, startDate: formatDate(new Date()) },
  { id: 'med-2', name: 'Multivitamin', times: ['20:30'], durationDays: 30, startDate: formatDate(new Date()) }
];

// Helper: fire-and-forget Firestore save (non-blocking)
const saveToFirestore = (fn: () => Promise<void>) => {
  fn().catch(err => console.warn('Firestore save failed (offline?):', err.message));
};

export const useNyraStore = create<NyraState>((set) => ({
  view: 'landing',
  onboardingStep: 0,
  profile: defaultProfile,
  notifications: defaultNotifications,
  logs: initialData.logs,
  cycles: initialData.cycles,
  darkMode: false,
  medications: defaultMedications,
  chats: defaultChats,
  activeChatId: 'chat-default',
  userId: null,
  isLoading: false,
  
  setView: (view) => set({ view }),
  
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  
  setUserId: (userId) => set({ userId }),

  loadUserData: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [profile, notifications, logs, cycles, medications, chats, darkMode] = await Promise.all([
        fs.loadProfile(userId),
        fs.loadNotifications(userId),
        fs.loadLogs(userId),
        fs.loadCycles(userId),
        fs.loadMedications(userId),
        fs.loadChats(userId),
        fs.loadDarkMode(userId)
      ]);

      set({
        userId,
        isLoading: false,
        ...(profile && { profile }),
        ...(notifications && { notifications }),
        ...(logs.length > 0 && { logs }),
        ...(cycles.length > 0 && { cycles }),
        ...(medications.length > 0 && { medications }),
        ...(chats.length > 0 && { chats, activeChatId: chats[chats.length - 1].id }),
        darkMode
      });
    } catch (err) {
      console.warn('Failed to load user data from Firestore:', err);
      set({ userId, isLoading: false });
    }
  },

  resetState: () => set({
    view: 'landing',
    onboardingStep: 0,
    profile: defaultProfile,
    notifications: defaultNotifications,
    logs: initialData.logs,
    cycles: initialData.cycles,
    darkMode: false,
    medications: defaultMedications,
    chats: defaultChats,
    activeChatId: 'chat-default',
    userId: null,
    isLoading: false
  }),
  
  updateProfile: (updatedProfile) => set((state) => {
    const newProfile = { ...state.profile, ...updatedProfile };
    
    // Regenerate cycles list if length parameters or last period dates are changed
    let newCycles = state.cycles;
    if (
      updatedProfile.avgCycleLength !== undefined ||
      updatedProfile.avgPeriodLength !== undefined ||
      updatedProfile.lastPeriodStart !== undefined ||
      updatedProfile.lastPeriodEnd !== undefined
    ) {
      const start = newProfile.lastPeriodStart || formatDate(twelveDaysAgo);
      const end = newProfile.lastPeriodEnd || formatDate(eightDaysAgo);
      newCycles = generateCyclesList(
        newProfile.avgCycleLength,
        newProfile.avgPeriodLength,
        start,
        end
      );
    }
    
    // Save to Firestore
    if (state.userId) {
      saveToFirestore(async () => {
        await fs.saveProfile(state.userId!, newProfile);
        if (newCycles !== state.cycles) {
          await fs.saveCycles(state.userId!, newCycles);
        }
      });
    }
    
    return {
      profile: newProfile,
      cycles: newCycles
    };
  }),
  
  updateNotifications: (updatedNotifications) => set((state) => {
    const newNotifications = { ...state.notifications, ...updatedNotifications };
    
    if (state.userId) {
      saveToFirestore(() => fs.saveNotifications(state.userId!, newNotifications));
    }
    
    return { notifications: newNotifications };
  }),
  
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    
    if (state.userId) {
      saveToFirestore(() => fs.saveDarkMode(state.userId!, newDarkMode));
    }
    
    return { darkMode: newDarkMode };
  }),
  
  addOrUpdateLog: (newLog) => set((state) => {
    const existingIndex = state.logs.findIndex((l) => l.date === newLog.date);
    let updatedLogs = [...state.logs];
    
    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = { ...updatedLogs[existingIndex], ...newLog };
    } else {
      updatedLogs.push(newLog);
    }
    
    // Sort chronologically
    updatedLogs.sort((a, b) => a.date.localeCompare(b.date));
    
    // Save to Firestore
    if (state.userId) {
      const savedLog = updatedLogs.find(l => l.date === newLog.date)!;
      saveToFirestore(() => fs.saveDailyLog(state.userId!, savedLog));
    }
    
    return { logs: updatedLogs };
  }),
  
  completeOnboarding: (name, age, cycleLength, periodLength, lastPeriodStart, lastPeriodEnd) => set((state) => {
    // Re-generate fresh mock data tailored to their specific stats and dates
    const freshData = generateMockData(cycleLength, periodLength, 180, lastPeriodStart, lastPeriodEnd);
    
    const newProfile: UserProfile = {
      name,
      age,
      avgCycleLength: cycleLength,
      avgPeriodLength: periodLength,
      isPremium: true,
      lastPeriodStart,
      lastPeriodEnd,
      hydrationGoal: 8
    };

    // Save all onboarding data to Firestore
    if (state.userId) {
      saveToFirestore(() => fs.saveAllUserData(state.userId!, {
        profile: newProfile,
        notifications: state.notifications,
        logs: freshData.logs,
        cycles: freshData.cycles,
        medications: state.medications,
        darkMode: state.darkMode
      }));
    }

    return {
      profile: newProfile,
      logs: freshData.logs,
      cycles: freshData.cycles,
      view: 'dashboard',
      onboardingStep: 0
    };
  }),
  
  createNewChat: () => set((state) => {
    const newId = `chat-${Math.random().toString(36).substring(7)}`;
    const newChat = {
      id: newId,
      messages: [
        {
          id: `welcome-${newId}`,
          sender: 'ai' as const,
          text: "Hello, I'm Nyra, your AI wellness companion. How can I support you on your wellness journey today?",
          timestamp: new Date().toISOString()
        }
      ]
    };

    if (state.userId) {
      saveToFirestore(async () => {
        await fs.saveChat(state.userId!, { id: newId, createdAt: new Date().toISOString() });
        await fs.saveChatMessage(state.userId!, newId, newChat.messages[0]);
      });
    }

    return {
      chats: [...state.chats, newChat],
      activeChatId: newId
    };
  }),

  switchChat: (id) => set({ activeChatId: id }),

  deleteChat: (id) => set((state) => {
    const filteredChats = state.chats.filter(c => c.id !== id);
    let newActiveId = state.activeChatId;
    let finalChats = filteredChats;
    
    if (state.activeChatId === id) {
      if (filteredChats.length > 0) {
        newActiveId = filteredChats[filteredChats.length - 1].id;
      } else {
        const defaultId = `chat-${Math.random().toString(36).substring(7)}`;
        finalChats = [{
          id: defaultId,
          messages: [
            {
              id: `welcome-${defaultId}`,
              sender: 'ai' as const,
              text: "Hello, I'm Nyra, your AI wellness companion. How can I support you on your wellness journey today?",
              timestamp: new Date().toISOString()
            }
          ]
        }];
        newActiveId = defaultId;

        if (state.userId) {
          saveToFirestore(async () => {
            await fs.saveChat(state.userId!, { id: defaultId, createdAt: new Date().toISOString() });
            await fs.saveChatMessage(state.userId!, defaultId, finalChats[0].messages[0]);
          });
        }
      }
    }

    if (state.userId) {
      saveToFirestore(() => fs.deleteFirestoreChat(state.userId!, id));
    }
    
    return {
      chats: finalChats,
      activeChatId: newActiveId
    };
  }),

  addChatMessage: (sender, text, images) => set((state) => {
    const msgId = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();
    
    const updatedChats = state.chats.map((c) => {
      if (c.id === state.activeChatId) {
        return {
          ...c,
          messages: [
            ...c.messages,
            { id: msgId, sender, text, images, timestamp }
          ]
        };
      }
      return c;
    });

    if (state.userId) {
      saveToFirestore(() => fs.saveChatMessage(state.userId!, state.activeChatId, {
        id: msgId, sender, text, images, timestamp
      }));
    }

    return { chats: updatedChats };
  }),

  clearChat: () => set((state) => {
    const updatedChats = state.chats.map((c) => {
      if (c.id === state.activeChatId) {
        const welcomeId = `welcome-${c.id}`;
        return {
          ...c,
          messages: [
            {
              id: welcomeId,
              sender: 'ai' as const,
              text: "Chat cleared. I'm ready for your questions! What can I help you with?",
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return c;
    });
    return { chats: updatedChats };
  }),
  
  renameChat: (id, name) => set((state) => {
    if (state.userId) {
      saveToFirestore(() => fs.saveChat(state.userId!, { id, name, createdAt: new Date().toISOString() }));
    }
    return {
      chats: state.chats.map(c => c.id === id ? { ...c, name } : c)
    };
  }),
  
  addWaterCup: (dateStr) => set((state) => {
    const existingIndex = state.logs.findIndex((l) => l.date === dateStr);
    let updatedLogs = [...state.logs];
    
    if (existingIndex >= 0) {
      const currentHydration = updatedLogs[existingIndex].hydration || 0;
      updatedLogs[existingIndex] = {
        ...updatedLogs[existingIndex],
        hydration: currentHydration + 1
      };
    } else {
      // Create a default empty log for today if it doesn't exist
      updatedLogs.push({
        date: dateStr,
        mood: 'Calm',
        symptoms: [],
        cravings: [],
        flow: 'None',
        energy: 4,
        sleep: 7.5,
        hydration: 1,
        notes: 'Logged water intake.'
      });
    }
    
    // Save to Firestore
    if (state.userId) {
      const savedLog = updatedLogs.find(l => l.date === dateStr)!;
      saveToFirestore(() => fs.saveDailyLog(state.userId!, savedLog));
    }
    
    return { logs: updatedLogs };
  }),
  
  removeWaterCup: (dateStr) => set((state) => {
    const existingIndex = state.logs.findIndex((l) => l.date === dateStr);
    let updatedLogs = [...state.logs];
    
    if (existingIndex >= 0) {
      const currentHydration = updatedLogs[existingIndex].hydration || 0;
      updatedLogs[existingIndex] = {
        ...updatedLogs[existingIndex],
        hydration: Math.max(0, currentHydration - 1)
      };

      // Save to Firestore
      if (state.userId) {
        saveToFirestore(() => fs.saveDailyLog(state.userId!, updatedLogs[existingIndex]));
      }
    }
    
    return { logs: updatedLogs };
  }),

  addMedication: (name, times, durationDays) => set((state) => {
    const newMed: Medication = {
      id: `med-${Math.random().toString(36).substring(7)}`,
      name,
      times,
      durationDays,
      startDate: formatDate(new Date())
    };

    if (state.userId) {
      saveToFirestore(() => fs.saveMedication(state.userId!, newMed));
    }

    return { medications: [...state.medications, newMed] };
  }),

  removeMedication: (id) => set((state) => {
    if (state.userId) {
      saveToFirestore(() => fs.removeMedicationDoc(state.userId!, id));
    }
    return { medications: state.medications.filter(m => m.id !== id) };
  })
}));
