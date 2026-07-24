import { ChatMessage } from '../types';

export const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'partner-john',
    text: "Hey Sarah, I saw on Nyra that your energy is a bit low today. I'm heading home now—would you like me to grab some dark chocolate? 🍫",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'msg-2',
    senderId: 'user-sarah',
    text: "Oh my goodness, yes please! That would be amazing. Mild cramps have been kicking in. 🥺❤️",
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(), // 1.8 hours ago
  },
  {
    id: 'msg-3',
    senderId: 'partner-john',
    text: 'Done! Already at the shop. I will pick up your favorite hazelnut chocolate and some chamomile tea. 🧸☕',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'msg-4',
    senderId: 'user-sarah',
    text: '',
    timestamp: new Date(Date.now() - 3600000 * 1.4).toISOString(),
    sticker: '🌸 Support',
  },
];

export const mockStickers = [
  { id: 'sticker-love', label: '❤️ Love', emoji: '❤️' },
  { id: 'sticker-support', label: '🌸 Support', emoji: '🌸' },
  { id: 'sticker-emotional', label: '🥺 Emotional', emoji: '🥺' },
  { id: 'sticker-comfort', label: '🧸 Comfort', emoji: '🧸' },
  { id: 'sticker-chocolate', label: '🍫 Chocolate', emoji: '🍫' },
];

export const mockReactions = ['❤️', '👍', '😊', '😢', '🔥', '😮'];
