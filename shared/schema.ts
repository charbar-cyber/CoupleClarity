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
  avatarUrl: text("avatar_url"),
  relationshipGoals: text("relationship_goals"),
  challengeAreas: text("challenge_areas"),
  communicationFrequency: text("communication_frequency"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  relationshipGoals: true,
  challengeAreas: true,
  communicationFrequency: true,
  onboardingCompleted: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const partnerships = pgTable("partnerships", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull(),
  user2Id: integer("user2_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, inactive
  startDate: timestamp("start_date"),
  relationshipType: text("relationship_type"), // dating, engaged, married, etc.
  anniversaryDate: timestamp("anniversary_date"),
  meetingStory: text("meeting_story"), // how the couple met
  coupleNickname: text("couple_nickname"), // nickname for the couple
  sharedPicture: text("shared_picture"), // URL to a shared couple image
  relationshipGoals: text("relationship_goals"), // shared goals of the couple
  privacyLevel: text("privacy_level").default("standard").notNull(), // private, standard, public
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartnershipSchema = createInsertSchema(partnerships).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;
export type Partnership = typeof partnerships.$inferSelect;

// Relationship types
export const relationshipTypeOptions = ['dating', 'engaged', 'married', 'domestic_partners', 'other'] as const;

// Privacy levels
export const privacyLevelOptions = ['private', 'standard', 'public'] as const;

// Relationship milestones
export const relationshipMilestones = pgTable("relationship_milestones", {
  id: serial("id").primaryKey(),
  partnershipId: integer("partnership_id").notNull().references(() => partnerships.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // first_date, first_kiss, moved_in, engagement, etc.
  imageUrl: text("image_url"),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMilestoneSchema = createInsertSchema(relationshipMilestones).omit({
  id: true,
  createdAt: true,
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof relationshipMilestones.$inferSelect;

// Milestone types
export const milestoneTypeOptions = [
  'first_date', 
  'first_kiss', 
  'said_i_love_you', 
  'moved_in', 
  'engagement', 
  'wedding', 
  'anniversary',
  'vacation',
  'other'
] as const;

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
export const aiModelOptions = ['openai', 'anthropic'] as const;

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  loveLanguage: text("love_language").notNull(),
  conflictStyle: text("conflict_style").notNull(),
  communicationStyle: text("communication_style").notNull(),
  repairStyle: text("repair_style").notNull(),
  preferredAiModel: text("preferred_ai_model").default('openai').notNull(),
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

// Frequency options for communication
export const communicationFrequencyOptions = ['daily', 'few_times_week', 'weekly', 'few_times_month', 'monthly_or_less'] as const;

// Questionnaire schema for onboarding (personal preferences part)
export const onboardingQuestionnaireSchema = z.object({
  loveLanguage: z.enum(loveLanguageOptions),
  conflictStyle: z.enum(conflictStyleOptions),
  communicationStyle: z.enum(communicationStyleOptions),
  repairStyle: z.enum(repairStyleOptions),
});

// Enhanced questionnaire schema that includes relationship goals and challenges
export const enhancedOnboardingSchema = z.object({
  // Personal preferences
  loveLanguage: z.enum(loveLanguageOptions),
  conflictStyle: z.enum(conflictStyleOptions),
  communicationStyle: z.enum(communicationStyleOptions),
  repairStyle: z.enum(repairStyleOptions),
  
  // Relationship-specific questions
  relationshipGoals: z.string().min(5, "Please share at least a brief description of your goals"),
  challengeAreas: z.string().min(5, "Please share at least a brief description of challenges"),
  communicationFrequency: z.enum(communicationFrequencyOptions),
});

export type OnboardingQuestionnaire = z.infer<typeof onboardingQuestionnaireSchema>;
export type EnhancedOnboardingQuestionnaire = z.infer<typeof enhancedOnboardingSchema>;

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
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolutionSummary: text("resolution_summary"),
  resolutionInsights: text("resolution_insights"),
  needsExtraHelp: boolean("needs_extra_help").default(false).notNull(),
  stuckReason: text("stuck_reason"),
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
  messageType: text("message_type").default("user").notNull(),
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

// Schema for updating couple profiles
export const coupleProfileSchema = z.object({
  relationshipType: z.enum(relationshipTypeOptions).optional(),
  anniversaryDate: z.string().optional(), // ISO date string
  meetingStory: z.string().optional(),
  coupleNickname: z.string().optional(),
  sharedPicture: z.string().optional(), // URL
  relationshipGoals: z.string().optional(),
  privacyLevel: z.enum(privacyLevelOptions).optional(),
});

export type CoupleProfileInput = z.infer<typeof coupleProfileSchema>;

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

// Journal entries schema
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  rawContent: text("raw_content").notNull(),
  isPrivate: boolean("is_private").notNull().default(true),
  isShared: boolean("is_shared").notNull().default(false),
  partnerId: integer("partner_id").references(() => users.id),
  aiSummary: text("ai_summary"),
  aiRefinedContent: text("ai_refined_content"),
  emotions: text("emotions").array(),
  emotionalInsight: text("emotional_insight"),
  emotionalScore: integer("emotional_score"),
  suggestedResponse: text("suggested_response"),
  suggestedBoundary: text("suggested_boundary"),
  reflectionPrompt: text("reflection_prompt"),
  patternCategory: text("pattern_category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// Journal entry form schema
export const journalEntrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  rawContent: z.string(),
  isPrivate: z.boolean().default(true),
  isShared: z.boolean().default(false),
  partnerId: z.number().optional(),
  emotions: z.array(z.string()).optional(),
  // AI analysis fields
  aiSummary: z.string().optional(),
  aiRefinedContent: z.string().optional(),
  emotionalInsight: z.string().optional(),
  emotionalScore: z.number().optional(),
  suggestedResponse: z.string().optional(),
  suggestedBoundary: z.string().optional(),
  reflectionPrompt: z.string().optional(),
  patternCategory: z.string().optional(),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

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

// Therapist specialties
export const therapistSpecialties = [
  'couples_counseling', 
  'communication', 
  'emotional_disconnect', 
  'trauma', 
  'conflict_resolution',
  'behavioral_therapy',
  'family_therapy'
] as const;

// Therapy modalities
export const therapyModalities = [
  'in_person', 
  'online', 
  'phone', 
  'text_based'
] as const;

// Therapist recommendations
// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Current emotions table to track what each user is currently feeling
export const currentEmotions = pgTable("current_emotions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  emotion: text("emotion").notNull(),
  intensity: integer("intensity").default(5).notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCurrentEmotionSchema = createInsertSchema(currentEmotions).omit({
  id: true,
  updatedAt: true,
});

export type InsertCurrentEmotion = z.infer<typeof insertCurrentEmotionSchema>;
export type CurrentEmotion = typeof currentEmotions.$inferSelect;

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  newConflicts: boolean("new_conflicts").default(true).notNull(),
  partnerEmotions: boolean("partner_emotions").default(true).notNull(),
  directMessages: boolean("direct_messages").default(true).notNull(),
  conflictUpdates: boolean("conflict_updates").default(true).notNull(),
  weeklyCheckIns: boolean("weekly_check_ins").default(true).notNull(),
  appreciations: boolean("appreciations").default(true).notNull(),
  exerciseNotifications: boolean("exercise_notifications").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(), // e.g., "LMFT", "PhD", "PsyD"
  bio: text("bio").notNull(),
  specialties: text("specialties").array().notNull(),
  modalities: text("modalities").array().notNull(),
  websiteUrl: text("website_url"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  imageUrl: text("image_url"),
  location: text("location"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Communication exercises schema
export const exerciseTypeOptions = [
  'active_listening',
  'emotion_awareness',
  'needs_expression',
  'conflict_resolution',
  'appreciation_sharing',
  'future_planning',
  'empathy_building'
] as const;

export const exerciseStatusOptions = [
  'not_started',
  'in_progress',
  'completed',
  'partner_turn'
] as const;

export const communicationExercises = pgTable("communication_exercises", {
  id: serial("id").primaryKey(),
  partnershipId: integer("partnership_id").notNull().references(() => partnerships.id),
  initiatorId: integer("initiator_id").notNull().references(() => users.id),
  partnerId: integer("partner_id").notNull().references(() => users.id),
  templateId: integer("template_id").references(() => exerciseTemplates.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: exerciseTypeOptions }).notNull(),
  status: text("status", { enum: exerciseStatusOptions }).default("not_started").notNull(),
  currentStep: integer("current_step").default(1).notNull(),
  currentStepNumber: integer("current_step_number").default(1).notNull(),
  totalSteps: integer("total_steps").notNull(),
  currentUserId: integer("current_user_id").references(() => users.id),
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  completedAt: timestamp("completed_at"),
  user1Progress: text("user1_progress").default("{}").notNull(),
  user2Progress: text("user2_progress").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});

export const insertExerciseSchema = createInsertSchema(communicationExercises).omit({
  id: true,
  status: true,
  currentStep: true,
  completedAt: true,
  createdAt: true,
});

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type CommunicationExercise = typeof communicationExercises.$inferSelect;

export const exerciseSteps = pgTable("exercise_steps", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").notNull().references(() => communicationExercises.id),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  promptText: text("prompt_text").notNull(),
  expectedResponseType: text("expected_response_type").notNull(), // text, multiple_choice, audio, etc.
  options: text("options").default("[]"), // JSON array of options for multiple choice
  requiredForCompletion: boolean("required_for_completion").default(true).notNull(),
  userRole: text("user_role").default("both").notNull(), // user1, user2, both
  timeEstimate: integer("time_estimate"), // estimated time in minutes to complete this step
});

export const insertExerciseStepSchema = createInsertSchema(exerciseSteps).omit({
  id: true,
});

export type InsertExerciseStep = z.infer<typeof insertExerciseStepSchema>;
export type ExerciseStep = typeof exerciseSteps.$inferSelect;

export const exerciseResponses = pgTable("exercise_responses", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").notNull().references(() => communicationExercises.id),
  stepId: integer("step_id").notNull().references(() => exerciseSteps.id),
  userId: integer("user_id").notNull().references(() => users.id),
  responseText: text("response_text"),
  responseOption: text("response_option"),
  audioUrl: text("audio_url"),
  aiAnalysis: text("ai_analysis"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExerciseResponseSchema = createInsertSchema(exerciseResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertExerciseResponse = z.infer<typeof insertExerciseResponseSchema>;
export type ExerciseResponse = typeof exerciseResponses.$inferSelect;

// Exercise template for predefined exercises
export const exerciseTemplates = pgTable("exercise_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: exerciseTypeOptions }).notNull(),
  totalSteps: integer("total_steps").notNull(),
  difficultyLevel: text("difficulty_level").notNull(), // beginner, intermediate, advanced
  estimatedTimeMinutes: integer("estimated_time_minutes").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  steps: text("steps").notNull(), // JSON array of step objects
  templateData: text("template_data").notNull(), // JSON data with additional config
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExerciseTemplateSchema = createInsertSchema(exerciseTemplates).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export type InsertExerciseTemplate = z.infer<typeof insertExerciseTemplateSchema>;
export type ExerciseTemplate = typeof exerciseTemplates.$inferSelect;

// Exercise progress update schema
export const exerciseProgressSchema = z.object({
  exerciseId: z.number(),
  stepId: z.number(),
  responseText: z.string().optional(),
  responseOption: z.string().optional(),
  audioUrl: z.string().optional(),
  moveToNextStep: z.boolean().optional(),
  completeExercise: z.boolean().optional(),
});

export type ExerciseProgressInput = z.infer<typeof exerciseProgressSchema>;

export const insertTherapistSchema = createInsertSchema(therapists)
  .omit({ id: true, createdAt: true })
  .extend({
    specialties: z.array(z.enum(therapistSpecialties)),
    modalities: z.array(z.enum(therapyModalities))
  });

export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

// Schema for requesting extra help
export const requestHelpSchema = z.object({
  threadId: z.number(),
  reason: z.string().min(1, "Please provide a reason why this conflict is difficult to resolve"),
  preferences: z.object({
    preferredModalities: z.array(z.enum(therapyModalities)),
    preferredSpecialties: z.array(z.enum(therapistSpecialties)).optional(),
    additionalNotes: z.string().optional()
  }).optional()
});

export type RequestHelpInput = z.infer<typeof requestHelpSchema>;

// Schema for creating relationship milestones
export const milestoneSchema = z.object({
  partnershipId: z.number(),
  title: z.string().min(1, "Please provide a title for this milestone"),
  description: z.string().optional(),
  date: z.string(), // ISO date string
  type: z.enum(milestoneTypeOptions),
  imageUrl: z.string().url().optional(),
  isPrivate: z.boolean().default(false)
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;

// Schema for avatar generation and update
export const avatarPromptSchema = z.object({
  prompt: z.string().min(10, "Please provide a detailed description for the AI to generate a good avatar"),
  userId: z.number(),
});

export type AvatarPromptInput = z.infer<typeof avatarPromptSchema>;

export const updateAvatarSchema = z.object({
  userId: z.number(),
  avatarUrl: z.string().url("Please provide a valid URL for the avatar image"),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
