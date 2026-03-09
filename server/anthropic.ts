import Anthropic from '@anthropic-ai/sdk';
import type { GuidedConversationTurn } from "@shared/schema";
import {
  type PartnerPreferenceProfile,
  buildPreferenceContext,
  getConversationTypeDescription,
} from "./ai-preferences";

// Check if API key is available
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

// Only initialize if API key is available
// Using Claude Sonnet 4.6 (claude-sonnet-4-6) — latest Anthropic model
const anthropic = hasApiKey ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;

/**
 * Transform an emotional message into a more empathetic expression
 * @param text The original message text
 * @param emotions The emotions associated with the message
 * @returns The transformed message with higher empathy
 */
export async function transformMessage(text: string, emotions: string[]): Promise<string> {
  // If API key is not available, return the original text
  if (!hasApiKey || !anthropic) {
    console.warn('Anthropic API key not available. Using original text.');
    return text;
  }

  try {
    const emotionsString = emotions.join(', ');
    const prompt = `Transform the following message into a more empathetic expression that maintains the core feelings but communicates them in a healthier way. 
    
    Original message: "${text}"
    Emotions: ${emotionsString}
    
    Please rewrite this message to:
    1. Express the same core feelings
    2. Use "I" statements
    3. Avoid blame
    4. Be specific about needs
    5. Express appreciation where possible
    6. Maintain authenticity`;

    // This non-null assertion is safe because we've checked if anthropic is null above
    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    // Check content structure and access properly
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        return content.text;
      }
    }
    throw new Error("Unexpected response format from Anthropic API");
  } catch (error) {
    console.error('Error transforming message with Anthropic:', error);
    return text; // Return original text if transformation fails
  }
}

/**
 * Analyze a conflict thread to provide insights and resolution strategies
 * @param messages Array of messages from the conflict thread
 * @returns Analysis with insights and suggested resolution strategies
 */
export async function analyzeConflict(messages: Array<{text: string, author: string}>): Promise<{
  insights: string,
  strategies: string[]
}> {
  // If API key is not available, return a default response
  if (!hasApiKey || !anthropic) {
    console.warn('Anthropic API key not available. Using default conflict analysis.');
    return {
      insights: "API key for advanced conflict analysis is not available. Basic analysis suggests focusing on communication and understanding.",
      strategies: [
        "Take turns expressing your perspectives without interruption",
        "Acknowledge each other's feelings before proposing solutions",
        "Focus on the issue at hand rather than bringing up past conflicts"
      ]
    };
  }

  try {
    const messagesText = messages.map(msg => `${msg.author}: ${msg.text}`).join('\n\n');
    
    const prompt = `Analyze this conflict conversation between partners and provide relationship insights and resolution strategies:

    Conversation:
    ${messagesText}

    Please provide:
    1. Insights about the underlying needs, emotions, and patterns in this conflict
    2. Three specific strategies these partners could use to resolve this conflict constructively
    
    Format your response as a JSON object with "insights" as a string and "strategies" as an array of strings.`;

    // This non-null assertion is safe because we've checked if anthropic is null above
    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: "You're a relationship expert specializing in conflict resolution. Provide insights and strategies in JSON format with keys: 'insights' and 'strategies' (array).",
      messages: [{ role: 'user', content: prompt }],
    });

    // Check content structure and access properly
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        let result: any;
        try {
          result = JSON.parse(content.text);
        } catch {
          console.error('Failed to parse Anthropic conflict analysis response as JSON:', content.text.slice(0, 200));
          throw new Error("Anthropic returned invalid JSON for conflict analysis");
        }
        return {
          insights: result.insights,
          strategies: result.strategies
        };
      }
    }
    throw new Error("Unexpected response format from Anthropic API");
  } catch (error) {
    console.error('Error analyzing conflict with Anthropic:', error);
    return {
      insights: "Unable to analyze this conflict at the moment.",
      strategies: ["Consider taking a short break and returning to the conversation later."]
    };
  }
}

/**
 * Analyze a user's questionnaire responses to identify likely love languages
 * @param responses The user's responses to love language questions
 * @returns Analysis of likely love languages with explanation and suggestions
 */
export async function analyzeLoveLanguage(responses: Record<string, string>): Promise<{
  primaryLanguage: string,
  secondaryLanguage: string,
  explanation: string,
  suggestions: string[]
}> {
  // If API key is not available, return a default response
  if (!hasApiKey || !anthropic) {
    console.warn('Anthropic API key not available. Using default love language analysis.');
    
    // Extract the primary love language from responses if available
    const loveLanguage = responses['Love Language'] || 'Unknown';
    
    return {
      primaryLanguage: loveLanguage,
      secondaryLanguage: "Quality Time", // Default secondary language
      explanation: "Love language analysis requires an AI model. Based on your selection, we've identified your primary love language. Understanding your love language can help strengthen your relationship.",
      suggestions: [
        "Share with your partner specific ways they can show love in your primary language",
        "Be aware of your partner's love language and try to express love in that way",
        "Schedule regular conversations about how you both feel most appreciated"
      ]
    };
  }

  try {
    const responsesText = Object.entries(responses)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join('\n');
    
    const prompt = `Analyze these responses to determine the person's likely primary and secondary love languages:

    Responses:
    ${responsesText}

    The five love languages are:
    - Words of Affirmation
    - Quality Time
    - Acts of Service
    - Physical Touch
    - Gifts

    Please provide:
    1. The most likely primary love language
    2. A probable secondary love language
    3. A brief explanation of why these seem to be their love languages
    4. Three specific suggestions for how they might express love to a partner based on these love languages
    
    Format your response as a JSON object with keys: primaryLanguage, secondaryLanguage, explanation, and suggestions (array).`;

    // This non-null assertion is safe because we've checked if anthropic is null above
    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: "You're a relationship expert specializing in love languages. Provide analysis in JSON format with keys: 'primaryLanguage', 'secondaryLanguage', 'explanation', and 'suggestions' (array).",
      messages: [{ role: 'user', content: prompt }],
    });

    // Check content structure and access properly
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        let result: any;
        try {
          result = JSON.parse(content.text);
        } catch {
          console.error('Failed to parse Anthropic love language response as JSON:', content.text.slice(0, 200));
          throw new Error("Anthropic returned invalid JSON for love language analysis");
        }
        return {
          primaryLanguage: result.primaryLanguage,
          secondaryLanguage: result.secondaryLanguage,
          explanation: result.explanation,
          suggestions: result.suggestions
        };
      }
    }
    throw new Error("Unexpected response format from Anthropic API");
  } catch (error) {
    console.error('Error analyzing love language with Anthropic:', error);
    return {
      primaryLanguage: "Unable to determine",
      secondaryLanguage: "Unable to determine",
      explanation: "There was an issue analyzing your responses.",
      suggestions: ["Consider taking a love languages quiz for more accurate results."]
    };
  }
}

// ─── Guided Conversation AI Functions ──────────────────────────────────

export interface CoachingResult {
  coaching: string;
  coachedMessage: string;
  emotionalTone: string;
}

function extractAnthropicText(response: Anthropic.Message): string {
  if (response.content && response.content.length > 0) {
    const content = response.content[0];
    if ('text' in content) return content.text;
  }
  return "";
}

export async function generateConversationPromptAnthropic(
  conversationType: string,
  topic: string | null,
  currentUser: PartnerPreferenceProfile,
  partner: PartnerPreferenceProfile,
  previousTurns: GuidedConversationTurn[],
  turnNumber: number
): Promise<string> {
  if (!hasApiKey || !anthropic) {
    return `${currentUser.name}, share your thoughts on ${topic || "your relationship"} for this part of the conversation.`;
  }

  try {
    const prefContext = buildPreferenceContext(currentUser, partner);
    const typeDesc = getConversationTypeDescription(conversationType);
    const previousContext = previousTurns
      .filter(t => t.turnType === "coached_message" || t.turnType === "ai_prompt")
      .map(t => `[${t.turnType}] ${t.content}`)
      .join("\n\n");

    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `You are a skilled relationship coach facilitating a guided conversation between partners.

CONVERSATION TYPE: ${typeDesc}

PARTNER PROFILES:
${prefContext}

INSTRUCTIONS:
- Generate a prompt addressed to ${currentUser.name} for turn ${turnNumber}.
- Adapt your language to match ${currentUser.name}'s communication style preferences.
- Consider ${partner.name}'s love language when suggesting how to express things.
- Keep the prompt under 150 words. Be warm but concise.
- Return only the prompt text, no JSON.`,
      messages: [
        {
          role: 'user',
          content: `Topic: ${topic || "General relationship growth"}\nTurn number: ${turnNumber}\n\nPrevious conversation:\n${previousContext || "(This is the first turn)"}`
        }
      ],
    });

    return extractAnthropicText(response).trim() || `${currentUser.name}, share your thoughts for this part of the conversation.`;
  } catch (error) {
    console.error("Error generating conversation prompt (Anthropic):", error);
    return `${currentUser.name}, share your thoughts on ${topic || "your relationship"} for this part of the conversation.`;
  }
}

export async function coachResponseAnthropic(
  rawResponse: string,
  conversationType: string,
  speaker: PartnerPreferenceProfile,
  listener: PartnerPreferenceProfile,
  previousTurns: GuidedConversationTurn[]
): Promise<CoachingResult> {
  if (!hasApiKey || !anthropic) {
    return { coaching: "", coachedMessage: rawResponse, emotionalTone: "neutral" };
  }

  try {
    const prefContext = buildPreferenceContext(speaker, listener);
    const typeDesc = getConversationTypeDescription(conversationType);

    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are a relationship communication coach.

CONVERSATION TYPE: ${typeDesc}

PARTNER PROFILES:
${prefContext}

YOUR TASK:
1. Read ${speaker.name}'s raw response.
2. Generate private "coaching" feedback only ${speaker.name} will see (2-3 sentences max).
3. Generate a "coachedMessage" — a refined version optimized for ${listener.name}'s reception. Preserve ${speaker.name}'s authentic voice.
4. Detect the "emotionalTone" (one word).

Respond in JSON: {"coaching": "...", "coachedMessage": "...", "emotionalTone": "..."}`,
      messages: [
        {
          role: 'user',
          content: `${speaker.name}'s raw response:\n\n${rawResponse}`
        }
      ],
    });

    const text = extractAnthropicText(response).trim();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Failed to parse Anthropic coaching response:", text.slice(0, 200));
      return { coaching: "", coachedMessage: rawResponse, emotionalTone: "neutral" };
    }
    return {
      coaching: result.coaching || "",
      coachedMessage: result.coachedMessage || rawResponse,
      emotionalTone: result.emotionalTone || "neutral",
    };
  } catch (error) {
    console.error("Error coaching response (Anthropic):", error);
    return { coaching: "", coachedMessage: rawResponse, emotionalTone: "neutral" };
  }
}

export async function generateConversationSummaryAnthropic(
  conversationType: string,
  topic: string | null,
  user1: PartnerPreferenceProfile,
  user2: PartnerPreferenceProfile,
  allTurns: GuidedConversationTurn[]
): Promise<{ summary: string; insights: string }> {
  if (!hasApiKey || !anthropic) {
    return { summary: "Conversation completed.", insights: "[]" };
  }

  try {
    const prefContext = buildPreferenceContext(user1, user2);
    const typeDesc = getConversationTypeDescription(conversationType);
    const turnsSummary = allTurns
      .filter(t => t.turnType === "coached_message" || t.turnType === "user_response")
      .map(t => `[${t.userId === user1.userId ? user1.name : user2.name}] ${t.content}`)
      .join("\n\n");

    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a relationship coach summarizing a completed guided conversation.

CONVERSATION TYPE: ${typeDesc}
TOPIC: ${topic || "General"}

PARTNER PROFILES:
${prefContext}

Generate a warm summary (3-5 sentences) highlighting communication strengths, growth areas, and one recommendation.
Also generate insights as a JSON array of objects with "type" and "text" keys.
Types: "strength", "growth_area", "recommendation"

Respond in JSON: {"summary": "...", "insights": [...]}`,
      messages: [
        {
          role: 'user',
          content: `Conversation turns:\n\n${turnsSummary}`
        }
      ],
    });

    const text = extractAnthropicText(response).trim();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Failed to parse Anthropic summary response:", text.slice(0, 200));
      return { summary: "Conversation completed.", insights: "[]" };
    }
    return {
      summary: result.summary || "Conversation completed.",
      insights: JSON.stringify(result.insights || []),
    };
  } catch (error) {
    console.error("Error generating conversation summary (Anthropic):", error);
    return { summary: "Conversation completed.", insights: "[]" };
  }
}