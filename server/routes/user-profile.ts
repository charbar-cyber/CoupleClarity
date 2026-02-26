import { type Express, type Request, type Response } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { analyzeLoveLanguage } from "../openai";
import { isAuthenticated, type RouteContext } from "./types";
import {
  type User,
  onboardingQuestionnaireSchema,
  enhancedOnboardingSchema,
} from "@shared/schema";

export function registerUserProfileRoutes(app: Express, ctx: RouteContext) {
  // POST /api/user/ai-model-preference - set preferred AI model
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
          loveLanguage: 'not_sure',
          conflictStyle: 'not_sure',
          communicationStyle: 'gentle',
          repairStyle: 'talking',
        });
      } else {
        // Update existing preferences
        userPrefs = await storage.updateUserPreferences(userId, {
          preferredAiModel,
        });
      }

      res.json({
        preferredAiModel: userPrefs.preferredAiModel,
        message: "AI model preference updated successfully",
      });
    } catch (error) {
      console.error("Error updating AI model preference:", error);
      res.status(500).json({ message: "Failed to update AI model preference" });
    }
  });

  // GET /api/user/ai-model-preference - get preferred AI model
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

  // GET /api/user/partner - get partner info
  app.get("/api/user/partner", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;

      // Get all partnerships for user
      const partnerships = await storage.getPartnershipsForUser(userId);

      // If user has no partnerships, return null
      if (partnerships.length === 0) {
        return res.json(null);
      }

      // Get the first active partnership
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
        startDate: activePartnership.startDate || activePartnership.createdAt,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error getting partner info:", err);
      res.status(500).json({ message: "Failed to get partner information" });
    }
  });

  // GET /api/relationship - get relationship status
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
          partnershipId: null,
        });
      }

      // Get the first active partnership
      const activePartnership = partnerships.find(p => p.status === "active") || partnerships[0];

      res.json({
        hasPartner: true,
        startDate: activePartnership.startDate || activePartnership.createdAt,
        status: activePartnership.status,
        partnershipId: activePartnership.id,
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error getting relationship info:", err);
      res.status(500).json({ message: "Failed to get relationship information" });
    }
  });

  // PATCH /api/user/profile - update profile fields
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

  // PATCH /api/user/username - dedicated username change
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

  // POST /api/user/change-password - change password
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
      const authModule = await import("../auth");

      // Verify the current password
      const isPasswordValid = await authModule.comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await storage.updateUserPassword(userId, hashedPassword);

      // Return success without any sensitive data
      res.json({ message: "Password updated successfully" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error changing password:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // POST /api/user/preferences - save onboarding preferences
  app.post("/api/user/preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;

      // Parse and validate the data
      const validatedData = onboardingQuestionnaireSchema.parse(req.body);

      // Save the user preferences
      const preferences = await storage.createUserPreferences({
        userId,
        ...validatedData,
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

  // POST /api/user/enhanced-onboarding - enhanced onboarding
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
        onboardingCompleted: true,
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
          repairStyle: validatedData.repairStyle,
        });
      } else {
        // Create new preferences if they don't exist
        preferences = await storage.createUserPreferences({
          userId,
          loveLanguage: validatedData.loveLanguage,
          conflictStyle: validatedData.conflictStyle,
          communicationStyle: validatedData.communicationStyle,
          repairStyle: validatedData.repairStyle,
        });
      }

      res.json({
        user: {
          ...updatedUser,
          password: undefined, // Don't send password back
        },
        preferences,
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

  // GET /api/user/love-language-analysis - analyze love language using OpenAI
  app.get("/api/user/love-language-analysis", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;

      // Get user preferences
      const preferences = await storage.getUserPreferences(userId);
      if (!preferences || !preferences.loveLanguage) {
        return res.status(404).json({
          message: "No love language preferences found for this user",
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
        challengeAreas: user.challengeAreas || undefined,
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
}
