import { type Express } from "express";
import { conflictStatusOptions, conflictInitiationSchema, resolveConflictSchema } from "@shared/schema";
import { transformConflictMessage } from "../openai";
import { storage } from "../storage";
import { isAuthenticated, type RouteContext } from "./types";

export async function canCreateConflictWithPartner(userId: number, partnerId: number) {
  const partnership = await storage.getPartnershipByUsers(userId, partnerId);
  return partnership?.status === "active";
}

export function registerConflictRoutes(app: Express, ctx: RouteContext) {
  const ensureThreadAccess = async (threadId: number, userId: number) => {
    const thread = await storage.getConflictThread(threadId);
    if (!thread) {
      return { error: { status: 404, message: "Conflict thread not found" } };
    }

    if (thread.userId !== userId && thread.partnerId !== userId) {
      return { error: { status: 403, message: "Not authorized to access this conflict thread" } };
    }

    return { thread };
  };

  app.post("/api/transform-conflict", isAuthenticated, async (req, res) => {
    try {
      const validatedData = conflictInitiationSchema.parse(req.body);
      const transformed = await transformConflictMessage(
        validatedData.topic,
        validatedData.situation,
        validatedData.feelings,
        validatedData.impact,
        validatedData.request,
      );

      res.json(transformed);
    } catch (error) {
      console.error("Error transforming conflict message:", error);
      res.status(500).json({ message: "Failed to transform conflict message" });
    }
  });

  app.get("/api/conflict-threads", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const threads = await storage.getConflictThreadsByUserId(userId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching conflict threads:", error);
      res.status(500).json({ message: "Failed to fetch conflict threads" });
    }
  });

  app.post("/api/conflict-threads", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const partnerId = Number(req.body.partnerId);
      const topic = typeof req.body.topic === "string" && req.body.topic.trim()
        ? req.body.topic.trim()
        : typeof req.body.title === "string"
          ? req.body.title.trim()
          : "";

      if (!partnerId || Number.isNaN(partnerId)) {
        return res.status(400).json({ message: "A valid partner ID is required" });
      }

      if (!topic) {
        return res.status(400).json({ message: "A topic is required" });
      }

      if (!(await canCreateConflictWithPartner(user.id, partnerId))) {
        return res.status(403).json({ message: "Conflict threads require an active partnership" });
      }

      const thread = await storage.createConflictThread({
        userId: user.id,
        partnerId,
        topic,
      });

      const partnerClient = ctx.clients.get(partnerId);
      if (partnerClient) {
        partnerClient.send(JSON.stringify({
          type: "conflict_update",
          threadId: thread.id,
          topic: thread.topic,
          updateType: "new",
          senderId: user.id,
          senderName: user.displayName || user.firstName,
          timestamp: new Date().toISOString(),
        }));
      }

      res.status(201).json(thread);
    } catch (error) {
      console.error("Error creating conflict thread:", error);
      res.status(500).json({ message: "Failed to create conflict thread" });
    }
  });

  app.get("/api/conflict-threads/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const threadId = parseInt(req.params.id, 10);
      const access = await ensureThreadAccess(threadId, userId);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      res.json(access.thread);
    } catch (error) {
      console.error("Error fetching conflict thread:", error);
      res.status(500).json({ message: "Failed to fetch conflict thread" });
    }
  });

  app.get("/api/conflict-threads/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const threadId = parseInt(req.params.id, 10);
      const access = await ensureThreadAccess(threadId, userId);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      const messages = await storage.getConflictMessagesByThreadId(threadId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conflict messages:", error);
      res.status(500).json({ message: "Failed to fetch conflict messages" });
    }
  });

  app.post("/api/conflict-threads/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const threadId = parseInt(req.params.id, 10);
      const access = await ensureThreadAccess(threadId, user.id);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conflictMessage = await storage.createConflictMessage({
        threadId,
        userId: user.id,
        content,
        emotionalTone: req.body.emotionalTone || null,
        messageType: req.body.messageType || "user",
      });

      await storage.updateConflictThreadLastActivity(threadId);

      res.status(201).json(conflictMessage);
    } catch (error) {
      console.error("Error creating conflict message:", error);
      res.status(500).json({ message: "Failed to create conflict message" });
    }
  });

  app.post("/api/conflict-messages", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const threadId = Number(req.body.threadId);
      const access = await ensureThreadAccess(threadId, user.id);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conflictMessage = await storage.createConflictMessage({
        threadId,
        userId: user.id,
        content,
        emotionalTone: req.body.emotionalTone || null,
        messageType: req.body.messageType || "user",
      });

      await storage.updateConflictThreadLastActivity(threadId);

      res.status(201).json(conflictMessage);
    } catch (error) {
      console.error("Error creating conflict message:", error);
      res.status(500).json({ message: "Failed to create conflict message" });
    }
  });

  app.patch("/api/conflict-threads/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const threadId = parseInt(req.params.id, 10);
      const access = await ensureThreadAccess(threadId, userId);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      const status = typeof req.body.status === "string" ? req.body.status : "";
      if (!conflictStatusOptions.includes(status as (typeof conflictStatusOptions)[number])) {
        return res.status(400).json({ message: "Invalid conflict status" });
      }

      const updatedThread = await storage.updateConflictThreadStatus(
        threadId,
        status,
        typeof req.body.summary === "string" ? req.body.summary : undefined,
      );

      res.json(updatedThread);
    } catch (error) {
      console.error("Error updating conflict thread status:", error);
      res.status(500).json({ message: "Failed to update conflict thread status" });
    }
  });

  app.patch("/api/conflict-threads/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as Express.User).id;
      const threadId = parseInt(req.params.id, 10);
      const access = await ensureThreadAccess(threadId, userId);

      if (access.error) {
        return res.status(access.error.status).json({ message: access.error.message });
      }

      const validatedData = resolveConflictSchema.parse({
        threadId,
        summary: req.body.summary,
        insights: req.body.insights,
      });

      const resolvedThread = await storage.updateConflictThreadStatus(
        threadId,
        "resolved",
        validatedData.summary,
      );

      const updatedThread = validatedData.insights
        ? await storage.updateConflictResolutionInsights(threadId, validatedData.insights)
        : resolvedThread;

      res.json(updatedThread);
    } catch (error) {
      console.error("Error resolving conflict thread:", error);
      res.status(500).json({ message: "Failed to resolve conflict thread" });
    }
  });
}
