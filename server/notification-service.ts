import webpush from 'web-push';
import type { Express } from 'express';
import type { Request, Response } from 'express';
import { storage } from './storage';

// Generate VAPID keys - this should be done once and stored securely
// These keys are used for sender identification
// When setting up in production, follow best practices for key management
// For development, we'll generate them if they don't exist
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls';

// Configure web-push with our VAPID details.
// In a production application, you should use environment variables for these
webpush.setVapidDetails(
  'mailto:example@example.com', // change to your email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Types for push notifications
// This is the web-push format for a subscription
export type WebPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
};

// Initialize notification routes
export function setupNotifications(app: Express) {
  // Route to get the public VAPID key
  app.get('/api/notifications/vapid-public-key', (req: Request, res: Response) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Route to save a subscription
  app.post('/api/notifications/subscribe', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const subscription = req.body;
    
    try {
      await storage.saveNotificationSubscription(userId, subscription);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  // Route to remove a subscription
  app.post('/api/notifications/unsubscribe', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const subscription = req.body;
    
    try {
      await storage.removeNotificationSubscription(userId, subscription.endpoint);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });

  // Route to test push notifications (only for development)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/notifications/test', async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.user!.id;
      
      try {
        const result = await sendNotificationToUser(userId, {
          title: 'Test Notification',
          body: 'This is a test notification from CoupleClarity!'
        });
        
        res.status(200).json({ success: true, result });
      } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
      }
    });
  }
}

// Function to send a notification to a specific user
export async function sendNotificationToUser(
  userId: number, 
  payload: NotificationPayload
) {
  try {
    // Get all subscriptions for this user
    const subscriptions = await storage.getNotificationSubscriptions(userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, reason: 'No subscriptions found for user' };
    }
    
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          // Format subscription object for webpush
          const webpushSubscription = {
            endpoint: subscription.endpoint,
            expirationTime: null,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };
          
          // Send the notification
          const result = await webpush.sendNotification(
            webpushSubscription,
            JSON.stringify(payload)
          );
          
          return { success: true, statusCode: result.statusCode };
        } catch (error: any) {
          console.error(`Push notification error for subscription ${subscription.endpoint}:`, error);
          
          // If subscription is no longer valid (expired or unsubscribed)
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Remove invalid subscription
            await storage.removeNotificationSubscription(userId, subscription.endpoint);
            return { 
              success: false, 
              statusCode: error.statusCode, 
              reason: 'Subscription expired or invalid', 
              removed: true 
            };
          }
          
          return { 
            success: false, 
            statusCode: error.statusCode || 500, 
            reason: error.message 
          };
        }
      })
    );
    
    return { success: true, results };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

// Function to send a notification to a partner
export async function sendNotificationToPartner(
  userId: number,
  payload: NotificationPayload
) {
  try {
    // Get the partner's user ID
    const partnership = await storage.getPartnershipByUser(userId);
    
    if (!partnership) {
      return { success: false, reason: 'No partnership found for user' };
    }
    
    // Determine which user is the partner
    const partnerId = partnership.user1Id === userId 
      ? partnership.user2Id 
      : partnership.user1Id;
    
    // Send notification to the partner
    return await sendNotificationToUser(partnerId, payload);
  } catch (error) {
    console.error('Error sending push notification to partner:', error);
    return { success: false, error };
  }
}