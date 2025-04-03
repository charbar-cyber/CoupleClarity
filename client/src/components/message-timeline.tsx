import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { ChevronRight, MessageCircle, CornerDownRight, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface MessageWithResponses {
  id: number;
  userId: number;
  emotion: string;
  rawMessage: string;
  transformedMessage: string;
  communicationElements: string[];
  deliveryTips: string[];
  createdAt: Date;
  isShared: boolean;
  responses: {
    id: number;
    messageId: number;
    userId: number;
    content: string;
    aiSummary: string;
    createdAt: Date;
  }[];
  user?: {
    id: number;
    displayName: string;
    firstName: string;
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getTimeAgo(date: Date | string) {
  if (typeof date === "string") {
    date = new Date(date);
  }
  
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
}

function getStatusBadge(message: MessageWithResponses) {
  if (message.responses && message.responses.length > 0) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
        <Check className="h-3 w-3" /> Responded
      </Badge>
    );
  }
  
  if (message.isShared) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" /> Awaiting Response
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <MessageCircle className="h-3 w-3" /> Draft
    </Badge>
  );
}

function truncateText(text: string, maxLength: number = 120) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

interface MessageTimelineProps {
  limit?: number;
  onViewThread?: (messageId: number) => void;
}

export default function MessageTimeline({ limit = 5, onViewThread }: MessageTimelineProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  
  const toggleExpand = (messageId: number) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };
  
  const userId = user?.id;
  const partnerId = 2; // Replace with actual partner ID when available
  
  // Fetch messages from both the user and partner
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['/api/messages/timeline'],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        // Fetch user's messages
        const userMessagesRes = await apiRequest("GET", `/api/messages`);
        const userMessages = await userMessagesRes.json();
        
        // Fetch messages shared with the user by their partner
        const sharedMessagesRes = await apiRequest("GET", `/api/partners/${userId}/shared-messages`);
        const sharedMessages = await sharedMessagesRes.json();
        
        // Combine and sort by creation date (newest first)
        const allMessages = [...userMessages, ...sharedMessages]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
          
        // For each message, fetch its responses
        const messagesWithResponses = await Promise.all(
          allMessages.map(async (message) => {
            try {
              const responsesRes = await apiRequest("GET", `/api/messages/${message.id}/responses`);
              const responses = await responsesRes.json();
              return { ...message, responses };
            } catch (e) {
              return { ...message, responses: [] };
            }
          })
        );
        
        return messagesWithResponses;
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error fetching messages",
          description: "Could not load the message timeline.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!userId,
  });

  const handleViewThread = (messageId: number) => {
    if (onViewThread) {
      onViewThread(messageId);
    } else {
      // Default action: Navigate to message detail
      window.location.href = `/messages/${messageId}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-muted-foreground">
            Error loading messages. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 text-muted-foreground">
            No messages yet. Start expressing your feelings to build your timeline.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-2">
        <CardTitle className="text-xl">Recent Conversations</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          {messages.map((message) => {
            const isCurrentUser = message.userId === userId;
            const displayName = isCurrentUser 
              ? (user?.displayName || user?.firstName || "You") 
              : "Partner";
            const isExpanded = expandedMessage === message.id;
            
            return (
              <div key={message.id} className="relative pl-6 border-l-2 border-primary/20 pb-6 last:pb-0">
                <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1"></div>
                
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={isCurrentUser ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{displayName}</span>
                      <span className="text-xs text-muted-foreground">{getTimeAgo(message.createdAt)}</span>
                    </div>
                    <div>{getStatusBadge(message)}</div>
                  </div>
                </div>
                
                <div className="pl-10 space-y-2">
                  <p className="text-sm">
                    {isExpanded ? message.transformedMessage : truncateText(message.transformedMessage)}
                  </p>
                  
                  {!isExpanded && message.transformedMessage.length > 120 && (
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => toggleExpand(message.id)}>
                      Read more
                    </Button>
                  )}
                  
                  {isExpanded && (
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => toggleExpand(message.id)}>
                      Show less
                    </Button>
                  )}
                  
                  {isExpanded && message.responses && message.responses.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.responses.map((response: any) => (
                        <div key={response.id} className="bg-muted/50 p-3 rounded-md ml-4 relative">
                          <CornerDownRight className="h-4 w-4 text-muted-foreground absolute -left-5 top-3" />
                          <p className="text-sm">{truncateText(response.content, 150)}</p>
                          {response.aiSummary && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <strong>AI Summary:</strong> {response.aiSummary}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1 text-xs"
                      onClick={() => handleViewThread(message.id)}
                    >
                      View Full Thread
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {messages.indexOf(message) < messages.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}