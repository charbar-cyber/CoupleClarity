import { type Express } from "express";
import { createGuidedConversationSchema, guidedConversationResponseSchema, guidedConversationAcceptCoachingSchema } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, type RouteContext } from "./types";
import { buildPreferenceProfile } from "../ai-preferences";
import {
  generateConversationPromptOpenAI,
  coachResponseOpenAI,
  generateConversationSummaryOpenAI,
} from "../openai";
import {
  generateConversationPromptAnthropic,
  coachResponseAnthropic,
  generateConversationSummaryAnthropic,
} from "../anthropic";
import { WebSocket } from "ws";

export function registerGuidedConversationRoutes(app: Express, ctx: RouteContext) {

  // Helper: load both partners' preference profiles
  async function loadProfiles(userId: number, partnerId: number) {
    const [user, partner, userPrefs, partnerPrefs] = await Promise.all([
      storage.getUser(userId),
      storage.getUser(partnerId),
      storage.getUserPreferences(userId),
      storage.getUserPreferences(partnerId),
    ]);
    if (!user || !partner) return null;
    return {
      userProfile: buildPreferenceProfile(user, userPrefs),
      partnerProfile: buildPreferenceProfile(partner, partnerPrefs),
      aiModel: userPrefs?.preferredAiModel || "openai",
    };
  }

  // Helper: generate prompt using the user's preferred AI model
  async function generatePrompt(
    aiModel: string,
    conversationType: string,
    topic: string | null,
    currentUser: ReturnType<typeof buildPreferenceProfile>,
    partner: ReturnType<typeof buildPreferenceProfile>,
    turns: any[],
    turnNumber: number
  ) {
    if (aiModel === "anthropic") {
      return generateConversationPromptAnthropic(conversationType, topic, currentUser, partner, turns, turnNumber);
    }
    return generateConversationPromptOpenAI(conversationType, topic, currentUser, partner, turns, turnNumber);
  }

  // Helper: coach response using the user's preferred AI model
  async function coachMsg(
    aiModel: string,
    rawResponse: string,
    conversationType: string,
    speaker: ReturnType<typeof buildPreferenceProfile>,
    listener: ReturnType<typeof buildPreferenceProfile>,
    turns: any[]
  ) {
    if (aiModel === "anthropic") {
      return coachResponseAnthropic(rawResponse, conversationType, speaker, listener, turns);
    }
    return coachResponseOpenAI(rawResponse, conversationType, speaker, listener, turns);
  }

  // Helper: send WS notification to partner
  function notifyPartner(partnerId: number, payload: object) {
    const ws = ctx.clients.get(partnerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // ─── POST /api/guided-conversations ────────────────────────────────
  app.post("/api/guided-conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const body = createGuidedConversationSchema.parse(req.body);

      const partnership = await storage.getPartnershipByUser(userId);
      if (!partnership || partnership.status !== "active") {
        return res.status(400).json({ message: "No active partnership found" });
      }

      const partnerId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
      const profiles = await loadProfiles(userId, partnerId);
      if (!profiles) return res.status(404).json({ message: "User profiles not found" });

      // Generate opening prompt for the initiator
      const openingPrompt = await generatePrompt(
        profiles.aiModel, body.conversationType, body.topic ?? null,
        profiles.userProfile, profiles.partnerProfile, [], 1
      );

      const conversation = await storage.createGuidedConversation({
        partnershipId: partnership.id,
        initiatorId: userId,
        partnerId,
        conversationType: body.conversationType,
        topic: body.topic ?? null,
        status: "active",
        currentTurnUserId: userId,
        currentTurnNumber: 1,
        totalTurns: 6,
        openingPrompt,
      });

      // Save the AI prompt as the first turn
      await storage.createGuidedConversationTurn({
        conversationId: conversation.id,
        turnNumber: 1,
        userId: null,
        turnType: "ai_prompt",
        content: openingPrompt,
        visibleTo: "initiator",
      });

      // Notify partner
      notifyPartner(partnerId, {
        type: "guided_conversation_new",
        conversationId: conversation.id,
        initiatorName: profiles.userProfile.name,
        conversationType: body.conversationType,
      });

      res.status(201).json(conversation);
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: error.errors });
      console.error("Error creating guided conversation:", error);
      res.status(500).json({ message: "Failed to create guided conversation" });
    }
  });

  // ─── GET /api/guided-conversations ─────────────────────────────────
  app.get("/api/guided-conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const status = req.query.status as string | undefined;
      const conversations = await storage.getGuidedConversationsByUser(userId, status);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching guided conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // ─── GET /api/guided-conversations/:id ─────────────────────────────
  app.get("/api/guided-conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.initiatorId !== userId && conversation.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching guided conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // ─── GET /api/guided-conversations/:id/turns ───────────────────────
  app.get("/api/guided-conversations/:id/turns", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.initiatorId !== userId && conversation.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const turns = await storage.getGuidedConversationTurns(conversation.id);
      const role = conversation.initiatorId === userId ? "initiator" : "partner";

      // Filter turns based on visibility
      const visibleTurns = turns.filter(t => {
        if (t.visibleTo === "both") return true;
        if (t.visibleTo === role) return true;
        if (t.visibleTo === "self" && t.userId === userId) return true;
        return false;
      });

      res.json(visibleTurns);
    } catch (error) {
      console.error("Error fetching conversation turns:", error);
      res.status(500).json({ message: "Failed to fetch turns" });
    }
  });

  // ─── POST /api/guided-conversations/:id/respond ────────────────────
  app.post("/api/guided-conversations/:id/respond", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const body = guidedConversationResponseSchema.parse(req.body);

      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.status !== "active") return res.status(400).json({ message: "Conversation is not active" });
      if (conversation.currentTurnUserId !== userId) return res.status(400).json({ message: "It's not your turn" });

      const isInitiator = conversation.initiatorId === userId;
      const partnerId = isInitiator ? conversation.partnerId : conversation.initiatorId;
      const profiles = await loadProfiles(userId, partnerId);
      if (!profiles) return res.status(404).json({ message: "User profiles not found" });

      const previousTurns = await storage.getGuidedConversationTurns(conversation.id);

      // 1. Save raw response (visible only to self)
      await storage.createGuidedConversationTurn({
        conversationId: conversation.id,
        turnNumber: conversation.currentTurnNumber,
        userId,
        turnType: "user_response",
        content: body.content,
        visibleTo: "self",
      });

      // 2. Coach the response
      const coaching = await coachMsg(
        profiles.aiModel, body.content, conversation.conversationType,
        profiles.userProfile, profiles.partnerProfile, previousTurns
      );

      // Save coaching (private to speaker)
      await storage.createGuidedConversationTurn({
        conversationId: conversation.id,
        turnNumber: conversation.currentTurnNumber,
        userId: null,
        turnType: "ai_coaching",
        content: coaching.coaching,
        visibleTo: isInitiator ? "initiator" : "partner",
        metadata: JSON.stringify({ emotionalTone: coaching.emotionalTone }),
      });

      // Save coached message (visible to both, but initially pending acceptance)
      const coachedTurn = await storage.createGuidedConversationTurn({
        conversationId: conversation.id,
        turnNumber: conversation.currentTurnNumber,
        userId,
        turnType: "coached_message",
        content: coaching.coachedMessage,
        visibleTo: "both",
        metadata: JSON.stringify({ accepted: false, emotionalTone: coaching.emotionalTone }),
      });

      res.json({
        rawResponse: body.content,
        coaching: coaching.coaching,
        coachedMessage: coaching.coachedMessage,
        emotionalTone: coaching.emotionalTone,
        coachedTurnId: coachedTurn.id,
      });
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: error.errors });
      console.error("Error responding to guided conversation:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // ─── POST /api/guided-conversations/:id/accept-coaching ────────────
  app.post("/api/guided-conversations/:id/accept-coaching", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const body = guidedConversationAcceptCoachingSchema.parse(req.body);

      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.status !== "active") return res.status(400).json({ message: "Conversation is not active" });

      const isInitiator = conversation.initiatorId === userId;
      const partnerId = isInitiator ? conversation.partnerId : conversation.initiatorId;

      // If user rejected coaching and provided edited content, save that instead
      if (!body.accept && body.editedContent) {
        await storage.createGuidedConversationTurn({
          conversationId: conversation.id,
          turnNumber: conversation.currentTurnNumber,
          userId,
          turnType: "coached_message",
          content: body.editedContent,
          visibleTo: "both",
          metadata: JSON.stringify({ accepted: true, edited: true }),
        });
      }
      // If accepted, mark the coached turn as accepted (already saved)

      const nextTurnNumber = conversation.currentTurnNumber + 1;
      const isComplete = nextTurnNumber > conversation.totalTurns;

      if (isComplete) {
        // Generate summary
        const allTurns = await storage.getGuidedConversationTurns(conversation.id);
        const profiles = await loadProfiles(conversation.initiatorId, conversation.partnerId);

        let summaryResult = { summary: "Conversation completed.", insights: "[]" };
        if (profiles) {
          if (profiles.aiModel === "anthropic") {
            summaryResult = await generateConversationSummaryAnthropic(
              conversation.conversationType, conversation.topic,
              profiles.userProfile, profiles.partnerProfile, allTurns
            );
          } else {
            summaryResult = await generateConversationSummaryOpenAI(
              conversation.conversationType, conversation.topic,
              profiles.userProfile, profiles.partnerProfile, allTurns
            );
          }
        }

        await storage.updateGuidedConversation(conversation.id, {
          status: "completed",
          currentTurnNumber: nextTurnNumber,
          summary: summaryResult.summary,
          insightsJson: summaryResult.insights,
          completedAt: new Date(),
        });

        notifyPartner(partnerId, {
          type: "guided_conversation_completed",
          conversationId: conversation.id,
        });

        return res.json({ status: "completed", summary: summaryResult.summary, insights: summaryResult.insights });
      }

      // Advance turn to partner
      await storage.updateGuidedConversation(conversation.id, {
        currentTurnUserId: partnerId,
        currentTurnNumber: nextTurnNumber,
      });

      // Generate next prompt for partner
      const profiles = await loadProfiles(partnerId, userId);
      if (profiles) {
        const allTurns = await storage.getGuidedConversationTurns(conversation.id);
        const nextPrompt = await generatePrompt(
          profiles.aiModel, conversation.conversationType, conversation.topic,
          profiles.userProfile, profiles.partnerProfile, allTurns, nextTurnNumber
        );

        await storage.createGuidedConversationTurn({
          conversationId: conversation.id,
          turnNumber: nextTurnNumber,
          userId: null,
          turnType: "ai_prompt",
          content: nextPrompt,
          visibleTo: isInitiator ? "partner" : "initiator",
        });
      }

      notifyPartner(partnerId, {
        type: "guided_conversation_your_turn",
        conversationId: conversation.id,
      });

      await ctx.sendNotification(partnerId, {
        title: "Your turn in Guided Conversation",
        body: "Your partner has responded. It's your turn now!",
        url: `/conversations/${conversation.id}`,
        type: "guidedConversations",
      });

      res.json({ status: "active", nextTurnNumber, nextTurnUserId: partnerId });
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: error.errors });
      console.error("Error accepting coaching:", error);
      res.status(500).json({ message: "Failed to accept coaching" });
    }
  });

  // ─── PATCH /api/guided-conversations/:id/status ────────────────────
  app.patch("/api/guided-conversations/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const { status } = req.body;
      if (!["paused", "active", "abandoned"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.initiatorId !== userId && conversation.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updated = await storage.updateGuidedConversation(conversation.id, { status });
      const partnerId = conversation.initiatorId === userId ? conversation.partnerId : conversation.initiatorId;

      notifyPartner(partnerId, {
        type: "guided_conversation_update",
        conversationId: conversation.id,
        status,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating conversation status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // ─── POST /api/guided-conversations/:id/complete ───────────────────
  app.post("/api/guided-conversations/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const conversation = await storage.getGuidedConversation(parseInt(req.params.id));
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      if (conversation.initiatorId !== userId && conversation.partnerId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const allTurns = await storage.getGuidedConversationTurns(conversation.id);
      const profiles = await loadProfiles(conversation.initiatorId, conversation.partnerId);

      let summaryResult = { summary: "Conversation completed.", insights: "[]" };
      if (profiles) {
        if (profiles.aiModel === "anthropic") {
          summaryResult = await generateConversationSummaryAnthropic(
            conversation.conversationType, conversation.topic,
            profiles.userProfile, profiles.partnerProfile, allTurns
          );
        } else {
          summaryResult = await generateConversationSummaryOpenAI(
            conversation.conversationType, conversation.topic,
            profiles.userProfile, profiles.partnerProfile, allTurns
          );
        }
      }

      const updated = await storage.updateGuidedConversation(conversation.id, {
        status: "completed",
        summary: summaryResult.summary,
        insightsJson: summaryResult.insights,
        completedAt: new Date(),
      });

      res.json({ ...updated, summary: summaryResult.summary, insights: summaryResult.insights });
    } catch (error) {
      console.error("Error completing conversation:", error);
      res.status(500).json({ message: "Failed to complete conversation" });
    }
  });
}
