import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// Common emotion options for the form
const emotionOptions = [
  'happy', 'content', 'excited', 'grateful', 'proud',
  'anxious', 'stressed', 'sad', 'angry', 'frustrated', 
  'overwhelmed', 'lonely', 'confused', 'hurt', 'disappointed',
  'hopeful', 'peaceful', 'amused', 'loved', 'connected'
];

interface EmotionalExpression {
  id: number;
  userId: number;
  createdAt: string;
  emotion: string;
  context: string;
  intensity: number;
  tags: string[];
  relatedItemId: number | null;
  relatedItemType: string | null;
  aiProcessed: boolean;
  aiInsight: string | null;
}

export default function EmotionalExpressionsTracker() {
  const { toast } = useToast();
  const [isAddingExpression, setIsAddingExpression] = useState(false);
  const [newExpression, setNewExpression] = useState({
    emotion: '',
    customEmotion: '',
    context: '',
    intensity: 5,
    tags: ''
  });

  // Fetch emotional expressions
  const { 
    data: expressions, 
    isLoading, 
    error 
  } = useQuery<EmotionalExpression[]>({
    queryKey: ['/api/emotional-expressions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/emotional-expressions');
      return await res.json();
    }
  });

  // Create a new emotional expression
  const createExpressionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/emotional-expressions', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Emotion tracked',
        description: 'Your emotional expression has been recorded',
      });
      setIsAddingExpression(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/emotional-expressions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emotions/patterns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error tracking emotion',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete an emotional expression
  const deleteExpressionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/emotional-expressions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Emotion deleted',
        description: 'Your emotional expression has been removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emotional-expressions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emotions/patterns'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting emotion',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Reset form after submission
  const resetForm = () => {
    setNewExpression({
      emotion: '',
      customEmotion: '',
      context: '',
      intensity: 5,
      tags: ''
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const emotion = newExpression.emotion === 'custom' 
      ? newExpression.customEmotion 
      : newExpression.emotion;
    
    if (!emotion || !newExpression.context) {
      toast({
        title: 'Missing information',
        description: 'Please provide both emotion and context',
        variant: 'destructive',
      });
      return;
    }

    const tagsArray = newExpression.tags
      ? newExpression.tags.split(',').map(tag => tag.trim())
      : [];

    createExpressionMutation.mutate({
      emotion,
      context: newExpression.context,
      intensity: newExpression.intensity,
      tags: tagsArray
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Get emotion color for visual cues
  const getEmotionColor = (emotion: string, intensity: number) => {
    const positiveEmotions = ['happy', 'content', 'excited', 'grateful', 'proud', 'hopeful', 'peaceful', 'amused', 'loved', 'connected'];
    const negativeEmotions = ['anxious', 'stressed', 'sad', 'angry', 'frustrated', 'overwhelmed', 'lonely', 'confused', 'hurt', 'disappointed'];
    
    if (positiveEmotions.includes(emotion.toLowerCase())) {
      if (intensity >= 8) return 'bg-green-100 text-green-800 border-green-300';
      if (intensity >= 5) return 'bg-green-50 text-green-700 border-green-200';
      return 'bg-slate-50 text-green-600 border-green-100';
    } else if (negativeEmotions.includes(emotion.toLowerCase())) {
      if (intensity >= 8) return 'bg-red-100 text-red-800 border-red-300';
      if (intensity >= 5) return 'bg-red-50 text-red-700 border-red-200';
      return 'bg-slate-50 text-red-600 border-red-100';
    }
    
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Emotional Expressions</h2>
        <Button onClick={() => setIsAddingExpression(true)}>Track New Emotion</Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading emotional expressions</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && expressions && expressions.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't tracked any emotions yet. Start tracking to build your emotional awareness.
            </p>
            <Button onClick={() => setIsAddingExpression(true)}>Track Your First Emotion</Button>
          </CardContent>
        </Card>
      )}

      {/* Expressions list */}
      {!isLoading && expressions && expressions.length > 0 && (
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="grouped">Grouped</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {expressions.map((expression) => (
                  <Card key={expression.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge 
                            className={getEmotionColor(expression.emotion, expression.intensity)}
                          >
                            {expression.emotion} ({expression.intensity}/10)
                          </Badge>
                          <CardDescription className="mt-1">
                            {formatDate(expression.createdAt)}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteExpressionMutation.mutate(expression.id)}
                          className="h-7 w-7 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{expression.context}</p>
                      {expression.aiInsight && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-md text-xs">
                          <p className="font-semibold">AI Insight:</p>
                          <p>{expression.aiInsight}</p>
                        </div>
                      )}
                      {expression.tags && expression.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {expression.tags.map((tag, index) => (
                            <Badge variant="outline" key={index} className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="grouped">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Group by emotion */}
                  <div>
                    <h3 className="font-medium mb-2">By Emotion</h3>
                    {Object.entries(expressions.reduce((acc: Record<string, number>, expr) => {
                      acc[expr.emotion] = (acc[expr.emotion] || 0) + 1;
                      return acc;
                    }, {}))
                      .sort(([, countA], [, countB]) => countB - countA)
                      .map(([emotion, count]) => (
                        <div key={emotion} className="flex justify-between items-center mb-1">
                          <span>{emotion}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                  
                  {/* Group by intensity */}
                  <div>
                    <h3 className="font-medium mb-2">By Intensity</h3>
                    {['High (8-10)', 'Medium (5-7)', 'Low (1-4)'].map(level => {
                      const [min, max] = level.includes('High') ? [8, 10] 
                        : level.includes('Medium') ? [5, 7] 
                        : [1, 4];
                        
                      const count = expressions.filter(e => 
                        e.intensity >= min && e.intensity <= max
                      ).length;
                      
                      return (
                        <div key={level} className="flex justify-between items-center mb-1">
                          <span>{level}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add expression dialog */}
      <Dialog open={isAddingExpression} onOpenChange={setIsAddingExpression}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Track a New Emotional Expression</DialogTitle>
            <DialogDescription>
              Record how you're feeling with context to build emotional awareness
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="emotion">Emotion</Label>
                <select
                  id="emotion"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newExpression.emotion}
                  onChange={(e) => setNewExpression({...newExpression, emotion: e.target.value})}
                >
                  <option value="">Select an emotion...</option>
                  {emotionOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
              </div>

              {newExpression.emotion === 'custom' && (
                <div className="grid gap-2">
                  <Label htmlFor="customEmotion">Custom Emotion</Label>
                  <Input
                    id="customEmotion"
                    value={newExpression.customEmotion}
                    onChange={(e) => setNewExpression({...newExpression, customEmotion: e.target.value})}
                    placeholder="Enter your emotion..."
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  value={newExpression.context}
                  onChange={(e) => setNewExpression({...newExpression, context: e.target.value})}
                  placeholder="What's making you feel this way?"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="intensity">Intensity ({newExpression.intensity}/10)</Label>
                </div>
                <Slider
                  id="intensity"
                  min={1}
                  max={10}
                  step={1}
                  value={[newExpression.intensity]}
                  onValueChange={(value) => setNewExpression({...newExpression, intensity: value[0]})}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Intense</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={newExpression.tags}
                  onChange={(e) => setNewExpression({...newExpression, tags: e.target.value})}
                  placeholder="work, relationship, health..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddingExpression(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createExpressionMutation.isPending}>
                {createExpressionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}