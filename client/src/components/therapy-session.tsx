import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, BookOpen, List, MessageSquare, BookMarked } from 'lucide-react';
import { TherapySession as TherapySessionType } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function TherapySession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  
  // Fetch existing therapy sessions
  const { 
    data: therapySessions = [],
    isLoading: isLoadingSessions,
  } = useQuery<TherapySessionType[]>({
    queryKey: ['/api/therapy-sessions'],
    enabled: !!user,
  });
  
  // Generate new therapy session
  const createTherapySessionMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      const response = await apiRequest('POST', '/api/therapy-sessions');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapy-sessions'] });
      toast({
        title: 'Therapy session generated',
        description: 'Your AI therapy session has been generated successfully.',
        variant: 'default',
      });
      setLoading(false);
      setActiveTab('view');
    },
    onError: (error) => {
      console.error('Error generating therapy session:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate therapy session. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    },
  });
  
  // Add notes to a therapy session
  const addNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await apiRequest('PUT', `/api/therapy-sessions/${id}`, { userNotes: notes });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapy-sessions'] });
      toast({
        title: 'Notes added',
        description: 'Your notes have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Error adding notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Mark session as reviewed
  const markAsReviewedMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('PUT', `/api/therapy-sessions/${id}`, { 
        isReviewed: true,
        reviewedAt: new Date()
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapy-sessions'] });
      toast({
        title: 'Session reviewed',
        description: 'You have marked this session as reviewed.',
      });
    },
    onError: (error) => {
      console.error('Error marking session as reviewed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark session as reviewed. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Function to generate a new therapy session
  const handleGenerateSession = () => {
    createTherapySessionMutation.mutate();
  };
  
  // Function to format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Render therapy session card
  const renderSessionCard = (session: TherapySessionType) => {
    const [notes, setNotes] = useState(session.userNotes || '');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    
    const handleSaveNotes = () => {
      if (session.id !== undefined) {
        addNotesMutation.mutate({ id: session.id, notes });
        setIsEditingNotes(false);
      }
    };
    
    const handleMarkAsReviewed = () => {
      if (session.id !== undefined) {
        markAsReviewedMutation.mutate(session.id);
      }
    };
    
    return (
      <Card key={session.id} className="mb-6 overflow-hidden">
        <CardHeader className="bg-primary/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Therapy Session - {formatDate(session.createdAt)}
            </CardTitle>
            {session.isReviewed ? (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Reviewed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                New
              </Badge>
            )}
          </div>
          <CardDescription>
            AI-generated therapy session based on your communication data
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid grid-cols-3 mx-4 mt-2">
              <TabsTrigger value="transcript">
                <BookOpen className="w-4 h-4 mr-2" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Sparkles className="w-4 h-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="w-4 h-4 mr-2" />
                Your Notes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transcript" className="m-0">
              <ScrollArea className="h-[400px] p-4 text-sm">
                <div className="whitespace-pre-wrap font-serif">
                  {session.transcript}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="insights" className="m-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Emotional Patterns</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {session.emotionalPatterns.map((pattern, index) => (
                        <li key={index}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Core Issues</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {session.coreIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-primary">Recommendations</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {session.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="notes" className="m-0">
              <div className="p-4">
                {isEditingNotes ? (
                  <>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-[350px] p-3 border rounded-md"
                      placeholder="Add your personal notes, reflections, or thoughts about this therapy session..."
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setNotes(session.userNotes || '');
                          setIsEditingNotes(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveNotes}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <ScrollArea className="h-[350px]">
                      <div className="whitespace-pre-wrap text-sm">
                        {session.userNotes ? (
                          session.userNotes
                        ) : (
                          <div className="text-muted-foreground italic">
                            No notes yet. Click 'Add Notes' to reflect on this therapy session.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        {session.userNotes ? 'Edit Notes' : 'Add Notes'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between bg-muted/20 py-3">
          <div>
            {!session.isReviewed && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAsReviewed}
              >
                Mark as Reviewed
              </Button>
            )}
          </div>
          {session.audioUrl && (
            <Button variant="ghost" size="sm">
              <BookMarked className="w-4 h-4 mr-2" />
              Listen to Audio
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">AI Therapy Sessions</h2>
          <p className="text-muted-foreground mt-1">
            Generate private AI therapy sessions based on your communication data
          </p>
        </div>
        
        {activeTab === 'view' && (
          <Button
            onClick={handleGenerateSession}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate New Session
              </>
            )}
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="view">
            <List className="w-4 h-4 mr-2" />
            View Sessions
          </TabsTrigger>
          <TabsTrigger value="about">
            <BookMarked className="w-4 h-4 mr-2" />
            About This Feature
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="view" className="mt-0">
          {isLoadingSessions ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : therapySessions && therapySessions.length > 0 ? (
            <div>
              {therapySessions.map((session: TherapySessionType) => renderSessionCard(session))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No therapy sessions yet</CardTitle>
                <CardDescription>
                  Create your first AI-generated therapy session to gain insights into your relationship dynamics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Therapy sessions are created using your journal entries, conflict threads, and partner interactions to generate helpful insights about your relationship patterns.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleGenerateSession}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Your First Session
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="about" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>About AI Therapy Sessions</CardTitle>
              <CardDescription>
                How this feature works and how to get the most out of it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">What are AI Therapy Sessions?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  AI Therapy Sessions are computer-generated conversations that simulate what a therapy session with a couples therapist might be like. They're created by analyzing your relationship data and communication patterns.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">How are they created?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI analyzes your journal entries, conflict threads, and communication patterns to identify recurring themes, emotional patterns, and core issues in your relationship. It then creates a simulated therapy dialogue that addresses these specific areas.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Privacy & Security</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your therapy sessions are completely private and are only visible to you. The content is generated using your existing data in the app and is not shared with any third parties.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Limitations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  While AI Therapy Sessions can provide valuable insights, they are not a substitute for professional therapy. The advice and perspectives are generated by AI and should be treated as suggestions rather than professional guidance.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setActiveTab('view')}>
                Back to Sessions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}