import { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { storage } from "./storage";
import { setupAuth } from "./auth";
import { type AuthenticatedWebSocket, type RouteContext, type NotificationData } from "./routes/types";

// Domain route modules
import { registerEmotionRoutes } from "./routes/emotions";
import { registerUserProfileRoutes } from "./routes/user-profile";
import { registerPartnershipRoutes } from "./routes/partnerships";
import { register as registerMessageRoutes } from "./routes/messages";
import { register as registerAvatarRoutes } from "./routes/avatars";
import { register as registerNotificationRoutes } from "./routes/notifications";
import { register as registerExerciseRoutes } from "./routes/exercises";
import { register as registerCheckInRoutes } from "./routes/check-ins";
import { register as registerJournalRoutes } from "./routes/journal";
import { register as registerTherapySessionRoutes } from "./routes/therapy-sessions";

// Extended session interface with passport support
interface SessionWithPassport {
  passport?: {
    user: number;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Create HTTP + WebSocket server
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map to keep track of connected clients
  const clients: Map<number, AuthenticatedWebSocket> = new Map();

  // Set up WebSocket connections
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication message
        if (data.type === 'auth') {
          ws.userId = data.userId;
          clients.set(data.userId, ws);
          console.log(`User ${data.userId} authenticated on WebSocket`);

          // Confirm successful auth
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }

        // Handle direct message
        if (data.type === 'direct_message' && ws.userId) {
          handleDirectMessage(data, ws.userId);
        }

        // Handle conflict thread update
        if (data.type === 'conflict_update' && ws.userId) {
          handleConflictUpdate(data, ws.userId);
        }

        // Handle emotion expression
        if (data.type === 'emotion_expressed' && ws.userId) {
          handleEmotionExpressed(data, ws.userId);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        console.log(`User ${ws.userId} disconnected from WebSocket`);
        clients.delete(ws.userId);
      }
    });
  });

  // WebSocket handlers
  async function handleDirectMessage(data: any, senderId: number) {
    try {
      const partnership = await storage.getPartnershipByUser(senderId);
      if (!partnership) return;

      const recipientId = partnership.user1Id === senderId
        ? partnership.user2Id
        : partnership.user1Id;

      const recipientWs = clients.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({
          type: 'new_direct_message',
          message: data.message,
          senderId,
          senderName: data.senderName,
          timestamp: new Date().toISOString()
        }));
      }

      await sendNotification(recipientId, {
        title: `Message from ${data.senderName}`,
        body: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
        url: '/direct-message',
        type: 'directMessages'
      });
    } catch (error) {
      console.error('Error handling direct message:', error);
    }
  }

  async function handleConflictUpdate(data: any, senderId: number) {
    try {
      const thread = await storage.getConflictThread(data.threadId);
      if (!thread) return;

      const partnership = await storage.getPartnershipByUser(senderId);
      if (!partnership) return;

      const recipientId = partnership.user1Id === senderId
        ? partnership.user2Id
        : partnership.user1Id;

      const recipientWs = clients.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({
          type: 'conflict_update',
          threadId: data.threadId,
          topic: data.topic,
          updateType: data.updateType,
          senderId,
          senderName: data.senderName,
          timestamp: new Date().toISOString()
        }));
      }

      const notificationType = data.updateType === 'new' ? 'newConflicts' : 'conflictUpdates';
      const notificationTitle = data.updateType === 'new'
        ? `New conflict thread from ${data.senderName}`
        : `Update in conflict: ${data.topic}`;

      await sendNotification(recipientId, {
        title: notificationTitle,
        body: data.updateType === 'new'
          ? `${data.senderName} started a conflict thread about: ${data.topic}`
          : `${data.senderName} added a message to the conflict about: ${data.topic}`,
        url: `/conflict-threads/${data.threadId}`,
        type: notificationType
      });
    } catch (error) {
      console.error('Error handling conflict update:', error);
    }
  }

  async function handleEmotionExpressed(data: any, senderId: number) {
    try {
      const partnership = await storage.getPartnershipByUser(senderId);
      if (!partnership) return;

      const recipientId = partnership.user1Id === senderId
        ? partnership.user2Id
        : partnership.user1Id;

      const recipientWs = clients.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({
          type: 'emotion_expressed',
          emotion: data.emotion,
          senderId,
          senderName: data.senderName,
          timestamp: new Date().toISOString()
        }));
      }

      await sendNotification(recipientId, {
        title: `${data.senderName} expressed an emotion`,
        body: `${data.senderName} is feeling ${data.emotion}`,
        url: '/dashboard',
        type: 'partnerEmotions'
      });
    } catch (error) {
      console.error('Error handling emotion expression:', error);
    }
  }

  // Helper function to send push notifications
  async function sendNotification(userId: number, notificationData: NotificationData) {
    try {
      const preferences = await storage.getNotificationPreferences(userId);

      // Check if user has enabled this type of notification
      if (!preferences || !(preferences as any)[notificationData.type]) {
        return;
      }

      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      if (!subscriptions || subscriptions.length === 0) {
        return;
      }

      console.log(`Sending push notification to user ${userId}:`, notificationData);
      console.log(`Notification would be sent to ${subscriptions.length} devices`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Build shared context for route modules
  const ctx: RouteContext = { clients, sendNotification };

  // Register all domain route modules
  registerEmotionRoutes(app, ctx);
  registerUserProfileRoutes(app, ctx);
  registerPartnershipRoutes(app, ctx);
  registerMessageRoutes(app, ctx);
  registerAvatarRoutes(app, ctx);
  registerNotificationRoutes(app, ctx);
  registerExerciseRoutes(app, ctx);
  registerCheckInRoutes(app, ctx);
  registerJournalRoutes(app, ctx);
  registerTherapySessionRoutes(app, ctx);

  return httpServer;
}
