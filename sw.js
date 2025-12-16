// Service Worker para notificações robustas
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener fundamental para receber o Push do servidor (ou simulado)
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nova Mensagem', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Fique ligado na programação!',
    icon: data.icon || '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Rádio Oficial', options)
  );
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
      // Se não, abre o app
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});