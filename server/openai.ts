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

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-demo-key-for-development" 
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
