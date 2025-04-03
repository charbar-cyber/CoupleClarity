import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Preference option types
export const loveLanguageOptions = ['words_of_affirmation', 'quality_time', 'acts_of_service', 'physical_touch', 'gifts'] as const;
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartnershipSchema = createInsertSchema(partnerships).omit({
  id: true,
  status: true,
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
