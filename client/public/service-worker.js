// Service Worker for push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/notification-badge.png',
    data: data.url,
    actions: data.actions || [],
    tag: data.tag || 'default-tag',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  notification.close();
  
  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(clientList => {
      const url = notification.data;
      
      // If an action button was clicked, handle it
      if (event.action === 'view') {
        // Navigate to specific URL if action is view
        if (url) {
          const client = clientList.find(client => 
            client.url === url && 'focus' in client
          );
          
          if (client) {
            client.focus();
          } else {
            clients.openWindow(url);
          }
        }
      }
      
      // Default behavior if notification body is clicked
      else {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      }
    })
  );
});