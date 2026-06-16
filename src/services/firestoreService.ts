import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { DailyLog, Cycle, UserProfile, NotificationSettings, Medication } from '../types';

// ─── Profile ───────────────────────────────────────────────
export const saveProfile = async (userId: string, profile: UserProfile) => {
  if (!isFirebaseConfigured) {
    localStorage.setItem(`nyra_profile_${userId}`, JSON.stringify(profile));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'data', 'profile'), profile);
};

export const loadProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_profile_${userId}`);
    return val ? JSON.parse(val) : null;
  }
  const snap = await getDoc(doc(db, 'users', userId, 'data', 'profile'));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// ─── Notification Settings ─────────────────────────────────
export const saveNotifications = async (userId: string, settings: NotificationSettings) => {
  if (!isFirebaseConfigured) {
    localStorage.setItem(`nyra_notifications_${userId}`, JSON.stringify(settings));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'data', 'notifications'), settings);
};

export const loadNotifications = async (userId: string): Promise<NotificationSettings | null> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_notifications_${userId}`);
    return val ? JSON.parse(val) : null;
  }
  const snap = await getDoc(doc(db, 'users', userId, 'data', 'notifications'));
  return snap.exists() ? (snap.data() as NotificationSettings) : null;
};

// ─── Daily Logs ────────────────────────────────────────────
export const saveDailyLog = async (userId: string, log: DailyLog) => {
  if (!isFirebaseConfigured) {
    const logs = await loadLogs(userId);
    const existingIdx = logs.findIndex(l => l.date === log.date);
    if (existingIdx >= 0) {
      logs[existingIdx] = log;
    } else {
      logs.push(log);
    }
    logs.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(`nyra_logs_${userId}`, JSON.stringify(logs));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'logs', log.date), log);
};

export const loadLogs = async (userId: string): Promise<DailyLog[]> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_logs_${userId}`);
    return val ? JSON.parse(val) : [];
  }
  const q = query(collection(db, 'users', userId, 'logs'), orderBy('date'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as DailyLog);
};

export const saveBulkLogs = async (userId: string, logs: DailyLog[]) => {
  if (!isFirebaseConfigured) {
    localStorage.setItem(`nyra_logs_${userId}`, JSON.stringify(logs));
    return;
  }
  const batch = writeBatch(db);
  logs.forEach(log => {
    batch.set(doc(db, 'users', userId, 'logs', log.date), log);
  });
  await batch.commit();
};

// ─── Cycles ────────────────────────────────────────────────
export const saveCycles = async (userId: string, cycles: Cycle[]) => {
  if (!isFirebaseConfigured) {
    localStorage.setItem(`nyra_cycles_${userId}`, JSON.stringify(cycles));
    return;
  }
  const batch = writeBatch(db);
  cycles.forEach(cycle => {
    batch.set(doc(db, 'users', userId, 'cycles', cycle.id), cycle);
  });
  await batch.commit();
};

export const loadCycles = async (userId: string): Promise<Cycle[]> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_cycles_${userId}`);
    return val ? JSON.parse(val) : [];
  }
  const snap = await getDocs(collection(db, 'users', userId, 'cycles'));
  return snap.docs.map(d => d.data() as Cycle);
};

// ─── Medications ───────────────────────────────────────────
export const saveMedication = async (userId: string, med: Medication) => {
  if (!isFirebaseConfigured) {
    const meds = await loadMedications(userId);
    const existingIdx = meds.findIndex(m => m.id === med.id);
    if (existingIdx >= 0) {
      meds[existingIdx] = med;
    } else {
      meds.push(med);
    }
    localStorage.setItem(`nyra_medications_${userId}`, JSON.stringify(meds));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'medications', med.id), med);
};

export const removeMedicationDoc = async (userId: string, medId: string) => {
  if (!isFirebaseConfigured) {
    const meds = await loadMedications(userId);
    const filtered = meds.filter(m => m.id !== medId);
    localStorage.setItem(`nyra_medications_${userId}`, JSON.stringify(filtered));
    return;
  }
  await deleteDoc(doc(db, 'users', userId, 'medications', medId));
};

export const loadMedications = async (userId: string): Promise<Medication[]> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_medications_${userId}`);
    return val ? JSON.parse(val) : [];
  }
  const snap = await getDocs(collection(db, 'users', userId, 'medications'));
  return snap.docs.map(d => d.data() as Medication);
};

// ─── Chats ─────────────────────────────────────────────────
export interface ChatMessageDoc {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  images?: string[];
  timestamp: string;
}

export interface ChatDoc {
  id: string;
  name?: string;
  createdAt: string;
}

export const saveChat = async (userId: string, chat: ChatDoc) => {
  if (!isFirebaseConfigured) {
    const chats = await loadChats(userId);
    const existingIdx = chats.findIndex(c => c.id === chat.id);
    if (existingIdx >= 0) {
      chats[existingIdx].name = chat.name;
    } else {
      chats.push({ id: chat.id, name: chat.name, messages: [] });
    }
    localStorage.setItem(`nyra_chats_${userId}`, JSON.stringify(chats));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'chats', chat.id), chat);
};

export const deleteFirestoreChat = async (userId: string, chatId: string) => {
  if (!isFirebaseConfigured) {
    const chats = await loadChats(userId);
    const filtered = chats.filter(c => c.id !== chatId);
    localStorage.setItem(`nyra_chats_${userId}`, JSON.stringify(filtered));
    return;
  }
  await deleteDoc(doc(db, 'users', userId, 'chats', chatId));
};

export const saveChatMessage = async (userId: string, chatId: string, message: ChatMessageDoc) => {
  if (!isFirebaseConfigured) {
    const chats = await loadChats(userId);
    const chatIdx = chats.findIndex(c => c.id === chatId);
    if (chatIdx >= 0) {
      const msgIdx = chats[chatIdx].messages.findIndex(m => m.id === message.id);
      if (msgIdx >= 0) {
        chats[chatIdx].messages[msgIdx] = message;
      } else {
        chats[chatIdx].messages.push(message);
      }
      localStorage.setItem(`nyra_chats_${userId}`, JSON.stringify(chats));
    }
    return;
  }
  await setDoc(doc(db, 'users', userId, 'chats', chatId, 'messages', message.id), message);
};

export const loadChats = async (userId: string): Promise<{ id: string; name?: string; messages: ChatMessageDoc[] }[]> => {
  if (!isFirebaseConfigured) {
    const val = localStorage.getItem(`nyra_chats_${userId}`);
    return val ? JSON.parse(val) : [];
  }
  const chatsSnap = await getDocs(collection(db, 'users', userId, 'chats'));
  const chats: { id: string; name?: string; messages: ChatMessageDoc[] }[] = [];

  for (const chatDoc of chatsSnap.docs) {
    const chatData = chatDoc.data() as ChatDoc;
    const messagesSnap = await getDocs(
      query(collection(db, 'users', userId, 'chats', chatDoc.id, 'messages'), orderBy('timestamp'))
    );
    const messages = messagesSnap.docs.map(m => m.data() as ChatMessageDoc);
    chats.push({ id: chatData.id, name: chatData.name, messages });
  }

  return chats;
};

// ─── Dark Mode Preference ──────────────────────────────────
export const saveDarkMode = async (userId: string, darkMode: boolean) => {
  if (!isFirebaseConfigured) {
    localStorage.setItem(`nyra_darkmode_${userId}`, String(darkMode));
    return;
  }
  await setDoc(doc(db, 'users', userId, 'data', 'preferences'), { darkMode }, { merge: true });
};

export const loadDarkMode = async (userId: string): Promise<boolean> => {
  if (!isFirebaseConfigured) {
    return localStorage.getItem(`nyra_darkmode_${userId}`) === 'true';
  }
  const snap = await getDoc(doc(db, 'users', userId, 'data', 'preferences'));
  return snap.exists() ? (snap.data().darkMode ?? false) : false;
};

// ─── Full Save (for onboarding / initial setup) ────────────
export const saveAllUserData = async (
  userId: string,
  data: {
    profile: UserProfile;
    notifications: NotificationSettings;
    logs: DailyLog[];
    cycles: Cycle[];
    medications: Medication[];
    darkMode: boolean;
  }
) => {
  await saveProfile(userId, data.profile);
  await saveNotifications(userId, data.notifications);
  await saveBulkLogs(userId, data.logs);
  await saveCycles(userId, data.cycles);
  await saveDarkMode(userId, data.darkMode);
  
  for (const med of data.medications) {
    await saveMedication(userId, med);
  }
};
