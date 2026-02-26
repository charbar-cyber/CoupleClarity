import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { storage } from "../storage";
import { journalEntrySchema, type User } from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";
import { analyzeJournalEntry, generateJournalResponse } from "../openai";

export function register(app: Express, ctx: RouteContext) {
  const { clients, sendNotification } = ctx;

  // Get recent journal entries (past week, limit 5)
  app.get('/api/journal/recent', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get the user's journal entries
      const allEntries = await storage.getUserJournalEntries(req.user.id);

      // Filter entries from the past week and limit to 5
      const entries = allEntries
        .filter(entry => new Date(entry.createdAt) >= oneWeekAgo)
        .slice(0, 5);

      res.json({
        count: entries.length,
        entries: entries.map(entry => ({
          id: entry.id,
          title: entry.title,
          date: entry.createdAt
        }))
      });
    } catch (error) {
      console.error("Error fetching recent journal entries:", error);
      res.status(500).json({ error: "Failed to fetch recent journal entries" });
    }
  });

  // Get partner's shared entries without response
  app.get('/api/journal/partner-activity', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get partnership info
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: "Partnership not found" });
      }

      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

      // Get shared entries from partner that user hasn't responded to
      const sharedEntries = await storage.getSharedJournalEntries(partnerId, req.user.id);

      // Count unread entries (those without a response)
      const unreadEntries = sharedEntries.filter((entry) => !entry.hasPartnerResponse);

      res.json({
        unreadCount: unreadEntries.length,
        latestEntry: unreadEntries.length > 0 ? {
          id: unreadEntries[0].id,
          title: unreadEntries[0].title,
          date: unreadEntries[0].createdAt
        } : null
      });
    } catch (error) {
      console.error("Error fetching partner journal activity:", error);
      res.status(500).json({ error: "Failed to fetch partner journal activity" });
    }
  });

  // List journal entries (filter by isPrivate, limit)
  app.get('/api/journal', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const isPrivateStr = req.query.isPrivate as string | undefined;
      let isPrivate: boolean | undefined = undefined;

      if (isPrivateStr) {
        isPrivate = isPrivateStr === 'true';
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const entries = await storage.getUserJournalEntries(req.user.id, isPrivate, limit);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // Get shared entries from partner
  app.get('/api/journal/shared', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get the partnership to find partner ID
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership || partnership.status !== 'active') {
        return res.status(404).json({ error: 'No active partnership found' });
      }

      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const entries = await storage.getSharedJournalEntries(req.user.id, partnerId, limit);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching shared journal entries:', error);
      res.status(500).json({ error: 'Failed to fetch shared journal entries' });
    }
  });

  // Get a specific journal entry (check ownership or shared partner access)
  app.get('/api/journal/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid journal entry ID' });
      }

      const entry = await storage.getJournalEntry(id);

      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Check if the user has access to this entry
      if (entry.userId !== req.user.id) {
        // If it's not the user's entry, check if it's a shared entry from their partner
        const partnership = await storage.getPartnershipByUser(req.user.id);
        if (!partnership || partnership.status !== 'active') {
          return res.status(403).json({ error: 'You do not have permission to access this journal entry' });
        }

        const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

        if (entry.userId !== partnerId || !entry.isShared) {
          return res.status(403).json({ error: 'You do not have permission to access this journal entry' });
        }
      }

      res.json(entry);
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });

  // Mark a journal entry as resolved (notify partner)
  app.post('/api/journal/:id/mark-resolved', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid journal entry ID' });
      }

      const entry = await storage.getJournalEntry(id);

      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Check that it's the user's entry
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to modify this journal entry' });
      }

      // Update the entry to mark it as resolved
      const updatedEntry = await storage.updateJournalEntry(id, {
        ...entry,
        hasPartnerResponse: true
      });

      // Get partnership to notify partner
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (partnership && partnership.status === 'active') {
        const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

        // Send notification to partner about the journal entry being resolved
        await sendNotification(
          partnerId,
          {
            title: "Journal Entry Updated",
            body: `${req.user.displayName || req.user.username} has marked a journal entry as resolved`,
            url: `/journal?entry=${id}`,
            type: 'weeklyCheckIns'
          }
        );
      }

      res.json(updatedEntry);
    } catch (error) {
      console.error('Error marking journal entry as resolved:', error);
      res.status(500).json({ error: 'Failed to mark journal entry as resolved' });
    }
  });

  // Create a new journal entry (validated with journalEntrySchema, notify partner if shared)
  app.post('/api/journal', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Validate request data
      const journalData = journalEntrySchema.parse(req.body);

      // Check if this should be shared with partner
      let partnerId = null;
      if (journalData.isShared) {
        const partnership = await storage.getPartnershipByUser(req.user.id);
        if (partnership && partnership.status === 'active') {
          partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
        }
      }

      // Create journal entry
      const entry = await storage.createJournalEntry({
        userId: req.user.id,
        title: journalData.title,
        content: journalData.content,
        rawContent: journalData.rawContent || journalData.content,
        isPrivate: journalData.isPrivate !== undefined ? journalData.isPrivate : true,
        isShared: journalData.isShared !== undefined ? journalData.isShared : false,
        partnerId: partnerId,
        aiSummary: journalData.aiSummary || null,
        aiRefinedContent: journalData.aiRefinedContent || null,
        emotions: journalData.emotions || null
      });

      // If this is shared, notify the partner
      if (journalData.isShared && partnerId) {
        // Send WebSocket notification if partner is connected
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'journal_entry',
            userId: req.user.id,
            entryId: entry.id,
            title: entry.title
          }));
        }

        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.weeklyCheckIns) {
          await sendNotification(partnerId, {
            title: 'New Journal Entry',
            body: `${req.user.firstName} shared a journal entry with you: ${entry.title}`,
            url: `/journal/${entry.id}`,
            type: 'weeklyCheckIns'
          });
        }
      }

      res.status(201).json(entry);
    } catch (error) {
      console.error('Error creating journal entry:', error);
      if ((error as any).name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid journal entry data', details: (error as any).errors });
      }
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // Update a journal entry (notify if newly shared)
  app.put('/api/journal/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid journal entry ID' });
      }

      // Get the existing entry
      const existingEntry = await storage.getJournalEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Verify ownership
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this journal entry' });
      }

      // Validate update data
      const journalData = journalEntrySchema.parse(req.body);

      // Check if sharing status changed and partner info is needed
      let partnerId = existingEntry.partnerId;
      if (!existingEntry.isShared && journalData.isShared) {
        const partnership = await storage.getPartnershipByUser(req.user.id);
        if (partnership && partnership.status === 'active') {
          partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
        }
      }

      // Update the entry
      const updatedEntry = await storage.updateJournalEntry(id, {
        title: journalData.title,
        content: journalData.content,
        rawContent: journalData.rawContent || journalData.content,
        isPrivate: journalData.isPrivate,
        isShared: journalData.isShared,
        partnerId: partnerId,
        aiSummary: journalData.aiSummary,
        aiRefinedContent: journalData.aiRefinedContent,
        emotions: journalData.emotions
      });

      // Notify partner if entry was newly shared
      if (!existingEntry.isShared && updatedEntry.isShared && partnerId) {
        // Send WebSocket notification if partner is connected
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'journal_entry_update',
            userId: req.user.id,
            entryId: updatedEntry.id,
            title: updatedEntry.title
          }));
        }

        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.weeklyCheckIns) {
          await sendNotification(partnerId, {
            title: 'Journal Entry Shared',
            body: `${req.user.firstName} shared a journal entry with you: ${updatedEntry.title}`,
            url: `/journal/${updatedEntry.id}`,
            type: 'weeklyCheckIns'
          });
        }
      }

      res.json(updatedEntry);
    } catch (error) {
      console.error('Error updating journal entry:', error);
      if ((error as any).name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid journal entry data', details: (error as any).errors });
      }
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  // AI analysis of journal entry
  app.post('/api/journal/analyze', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { journalEntry, title, entryId } = req.body;

      if (!journalEntry || !title) {
        return res.status(400).json({ error: 'Journal entry text and title are required' });
      }

      // Define the type for previous entries
      interface PreviousEntry {
        title: string;
        content: string;
        date: string;
      }

      // Get previous entries for context (last 3)
      let previousEntries: PreviousEntry[] = [];
      if (entryId) {
        const userId = req.user.id;
        const entries = await storage.getUserJournalEntries(userId, undefined, 5); // Get last 5 entries

        // Filter out current entry and format for the AI
        previousEntries = entries
          .filter((entry) => entry.id !== parseInt(entryId))
          .slice(0, 3) // Take just the last 3 for context
          .map((entry) => ({
            title: entry.title,
            content: entry.content,
            date: entry.createdAt.toISOString()
          }));
      }

      // Call OpenAI for analysis
      const analysisResult = await analyzeJournalEntry(
        journalEntry,
        title,
        req.user.id,
        previousEntries
      );

      res.json(analysisResult);
    } catch (error) {
      console.error('Error analyzing journal entry:', error);
      res.status(500).json({ error: 'Failed to analyze journal entry' });
    }
  });

  // Generate AI-assisted response to a journal entry
  app.post('/api/journal/generate-response', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { journalEntryId, journalContent, prompt } = req.body;

      if (!journalContent) {
        return res.status(400).json({ error: 'Journal content is required' });
      }

      if (!prompt) {
        return res.status(400).json({ error: 'Response prompt type is required' });
      }

      // Call OpenAI to generate a response
      const generatedResponse = await generateJournalResponse(journalContent, prompt);

      res.json(generatedResponse);
    } catch (error) {
      console.error('Error generating journal response:', error);
      res.status(500).json({ error: 'Failed to generate response' });
    }
  });

  // Partner responds to shared journal entry
  app.post('/api/journal/:id/respond', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const entryId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Response content is required' });
      }

      // Get the journal entry
      const journalEntry = await storage.getJournalEntry(entryId);

      if (!journalEntry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Verify the user has access to this entry
      const partnership = await storage.getPartnershipByUser(req.user.id);

      if (!partnership) {
        return res.status(400).json({ error: 'You are not in a partnership' });
      }

      // Check if the user is the partner (not the creator) of this entry
      if (journalEntry.userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot respond to your own journal entry' });
      }

      // Check if this is a shared entry
      if (!journalEntry.isShared) {
        return res.status(400).json({ error: 'This journal entry is not shared with you' });
      }

      // Create the response
      const response = await storage.createJournalResponse({
        journalEntryId: entryId,
        userId: req.user.id,
        content
      });

      // Send a notification to the journal entry creator
      try {
        // Send a WebSocket notification
        const eventData = {
          type: "journal_response",
          journalEntryId: entryId,
          journalTitle: journalEntry.title,
          responderId: req.user.id,
          responderName: req.user.username
        };

        // Notify the journal creator
        await sendNotification(journalEntry.userId, {
          title: 'New Journal Response',
          body: `${req.user.username} responded to your journal entry: ${journalEntry.title}`,
          url: `/journal/${entryId}`,
          type: "appreciations"
        });
      } catch (error) {
        console.error("Error sending notification:", error);
        // Continue even if notification fails
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating journal response:', error);
      res.status(500).json({ error: 'Failed to submit response' });
    }
  });

  // Delete a journal entry (notify partner if was shared)
  app.delete('/api/journal/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid journal entry ID' });
      }

      // Get the existing entry
      const existingEntry = await storage.getJournalEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Verify ownership
      if (existingEntry.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this journal entry' });
      }

      // Delete the entry
      await storage.deleteJournalEntry(id);

      // If it was shared, notify the partner
      if (existingEntry.isShared && existingEntry.partnerId) {
        // Send WebSocket notification if partner is connected
        const client = clients.get(existingEntry.partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'journal_entry_deleted',
            userId: req.user.id,
            entryId: id
          }));
        }
      }

      res.json({ success: true, message: 'Journal entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      res.status(500).json({ error: 'Failed to delete journal entry' });
    }
  });
}
