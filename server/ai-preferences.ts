/**
 * AI Preference Adaptation Layer
 * Converts user preference enums into behavioral descriptions that guide AI prompts.
 */

import type { User, UserPreferences } from "@shared/schema";

export interface PartnerPreferenceProfile {
  name: string;
  userId: number;
  loveLanguage: string;
  conflictStyle: string;
  communicationStyle: string;
  repairStyle: string;
  relationshipGoals: string | null;
  challengeAreas: string | null;
}

export function buildPreferenceProfile(user: User, prefs: UserPreferences | undefined): PartnerPreferenceProfile {
  return {
    name: user.displayName || user.firstName,
    userId: user.id,
    loveLanguage: prefs?.loveLanguage ?? "not_sure",
    conflictStyle: prefs?.conflictStyle ?? "not_sure",
    communicationStyle: prefs?.communicationStyle ?? "gentle",
    repairStyle: prefs?.repairStyle ?? "talking",
    relationshipGoals: user.relationshipGoals ?? null,
    challengeAreas: user.challengeAreas ?? null,
  };
}

export function buildPreferenceContext(speaker: PartnerPreferenceProfile, listener: PartnerPreferenceProfile): string {
  return `
=== SPEAKER (${speaker.name}) ===
Communication style: ${describeCommunicationStyle(speaker.communicationStyle)}
Conflict style: ${describeConflictStyle(speaker.conflictStyle)}
Love language: ${describeLoveLanguage(speaker.loveLanguage)}
Repair style: ${describeRepairStyle(speaker.repairStyle)}
${speaker.relationshipGoals ? `Goals: ${speaker.relationshipGoals}` : ""}
${speaker.challengeAreas ? `Challenges: ${speaker.challengeAreas}` : ""}

=== LISTENER (${listener.name}) ===
Communication style: ${describeCommunicationStyle(listener.communicationStyle)}
Conflict style: ${describeConflictStyle(listener.conflictStyle)}
Love language: ${describeLoveLanguage(listener.loveLanguage)}
Repair style: ${describeRepairStyle(listener.repairStyle)}
${listener.relationshipGoals ? `Goals: ${listener.relationshipGoals}` : ""}
${listener.challengeAreas ? `Challenges: ${listener.challengeAreas}` : ""}
`.trim();
}

export function describeCommunicationStyle(style: string): string {
  const descriptions: Record<string, string> = {
    gentle: "Prefers gentle, indirect communication. Responds poorly to harshness. Use softened language, validate feelings before making points.",
    direct: "Values clear, straightforward communication. Appreciates honesty and gets frustrated by vagueness. Be specific and concise.",
    structured: "Prefers organized, step-by-step communication. Provide numbered points or clear frameworks. Avoid rambling or emotional flooding.",
    supportive: "Prefers warm, encouraging communication. Needs reassurance alongside feedback. Lead with positives, then gently raise concerns.",
    light: "Prefers lighthearted, low-pressure communication. Uses humor to connect. Avoid heavy-handed approaches. Keep the tone warm and approachable.",
  };
  return descriptions[style] || "No strong preference indicated. Use balanced, respectful communication.";
}

export function describeConflictStyle(style: string): string {
  const descriptions: Record<string, string> = {
    avoid: "Tends to avoid conflict. Do NOT push for immediate resolution. Create safety first. Use invitations, not demands. Allow them to engage at their own pace.",
    emotional: "Processes conflict emotionally. Validate feelings before problem-solving. Allow emotional expression without rushing to fix things. Mirror their emotions to show understanding.",
    talk_calmly: "Prefers calm, rational discussion during conflict. Avoid escalation. Stick to facts and feelings without blame. Take breaks if emotions run high.",
    need_space: "Needs physical or emotional space during conflict. Do not pursue when they withdraw. Suggest taking a break and returning to the topic later.",
    not_sure: "Conflict style is unclear. Default to a gentle, non-confrontational approach. Check in about comfort level.",
  };
  return descriptions[style] || "No strong preference indicated. Default to calm, respectful engagement.";
}

export function describeLoveLanguage(language: string): string {
  const descriptions: Record<string, string> = {
    words_of_affirmation: "Feels most loved through verbal affirmation. Encourage specific, genuine compliments and expressions of appreciation. Verbal acknowledgment means a lot.",
    quality_time: "Feels most loved through undivided attention. Suggest focused, present moments together. Being fully engaged matters more than grand gestures.",
    acts_of_service: "Feels most loved through helpful actions. Suggest practical ways to show care. Offering to help or take something off their plate speaks volumes.",
    physical_touch: "Feels most loved through physical closeness. Suggest warm, comforting physical gestures when appropriate. Physical presence and proximity are reassuring.",
    gifts: "Feels most loved through thoughtful gifts and tokens. Suggest meaningful gestures that show 'I was thinking of you.' It's about the thought, not the cost.",
    not_sure: "Love language is unclear. Encourage exploring different expressions of love to find what resonates.",
  };
  return descriptions[language] || "No strong preference indicated.";
}

export function describeRepairStyle(style: string): string {
  const descriptions: Record<string, string> = {
    apology: "Values verbal apologies. A sincere 'I'm sorry' with specific acknowledgment of the hurt goes a long way. Be genuine and specific in apologies.",
    space_checkin: "Needs space after conflict, then a gentle check-in. Do not push for immediate repair. Allow time to process, then reach out with a caring message.",
    physical_closeness: "Repairs through physical closeness — a hug, sitting together, being near. Suggest physical reconnection as a bridge back to emotional closeness.",
    caring_message: "Repairs through a thoughtful message or note. A caring text, letter, or kind gesture helps bridge the gap after conflict.",
    talking: "Repairs through open conversation. Wants to talk things through to resolution. Supports processing out loud and reaching mutual understanding.",
  };
  return descriptions[style] || "No strong preference indicated. Suggest gentle, respectful reconnection.";
}

export function getConversationTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    softened_startup: `SOFTENED STARTUP — Based on Gottman's research showing that conversations end on the same note they begin. Guide the speaker to raise a concern using "I" statements, specific observations, and a clear positive need (what they want, not what they don't want). Help them avoid blame, contempt, or criticism.`,
    dreams_within_conflict: `DREAMS WITHIN CONFLICT — Based on Gottman's concept that 69% of conflicts are perpetual, rooted in different life dreams. Guide partners to explore the underlying dreams, hopes, and values behind their positions. The goal is understanding, not solving.`,
    appreciation_ritual: `APPRECIATION RITUAL — A structured gratitude exercise. Guide each partner to share specific, recent things they appreciate about the other. Encourage details: what happened, how it made them feel, why it mattered. Build a culture of appreciation.`,
    weekly_checkin: `WEEKLY CHECK-IN — A structured touch-base covering: highlights of the week, upcoming stressors, how the relationship felt this week, and one thing each partner can do for the other. Keep it balanced and forward-looking.`,
    repair_conversation: `REPAIR CONVERSATION — Guide partners through repairing after a conflict or hurt. Structure: acknowledge what happened, share impact, take responsibility where appropriate, express needs going forward, and reconnect.`,
    future_planning: `FUTURE PLANNING — Help partners align on shared vision. Explore dreams, goals, and plans for the near and far future. Identify shared values, negotiate differences, and build excitement for what's ahead.`,
  };
  return descriptions[type] || "A guided conversation to strengthen your relationship.";
}
