// Service Worker for Nyra PWA
const CACHE_NAME = 'nyra-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.png',
  '/icons.svg'
];

// Install Event - cache the shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - network first with cache fallback for app assets, cache first for images/fonts
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Exclude Firebase API and auth endpoints, Vercel serverless chat function, and local dev hot reloads (HMR)
  if (
    requestUrl.origin !== self.location.origin ||
    event.request.method !== 'GET' ||
    requestUrl.pathname.includes('/api/') ||
    requestUrl.pathname.includes('firestore.googleapis.com') ||
    requestUrl.pathname.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  // Determine cache strategy based on file type
  const isImageOrFont = 
    event.request.destination === 'image' || 
    event.request.destination === 'font' ||
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.jpg') ||
    requestUrl.pathname.endsWith('.webp');

  if (isImageOrFont) {
    // Cache First strategy for assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  } else {
    // Network First strategy for HTML, JS, CSS, and API routing
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline/network fails, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If the main HTML document failed to load, return the cached root '/'
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline: Connection unavailable.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
        })
    );
  }
});
