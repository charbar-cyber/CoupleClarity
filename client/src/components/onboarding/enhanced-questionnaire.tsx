import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  communicationFrequencyOptions,
  enhancedOnboardingSchema,
  type EnhancedOnboardingQuestionnaire
} from "@shared/schema";
import { OnboardingQuestionnaire } from "./questionnaire";
import { Loader2, Target, Clock } from "lucide-react";

// Map from schema values to human-readable labels
const communicationFrequencyLabels: Record<string, string> = {
  daily: "Daily",
  few_times_week: "A few times a week",
  weekly: "Weekly",
  few_times_month: "A few times a month",
  monthly_or_less: "Monthly or less"
};

// Step config for the two enhanced sub-steps
const enhancedStepConfig = [
  {
    icon: Target,
    title: "Relationship Goals",
    stripe: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600",
  },
  {
    icon: Clock,
    title: "Communication Frequency",
    stripe: "bg-accent-coral",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-accent-coral",
  },
];

type EnhancedOnboardingProps = {
  onComplete: () => void;
  onBack: () => void;
  initialPreferences?: Partial<EnhancedOnboardingQuestionnaire>;
  totalSteps?: number;
  globalStepOffset?: number;
};

export function EnhancedOnboardingQuestionnaire({ onComplete, onBack, initialPreferences, totalSteps = 6, globalStepOffset = 4 }: EnhancedOnboardingProps) {
  const { toast } = useToast();
  // If we have initialPreferences with all required love language fields,
  // start directly at relationship questions to avoid duplicate questions
  const hasCompletedPreferences = initialPreferences &&
    initialPreferences.loveLanguage &&
    initialPreferences.conflictStyle &&
    initialPreferences.communicationStyle &&
    initialPreferences.repairStyle;

  const [step, setStep] = useState<"preferences" | "goals" | "frequency">(
    hasCompletedPreferences ? "goals" : "preferences"
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
    setStep("goals");
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
        totalSteps={totalSteps}
        globalStepOffset={0}
      />
    );
  }

  // Determine sub-step index (0 = goals, 1 = frequency)
  const subStepIndex = step === "goals" ? 0 : 1;
  const config = enhancedStepConfig[subStepIndex];
  const globalStep = globalStepOffset + subStepIndex + 1;
  const progressPercent = (globalStep / totalSteps) * 100;
  const StepIcon = config.icon;

  // Handle back button
  const handleBack = () => {
    if (step === "frequency") {
      setStep("goals");
    } else if (!hasCompletedPreferences) {
      setStep("preferences");
    } else {
      onBack();
    }
  };

  // Handle next from goals step to frequency step
  const handleGoalsNext = async () => {
    // Validate goals + challenges fields
    const goalsValid = await relationshipForm.trigger("relationshipGoals");
    const challengesValid = await relationshipForm.trigger("challengeAreas");
    if (goalsValid && challengesValid) {
      setStep("frequency");
    }
  };

  // Challenge checkbox helper
  const buildChallengeString = (challenges = selectedChallenges, other = otherChallenge) => {
    const parts: string[] = [];
    if (challenges.communication) parts.push("Communication breakdowns");
    if (challenges.emotionalDistance) parts.push("Emotional distance");
    if (challenges.trust) parts.push("Trust or betrayal");
    if (challenges.parenting) parts.push("Parenting stress");
    if (challenges.intimacy) parts.push("Intimacy issues");
    if (challenges.other && other.trim()) parts.push(other.trim());
    return parts.join(", ");
  };

  // Render goals + challenges step
  if (step === "goals") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
        <div className="w-full max-w-md mx-auto space-y-3">
          {/* Progress section */}
          <div className="space-y-1.5 px-1">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Step {globalStep} of {totalSteps}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <Card className="w-full shadow-lg border-primary/10 overflow-hidden">
            <div className={`h-1 ${config.stripe}`} />
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                  <StepIcon className="h-4 w-4" />
                  {config.title}
                </span>
              </div>
              <p className="text-lg text-foreground/80">
                Tell us about your goals and challenges
              </p>
            </CardHeader>
            <CardContent>
              <Form {...relationshipForm}>
                <form className="space-y-6">
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
                      const handleChallengeChange = (updatedChallenges = selectedChallenges, updatedOther = otherChallenge) => {
                        onChange(buildChallengeString(updatedChallenges, updatedOther));
                      };

                      const challengeItems = [
                        { key: "communication" as const, label: "Communication breakdowns" },
                        { key: "emotionalDistance" as const, label: "Emotional distance" },
                        { key: "trust" as const, label: "Trust or betrayal" },
                        { key: "parenting" as const, label: "Parenting stress" },
                        { key: "intimacy" as const, label: "Intimacy issues" },
                        { key: "other" as const, label: "Other" },
                      ];

                      return (
                        <FormItem className="space-y-3">
                          <FormLabel>What causes you and your partner to get stuck?</FormLabel>
                          <FormDescription>
                            Select all that apply to your relationship
                          </FormDescription>

                          <div className="space-y-2">
                            {challengeItems.map(({ key, label }) => {
                              const isChecked = selectedChallenges[key];
                              return (
                                <div
                                  key={key}
                                  className={`
                                    flex items-start space-x-2 p-3 border rounded-lg cursor-pointer
                                    transition-all duration-200
                                    ${isChecked
                                      ? `${config.border} ${config.bg}/60 shadow-sm`
                                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                                    }
                                  `}
                                  onClick={() => {
                                    const newChallenges = {...selectedChallenges, [key]: !isChecked};
                                    setSelectedChallenges(newChallenges);
                                    handleChallengeChange(newChallenges, otherChallenge);
                                  }}
                                >
                                  <Checkbox
                                    id={`challenge-${key}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const newChallenges = {...selectedChallenges, [key]: checked === true};
                                      setSelectedChallenges(newChallenges);
                                      handleChallengeChange(newChallenges, otherChallenge);
                                    }}
                                  />
                                  <FormLabel
                                    htmlFor={`challenge-${key}`}
                                    className={`flex-1 cursor-pointer transition-all duration-200 ${isChecked ? "font-medium" : "font-normal"}`}
                                  >
                                    {label}
                                  </FormLabel>
                                </div>
                              );
                            })}

                            {selectedChallenges.other && (
                              <div className="ml-6 mt-2">
                                <Input
                                  placeholder="Please specify..."
                                  value={otherChallenge}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setOtherChallenge(newValue);
                                    handleChallengeChange(selectedChallenges, newValue);
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
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Back
              </Button>
              <Button onClick={handleGoalsNext}>
                Next
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Render communication frequency step (step === "frequency")
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md mx-auto space-y-3">
        {/* Progress section */}
        <div className="space-y-1.5 px-1">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Step {globalStep} of {totalSteps}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Card className="w-full shadow-lg border-primary/10 overflow-hidden">
          <div className={`h-1 ${config.stripe}`} />
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                <StepIcon className="h-4 w-4" />
                {config.title}
              </span>
            </div>
            <p className="text-lg text-foreground/80">
              How often do you prefer to have meaningful conversations?
            </p>
          </CardHeader>
          <CardContent>
            <Form {...relationshipForm}>
              <form className="space-y-4">
                <FormField
                  control={relationshipForm.control}
                  name="communicationFrequency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          {communicationFrequencyOptions.map((option) => {
                            const isSelected = field.value === option;
                            return (
                              <FormItem
                                key={option}
                                className={`
                                  flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer
                                  transition-all duration-200
                                  ${isSelected
                                    ? `${config.border} ${config.bg}/60 shadow-md`
                                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                                  }
                                `}
                              >
                                <FormControl>
                                  <RadioGroupItem value={option} />
                                </FormControl>
                                <FormLabel className={`cursor-pointer w-full transition-all duration-200 ${isSelected ? "font-medium text-foreground" : "font-normal"}`}>
                                  {communicationFrequencyLabels[option]}
                                </FormLabel>
                              </FormItem>
                            );
                          })}
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
              className="bg-accent-coral hover:bg-accent-coral/90 text-white"
            >
              {saveEnhancedQuestionnaireMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
