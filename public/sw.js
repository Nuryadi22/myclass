// MyClass Service Worker - Push Notification Handler
// Version: 1.0

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'MyClass', body: event.data.text() };
  }

  const title = data.title || 'MyClass';
  const options = {
    body: data.body || 'Ada notifikasi baru.',
    icon: '/myclass.png',
    badge: '/myclass.png',
    image: data.image || undefined,
    data: data.url ? { url: data.url } : {},
    vibrate: [200, 100, 200],
    tag: data.tag || 'myclass-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Lihat Dashboard',
      },
      {
        action: 'close',
        title: 'Tutup',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/parent/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
