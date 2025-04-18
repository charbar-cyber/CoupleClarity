import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowUpCircle, ArrowDownCircle, Lightbulb, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface EmotionPatternAnalysisResponse {
  dominantEmotions: Array<{
    emotion: string;
    frequency: number;
    intensity: number;
    description: string;
  }>;
  emotionTrends: {
    overall: 'improving' | 'declining' | 'fluctuating' | 'stable';
    description: string;
    recentShift: string | null;
  };
  patterns: Array<{
    name: string;
    description: string;
    emotions: string[];
    triggers: string[];
    suggestedStrategies: string[];
  }>;
  relationshipInsights: {
    communicationStyle: string;
    emotionalDynamics: string;
    growthAreas: string[];
    strengths: string[];
  };
  personalizedRecommendations: string[];
}

export default function EmotionalPatternsInsights() {
  const { data, isLoading, error } = useQuery<EmotionalPatternAnalysisResponse>({
    queryKey: ['/api/emotions/patterns'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/emotions/patterns');
      return await res.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Helper function to determine the trend icon and style
  const getTrendDetails = (trend: string) => {
    switch (trend) {
      case 'improving':
        return {
          icon: <ArrowUpCircle className="h-5 w-5 text-green-500" />,
          badge: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'declining':
        return {
          icon: <ArrowDownCircle className="h-5 w-5 text-red-500" />,
          badge: 'bg-red-100 text-red-800 border-red-300'
        };
      default:
        return {
          icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-300'
        };
    }
  };

  // Get color for emotions
  const getEmotionColor = (emotion: string) => {
    const positiveEmotions = ['happy', 'content', 'excited', 'grateful', 'proud', 'hopeful', 'peaceful', 'amused', 'loved', 'connected'];
    const negativeEmotions = ['anxious', 'stressed', 'sad', 'angry', 'frustrated', 'overwhelmed', 'lonely', 'confused', 'hurt', 'disappointed'];
    
    if (positiveEmotions.includes(emotion.toLowerCase())) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (negativeEmotions.includes(emotion.toLowerCase())) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading emotion patterns analysis</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No emotion data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Emotional Patterns & Insights</h2>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="relationship">Relationship</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trend Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getTrendDetails(data.emotionTrends.overall).icon}
                  Emotional Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getTrendDetails(data.emotionTrends.overall).badge}>
                  {data.emotionTrends.overall.charAt(0).toUpperCase() + data.emotionTrends.overall.slice(1)}
                </Badge>
                <p className="mt-2 text-sm">{data.emotionTrends.description}</p>
                {data.emotionTrends.recentShift && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Recent shift: {data.emotionTrends.recentShift}
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Top Emotions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dominant Emotions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.dominantEmotions.slice(0, 3).map((emotion, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <Badge className={getEmotionColor(emotion.emotion)}>
                          {emotion.emotion}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Intensity: {emotion.intensity}/10
                        </span>
                      </div>
                      <Progress value={emotion.frequency * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Recommendations */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Personalized Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.personalizedRecommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Emotions Tab */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle>Emotional Profile</CardTitle>
              <CardDescription>
                Detailed breakdown of your emotional expressions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.dominantEmotions.map((emotion, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getEmotionColor(emotion.emotion)}>
                          {emotion.emotion}
                        </Badge>
                        <span className="text-sm">
                          Frequency: {emotion.frequency * 10}%
                        </span>
                      </div>
                      <span className="text-xs">
                        Avg. Intensity: {emotion.intensity}/10
                      </span>
                    </div>
                    <Progress value={emotion.frequency * 10} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{emotion.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Patterns Tab */}
        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Identified Patterns</CardTitle>
              <CardDescription>
                Recurring emotional patterns and triggers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.patterns.length === 0 ? (
                <p className="text-muted-foreground">
                  Not enough data yet to identify specific patterns. Continue tracking your emotions regularly.
                </p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {data.patterns.map((pattern, index) => (
                      <AccordionItem key={index} value={`pattern-${index}`}>
                        <AccordionTrigger>{pattern.name}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            <p className="text-sm">{pattern.description}</p>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Associated Emotions:</h4>
                              <div className="flex flex-wrap gap-1">
                                {pattern.emotions.map((emotion, idx) => (
                                  <Badge key={idx} className={getEmotionColor(emotion)}>
                                    {emotion}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Common Triggers:</h4>
                              <ul className="list-disc list-inside text-sm">
                                {pattern.triggers.map((trigger, idx) => (
                                  <li key={idx}>{trigger}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Strategies:</h4>
                              <ul className="list-disc list-inside text-sm">
                                {pattern.suggestedStrategies.map((strategy, idx) => (
                                  <li key={idx}>{strategy}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Relationship Tab */}
        <TabsContent value="relationship">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Insights</CardTitle>
              <CardDescription>
                How your emotional patterns affect your relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Communication Style</h3>
                  <p className="text-sm">{data.relationshipInsights.communicationStyle}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Emotional Dynamics</h3>
                  <p className="text-sm">{data.relationshipInsights.emotionalDynamics}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <h3 className="font-medium mb-1">Strengths</h3>
                    <ul className="list-disc list-inside text-sm">
                      {data.relationshipInsights.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1">Growth Areas</h3>
                    <ul className="list-disc list-inside text-sm">
                      {data.relationshipInsights.growthAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}