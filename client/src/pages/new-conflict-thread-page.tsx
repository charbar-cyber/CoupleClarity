import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect, useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Partnership, insertConflictThreadSchema } from "@shared/schema";

export default function NewConflictThreadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  
  const { data: partnerships, isLoading: partnershipsLoading } = useQuery<Partnership[]>({
    queryKey: ['/api/partnerships'],
    enabled: !!user,
  });
  
  const createThreadMutation = useMutation({
    mutationFn: async (data: { 
      partnerId: number;
      topic: string;
      description?: string;
      desiredOutcome?: string;
    }) => {
      if (!user) throw new Error("You must be logged in to create a conflict thread");
      
      const validationSchema = insertConflictThreadSchema.extend({
        topic: z.string().min(1, "Topic is required"),
        description: z.string().optional(),
        desiredOutcome: z.string().optional(),
      });
      
      const threadData = validationSchema.parse({
        userId: user.id,
        partnerId: data.partnerId,
        topic: data.topic,
      });
      
      const res = await apiRequest("POST", "/api/conflict-threads", threadData);
      return await res.json();
    },
    onSuccess: (thread) => {
      toast({
        title: "Conflict thread created",
        description: "You can now start discussing this conflict with your partner.",
      });
      navigate(`/conflict/${thread.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create conflict thread",
        description: error.message,
      });
    },
  });
  
  // If there's only one partnership, pre-select it
  useEffect(() => {
    if (partnerships && partnerships.length === 1) {
      // Logic would go here if we needed to do anything with a single partnership
    }
  }, [partnerships]);
  
  if (authLoading || partnershipsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (!partnerships || partnerships.length === 0) {
    return (
      <div className="container py-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">No Partnerships Found</h1>
        <p className="text-muted-foreground mb-6">
          You need to have an active partnership with someone to start a conflict thread.
        </p>
        <Button asChild>
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    );
  }
  
  // In our simplified version, we're assuming the user has only one partner
  const partnership = partnerships[0];
  const partnerId = user.id === partnership.user1Id ? partnership.user2Id : partnership.user1Id;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      toast({
        variant: "destructive",
        title: "Topic is required",
        description: "Please provide a topic for this conflict thread.",
      });
      return;
    }
    
    createThreadMutation.mutate({
      partnerId,
      topic: topic.trim(),
      description: description.trim() || undefined,
      desiredOutcome: desiredOutcome.trim() || undefined,
    });
  };
  
  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/conflict">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Start a Conflict Thread</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">What's the conflict about?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="E.g., Household chores, Communication issues, etc."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide more details about this conflict..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desiredOutcome">Desired Outcome (Optional)</Label>
              <Textarea
                id="desiredOutcome"
                placeholder="What would you like to achieve from resolving this conflict?"
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/conflict')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!topic.trim() || createThreadMutation.isPending}
            >
              {createThreadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Thread"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}