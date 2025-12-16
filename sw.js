// Service Worker para notificações robustas
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fecha a notificação ao clicar e foca na aba da rádio
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tiver uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre o app (pode não funcionar em todos os navegadores móveis se o app estiver fechado, mas ajuda em PWA)
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});