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
import { transformEmotionalMessage, summarizeResponse, transformConflictMessage, transcribeAudio, generateAvatar } from "./openai";
import { hashPassword, setupAuth } from "./auth";
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
  conflictInitiationSchema,
  requestHelpSchema,
  therapistSpecialties,
  therapyModalities,
  avatarPromptSchema,
  updateAvatarSchema,
  type Therapist,
  type User
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

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Set up WebSocket connections
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('WebSocket client connected');
    
    // Handle WebSocket connections here...
  });

  return httpServer;
}