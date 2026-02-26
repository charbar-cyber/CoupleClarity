import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import * as anthropic from "../anthropic";
import { transformEmotionalMessage } from "../openai";
import { emotionSchema, type User } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";

export function register(app: Express, ctx: RouteContext) {
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

      // Save to history if requested
      if (validatedData.saveToHistory) {
        const message = await storage.createMessage({
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

        messageId = message.id;
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

      // Format message data for frontend
      const formattedMessages = messages.map(message => {
        let communicationElements = message.communicationElements;
        let deliveryTips = message.deliveryTips;

        try {
          communicationElements = JSON.parse(message.communicationElements);
        } catch (e) {
          // Keep original value if parsing fails
        }

        try {
          deliveryTips = JSON.parse(message.deliveryTips);
        } catch (e) {
          // Keep original value if parsing fails
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
          isShared: message.isShared
        };
      });

      res.json(formattedMessages);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
}
