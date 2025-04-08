import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import serveStatic from "serve-static";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { promisify } from "util";
import multer from "multer";
import crypto from "crypto";

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { storage } from "./storage";
import { transformEmotionalMessage, summarizeResponse, transformConflictMessage, transcribeAudio, generateAvatar, analyzeLoveLanguage } from "./openai";
import { hashPassword, setupAuth } from "./auth";
import { 
  emotionSchema, 
  responseSchema, 
  transformationResponseSchema,
  onboardingQuestionnaireSchema,
  enhancedOnboardingSchema,
  checkInSchema,
  insertAppreciationSchema,
  insertConflictThreadSchema,
  insertConflictMessageSchema,
  insertMemorySchema,
  memoryTypes,
  resolveConflictSchema,
  conflictInitiationSchema,
  requestHelpSchema,
  therapistSpecialties,
  therapyModalities,
  avatarPromptSchema,
  updateAvatarSchema,
  type Therapist,
  type User,
  type EnhancedOnboardingQuestionnaire
} from "@shared/schema";

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
  
  // Rest of existing routes...
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Configure multer for avatar image uploads
  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Create unique filename with timestamp and original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'avatar-' + uniqueSuffix + ext);
    }
  });
  
  // File filter for image uploads
  const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  };
  
  const avatarUpload = multer({ 
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
    }
  });
  
  // Upload image endpoint
  app.post("/api/avatar/upload", isAuthenticated, avatarUpload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = (req.user as Express.User).id;
      
      // Get the file path relative to the server
      const filePath = req.file.path;
      
      // Create a URL path that can be accessed by the client
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);
      const avatarUrl = `/${relativePath.replace(/\\/g, '/')}`;
      
      // Update user's avatar URL in database
      const updatedUser = await storage.updateUserAvatar(userId, avatarUrl);
      
      // Return the result
      res.json({
        avatarUrl: avatarUrl,
        message: "Image uploaded successfully"
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error uploading avatar:", err);
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });
  
  // Transform uploaded image to AI avatar
  app.post("/api/avatar/transform-uploaded", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { avatarUrl } = req.body;
      
      if (!avatarUrl) {
        return res.status(400).json({ message: "No image URL provided" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a prompt based on the uploaded image
      const prompt = "Create a stylized avatar based on this uploaded profile image";
      
      // Generate avatar using OpenAI
      const result = await generateAvatar(prompt);
      
      if (result.error) {
        return res.status(400).json({ 
          message: "Avatar transformation failed", 
          error: result.error 
        });
      }
      
      // Update user's avatar URL
      const updatedUser = await storage.updateUserAvatar(userId, result.imageUrl);
      
      // Return the result
      res.json({
        avatarUrl: result.imageUrl,
        message: "Image transformed successfully"
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error transforming avatar:", err);
      res.status(500).json({ message: "Failed to transform avatar" });
    }
  });
  
  // Avatar generation endpoint
  app.post("/api/avatar/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = avatarPromptSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate avatar using OpenAI
      const result = await generateAvatar(validatedData.prompt);
      
      if (result.error) {
        return res.status(400).json({ 
          message: "Avatar generation failed", 
          error: result.error 
        });
      }
      
      // Update user's avatar URL
      const updatedUser = await storage.updateUserAvatar(userId, result.imageUrl);
      
      // Return the result
      res.json({
        avatarUrl: result.imageUrl,
        message: "Avatar generated successfully"
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error generating avatar:", err);
      res.status(500).json({ message: "Failed to generate avatar" });
    }
  });
  
  // Avatar update endpoint
  app.post("/api/avatar/update", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const validatedData = updateAvatarSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user's avatar URL
      const updatedUser = await storage.updateUserAvatar(userId, validatedData.avatarUrl);
      
      // Return the result
      res.json({
        avatarUrl: validatedData.avatarUrl,
        message: "Avatar updated successfully"
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error updating avatar:", err);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // API endpoint to get the user's partner
  app.get("/api/user/partner", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get all partnerships for user
      const partnerships = await storage.getPartnershipsForUser(userId);
      
      // If user has no partnerships, return null
      if (partnerships.length === 0) {
        return res.json(null);
      }
      
      // Get the first active partnership (in a real app, you might have logic to select the correct one)
      const activePartnership = partnerships.find(p => p.status === "active") || partnerships[0];
      
      // Determine partner ID - it's the other user in the partnership
      const partnerId = activePartnership.user1Id === userId ? activePartnership.user2Id : activePartnership.user1Id;
      
      // Get partner user data
      const partner = await storage.getUser(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Don't send the password
      const { password, ...partnerData } = partner;
      
      // Get partner preferences if they exist
      const partnerPrefs = await storage.getUserPreferences(partnerId);
      
      res.json({
        ...partnerData,
        preferences: partnerPrefs || null,
        startDate: activePartnership.startDate || activePartnership.createdAt
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error getting partner info:", err);
      res.status(500).json({ message: "Failed to get partner information" });
    }
  });
  
  // API endpoint to get relationship data
  app.get("/api/relationship", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get all partnerships for user
      const partnerships = await storage.getPartnershipsForUser(userId);
      
      // If user has no partnerships, return empty data
      if (partnerships.length === 0) {
        return res.json({ 
          hasPartner: false, 
          startDate: null,
          status: null,
          partnershipId: null 
        });
      }
      
      // Get the first active partnership
      const activePartnership = partnerships.find(p => p.status === "active") || partnerships[0];
      
      res.json({
        hasPartner: true,
        startDate: activePartnership.startDate || activePartnership.createdAt,
        status: activePartnership.status,
        partnershipId: activePartnership.id
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error getting relationship info:", err);
      res.status(500).json({ message: "Failed to get relationship information" });
    }
  });
  
  // API endpoint to update user profile
  app.patch("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get the current user data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Extract updatable fields from request body
      const { username, firstName, lastName, email, displayName } = req.body;
      
      // Create update object with only fields that are provided
      const updateData: Partial<User> = {};
      if (username !== undefined) updateData.username = username;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (displayName !== undefined) updateData.displayName = displayName;
      
      // If no fields to update, return current user
      if (Object.keys(updateData).length === 0) {
        return res.json(currentUser);
      }
      
      // Check for username uniqueness if username is being updated
      if (updateData.username && updateData.username !== currentUser.username) {
        const existingUser = await storage.getUserByUsername(updateData.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      // Check for email uniqueness if email is being updated
      if (updateData.email && updateData.email !== currentUser.email) {
        const existingUser = await storage.getUserByEmail(updateData.email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Remove sensitive data before returning
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error updating user profile:", err);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // API endpoint to change user password
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate request
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get the current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the comparePasswords function from auth.ts
      const authModule = await import("./auth");
      
      // Verify the current password
      const isPasswordValid = await authModule.comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user password
      const updatedUser = await storage.updateUserPassword(userId, hashedPassword);
      
      // Return success without any sensitive data
      res.json({ message: "Password updated successfully" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error changing password:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User preferences endpoint
  app.post("/api/user/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Parse and validate the data
      const validatedData = onboardingQuestionnaireSchema.parse(req.body);
      
      // Save the user preferences
      const preferences = await storage.createUserPreferences({
        userId,
        ...validatedData
      });
      
      res.json(preferences);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error saving user preferences:", err);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });
  
  // Enhanced onboarding questionnaire endpoint
  app.post("/api/user/enhanced-onboarding", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Parse and validate the data
      const validatedData = enhancedOnboardingSchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with onboarding data
      const updatedUser = await storage.updateUser(userId, {
        relationshipGoals: validatedData.relationshipGoals,
        challengeAreas: validatedData.challengeAreas,
        communicationFrequency: validatedData.communicationFrequency,
        onboardingCompleted: true
      });
      
      // If there are existing preferences, update them with additional data
      // Otherwise create new preferences
      let preferences = await storage.getUserPreferences(userId);
      
      if (preferences) {
        // Update existing preferences
        preferences = await storage.updateUserPreferences(userId, {
          loveLanguage: validatedData.loveLanguage,
          conflictStyle: validatedData.conflictStyle,
          communicationStyle: validatedData.communicationStyle,
          repairStyle: validatedData.repairStyle
        });
      } else {
        // Create new preferences if they don't exist
        preferences = await storage.createUserPreferences({
          userId,
          loveLanguage: validatedData.loveLanguage,
          conflictStyle: validatedData.conflictStyle,
          communicationStyle: validatedData.communicationStyle,
          repairStyle: validatedData.repairStyle
        });
      }
      
      res.json({
        user: {
          ...updatedUser,
          password: undefined // Don't send password back
        },
        preferences
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: (err as any).errors });
      }
      console.error("Error saving enhanced onboarding data:", err);
      res.status(500).json({ message: "Failed to save onboarding data" });
    }
  });
  
  // Push notification subscription endpoints
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
  
  // Notification preferences endpoint
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
      // Find recipient's WebSocket if connected
      const partnership = await storage.getPartnershipByUser(senderId);
      
      if (!partnership) {
        console.error('Partnership not found');
        return;
      }
      
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
      
      // Send push notification
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
      // Find recipient's WebSocket if connected
      const thread = await storage.getConflictThread(data.threadId);
      
      if (!thread) {
        console.error('Conflict thread not found');
        return;
      }
      
      const partnership = await storage.getPartnershipByUser(senderId);
      
      if (!partnership) {
        console.error('Partnership not found');
        return;
      }
      
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
      
      // Send push notification
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
      // Find recipient's WebSocket if connected
      const partnership = await storage.getPartnershipByUser(senderId);
      
      if (!partnership) {
        console.error('Partnership not found');
        return;
      }
      
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
      
      // Send push notification
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
  async function sendNotification(userId: number, notificationData: {
    title: string;
    body: string;
    url: string;
    type: 'newConflicts' | 'partnerEmotions' | 'directMessages' | 'conflictUpdates' | 'weeklyCheckIns' | 'appreciations';
  }) {
    try {
      // Get user's notification preferences
      const preferences = await storage.getNotificationPreferences(userId);
      
      // Check if user has enabled this type of notification
      if (!preferences || !preferences[notificationData.type]) {
        return;
      }
      
      // Get user's push subscriptions
      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      
      if (!subscriptions || subscriptions.length === 0) {
        return;
      }
      
      // In a real app, you would use web-push to send the notification
      // For this prototype, we'll just log that we would send a notification
      console.log(`Sending push notification to user ${userId}:`, notificationData);
      console.log(`Notification would be sent to ${subscriptions.length} devices`);
      
      // In a real implementation with web-push:
      // for (const subscription of subscriptions) {
      //   try {
      //     await webpush.sendNotification({
      //       endpoint: subscription.endpoint,
      //       keys: {
      //         p256dh: subscription.p256dhKey,
      //         auth: subscription.authKey
      //       }
      //     }, JSON.stringify(notificationData));
      //   } catch (err) {
      //     console.error(`Error sending notification to subscription ${subscription.id}:`, err);
      //     // If subscription is no longer valid, remove it
      //     if (err.statusCode === 410) {
      //       await storage.deletePushSubscriptionByEndpoint(subscription.endpoint);
      //     }
      //   }
      // }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // API endpoint for analyzing love language
  app.get("/api/user/love-language-analysis", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get user preferences
      const preferences = await storage.getUserPreferences(userId);
      if (!preferences || !preferences.loveLanguage) {
        return res.status(404).json({ 
          message: "No love language preferences found for this user" 
        });
      }

      // Get user data for additional context
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create questionnaire data from preferences and user data
      const questionnaire = {
        conflictStyle: preferences.conflictStyle,
        communicationStyle: preferences.communicationStyle,
        repairStyle: preferences.repairStyle,
        relationshipGoals: user.relationshipGoals || undefined,
        challengeAreas: user.challengeAreas || undefined
      };
      
      // Call OpenAI to analyze love language
      const analysis = await analyzeLoveLanguage(preferences.loveLanguage, questionnaire);
      
      res.json(analysis);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error analyzing love language:", err);
      res.status(500).json({ message: "Failed to analyze love language" });
    }
  });

  return httpServer;
}