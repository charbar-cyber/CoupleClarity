import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { useAuth } from "@/hooks/use-auth";

export default function OnboardingPage() {
  const [step, setStep] = useState<"welcome" | "complete">("welcome");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // If the user is not logged in, redirect to auth page
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Check if the user has a registration date older than 5 minutes
  // This is a simple check to determine if this is not a new registration
  // We'll just redirect them to the home page
  useEffect(() => {
    // If we had a real user.registeredAt field, we'd use it here
    // For now, we'll assume all users coming to this page are new users
    
    // Add any logic here to detect returning users if needed
    // and redirect them to home if they shouldn't see the onboarding
  }, [setLocation]);

  const handleStart = () => {
    // For now, we'll just redirect to home after clicking start
    // In the future, we could add additional onboarding steps here
    setLocation("/");
  };

  return (
    <div>
      {step === "welcome" && <WelcomeScreen onStart={handleStart} />}
      {/* Add more steps here in the future */}
    </div>
  );
}