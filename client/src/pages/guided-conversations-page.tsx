import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, MessageSquare } from "lucide-react";
import GuidedConversationCard from "@/components/guided-conversation-card";

export default function GuidedConversationsPage() {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/guided-conversations"],
    enabled: !!user,
  });

  if (!user) return null;

  const active = conversations.filter(c => ["active", "awaiting_partner", "paused"].includes(c.status));
  const completed = conversations.filter(c => c.status === "completed");

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Guided Conversations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-mediated conversations that adapt to both partners' communication styles
          </p>
        </div>
        <Link href="/conversations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Start New
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Start a guided conversation with your partner. The AI adapts every prompt to your unique communication styles.
            </p>
            <Link href="/conversations/new">
              <Button>Start Your First Conversation</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {active.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active conversations. Start one!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {active.map(c => (
                  <GuidedConversationCard key={c.id} conversation={c} currentUserId={user.id} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="completed">
            {completed.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No completed conversations yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {completed.map(c => (
                  <GuidedConversationCard key={c.id} conversation={c} currentUserId={user.id} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
