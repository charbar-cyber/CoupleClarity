import OpenAI from "openai";
import { TransformationResponse } from "@shared/schema";

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
