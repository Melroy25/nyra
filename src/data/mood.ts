import { Mood } from '../types';

export const mockMoods: Mood[] = [
  { id: 'mood-happy', name: 'Happy', emoji: '🌸', colorClass: 'text-tertiary bg-tertiary-fixed/30' },
  { id: 'mood-calm', name: 'Calm', emoji: '🧘', colorClass: 'text-primary bg-primary-fixed/30' },
  { id: 'mood-sad', name: 'Sad', emoji: '🥺', colorClass: 'text-secondary bg-secondary-fixed/30' },
  { id: 'mood-emotional', name: 'Emotional', emoji: '💖', colorClass: 'text-error bg-error-container/30' },
  { id: 'mood-irritated', name: 'Irritated', emoji: '😠', colorClass: 'text-[#ba1a1a] bg-[#ffdad6]/30' },
  { id: 'mood-anxious', name: 'Anxious', emoji: '😰', colorClass: 'text-outline bg-outline-variant/30' },
];
