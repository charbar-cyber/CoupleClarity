import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/logo-icon.png"
              alt="CoupleClarity Logo"
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            <img
              src="/assets/logo-text.png"
              alt="CoupleClarity"
              className="h-10 w-auto mx-auto"
            />
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