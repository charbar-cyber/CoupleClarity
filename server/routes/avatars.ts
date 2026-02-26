import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import { generateAvatar } from "../openai";
import { avatarPromptSchema, updateAvatarSchema, type User } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";

export function register(app: Express, ctx: RouteContext) {
  // ES module dirname equivalent
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

  // Configure multer for avatar image uploads
  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'avatar-' + uniqueSuffix + ext);
    }
  });

  // File filter for image uploads
  const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  // Upload avatar image
  app.post("/api/avatar/upload", isAuthenticated, avatarUpload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = (req.user as Express.User).id;

      // Get the file path relative to the server
      const filePath = req.file.path;
      const relativePath = path.relative(path.join(__dirname, '..', '..'), filePath);
      const avatarUrl = `/${relativePath.replace(/\\/g, '/')}`;

      // Update user's avatar URL in database
      const updatedUser = await storage.updateUserAvatar(userId, avatarUrl);

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

  // Generate avatar from prompt
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

  // Update avatar URL
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
}
