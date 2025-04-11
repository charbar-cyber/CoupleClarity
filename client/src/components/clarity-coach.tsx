import { useState, useEffect } from 'react';
import { JournalEntry } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BrainCog, MessageCircle, Share2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface ClarityCoachProps {
  journalEntry: JournalEntry;
  onSharePrompt?: (prompt: string) => void;
}

interface CoachingSuggestion {
  type: 'insight' | 'prompt' | 'action';
  text: string;
  actionText?: string;
  actionHandler?: () => void;
}

export function ClarityCoach({ journalEntry, onSharePrompt }: ClarityCoachProps) {
  const [suggestions, setSuggestions] = useState<CoachingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Simulate getting AI coaching suggestions based on the journal entry
  useEffect(() => {
    const generateSuggestions = async () => {
      setIsLoading(true);
      
      try {
        // If we have AI analysis, use it to generate better suggestions
        if (journalEntry.emotionalInsight || journalEntry.patternCategory) {
          // Later we can call the backend for real AI-generated suggestions
          // For now, generate suggestions based on entry content and any analysis we have
          const mockSuggestions = generateSuggestionsFromEntry(journalEntry);
          setSuggestions(mockSuggestions);
        } else {
          // Default suggestions if no AI analysis is available
          setSuggestions([
            {
              type: 'insight',
              text: "Writing regularly helps build emotional awareness. What patterns do you notice in your journaling?"
            },
            {
              type: 'prompt',
              text: "Consider reflecting on how this situation affected your feelings of connection with your partner.",
              actionText: "Share with partner",
              actionHandler: () => onSharePrompt && onSharePrompt("How did this situation affect your feelings of connection with me?")
            },
            {
              type: 'action',
              text: "Would you like to invite your partner to reflect on this topic together?",
              actionText: "Create shared prompt",
              actionHandler: () => onSharePrompt && onSharePrompt("I'd like to explore this topic together. What are your thoughts?")
            }
          ]);
        }
      } catch (error) {
        console.error("Error generating coaching suggestions:", error);
        setSuggestions([
          {
            type: 'insight',
            text: "Your journaling practice is helping you develop emotional awareness."
          },
          {
            type: 'prompt',
            text: "Consider how you might express these feelings to your partner in a constructive way."
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    generateSuggestions();
  }, [journalEntry, onSharePrompt]);

  // Helper function to generate suggestions based on journal content and analysis
  const generateSuggestionsFromEntry = (entry: JournalEntry): CoachingSuggestion[] => {
    const suggestions: CoachingSuggestion[] = [];
    
    // Add insight based on emotional pattern if available
    if (entry.patternCategory) {
      const patternText = entry.patternCategory.replace(/_/g, " ");
      suggestions.push({
        type: 'insight',
        text: `I notice a pattern of "${patternText}" in your journal entries. This might be something to explore more deeply.`
      });
    }
    
    // Add prompt based on emotional insight if available
    if (entry.emotionalInsight) {
      suggestions.push({
        type: 'prompt',
        text: `Based on your emotional insight: Would you like to explore why you felt ${entry.emotions?.slice(0, 2).join(" and ")}?`,
        actionText: "Share reflection prompt",
        actionHandler: () => onSharePrompt && onSharePrompt(`I've been reflecting on why I felt ${entry.emotions?.slice(0, 2).join(" and ")}. I'd appreciate hearing your perspective.`)
      });
    }

    // Check for keywords in content to generate targeted suggestions
    const lowerContent = entry.content.toLowerCase();
    
    if (lowerContent.includes('unappreciated') || lowerContent.includes('ignored') || lowerContent.includes('overlooked')) {
      suggestions.push({
        type: 'insight',
        text: "You seem to be writing about feeling unappreciated. This is a common feeling that can impact relationships deeply."
      });
      suggestions.push({
        type: 'action',
        text: "Would you like help expressing your need for appreciation in a gentle way?",
        actionText: "Create appreciation request",
        actionHandler: () => onSharePrompt && onSharePrompt("I've been reflecting on our relationship and realized I sometimes need more explicit appreciation. Could we talk about ways we might acknowledge each other's efforts more?")
      });
    }
    
    if (lowerContent.includes('misunderstood') || lowerContent.includes('misunderstanding') || lowerContent.includes("don't understand")) {
      suggestions.push({
        type: 'prompt',
        text: "Feeling misunderstood can be frustrating. Would checking your understanding with your partner help?",
        actionText: "Create clarity prompt",
        actionHandler: () => onSharePrompt && onSharePrompt("I want to make sure I'm understanding your perspective correctly. Could you share more about how you see this situation?")
      });
    }

    if (lowerContent.includes('boundary') || lowerContent.includes('respect') || lowerContent.includes('space')) {
      suggestions.push({
        type: 'action',
        text: "You mentioned boundaries. Would you like help formulating a clear boundary statement?",
        actionText: "Create boundary statement",
        actionHandler: () => onSharePrompt && onSharePrompt("I've been reflecting on my needs, and I'd like to discuss establishing a boundary around...")
      });
    }
    
    // Add default suggestions if we don't have enough
    if (suggestions.length < 3) {
      suggestions.push({
        type: 'insight',
        text: "Regular journaling helps you track your emotional patterns and growth over time."
      });
      
      suggestions.push({
        type: 'action',
        text: "Would you like to invite your partner to share their perspective on this topic?",
        actionText: "Request partner perspective",
        actionHandler: () => onSharePrompt && onSharePrompt("I've been thinking about this topic and I'd value hearing your perspective.")
      });
    }
    
    return suggestions;
  };

  // Display icon based on suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'insight':
        return <BrainCog className="h-5 w-5 text-primary" />;
      case 'prompt':
        return <MessageCircle className="h-5 w-5 text-indigo-500" />;
      case 'action':
        return <Share2 className="h-5 w-5 text-amber-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BrainCog className="h-5 w-5 text-primary" />
          Clarity Coach
        </CardTitle>
        <CardDescription>
          Personalized guidance based on your journal entry
        </CardDescription>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm">Analyzing your journal entry...</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 border rounded-lg bg-card">
                  <div className="flex gap-3 items-start mb-2">
                    {getSuggestionIcon(suggestion.type)}
                    <div>
                      <p className="text-sm">{suggestion.text}</p>
                      
                      {suggestion.actionText && suggestion.actionHandler && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-xs"
                          onClick={suggestion.actionHandler}
                        >
                          {suggestion.actionText}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      
      <CardFooter className="pt-1 text-xs text-muted-foreground">
        <p>Suggestions are based on your journal content and emotional patterns</p>
      </CardFooter>
    </Card>
  );
}