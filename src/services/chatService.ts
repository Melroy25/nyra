import { ChatMessage } from '../types';
import { mockMessages } from '../data/chat';

export const chatService = {
  async getMessages(): Promise<ChatMessage[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return [...mockMessages];
  },

  async sendMessage(message: ChatMessage): Promise<ChatMessage> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return message;
  },

  // Simulates partner reply flow after user sends text
  getSimulatedPartnerReply(userText: string): string {
    const text = userText.toLowerCase();
    if (text.includes('chocolate') || text.includes('crave') || text.includes('sweet')) {
      return "On it! Chocolate and comfort snacks are coming right up! 🍫🧸";
    }
    if (text.includes('tired') || text.includes('sluggish') || text.includes('exhausted') || text.includes('cramps')) {
      return "Oh no! Rest up, my love. I'll take care of dinner tonight and run a hot water bath for you. ❤️🌸";
    }
    if (text.includes('love') || text.includes('miss')) {
      return "Love you more! See you very soon! 😘❤️";
    }
    return "Got it! Sending you warm thoughts. Let me know if you need anything at all! 🌸";
  },
};
