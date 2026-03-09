import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  ArrowLeft, Loader2, Send, Check, X, Edit3,
  MessageSquare, Bot, Eye, Pause, Play, SkipForward
} from "lucide-react";
import { CONVERSATION_TYPES } from "@/components/conversation-type-selector";

interface Turn {
  id: number;
  conversationId: number;
  turnNumber: number;
  userId: number | null;
  turnType: string;
  content: string;
  visibleTo: string;
  metadata: string | null;
  createdAt: string;
}

interface Conversation {
  id: number;
  partnershipId: number;
  initiatorId: number;
  partnerId: number;
  conversationType: string;
  topic: string | null;
  status: string;
  currentTurnUserId: number | null;
  currentTurnNumber: number;
  totalTurns: number;
  openingPrompt: string | null;
  summary: string | null;
  insightsJson: string | null;
  createdAt: string;
  lastActivityAt: string;
  completedAt: string | null;
}

interface CoachingResponse {
  rawResponse: string;
  coaching: string;
  coachedMessage: string;
  emotionalTone: string;
  coachedTurnId: number;
}

export default function GuidedConversationDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const conversationId = parseInt(params.id || "0");
  const { toast } = useToast();
  const { messages: wsMessages } = useWebSocket();
  const [response, setResponse] = useState("");
  const [pendingCoaching, setPendingCoaching] = useState<CoachingResponse | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: convLoading } = useQuery<Conversation>({
    queryKey: [`/api/guided-conversations/${conversationId}`],
    enabled: !!user && conversationId > 0,
    refetchInterval: 10000,
  });

  const { data: turns = [], refetch: refetchTurns } = useQuery<Turn[]>({
    queryKey: [`/api/guided-conversations/${conversationId}/turns`],
    enabled: !!user && conversationId > 0,
    refetchInterval: 10000,
  });

  // Listen for WebSocket updates
  useEffect(() => {
    const relevant = wsMessages.filter(
      m => (m.type === "guided_conversation_your_turn" || m.type === "guided_conversation_update" || m.type === "guided_conversation_completed")
        && (m as any).conversationId === conversationId
    );
    if (relevant.length > 0) {
      queryClient.invalidateQueries({ queryKey: [`/api/guided-conversations/${conversationId}`] });
      refetchTurns();
    }
  }, [wsMessages, conversationId, refetchTurns]);

  // Auto-scroll when new turns arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pendingCoaching]);

  const respondMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/guided-conversations/${conversationId}/respond`, { content });
      return res.json() as Promise<CoachingResponse>;
    },
    onSuccess: (data) => {
      setPendingCoaching(data);
      setResponse("");
      refetchTurns();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit response", description: error.message, variant: "destructive" });
    },
  });

  const acceptCoachingMutation = useMutation({
    mutationFn: async ({ accept, editedContent }: { accept: boolean; editedContent?: string }) => {
      const res = await apiRequest("POST", `/api/guided-conversations/${conversationId}/accept-coaching`, {
        accept,
        editedContent,
      });
      return res.json();
    },
    onSuccess: () => {
      setPendingCoaching(null);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/guided-conversations/${conversationId}`] });
      refetchTurns();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to process", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/guided-conversations/${conversationId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/guided-conversations/${conversationId}`] });
    },
  });

  if (!user) return null;
  if (convLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!conversation) {
    return (
      <div className="container py-8 max-w-3xl mx-auto text-center">
        <p className="text-muted-foreground">Conversation not found.</p>
        <Link href="/conversations"><Button variant="link">Back to conversations</Button></Link>
      </div>
    );
  }

  const typeInfo = CONVERSATION_TYPES.find(t => t.id === conversation.conversationType);
  const isMyTurn = conversation.currentTurnUserId === user.id && conversation.status === "active";
  const isCompleted = conversation.status === "completed";
  const isPaused = conversation.status === "paused";

  let insights: Array<{ type: string; text: string }> = [];
  if (conversation.insightsJson) {
    try { insights = JSON.parse(conversation.insightsJson); } catch {}
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Link href="/conversations">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {typeInfo && (
            <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
              <typeInfo.icon className={`h-5 w-5 ${typeInfo.color}`} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{typeInfo?.title || conversation.conversationType}</h1>
            {conversation.topic && <p className="text-sm text-muted-foreground">{conversation.topic}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isCompleted ? "secondary" : "default"}>
            Turn {conversation.currentTurnNumber}/{conversation.totalTurns}
          </Badge>
          {conversation.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate("paused")}>
              <Pause className="h-3 w-3 mr-1" /> Pause
            </Button>
          )}
          {isPaused && (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate("active")}>
              <Play className="h-3 w-3 mr-1" /> Resume
            </Button>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="space-y-4 mb-6">
        {turns.map((turn) => (
          <TurnCard key={turn.id} turn={turn} currentUserId={user.id} />
        ))}

        {/* Coaching review panel */}
        {pendingCoaching && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Eye className="h-4 w-4" />
                Review Before Sending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingCoaching.coaching && (
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Private coaching (only you see this):</p>
                  <p className="text-muted-foreground">{pendingCoaching.coaching}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-sm">
                  <p className="font-medium mb-1">Your original:</p>
                  <p className="text-muted-foreground bg-background p-3 rounded-lg">{pendingCoaching.rawResponse}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Suggested version:</p>
                  {isEditing ? (
                    <Textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-muted-foreground bg-background p-3 rounded-lg">{pendingCoaching.coachedMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedMessage(pendingCoaching.coachedMessage);
                      setIsEditing(true);
                    }}
                  >
                    <Edit3 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acceptCoachingMutation.mutate({
                    accept: false,
                    editedContent: pendingCoaching.rawResponse,
                  })}
                  disabled={acceptCoachingMutation.isPending}
                >
                  <X className="h-3 w-3 mr-1" /> Send Original
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptCoachingMutation.mutate({
                    accept: !isEditing,
                    editedContent: isEditing ? editedMessage : undefined,
                  })}
                  disabled={acceptCoachingMutation.isPending}
                >
                  {acceptCoachingMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {isEditing ? "Send Edited" : "Send Coached"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Completed summary */}
      {isCompleted && conversation.summary && (
        <Card className="mb-6 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{conversation.summary}</p>
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant={
                      insight.type === "strength" ? "default" :
                      insight.type === "growth_area" ? "secondary" : "outline"
                    } className="text-xs mt-0.5 shrink-0">
                      {insight.type === "strength" ? "Strength" :
                       insight.type === "growth_area" ? "Growth" : "Tip"}
                    </Badge>
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input area */}
      {isMyTurn && !pendingCoaching && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Textarea
                placeholder="Share your thoughts..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={2000}
              />
              <Button
                className="self-end"
                disabled={!response.trim() || respondMutation.isPending}
                onClick={() => respondMutation.mutate(response.trim())}
              >
                {respondMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting state */}
      {conversation.status === "active" && !isMyTurn && !pendingCoaching && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Waiting for your partner to respond...
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TurnCard({ turn, currentUserId }: { turn: Turn; currentUserId: number }) {
  const isAI = turn.turnType === "ai_prompt" || turn.turnType === "ai_reflection";
  const isCoaching = turn.turnType === "ai_coaching";
  const isMine = turn.userId === currentUserId;
  const isCoached = turn.turnType === "coached_message";

  if (isCoaching) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10 ml-8">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Private Coaching</span>
          </div>
          <p className="text-sm text-muted-foreground">{turn.content}</p>
        </CardContent>
      </Card>
    );
  }

  if (isAI) {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Coach</span>
          </div>
          <p className="text-sm">{turn.content}</p>
        </CardContent>
      </Card>
    );
  }

  if (isCoached) {
    return (
      <Card className={`${isMine ? "border-primary/30 ml-8" : "border-muted mr-8"}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className={`h-3.5 w-3.5 ${isMine ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium text-muted-foreground">
              {isMine ? "You" : "Partner"}
            </span>
          </div>
          <p className="text-sm">{turn.content}</p>
        </CardContent>
      </Card>
    );
  }

  // user_response (visible to self only — raw message)
  return (
    <Card className="border-muted/50 ml-8 opacity-60">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Your original (private)</span>
        </div>
        <p className="text-sm text-muted-foreground">{turn.content}</p>
      </CardContent>
    </Card>
  );
}
