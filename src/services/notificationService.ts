export interface NotificationSettings {
  periodReminders: boolean;
  ovulationReminders: boolean;
  waterReminders: boolean;
  medicationReminders: boolean;
  selfCareReminders: boolean;
  aiInsights: boolean;
  partnerMessages: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  periodReminders: true,
  ovulationReminders: true,
  waterReminders: false,
  medicationReminders: true,
  selfCareReminders: false,
  aiInsights: true,
  partnerMessages: true,
};

export const notificationService = {
  async getSettings(): Promise<NotificationSettings> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { ...defaultNotificationSettings };
  },

  async saveSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return settings;
  },

  // Helper to trigger browser notifications when allowed
  triggerLocalNotification(title: string, body: string) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo.png' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/logo.png' });
          }
        });
      }
    }
    console.log(`[Simulated Notification] Title: "${title}", Body: "${body}"`);
  },
};
