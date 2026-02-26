import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { storage } from "../storage";
import { type User, type TherapySession } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";

export function register(app: Express, ctx: RouteContext) {
  const { clients, sendNotification } = ctx;

  // Create a new therapy session
  app.post('/api/therapy-sessions', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      // Get the partnership for the current user
      const partnership = await storage.getPartnershipByUser(req.user!.id);
      if (!partnership) {
        return res.status(400).json({ error: "No active partnership found" });
      }

      // Get data for last two weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Get journal entries for analysis
      // 1. User's entries (both private and shared)
      const userEntries = await storage.getUserJournalEntries(req.user!.id);
      const recentUserPrivateEntries = userEntries
        .filter(entry => new Date(entry.createdAt) >= twoWeeksAgo && entry.isPrivate)
        .map(entry => ({
          title: entry.title,
          content: entry.content,
          emotions: entry.emotions || undefined,
          date: new Date(entry.createdAt)
        }));

      // 2. User's shared entries
      const userSharedEntries = userEntries
        .filter(entry => new Date(entry.createdAt) >= twoWeeksAgo && entry.isShared)
        .map(entry => ({
          title: entry.title,
          content: entry.content,
          emotions: entry.emotions || undefined,
          date: new Date(entry.createdAt)
        }));

      // 3. Partner's shared entries
      const partnerId = partnership.user1Id === req.user!.id ? partnership.user2Id : partnership.user1Id;
      const partnerEntries = await storage.getSharedJournalEntries(partnerId, req.user!.id);
      const partnerSharedEntries = partnerEntries
        .filter(entry => new Date(entry.createdAt) >= twoWeeksAgo)
        .map(entry => ({
          title: entry.title,
          content: entry.content,
          emotions: entry.emotions || undefined,
          date: new Date(entry.createdAt)
        }));

      // Get all user entries (private and shared)
      const allUserEntries = [...recentUserPrivateEntries, ...userSharedEntries];

      // Get recent conflict threads
      const conflictThreads = await storage.getConflictThreadsByUserId(req.user!.id);
      const recentConflictThreads = conflictThreads
        .filter((thread: any) => new Date(thread.createdAt) >= twoWeeksAgo && thread.messages && thread.messages.length > 0)
        .map((thread: any) => {
          // Get messages for each conflict thread
          const messages = thread.messages.map((msg: any) => ({
            author: msg.userId === req.user!.id ? req.user!.firstName : 'Partner',
            content: msg.content,
            date: new Date(msg.timestamp)
          }));

          return {
            topic: thread.topic,
            messages: messages
          };
        });

      // Generate therapy session using OpenAI (dynamic import)
      const openaiService = await import('../openai');
      const therapySession = await openaiService.generateTherapySession(
        allUserEntries,
        partnerSharedEntries,
        recentConflictThreads
      );

      // Create a record of the therapy session
      const newSession = await storage.createTherapySession({
        partnershipId: partnership.id,
        createdAt: new Date(),
        transcript: therapySession.transcript,
        emotionalPatterns: therapySession.summary.emotionalPatterns,
        coreIssues: therapySession.summary.coreIssues,
        recommendations: therapySession.summary.recommendations,
        isReviewed: false
      });

      // Notify partner about the new therapy session
      const client = clients.get(partnerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'therapy_session',
          sessionId: newSession.id,
          createdBy: req.user!.firstName
        }));
      }

      res.status(201).json(newSession);
    } catch (error) {
      console.error("Error generating therapy session:", error);
      res.status(500).json({ error: "Failed to generate therapy session" });
    }
  });

  // Get list of therapy sessions for partnership
  app.get('/api/therapy-sessions', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      // Get the partnership for the current user
      const partnership = await storage.getPartnershipByUser(req.user!.id);
      if (!partnership) {
        return res.status(400).json({ error: "No active partnership found" });
      }

      // Get therapy sessions for the partnership
      const sessions = await storage.getTherapySessions(partnership.id);

      res.json(sessions);
    } catch (error) {
      console.error("Error getting therapy sessions:", error);
      res.status(500).json({ error: "Failed to retrieve therapy sessions" });
    }
  });

  // Get a specific therapy session (verify partnership access)
  app.get('/api/therapy-sessions/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getTherapySession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Therapy session not found" });
      }

      // Verify the user has access to this session
      const partnership = await storage.getPartnershipByUser(req.user!.id);
      if (!partnership || partnership.id !== session.partnershipId) {
        return res.status(403).json({ error: "You don't have permission to view this session" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error getting therapy session:", error);
      res.status(500).json({ error: "Failed to retrieve therapy session" });
    }
  });

  // Update a therapy session (userNotes, isReviewed/reviewedAt)
  app.put('/api/therapy-sessions/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getTherapySession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Therapy session not found" });
      }

      // Verify the user has access to this session
      const partnership = await storage.getPartnershipByUser(req.user!.id);
      if (!partnership || partnership.id !== session.partnershipId) {
        return res.status(403).json({ error: "You don't have permission to update this session" });
      }

      // Update the session with the provided fields
      const updates: Partial<TherapySession> = {};

      if (req.body.userNotes !== undefined) {
        updates.userNotes = req.body.userNotes;
      }

      if (req.body.isReviewed !== undefined) {
        updates.isReviewed = req.body.isReviewed;
        if (req.body.isReviewed) {
          updates.reviewedAt = new Date();
        }
      }

      const updatedSession = await storage.updateTherapySession(sessionId, updates);

      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating therapy session:", error);
      res.status(500).json({ error: "Failed to update therapy session" });
    }
  });
}
