import { eq, and, or, desc, asc, ilike, sql, lt } from "drizzle-orm";
import { db as drizzleDb } from "./db";
import {
  users, type User, type InsertUser,
  messages, type Message, type InsertMessage,
  partnerships, type Partnership, type InsertPartnership,
  responses, type Response, type InsertResponse,
  inviteSchema, type Invite, type InsertInvite,
  userPreferences, type UserPreferences, type InsertUserPreferences,
  checkInPrompts, type CheckInPrompt, type InsertCheckInPrompt,
  checkInResponses, type CheckInResponse, type InsertCheckInResponse,
  appreciations, type Appreciation, type InsertAppreciation,
  conflictThreads, type ConflictThread, type InsertConflictThread,
  conflictMessages, type ConflictMessage, type InsertConflictMessage,
  directMessages, type DirectMessage, type InsertDirectMessage,
  journalEntries, type JournalEntry, type InsertJournalEntry,
  journalResponses, type JournalResponse, type InsertJournalResponse,
  memories, type Memory, type InsertMemory,
  therapists, type Therapist, type InsertTherapist,
  pushSubscriptions, type PushSubscription, type InsertPushSubscription,
  notificationPreferences, type NotificationPreferences, type InsertNotificationPreferences,
  currentEmotions, type CurrentEmotion, type InsertCurrentEmotion,
  relationshipMilestones, type Milestone, type InsertMilestone,
  communicationExercises, type CommunicationExercise, type InsertExercise,
  exerciseSteps, type ExerciseStep, type InsertExerciseStep,
  exerciseResponses, type ExerciseResponse, type InsertExerciseResponse,
  exerciseTemplates, type ExerciseTemplate, type InsertExerciseTemplate,
  therapySessions, type TherapySession, type InsertTherapySession,
  emotionalExpressions, type EmotionalExpression, type InsertEmotionalExpression,
  passwordResetTokens,
  memoryTypes,
} from "@shared/schema";
import type { IStorage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import crypto from "crypto";

const PgSession = connectPgSimple(session);

// Non-null assertion — only instantiated when DATABASE_URL exists
const db = drizzleDb!;

export class PostgresStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    this.sessionStore = new PgSession({
      pool,
      createTableIfMissing: true,
    });
  }

  // ─── Therapy Sessions ──────────────────────────────────────────────
  async createTherapySession(ts: InsertTherapySession): Promise<TherapySession> {
    const [row] = await db.insert(therapySessions).values({
      partnershipId: ts.partnershipId,
      transcript: ts.transcript,
      emotionalPatterns: ts.emotionalPatterns,
      coreIssues: ts.coreIssues,
      recommendations: ts.recommendations,
      audioUrl: ts.audioUrl ?? null,
      isReviewed: ts.isReviewed ?? false,
      userNotes: ts.userNotes ?? null,
    }).returning();
    return this.toTherapySession(row);
  }

  async getTherapySession(id: number): Promise<TherapySession | null> {
    const [row] = await db.select().from(therapySessions).where(eq(therapySessions.id, id));
    return row ? this.toTherapySession(row) : null;
  }

  async getTherapySessions(partnershipId: number): Promise<TherapySession[]> {
    const rows = await db.select().from(therapySessions)
      .where(eq(therapySessions.partnershipId, partnershipId))
      .orderBy(desc(therapySessions.createdAt));
    return rows.map(r => this.toTherapySession(r));
  }

  async updateTherapySession(id: number, updates: Partial<TherapySession>): Promise<TherapySession | null> {
    const updateData: Record<string, any> = {};
    if (updates.isReviewed !== undefined) updateData.isReviewed = updates.isReviewed;
    if (updates.reviewedAt !== undefined) updateData.reviewedAt = updates.reviewedAt;
    if (updates.userNotes !== undefined) updateData.userNotes = updates.userNotes;
    if (updates.audioUrl !== undefined) updateData.audioUrl = updates.audioUrl;
    if (updates.transcript !== undefined) updateData.transcript = updates.transcript;
    if (updates.emotionalPatterns !== undefined) updateData.emotionalPatterns = updates.emotionalPatterns;
    if (updates.coreIssues !== undefined) updateData.coreIssues = updates.coreIssues;
    if (updates.recommendations !== undefined) updateData.recommendations = updates.recommendations;

    const [row] = await db.update(therapySessions).set(updateData)
      .where(eq(therapySessions.id, id)).returning();
    return row ? this.toTherapySession(row) : null;
  }

  private toTherapySession(row: typeof therapySessions.$inferSelect): TherapySession {
    return {
      id: row.id,
      partnershipId: row.partnershipId,
      transcript: row.transcript,
      emotionalPatterns: row.emotionalPatterns,
      coreIssues: row.coreIssues,
      recommendations: row.recommendations,
      audioUrl: row.audioUrl ?? null,
      isReviewed: row.isReviewed,
      reviewedAt: row.reviewedAt ?? null,
      userNotes: row.userNotes ?? null,
      createdAt: row.createdAt,
    };
  }

  // ─── Emotional Expressions ─────────────────────────────────────────
  async createEmotionalExpression(expr: InsertEmotionalExpression): Promise<EmotionalExpression> {
    const [row] = await db.insert(emotionalExpressions).values({
      userId: expr.userId,
      emotion: expr.emotion,
      context: expr.context,
      intensity: expr.intensity ?? 5,
      relatedItemId: expr.relatedItemId ?? null,
      relatedItemType: expr.relatedItemType ?? null,
      aiProcessed: expr.aiProcessed ?? false,
      aiInsight: expr.aiInsight ?? null,
      tags: expr.tags ?? [],
    }).returning();
    return row;
  }

  async getUserEmotionalExpressions(userId: number, limit?: number): Promise<EmotionalExpression[]> {
    let query = db.select().from(emotionalExpressions)
      .where(eq(emotionalExpressions.userId, userId))
      .orderBy(desc(emotionalExpressions.createdAt));
    if (limit) query = query.limit(limit) as any;
    return await query;
  }

  async getEmotionalExpression(id: number): Promise<EmotionalExpression | null> {
    const [row] = await db.select().from(emotionalExpressions).where(eq(emotionalExpressions.id, id));
    return row ?? null;
  }

  async updateEmotionalExpression(id: number, updates: Partial<EmotionalExpression>): Promise<EmotionalExpression | null> {
    const [row] = await db.update(emotionalExpressions).set(updates)
      .where(eq(emotionalExpressions.id, id)).returning();
    return row ?? null;
  }

  // ─── Users ─────────────────────────────────────────────────────────
  async getUser(id: number): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(ilike(users.username, username.trim()));
    return row;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(ilike(users.email, email.trim()));
    return row;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      email: insertUser.email,
      displayName: insertUser.displayName || `${insertUser.firstName} ${insertUser.lastName}`,
      avatarUrl: insertUser.avatarUrl ?? null,
      relationshipGoals: null,
      challengeAreas: null,
      communicationFrequency: null,
      onboardingCompleted: false,
    }).returning();
    return row;
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const { id, ...rest } = userData;
    const [row] = await db.update(users).set(rest).where(eq(users.id, userId)).returning();
    if (!row) throw new Error(`User with id ${userId} not found`);
    return row;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const [row] = await db.update(users).set({ password: newPassword }).where(eq(users.id, userId)).returning();
    if (!row) throw new Error("User not found");
    return row;
  }

  async updateUserAvatar(userId: number, avatarUrl: string): Promise<User> {
    const [row] = await db.update(users).set({ avatarUrl }).where(eq(users.id, userId)).returning();
    if (!row) throw new Error("User not found");
    return row;
  }

  async resetUsers(): Promise<void> {
    await db.delete(users);
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; userId: number } | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 3600_000);
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
    return { token, userId: user.id };
  }

  async getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date } | null> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!row) return null;
    if (new Date() > row.expiresAt) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return null;
    }
    return { userId: row.userId, expiresAt: row.expiresAt };
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  // ─── Partnerships ──────────────────────────────────────────────────
  async createPartnership(p: InsertPartnership): Promise<Partnership> {
    const [row] = await db.insert(partnerships).values({
      user1Id: p.user1Id,
      user2Id: p.user2Id,
      status: "pending",
      startDate: null,
      relationshipType: null,
      anniversaryDate: null,
      meetingStory: null,
      coupleNickname: null,
      sharedPicture: null,
      relationshipGoals: null,
      privacyLevel: "standard",
    }).returning();
    return row;
  }

  async getPartnership(id: number): Promise<Partnership | undefined> {
    const [row] = await db.select().from(partnerships).where(eq(partnerships.id, id));
    return row;
  }

  async getPartnershipByUsers(user1Id: number, user2Id: number): Promise<Partnership | undefined> {
    const [row] = await db.select().from(partnerships).where(
      or(
        and(eq(partnerships.user1Id, user1Id), eq(partnerships.user2Id, user2Id)),
        and(eq(partnerships.user1Id, user2Id), eq(partnerships.user2Id, user1Id)),
      ),
    );
    return row;
  }

  async getPartnershipByUser(userId: number): Promise<Partnership | undefined> {
    const list = await this.getPartnershipsForUser(userId);
    if (list.length === 0) return undefined;
    return list.find(p => p.status === "active") ?? list[0];
  }

  async getPartnershipsForUser(userId: number): Promise<Partnership[]> {
    return db.select().from(partnerships)
      .where(or(eq(partnerships.user1Id, userId), eq(partnerships.user2Id, userId)))
      .orderBy(desc(partnerships.createdAt));
  }

  async updatePartnershipStatus(id: number, status: string): Promise<Partnership> {
    const [row] = await db.update(partnerships).set({ status }).where(eq(partnerships.id, id)).returning();
    if (!row) throw new Error(`Partnership with id ${id} not found`);
    return row;
  }

  async updatePartnershipProfile(id: number, profileData: Partial<InsertPartnership>): Promise<Partnership> {
    const [row] = await db.update(partnerships).set(profileData).where(eq(partnerships.id, id)).returning();
    if (!row) throw new Error(`Partnership with id ${id} not found`);
    return row;
  }

  async updatePartnership(id: number, partnershipData: Partial<Partnership>): Promise<Partnership> {
    const { id: _id, ...rest } = partnershipData;
    const [row] = await db.update(partnerships).set(rest).where(eq(partnerships.id, id)).returning();
    if (!row) throw new Error(`Partnership with id ${id} not found`);
    return row;
  }

  // ─── Milestones ────────────────────────────────────────────────────
  async createMilestone(m: InsertMilestone): Promise<Milestone> {
    const [row] = await db.insert(relationshipMilestones).values({
      partnershipId: m.partnershipId,
      title: m.title,
      description: m.description ?? null,
      date: m.date,
      type: m.type,
      imageUrl: m.imageUrl ?? null,
      isPrivate: m.isPrivate ?? false,
    }).returning();
    return row;
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [row] = await db.select().from(relationshipMilestones).where(eq(relationshipMilestones.id, id));
    return row;
  }

  async getMilestonesByPartnership(partnershipId: number): Promise<Milestone[]> {
    return db.select().from(relationshipMilestones)
      .where(eq(relationshipMilestones.partnershipId, partnershipId))
      .orderBy(desc(relationshipMilestones.date));
  }

  async getMilestonesByType(partnershipId: number, type: string): Promise<Milestone[]> {
    return db.select().from(relationshipMilestones)
      .where(and(eq(relationshipMilestones.partnershipId, partnershipId), eq(relationshipMilestones.type, type)))
      .orderBy(desc(relationshipMilestones.date));
  }

  async updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone> {
    const [row] = await db.update(relationshipMilestones).set(data).where(eq(relationshipMilestones.id, id)).returning();
    if (!row) throw new Error(`Milestone with id ${id} not found`);
    return row;
  }

  async deleteMilestone(id: number): Promise<void> {
    const result = await db.delete(relationshipMilestones).where(eq(relationshipMilestones.id, id)).returning();
    if (result.length === 0) throw new Error(`Milestone with id ${id} not found`);
  }

  // ─── Messages ──────────────────────────────────────────────────────
  async createMessage(m: InsertMessage): Promise<Message> {
    const [row] = await db.insert(messages).values({
      userId: m.userId,
      emotion: m.emotion,
      rawMessage: m.rawMessage,
      context: m.context ?? null,
      transformedMessage: m.transformedMessage,
      communicationElements: m.communicationElements,
      deliveryTips: m.deliveryTips,
      isShared: m.isShared ?? false,
      partnerId: m.partnerId ?? null,
    }).returning();
    return row;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [row] = await db.select().from(messages).where(eq(messages.id, id));
    return row;
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
  }

  async getSharedMessagesForPartner(partnerId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(and(eq(messages.isShared, true), eq(messages.partnerId, partnerId)))
      .orderBy(desc(messages.createdAt));
  }

  async searchMessages(userId: number, query: string): Promise<Message[]> {
    const pattern = `%${query}%`;
    return db.select().from(messages)
      .where(and(
        eq(messages.userId, userId),
        or(
          ilike(messages.rawMessage, pattern),
          ilike(messages.transformedMessage, pattern),
          ilike(messages.emotion, pattern),
        ),
      ))
      .orderBy(desc(messages.createdAt));
  }

  // ─── Responses ─────────────────────────────────────────────────────
  async createResponse(r: InsertResponse): Promise<Response> {
    const [row] = await db.insert(responses).values({
      messageId: r.messageId,
      userId: r.userId,
      content: r.content,
      aiSummary: r.aiSummary ?? null,
    }).returning();
    return row;
  }

  async getResponse(id: number): Promise<Response | undefined> {
    const [row] = await db.select().from(responses).where(eq(responses.id, id));
    return row;
  }

  async getResponsesByMessageId(messageId: number): Promise<Response[]> {
    return db.select().from(responses).where(eq(responses.messageId, messageId)).orderBy(asc(responses.createdAt));
  }

  // ─── Invites ───────────────────────────────────────────────────────
  async createInvite(invite: InsertInvite, token: string): Promise<Invite> {
    const [row] = await db.insert(inviteSchema).values({
      fromUserId: invite.fromUserId,
      partnerFirstName: invite.partnerFirstName,
      partnerLastName: invite.partnerLastName,
      partnerEmail: invite.partnerEmail,
      inviteToken: token,
    }).returning();
    return row;
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [row] = await db.select().from(inviteSchema).where(eq(inviteSchema.inviteToken, token));
    return row;
  }

  async getInvitesByEmail(email: string): Promise<Invite[]> {
    return db.select().from(inviteSchema)
      .where(ilike(inviteSchema.partnerEmail, email.trim()))
      .orderBy(desc(inviteSchema.invitedAt));
  }

  async updateInviteAccepted(id: number): Promise<Invite> {
    const [row] = await db.update(inviteSchema).set({ acceptedAt: new Date() }).where(eq(inviteSchema.id, id)).returning();
    if (!row) throw new Error(`Invite with id ${id} not found`);
    return row;
  }

  // ─── User Preferences ─────────────────────────────────────────────
  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [row] = await db.insert(userPreferences).values({
      userId: prefs.userId,
      loveLanguage: prefs.loveLanguage,
      conflictStyle: prefs.conflictStyle,
      communicationStyle: prefs.communicationStyle,
      repairStyle: prefs.repairStyle,
      preferredAiModel: prefs.preferredAiModel ?? "openai",
    }).returning();
    return row;
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return row;
  }

  async updateUserPreferences(userId: number, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (!existing) throw new Error(`Preferences for user with id ${userId} not found`);
    const [row] = await db.update(userPreferences).set({ ...prefs, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId)).returning();
    return row;
  }

  // ─── Check-in Prompts & Responses ─────────────────────────────────
  async createCheckInPrompt(prompt: InsertCheckInPrompt): Promise<CheckInPrompt> {
    const [row] = await db.insert(checkInPrompts).values({
      prompt: prompt.prompt,
      category: prompt.category,
      active: prompt.active ?? true,
    }).returning();
    return row;
  }

  async getActiveCheckInPrompts(limit: number = 3): Promise<CheckInPrompt[]> {
    return db.select().from(checkInPrompts)
      .where(eq(checkInPrompts.active, true))
      .orderBy(sql`RANDOM()`)
      .limit(limit);
  }

  async getCheckInPrompt(id: number): Promise<CheckInPrompt | undefined> {
    const [row] = await db.select().from(checkInPrompts).where(eq(checkInPrompts.id, id));
    return row;
  }

  async createCheckInResponse(r: InsertCheckInResponse): Promise<CheckInResponse> {
    const [row] = await db.insert(checkInResponses).values({
      userId: r.userId,
      promptId: r.promptId,
      response: r.response,
      weekOf: r.weekOf,
      isShared: r.isShared ?? false,
    }).returning();
    return row;
  }

  async getUserCheckInResponses(userId: number, weekOf?: Date): Promise<CheckInResponse[]> {
    if (weekOf) {
      const weekStart = this.getWeekStart(weekOf);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return db.select().from(checkInResponses)
        .where(and(
          eq(checkInResponses.userId, userId),
          sql`${checkInResponses.weekOf} >= ${weekStart}`,
          sql`${checkInResponses.weekOf} < ${weekEnd}`,
        ));
    }
    return db.select().from(checkInResponses)
      .where(eq(checkInResponses.userId, userId))
      .orderBy(desc(checkInResponses.createdAt));
  }

  async getLatestCheckInWeek(userId: number): Promise<Date | undefined> {
    const [row] = await db.select({ weekOf: checkInResponses.weekOf }).from(checkInResponses)
      .where(eq(checkInResponses.userId, userId))
      .orderBy(desc(checkInResponses.weekOf))
      .limit(1);
    return row ? row.weekOf : undefined;
  }

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  // ─── Appreciations ─────────────────────────────────────────────────
  async createAppreciation(a: InsertAppreciation): Promise<Appreciation> {
    const [row] = await db.insert(appreciations).values({
      userId: a.userId,
      partnerId: a.partnerId,
      content: a.content,
    }).returning();
    return row;
  }

  async getAppreciationsByUserId(userId: number, limit: number = 5): Promise<Appreciation[]> {
    return db.select().from(appreciations)
      .where(eq(appreciations.userId, userId))
      .orderBy(desc(appreciations.createdAt))
      .limit(limit);
  }

  async getAppreciation(id: number): Promise<Appreciation | undefined> {
    const [row] = await db.select().from(appreciations).where(eq(appreciations.id, id));
    return row;
  }

  // ─── Conflict Threads ──────────────────────────────────────────────
  async createConflictThread(t: InsertConflictThread): Promise<ConflictThread> {
    const [row] = await db.insert(conflictThreads).values({
      userId: t.userId,
      partnerId: t.partnerId,
      topic: t.topic,
      lastActivityAt: new Date(),
      needsExtraHelp: t.needsExtraHelp ?? false,
      stuckReason: t.stuckReason ?? null,
    }).returning();
    return row;
  }

  async getConflictThread(id: number): Promise<ConflictThread | undefined> {
    const [row] = await db.select().from(conflictThreads).where(eq(conflictThreads.id, id));
    return row;
  }

  async getConflictThreadsByUserId(userId: number): Promise<ConflictThread[]> {
    return db.select().from(conflictThreads)
      .where(or(eq(conflictThreads.userId, userId), eq(conflictThreads.partnerId, userId)))
      .orderBy(desc(conflictThreads.createdAt));
  }

  async getActiveConflictThreads(userId: number): Promise<ConflictThread[]> {
    return db.select().from(conflictThreads)
      .where(and(
        or(eq(conflictThreads.userId, userId), eq(conflictThreads.partnerId, userId)),
        eq(conflictThreads.status, "active"),
      ))
      .orderBy(desc(conflictThreads.createdAt));
  }

  async updateConflictThreadStatus(id: number, status: string, summary?: string): Promise<ConflictThread> {
    const updateData: Record<string, any> = { status };
    if (status === "resolved") updateData.resolvedAt = new Date();
    if (summary) updateData.resolutionSummary = summary;
    const [row] = await db.update(conflictThreads).set(updateData).where(eq(conflictThreads.id, id)).returning();
    if (!row) throw new Error(`Conflict thread with id ${id} not found`);
    return row;
  }

  async updateConflictResolutionInsights(id: number, insights: string): Promise<ConflictThread> {
    const [row] = await db.update(conflictThreads).set({ resolutionInsights: insights })
      .where(eq(conflictThreads.id, id)).returning();
    if (!row) throw new Error(`Conflict thread with id ${id} not found`);
    return row;
  }

  async updateConflictThreadLastActivity(id: number): Promise<ConflictThread> {
    const [row] = await db.update(conflictThreads).set({ lastActivityAt: new Date() })
      .where(eq(conflictThreads.id, id)).returning();
    if (!row) throw new Error(`Conflict thread with id ${id} not found`);
    return row;
  }

  async markConflictThreadNeedsHelp(id: number, reason?: string): Promise<ConflictThread> {
    const updateData: Record<string, any> = { needsExtraHelp: true };
    if (reason) updateData.stuckReason = reason;
    const [row] = await db.update(conflictThreads).set(updateData).where(eq(conflictThreads.id, id)).returning();
    if (!row) throw new Error(`Conflict thread with id ${id} not found`);
    return row;
  }

  async getStaleConflictThreads(thresholdHours: number): Promise<ConflictThread[]> {
    const threshold = new Date(Date.now() - thresholdHours * 3600_000);
    return db.select().from(conflictThreads)
      .where(and(eq(conflictThreads.status, "active"), lt(conflictThreads.lastActivityAt, threshold)))
      .orderBy(asc(conflictThreads.lastActivityAt));
  }

  // ─── Conflict Messages ─────────────────────────────────────────────
  async createConflictMessage(m: InsertConflictMessage): Promise<ConflictMessage> {
    const [row] = await db.insert(conflictMessages).values({
      threadId: m.threadId,
      userId: m.userId,
      content: m.content,
      emotionalTone: m.emotionalTone ?? null,
      messageType: m.messageType ?? "user",
    }).returning();
    return row;
  }

  async getConflictMessagesByThreadId(threadId: number): Promise<ConflictMessage[]> {
    return db.select().from(conflictMessages)
      .where(eq(conflictMessages.threadId, threadId))
      .orderBy(asc(conflictMessages.createdAt));
  }

  // ─── Direct Messages ───────────────────────────────────────────────
  async createDirectMessage(m: InsertDirectMessage): Promise<DirectMessage> {
    const [row] = await db.insert(directMessages).values({
      senderId: m.senderId,
      recipientId: m.recipientId,
      content: m.content,
    }).returning();
    return row;
  }

  async getDirectMessage(id: number): Promise<DirectMessage | undefined> {
    const [row] = await db.select().from(directMessages).where(eq(directMessages.id, id));
    return row;
  }

  async getUserDirectMessages(userId: number): Promise<DirectMessage[]> {
    return db.select().from(directMessages)
      .where(or(eq(directMessages.recipientId, userId), eq(directMessages.senderId, userId)))
      .orderBy(desc(directMessages.createdAt));
  }

  async getDirectMessageConversation(user1Id: number, user2Id: number, limit: number = 50): Promise<DirectMessage[]> {
    return db.select().from(directMessages)
      .where(or(
        and(eq(directMessages.senderId, user1Id), eq(directMessages.recipientId, user2Id)),
        and(eq(directMessages.senderId, user2Id), eq(directMessages.recipientId, user1Id)),
      ))
      .orderBy(asc(directMessages.createdAt))
      .limit(limit);
  }

  async markDirectMessageAsRead(id: number): Promise<DirectMessage> {
    const [row] = await db.update(directMessages).set({ isRead: true }).where(eq(directMessages.id, id)).returning();
    if (!row) throw new Error(`Direct message with id ${id} not found`);
    return row;
  }

  async getUnreadDirectMessageCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(directMessages)
      .where(and(eq(directMessages.recipientId, userId), eq(directMessages.isRead, false)));
    return result?.count ?? 0;
  }

  // ─── Journal Entries ───────────────────────────────────────────────
  async createJournalEntry(e: InsertJournalEntry): Promise<JournalEntry> {
    const [row] = await db.insert(journalEntries).values({
      userId: e.userId,
      title: e.title,
      content: e.content,
      rawContent: e.rawContent,
      isPrivate: e.isPrivate ?? true,
      isShared: e.isShared ?? false,
      partnerId: e.partnerId ?? null,
      hasPartnerResponse: e.hasPartnerResponse ?? false,
      aiSummary: e.aiSummary ?? null,
      aiRefinedContent: e.aiRefinedContent ?? null,
      emotions: e.emotions ?? null,
      emotionalInsight: e.emotionalInsight ?? null,
      emotionalScore: e.emotionalScore ?? null,
      suggestedResponse: e.suggestedResponse ?? null,
      suggestedBoundary: e.suggestedBoundary ?? null,
      reflectionPrompt: e.reflectionPrompt ?? null,
      patternCategory: e.patternCategory ?? null,
    }).returning();
    return row;
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [row] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return row;
  }

  async getUserJournalEntries(userId: number, isPrivate?: boolean, limit: number = 50): Promise<JournalEntry[]> {
    const conditions = [eq(journalEntries.userId, userId)];
    if (isPrivate !== undefined) conditions.push(eq(journalEntries.isPrivate, isPrivate));
    return db.select().from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);
  }

  async getSharedJournalEntries(userId: number, partnerId: number, limit: number = 50): Promise<JournalEntry[]> {
    return db.select().from(journalEntries)
      .where(and(
        or(eq(journalEntries.userId, userId), eq(journalEntries.userId, partnerId)),
        eq(journalEntries.isShared, true),
      ))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);
  }

  async updateJournalEntry(id: number, data: Partial<InsertJournalEntry>): Promise<JournalEntry> {
    const [row] = await db.update(journalEntries).set({ ...data, updatedAt: new Date() })
      .where(eq(journalEntries.id, id)).returning();
    if (!row) throw new Error(`Journal entry with id ${id} not found`);
    return row;
  }

  async deleteJournalEntry(id: number): Promise<void> {
    const result = await db.delete(journalEntries).where(eq(journalEntries.id, id)).returning();
    if (result.length === 0) throw new Error(`Journal entry with id ${id} not found`);
  }

  // ─── Journal Responses ─────────────────────────────────────────────
  async createJournalResponse(r: InsertJournalResponse): Promise<JournalResponse> {
    const [row] = await db.insert(journalResponses).values({
      journalEntryId: r.journalEntryId,
      userId: r.userId,
      content: r.content,
    }).returning();
    // Mark parent entry as having a partner response
    await db.update(journalEntries).set({ hasPartnerResponse: true })
      .where(eq(journalEntries.id, r.journalEntryId));
    return row;
  }

  async getJournalResponse(id: number): Promise<JournalResponse | undefined> {
    const [row] = await db.select().from(journalResponses).where(eq(journalResponses.id, id));
    return row;
  }

  async getJournalResponsesByEntryId(entryId: number): Promise<JournalResponse[]> {
    return db.select().from(journalResponses)
      .where(eq(journalResponses.journalEntryId, entryId))
      .orderBy(desc(journalResponses.createdAt));
  }

  async deleteJournalResponse(id: number): Promise<void> {
    const result = await db.delete(journalResponses).where(eq(journalResponses.id, id)).returning();
    if (result.length === 0) throw new Error(`Journal response with id ${id} not found`);
  }

  // ─── Memories ──────────────────────────────────────────────────────
  async createMemory(m: InsertMemory): Promise<Memory> {
    const [row] = await db.insert(memories).values({
      title: m.title,
      description: m.description,
      type: m.type as typeof memoryTypes[number],
      userId: m.userId,
      partnershipId: m.partnershipId,
      date: m.date ?? new Date(),
      isSignificant: m.isSignificant ?? false,
      linkedItemId: m.linkedItemId ?? null,
      linkedItemType: m.linkedItemType ?? null,
      imageUrl: m.imageUrl ?? null,
      tags: m.tags ?? [],
    }).returning();
    return row;
  }

  async getMemory(id: number): Promise<Memory | undefined> {
    const [row] = await db.select().from(memories).where(eq(memories.id, id));
    return row;
  }

  async getMemoriesByUserId(userId: number, limit: number = 20): Promise<Memory[]> {
    return db.select().from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.date))
      .limit(limit);
  }

  async getMemoriesByPartnershipId(partnershipId: number, limit: number = 20): Promise<Memory[]> {
    return db.select().from(memories)
      .where(eq(memories.partnershipId, partnershipId))
      .orderBy(desc(memories.date))
      .limit(limit);
  }

  async getSignificantMemories(partnershipId: number, limit: number = 10): Promise<Memory[]> {
    return db.select().from(memories)
      .where(and(eq(memories.partnershipId, partnershipId), eq(memories.isSignificant, true)))
      .orderBy(desc(memories.date))
      .limit(limit);
  }

  async getMemoriesByType(partnershipId: number, type: string, limit: number = 10): Promise<Memory[]> {
    return db.select().from(memories)
      .where(and(eq(memories.partnershipId, partnershipId), eq(memories.type, type as typeof memoryTypes[number])))
      .orderBy(desc(memories.date))
      .limit(limit);
  }

  async searchMemories(partnershipId: number, query: string): Promise<Memory[]> {
    const pattern = `%${query}%`;
    return db.select().from(memories)
      .where(and(
        eq(memories.partnershipId, partnershipId),
        or(ilike(memories.title, pattern), ilike(memories.description, pattern)),
      ))
      .orderBy(desc(memories.date));
  }

  async updateMemory(id: number, data: Partial<InsertMemory>): Promise<Memory> {
    const updateData: Record<string, any> = { ...data };
    if (data.type) updateData.type = data.type as typeof memoryTypes[number];
    const [row] = await db.update(memories).set(updateData).where(eq(memories.id, id)).returning();
    if (!row) throw new Error(`Memory with id ${id} not found`);
    return row;
  }

  async deleteMemory(id: number): Promise<void> {
    const result = await db.delete(memories).where(eq(memories.id, id)).returning();
    if (result.length === 0) throw new Error(`Memory with id ${id} not found`);
  }

  // ─── Therapists ────────────────────────────────────────────────────
  async createTherapist(t: InsertTherapist): Promise<Therapist> {
    const [row] = await db.insert(therapists).values({
      name: t.name,
      title: t.title,
      bio: t.bio,
      specialties: t.specialties,
      modalities: t.modalities,
      websiteUrl: t.websiteUrl ?? null,
      phoneNumber: t.phoneNumber ?? null,
      email: t.email ?? null,
      imageUrl: t.imageUrl ?? null,
      location: t.location ?? null,
      isVerified: t.isVerified ?? false,
    }).returning();
    return row;
  }

  async getTherapist(id: number): Promise<Therapist | undefined> {
    const [row] = await db.select().from(therapists).where(eq(therapists.id, id));
    return row;
  }

  async getAllTherapists(): Promise<Therapist[]> {
    return db.select().from(therapists).orderBy(asc(therapists.name));
  }

  async getTherapistsBySpecialty(specialty: string): Promise<Therapist[]> {
    return db.select().from(therapists)
      .where(sql`${specialty} = ANY(${therapists.specialties})`)
      .orderBy(asc(therapists.name));
  }

  async getTherapistsByModality(modality: string): Promise<Therapist[]> {
    return db.select().from(therapists)
      .where(sql`${modality} = ANY(${therapists.modalities})`)
      .orderBy(asc(therapists.name));
  }

  async getRecommendedTherapists(specialties?: string[], modalities?: string[], limit: number = 5): Promise<Therapist[]> {
    const all = await db.select().from(therapists);
    let filtered = all;
    if (specialties?.length) {
      filtered = filtered.filter(t => specialties.some(s => t.specialties.includes(s)));
    }
    if (modalities?.length) {
      filtered = filtered.filter(t => modalities.some(m => t.modalities.includes(m)));
    }
    filtered.sort((a, b) => {
      const aScore = (specialties?.filter(s => a.specialties.includes(s)).length ?? 0) +
                     (modalities?.filter(m => a.modalities.includes(m)).length ?? 0);
      const bScore = (specialties?.filter(s => b.specialties.includes(s)).length ?? 0) +
                     (modalities?.filter(m => b.modalities.includes(m)).length ?? 0);
      return bScore !== aScore ? bScore - aScore : a.name.localeCompare(b.name);
    });
    return filtered.slice(0, limit);
  }

  // ─── Push Subscriptions ────────────────────────────────────────────
  async createPushSubscription(s: InsertPushSubscription): Promise<PushSubscription> {
    const [row] = await db.insert(pushSubscriptions).values({
      userId: s.userId,
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
    }).returning();
    return row;
  }

  async getPushSubscription(id: number): Promise<PushSubscription | undefined> {
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    return row;
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return row;
  }

  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async saveNotificationSubscription(userId: number, subscription: any): Promise<PushSubscription> {
    const existing = await this.getPushSubscriptionByEndpoint(subscription.endpoint);
    if (existing) return existing;
    return this.createPushSubscription({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }

  async removeNotificationSubscription(userId: number, endpoint: string): Promise<void> {
    await this.deletePushSubscriptionByEndpoint(endpoint);
  }

  async getNotificationSubscriptions(userId: number): Promise<PushSubscription[]> {
    return this.getPushSubscriptionsByUserId(userId);
  }

  // ─── Notification Preferences ──────────────────────────────────────
  async createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const [row] = await db.insert(notificationPreferences).values({
      userId: prefs.userId,
      newConflicts: prefs.newConflicts ?? true,
      partnerEmotions: prefs.partnerEmotions ?? true,
      directMessages: prefs.directMessages ?? true,
      conflictUpdates: prefs.conflictUpdates ?? true,
      weeklyCheckIns: prefs.weeklyCheckIns ?? true,
      appreciations: prefs.appreciations ?? true,
      exerciseNotifications: prefs.exerciseNotifications ?? true,
    }).returning();
    return row;
  }

  async getNotificationPreferences(userId: number): Promise<NotificationPreferences | undefined> {
    const [row] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return row;
  }

  async updateNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [row] = await db.update(notificationPreferences).set({ ...prefs, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId)).returning();
      return row;
    }
    return this.createNotificationPreferences({
      userId,
      newConflicts: prefs.newConflicts ?? true,
      partnerEmotions: prefs.partnerEmotions ?? true,
      directMessages: prefs.directMessages ?? true,
      conflictUpdates: prefs.conflictUpdates ?? true,
      weeklyCheckIns: prefs.weeklyCheckIns ?? true,
      appreciations: prefs.appreciations ?? true,
      exerciseNotifications: prefs.exerciseNotifications ?? true,
    });
  }

  // ─── Current Emotions ──────────────────────────────────────────────
  async getCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined> {
    const [row] = await db.select().from(currentEmotions).where(eq(currentEmotions.userId, userId));
    return row;
  }

  async setCurrentEmotion(emotion: InsertCurrentEmotion): Promise<CurrentEmotion> {
    const existing = await this.getCurrentEmotion(emotion.userId);
    if (existing) return this.updateCurrentEmotion(emotion.userId, emotion);
    const [row] = await db.insert(currentEmotions).values({
      userId: emotion.userId,
      emotion: emotion.emotion,
      intensity: emotion.intensity ?? 5,
      note: emotion.note ?? null,
    }).returning();
    return row;
  }

  async updateCurrentEmotion(userId: number, data: Partial<InsertCurrentEmotion>): Promise<CurrentEmotion> {
    const existing = await this.getCurrentEmotion(userId);
    if (!existing) {
      return this.setCurrentEmotion({
        userId,
        emotion: data.emotion ?? "neutral",
        intensity: data.intensity ?? 5,
        note: data.note,
      });
    }
    const [row] = await db.update(currentEmotions).set({ ...data, updatedAt: new Date() })
      .where(eq(currentEmotions.userId, userId)).returning();
    return row;
  }

  async getPartnerCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined> {
    const partnership = await this.getPartnershipByUser(userId);
    if (!partnership || partnership.status !== "active") return undefined;
    const partnerId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
    return this.getCurrentEmotion(partnerId);
  }

  // ─── Exercise Templates ────────────────────────────────────────────
  async createExerciseTemplate(t: InsertExerciseTemplate): Promise<ExerciseTemplate> {
    const [row] = await db.insert(exerciseTemplates).values({
      title: t.title,
      description: t.description,
      type: t.type,
      totalSteps: t.totalSteps,
      difficultyLevel: t.difficultyLevel,
      estimatedTimeMinutes: t.estimatedTimeMinutes,
      steps: t.steps,
      templateData: t.templateData,
    }).returning();
    return row;
  }

  async getExerciseTemplate(id: number): Promise<ExerciseTemplate | undefined> {
    const [row] = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.id, id));
    return row;
  }

  async getExerciseTemplates(type?: string, difficultyLevel?: string): Promise<ExerciseTemplate[]> {
    const conditions: any[] = [];
    if (type) conditions.push(eq(exerciseTemplates.type, type as any));
    if (difficultyLevel) conditions.push(eq(exerciseTemplates.difficultyLevel, difficultyLevel));
    const query = conditions.length > 0
      ? db.select().from(exerciseTemplates).where(and(...conditions))
      : db.select().from(exerciseTemplates);
    return query.orderBy(asc(exerciseTemplates.title));
  }

  // ─── Communication Exercises ───────────────────────────────────────
  async createExercise(e: InsertExercise): Promise<CommunicationExercise> {
    const [row] = await db.insert(communicationExercises).values({
      partnershipId: e.partnershipId,
      initiatorId: e.initiatorId,
      partnerId: e.partnerId,
      templateId: e.templateId ?? null,
      title: e.title,
      description: e.description,
      type: e.type,
      status: "in_progress",
      currentStepNumber: e.currentStepNumber ?? 1,
      totalSteps: e.totalSteps,
      currentUserId: e.currentUserId ?? e.initiatorId,
      scheduledFor: e.scheduledFor ?? new Date(),
      user1Progress: e.user1Progress ?? "{}",
      user2Progress: e.user2Progress ?? "{}",
    }).returning();
    return row;
  }

  async getExerciseById(id: number): Promise<CommunicationExercise | undefined> {
    const [row] = await db.select().from(communicationExercises).where(eq(communicationExercises.id, id));
    return row;
  }

  async getExercisesByPartnership(partnershipId: number, status?: string): Promise<CommunicationExercise[]> {
    const conditions = [eq(communicationExercises.partnershipId, partnershipId)];
    if (status) conditions.push(eq(communicationExercises.status, status as any));
    return db.select().from(communicationExercises)
      .where(and(...conditions))
      .orderBy(desc(communicationExercises.lastUpdatedAt));
  }

  async getExercisesForUser(userId: number, status?: string): Promise<CommunicationExercise[]> {
    const conditions = [
      or(eq(communicationExercises.initiatorId, userId), eq(communicationExercises.partnerId, userId)),
    ];
    if (status) conditions.push(eq(communicationExercises.status, status as any));
    return db.select().from(communicationExercises)
      .where(and(...conditions))
      .orderBy(desc(communicationExercises.lastUpdatedAt));
  }

  async updateExerciseStatus(id: number, status: string): Promise<CommunicationExercise> {
    const now = new Date();
    const updateData: Record<string, any> = { status, lastUpdatedAt: now };
    if (status === "completed") updateData.completedAt = now;
    const [row] = await db.update(communicationExercises).set(updateData)
      .where(eq(communicationExercises.id, id)).returning();
    if (!row) throw new Error(`Exercise with id ${id} not found`);
    return row;
  }

  async updateExerciseCurrentStep(id: number, stepNumber: number): Promise<CommunicationExercise> {
    const [row] = await db.update(communicationExercises)
      .set({ currentStepNumber: stepNumber, lastUpdatedAt: new Date() })
      .where(eq(communicationExercises.id, id)).returning();
    if (!row) throw new Error(`Exercise with id ${id} not found`);
    return row;
  }

  async updateExerciseCurrentUser(id: number, userId: number): Promise<CommunicationExercise> {
    const exercise = await this.getExerciseById(id);
    if (!exercise) throw new Error(`Exercise with id ${id} not found`);
    if (userId !== exercise.initiatorId && userId !== exercise.partnerId) {
      throw new Error(`User ${userId} is not part of this exercise`);
    }
    const [row] = await db.update(communicationExercises)
      .set({ currentUserId: userId, lastUpdatedAt: new Date() })
      .where(eq(communicationExercises.id, id)).returning();
    return row;
  }

  async completeExercise(id: number): Promise<CommunicationExercise> {
    const now = new Date();
    const [row] = await db.update(communicationExercises)
      .set({ status: "completed", completedAt: now, lastUpdatedAt: now })
      .where(eq(communicationExercises.id, id)).returning();
    if (!row) throw new Error(`Exercise with id ${id} not found`);
    return row;
  }

  // ─── Exercise Steps ────────────────────────────────────────────────
  async createExerciseStep(s: InsertExerciseStep): Promise<ExerciseStep> {
    const [row] = await db.insert(exerciseSteps).values({
      exerciseId: s.exerciseId,
      stepNumber: s.stepNumber,
      title: s.title,
      instructions: s.instructions ?? "",
      promptText: s.promptText,
      expectedResponseType: s.expectedResponseType,
      options: s.options ?? "[]",
      requiredForCompletion: s.requiredForCompletion ?? true,
      userRole: s.userRole ?? "both",
      timeEstimate: s.timeEstimate ?? null,
    }).returning();
    return row;
  }

  async getExerciseStepById(id: number): Promise<ExerciseStep | undefined> {
    const [row] = await db.select().from(exerciseSteps).where(eq(exerciseSteps.id, id));
    return row;
  }

  async getExerciseSteps(exerciseId: number): Promise<ExerciseStep[]> {
    return db.select().from(exerciseSteps)
      .where(eq(exerciseSteps.exerciseId, exerciseId))
      .orderBy(asc(exerciseSteps.stepNumber));
  }

  async getExerciseStepByNumber(exerciseId: number, stepNumber: number): Promise<ExerciseStep | undefined> {
    const [row] = await db.select().from(exerciseSteps)
      .where(and(eq(exerciseSteps.exerciseId, exerciseId), eq(exerciseSteps.stepNumber, stepNumber)));
    return row;
  }

  // ─── Exercise Responses ────────────────────────────────────────────
  async createExerciseResponse(r: InsertExerciseResponse): Promise<ExerciseResponse> {
    const [row] = await db.insert(exerciseResponses).values({
      exerciseId: r.exerciseId,
      stepId: r.stepId,
      userId: r.userId,
      responseText: r.responseText ?? null,
      responseOption: r.responseOption ?? null,
      audioUrl: r.audioUrl ?? null,
      aiAnalysis: r.aiAnalysis ?? null,
      isCompleted: r.isCompleted ?? true,
    }).returning();
    return row;
  }

  async getExerciseResponses(exerciseId: number, userId?: number): Promise<ExerciseResponse[]> {
    const conditions = [eq(exerciseResponses.exerciseId, exerciseId)];
    if (userId) conditions.push(eq(exerciseResponses.userId, userId));
    return db.select().from(exerciseResponses)
      .where(and(...conditions))
      .orderBy(asc(exerciseResponses.createdAt));
  }

  async getExerciseStepResponses(stepId: number): Promise<ExerciseResponse[]> {
    return db.select().from(exerciseResponses)
      .where(eq(exerciseResponses.stepId, stepId))
      .orderBy(asc(exerciseResponses.createdAt));
  }

  async getUserResponseForStep(stepId: number, userId: number): Promise<ExerciseResponse | undefined> {
    const [row] = await db.select().from(exerciseResponses)
      .where(and(eq(exerciseResponses.stepId, stepId), eq(exerciseResponses.userId, userId)));
    return row;
  }
}
