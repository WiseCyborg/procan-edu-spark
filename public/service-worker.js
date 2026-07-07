// Bump this version string on every deploy where you want to force clients
// to pick up fresh content. Changing it changes this file's bytes, which is
// what makes the browser's own service worker update-detection (see
// src/lib/pwa-registration.ts) notice there's a new worker and prompt the
// user to reload.
const CACHE_VERSION = 'v2';
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

// Fetch event - network-first. This is the fix: previously this was
// cache-first, which meant a browser that had cached the app shell would
// keep serving that exact snapshot forever, even after new deploys. Network
// requests are tried first; the cache (and the offline page) are only used
// as a fallback when the network request actually fails (e.g. truly offline).
self.addEventListener('fetch', (event) => {
  const { request } = event;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Activate event - clean up any cache not matching the current CACHE_NAME.
// FIX: previously CACHE_NAME never changed, so this never actually deleted
// anything. Now that CACHE_VERSION is meant to be bumped per deploy, this
// correctly purges stale caches from earlier versions.
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
