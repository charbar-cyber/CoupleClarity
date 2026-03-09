import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import * as anthropic from "../anthropic";
import { summarizeResponse, transformEmotionalMessage } from "../openai";
import { emotionSchema, type User } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";

export async function canRespondToSharedMessage(messageId: number, responderId: number) {
  const message = await storage.getMessage(messageId);
  if (!message || message.partnerId !== responderId) {
    return false;
  }

  const partnership = await storage.getPartnershipByUsers(message.userId, responderId);
  return partnership?.status === "active";
}

export async function canAccessSharedMessages(userId: number, partnerId: number) {
  const partnership = await storage.getPartnershipByUsers(userId, partnerId);
  return partnership?.status === "active";
}

export function register(app: Express, ctx: RouteContext) {
  const formatMessage = (message: Awaited<ReturnType<typeof storage.getMessage>>) => {
    if (!message) {
      return null;
    }

    let communicationElements: string[] = [];
    let deliveryTips: string[] = [];

    try {
      communicationElements = JSON.parse(message.communicationElements);
    } catch {
      communicationElements = [message.communicationElements];
    }

    try {
      deliveryTips = JSON.parse(message.deliveryTips);
    } catch {
      deliveryTips = [message.deliveryTips];
    }

    return {
      id: message.id,
      userId: message.userId,
      emotion: message.emotion,
      rawMessage: message.rawMessage,
      transformedMessage: message.transformedMessage,
      communicationElements,
      deliveryTips,
      createdAt: message.createdAt,
      isShared: message.isShared,
      partnerId: message.partnerId,
    };
  };

  // Transform emotional message with AI model selection
  app.post("/api/transform", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = emotionSchema.parse(req.body);

      // Get user preferences to determine which AI model to use
      const userPrefs = await storage.getUserPreferences(userId);
      const preferredModel = userPrefs?.preferredAiModel || 'openai';

      let transformedResult;

      // Use appropriate model based on user preference
      if (preferredModel === 'anthropic') {
        // Call Anthropic API
        const transformedMessage = await anthropic.transformMessage(
          validatedData.rawMessage,
          Array.isArray(validatedData.emotion) ? validatedData.emotion : [validatedData.emotion]
        );

        // Convert to common response format
        transformedResult = {
          transformedMessage,
          communicationElements: {
            iStatements: true,
            specificRequests: true,
            empathyIndicators: true,
            blameFree: true
          },
          deliveryTips: [
            "Speak calmly and maintain open body language",
            "Allow your partner time to respond without interruption",
            "Be receptive to their perspective"
          ]
        };
      } else {
        // Call OpenAI API (default)
        transformedResult = await transformEmotionalMessage(
          validatedData.emotion,
          validatedData.rawMessage,
          validatedData.context
        );
      }

      let messageId;
      let savedMessage;

      // Save to history if requested
      if (validatedData.saveToHistory) {
        savedMessage = await storage.createMessage({
          userId,
          emotion: validatedData.emotion,
          rawMessage: validatedData.rawMessage,
          context: validatedData.context || "",
          transformedMessage: transformedResult.transformedMessage,
          communicationElements: JSON.stringify(transformedResult.communicationElements),
          deliveryTips: JSON.stringify(transformedResult.deliveryTips),
          isShared: validatedData.shareWithPartner || false,
          partnerId: validatedData.partnerId || null
        });

        messageId = savedMessage.id;
      }

      if (savedMessage?.isShared && savedMessage.partnerId) {
        const partnerClient = ctx.clients.get(savedMessage.partnerId);
        const formattedMessage = formatMessage(savedMessage);

        if (partnerClient && formattedMessage) {
          partnerClient.send(JSON.stringify({
            type: "new_shared_message",
            data: {
              ...formattedMessage,
              senderName: (req.user as Express.User).displayName || (req.user as Express.User).firstName,
            },
          }));
        }

        await ctx.sendNotification(savedMessage.partnerId, {
          title: "New shared message",
          body: `${(req.user as Express.User).firstName} shared a transformed message with you`,
          url: `/messages/${savedMessage.id}`,
          type: "directMessages",
        });
      }

      res.json({
        ...transformedResult,
        messageId
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error transforming message:", err);
      res.status(500).json({ message: "Failed to transform message" });
    }
  });

  // Get user's message history
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const messages = await storage.getMessagesByUserId(userId);

      const formattedMessages = messages
        .map((message) => formatMessage(message))
        .filter(Boolean);

      res.json(formattedMessages);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const messageId = parseInt(req.params.id, 10);
      const message = await storage.getMessage(messageId);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.userId !== userId && message.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this message" });
      }

      const responses = await storage.getResponsesByMessageId(messageId);
      const responseUsers = await Promise.all(responses.map((response) => storage.getUser(response.userId)));
      const sender = await storage.getUser(message.userId);

      res.json({
        ...formatMessage(message),
        user: sender ? {
          id: sender.id,
          displayName: sender.displayName,
          firstName: sender.firstName,
        } : null,
        responses: responses.map((response, index) => ({
          ...response,
          user: responseUsers[index] ? {
            id: responseUsers[index]!.id,
            displayName: responseUsers[index]!.displayName,
            firstName: responseUsers[index]!.firstName,
          } : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching message thread:", error);
      res.status(500).json({ message: "Failed to fetch message thread" });
    }
  });

  app.get("/api/messages/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const messageId = parseInt(req.params.id, 10);
      const message = await storage.getMessage(messageId);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.userId !== userId && message.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view these responses" });
      }

      const responses = await storage.getResponsesByMessageId(messageId);
      const responseUsers = await Promise.all(responses.map((response) => storage.getUser(response.userId)));

      res.json(responses.map((response, index) => ({
        ...response,
        user: responseUsers[index] ? {
          id: responseUsers[index]!.id,
          displayName: responseUsers[index]!.displayName,
          firstName: responseUsers[index]!.firstName,
        } : null,
      })));
    } catch (error) {
      console.error("Error fetching message responses:", error);
      res.status(500).json({ message: "Failed to fetch message responses" });
    }
  });

  app.post("/api/messages/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const messageId = parseInt(req.params.id, 10);
      const message = await storage.getMessage(messageId);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.userId === user.id) {
        return res.status(403).json({ message: "You cannot respond to your own message" });
      }

      if (message.partnerId !== user.id) {
        return res.status(403).json({ message: "Not authorized to respond to this message" });
      }

      if (!(await canRespondToSharedMessage(messageId, user.id))) {
        return res.status(403).json({ message: "Responses require an active partnership" });
      }

      const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
      if (!content) {
        return res.status(400).json({ message: "Response content is required" });
      }

      const aiSummary = await summarizeResponse(message.transformedMessage, content);
      const response = await storage.createResponse({
        messageId,
        userId: user.id,
        content,
        aiSummary,
      });

      const senderClient = ctx.clients.get(message.userId);
      if (senderClient) {
        senderClient.send(JSON.stringify({
          type: "new_response",
          data: {
            messageId,
            responseId: response.id,
          },
        }));
      }

      res.status(201).json({
        ...response,
        user: {
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
        },
      });
    } catch (error) {
      console.error("Error creating message response:", error);
      res.status(500).json({ message: "Failed to create message response" });
    }
  });

  app.get("/api/partners/:partnerId/shared-messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const partnerId = parseInt(req.params.partnerId, 10);
      if (Number.isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }

      if (!(await canAccessSharedMessages(userId, partnerId))) {
        return res.status(403).json({ message: "Shared messages require an active partnership" });
      }

      const messages = await storage.getSharedMessagesForPartner(userId);
      const formattedMessages = messages
        .filter((message) => message.userId === partnerId)
        .map((message) => formatMessage(message))
        .filter(Boolean);

      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching shared partner messages:", error);
      res.status(500).json({ message: "Failed to fetch shared messages" });
    }
  });
}
