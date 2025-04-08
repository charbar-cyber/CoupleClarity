import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoveLanguageAnalysis } from "@/hooks/use-love-language-analysis";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, RefreshCw, Heart, Lightbulb, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState } from "react";

type UserPreferences = {
  loveLanguage?: string;
  conflictStyle?: string;
  communicationStyle?: string;
  repairStyle?: string;
};

export default function LoveLanguageAnalysis() {
  const { user } = useAuth();
  const { analysis, isLoading, isPolling, startAnalysis } = useLoveLanguageAnalysis();
  const [activeTab, setActiveTab] = useState("analysis");
  
  // Get user preferences to display love language type
  const { data: preferences = {} } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    queryFn: getQueryFn<UserPreferences>(),
    enabled: !!user,
  });

  const loveLanguage = preferences?.loveLanguage || "Unknown";
  
  if (isPolling) {
    return (
      <Card className="w-full bg-gradient-to-br from-card to-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="text-rose-500" size={20} />
            Love Language Analysis
          </CardTitle>
          <CardDescription>
            Analyzing your love language: {loveLanguage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">
            Our AI is analyzing your love language and creating personalized insights...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="w-full bg-gradient-to-br from-card to-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="text-rose-500" size={20} />
            Love Language Analysis
          </CardTitle>
          <CardDescription>
            Discover personalized insights based on your love language: {loveLanguage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-center text-muted-foreground mb-6">
            Get personalized tips and app recommendations based on your love language preferences
          </p>
          <Button 
            onClick={startAnalysis} 
            disabled={isLoading || !preferences?.loveLanguage}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-card to-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="text-rose-500" size={20} />
          Love Language Insights
        </CardTitle>
        <CardDescription>
          Your Love Language: {loveLanguage}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="tips">Personal Tips</TabsTrigger>
            <TabsTrigger value="suggestions">App Suggestions</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="mt-4">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <p>{analysis.analysisText}</p>
            </div>
          </TabsContent>
          <TabsContent value="tips" className="mt-4">
            <ul className="space-y-3">
              {analysis.personalizedTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="suggestions" className="mt-4">
            <ul className="space-y-3">
              {analysis.appUsageSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Analysis powered by AI
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={startAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}