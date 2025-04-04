import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { transformEmotionalMessage, summarizeResponse, transformConflictMessage } from "./openai";
import { 
  emotionSchema, 
  responseSchema, 
  transformationResponseSchema,
  onboardingQuestionnaireSchema,
  checkInSchema,
  insertAppreciationSchema,
  insertConflictThreadSchema,
  insertConflictMessageSchema,
  resolveConflictSchema,
  conflictInitiationSchema
} from "@shared/schema";
import { setupAuth } from "./auth";

// Authentication middleware to protect routes
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  // API Routes
  app.post("/api/transform", isAuthenticated, async (req, res) => {
    try {
      const validatedData = emotionSchema.parse(req.body);
      
      // Call OpenAI API to transform the message
      const transformedResult = await transformEmotionalMessage(
        validatedData.emotion,
        validatedData.rawMessage,
        validatedData.context
      );
      
      let messageId;
      
      // Save to history if requested
      if (validatedData.saveToHistory) {
        // Use the authenticated user's ID
        const userId = (req.user as Express.User).id;
        
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

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      // Get messages for authenticated user
      const userId = (req.user as Express.User).id;
      const messages = await storage.getMessagesByUserId(userId);
      
      // Format message data for frontend
      const formattedMessages = messages.map(message => ({
        id: message.id,
        userId: message.userId,
        emotion: message.emotion,
        rawMessage: message.rawMessage,
        transformedMessage: message.transformedMessage,
        communicationElements: JSON.parse(message.communicationElements),
        deliveryTips: JSON.parse(message.deliveryTips),
        createdAt: message.createdAt,
        isShared: message.isShared
      }));
      
      res.json(formattedMessages);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Endpoint for getting emotion analytics
  app.get("/api/emotions/analytics", isAuthenticated, async (req, res) => {
    try {
      // Get user ID
      const userId = (req.user as Express.User).id;
      
      // Fetch user's messages
      const messages = await storage.getMessagesByUserId(userId);
      
      // Analysis results
      const emotionCounts: Record<string, number> = {};
      const monthlyTrends: Record<string, Record<string, number>> = {};
      
      // Analyze emotions from messages
      messages.forEach(message => {
        const emotion = message.emotion.toLowerCase();
        const date = new Date(message.createdAt);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        // Count emotions overall
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        
        // Group by month for timeline
        if (!monthlyTrends[monthYear]) {
          monthlyTrends[monthYear] = {};
        }
        
        monthlyTrends[monthYear][emotion] = (monthlyTrends[monthYear][emotion] || 0) + 1;
      });
      
      // Format the results
      const emotionData = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count);
      
      const timelineData = Object.entries(monthlyTrends)
        .map(([date, emotions]) => ({
          date,
          ...emotions
        }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.date.split('/').map(Number);
          const [bMonth, bYear] = b.date.split('/').map(Number);
          return aYear === bYear ? aMonth - bMonth : aYear - bYear;
        });
      
      // Return the analytics data
      res.json({
        emotionData,
        timelineData,
        totalExpressions: messages.length
      });
    } catch (error: unknown) {
      console.error("Error generating emotion analytics:", error);
      res.status(500).json({ message: "Failed to generate emotion analytics" });
    }
  });

  app.get("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Get the user who created the message
      const user = await storage.getUser(message.userId);
      const { password, ...userData } = user || { password: '' };
      
      // Get responses to this message
      const responses = await storage.getResponsesByMessageId(messageId);
      
      // Enrich responses with user data
      const enrichedResponses = await Promise.all(
        responses.map(async (response) => {
          const responseUser = await storage.getUser(response.userId);
          const { password, ...responseUserData } = responseUser || { password: '' };
          
          return {
            ...response,
            user: responseUserData
          };
        })
      );
      
      // Format message data for frontend
      const formattedMessage = {
        id: message.id,
        userId: message.userId,
        emotion: message.emotion,
        rawMessage: message.rawMessage,
        context: message.context,
        transformedMessage: message.transformedMessage,
        communicationElements: JSON.parse(message.communicationElements),
        deliveryTips: JSON.parse(message.deliveryTips),
        createdAt: message.createdAt,
        isShared: message.isShared,
        user: userData,
        responses: enrichedResponses
      };
      
      res.json(formattedMessage);
    } catch (error: unknown) {
      console.error("Error fetching message:", error);
      res.status(500).json({ message: "Failed to fetch message" });
    }
  });

  // User endpoints
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password to the client
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error: unknown) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Partnership endpoints
  app.get("/api/users/:userId/partnerships", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const partnerships = await storage.getPartnershipsForUser(userId);
      
      // Populate partners information
      const populatedPartnerships = await Promise.all(
        partnerships.map(async (partnership) => {
          const partnerId = partnership.user1Id === userId 
            ? partnership.user2Id 
            : partnership.user1Id;
            
          const partner = await storage.getUser(partnerId);
          const { password, ...partnerData } = partner || { password: '' };
          
          return {
            ...partnership,
            partner: partnerData
          };
        })
      );
      
      res.json(populatedPartnerships);
    } catch (error: unknown) {
      console.error("Error fetching partnerships:", error);
      res.status(500).json({ message: "Failed to fetch partnerships" });
    }
  });
  
  // Shared messages endpoints
  app.get("/api/partners/:partnerId/shared-messages", isAuthenticated, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.partnerId);
      if (isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }
      
      const messages = await storage.getSharedMessagesForPartner(partnerId);
      
      // Format message data for frontend
      const formattedMessages = messages.map(message => ({
        id: message.id,
        userId: message.userId,
        emotion: message.emotion,
        rawMessage: message.rawMessage,
        transformedMessage: message.transformedMessage,
        communicationElements: JSON.parse(message.communicationElements),
        deliveryTips: JSON.parse(message.deliveryTips),
        createdAt: message.createdAt,
      }));
      
      res.json(formattedMessages);
    } catch (error: unknown) {
      console.error("Error fetching shared messages:", error);
      res.status(500).json({ message: "Failed to fetch shared messages" });
    }
  });
  
  // Response endpoints
  app.post("/api/messages/:messageId/responses", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      const validatedData = responseSchema.parse(req.body);
      
      // Use the authenticated user's ID
      const userId = (req.user as Express.User).id;
      
      // Use OpenAI to generate a summary of the response
      const aiSummary = await summarizeResponse(
        message.transformedMessage,
        validatedData.content
      );
      
      const response = await storage.createResponse({
        messageId,
        userId,
        content: validatedData.content,
        aiSummary
      });
      
      res.json({
        ...response,
        aiSummary
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error creating response:", err);
      res.status(500).json({ message: "Failed to create response" });
    }
  });
  
  app.get("/api/messages/:messageId/responses", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const responses = await storage.getResponsesByMessageId(messageId);
      res.json(responses);
    } catch (error: unknown) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  // User preferences endpoints
  app.post("/api/user/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = onboardingQuestionnaireSchema.parse(req.body);
      
      // Check if the user already has preferences
      const existingPreferences = await storage.getUserPreferences(userId);
      
      let preferences;
      if (existingPreferences) {
        // Update existing preferences
        preferences = await storage.updateUserPreferences(userId, validatedData);
      } else {
        // Create new preferences
        preferences = await storage.createUserPreferences({
          userId,
          ...validatedData
        });
      }
      
      res.json(preferences);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error saving user preferences:", err);
      res.status(500).json({ message: "Failed to save user preferences" });
    }
  });
  
  app.get("/api/user/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(preferences);
    } catch (error: unknown) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });
  
  // Weekly check-in endpoints
  app.get("/api/check-in/prompts", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
      const prompts = await storage.getActiveCheckInPrompts(limit);
      
      // If no prompts exist, create some default ones
      if (prompts.length === 0) {
        const defaultPrompts = [
          {
            prompt: "What moments of connection did you experience with your partner this week?",
            category: "connection",
            isActive: true
          },
          {
            prompt: "What is one thing your partner did this week that you appreciated?",
            category: "appreciation",
            isActive: true
          },
          {
            prompt: "Is there anything specific you'd like to work on together next week?",
            category: "growth",
            isActive: true
          }
        ];
        
        const createdPrompts = await Promise.all(
          defaultPrompts.map(prompt => storage.createCheckInPrompt(prompt))
        );
        
        res.json(createdPrompts);
      } else {
        res.json(prompts);
      }
    } catch (error: unknown) {
      console.error("Error fetching check-in prompts:", error);
      res.status(500).json({ message: "Failed to fetch check-in prompts" });
    }
  });
  
  app.post("/api/check-in/prompts", isAuthenticated, async (req, res) => {
    try {
      const prompt = req.body;
      const newPrompt = await storage.createCheckInPrompt(prompt);
      res.status(201).json(newPrompt);
    } catch (error: unknown) {
      console.error("Error creating check-in prompt:", error);
      res.status(500).json({ message: "Failed to create check-in prompt" });
    }
  });
  
  app.post("/api/check-in/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = checkInSchema.parse(req.body);
      
      // Get the current date for the week
      const today = new Date();
      const weekOf = new Date(today.setHours(0, 0, 0, 0));
      weekOf.setDate(weekOf.getDate() - weekOf.getDay()); // Set to beginning of week (Sunday)
      
      // Create responses for each prompt
      const responses = await Promise.all(
        validatedData.responses.map(async (responseData: { promptId: number; response: string }) => {
          const response = await storage.createCheckInResponse({
            userId,
            promptId: responseData.promptId,
            response: responseData.response,
            weekOf,
            isShared: validatedData.isShared
          });
          return response;
        })
      );
      
      res.status(201).json({ 
        responses,
        weekOf,
        isShared: validatedData.isShared
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error creating check-in responses:", err);
      res.status(500).json({ message: "Failed to create check-in responses" });
    }
  });
  
  app.get("/api/check-in/responses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      let weekOf: Date | undefined = undefined;
      
      if (req.query.weekOf) {
        weekOf = new Date(req.query.weekOf as string);
      }
      
      const responses = await storage.getUserCheckInResponses(userId, weekOf);
      
      // Get prompt details for each response
      const responsesWithPrompts = await Promise.all(
        responses.map(async (response) => {
          const prompt = await storage.getCheckInPrompt(response.promptId);
          return {
            ...response,
            prompt: prompt || { prompt: "Unknown prompt" }
          };
        })
      );
      
      res.json(responsesWithPrompts);
    } catch (error: unknown) {
      console.error("Error fetching check-in responses:", error);
      res.status(500).json({ message: "Failed to fetch check-in responses" });
    }
  });
  
  app.get("/api/check-in/latest", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const latestWeek = await storage.getLatestCheckInWeek(userId);
      
      if (!latestWeek) {
        return res.status(404).json({ message: "No check-in history found" });
      }
      
      // Check if a new week has started since the last check-in
      const today = new Date();
      const currentWeekStart = new Date(today.setHours(0, 0, 0, 0));
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      
      const lastWeekStart = new Date(latestWeek);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      const needsNewCheckIn = currentWeekStart.getTime() > lastWeekStart.getTime();
      
      res.json({
        latestWeek,
        needsNewCheckIn,
        currentWeek: currentWeekStart
      });
    } catch (error: unknown) {
      console.error("Error fetching latest check-in:", error);
      res.status(500).json({ message: "Failed to fetch latest check-in" });
    }
  });
  
  app.get("/api/users/:userId/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: "User preferences not found" });
      }
      
      res.json(preferences);
    } catch (error: unknown) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });
  
  // Appreciation log endpoints
  app.post("/api/appreciations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const data = insertAppreciationSchema.parse({
        ...req.body,
        userId
      });
      
      const appreciation = await storage.createAppreciation(data);
      res.status(201).json(appreciation);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error creating appreciation:", err);
      res.status(500).json({ message: "Failed to create appreciation" });
    }
  });
  
  app.get("/api/appreciations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      const appreciations = await storage.getAppreciationsByUserId(userId, limit);
      res.json(appreciations);
    } catch (error: unknown) {
      console.error("Error fetching appreciations:", error);
      res.status(500).json({ message: "Failed to fetch appreciations" });
    }
  });
  
  // Conflict Thread endpoints
  app.post("/api/conflict-threads", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = insertConflictThreadSchema.parse({
        ...req.body,
        userId
      });
      
      const conflictThread = await storage.createConflictThread(validatedData);
      res.status(201).json(conflictThread);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error creating conflict thread:", err);
      res.status(500).json({ message: "Failed to create conflict thread" });
    }
  });
  
  app.get("/api/conflict-threads", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const status = req.query.status as string;
      
      let threads;
      if (status === 'active') {
        threads = await storage.getActiveConflictThreads(userId);
      } else {
        threads = await storage.getConflictThreadsByUserId(userId);
      }
      
      res.json(threads);
    } catch (error: unknown) {
      console.error("Error fetching conflict threads:", error);
      res.status(500).json({ message: "Failed to fetch conflict threads" });
    }
  });
  
  app.get("/api/conflict-threads/:id", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }
      
      const thread = await storage.getConflictThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Conflict thread not found" });
      }
      
      // Get messages for this thread
      const messages = await storage.getConflictMessagesByThreadId(threadId);
      
      res.json({
        ...thread,
        messages
      });
    } catch (error: unknown) {
      console.error("Error fetching conflict thread:", error);
      res.status(500).json({ message: "Failed to fetch conflict thread" });
    }
  });
  
  app.post("/api/conflict-threads/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }
      
      const thread = await storage.getConflictThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Conflict thread not found" });
      }
      
      // Check if thread is still active
      if (thread.status !== "active") {
        return res.status(400).json({ message: "Cannot add message to a resolved or abandoned thread" });
      }
      
      const userId = (req.user as Express.User).id;
      const validatedData = insertConflictMessageSchema.parse({
        ...req.body,
        threadId,
        userId
      });
      
      const message = await storage.createConflictMessage(validatedData);
      res.status(201).json(message);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error creating conflict message:", err);
      res.status(500).json({ message: "Failed to create conflict message" });
    }
  });

  app.get("/api/conflict-messages/:threadId", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }
      
      const thread = await storage.getConflictThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Conflict thread not found" });
      }
      
      const messages = await storage.getConflictMessagesByThreadId(threadId);
      res.json(messages);
    } catch (error: unknown) {
      console.error("Error fetching conflict messages:", error);
      res.status(500).json({ message: "Failed to fetch conflict messages" });
    }
  });
  
  app.post("/api/transform-conflict", isAuthenticated, async (req, res) => {
    try {
      const validatedData = conflictInitiationSchema.parse(req.body);
      
      // Call OpenAI API to transform the conflict message
      const transformedResult = await transformConflictMessage(
        validatedData.topic,
        validatedData.situation,
        validatedData.feelings,
        validatedData.impact,
        validatedData.request
      );
      
      res.json(transformedResult);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error transforming conflict message:", err);
      res.status(500).json({ message: "Failed to transform conflict message" });
    }
  });
  
  app.patch("/api/conflict-threads/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }
      
      const thread = await storage.getConflictThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Conflict thread not found" });
      }
      
      // Check if thread is still active
      if (thread.status !== "active") {
        return res.status(400).json({ message: "Thread is already resolved or abandoned" });
      }
      
      const userId = (req.user as Express.User).id;
      
      // Check if the user is a participant in this thread
      if (thread.userId !== userId && thread.partnerId !== userId) {
        return res.status(403).json({ message: "You are not a participant in this conflict thread" });
      }
      
      const validatedData = resolveConflictSchema.parse({
        ...req.body,
        threadId
      });
      
      // Update the thread status
      const updatedThread = await storage.updateConflictThreadStatus(
        threadId, 
        "resolved", 
        validatedData.summary
      );
      
      // Add the insights if they were provided
      if (validatedData.insights) {
        await storage.updateConflictResolutionInsights(threadId, validatedData.insights);
      }
      
      res.json(updatedThread);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error resolving conflict thread:", err);
      res.status(500).json({ message: "Failed to resolve conflict thread" });
    }
  });
  
  app.patch("/api/conflict-threads/:id/abandon", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }
      
      const thread = await storage.getConflictThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Conflict thread not found" });
      }
      
      // Check if thread is still active
      if (thread.status !== "active") {
        return res.status(400).json({ message: "Thread is already resolved or abandoned" });
      }
      
      const userId = (req.user as Express.User).id;
      
      // Check if the user is a participant in this thread
      if (thread.userId !== userId && thread.partnerId !== userId) {
        return res.status(403).json({ message: "You are not a participant in this conflict thread" });
      }
      
      // Update the thread status
      const updatedThread = await storage.updateConflictThreadStatus(threadId, "abandoned");
      res.json(updatedThread);
    } catch (error: unknown) {
      console.error("Error abandoning conflict thread:", error);
      res.status(500).json({ message: "Failed to abandon conflict thread" });
    }
  });
  
  // Create WebSocket server
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Set up WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to CoupleClarity WebSocket server'
    }));
    
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'new_message') {
          // Broadcast to partners
          console.log('Broadcasting new message to partners:', data.data);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_shared_message',
                data: data.data
              }));
            }
          });
        }
        
        if (data.type === 'new_response') {
          // Broadcast to partners
          console.log('Broadcasting new response to partners:', data.data);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_response',
                data: data.data
              }));
            }
          });
        }
        
        if (data.type === 'new_conflict_thread') {
          // Broadcast new conflict thread to partners
          console.log('Broadcasting new conflict thread to partners:', data.data);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_conflict_thread',
                data: data.data
              }));
            }
          });
        }
        
        if (data.type === 'new_conflict_message') {
          // Broadcast new conflict message to partners
          console.log('Broadcasting new conflict message to partners:', data.data);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_conflict_message',
                data: data.data
              }));
            }
          });
        }
        
        if (data.type === 'conflict_thread_updated') {
          // Broadcast thread status updates to partners
          console.log('Broadcasting conflict thread update to partners:', data.data);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'conflict_thread_updated',
                data: data.data
              }));
            }
          });
        }
      } catch (error: unknown) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  return httpServer;
}
