import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { storage } from "../storage";
import { analyzeEmotionPatterns } from "../openai";
import { isAuthenticated, type RouteContext } from "./types";
import { type User } from "@shared/schema";

export function registerEmotionRoutes(app: Express, ctx: RouteContext) {
  // GET /api/current-emotion - get user's current emotion
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

  // POST /api/current-emotion - set current emotion (sends WS + push to partner)
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
        const client = ctx.clients.get(partnerId);
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
          await ctx.sendNotification(partnerId, {
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

  // GET /api/partner/current-emotion - get partner's current emotion
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

  // GET /api/emotions/trends - emotion trend analysis from journal entries
  app.get('/api/emotions/trends', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get user's recent journal entries to analyze emotion trends
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Get the user's journal entries
      const allEntries = await storage.getUserJournalEntries(req.user.id);

      // Filter entries from the past two weeks
      const entries = allEntries.filter((entry: { createdAt: Date | string }) => new Date(entry.createdAt) >= twoWeeksAgo);

      // If we have no entries, return default insight
      if (entries.length === 0) {
        return res.json({
          dominant: null,
          trend: 'neutral',
          insight: 'Start journaling to receive emotional insights'
        });
      }

      // Extract emotions from entries and analyze trends
      const emotions: string[] = [];
      entries.forEach(entry => {
        if (entry.emotions) {
          emotions.push(...entry.emotions);
        }
      });

      // Count emotion occurrences
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      // Find dominant emotion
      let dominantEmotion = 'neutral';
      let maxCount = 0;

      Object.entries(emotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      });

      // Simple trend analysis - compare older vs newer entries
      const midPoint = Math.floor(entries.length / 2);
      const olderEntries = entries.slice(0, midPoint);
      const newerEntries = entries.slice(midPoint);

      let olderScoreSum = 0;
      let newerScoreSum = 0;

      olderEntries.forEach(entry => {
        olderScoreSum += entry.emotionalScore || 5;
      });

      newerEntries.forEach(entry => {
        newerScoreSum += entry.emotionalScore || 5;
      });

      const olderAvg = olderEntries.length > 0 ? olderScoreSum / olderEntries.length : 5;
      const newerAvg = newerEntries.length > 0 ? newerScoreSum / newerEntries.length : 5;

      let trend: 'improving' | 'declining' | 'stable';
      if (newerAvg - olderAvg > 0.5) {
        trend = 'improving';
      } else if (olderAvg - newerAvg > 0.5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }

      // Generate insight text based on trend and dominant emotion
      let insight = '';
      if (trend === 'improving') {
        insight = `Your emotional well-being seems to be improving. You've been expressing ${dominantEmotion} more frequently.`;
      } else if (trend === 'declining') {
        insight = `You've been experiencing more ${dominantEmotion} lately. Consider exploring what might be contributing to this.`;
      } else {
        insight = `Your emotional patterns have been consistent, with ${dominantEmotion} being your most expressed emotion.`;
      }

      res.json({
        dominant: dominantEmotion,
        trend,
        insight
      });
    } catch (error) {
      console.error("Error analyzing emotion trends:", error);
      res.status(500).json({ error: "Failed to analyze emotion trends" });
    }
  });

  // POST /api/emotional-expressions - create emotional expression
  app.post('/api/emotional-expressions', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { emotion, context, intensity, relatedItemId, relatedItemType, tags } = req.body;

      if (!emotion || !context) {
        return res.status(400).json({ error: 'Emotion and context are required' });
      }

      const newExpression = await storage.createEmotionalExpression({
        userId: req.user.id,
        emotion,
        context,
        intensity: intensity || 5,
        relatedItemId: relatedItemId || null,
        relatedItemType: relatedItemType || null,
        tags: tags || [],
        aiProcessed: false
      });

      res.status(201).json(newExpression);
    } catch (error) {
      console.error('Error creating emotional expression:', error);
      res.status(500).json({ error: 'Failed to create emotional expression' });
    }
  });

  // GET /api/emotional-expressions - list user's emotional expressions
  app.get('/api/emotional-expressions', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const expressions = await storage.getUserEmotionalExpressions(req.user.id, limit);

      res.json(expressions);
    } catch (error) {
      console.error('Error fetching emotional expressions:', error);
      res.status(500).json({ error: 'Failed to fetch emotional expressions' });
    }
  });

  // GET /api/emotional-expressions/:id - get specific expression
  app.get('/api/emotional-expressions/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const expressionId = parseInt(req.params.id);
      const expression = await storage.getEmotionalExpression(expressionId);

      if (!expression) {
        return res.status(404).json({ error: 'Emotional expression not found' });
      }

      if (expression.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to access this emotional expression' });
      }

      res.json(expression);
    } catch (error) {
      console.error('Error fetching emotional expression:', error);
      res.status(500).json({ error: 'Failed to fetch emotional expression' });
    }
  });

  // PUT /api/emotional-expressions/:id - update expression
  app.put('/api/emotional-expressions/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const expressionId = parseInt(req.params.id);
      const expression = await storage.getEmotionalExpression(expressionId);

      if (!expression) {
        return res.status(404).json({ error: 'Emotional expression not found' });
      }

      if (expression.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this emotional expression' });
      }

      const { emotion, context, intensity, tags, aiProcessed, aiInsight } = req.body;

      const updatedExpression = await storage.updateEmotionalExpression(expressionId, {
        emotion: emotion || expression.emotion,
        context: context || expression.context,
        intensity: intensity !== undefined ? intensity : expression.intensity,
        tags: tags || expression.tags,
        aiProcessed: aiProcessed !== undefined ? aiProcessed : expression.aiProcessed,
        aiInsight: aiInsight !== undefined ? aiInsight : expression.aiInsight
      });

      res.json(updatedExpression);
    } catch (error) {
      console.error('Error updating emotional expression:', error);
      res.status(500).json({ error: 'Failed to update emotional expression' });
    }
  });

  // DELETE /api/emotional-expressions/:id - delete expression
  app.delete('/api/emotional-expressions/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const expressionId = parseInt(req.params.id);
      const expression = await storage.getEmotionalExpression(expressionId);

      if (!expression) {
        return res.status(404).json({ error: 'Emotional expression not found' });
      }

      if (expression.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this emotional expression' });
      }

      await storage.deleteEmotionalExpression(expressionId);

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting emotional expression:', error);
      res.status(500).json({ error: 'Failed to delete emotional expression' });
    }
  });

  // GET /api/emotions/patterns - AI emotion pattern analysis
  app.get('/api/emotions/patterns', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get user's journal entries to analyze emotion patterns
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Get the user's journal entries
      const allEntries = await storage.getUserJournalEntries(req.user.id);

      // Filter entries from the past month
      const journalEntries = allEntries
        .filter((entry: { createdAt: Date | string }) => new Date(entry.createdAt) >= oneMonthAgo)
        .map((entry: any) => ({
          title: entry.title || '',
          content: entry.content || '',
          emotions: entry.emotions || [],
          emotionalScore: entry.emotionalScore || 5,
          createdAt: new Date(entry.createdAt)
        }));

      // Get the user's tracked emotional expressions
      const emotionalExpressions = await storage.getUserEmotionalExpressions(req.user.id);

      // Format emotional expressions for analysis
      const formattedExpressions = emotionalExpressions.map(expr => ({
        emotion: expr.emotion || 'neutral',
        context: expr.context || '',
        intensity: expr.intensity || 5,
        date: new Date(expr.createdAt)
      }));

      // Get partnership info to include partner data if available
      const partnership = await storage.getPartnershipByUser(req.user.id);
      let partnerData = undefined;

      if (partnership && partnership.status === 'active') {
        const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

        // Get partner's dominant emotions
        const partnerExpressions = await storage.getUserEmotionalExpressions(partnerId);

        // Count partner's emotions
        const emotionCounts: Record<string, number> = {};
        partnerExpressions.forEach(expr => {
          const emotion = expr.emotion || 'neutral';
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });

        // Get top 3 emotions
        const sortedEmotions = Object.entries(emotionCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 3)
          .map(([emotion]) => emotion);

        // Get partner's recent expressions
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentPartnerExpressions = partnerExpressions
          .filter(expr => new Date(expr.createdAt) >= twoWeeksAgo)
          .map(expr => ({
            emotion: expr.emotion || 'neutral',
            date: new Date(expr.createdAt)
          }));

        partnerData = {
          dominantEmotions: sortedEmotions,
          recentExpressions: recentPartnerExpressions
        };
      }

      // If we have no data, return default insights
      if (journalEntries.length === 0 && formattedExpressions.length === 0) {
        return res.json({
          dominantEmotions: [{
            emotion: "neutral",
            frequency: 5,
            intensity: 5,
            description: "Not enough data to analyze emotional patterns yet."
          }],
          emotionTrends: {
            overall: "stable",
            description: "Start expressing emotions to see trends.",
            recentShift: null
          },
          patterns: [],
          relationshipInsights: {
            communicationStyle: "Not enough data yet",
            emotionalDynamics: "Continue using the app to generate insights",
            growthAreas: ["Emotional awareness", "Communication"],
            strengths: ["Desire to improve"]
          },
          personalizedRecommendations: [
            "Log your emotions regularly",
            "Journal about relationship experiences",
            "Use the emotion transformation tools"
          ]
        });
      }

      // Analyze emotion patterns using AI
      const patternAnalysis = await analyzeEmotionPatterns(
        journalEntries,
        formattedExpressions,
        partnerData
      );

      res.json(patternAnalysis);
    } catch (error) {
      console.error("Error analyzing emotion patterns:", error);
      res.status(500).json({ error: "Failed to analyze emotion patterns" });
    }
  });
}
