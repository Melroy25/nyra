// Helper module for native device system notifications (Mobile & Desktop)

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('This device/browser does not support native notifications.');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function sendNativeNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    const granted = await requestNativeNotificationPermission();
    if (!granted) return;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/logo.png',
    badge: '/logo.png',
    ...options,
  };

  // 1. Try active ServiceWorker registration (works on mobile Android, iOS PWA & desktop)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return;
      }
    } catch (e) {
      console.log('SW notification fallback to window Notification:', e);
    }
  }

  // 2. Fallback to standard Window Notification
  try {
    new Notification(title, defaultOptions);
  } catch (e) {
    console.log('Window notification failed:', e);
  }
}
