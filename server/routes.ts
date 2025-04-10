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
import * as anthropic from "./anthropic";
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
  relationshipTypeOptions,
  privacyLevelOptions,
  milestoneTypeOptions,
  coupleProfileSchema,
  milestoneSchema,
  exerciseProgressSchema,
  exerciseTypeOptions,
  exerciseStatusOptions,
  insertExerciseSchema,
  insertExerciseStepSchema,
  insertExerciseResponseSchema,
  insertExerciseTemplateSchema,
  type Therapist,
  type User,
  type EnhancedOnboardingQuestionnaire,
  type Partnership,
  type Milestone,
  type CommunicationExercise,
  type ExerciseStep,
  type ExerciseResponse,
  type ExerciseTemplate,
  type ExerciseProgressInput
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
  
  // Current emotion endpoints
  app.get('/api/current-emotion', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const currentEmotion = await storage.getCurrentEmotion(req.user.id);
      if (!currentEmotion) {
        return res.status(404).json({ error: 'No current emotion set' });
      }
      
      res.json(currentEmotion);
    } catch (error) {
      console.error('Error fetching current emotion:', error);
      res.status(500).json({ error: 'Failed to fetch current emotion' });
    }
  });
  
  app.post('/api/current-emotion', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { emotion, intensity, note } = req.body;
      
      if (!emotion) {
        return res.status(400).json({ error: 'Emotion is required' });
      }
      
      const result = await storage.setCurrentEmotion({
        userId: req.user.id,
        emotion,
        intensity: intensity || 5,
        note
      });
      
      // Send notification to partner about emotion update
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (partnership && partnership.status === 'active') {
        const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
        
        // Send WebSocket notification if user is connected
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'emotion_update',
            userId: req.user.id,
            emotion: emotion,
            intensity: intensity || 5
          }));
          console.log(`Sent emotion update to user ${partnerId}`);
        } else {
          console.log(`User ${partnerId} is not connected to receive emotion update`);
        }
        
        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.partnerEmotions) {
          await sendNotification(partnerId, {
            title: 'Partner Emotion Update',
            body: `${req.user.firstName} is feeling ${emotion}`,
            url: '/dashboard',
            type: 'partnerEmotions'
          });
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error setting current emotion:', error);
      res.status(500).json({ error: 'Failed to set current emotion' });
    }
  });
  
  app.get('/api/partner/current-emotion', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const partnerEmotion = await storage.getPartnerCurrentEmotion(req.user.id);
      if (!partnerEmotion) {
        return res.status(404).json({ error: 'Partner has no current emotion set or no active partnership' });
      }
      
      res.json(partnerEmotion);
    } catch (error) {
      console.error('Error fetching partner current emotion:', error);
      res.status(500).json({ error: 'Failed to fetch partner current emotion' });
    }
  });
  // API Routes
  // AI model preference endpoint
  app.post("/api/user/ai-model-preference", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { preferredAiModel } = req.body;
      
      if (!preferredAiModel || !['openai', 'anthropic'].includes(preferredAiModel)) {
        return res.status(400).json({ message: "Invalid AI model specified. Use 'openai' or 'anthropic'." });
      }
      
      // Get user preferences or create if doesn't exist
      let userPrefs = await storage.getUserPreferences(userId);
      
      if (!userPrefs) {
        // Create default preferences with selected AI model
        userPrefs = await storage.createUserPreferences({
          userId,
          preferredAiModel,
          loveLanguage: 'not_sure', // Default value until user completes onboarding
          conflictStyle: 'not_sure',
          communicationStyle: 'gentle',
          repairStyle: 'talking'
        });
      } else {
        // Update existing preferences
        userPrefs = await storage.updateUserPreferences(userId, {
          preferredAiModel
        });
      }
      
      res.json({
        preferredAiModel: userPrefs.preferredAiModel,
        message: "AI model preference updated successfully"
      });
    } catch (error) {
      console.error("Error updating AI model preference:", error);
      res.status(500).json({ message: "Failed to update AI model preference" });
    }
  });
  
  app.get("/api/user/ai-model-preference", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      
      // Get user preferences
      const userPrefs = await storage.getUserPreferences(userId);
      
      if (!userPrefs) {
        // Default to OpenAI if no preferences exist
        return res.json({ preferredAiModel: 'openai' });
      }
      
      res.json({ preferredAiModel: userPrefs.preferredAiModel || 'openai' });
    } catch (error) {
      console.error("Error getting AI model preference:", error);
      res.status(500).json({ message: "Failed to get AI model preference" });
    }
  });

  // Original transform endpoint with AI model selection
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

  // Dedicated endpoint for changing username
  app.patch("/api/user/username", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { username } = req.body;
      
      // Validate username
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      
      // Get the current user data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if username is already taken
      if (username !== currentUser.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      // Update the username
      const updatedUser = await storage.updateUser(userId, { username });
      
      // Remove sensitive data before returning
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error changing username:", err);
      res.status(500).json({ message: "Failed to change username" });
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
  
  // This function is now directly implemented in the emotion update endpoint
  // Keeping this comment as a reminder for consistency
  
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
      
      // Always use OpenAI model for simplicity and reliability
      const analysis = await analyzeLoveLanguage(preferences.loveLanguage, questionnaire);
      
      res.json(analysis);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error analyzing love language:", err);
      res.status(500).json({ message: "Failed to analyze love language" });
    }
  });
  
  // Create test user for development purposes only
  app.get('/api/create-test-user', async (req, res) => {
    try {
      // Check if test user exists
      const existingUser = await storage.getUserByUsername('testuser');
      
      if (existingUser) {
        return res.json({ 
          message: 'Test user already exists',
          userId: existingUser.id
        });
      }
      
      // Create test user with password 'password123'
      const hashedPassword = await hashPassword('password123');
      
      const user = await storage.createUser({
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        displayName: 'Test User'
      });
      
      // Create user preferences
      await storage.createUserPreferences({
        userId: user.id,
        loveLanguage: 'words_of_affirmation',
        conflictStyle: 'talk_calmly',
        communicationStyle: 'direct',
        repairStyle: 'apology',
        preferredAiModel: 'openai'
      });
      
      res.json({ 
        message: 'Test user created successfully',
        userId: user.id
      });
    } catch (error) {
      console.error('Error creating test user:', error);
      res.status(500).json({ error: 'Failed to create test user' });
    }
  });
  
  // ====== Couple Profile and Settings API ======
  
  // Get couple profile
  app.get('/api/partnership/profile', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }
      
      // Get partner's information
      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
      const partner = await storage.getUser(partnerId);
      
      // Return the partnership and partner data
      res.json({
        partnership,
        partner: partner ? {
          id: partner.id,
          displayName: partner.displayName,
          firstName: partner.firstName,
          lastName: partner.lastName,
          avatarUrl: partner.avatarUrl
        } : null
      });
    } catch (error) {
      console.error('Error fetching couple profile:', error);
      res.status(500).json({ error: 'Failed to fetch couple profile' });
    }
  });
  
  // Update couple profile
  app.put('/api/partnership/profile', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const validatedData = coupleProfileSchema.parse(req.body);
      
      // Find the partnership
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }
      
      // Update the partnership
      const updatedPartnership = await storage.updatePartnershipProfile(partnership.id, {
        relationshipType: validatedData.relationshipType,
        privacyLevel: validatedData.privacyLevel,
        anniversaryDate: validatedData.anniversaryDate ? new Date(validatedData.anniversaryDate) : null,
        meetingStory: validatedData.meetingStory,
        relationshipGoals: validatedData.relationshipGoals,
        coupleNickname: validatedData.coupleNickname,
        sharedPicture: validatedData.sharedPicture
      });
      
      res.json(updatedPartnership);
    } catch (error) {
      console.error('Error updating couple profile:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update couple profile' });
    }
  });
  
  // ====== Relationship Milestones API ======
  
  // Get milestones
  app.get('/api/partnership/milestones', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }
      
      // Get milestones for this partnership
      const milestones = await storage.getMilestonesByPartnership(partnership.id);
      
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  });
  
  // Get milestones by type
  app.get('/api/partnership/milestones/:type', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { type } = req.params;
      
      // Validate milestone type
      if (!milestoneTypeOptions.includes(type as any)) {
        return res.status(400).json({ error: 'Invalid milestone type' });
      }
      
      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }
      
      // Get milestones for this partnership and type
      const milestones = await storage.getMilestonesByType(partnership.id, type);
      
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching milestones by type:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  });
  
  // Add milestone
  app.post('/api/partnership/milestones', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const validatedData = milestoneSchema.parse(req.body);
      
      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }
      
      // Create milestone
      const milestone = await storage.createMilestone({
        partnershipId: partnership.id,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        isPrivate: validatedData.isPrivate
      });
      
      // Create a memory for this milestone (if applicable)
      await storage.createMemory({
        userId: req.user.id,
        partnershipId: partnership.id,
        type: 'milestone',
        title: validatedData.title,
        description: validatedData.description || '',
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        associatedId: milestone.id,
        isSignificant: true
      });
      
      res.status(201).json(milestone);
    } catch (error) {
      console.error('Error creating milestone:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create milestone' });
    }
  });
  
  // Update milestone
  app.put('/api/partnership/milestones/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { id } = req.params;
      const milestoneId = parseInt(id);
      
      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: 'Invalid milestone ID' });
      }
      
      const validatedData = milestoneSchema.parse(req.body);
      
      // Find the milestone
      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }
      
      // Verify user is part of the partnership
      const partnership = await storage.getPartnership(milestone.partnershipId);
      if (!partnership || (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to update this milestone' });
      }
      
      // Update milestone
      const updatedMilestone = await storage.updateMilestone(milestoneId, {
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        isPrivate: validatedData.isPrivate
      });
      
      res.json(updatedMilestone);
    } catch (error) {
      console.error('Error updating milestone:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  });
  
  // Delete milestone
  app.delete('/api/partnership/milestones/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { id } = req.params;
      const milestoneId = parseInt(id);
      
      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: 'Invalid milestone ID' });
      }
      
      // Find the milestone
      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }
      
      // Verify user is part of the partnership
      const partnership = await storage.getPartnership(milestone.partnershipId);
      if (!partnership || (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to delete this milestone' });
      }
      
      // Delete milestone
      await storage.deleteMilestone(milestoneId);
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      res.status(500).json({ error: 'Failed to delete milestone' });
    }
  });
  
  // Communication Exercise API Endpoints
  
  // Get exercise templates
  app.get('/api/exercises/templates', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { type, difficulty } = req.query;
      
      const templates = await storage.getExerciseTemplates(
        type as string | undefined, 
        difficulty as string | undefined
      );
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching exercise templates:', error);
      res.status(500).json({ error: 'Failed to fetch exercise templates' });
    }
  });
  
  // Get a specific exercise template
  app.get('/api/exercises/templates/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }
      
      const template = await storage.getExerciseTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Exercise template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching exercise template:', error);
      res.status(500).json({ error: 'Failed to fetch exercise template' });
    }
  });
  
  // Create a new exercise from template
  app.post('/api/exercises', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const validatedData = insertExerciseSchema.parse(req.body);
      
      // Get the user's active partnership
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No active partnership found' });
      }
      
      // Create the exercise
      const exercise = await storage.createExercise({
        ...validatedData,
        initiatorId: req.user.id,
        partnershipId: partnership.id,
        partnerId: partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id,
        currentUserId: req.user.id,
        status: 'in_progress'
      });
      
      // Check if template steps were provided
      if (validatedData.templateId) {
        // Get template
        const template = await storage.getExerciseTemplate(validatedData.templateId);
        if (template && template.steps) {
          // Create steps from template
          const stepsData = JSON.parse(template.steps);
          if (Array.isArray(stepsData)) {
            for (let i = 0; i < stepsData.length; i++) {
              const stepData = stepsData[i];
              await storage.createExerciseStep({
                exerciseId: exercise.id,
                stepNumber: i + 1,
                title: stepData.title,
                promptText: stepData.promptText,
                instructions: stepData.instructions,
                expectedResponseType: stepData.expectedResponseType || 'text',
                options: stepData.options || null,
                requiredForCompletion: stepData.requiredForCompletion || true,
                userRole: stepData.userRole || 'both'
              });
            }
          }
        }
      }
      
      // Send notification to partner about new exercise
      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
      
      // Send WebSocket notification if user is connected
      const client = clients.get(partnerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_exercise',
          exerciseId: exercise.id,
          initiatorId: req.user.id,
          exerciseName: validatedData.title
        }));
      }
      
      // Send push notification if enabled
      const partnerPrefs = await storage.getNotificationPreferences(partnerId);
      if (partnerPrefs && partnerPrefs.exerciseNotifications) {
        await sendNotification(partnerId, {
          title: 'New Communication Exercise',
          body: `${req.user.firstName} has started a new communication exercise: ${validatedData.title}`,
          url: `/exercises/${exercise.id}`,
          type: 'exerciseNotifications'
        });
      }
      
      res.status(201).json(exercise);
    } catch (error) {
      console.error('Error creating exercise:', error);
      res.status(500).json({ error: 'Failed to create exercise' });
    }
  });
  
  // Get all exercises for the user
  app.get('/api/exercises', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { status } = req.query;
      
      const exercises = await storage.getExercisesForUser(
        req.user.id,
        status as string | undefined
      );
      
      res.json(exercises);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises' });
    }
  });
  
  // Get a specific exercise
  app.get('/api/exercises/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      res.json(exercise);
    } catch (error) {
      console.error('Error fetching exercise:', error);
      res.status(500).json({ error: 'Failed to fetch exercise' });
    }
  });
  
  // Update exercise status
  app.patch('/api/exercises/:id/status', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const { status } = req.body;
      if (!status || !exerciseStatusOptions.includes(status as any)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      const updatedExercise = await storage.updateExerciseStatus(exerciseId, status);
      
      // If exercise is being completed, notify partner
      if (status === 'completed') {
        const partnerId = exercise.initiatorId === req.user.id ? exercise.partnerId : exercise.initiatorId;
        
        // Send WebSocket notification if user is connected
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_completed',
            exerciseId: exercise.id,
            completedBy: req.user.id,
            exerciseName: exercise.title
          }));
        }
        
        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.exerciseNotifications) {
          await sendNotification(partnerId, {
            title: 'Exercise Completed',
            body: `${req.user.firstName} has completed the "${exercise.title}" exercise`,
            url: `/exercises/${exercise.id}/summary`,
            type: 'exerciseNotifications'
          });
        }
      }
      
      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise status:', error);
      res.status(500).json({ error: 'Failed to update exercise status' });
    }
  });
  
  // Update current step
  app.patch('/api/exercises/:id/step', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const { stepNumber } = req.body;
      if (stepNumber === undefined || isNaN(stepNumber) || stepNumber < 1) {
        return res.status(400).json({ error: 'Invalid step number' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      // Check if the step exists
      const step = await storage.getExerciseStepByNumber(exerciseId, stepNumber);
      if (!step) {
        return res.status(404).json({ error: 'Step not found' });
      }
      
      const updatedExercise = await storage.updateExerciseCurrentStep(exerciseId, stepNumber);
      
      // Also transfer control to the appropriate user based on step requirements
      if (step.userRole === 'initiator') {
        await storage.updateExerciseCurrentUser(exerciseId, exercise.initiatorId);
        updatedExercise.currentUserId = exercise.initiatorId;
      } else if (step.userRole === 'partner') {
        await storage.updateExerciseCurrentUser(exerciseId, exercise.partnerId);
        updatedExercise.currentUserId = exercise.partnerId;
      }
      
      // Send notification to the user who now has control if not the current user
      if (updatedExercise.currentUserId !== req.user.id) {
        // Send WebSocket notification if user is connected
        const client = clients.get(updatedExercise.currentUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_step_update',
            exerciseId: exercise.id,
            updatedBy: req.user.id,
            stepNumber: stepNumber,
            exerciseName: exercise.title
          }));
        }
        
        // Send push notification if enabled
        const userPrefs = await storage.getNotificationPreferences(updatedExercise.currentUserId);
        if (userPrefs && userPrefs.exerciseNotifications) {
          await sendNotification(updatedExercise.currentUserId, {
            title: 'Exercise Step Update',
            body: `It's your turn to complete step ${stepNumber} in "${exercise.title}"`,
            url: `/exercises/${exercise.id}`,
            type: 'exerciseNotifications'
          });
        }
      }
      
      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise step:', error);
      res.status(500).json({ error: 'Failed to update exercise step' });
    }
  });
  
  // Get steps for an exercise
  app.get('/api/exercises/:id/steps', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      const steps = await storage.getExerciseSteps(exerciseId);
      
      res.json(steps);
    } catch (error) {
      console.error('Error fetching exercise steps:', error);
      res.status(500).json({ error: 'Failed to fetch exercise steps' });
    }
  });
  
  // Submit a response to an exercise step
  app.post('/api/exercises/:id/responses', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const { stepId, responseText, responseOption, audioUrl } = req.body;
      if (!stepId || isNaN(parseInt(stepId))) {
        return res.status(400).json({ error: 'Invalid step ID' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      // Check if it's the user's turn
      if (exercise.currentUserId !== req.user.id) {
        return res.status(403).json({ error: 'It is not your turn to respond' });
      }
      
      // Check if the step exists and belongs to this exercise
      const step = await storage.getExerciseStepById(parseInt(stepId));
      if (!step || step.exerciseId !== exerciseId) {
        return res.status(404).json({ error: 'Step not found' });
      }
      
      // Check if user already responded to this step
      const existingResponse = await storage.getUserResponseForStep(parseInt(stepId), req.user.id);
      if (existingResponse) {
        return res.status(400).json({ error: 'You have already responded to this step' });
      }
      
      // Create the response
      const response = await storage.createExerciseResponse({
        userId: req.user.id,
        exerciseId: exerciseId,
        stepId: parseInt(stepId),
        responseText: responseText || null,
        responseOption: responseOption || null,
        audioUrl: audioUrl || null
      });
      
      // Determine whose turn it is next and update the exercise
      const partnerId = exercise.initiatorId === req.user.id ? exercise.partnerId : exercise.initiatorId;
      
      // Auto advance to next step if this is the last user for this step
      const allResponses = await storage.getExerciseStepResponses(parseInt(stepId));
      const bothUsersResponded = allResponses.some(r => r.userId === exercise.initiatorId) && 
                               allResponses.some(r => r.userId === exercise.partnerId);
                               
      if (bothUsersResponded || step.userRole === 'initiator' || step.userRole === 'partner') {
        // Move to next step
        const nextStepNumber = exercise.currentStepNumber + 1;
        const nextStep = await storage.getExerciseStepByNumber(exerciseId, nextStepNumber);
        
        if (nextStep) {
          // Advance to next step
          await storage.updateExerciseCurrentStep(exerciseId, nextStepNumber);
          
          // Determine who should go next
          if (nextStep.userRole === 'initiator') {
            await storage.updateExerciseCurrentUser(exerciseId, exercise.initiatorId);
          } else if (nextStep.userRole === 'partner') {
            await storage.updateExerciseCurrentUser(exerciseId, exercise.partnerId);
          } else {
            // Default to partner for 'both' since current user just responded
            await storage.updateExerciseCurrentUser(exerciseId, partnerId);
          }
          
          // Notify the next user
          const nextUserId = nextStep.userRole === 'initiator' ? exercise.initiatorId : 
                           (nextStep.userRole === 'partner' ? exercise.partnerId : partnerId);
          
          if (nextUserId !== req.user.id) {
            // Send WebSocket notification if user is connected
            const client = clients.get(nextUserId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'exercise_your_turn',
                exerciseId: exerciseId,
                stepNumber: nextStepNumber,
                exerciseName: exercise.title
              }));
            }
            
            // Send push notification if enabled
            const userPrefs = await storage.getNotificationPreferences(nextUserId);
            if (userPrefs && userPrefs.exerciseNotifications) {
              await sendNotification(nextUserId, {
                title: 'Your Turn in Exercise',
                body: `It's your turn to respond in the "${exercise.title}" exercise`,
                url: `/exercises/${exerciseId}`,
                type: 'exerciseNotifications'
              });
            }
          }
        } else {
          // No more steps, complete the exercise
          await storage.updateExerciseStatus(exerciseId, 'completed');
          
          // Notify the partner that the exercise is complete
          const client = clients.get(partnerId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'exercise_completed',
              exerciseId: exerciseId,
              exerciseName: exercise.title
            }));
          }
          
          // Send push notification if enabled
          const partnerPrefs = await storage.getNotificationPreferences(partnerId);
          if (partnerPrefs && partnerPrefs.exerciseNotifications) {
            await sendNotification(partnerId, {
              title: 'Exercise Completed',
              body: `The "${exercise.title}" exercise has been completed`,
              url: `/exercises/${exerciseId}/summary`,
              type: 'exerciseNotifications'
            });
          }
        }
      } else {
        // Just switch user for same step
        await storage.updateExerciseCurrentUser(exerciseId, partnerId);
        
        // Send notification to partner that it's their turn
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_your_turn',
            exerciseId: exerciseId,
            stepNumber: exercise.currentStepNumber,
            exerciseName: exercise.title
          }));
        }
        
        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.exerciseNotifications) {
          await sendNotification(partnerId, {
            title: 'Your Turn in Exercise',
            body: `It's your turn to respond in the "${exercise.title}" exercise`,
            url: `/exercises/${exerciseId}`,
            type: 'exerciseNotifications'
          });
        }
      }
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error submitting exercise response:', error);
      res.status(500).json({ error: 'Failed to submit exercise response' });
    }
  });
  
  // Get responses for an exercise
  app.get('/api/exercises/:id/responses', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      // Get responses for the exercise
      const responses = await storage.getExerciseResponses(exerciseId);
      
      res.json(responses);
    } catch (error) {
      console.error('Error fetching exercise responses:', error);
      res.status(500).json({ error: 'Failed to fetch exercise responses' });
    }
  });
  
  // Update exercise progress (for tracking where each user is in the exercise)
  app.post('/api/exercises/:id/progress', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }
      
      const validatedData = exerciseProgressSchema.parse(req.body);
      
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      
      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }
      
      // Update the appropriate progress field based on user role
      let updatedExercise;
      if (exercise.initiatorId === req.user.id) {
        updatedExercise = await storage.updateExerciseStatus(exerciseId, exercise.status);
      } else {
        updatedExercise = await storage.updateExerciseStatus(exerciseId, exercise.status);
      }
      
      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise progress:', error);
      res.status(500).json({ error: 'Failed to update exercise progress' });
    }
  });
  
  // Create exercise template (admin only)
  app.post('/api/exercises/templates', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // TODO: Add proper admin check
      // For now, use the test user as admin (ID 3)
      if (req.user.id !== 3) {
        return res.status(403).json({ error: 'Administrator access required' });
      }
      
      const { title, type, description, difficultyLevel, estimatedTimeMinutes, steps } = req.body;
      
      if (!title || !type || !steps) {
        return res.status(400).json({ error: 'Title, type and steps are required' });
      }
      
      if (!exerciseTypeOptions.includes(type as any)) {
        return res.status(400).json({ error: 'Invalid exercise type' });
      }
      
      // Create the template
      const stepsArray = Array.isArray(steps) ? steps : [];
      const totalSteps = stepsArray.length;
      
      const template = await storage.createExerciseTemplate({
        title,
        type: type as any,
        description: description || '',
        difficultyLevel: difficultyLevel || 'beginner',
        estimatedTimeMinutes: estimatedTimeMinutes || 15,
        totalSteps,
        steps: JSON.stringify(stepsArray),
        templateData: JSON.stringify({})
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating exercise template:', error);
      res.status(500).json({ error: 'Failed to create exercise template' });
    }
  });

  return httpServer;
}