import OpenAI from "openai";
import { TransformationResponse } from "@shared/schema";

// Interface for response summary
interface ResponseSummary {
  summary: string;
  effectiveness: number;
  positiveElements: string[];
  suggestionsForImprovement: string[];
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
