// Service Worker for Nyra PWA — Background Notifications + Caching
const CACHE_NAME = 'nyra-app-v3';
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

    // Check if user has the /partner CHAT tab open AND it's visible (foreground)
    // If user is on dashboard, AI, or other tab → still show notification
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const chatTabFocused = allClients.some(
      (c) => c.url.includes('/partner') && c.url.includes('tab=chat') && c.visibilityState === 'visible'
    );

    const partnerName = partnerInfo.name || 'Partner';
    const partnerIcon = partnerInfo.avatar_url || '/logo.png';

    for (const msg of messages) {
      const msgSig = `${msg.sender_id}_${msg.text || msg.sticker}_${msg.created_at?.slice(0, 16)}`;
      const isAlreadyKnown = bgKnownIds.has(msg.id) || bgKnownIds.has(msgSig);

      if (msg.sender_id !== bgUserId && !isAlreadyKnown) {
        bgKnownIds.add(msg.id);
        bgKnownIds.add(msgSig);
        // Show push notification unless the user is actively IN the partner chat view
        if (!chatTabFocused) {
          const bodyText =
            msg.text ||
            (msg.sticker ? `Sent a sticker 😊` : 'Sent an attachment 📎');

          await self.registration.showNotification(`${partnerName} ❤️`, {
            body: bodyText,
            icon: partnerIcon,
            badge: '/logo.png',
            tag: `chat-${msg.id}`,
            data: { url: '/partner?tab=chat' },
          });
        }
      } else {
        bgKnownIds.add(msg.id);
        bgKnownIds.add(msgSig);
      }
    }
  } catch (e) {
    // Silently fail — network might be off
  }
}

// ── Web Push Payload Listener (VAPID) — Suppress if chat screen is open ──
self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil(
    (async () => {
      try {
        const payload = event.data.json();
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

        // Suppress VAPID notification only if chat tab is open & visible
        const isChatScreenOpen = allClients.some(
          (c) => c.url.includes('/partner') && c.url.includes('tab=chat') && c.visibilityState === 'visible'
        );

        if (!isChatScreenOpen) {
          await self.registration.showNotification(payload.title || 'New Message', {
            body: payload.body || '',
            icon: payload.icon || '/logo.png',
            badge: '/logo.png',
            tag: payload.tag || 'nyra-chat',
            data: { url: payload.url || '/partner?tab=chat' },
          });
        }
      } catch (err) {
        console.log('SW push event handler error:', err);
      }
    })()
  );
});

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
