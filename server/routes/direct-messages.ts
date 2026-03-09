import { type Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, type RouteContext } from "./types";

export async function hasActivePartnershipBetween(userId: number, otherUserId: number) {
  const partnership = await storage.getPartnershipByUsers(userId, otherUserId);
  return partnership?.status === "active";
}

export function registerDirectMessageRoutes(app: Express, ctx: RouteContext) {
  app.get("/api/direct-messages/unread/count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const count = await storage.getUnreadDirectMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching direct message unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.get("/api/direct-messages/:partnerId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const partnerId = parseInt(req.params.partnerId, 10);

      if (Number.isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }

      if (!(await hasActivePartnershipBetween(userId, partnerId))) {
        return res.status(403).json({ message: "Direct messages require an active partnership" });
      }

      const messages = await storage.getDirectMessageConversation(userId, partnerId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching direct message conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/direct-messages", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const recipientId = Number(req.body.recipientId);
      const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

      if (!recipientId || Number.isNaN(recipientId)) {
        return res.status(400).json({ message: "A valid recipient ID is required" });
      }

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (recipientId === user.id) {
        return res.status(400).json({ message: "You cannot direct message yourself" });
      }

      if (!(await hasActivePartnershipBetween(user.id, recipientId))) {
        return res.status(403).json({ message: "Direct messages require an active partnership" });
      }

      const message = await storage.createDirectMessage({
        senderId: user.id,
        recipientId,
        content,
      });

      const recipientClient = ctx.clients.get(recipientId);
      if (recipientClient) {
        recipientClient.send(JSON.stringify({
          type: "new_direct_message",
          data: {
            ...message,
            senderName: user.displayName || user.firstName,
          },
        }));
      }

      await ctx.sendNotification(recipientId, {
        title: `Message from ${user.firstName}`,
        body: content.slice(0, 100),
        url: `/messages/direct/${user.id}`,
        type: "directMessages",
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating direct message:", error);
      res.status(500).json({ message: "Failed to send direct message" });
    }
  });

  app.patch("/api/direct-messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const messageId = parseInt(req.params.id, 10);

      if (Number.isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const message = await storage.getDirectMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this message" });
      }

      const updatedMessage = await storage.markDirectMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking direct message as read:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });
}
