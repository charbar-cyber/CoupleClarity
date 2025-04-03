import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type LoveLanguageDiscoveryProps = {
  onComplete: (loveLanguage: string) => void;
  onBack: () => void;
};

type DiscoveryQuestion = {
  question: string;
  options: {
    text: string;
    value: string;
  }[];
};

export function LoveLanguageDiscovery({ onComplete, onBack }: LoveLanguageDiscoveryProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const discoveryQuestions: DiscoveryQuestion[] = [
    {
      question: "Which of these moments would make you feel most appreciated by your partner?",
      options: [
        { text: "A thoughtful, heartfelt compliment", value: "words_of_affirmation" },
        { text: "Spending uninterrupted time together", value: "quality_time" },
        { text: "Helping you with tasks without being asked", value: "acts_of_service" },
        { text: "A warm hug or holding hands", value: "physical_touch" },
        { text: "A surprise gift that shows they were thinking of you", value: "gifts" }
      ]
    },
    {
      question: "When you're feeling down, what comforts you most from your partner?",
      options: [
        { text: "Encouraging or loving words", value: "words_of_affirmation" },
        { text: "Just being there with me", value: "quality_time" },
        { text: "Doing something helpful for me", value: "acts_of_service" },
        { text: "A physical gesture like a hug or touch", value: "physical_touch" },
        { text: "Bringing me something thoughtful", value: "gifts" }
      ]
    },
    {
      question: "What makes you feel most connected after a long or stressful day?",
      options: [
        { text: "A meaningful conversation", value: "words_of_affirmation" },
        { text: "Time spent together doing nothing", value: "quality_time" },
        { text: "Partner taking care of something for you", value: "acts_of_service" },
        { text: "A cuddle or kiss", value: "physical_touch" },
        { text: "A small surprise or token of affection", value: "gifts" }
      ]
    }
  ];

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (selectedOption) {
      // Add current answer
      const newAnswers = [...answers, selectedOption];
      setAnswers(newAnswers);
      
      // Move to next question or finish
      if (currentQuestionIndex < discoveryQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null); // Reset selection for next question
      } else {
        // Determine love language based on answers
        const loveLanguage = determineLoveLanguage(newAnswers);
        onComplete(loveLanguage);
      }
    }
  };

  // Function to determine the predominant love language based on answers
  const determineLoveLanguage = (answerList: string[]): string => {
    // Count occurrences of each love language
    const counts: Record<string, number> = {
      words_of_affirmation: 0,
      quality_time: 0,
      acts_of_service: 0,
      physical_touch: 0,
      gifts: 0
    };
    
    // Tally the answers
    answerList.forEach(answer => {
      if (counts[answer] !== undefined) {
        counts[answer]++;
      }
    });
    
    // Find the love language with the highest count
    let maxCount = 0;
    let dominantLoveLanguage = "words_of_affirmation"; // Default
    
    Object.entries(counts).forEach(([language, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantLoveLanguage = language;
      }
    });
    
    return dominantLoveLanguage;
  };

  const currentQuestion = discoveryQuestions[currentQuestionIndex];

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-primary/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Discover Your Love Language</CardTitle>
        <CardDescription className="text-lg">
          {currentQuestion.question}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <RadioGroup
            onValueChange={handleOptionSelect}
            value={selectedOption || ""}
            className="space-y-3"
          >
            {currentQuestion.options.map((option) => (
              <FormItem
                key={option.value}
                className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 shadow-sm"
              >
                <FormControl>
                  <RadioGroupItem value={option.value} />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer w-full">
                  {option.text}
                </FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedOption}
        >
          {currentQuestionIndex < discoveryQuestions.length - 1 ? "Next" : "Complete"}
        </Button>
      </CardFooter>
    </Card>
  );
}