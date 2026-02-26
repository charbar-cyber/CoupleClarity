import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { storage } from "../storage";
import { type User } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";

export function register(app: Express, ctx: RouteContext) {
  const { clients, sendNotification } = ctx;

  // Get active check-in prompts
  app.get('/api/check-in/prompts', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const prompts = await storage.getActiveCheckInPrompts(3); // Get 3 random active prompts
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching check-in prompts:', error);
      res.status(500).json({ error: 'Failed to fetch check-in prompts' });
    }
  });

  // Get current week's check-in (supports userId query param with partnership auth)
  app.get('/api/check-in/latest', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;

      // Check if the user has permission to view this user's check-ins
      if (userId !== req.user.id) {
        const partnership = await storage.getPartnershipByUsers(req.user.id, userId);
        if (!partnership) {
          return res.status(403).json({ error: 'Not authorized to view this user\'s check-ins' });
        }
      }

      // Get the current week's Sunday date (start of the week)
      const now = new Date();
      const currentWeekStart = new Date(now);
      const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
      currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek); // Move to Sunday
      currentWeekStart.setHours(0, 0, 0, 0); // Start of day

      // Get user's responses for the current week
      const weekResponses = await storage.getUserCheckInResponses(userId, currentWeekStart);

      // Check if we have at least one response for this week
      const hasCompletedCheckIn = weekResponses.length > 0;

      res.json({
        needsNewCheckIn: !hasCompletedCheckIn,
        currentWeek: currentWeekStart,
        responses: hasCompletedCheckIn ? weekResponses : []
      });
    } catch (error) {
      console.error('Error checking weekly check-in status:', error);
      res.status(500).json({ error: 'Failed to check weekly check-in status' });
    }
  });

  // Submit weekly check-in responses
  app.post('/api/check-in/responses', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { responses, isShared } = req.body;

      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ error: 'At least one response is required' });
      }

      // Get the current week's Sunday date (start of the week)
      const now = new Date();
      const currentWeekStart = new Date(now);
      const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
      currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek); // Move to Sunday
      currentWeekStart.setHours(0, 0, 0, 0); // Start of day

      // Save each response
      const savedResponses = [];
      for (const responseData of responses) {
        // Verify the prompt exists
        const prompt = await storage.getCheckInPrompt(responseData.promptId);
        if (!prompt) {
          return res.status(400).json({ error: `Prompt with ID ${responseData.promptId} not found` });
        }

        if (!responseData.response || responseData.response.trim() === '') {
          return res.status(400).json({ error: 'Response text cannot be empty' });
        }

        const savedResponse = await storage.createCheckInResponse({
          userId: req.user.id,
          promptId: responseData.promptId,
          response: responseData.response,
          weekOf: currentWeekStart,
          isShared: isShared ?? false
        });

        savedResponses.push(savedResponse);
      }

      // If responses are shared with partner, send a notification
      if (isShared) {
        const partnership = await storage.getPartnershipByUser(req.user.id);
        if (partnership) {
          const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

          // Send WebSocket notification
          const client = clients.get(partnerId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'weekly_check_in_shared',
              data: {
                userId: req.user.id,
                userName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}` : req.user.username,
                timestamp: new Date()
              }
            }));
          }

          // Send push notification if enabled
          const partnerPrefs = await storage.getNotificationPreferences(partnerId);
          if (partnerPrefs && partnerPrefs.weeklyCheckIns) {
            await sendNotification(partnerId, {
              title: 'Weekly Check-In Shared',
              body: `${req.user.firstName || req.user.username} has shared their weekly check-in with you`,
              url: '/dashboard',
              type: 'weeklyCheckIns'
            });
          }
        }
      }

      res.status(201).json({
        message: 'Check-in responses saved successfully',
        responses: savedResponses
      });
    } catch (error) {
      console.error('Error saving check-in responses:', error);
      res.status(500).json({ error: 'Failed to save check-in responses' });
    }
  });
}
