import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ConflictThread, 
  ConflictMessage,
  insertConflictMessageSchema
} from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Check, ArrowLeft, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { z } from "zod";

interface ConflictThreadDetailProps {
  threadId: number;
}

export default function ConflictThreadDetail({ threadId }: ConflictThreadDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: thread, isLoading: threadLoading } = useQuery<ConflictThread>({
    queryKey: ['/api/conflict-threads', threadId],
    retry: false,
  });
  
  const { data: messages, isLoading: messagesLoading } = useQuery<ConflictMessage[]>({
    queryKey: ['/api/conflict-messages', threadId],
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("You must be logged in to send messages");
      const validationSchema = insertConflictMessageSchema.extend({
        content: z.string().min(1, "Message cannot be empty"),
      });
      
      const messageData = validationSchema.parse({
        threadId,
        userId: user.id,
        content: text,
      });
      
      const res = await apiRequest("POST", "/api/conflict-messages", messageData);
      return await res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({
        queryKey: ['/api/conflict-messages', threadId],
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message,
      });
    },
  });
  
  const resolveThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/conflict-threads/${threadId}/status`, {
        status: "resolved",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict marked as resolved",
        description: "You can now document what you've learned from this conflict.",
      });
      navigate(`/conflict/${threadId}/resolve`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to resolve conflict",
        description: error.message,
      });
    },
  });
  
  const abandonThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/conflict-threads/${threadId}/status`, {
        status: "abandoned",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict marked as abandoned",
        description: "You can start a new conflict thread if needed.",
      });
      navigate('/conflict');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to abandon conflict",
        description: error.message,
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };
  
  const handleResolveConflict = () => {
    if (window.confirm("Are you sure you want to mark this conflict as resolved?")) {
      resolveThreadMutation.mutate();
    }
  };
  
  const handleAbandonConflict = () => {
    if (window.confirm("Are you sure you want to abandon this conflict thread?")) {
      abandonThreadMutation.mutate();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (threadLoading || messagesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!thread) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Conflict Thread Not Found</h2>
        <p className="text-muted-foreground mb-6">This conflict thread may no longer exist or you may not have permission to view it.</p>
        <Button asChild>
          <Link to="/conflict">Go Back to Conflict Threads</Link>
        </Button>
      </div>
    );
  }
  
  const isResolved = thread.status === 'resolved';
  const isAbandoned = thread.status === 'abandoned';
  const isActive = !isResolved && !isAbandoned;
  
  // Get user and partner info
  const isUserInitiator = user?.id === thread.userId;
  const partnerId = thread.partnerId;
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/conflict">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{thread.topic}</h1>
        <div className="ml-auto flex items-center gap-2">
          {isActive ? (
            <>
              <Badge variant="outline">{thread.status}</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResolveConflict}
                disabled={resolveThreadMutation.isPending}
              >
                {resolveThreadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Mark as Resolved
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAbandonConflict}
                disabled={abandonThreadMutation.isPending}
              >
                {abandonThreadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Abandon
              </Button>
            </>
          ) : (
            <Badge variant="secondary">
              {isResolved ? "Resolved" : "Abandoned"}
            </Badge>
          )}
        </div>
      </div>
      
      <Card className="mb-4">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Started: {formatDate(new Date(thread.createdAt))}</span>
            {isResolved && thread.resolvedAt && (
              <span className="text-muted-foreground text-sm">Resolved: {formatDate(new Date(thread.resolvedAt))}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <p className="mb-2">{thread.topic}</p>
        </CardContent>
      </Card>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((message: ConflictMessage) => (
            <div 
              key={message.id} 
              className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.userId === user?.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm mb-1">
                  {user && message.userId === user.id ? 'You' : 'Partner'}
                  <span className="text-xs opacity-70 ml-2">
                    {formatDate(new Date(message.createdAt))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground italic">
            No messages yet. Start the conversation...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {isActive && (
        <Card className="mt-auto">
          <CardFooter className="p-4">
            <div className="flex w-full items-center gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 resize-none"
                rows={3}
                disabled={sendMessageMutation.isPending}
              />
              <Button 
                className="self-end" 
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
      
      {isResolved && thread.resolutionInsights && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
              <h3 className="font-medium">Resolution Insights</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{thread.resolutionInsights}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}