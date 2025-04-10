import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  onBack: () => void;
  initialPreferences?: Partial<EnhancedOnboardingQuestionnaire>;
};

export function EnhancedOnboardingQuestionnaire({ onComplete, onBack, initialPreferences }: EnhancedOnboardingProps) {
  const { toast } = useToast();
  // If we have initialPreferences with all required love language fields, 
  // start directly at relationship questions to avoid duplicate questions
  const hasCompletedPreferences = initialPreferences && 
    initialPreferences.loveLanguage && 
    initialPreferences.conflictStyle && 
    initialPreferences.communicationStyle && 
    initialPreferences.repairStyle;
    
  const [step, setStep] = useState<"preferences" | "relationship" | "complete">(
    hasCompletedPreferences ? "relationship" : "preferences"
  );
  const [preferencesData, setPreferencesData] = useState<Partial<EnhancedOnboardingQuestionnaire>>(
    initialPreferences || {}
  );
  
  // State for challenge selections
  const [selectedChallenges, setSelectedChallenges] = useState<{
    communication: boolean;
    emotionalDistance: boolean;
    trust: boolean;
    parenting: boolean;
    intimacy: boolean;
    other: boolean;
  }>({
    communication: false,
    emotionalDistance: false,
    trust: false,
    parenting: false,
    intimacy: false,
    other: false
  });
  
  const [otherChallenge, setOtherChallenge] = useState("");

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
    setPreferencesData({...preferencesData, ...data});
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
  
  // Handle back button clicks
  const handleBack = () => {
    if (step === "relationship" && !hasCompletedPreferences) {
      // Only go back to preferences if we haven't completed them already
      setStep("preferences");
    } else {
      // Otherwise go back to the previous page in the main onboarding flow
      onBack();
    }
  };

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
                    <FormLabel>What do you hope to build, strengthen, or heal in your relationship?</FormLabel>
                    <FormDescription>
                      Share your vision for how you want your relationship to grow
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
                render={({ field: { onChange, value, ...fieldProps } }) => {
                  // Update text field when checkboxes change
                  const handleChallengeChange = (updatedChallenges = selectedChallenges, updatedOther = otherChallenge) => {
                    let challenges = [];
                    if (updatedChallenges.communication) challenges.push("Communication breakdowns");
                    if (updatedChallenges.emotionalDistance) challenges.push("Emotional distance");
                    if (updatedChallenges.trust) challenges.push("Trust or betrayal");
                    if (updatedChallenges.parenting) challenges.push("Parenting stress");
                    if (updatedChallenges.intimacy) challenges.push("Intimacy issues");
                    if (updatedChallenges.other && updatedOther.trim()) {
                      challenges.push(updatedOther.trim());
                    }
                    onChange(challenges.join(", "));
                  };

                  return (
                    <FormItem className="space-y-3">
                      <FormLabel>What causes you and your partner to get stuck?</FormLabel>
                      <FormDescription>
                        Select all that apply to your relationship
                      </FormDescription>
                      
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-communication" 
                            checked={selectedChallenges.communication}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, communication: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <FormLabel htmlFor="challenge-communication" className="font-normal flex-1 cursor-pointer">
                            Communication breakdowns
                          </FormLabel>
                        </div>
                        
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-emotional" 
                            checked={selectedChallenges.emotionalDistance}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, emotionalDistance: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <Label htmlFor="challenge-emotional" className="font-normal flex-1 cursor-pointer">
                            Emotional distance
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-trust" 
                            checked={selectedChallenges.trust}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, trust: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <Label htmlFor="challenge-trust" className="font-normal flex-1 cursor-pointer">
                            Trust or betrayal
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-parenting" 
                            checked={selectedChallenges.parenting}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, parenting: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <Label htmlFor="challenge-parenting" className="font-normal flex-1 cursor-pointer">
                            Parenting stress
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-intimacy" 
                            checked={selectedChallenges.intimacy}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, intimacy: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <Label htmlFor="challenge-intimacy" className="font-normal flex-1 cursor-pointer">
                            Intimacy issues
                          </Label>
                        </div>
                        
                        <div className="flex items-start space-x-2 p-2 border rounded-md">
                          <Checkbox 
                            id="challenge-other" 
                            checked={selectedChallenges.other}
                            onCheckedChange={(checked) => {
                              setSelectedChallenges({...selectedChallenges, other: checked === true});
                              handleChallengeChange();
                            }}
                          />
                          <Label htmlFor="challenge-other" className="font-normal flex-1 cursor-pointer">
                            Other
                          </Label>
                        </div>
                        
                        {selectedChallenges.other && (
                          <div className="ml-6 mt-2">
                            <Input 
                              placeholder="Please specify..."
                              value={otherChallenge}
                              onChange={(e) => {
                                setOtherChallenge(e.target.value);
                                // Small delay to ensure state updates
                                setTimeout(handleChallengeChange, 0);
                              }}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                      
                      <FormControl>
                        <Input 
                          type="hidden" 
                          value={value} 
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
            onClick={handleBack}
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