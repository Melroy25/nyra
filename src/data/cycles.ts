import { CycleLog } from '../types';

// We will export default static values representing Sarah's cycle
// They will be used to populate default charts and values,
// but our Zustand store will initialize them relative to "today" for dynamic interactions.
export const mockCycleLogs: CycleLog[] = [
  // Previous Period: September 1 to September 5
  { date: '2026-06-25', isPeriod: true, isPredicted: false, isOvulation: false, flow: 'medium', symptoms: ['Cramps', 'Fatigue'], mood: 'Sad' },
  { date: '2026-06-26', isPeriod: true, isPredicted: false, isOvulation: false, flow: 'heavy', symptoms: ['Cramps', 'Headache'], mood: 'Irritated' },
  { date: '2026-06-27', isPeriod: true, isPredicted: false, isOvulation: false, flow: 'heavy', symptoms: ['Cramps', 'Bloating'], mood: 'Anxious' },
  { date: '2026-06-28', isPeriod: true, isPredicted: false, isOvulation: false, flow: 'medium', symptoms: ['Fatigue'], mood: 'Calm' },
  { date: '2026-06-29', isPeriod: true, isPredicted: false, isOvulation: false, flow: 'light', symptoms: [], mood: 'Happy' },
  // Follicular phase details
  { date: '2026-07-05', isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: [], mood: 'Happy' },
  // Ovulation peak window
  { date: '2026-07-07', isPeriod: false, isPredicted: false, isOvulation: true, flow: null, symptoms: [], mood: 'Calm' },
  { date: '2026-07-08', isPeriod: false, isPredicted: false, isOvulation: true, flow: null, symptoms: ['Acne'], mood: 'Happy' },
  { date: '2026-07-09', isPeriod: false, isPredicted: false, isOvulation: true, flow: null, symptoms: [], mood: 'Happy' },
  // Luteal Phase
  { date: '2026-07-15', isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: ['Bloating'], mood: 'Calm' },
  { date: '2026-07-22', isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: ['Mild Cramps'], mood: 'Calm', severity: 3 },
  { date: '2026-07-23', isPeriod: false, isPredicted: false, isOvulation: false, flow: null, symptoms: ['Bloating', 'Fatigue'], mood: 'Emotional', severity: 5 },
];
