// Bump this version string on every deploy where you want to force clients
// to pick up fresh content. Changing it changes this file's bytes, which is
// what makes the browser's own service worker update-detection (see
// src/lib/pwa-registration.ts) notice there's a new worker and prompt the
// user to reload.
const CACHE_VERSION = 'v3';
const CACHE_NAME = `procann-edu-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Install event - cache only the offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Fetch event - network-first, but ONLY for same-origin GET requests.
// Everything else (cross-origin requests such as Supabase auth/API calls, and
// any non-GET request such as login/registration POSTs) is left entirely to
// the browser by returning early WITHOUT calling event.respondWith(). The
// previous version intercepted every request and, on its fallback path, could
// return `undefined`, which the browser reports as "FetchEvent.respondWith
// received an error: Returned response is null" — this broke login for
// everyone. The catch path below always resolves to a real Response.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Never intercept non-GET or cross-origin requests — let the browser handle
  // auth, API, and POST traffic directly.
  if (request.method !== 'GET' || !isSameOrigin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed. Always resolve to a real Response, never undefined.
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      })
  );
});

// Activate event - clean up any cache not matching the current CACHE_NAME.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from ProCann Edu',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('ProCann Edu', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});