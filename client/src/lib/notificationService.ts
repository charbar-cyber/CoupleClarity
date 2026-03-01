import { apiUrl } from '@/lib/config';

// Helper functions for push notification setup and management

// Check if the browser supports service workers and push notifications
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Ask user for notification permission
export const askNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    return Promise.reject(new Error('Push notifications not supported'));
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Promise.reject(error);
  }
};

// Register the service worker
export const registerServiceWorker = async () => {
  if (!isPushNotificationSupported()) {
    return Promise.reject(new Error('Service worker not supported'));
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return Promise.reject(error);
  }
};

// Convert a base64 string to Uint8Array for the application server key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export const subscribeToPushNotifications = async (publicVapidKey: string) => {
  try {
    // Register service worker
    const registration = await registerServiceWorker();
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    
    // Send subscription to server
    await fetch(apiUrl('/api/notifications/subscribe'), {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return Promise.reject(error);
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Remove subscription from server
      await fetch(apiUrl('/api/notifications/unsubscribe'), {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Unsubscribe on the client
      await subscription.unsubscribe();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return Promise.reject(error);
  }
};

// Gets the current subscription (if any)
export const getCurrentPushSubscription = async () => {
  if (!isPushNotificationSupported()) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

// Initialize push notifications service
export const initializePushNotifications = async (publicVapidKey: string) => {
  // Check permission status
  const permissionStatus = Notification.permission;
  
  // If permission is granted, ensure service worker is registered
  if (permissionStatus === 'granted') {
    let subscription = await getCurrentPushSubscription();
    
    if (!subscription) {
      subscription = await subscribeToPushNotifications(publicVapidKey);
    }
    
    return {
      permissionStatus,
      subscription
    };
  }
  
  return {
    permissionStatus,
    subscription: null
  };
};