import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2 } from "lucide-react";
import ConversationTypeSelector from "@/components/conversation-type-selector";
import { Link } from "wouter";

export default function NewGuidedConversationPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/guided-conversations", {
        conversationType: selectedType,
        topic: topic.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guided-conversations"] });
      toast({ title: "Conversation started!" });
      navigate(`/conversations/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start conversation", description: error.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Link href="/conversations">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Start a Guided Conversation</CardTitle>
          <CardDescription>
            Choose a conversation type. The AI will adapt every prompt and coaching response to both your and your partner's communication preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Choose a conversation type</Label>
            <ConversationTypeSelector selected={selectedType} onSelect={setSelectedType} />
          </div>

          <div>
            <Label htmlFor="topic" className="text-sm font-medium">
              Topic (optional)
            </Label>
            <Input
              id="topic"
              placeholder="e.g., How we split household responsibilities"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adding a topic helps the AI generate more relevant prompts
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedType || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Conversation"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
