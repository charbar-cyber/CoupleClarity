import OpenAI from "openai";
import { TransformationResponse } from "@shared/schema";
import fs from "fs";
import path from "path";
import { promisify } from "util";

/**
 * Safely parse JSON from an AI response, providing a descriptive error on failure.
 */
function safeParseJSON(text: string, context: string): any {
  try {
    return JSON.parse(text);
  } catch {
    console.error(`Failed to parse JSON from ${context}:`, text.slice(0, 200));
    throw new Error(`AI returned invalid JSON for ${context}`);
  }
}

// Helper function to create mock emotion analysis when API key is not available
function createMockEmotionAnalysis(emotionalExpressions: Array<{
  emotion: string;
  context: string;
  intensity?: number;
  date: Date;
}>): EmotionPatternAnalysisResponse {
  // Count emotions to find dominant ones
  const emotionCounts: Record<string, {count: number, totalIntensity: number}> = {};
  emotionalExpressions.forEach(expr => {
    if (!emotionCounts[expr.emotion]) {
      emotionCounts[expr.emotion] = { count: 0, totalIntensity: 0 };
    }
    emotionCounts[expr.emotion].count += 1;
    emotionCounts[expr.emotion].totalIntensity += expr.intensity || 5;
  });
  
  // Convert to array and sort by frequency
  const dominantEmotions = Object.entries(emotionCounts).map(([emotion, data]) => ({
    emotion,
    frequency: (data.count / emotionalExpressions.length) * 10, // Scale to 0-10
    intensity: data.count > 0 ? data.totalIntensity / data.count : 5,
    description: getEmotionDescription(emotion)
  })).sort((a, b) => b.frequency - a.frequency).slice(0, 3); // Top 3 emotions
  
  // Determine overall trend based on emotions
  const positiveEmotions = ['happy', 'joyful', 'grateful', 'excited', 'content', 'love', 'loved', 'hopeful'];
  const negativeEmotions = ['sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed', 'disappointed'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  emotionalExpressions.forEach(expr => {
    if (positiveEmotions.includes(expr.emotion.toLowerCase())) positiveCount++;
    if (negativeEmotions.includes(expr.emotion.toLowerCase())) negativeCount++;
  });
  
  const totalEmotions = emotionalExpressions.length;
  const positiveRatio = totalEmotions > 0 ? positiveCount / totalEmotions : 0.5;
  
  let overallTrend: 'improving' | 'declining' | 'fluctuating' | 'stable' = 'stable';
  let trendDescription = "Your emotional patterns appear relatively stable.";
  
  if (positiveRatio > 0.6) {
    overallTrend = 'improving';
    trendDescription = "Your emotions show a positive trend, with more positive emotions than negative ones.";
  } else if (positiveRatio < 0.4) {
    overallTrend = 'declining';
    trendDescription = "Your emotions show more negative experiences lately, which may indicate some challenges.";
  } else if (Math.abs(positiveCount - negativeCount) < 3 && totalEmotions > 5) {
    overallTrend = 'fluctuating';
    trendDescription = "Your emotions show some fluctuation between positive and negative experiences.";
  }
  
  // Generate patterns based on emotions
  const patterns: Array<{
    name: string;
    description: string;
    emotions: string[];
    triggers: string[];
    suggestedStrategies: string[];
  }> = [];
  
  if (positiveCount > 0 && dominantEmotions.some(e => positiveEmotions.includes(e.emotion.toLowerCase()))) {
    patterns.push({
      name: "Positive Connection Pattern",
      description: "You experience positive emotions like gratitude and happiness in your relationship, especially during quality time together.",
      emotions: dominantEmotions
        .filter(e => positiveEmotions.includes(e.emotion.toLowerCase()))
        .map(e => e.emotion),
      triggers: ["Quality time together", "Acts of appreciation", "Open communication"],
      suggestedStrategies: [
        "Schedule regular quality time together",
        "Practice expressing appreciation daily",
        "Continue sharing positive emotions openly"
      ]
    });
  }
  
  if (negativeCount > 0 && dominantEmotions.some(e => negativeEmotions.includes(e.emotion.toLowerCase()))) {
    patterns.push({
      name: "Stress Response Pattern",
      description: "You sometimes experience stress or frustration, which may be related to specific relationship dynamics.",
      emotions: dominantEmotions
        .filter(e => negativeEmotions.includes(e.emotion.toLowerCase()))
        .map(e => e.emotion),
      triggers: ["Miscommunication", "Unmet expectations", "External stressors"],
      suggestedStrategies: [
        "Practice the emotion transformation tools when feeling stressed",
        "Try to identify specific triggers for negative emotions",
        "Discuss recurring issues with your partner using 'I' statements"
      ]
    });
  }
  
  // Create default pattern if none were created
  if (patterns.length === 0) {
    patterns.push({
      name: "General Communication Pattern",
      description: "Your emotional responses show a balanced approach to relationship situations.",
      emotions: dominantEmotions.slice(0, 2).map(e => e.emotion),
      triggers: ["Everyday interactions", "Relationship discussions"],
      suggestedStrategies: [
        "Continue tracking your emotions regularly",
        "Practice expressing needs clearly",
        "Reflect on patterns in your emotional responses"
      ]
    });
  }
  
  return {
    dominantEmotions,
    emotionTrends: {
      overall: overallTrend,
      description: trendDescription,
      recentShift: null
    },
    patterns,
    relationshipInsights: {
      communicationStyle: "Based on your emotional expressions, you tend to communicate in a " + 
        (positiveRatio > 0.6 ? "positive and open" : positiveRatio < 0.4 ? "careful and protective" : "balanced") + 
        " way with your partner.",
      emotionalDynamics: "Your emotional patterns show " + 
        (totalEmotions < 5 ? "that you're just beginning to track your emotions" : 
        "a mix of emotional responses to different relationship situations"),
      growthAreas: [
        "Continued emotional awareness",
        "Communication during challenging moments",
        positiveRatio < 0.5 ? "Finding moments of joy and appreciation" : "Maintaining emotional balance"
      ],
      strengths: [
        "Willingness to reflect on emotions",
        "Emotional self-awareness",
        positiveRatio > 0.5 ? "Maintaining positive emotional states" : "Acknowledging difficult emotions"
      ]
    },
    personalizedRecommendations: [
      "Continue tracking your emotions regularly to identify patterns",
      "Practice using the emotion transformation tools when expressing difficult feelings",
      "Set aside time for regular check-ins with your partner",
      positiveRatio < 0.5 ? "Look for opportunities to express appreciation to your partner" : 
                          "Continue nurturing the positive aspects of your relationship"
    ]
  };
}

// Helper function to get descriptions for emotions
function getEmotionDescription(emotion: string): string {
  const descriptions: Record<string, string> = {
    happy: "A state of joy and contentment that energizes your interactions.",
    joyful: "A deep sense of delight and happiness in your relationship.",
    grateful: "Appreciation and thankfulness for aspects of your relationship.",
    excited: "Enthusiasm and anticipation about experiences with your partner.",
    content: "A peaceful satisfaction with the current state of your relationship.",
    love: "A deep feeling of affection and attachment to your partner.",
    loved: "Feeling appreciated, valued and cherished by your partner.",
    hopeful: "Optimism about the future of your relationship.",
    sad: "Feelings of unhappiness or sorrow that may need addressing.",
    angry: "Frustration or irritation that may indicate unmet needs.",
    frustrated: "Feeling blocked or unable to achieve desired outcomes in the relationship.",
    anxious: "Worry or nervousness about aspects of your relationship.",
    worried: "Concern about specific relationship issues or future outcomes.",
    stressed: "Feeling pressured or overwhelmed by relationship dynamics.",
    disappointed: "Unmet expectations or hopes within the relationship."
  };
  
  return descriptions[emotion.toLowerCase()] || 
    "An emotional state that reflects your experience in the relationship.";
}

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

// Interface for advanced emotion pattern analysis
export interface EmotionPatternAnalysisResponse {
  dominantEmotions: Array<{
    emotion: string;
    frequency: number;
    intensity: number;
    description: string;
  }>;
  emotionTrends: {
    overall: 'improving' | 'declining' | 'fluctuating' | 'stable';
    description: string;
    recentShift: string | null;
  };
  patterns: Array<{
    name: string;
    description: string;
    emotions: string[];
    triggers: string[];
    suggestedStrategies: string[];
  }>;
  relationshipInsights: {
    communicationStyle: string;
    emotionalDynamics: string;
    growthAreas: string[];
    strengths: string[];
  };
  personalizedRecommendations: string[];
}

// Interface for journal response generation result
export interface JournalResponseGenerationResult {
  response: string;
}

export interface TherapySessionResult {
  transcript: string;
  audioUrl?: string;
  summary: {
    emotionalPatterns: string[];
    coreIssues: string[];
    recommendations: string[];
  };
}

// Initialize OpenAI client only if API key is available
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
if (!hasOpenAIKey) {
  console.warn('WARNING: OPENAI_API_KEY environment variable is not set. AI features will be unavailable.');
}
const openai = hasOpenAIKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Transforms an emotional message into empathetic communication
 * using OpenAI GPT-4o
 */
export async function transformEmotionalMessage(
  emotion: string,
  rawMessage: string,
  context?: string
): Promise<TransformationResponse> {
  if (!openai) {
    console.warn('OpenAI API key not available. Emotional message transformation unavailable.');
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
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please transform this emotional message into empathetic communication." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "emotional message transformation");

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
  if (!openai) {
    console.warn('OpenAI API key not available. Response summarization unavailable.');
    return "The response shows some understanding of the message. It could be improved by acknowledging the feelings more directly and offering specific ways to address the concerns.";
  }

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
    const openaiResponse = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Please analyze this response to an emotional message." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = openaiResponse.choices[0].message.content || "{}";
    const result = safeParseJSON(content, "response summary") as ResponseSummary;
    
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
  if (!openai) {
    console.warn('OpenAI API key not available. Conflict message transformation unavailable.');
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
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please transform this structured conflict information into empathetic communication." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "conflict message transformation");

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
  if (!openai) {
    console.warn('OpenAI API key not available. Audio transcription unavailable.');
    return {
      text: "Audio transcription is currently unavailable. Please type your message instead.",
    };
  }

  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }

    // Create a read stream for the audio file
    const audioReadStream = fs.createReadStream(audioFilePath);

    // Call OpenAI Whisper API to transcribe audio
    const transcription = await openai!.audio.transcriptions.create({
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
  if (!openai) {
    console.warn('OpenAI API key not available. Avatar generation unavailable.');
    return {
      imageUrl: "",
      error: "Avatar generation is currently unavailable. Please try again later."
    };
  }

  try {
    // Enhance the prompt to ensure a high-quality avatar
    const enhancedPrompt = `Create a high-quality, professional and visually appealing profile picture/avatar that represents: ${prompt}. 
    The image should be a close-up portrait style, with a clean background and strong visual appeal. 
    Make it suitable for a profile picture on a relationship app - warm, approachable, and positive.`;

    // Generate the image with DALL-E 3
    const response = await openai!.images.generate({
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
  if (!openai) {
    console.warn('OpenAI API key not available. Love language analysis unavailable.');
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
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please analyze this user's love language and relationship preferences." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "love language analysis");

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
/**
 * Generates a therapy session script based on journal entries, conflict threads, and partner interactions.
 * @param userEntries Array of the user's recent journal entries
 * @param partnerEntries Array of the partner's shared journal entries or responses
 * @param conflictThreads Array of recent conflict threads between the partners
 * @returns Transcript and summary of the AI-generated therapy session
 */
export async function generateTherapySession(
  userEntries: Array<{title: string, content: string, emotions?: string[], date: Date}>,
  partnerEntries: Array<{title: string, content: string, emotions?: string[], date: Date}>,
  conflictThreads: Array<{topic: string, messages: Array<{author: string, content: string, date: Date}>}>
): Promise<TherapySessionResult> {
  if (!openai) {
    console.warn('OpenAI API key not available. Therapy session generation unavailable.');
    return {
      transcript: "Therapy session generation is currently unavailable. Please try again later when the service is configured.",
      summary: {
        emotionalPatterns: ["Service currently unavailable"],
        coreIssues: ["Service currently unavailable"],
        recommendations: ["Continue using journal features and try requesting a therapy session again later"]
      }
    };
  }

  try {
    // Format entries and conflicts for the prompt
    const userEntriesFormatted = userEntries.map(entry => 
      `Title: ${entry.title}\nDate: ${entry.date.toLocaleDateString()}\nEmotions: ${entry.emotions?.join(', ') || 'Not specified'}\nContent: ${entry.content}`
    ).join('\n\n---\n\n');

    const partnerEntriesFormatted = partnerEntries.map(entry => 
      `Title: ${entry.title}\nDate: ${entry.date.toLocaleDateString()}\nEmotions: ${entry.emotions?.join(', ') || 'Not specified'}\nContent: ${entry.content}`
    ).join('\n\n---\n\n');

    const conflictsFormatted = conflictThreads.map(thread => {
      const messagesFormatted = thread.messages.map(msg => 
        `${msg.author} (${msg.date.toLocaleDateString()}): ${msg.content}`
      ).join('\n');
      
      return `Topic: ${thread.topic}\n\nMessages:\n${messagesFormatted}`;
    }).join('\n\n---\n\n');

    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are a team of two compassionate and insightful couples therapists named Dr. Sofia and Dr. Michael. You are creating a 5-7 minute conversational therapy session script for a couple based on their recent journal entries, shared messages, and conflict threads.

Your task is to:
1. Carefully analyze the shared data to identify emotional patterns, core issues, and relationship dynamics.
2. Create a realistic therapy-style script where you (Dr. Sofia and Dr. Michael) take turns discussing your observations, insights, and suggestions for the couple.
3. Validate both partners' feelings and perspectives without taking sides.
4. Provide constructive guidance and practical next steps that are specific to the couple's situation.
5. Maintain a calm, supportive, and professional tone throughout.

USER'S JOURNAL ENTRIES:
${userEntriesFormatted || "No recent journal entries available."}

PARTNER'S SHARED ENTRIES:
${partnerEntriesFormatted || "No recent partner entries available."}

CONFLICT THREADS:
${conflictsFormatted || "No recent conflict threads available."}

Respond with a JSON object containing:
1. "transcript": A realistic therapy script with dialog between Dr. Sofia and Dr. Michael, addressing the couple's specific situation (800-1000 words).
2. "summary": An object containing:
   - "emotionalPatterns": An array of 3-5 key emotional patterns identified in the relationship (e.g., "Withdrawal during conflict", "Difficulty expressing vulnerability").
   - "coreIssues": An array of 2-4 underlying issues that appear to be causing tension (e.g., "Unmet expectations around household responsibilities", "Different communication styles").
   - "recommendations": An array of 3-5 specific, actionable recommendations for the couple.`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please generate a therapy session script based on this couple's data." }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "therapy session generation");

    return {
      transcript: result.transcript || "We couldn't generate a therapy session transcript due to insufficient data. Consider sharing more journal entries or resolving some conflict threads together.",
      summary: {
        emotionalPatterns: result.summary?.emotionalPatterns || ["Insufficient data to identify clear patterns"],
        coreIssues: result.summary?.coreIssues || ["Insufficient data to identify core issues"],
        recommendations: result.summary?.recommendations || ["Continue journaling and sharing entries to build more insights"]
      }
    };
  } catch (error) {
    console.error("Error generating therapy session:", error);
    
    // Provide a fallback response in case of an error
    return {
      transcript: "We apologize, but we couldn't generate a therapy session at this time. Please try again later.",
      summary: {
        emotionalPatterns: ["Error occurred during analysis"],
        coreIssues: ["Please try again later"],
        recommendations: ["Continue using journal features and try requesting a therapy session again later"]
      }
    };
  }
}

export async function generateJournalResponse(
  journalContent: string,
  responseType: string
): Promise<JournalResponseGenerationResult> {
  if (!openai) {
    console.warn('OpenAI API key not available. Journal response generation unavailable.');
    return {
      response: "I appreciate you sharing this with me. It helps me understand your perspective better. I'm here for you and value your thoughts and feelings."
    };
  }

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
    const response = await openai!.chat.completions.create({
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

/**
 * Analyzes a collection of journal entries and emotional data to identify patterns,
 * trends, and provide relationship insights
 * @param journalEntries Array of recent journal entries with emotions data
 * @param emotionalExpressions Array of recorded emotional expressions and their contexts
 * @param partnerData Optional data about partner's emotional patterns
 * @returns Comprehensive analysis of emotion patterns with insights
 */
export async function analyzeEmotionPatterns(
  journalEntries: Array<{
    title: string;
    content: string;
    emotions?: string[];
    emotionalScore?: number;
    createdAt: Date;
  }>,
  emotionalExpressions: Array<{
    emotion: string;
    context: string;
    intensity?: number;
    date: Date;
  }>,
  partnerData?: {
    dominantEmotions?: string[];
    recentExpressions?: Array<{
      emotion: string;
      date: Date;
    }>;
  }
): Promise<EmotionPatternAnalysisResponse> {
  if (!openai) {
    console.warn('OpenAI API key not available. Emotion pattern analysis unavailable.');
    return createMockEmotionAnalysis(emotionalExpressions);
  }

  try {
    // Format the journal entries data
    const formattedJournalEntries = journalEntries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // newest first
      .map(entry => ({
        title: entry.title,
        content: entry.content.substring(0, 500) + (entry.content.length > 500 ? "..." : ""), // truncate long content
        emotions: entry.emotions || [],
        emotionalScore: entry.emotionalScore || 5,
        date: entry.createdAt.toISOString().split('T')[0]
      }));

    // Format emotional expressions data
    const formattedExpressions = emotionalExpressions
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // newest first
      .map(expr => ({
        emotion: expr.emotion,
        context: expr.context.substring(0, 100) + (expr.context.length > 100 ? "..." : ""), // truncate long context
        intensity: expr.intensity || 5,
        date: expr.date.toISOString().split('T')[0]
      }));

    // Construct the prompt for the OpenAI API
    const systemPrompt = `You are an expert in relationship psychology and emotional intelligence analysis. 
Your task is to analyze a user's emotional patterns across their journal entries and emotional expressions.
Identify patterns, trends, and provide relationship insights based on the following data:

JOURNAL ENTRIES (newest first):
${JSON.stringify(formattedJournalEntries, null, 2)}

EMOTIONAL EXPRESSIONS (newest first):
${JSON.stringify(formattedExpressions, null, 2)}

${partnerData ? `PARTNER EMOTIONAL DATA:
${JSON.stringify(partnerData, null, 2)}` : ''}

Respond with a JSON object containing:
1. "dominantEmotions": An array of objects, each with:
   - "emotion": Name of the emotion
   - "frequency": Number from 0-10 representing how frequently it appears
   - "intensity": Number from 0-10 representing the average intensity
   - "description": Brief description of how this emotion manifests
2. "emotionTrends": Object containing:
   - "overall": The overall trend ("improving", "declining", "fluctuating", or "stable")
   - "description": Description of the emotional trend over time
   - "recentShift": Any significant recent shift in emotional patterns, or null if none
3. "patterns": Array of objects describing emotional patterns, each with:
   - "name": Short descriptive name of the pattern
   - "description": Detailed description of the pattern
   - "emotions": Array of emotions involved in this pattern
   - "triggers": Array of likely triggers for this pattern
   - "suggestedStrategies": Array of strategies to address this pattern
4. "relationshipInsights": Object containing:
   - "communicationStyle": Description of the user's communication style
   - "emotionalDynamics": Description of emotional dynamics in the relationship
   - "growthAreas": Array of areas for growth in emotional intelligence
   - "strengths": Array of emotional strengths demonstrated
5. "personalizedRecommendations": Array of personalized recommendations for improving emotional intelligence and communication in the relationship`;

    // Call the OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please analyze these emotional patterns with your relationship psychology expertise." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "emotion pattern analysis");

    // Default values if missing
    if (!result.dominantEmotions || !Array.isArray(result.dominantEmotions) || result.dominantEmotions.length === 0) {
      result.dominantEmotions = [{
        emotion: "neutral",
        frequency: 5,
        intensity: 5,
        description: "A balanced emotional state that doesn't lean strongly positive or negative."
      }];
    }
    
    if (!result.emotionTrends) {
      result.emotionTrends = {
        overall: "stable",
        description: "Your emotional patterns have remained relatively stable over the analyzed period.",
        recentShift: null
      };
    }
    
    if (!result.patterns || !Array.isArray(result.patterns) || result.patterns.length === 0) {
      result.patterns = [{
        name: "Baseline Pattern",
        description: "Your typical emotional responses show a balanced approach to relationship situations.",
        emotions: ["neutral"],
        triggers: ["everyday interactions"],
        suggestedStrategies: ["Continue regular journaling to build more emotional awareness"]
      }];
    }
    
    if (!result.relationshipInsights) {
      result.relationshipInsights = {
        communicationStyle: "Your communication style is still being analyzed as more data is collected.",
        emotionalDynamics: "The emotional dynamics in your relationship are still being analyzed.",
        growthAreas: ["Emotional awareness", "Communication clarity"],
        strengths: ["Willingness to reflect", "Desire for growth"]
      };
    }
    
    if (!result.personalizedRecommendations || !Array.isArray(result.personalizedRecommendations) || result.personalizedRecommendations.length === 0) {
      result.personalizedRecommendations = [
        "Continue journaling regularly to build more data for analysis",
        "Practice identifying and naming emotions when they arise",
        "Use the emotion transformation tools when communicating about sensitive topics"
      ];
    }
    
    return result as EmotionPatternAnalysisResponse;
  } catch (error) {
    console.error("Error analyzing emotion patterns:", error);
    
    // Provide fallback values in case of an error
    return {
      dominantEmotions: [{
        emotion: "neutral",
        frequency: 5,
        intensity: 5,
        description: "A balanced emotional state that doesn't lean strongly positive or negative."
      }],
      emotionTrends: {
        overall: "stable",
        description: "Your emotional patterns appear stable based on the available data.",
        recentShift: null
      },
      patterns: [{
        name: "Basic Communication Pattern",
        description: "Your typical approach to relationship communication.",
        emotions: ["neutral"],
        triggers: ["everyday interactions"],
        suggestedStrategies: ["Continue using the app to build more data for analysis"]
      }],
      relationshipInsights: {
        communicationStyle: "Your communication style is still being analyzed.",
        emotionalDynamics: "The emotional dynamics in your relationship are still being analyzed.",
        growthAreas: ["Emotional awareness", "Communication clarity"],
        strengths: ["Willingness to reflect", "Desire for growth"]
      },
      personalizedRecommendations: [
        "Continue journaling regularly to build more data for analysis",
        "Practice identifying and naming emotions when they arise",
        "Use the emotion transformation tools when communicating about sensitive topics"
      ]
    };
  }
}

export async function analyzeJournalEntry(
  journalEntry: string,
  title: string,
  userId: number,
  previousEntries?: PreviousEntry[]
): Promise<JournalAnalysisResponse> {
  if (!openai) {
    console.warn('OpenAI API key not available. Journal entry analysis unavailable.');
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
    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please analyze this journal entry with emotional intelligence and relationship psychology expertise." }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = safeParseJSON(response.choices[0].message.content || "{}", "journal entry analysis");

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
