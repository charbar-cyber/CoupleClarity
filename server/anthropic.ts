import Anthropic from '@anthropic-ai/sdk';

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