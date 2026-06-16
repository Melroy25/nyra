export type MoodType = 'Happy' | 'Calm' | 'Emotional' | 'Sad' | 'Irritated' | 'Anxious';

export type SymptomType = 'Cramps' | 'Headache' | 'Acne' | 'Bloating' | 'Back Pain' | 'Fatigue' | 'Breast Tenderness';

export type CravingType = 'Chocolate' | 'Sugar' | 'Salty' | 'Spicy' | 'Carbs';

export type FlowType = 'None' | 'Light' | 'Medium' | 'Heavy';

export interface Cycle {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  cycleLength: number;
  periodLength: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  mood: MoodType;
  symptoms: SymptomType[];
  cravings: CravingType[];
  flow: FlowType;
  energy: number; // 1 - 5
  sleep: number; // hours
  hydration: number; // cups
  notes: string;
}

export interface UserProfile {
  name: string;
  age: number;
  avgCycleLength: number;
  avgPeriodLength: number;
  isPremium: boolean;
  lastPeriodStart?: string; // YYYY-MM-DD
  lastPeriodEnd?: string;   // YYYY-MM-DD
  avatar?: string;          // base64 profile image
  hydrationGoal: number;    // daily water cups target
}

export interface NotificationSettings {
  periodReminders: boolean;
  ovulationReminders: boolean;
  dailyCheckIn: boolean;
  dailyCheckInTime: string; // HH:MM format e.g. "20:00"
  medicationReminders: boolean;
  waterReminders: boolean;
}

export interface Medication {
  id: string;
  name: string;
  times: string[]; // HH:MM formats
  durationDays: number;
  startDate: string; // YYYY-MM-DD
}
