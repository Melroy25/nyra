import { User } from '../types';
import { mockUser, mockPartner } from '../data/users';

export const userService = {
  async getUserProfile(userId: string): Promise<User> {
    // Simulate API fetch delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (userId === 'partner-john') return mockPartner;
    return mockUser;
  },

  async updateUserProfile(userId: string, profile: Partial<User>): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ...mockUser, ...profile };
  },

  async connectPartner(userId: string, partnerCode: string): Promise<{ success: boolean; partner: User | null }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Verify connection code
    if (partnerCode === 'NYRA-82941') {
      return { success: true, partner: mockUser };
    } else if (partnerCode === 'NYRA-PARTNER-55') {
      return { success: true, partner: mockPartner };
    }
    return { success: false, partner: null };
  },
};
