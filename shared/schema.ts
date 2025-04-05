import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Preference option types
export const loveLanguageOptions = ['words_of_affirmation', 'quality_time', 'acts_of_service', 'physical_touch', 'gifts', 'not_sure'] as const;
export const conflictStyleOptions = ['avoid', 'emotional', 'talk_calmly', 'need_space', 'not_sure'] as const;
export const communicationStyleOptions = ['gentle', 'direct', 'structured', 'supportive', 'light'] as const;
export const repairStyleOptions = ['apology', 'space_checkin', 'physical_closeness', 'caring_message', 'talking'] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  displayName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const partnerships = pgTable("partnerships", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull(),
  user2Id: integer("user2_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, inactive
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartnershipSchema = createInsertSchema(partnerships).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;
export type Partnership = typeof partnerships.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  emotion: text("emotion").notNull(),
  rawMessage: text("raw_message").notNull(),
  context: text("context"),
  transformedMessage: text("transformed_message").notNull(),
  communicationElements: text("communication_elements").notNull(),
  deliveryTips: text("delivery_tips").notNull(),
  isShared: boolean("is_shared").default(false).notNull(),
  partnerId: integer("partner_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  createdAt: true,
});

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

export const emotionSchema = z.object({
  emotion: z.string().min(1, "Emotion is required"),
  rawMessage: z.string().min(1, "Message is required").max(500, "Message is too long"),
  context: z.string().optional(),
  saveToHistory: z.boolean().default(true),
  shareWithPartner: z.boolean().default(false),
  partnerId: z.number().optional(),
});

export type EmotionInput = z.infer<typeof emotionSchema>;

export const transformationResponseSchema = z.object({
  transformedMessage: z.string(),
  communicationElements: z.array(z.string()),
  deliveryTips: z.array(z.string()),
  messageId: z.number().optional(),
});

export type TransformationResponse = z.infer<typeof transformationResponseSchema>;

export const responseSchema = z.object({
  messageId: z.number(),
  content: z.string().min(1, "Response is required").max(500, "Response is too long"),
});

export type ResponseInput = z.infer<typeof responseSchema>;

// Partner invite schema
export const inviteSchema = pgTable("invites", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  partnerFirstName: text("partner_first_name").notNull(),
  partnerLastName: text("partner_last_name").notNull(),
  partnerEmail: text("partner_email").notNull().unique(),
  inviteToken: text("invite_token").notNull().unique(),
  acceptedAt: timestamp("accepted_at"),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
});

export const insertInviteSchema = createInsertSchema(inviteSchema).omit({
  id: true,
  inviteToken: true,
  acceptedAt: true,
  invitedAt: true,
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof inviteSchema.$inferSelect;

// Registration schema with both user and partner info
export const registrationSchema = z.object({
  // User information
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  
  // Partner information (optional if user is accepting an invite)
  partnerFirstName: z.string().min(1, "Partner's first name is required").optional(),
  partnerLastName: z.string().min(1, "Partner's last name is required").optional(),
  partnerEmail: z.string().email("Invalid partner email address").optional(),
  
  // If user is accepting an invite
  inviteToken: z.string().optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// User preferences schema
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  loveLanguage: text("love_language").notNull(),
  conflictStyle: text("conflict_style").notNull(),
  communicationStyle: text("communication_style").notNull(),
  repairStyle: text("repair_style").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Questionnaire schema for onboarding
export const onboardingQuestionnaireSchema = z.object({
  loveLanguage: z.enum(loveLanguageOptions),
  conflictStyle: z.enum(conflictStyleOptions),
  communicationStyle: z.enum(communicationStyleOptions),
  repairStyle: z.enum(repairStyleOptions),
});

export type OnboardingQuestionnaire = z.infer<typeof onboardingQuestionnaireSchema>;

// Weekly check-in schemas
export const checkInPrompts = pgTable("check_in_prompts", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  category: text("category").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCheckInPromptSchema = createInsertSchema(checkInPrompts).omit({
  id: true,
  createdAt: true,
});

export type InsertCheckInPrompt = z.infer<typeof insertCheckInPromptSchema>;
export type CheckInPrompt = typeof checkInPrompts.$inferSelect;

export const checkInResponses = pgTable("check_in_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  promptId: integer("prompt_id").notNull().references(() => checkInPrompts.id),
  response: text("response").notNull(),
  weekOf: timestamp("week_of").notNull(),
  isShared: boolean("is_shared").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCheckInResponseSchema = createInsertSchema(checkInResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertCheckInResponse = z.infer<typeof insertCheckInResponseSchema>;
export type CheckInResponse = typeof checkInResponses.$inferSelect;

export const checkInSchema = z.object({
  responses: z.array(z.object({
    promptId: z.number(),
    response: z.string().min(1, "Response cannot be empty"),
  })),
  isShared: z.boolean().default(false),
});

export type CheckInSubmission = z.infer<typeof checkInSchema>;

// Appreciation log schema
export const appreciations = pgTable("appreciations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  partnerId: integer("partner_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppreciationSchema = createInsertSchema(appreciations).omit({
  id: true,
  createdAt: true,
});

export type InsertAppreciation = z.infer<typeof insertAppreciationSchema>;
export type Appreciation = typeof appreciations.$inferSelect;

// Conflict thread statuses
export const conflictStatusOptions = ['active', 'resolved', 'abandoned'] as const;

// Conflict threads table
export const conflictThreads = pgTable("conflict_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  partnerId: integer("partner_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  status: text("status", { enum: conflictStatusOptions }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolutionSummary: text("resolution_summary"),
  resolutionInsights: text("resolution_insights"),
});

export const insertConflictThreadSchema = createInsertSchema(conflictThreads).omit({
  id: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolutionSummary: true,
  resolutionInsights: true,
});

export type InsertConflictThread = z.infer<typeof insertConflictThreadSchema>;
export type ConflictThread = typeof conflictThreads.$inferSelect;

// Conflict thread messages
export const conflictMessages = pgTable("conflict_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => conflictThreads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  emotionalTone: text("emotional_tone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConflictMessageSchema = createInsertSchema(conflictMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertConflictMessage = z.infer<typeof insertConflictMessageSchema>;
export type ConflictMessage = typeof conflictMessages.$inferSelect;

// Schema for conflict resolution form
export const resolveConflictSchema = z.object({
  threadId: z.number(),
  summary: z.string().min(1, "Please provide a brief summary of how this conflict was resolved"),
  insights: z.string().optional(),
});

export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>;

// Direct messages schema
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;

// Schema for detailed conflict initiation form
export const conflictInitiationSchema = z.object({
  topic: z.string().min(1, "Please provide a topic for this conflict"),
  situation: z.string().min(1, "Please describe the situation"),
  feelings: z.string().min(1, "Please describe your feelings"),
  impact: z.string().min(1, "Please describe the impact"),
  request: z.string().min(1, "Please describe what you'd like to happen"),
  partnerId: z.number(),
});

export type ConflictInitiationInput = z.infer<typeof conflictInitiationSchema>;

// Memory types
export const memoryTypes = ['conflict_resolution', 'milestone', 'appreciation', 'check_in', 'custom'] as const;

// Memories table
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().$type<typeof memoryTypes[number]>(),
  date: timestamp("date").notNull().defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  partnershipId: integer("partnership_id").notNull().references(() => partnerships.id),
  // Can be null if the memory is not linked to a specific item
  linkedItemId: integer("linked_item_id"),
  linkedItemType: text("linked_item_type"),
  isSignificant: boolean("is_significant").default(false).notNull(),
  imageUrl: text("image_url"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memories)
  .omit({ id: true, createdAt: true })
  .extend({
    tags: z.array(z.string()).optional(),
  });

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
