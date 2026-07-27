// Service Worker for Nyra PWA — Background Notifications + Caching
const CACHE_NAME = 'nyra-app-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
];

// ── Background polling state ──────────────────────────────────────────────────
let bgPollInterval = null;
let bgAuthToken = null;
let bgUserId = null;
let bgKnownIds = new Set();

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch (network-first with cache fallback) ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/'))
      )
  );
});

// ── Message from page: receive auth token and start/stop bg poll ──────────────
self.addEventListener('message', (event) => {
  const { type, token, userId, knownIds } = event.data || {};

  if (type === 'START_BG_POLL') {
    bgAuthToken = token;
    bgUserId = userId;
    if (knownIds) bgKnownIds = new Set(knownIds);

    // Clear any previous interval
    if (bgPollInterval) clearInterval(bgPollInterval);

    // Run immediately then every 15 seconds in background
    bgCheckMessages();
    bgPollInterval = setInterval(bgCheckMessages, 15000);
  }

  if (type === 'STOP_BG_POLL') {
    if (bgPollInterval) clearInterval(bgPollInterval);
    bgPollInterval = null;
    bgAuthToken = null;
    bgUserId = null;
  }

  if (type === 'SYNC_KNOWN_IDS') {
    if (knownIds) {
      knownIds.forEach((id) => bgKnownIds.add(id));
    }
  }
});

// ── Background message check function ────────────────────────────────────────
async function bgCheckMessages() {
  if (!bgAuthToken) return;

  try {
    const res = await fetch('/api/chat/messages?threadId=auto', {
      headers: { Authorization: `Bearer ${bgAuthToken}` },
    });
    if (!res.ok) return;

    const data = await res.json();
    const messages = data.messages || [];
    const partnerInfo = data.partnerInfo || {};

    if (messages.length === 0) return;

    // On initial poll: seed existing messages, but keep fresh unread messages (< 5 min old) to notify
    const isFirstRun = bgKnownIds.size === 0;
    if (isFirstRun) {
      for (const msg of messages) {
        const ageMs = Date.now() - new Date(msg.created_at || Date.now()).getTime();
        const isFreshUnread = msg.sender_id !== bgUserId && !msg.is_read && ageMs < 300000;
        if (!isFreshUnread) {
          bgKnownIds.add(msg.id);
        }
      }
    }

    // Check if user has the CHAT tab open AND it's visible (foreground)
    // If app is closed, minimized, or on another page → show notification
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const chatTabFocused = allClients.some(
      (c) => c.url.includes('/partner') && c.url.includes('tab=chat') && c.visibilityState === 'visible'
    );

    const partnerName = partnerInfo.name || 'Partner';
    const partnerIcon = partnerInfo.avatar_url || '/logo.png';

    for (const msg of messages) {
      if (msg.sender_id !== bgUserId && !bgKnownIds.has(msg.id)) {
        bgKnownIds.add(msg.id);
        // Show push notification unless the user is actively IN the chat tab
        if (!chatTabFocused) {
          const bodyText =
            msg.text ||
            (msg.sticker ? `Sent a sticker 😊` : 'Sent an attachment 📎');

          await self.registration.showNotification(`${partnerName} ❤️`, {
            body: bodyText,
            icon: partnerIcon,
            badge: '/logo.png',
            tag: `chat-${msg.id}`,
            renotify: true,
            data: { url: '/partner?tab=chat' },
          });
        }
      } else {
        bgKnownIds.add(msg.id);
      }
    }
  } catch (e) {
    // Silently fail — network might be off
  }
}

// ── Notification click: open / focus the chat page ───────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/partner?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/partner') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
