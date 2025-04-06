import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LoveLanguageDiscovery } from "./love-language-discovery";
import { 
  loveLanguageOptions, 
  conflictStyleOptions, 
  communicationStyleOptions, 
  repairStyleOptions,
  onboardingQuestionnaireSchema
} from "@shared/schema";

// Map from schema values to human-readable labels
const loveLanguageLabels: Record<string, string> = {
  words_of_affirmation: "Words of affirmation",
  quality_time: "Quality time",
  acts_of_service: "Acts of service",
  physical_touch: "Physical touch",
  gifts: "Gifts or thoughtful gestures",
  not_sure: "I'm not sure"
};

const conflictStyleLabels: Record<string, string> = {
  avoid: "I shut down or avoid",
  emotional: "I get emotional or confrontational",
  talk_calmly: "I try to talk it through calmly",
  need_space: "I need space before I can talk",
  not_sure: "I don't always know what I need"
};

const communicationStyleLabels: Record<string, string> = {
  gentle: "Gentle and patient",
  direct: "Honest and direct",
  structured: "Calm and structured",
  supportive: "Supportive and reassuring",
  light: "Light and non-confrontational"
};

const repairStyleLabels: Record<string, string> = {
  apology: "A thoughtful apology",
  space_checkin: "Space, then a check-in",
  physical_closeness: "Physical closeness (hug, time together)",
  caring_message: "A caring message or note",
  talking: "Just talking it out"
};

type OnboardingQuestionnaireProps = {
  onComplete: (data: Partial<QuestionnaireFormValues>) => void;
  onBack?: () => void;
  initialValues?: Partial<QuestionnaireFormValues>;
  isEnhancedFlow?: boolean;
};

type QuestionnaireFormValues = z.infer<typeof onboardingQuestionnaireSchema>;

export function OnboardingQuestionnaire({ onComplete, onBack, initialValues, isEnhancedFlow = false }: OnboardingQuestionnaireProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showLoveLanguageDiscovery, setShowLoveLanguageDiscovery] = useState(false);
  
  const form = useForm<QuestionnaireFormValues>({
    resolver: zodResolver(onboardingQuestionnaireSchema),
    defaultValues: {
      loveLanguage: initialValues?.loveLanguage ?? undefined,
      conflictStyle: initialValues?.conflictStyle ?? undefined,
      communicationStyle: initialValues?.communicationStyle ?? undefined,
      repairStyle: initialValues?.repairStyle ?? undefined
    }
  });
  
  const steps = [
    {
      title: "Love Language",
      description: "How do you most feel loved in a relationship?",
      field: "loveLanguage" as const,
      options: loveLanguageOptions,
      optionLabels: loveLanguageLabels
    },
    {
      title: "Conflict Style",
      description: "When you're upset, how do you usually respond?",
      field: "conflictStyle" as const,
      options: conflictStyleOptions,
      optionLabels: conflictStyleLabels
    },
    {
      title: "Communication Style",
      description: "What tone of communication feels safest for you during conflict?",
      field: "communicationStyle" as const,
      options: communicationStyleOptions,
      optionLabels: communicationStyleLabels
    },
    {
      title: "Repair Style",
      description: "What helps you reconnect after a disagreement?",
      field: "repairStyle" as const,
      options: repairStyleOptions,
      optionLabels: repairStyleLabels
    }
  ];

  const currentQuestion = steps[currentStep];
  
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: QuestionnaireFormValues) => {
      const res = await apiRequest("POST", "/api/user/preferences", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Preferences saved!",
        description: "Your relationship preferences have been saved.",
      });
      
      // Pass the form data to the parent component
      const values = form.getValues();
      onComplete(values);
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  async function handleNext() {
    const field = currentQuestion.field;
    const isValid = await form.trigger(field);
    
    if (isValid) {
      // If on love language step and "not_sure" is selected, show the discovery flow
      if (currentStep === 0 && form.getValues().loveLanguage === 'not_sure') {
        setShowLoveLanguageDiscovery(true);
        return;
      }
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // On final step
        const values = form.getValues();
        
        if (isEnhancedFlow) {
          // Just pass the values to the parent component if this is part of the enhanced flow
          onComplete(values);
        } else {
          // Otherwise submit the form (regular flow)
          savePreferencesMutation.mutate(values);
        }
      }
    }
  }
  
  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (onBack) {
      // If we're on the first step and an onBack handler was provided, call it
      onBack();
    }
  }

  // Handler for when love language discovery completes
  const handleLoveLanguageDiscoveryComplete = (loveLanguage: string) => {
    // Update the form with discovered love language
    form.setValue('loveLanguage', loveLanguage as any);
    setShowLoveLanguageDiscovery(false);
    
    // Proceed to next question
    setCurrentStep(prev => prev + 1);
    
    // Show toast to inform user
    toast({
      title: "Love Language Discovered!",
      description: `Based on your answers, your primary love language is: ${loveLanguageLabels[loveLanguage]}`,
    });
  };

  // Handler to return from discovery flow to main question
  const handleLoveLanguageDiscoveryBack = () => {
    setShowLoveLanguageDiscovery(false);
  };

  // If love language discovery is being shown, render that instead
  if (showLoveLanguageDiscovery) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
        <LoveLanguageDiscovery 
          onComplete={handleLoveLanguageDiscoveryComplete}
          onBack={handleLoveLanguageDiscoveryBack} 
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {currentQuestion.title}
          </CardTitle>
          <CardDescription className="text-lg">
            {currentQuestion.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name={currentQuestion.field}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-3"
                      >
                        {currentQuestion.options.map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 shadow-sm"
                          >
                            <FormControl>
                              <RadioGroupItem value={option} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full">
                              {currentQuestion.optionLabels[option]}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 && !onBack}
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={savePreferencesMutation.isPending}
          >
            {currentStep < steps.length - 1 ? "Next" : "Complete"}
            {savePreferencesMutation.isPending && (
              <span className="ml-2 animate-spin">⟳</span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}