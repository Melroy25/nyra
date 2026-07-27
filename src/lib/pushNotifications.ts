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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPushSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;

  const token = localStorage.getItem('nyra_token');
  if (!token) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription().catch(() => null);

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BL34zJyImY_UP4WVQfQ2uRbSBthKCEW9_JxzfHH5b1OG_SBLN7suf7w9DNnUpbePB4nA4OApotINSAN7pQenGGo';

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }).catch((err) => {
        console.log('[WebPush] Subscription skipped or unsupported in browser environment:', err?.message || err);
        return null;
      });
    }

    if (!sub) return;

    // Send subscription payload to backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: sub }),
    }).catch(() => {});
  } catch (err: any) {
    console.log('[WebPush] Safe subscription handler:', err?.message || err);
  }
}
