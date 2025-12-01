// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/badge.png',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: !!data.renotify,
    vibrate: [200, 100, 200],
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ProCann Edu', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window with the URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if no match found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(clients.claim());
});
