import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { OnboardingQuestionnaire } from "@/components/onboarding/questionnaire"; 
import { EnhancedOnboardingQuestionnaire } from "@/components/onboarding/enhanced-questionnaire";
import { useAuth } from "@/hooks/use-auth";
import { type OnboardingQuestionnaire as QuestionnaireType } from "@shared/schema";

export default function OnboardingPage() {
  const [step, setStep] = useState<"welcome" | "preferences" | "enhanced" | "complete">("welcome");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [preferencesData, setPreferencesData] = useState<Partial<QuestionnaireType>>({});

  // If the user is not logged in, redirect to auth page
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Check if the user already completed onboarding
  useEffect(() => {
    if (user.onboardingCompleted) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleStart = () => {
    // Move to the preferences step
    setStep("preferences");
  };
  
  const handlePreferencesComplete = (data: Partial<QuestionnaireType>) => {
    // Save the preferences data and move to the enhanced questionnaire
    setPreferencesData(data);
    setStep("enhanced");
  };
  
  const handleEnhancedComplete = () => {
    // Redirect to home after completing the entire questionnaire
    setLocation("/");
  };

  // Handle going back from the enhanced questionnaire to the preferences
  const handleEnhancedBack = () => {
    setStep("preferences");
  };

  return (
    <div>
      {step === "welcome" && <WelcomeScreen onStart={handleStart} />}
      {step === "preferences" && (
        <OnboardingQuestionnaire 
          onComplete={handlePreferencesComplete}
          onBack={handleStart}
          isEnhancedFlow={true}
        />
      )}
      {step === "enhanced" && (
        <EnhancedOnboardingQuestionnaire 
          onComplete={handleEnhancedComplete}
          onBack={handleEnhancedBack}
          initialPreferences={preferencesData}
        />
      )}
    </div>
  );
}