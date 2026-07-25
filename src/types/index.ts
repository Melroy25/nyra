export interface User {
  id: string;
  name: string;
  email?: string;
  age?: number;
  dob?: string;
  dateOfBirth?: string;
  averageCycleLength?: number;
  cycleLength: number;
  periodDuration: number;
  goals: string[];
  partnerCode: string;
  connectedPartnerCode?: string | null;
  connectedPartnerId?: string | null;
  connectedPartner?: User | null;
  role: 'user' | 'partner';
  avatarUrl?: string;
  onboardingCompleted?: boolean;
}

export type FlowLevel = 'light' | 'medium' | 'heavy';

export interface CycleLog {
  date: string; // YYYY-MM-DD
  isPeriod: boolean;
  isPredicted: boolean;
  isOvulation: boolean;
  flow: FlowLevel | null;
  symptoms: string[];
  mood: string | null;
  notes?: string;
  severity?: number;
}

export interface Symptom {
  id: string;
  name: string;
  iconName: string; // Lucide icon mapping
}

export interface SymptomLog {
  id: string;
  date: string;
  symptomId: string;
  severity: number; // 0-10
  notes: string;
}

export interface Mood {
  id: string;
  name: string;
  emoji: string;
  colorClass: string;
}

export interface MoodLog {
  id: string;
  date: string;
  moodId: string;
  notes?: string;
}

export interface FoodCard {
  id: string;
  name: string;
  benefits: string;
  category: string;
  description: string;
  imageUrl: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  sticker?: string;
  reaction?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface RoutineItem {
  id: string;
  name: string;
  time: string;
  frequency: string;
  type: 'medication' | 'skincare_morning' | 'skincare_night' | 'supplement' | 'water';
  completed: boolean;
  amount?: number; // e.g. for water
}
