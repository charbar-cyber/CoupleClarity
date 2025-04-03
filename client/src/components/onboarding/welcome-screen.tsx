import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Waves className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              CoupleClarity
            </span>
          </CardTitle>
          <CardDescription className="text-lg">
            Helping couples communicate with empathy, clarity, and intention.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            We'll ask just a few quick questions to personalize your experience.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button
            onClick={onStart}
            className="w-full max-w-[200px] font-medium"
            size="lg"
          >
            Start Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}