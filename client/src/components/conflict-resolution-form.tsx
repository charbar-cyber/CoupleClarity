import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { resolveConflictSchema } from "@shared/schema";

interface ConflictResolutionFormProps {
  threadId: number;
}

export default function ConflictResolutionForm({ threadId }: ConflictResolutionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [summary, setSummary] = useState("");
  const [insights, setInsights] = useState("");
  
  const resolveConflictMutation = useMutation({
    mutationFn: async (data: { threadId: number; summary: string; insights?: string }) => {
      if (!user) throw new Error("You must be logged in to resolve a conflict");
      
      const validationSchema = resolveConflictSchema.refine(
        (data) => data.summary.trim().length > 0,
        {
          message: "Summary cannot be empty",
          path: ["summary"],
        }
      );
      
      const validatedData = validationSchema.parse(data);
      const res = await apiRequest("POST", "/api/resolve-conflict", validatedData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict Resolved",
        description: "Thank you for documenting your resolution process.",
      });
      navigate("/conflict");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to submit resolution",
        description: error.message,
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    resolveConflictMutation.mutate({
      threadId,
      summary: summary.trim(),
      insights: insights.trim() || undefined,
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-base">
              Resolution Summary
            </Label>
            <Textarea
              id="summary"
              placeholder="Describe how you and your partner resolved this conflict..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="insights" className="text-base">
              What Did You Learn? (Optional)
            </Label>
            <Textarea
              id="insights"
              placeholder="What insights did you gain from this experience? What would you do differently next time?"
              value={insights}
              onChange={(e) => setInsights(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/conflict/${threadId}`)}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={!summary.trim() || resolveConflictMutation.isPending}
          >
            {resolveConflictMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Resolution"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}