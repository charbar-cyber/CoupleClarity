import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Define notification preferences type
interface NotificationPreferences {
  id: number;
  userId: number;
  newConflicts: boolean;
  partnerEmotions: boolean;
  directMessages: boolean;
  conflictUpdates: boolean;
  weeklyCheckIns: boolean;
  appreciations: boolean;
  updatedAt: string;
}

// Define notification context type
interface NotificationContextType {
  isSubscribed: boolean;
  isSubscribing: boolean;
  isSupported: boolean;
  preferences: NotificationPreferences | null;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        setError("Push notifications are not supported by your browser");
        return;
      }
      
      // Check permission status
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsSupported(true);
        setIsSubscribed(false);
        return;
      }
      
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.ready;
        
        // Check for existing subscription
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
        
        setIsSupported(true);
      } catch (error: unknown) {
        const err = error as Error;
        setError(`Error setting up notifications: ${err.message}`);
        setIsSupported(false);
      }
    };
    
    if (user) {
      checkSupport();
    }
  }, [user]);

  // Fetch notification preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      try {
        const response = await apiRequest('GET', '/api/notifications/preferences');
        const data = await response.json();
        setPreferences(data);
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
        setError('Failed to load notification preferences');
      }
    };
    
    fetchPreferences();
  }, [user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    
    setIsSubscribing(true);
    setError(null);
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }
      
      // Register service worker if needed
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      
      // Get the server's public key
      // In a real application, you would fetch this from your server
      const vapidPublicKey = 'BPtE2lRhiK8W5D6CVNz86XrG9x4q9Jx-ib8wGOWQUIGUk3L-hbZ1mD_YJkO3mofQHXUUU8kBEOnVJm8Z4TqYVQc';
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Subscribe the user
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      // Send the subscription to the server
      const p256dhKey = newSubscription.getKey('p256dh');
      const authKey = newSubscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }
      
      const response = await apiRequest('POST', '/api/notifications/subscribe', {
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey)
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to subscribe on server');
      }
      
      setSubscription(newSubscription);
      setIsSubscribed(true);
      
      toast({
        title: "Notifications enabled",
        description: "You'll now receive notifications from Couple Clarity",
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Error subscribing to notifications:', err);
      setError(`Failed to subscribe: ${err.message}`);
      
      toast({
        title: "Notification setup failed",
        description: err.message || "Could not enable notifications",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, user, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    
    try {
      // Unsubscribe on client
      await subscription.unsubscribe();
      
      // Unsubscribe on server
      await apiRequest('DELETE', '/api/notifications/unsubscribe', {
        endpoint: subscription.endpoint
      });
      
      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: "Notifications disabled",
        description: "You won't receive notifications from Couple Clarity",
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Error unsubscribing from notifications:', err);
      setError(`Failed to unsubscribe: ${err.message}`);
      
      toast({
        title: "Error disabling notifications",
        description: err.message || "Could not disable notifications",
        variant: "destructive",
      });
    }
  }, [subscription, toast]);

  // Update notification preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    if (!user) return;
    
    try {
      const response = await apiRequest('POST', '/api/notifications/preferences', prefs);
      const updatedPreferences = await response.json();
      setPreferences(updatedPreferences);
      
      toast({
        title: "Notification preferences updated",
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Error updating notification preferences:', err);
      setError('Failed to update notification preferences');
      
      toast({
        title: "Update failed",
        description: "Could not update notification preferences",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const value = {
    isSubscribed,
    isSubscribing,
    isSupported,
    preferences,
    updatePreferences,
    subscribe,
    unsubscribe,
    error
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

// Helper function to convert a base64 string to a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert an ArrayBuffer to a base64 string
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}