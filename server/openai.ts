import OpenAI from "openai";
import { TransformationResponse } from "@shared/schema";
import fs from "fs";
import path from "path";
import { promisify } from "util";

// Interface for response summary
interface ResponseSummary {
  summary: string;
  effectiveness: number;
  positiveElements: string[];
  suggestionsForImprovement: string[];
}

// Interface for conflict transformation response
export interface ConflictTransformationResponse {
  transformedMessage: string;
  communicationElements: string[];
  deliveryTips: string[];
}

// Interface for audio transcription response
export interface AudioTranscriptionResponse {
  text: string;
}

// Interface for avatar generation response
export interface AvatarGenerationResponse {
  imageUrl: string;
  error?: string;
}

// Interface for love language analysis response
export interface LoveLanguageAnalysisResponse {
  analysisText: string;
  personalizedTips: string[];
  appUsageSuggestions: string[];
}

// Interface for journal entry analysis response
export interface JournalAnalysisResponse {
  aiSummary: string;
  aiRefinedContent: string;
  emotionalInsight: string;
  emotionalScore: number;
  suggestedResponse: string;
  suggestedBoundary: string;
  reflectionPrompt: string;
  patternCategory: string;
  emotions: string[];
}

// Interface for journal response generation result
export interface JournalResponseGenerationResult {
  response: string;
}

// Initialize OpenAI client
// Ensure API key is provided
if (!process.env.OPENAI_API_KEY) {
  console.error('WARNING: OPENAI_API_KEY environment variable is not set');
}

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Transforms an emotional message into empathetic communication
 * using OpenAI GPT-4o
 */
export async function transformEmotionalMessage(
  emotion: string,
  rawMessage: string,
  context?: string
): Promise<TransformationResponse> {
  try {
    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert in relationship communication and emotional intelligence. 
Your task is to help transform raw emotional expressions into empathetic, constructive communication.
Focus on using "I" statements, non-blaming language, expressing needs clearly, and suggesting solutions.
Given the information below, transform the raw message into empathetic communication that promotes connection and understanding.

Emotion: The person is feeling ${emotion}.
Raw Message: ${rawMessage}
${context ? `Context: ${context}` : ''}

Respond with a JSON object containing:
1. "transformedMessage": A transformed version of the message that is empathetic, constructive, and promotes connection
2. "communicationElements": An array of communication techniques used in the transformation (e.g., "I statements", "Expressing needs", "Non-blaming language")
3. "deliveryTips": An array of 3 practical tips for delivering this message effectively`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please transform this emotional message into empathetic communication." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      transformedMessage: result.transformedMessage || "I understand you're feeling strong emotions. Let's talk about this together when we're both ready.",
      communicationElements: result.communicationElements || ["Empathetic listening", "Open communication"],
      deliveryTips: result.deliveryTips || [
        "Choose a calm moment for this conversation",
        "Use a gentle tone of voice",
        "Be open to hearing their perspective"
      ]
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    
    // Provide a fallback response in case of an error
    return {
      transformedMessage: "I'm feeling some emotions about our situation and would like to talk about it in a constructive way. Can we find some time to discuss this together?",
      communicationElements: ["Expressing feelings", "Requesting conversation"],
      deliveryTips: [
        "Choose a calm moment for this conversation",
        "Use a gentle tone of voice",
        "Be open to hearing their perspective"
      ]
    };
  }
}

/**
 * Analyzes a partner's response to a transformed emotional message
 * and provides a summary of the effectiveness and suggestions
 */
export async function summarizeResponse(
  originalMessage: string,
  partnerResponse: string
): Promise<string> {
  try {
    // Construct the prompt for the OpenAI API
    const prompt = `You are an expert in relationship communication and emotional intelligence.
Your task is to analyze a partner's response to a transformed emotional message and 
provide a summary of the effectiveness and suggestions for improvement.

Original message: ${originalMessage}
Partner's response: ${partnerResponse}

Respond with a JSON object containing:
1. "summary": A brief summary of how effectively the partner responded to the emotional message
2. "effectiveness": A number from 1-5 representing how effectively the partner responded (5 being most effective)
3. "positiveElements": An array of positive elements in the partner's response
4. "suggestionsForImprovement": An array of suggestions for how the partner could improve their response`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Please analyze this response to an emotional message." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = openaiResponse.choices[0].message.content || "{}";
    const result = JSON.parse(content) as ResponseSummary;
    
    // Format the summary for display
    const formattedSummary = `
Summary: ${result.summary || "The response addresses the message with some empathy."}

Effectiveness: ${result.effectiveness || 3}/5

Positive elements:
${(result.positiveElements || ["Shows willingness to engage"]).map(e => `- ${e}`).join('\n')}

Suggestions for improvement:
${(result.suggestionsForImprovement || ["Could use more validation of feelings"]).map(e => `- ${e}`).join('\n')}
    `.trim();
    
    return formattedSummary;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    
    // Provide a fallback summary in case of an error
    return "The response shows some understanding of the message. It could be improved by acknowledging the feelings more directly and offering specific ways to address the concerns.";
  }
}

/**
 * Transforms a structured conflict message into empathetic communication
 * using the structured components (topic, situation, feelings, impact, request)
 */
export async function transformConflictMessage(
  topic: string,
  situation: string,
  feelings: string,
  impact: string,
  request: string
): Promise<ConflictTransformationResponse> {
  try {
    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert in relationship communication and conflict resolution.
Your task is to help transform a structured conflict description into empathetic, constructive communication.
Focus on using "I" statements, non-blaming language, expressing needs clearly, and suggesting solutions.
Given the structured information below, transform it into a cohesive, empathetic message that promotes understanding and resolution.

Topic of Conflict: ${topic}
Situation Description: ${situation}
Feelings About It: ${feelings}
Impact on Me/Us: ${impact}
What I'd Like to Happen: ${request}

Respond with a JSON object containing:
1. "transformedMessage": A transformed cohesive message that effectively communicates all components in an empathetic, constructive way
2. "communicationElements": An array of communication techniques used in the transformation (e.g., "I statements", "Expressing needs", "Non-blaming language")
3. "deliveryTips": An array of 3 practical tips for delivering this message effectively`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please transform this structured conflict information into empathetic communication." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      transformedMessage: result.transformedMessage || `I'd like to talk about ${topic}. When ${situation}, I feel ${feelings}. This has affected me by ${impact}. I'm hoping that we can ${request}.`,
      communicationElements: result.communicationElements || ["Structured approach", "Clear request", "Expressing feelings"],
      deliveryTips: result.deliveryTips || [
        "Choose a calm moment for this conversation",
        "Listen actively to your partner's response",
        "Be open to compromise and finding solutions together"
      ]
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    
    // Provide a fallback response in case of an error
    return {
      transformedMessage: `I'd like to talk about ${topic}. When ${situation}, I feel ${feelings}. This has affected me by ${impact}. I'm hoping that we can ${request}.`,
      communicationElements: ["Structured approach", "Clear request", "Expressing feelings"],
      deliveryTips: [
        "Choose a calm moment for this conversation",
        "Listen actively to your partner's response",
        "Be open to compromise and finding solutions together"
      ]
    };
  }
}

/**
 * Transcribes audio to text using OpenAI's Whisper API
 * @param audioFile Path to the temporary audio file
 * @returns Transcription text and duration
 */
export async function transcribeAudio(audioFilePath: string): Promise<AudioTranscriptionResponse> {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }

    // Create a read stream for the audio file
    const audioReadStream = fs.createReadStream(audioFilePath);

    // Call OpenAI Whisper API to transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1", // Using the Whisper model for transcription
    });

    // Return the transcribed text (duration is not available in the response)
    return {
      text: transcription.text,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    
    // Return a default response to prevent app from crashing
    return {
      text: "Sorry, we couldn't transcribe your audio. Please try again or type your message.",
    };
  } finally {
    // Clean up the temporary file
    try {
      fs.unlinkSync(audioFilePath);
    } catch (err) {
      console.error("Error deleting temporary audio file:", err);
    }
  }
}

/**
 * Generates an avatar image based on the user's prompt using DALL-E 3
 * @param prompt Detailed description of the avatar to generate
 * @returns URL of the generated image
 */
export async function generateAvatar(prompt: string): Promise<AvatarGenerationResponse> {
  try {
    // Enhance the prompt to ensure a high-quality avatar
    const enhancedPrompt = `Create a high-quality, professional and visually appealing profile picture/avatar that represents: ${prompt}. 
    The image should be a close-up portrait style, with a clean background and strong visual appeal. 
    Make it suitable for a profile picture on a relationship app - warm, approachable, and positive.`;

    // Generate the image with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3", // Using DALL-E 3 for highest quality
      prompt: enhancedPrompt,
      n: 1, // Generate one image
      size: "1024x1024", // Standard square size
      quality: "standard",
      style: "natural", // More photo-realistic style for avatars
    });

    // Return the URL of the generated image
    const imageUrl = response.data[0]?.url || '';
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI API");
    }
    
    return {
      imageUrl: imageUrl,
    };
  } catch (error) {
    console.error("Error generating avatar:", error);
    
    // Return an error response
    return {
      imageUrl: "",
      error: "Failed to generate avatar. Please try again with a different description."
    };
  }
}

/**
 * Analyzes user's love language and provides personalized insights and app usage suggestions
 * @param loveLanguage The user's love language preference
 * @param questionnaire Optional additional questionnaire data
 * @returns Personalized analysis and app usage suggestions
 */
export async function analyzeLoveLanguage(
  loveLanguage: string,
  questionnaire?: {
    conflictStyle?: string;
    communicationStyle?: string;
    repairStyle?: string;
    relationshipGoals?: string;
    challengeAreas?: string;
  }
): Promise<LoveLanguageAnalysisResponse> {
  try {
    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert relationship coach and love language specialist.
    Your task is to provide a personalized analysis of a user's love language and relationship preferences,
    including specific suggestions for using the CoupleClarity app.
    
    User's Love Language: ${loveLanguage}
    ${questionnaire?.conflictStyle ? `Conflict Style: ${questionnaire.conflictStyle}` : ''}
    ${questionnaire?.communicationStyle ? `Communication Style: ${questionnaire.communicationStyle}` : ''}
    ${questionnaire?.repairStyle ? `Repair Style: ${questionnaire.repairStyle}` : ''}
    ${questionnaire?.relationshipGoals ? `Relationship Goals: ${questionnaire.relationshipGoals}` : ''}
    ${questionnaire?.challengeAreas ? `Challenge Areas: ${questionnaire.challengeAreas}` : ''}
    
    Respond with a JSON object containing:
    1. "analysisText": A personalized analysis of their love language and what it means for their relationship (3-4 sentences)
    2. "personalizedTips": An array of 3-4 specific tips for expressing and receiving love based on their love language
    3. "appUsageSuggestions": An array of 3 specific ways they can use CoupleClarity app features to enhance their relationship based on their love language and preferences`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please analyze this user's love language and relationship preferences." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      analysisText: result.analysisText || `Your primary love language is ${formatLoveLanguage(loveLanguage)}. This means you especially value ${getLoveLanguageDescription(loveLanguage)} in your relationship.`,
      personalizedTips: result.personalizedTips || [
        `Share what specific ${formatLoveLanguage(loveLanguage)} actions make you feel most loved`,
        "Schedule regular check-ins to discuss if your emotional needs are being met",
        "Learn to recognize when your partner is showing love in their own language"
      ],
      appUsageSuggestions: result.appUsageSuggestions || [
        "Use the Appreciation Log to record moments when your partner speaks your love language",
        "Try the Weekly Check-in feature to maintain regular communication about your needs",
        "Use the Emotional Expression tool to clearly communicate your feelings and needs"
      ]
    };
  } catch (error) {
    console.error("Error analyzing love language:", error);
    
    // Provide a fallback response in case of an error
    return {
      analysisText: `Your primary love language is ${formatLoveLanguage(loveLanguage)}. Understanding this preference can help you and your partner connect more meaningfully.`,
      personalizedTips: [
        "Pay attention to how your partner naturally expresses love",
        "Clearly communicate what actions make you feel most appreciated",
        "Be open to receiving love in different forms"
      ],
      appUsageSuggestions: [
        "Use the Appreciation Log to record moments when your partner speaks your love language",
        "Try the Weekly Check-in feature to maintain regular communication about your needs",
        "Use the Emotional Expression tool to clearly communicate your feelings and needs"
      ]
    };
  }
}

// Helper functions for the love language analysis
function formatLoveLanguage(loveLanguage: string): string {
  const formattedLanguages: Record<string, string> = {
    words_of_affirmation: "Words of Affirmation",
    quality_time: "Quality Time",
    acts_of_service: "Acts of Service",
    physical_touch: "Physical Touch",
    gifts: "Gifts and Thoughtful Gestures",
    not_sure: "Still Exploring Your Love Language"
  };
  
  return formattedLanguages[loveLanguage] || loveLanguage;
}

function getLoveLanguageDescription(loveLanguage: string): string {
  const descriptions: Record<string, string> = {
    words_of_affirmation: "verbal acknowledgments of affection and appreciation",
    quality_time: "meaningful, undivided attention and shared experiences",
    acts_of_service: "actions that ease your burden and show thoughtfulness",
    physical_touch: "physical closeness and touch as expressions of love",
    gifts: "thoughtful gifts that show you were thought of",
    not_sure: "a variety of expressions of love as you explore your preferences"
  };
  
  return descriptions[loveLanguage] || "unique expressions of love";
}

/**
 * Analyzes a journal entry to provide emotional insights, pattern detection, and communication suggestions
 * @param journalEntry The journal entry content to analyze
 * @param title The title of the journal entry
 * @param userId The ID of the user who wrote the entry
 * @param previousEntries Optional array of previous journal entries for context
 * @returns Comprehensive analysis of the journal entry with emotional insights and suggestions
 */
interface PreviousEntry {
  title: string;
  content: string;
  date: string;
}

/**
 * Generate a response to a partner's journal entry
 * 
 * @param journalContent The content of the journal entry
 * @param responseType The type of response to generate (empathetic, supportive, curious, appreciative)
 * @returns A thoughtful, emotionally intelligent response
 */
export async function generateJournalResponse(
  journalContent: string,
  responseType: string
): Promise<JournalResponseGenerationResult> {
  try {
    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert in relationship psychology and emotional intelligence.
    Your task is to help a person craft a thoughtful response to their partner's journal entry.
    
    The journal entry they are responding to is: "${journalContent}"
    
    Based on the tone requested (${responseType}), generate a kind, constructive response that:
    1. Validates their partner's feelings
    2. Shows understanding and empathy
    3. Maintains a supportive tone
    4. Doesn't offer solutions unless specifically asked
    5. Uses "I" language where appropriate
    6. Is authentic and doesn't sound robotic
    
    Response type requested: ${responseType.toUpperCase()}
    
    The response should be 3-5 sentences long and feel personal, not generic.`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please help me craft a response to my partner's journal entry." }
      ]
    });

    // Get the generated response text
    const generatedResponse = response.choices[0].message.content || "";
    
    return {
      response: generatedResponse.trim()
    };
  } catch (error) {
    console.error("Error generating journal response:", error);
    
    // Provide a fallback response in case of an error
    return {
      response: "I appreciate you sharing this with me. It helps me understand your perspective better. I'm here for you and value your thoughts and feelings."
    };
  }
}

export async function analyzeJournalEntry(
  journalEntry: string,
  title: string,
  userId: number,
  previousEntries?: PreviousEntry[]
): Promise<JournalAnalysisResponse> {
  try {
    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert in relationship psychology and emotional intelligence.
    Your task is to analyze a user's journal entry about their relationship and provide deep insights.
    
    Journal Title: ${title}
    Journal Entry: ${journalEntry}
    
    ${previousEntries && previousEntries.length > 0 ? 
      `Previous Entries for Context (newest first):
      ${previousEntries.map(entry => `Date: ${entry.date}
      Title: ${entry.title}
      Content: ${entry.content}
      ---`).join('\n')}` 
      : ''}
    
    Respond with a JSON object containing:
    1. "aiSummary": A concise 2-3 sentence summary of the key points and emotions in this entry
    2. "aiRefinedContent": A rewritten version that maintains the core message but expresses it with greater emotional awareness (preserve the first-person perspective)
    3. "emotionalInsight": An insightful paragraph about the emotional patterns detected in this entry
    4. "emotionalScore": A number from 1-10 representing the emotional intensity (10 being most intense)
    5. "suggestedResponse": A constructive response if this entry were shared with a partner
    6. "suggestedBoundary": A healthy boundary that might be needed based on the content
    7. "reflectionPrompt": A thoughtful question for the user to reflect on related to this entry
    8. "patternCategory": A single category that best describes this pattern (e.g., "avoidance", "people-pleasing", "self-criticism", "trust issues", etc.)
    9. "emotions": An array of 3-5 specific emotions detected in this entry (e.g., "frustrated", "hopeful", "anxious")`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please analyze this journal entry with emotional intelligence and relationship psychology expertise." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      aiSummary: result.aiSummary || `This entry discusses feelings about ${title}. There are some emotional elements that could benefit from reflection.`,
      aiRefinedContent: result.aiRefinedContent || journalEntry,
      emotionalInsight: result.emotionalInsight || "There appears to be a mix of emotions in this entry that reveal your perspective on the situation. Consider how these emotions influence your reactions and communication.",
      emotionalScore: result.emotionalScore || 5,
      suggestedResponse: result.suggestedResponse || "I appreciate you sharing this with me. I can see this matters to you, and I'd like to understand more about your perspective.",
      suggestedBoundary: result.suggestedBoundary || "It's important to express these feelings while also making space for different perspectives.",
      reflectionPrompt: result.reflectionPrompt || "What underlying needs might be driving these feelings, and how could you express them constructively?",
      patternCategory: result.patternCategory || "mixed_emotions",
      emotions: result.emotions || ["concerned", "thoughtful", "hopeful"]
    };
  } catch (error) {
    console.error("Error analyzing journal entry:", error);
    
    // Provide a fallback response in case of an error
    return {
      aiSummary: `This entry discusses feelings about ${title}.`,
      aiRefinedContent: journalEntry,
      emotionalInsight: "There appears to be important emotional content in this entry that would benefit from reflection.",
      emotionalScore: 5,
      suggestedResponse: "Thank you for sharing this with me. I'd like to understand more about your perspective.",
      suggestedBoundary: "It's important to communicate openly while respecting each other's feelings.",
      reflectionPrompt: "How might expressing these feelings help strengthen your relationship?",
      patternCategory: "reflection",
      emotions: ["thoughtful", "concerned", "hopeful"]
    };
  }
}
