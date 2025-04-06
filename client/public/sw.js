// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting(); // Ensure new service worker activates immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim(); // Take control immediately
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'New notification',
        body: event.data.text(),
        icon: '/favicon.ico',
        data: {
          url: '/'
        }
      };
    }
  } else {
    notificationData = {
      title: 'New notification',
      body: 'You have a new update from Couple Clarity',
      icon: '/favicon.ico',
      data: {
        url: '/'
      }
    };
  }

  // Default notification options if none provided
  const options = {
    body: notificationData.body || 'You have a new update',
    icon: notificationData.icon || '/favicon.ico',
    badge: notificationData.badge || '/favicon.ico',
    data: notificationData.data || { url: '/' },
    actions: notificationData.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: notificationData.requireInteraction || false
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  
  event.notification.close();
  
  // Get the URL to open when notification is clicked
  const urlToOpen = event.notification.data?.url || '/';

  // Open the specific URL, or focus the app if already open
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, focus it
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});