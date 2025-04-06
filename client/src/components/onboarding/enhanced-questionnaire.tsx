import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  communicationFrequencyOptions,
  enhancedOnboardingSchema, 
  type EnhancedOnboardingQuestionnaire
} from "@shared/schema";
import { OnboardingQuestionnaire } from "./questionnaire";
import { Loader2 } from "lucide-react";

// Map from schema values to human-readable labels
const communicationFrequencyLabels: Record<string, string> = {
  daily: "Daily",
  few_times_week: "A few times a week",
  weekly: "Weekly",
  few_times_month: "A few times a month",
  monthly_or_less: "Monthly or less"
};

type EnhancedOnboardingProps = {
  onComplete: () => void;
  initialPreferences?: Partial<EnhancedOnboardingQuestionnaire>;
};

export function EnhancedOnboardingQuestionnaire({ onComplete, initialPreferences }: EnhancedOnboardingProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"preferences" | "relationship" | "complete">("preferences");
  const [preferencesData, setPreferencesData] = useState<Partial<EnhancedOnboardingQuestionnaire>>({});

  // Form for relationship-specific questions
  const relationshipForm = useForm<EnhancedOnboardingQuestionnaire>({
    resolver: zodResolver(enhancedOnboardingSchema),
    defaultValues: {
      ...initialPreferences,
      ...preferencesData,
      relationshipGoals: "",
      challengeAreas: "",
      communicationFrequency: undefined
    }
  });

  // Handle completion of the preferences step
  const handlePreferencesComplete = (data: Partial<EnhancedOnboardingQuestionnaire>) => {
    setPreferencesData(data);
    setStep("relationship");
  };

  // Save the complete questionnaire
  const saveEnhancedQuestionnaireMutation = useMutation({
    mutationFn: async (data: EnhancedOnboardingQuestionnaire) => {
      const res = await apiRequest("POST", "/api/user/enhanced-onboarding", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Questionnaire complete!",
        description: "Your relationship preferences and goals have been saved.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnhancedOnboardingQuestionnaire) => {
    const completeData = {
      ...preferencesData,
      ...data
    } as EnhancedOnboardingQuestionnaire;
    
    saveEnhancedQuestionnaireMutation.mutate(completeData);
  };

  if (step === "preferences") {
    return (
      <OnboardingQuestionnaire 
        onComplete={handlePreferencesComplete} 
        initialValues={initialPreferences}
        isEnhancedFlow={true}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            Your Relationship
          </CardTitle>
          <CardDescription className="text-lg">
            Tell us about your goals and challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...relationshipForm}>
            <form onSubmit={relationshipForm.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={relationshipForm.control}
                name="relationshipGoals"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>What are your relationship goals?</FormLabel>
                    <FormDescription>
                      Share what you hope to achieve or improve in your relationship
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Better communication, more quality time, plan for the future..."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={relationshipForm.control}
                name="challengeAreas"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>What challenges are you facing?</FormLabel>
                    <FormDescription>
                      Describe areas where you feel you and your partner could improve
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Conflict resolution, expressing emotions, managing stress..."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={relationshipForm.control}
                name="communicationFrequency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>How often do you prefer to have meaningful conversations?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-3"
                      >
                        {communicationFrequencyOptions.map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 shadow-sm"
                          >
                            <FormControl>
                              <RadioGroupItem value={option} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full">
                              {communicationFrequencyLabels[option]}
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
            onClick={() => setStep("preferences")}
            disabled={saveEnhancedQuestionnaireMutation.isPending}
          >
            Back
          </Button>
          <Button 
            onClick={relationshipForm.handleSubmit(onSubmit)}
            disabled={saveEnhancedQuestionnaireMutation.isPending}
          >
            {saveEnhancedQuestionnaireMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}