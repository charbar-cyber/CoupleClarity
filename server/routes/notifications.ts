import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import { isAuthenticated, type RouteContext } from "./types";

export function register(app: Express, ctx: RouteContext) {
  // Subscribe to push notifications
  app.post("/api/notifications/subscribe", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      // Check if subscription already exists for this endpoint
      const existingSubscription = await storage.getPushSubscriptionByEndpoint(endpoint);

      if (existingSubscription) {
        // If subscription exists but for a different user, delete it
        if (existingSubscription.userId !== userId) {
          await storage.deletePushSubscription(existingSubscription.id);
        } else {
          // Subscription already exists for this user
          return res.json({ message: "Subscription already exists", subscription: existingSubscription });
        }
      }

      // Create new subscription
      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      });

      res.status(201).json({ message: "Subscription created", subscription });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error creating push subscription:", err);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.delete("/api/notifications/unsubscribe", isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Missing endpoint" });
      }

      await storage.deletePushSubscriptionByEndpoint(endpoint);
      res.json({ message: "Subscription removed" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error removing push subscription:", err);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // Update notification preferences
  app.post("/api/notifications/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const preferences = req.body;

      const updatedPreferences = await storage.updateNotificationPreferences(userId, preferences);
      res.json(updatedPreferences);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error updating notification preferences:", err);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Get notification preferences
  app.get("/api/notifications/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const preferences = await storage.getNotificationPreferences(userId);

      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = await storage.createNotificationPreferences({
          userId,
          newConflicts: true,
          partnerEmotions: true,
          directMessages: true,
          conflictUpdates: true,
          weeklyCheckIns: true,
          appreciations: true
        });

        return res.json(defaultPreferences);
      }

      res.json(preferences);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error getting notification preferences:", err);
      res.status(500).json({ message: "Failed to get notification preferences" });
    }
  });
}
