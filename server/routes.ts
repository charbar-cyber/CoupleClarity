import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Extended WebSocket interface with userId
interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

// Extended session interface with passport support
interface SessionWithPassport {
  passport?: {
    user: number;
  };
}
import { storage } from "./storage";
import { transformEmotionalMessage, summarizeResponse, transformConflictMessage, transcribeAudio } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { 
  emotionSchema, 
  responseSchema, 
  transformationResponseSchema,
  onboardingQuestionnaireSchema,
  checkInSchema,
  insertAppreciationSchema,
  insertConflictThreadSchema,
  insertConflictMessageSchema,
  insertMemorySchema,
  memoryTypes,
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
  
  // =========== Direct Message Routes ===========
  
  // Get all direct messages in a conversation between two users
  app.get("/api/direct-messages/:partnerId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const partnerId = parseInt(req.params.partnerId);
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }
      
      // Optional limit parameter
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Get the messages
      const messages = await storage.getDirectMessageConversation(userId, partnerId, limit);
      
      // Mark all messages as read where user is recipient
      await Promise.all(
        messages
          .filter(msg => msg.recipientId === userId && !msg.isRead)
          .map(msg => storage.markDirectMessageAsRead(msg.id))
      );
      
      res.json(messages);
    } catch (error: unknown) {
      console.error("Error fetching direct messages:", error);
      res.status(500).json({ message: "Failed to fetch direct messages" });
    }
  });
  
  // Get unread message count
  app.get("/api/direct-messages/unread/count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      const count = await storage.getUnreadDirectMessageCount(userId);
      
      res.json({ count });
    } catch (error: unknown) {
      console.error("Error getting unread message count:", error);
      res.status(500).json({ message: "Failed to get unread message count" });
    }
  });
  
  // Get a user by ID
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
      
      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      
      // Check if the requesting user has a partnership with this user
      const currentUserId = (req.user as Express.User).id;
      const partnership = await storage.getPartnershipByUsers(currentUserId, userId);
      
      if (!partnership) {
        return res.status(403).json({ message: "You don't have permission to view this user" });
      }
      
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Create a new direct message
  app.post("/api/direct-messages", isAuthenticated, async (req, res) => {
    try {
      const { recipientId, content } = req.body;
      
      if (!recipientId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const senderId = (req.user as Express.User).id;
      
      // Make sure the recipient exists
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      // Make sure there's a partnership between the sender and recipient
      const partnership = await storage.getPartnershipByUsers(senderId, recipientId);
      if (!partnership) {
        return res.status(403).json({ message: "No partnership exists with this user" });
      }
      
      // Create the message
      const message = await storage.createDirectMessage({
        senderId,
        recipientId,
        content
      });
      
      // Notify via WebSocket if recipient is connected
      const clients = Array.from(wss.clients);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN && (client as any).userId === recipientId) {
          client.send(JSON.stringify({
            type: 'new_direct_message',
            data: message
          }));
        }
      }
      
      res.status(201).json(message);
    } catch (error: unknown) {
      console.error("Error creating direct message:", error);
      res.status(500).json({ message: "Failed to create direct message" });
    }
  });
  
  // Mark a direct message as read
  app.patch("/api/direct-messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const userId = (req.user as Express.User).id;
      const message = await storage.getDirectMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check that the user is the recipient
      if (message.recipientId !== userId) {
        return res.status(403).json({ message: "You can only mark messages sent to you as read" });
      }
      
      // Mark as read
      const updatedMessage = await storage.markDirectMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error: unknown) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
  
  // Create WebSocket server
  // Configure multer to store files temporarily
  const uploadDir = path.join(process.cwd(), 'tmp');
  // Create the upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  });

  const upload = multer({ storage: multerStorage });

  // Audio transcription endpoint
  app.post('/api/transcribe', isAuthenticated, upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Get the path to the uploaded audio file
      const audioFilePath = req.file.path;

      // Call OpenAI API to transcribe the audio
      const transcription = await transcribeAudio(audioFilePath);

      // Return the transcription result
      res.json(transcription);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      res.status(500).json({ 
        error: 'Failed to transcribe audio',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Memory API Routes
  // Get all memories for a partnership
  app.get("/api/partnerships/:partnershipId/memories", isAuthenticated, async (req, res) => {
    try {
      const partnershipId = parseInt(req.params.partnershipId);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ message: "Invalid partnership ID" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const memories = await storage.getMemoriesByPartnershipId(partnershipId, limit);
      
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ message: "Failed to fetch memories" });
    }
  });
  
  // Get significant memories for a partnership
  app.get("/api/partnerships/:partnershipId/memories/significant", isAuthenticated, async (req, res) => {
    try {
      const partnershipId = parseInt(req.params.partnershipId);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ message: "Invalid partnership ID" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const memories = await storage.getSignificantMemories(partnershipId, limit);
      
      res.json(memories);
    } catch (error) {
      console.error("Error fetching significant memories:", error);
      res.status(500).json({ message: "Failed to fetch significant memories" });
    }
  });
  
  // Get memories by type
  app.get("/api/partnerships/:partnershipId/memories/type/:type", isAuthenticated, async (req, res) => {
    try {
      const partnershipId = parseInt(req.params.partnershipId);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ message: "Invalid partnership ID" });
      }
      
      const type = req.params.type;
      if (!memoryTypes.includes(type as any)) {
        return res.status(400).json({ message: "Invalid memory type" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const memories = await storage.getMemoriesByType(partnershipId, type, limit);
      
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories by type:", error);
      res.status(500).json({ message: "Failed to fetch memories by type" });
    }
  });
  
  // Search memories
  app.get("/api/partnerships/:partnershipId/memories/search", isAuthenticated, async (req, res) => {
    try {
      const partnershipId = parseInt(req.params.partnershipId);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ message: "Invalid partnership ID" });
      }
      
      const query = req.query.q as string;
      if (!query || query.trim() === "") {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const memories = await storage.searchMemories(partnershipId, query);
      
      res.json(memories);
    } catch (error) {
      console.error("Error searching memories:", error);
      res.status(500).json({ message: "Failed to search memories" });
    }
  });
  
  // Get a specific memory
  app.get("/api/memories/:id", isAuthenticated, async (req, res) => {
    try {
      const memoryId = parseInt(req.params.id);
      if (isNaN(memoryId)) {
        return res.status(400).json({ message: "Invalid memory ID" });
      }
      
      const memory = await storage.getMemory(memoryId);
      if (!memory) {
        return res.status(404).json({ message: "Memory not found" });
      }
      
      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ message: "Failed to fetch memory" });
    }
  });
  
  // Create a new memory
  app.post("/api/memories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = insertMemorySchema.parse({
        ...req.body,
        userId
      });
      
      const memory = await storage.createMemory(validatedData);
      
      res.status(201).json(memory);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating memory:", error);
      res.status(500).json({ message: "Failed to create memory" });
    }
  });
  
  // Update a memory
  app.patch("/api/memories/:id", isAuthenticated, async (req, res) => {
    try {
      const memoryId = parseInt(req.params.id);
      if (isNaN(memoryId)) {
        return res.status(400).json({ message: "Invalid memory ID" });
      }
      
      const memory = await storage.getMemory(memoryId);
      if (!memory) {
        return res.status(404).json({ message: "Memory not found" });
      }
      
      // Ensure user owns the memory
      const userId = (req.user as Express.User).id;
      if (memory.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this memory" });
      }
      
      // Validate update data
      const updateData = req.body;
      const updatedMemory = await storage.updateMemory(memoryId, updateData);
      
      res.json(updatedMemory);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating memory:", error);
      res.status(500).json({ message: "Failed to update memory" });
    }
  });
  
  // Delete a memory
  app.delete("/api/memories/:id", isAuthenticated, async (req, res) => {
    try {
      const memoryId = parseInt(req.params.id);
      if (isNaN(memoryId)) {
        return res.status(400).json({ message: "Invalid memory ID" });
      }
      
      const memory = await storage.getMemory(memoryId);
      if (!memory) {
        return res.status(404).json({ message: "Memory not found" });
      }
      
      // Ensure user owns the memory
      const userId = (req.user as Express.User).id;
      if (memory.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this memory" });
      }
      
      await storage.deleteMemory(memoryId);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ message: "Failed to delete memory" });
    }
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Set up WebSocket connections
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('WebSocket client connected');
    
    // Extract session ID from cookies
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('connect.sid='));
      
      if (sessionCookie) {
        const sessionId = sessionCookie.split('=')[1].split('.')[0].slice(2);
        
        // Look up the session in the session store
        storage.sessionStore.get(sessionId, (err, session) => {
          if (err || !session) {
            console.log('No valid session found for WebSocket connection');
            return;
          }
          
          const sessionWithPassport = session as unknown as SessionWithPassport;
          
          if (!sessionWithPassport.passport || !sessionWithPassport.passport.user) {
            console.log('No authenticated user found in session');
            return;
          }
          
          // Attach the user ID to the WebSocket connection
          ws.userId = sessionWithPassport.passport.user;
          console.log(`WebSocket client authenticated as user ID: ${sessionWithPassport.passport.user}`);
        });
      }
    }
    
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
        
        if (data.type === 'new_direct_message') {
          // Only send direct message to the specific recipient
          console.log('Sending direct message to recipient:', data.data?.recipientId);
          
          // Get the recipient's WebSocket connection
          const recipientId = data.data?.recipientId;
          if (recipientId) {
            wss.clients.forEach((client: AuthenticatedWebSocket) => {
              if (client.userId === recipientId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'new_direct_message',
                  data: data.data
                }));
              }
            });
          }
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
