import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  emotion: text("emotion").notNull(),
  rawMessage: text("raw_message").notNull(),
  context: text("context"),
  transformedMessage: text("transformed_message").notNull(),
  communicationElements: text("communication_elements").notNull(),
  deliveryTips: text("delivery_tips").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const emotionSchema = z.object({
  emotion: z.string().min(1, "Emotion is required"),
  rawMessage: z.string().min(1, "Message is required").max(500, "Message is too long"),
  context: z.string().optional(),
  saveToHistory: z.boolean().default(true),
});

export type EmotionInput = z.infer<typeof emotionSchema>;

export const transformationResponseSchema = z.object({
  transformedMessage: z.string(),
  communicationElements: z.array(z.string()),
  deliveryTips: z.array(z.string()),
});

export type TransformationResponse = z.infer<typeof transformationResponseSchema>;
