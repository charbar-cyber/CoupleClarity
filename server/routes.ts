import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { transformEmotionalMessage, summarizeResponse } from "./openai";
import { 
  emotionSchema, 
  responseSchema, 
  transformationResponseSchema,
  onboardingQuestionnaireSchema 
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
        emotion: message.emotion,
        rawMessage: message.rawMessage,
        transformedMessage: message.transformedMessage,
        communicationElements: JSON.parse(message.communicationElements),
        deliveryTips: JSON.parse(message.deliveryTips),
        createdAt: message.createdAt,
      }));
      
      res.json(formattedMessages);
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
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
