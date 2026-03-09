import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

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

  const totalDiscoverySteps = discoveryQuestions.length;
  const progressPercent = ((currentQuestionIndex + 1) / totalDiscoverySteps) * 100;

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

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Restore previous answer
      const prevAnswers = answers.slice(0, -1);
      setAnswers(prevAnswers);
      setSelectedOption(answers[answers.length - 1] || null);
    } else {
      onBack();
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
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Progress section */}
      <div className="space-y-1.5 px-1">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Discovery {currentQuestionIndex + 1} of {totalDiscoverySteps}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <Card className="w-full shadow-lg border-primary/10 overflow-hidden">
        <div className="h-1 bg-pink-500" />
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-pink-50 text-pink-600">
              <Sparkles className="h-4 w-4" />
              Love Language Discovery
            </span>
          </div>
          <p className="text-lg text-foreground/80">
            {currentQuestion.question}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RadioGroup
              onValueChange={handleOptionSelect}
              value={selectedOption || ""}
              className="space-y-2"
            >
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.value;
                return (
                  <div
                    key={option.value}
                    className={`
                      flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer
                      transition-all duration-200
                      ${isSelected
                        ? "border-pink-200 bg-pink-50 shadow-md"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      }
                    `}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className={`cursor-pointer w-full transition-all duration-200 ${isSelected ? "font-medium" : "font-normal"}`}>
                      {option.text}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedOption}
          >
            {currentQuestionIndex < discoveryQuestions.length - 1 ? "Next" : "Discover"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
