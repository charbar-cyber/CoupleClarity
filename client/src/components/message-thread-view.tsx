import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiUrl } from "@/lib/config";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

interface MessageThreadViewProps {
  messageId: number;
  onBack?: () => void;
}

export default function MessageThreadView({ messageId, onBack }: MessageThreadViewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [response, setResponse] = useState("");
  
  // Fetch the message and its responses
  const { data: messageData, isLoading: isMessageLoading, error: messageError } = useQuery({
    queryKey: ['/api/messages', messageId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/messages/${messageId}`));
      if (!res.ok) throw new Error('Failed to fetch message');
      return res.json();
    },
  });
  
  const responseMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest('POST', `/api/messages/${messageId}/responses`, data);
      return res.json();
    },
    onSuccess: () => {
      setResponse("");
      toast({
        title: "Response sent",
        description: "Your response has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages', messageId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send response",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmitResponse = () => {
    if (!response.trim()) return;
    responseMutation.mutate({ content: response });
  };
  
  if (isMessageLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="animate-pulse h-10 bg-muted rounded w-1/3"></div>
        <div className="animate-pulse h-32 bg-muted rounded"></div>
        <div className="animate-pulse h-20 bg-muted rounded"></div>
      </div>
    );
  }
  
  if (messageError || !messageData) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>
            Failed to load message data. Please try again.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onBack}>Go Back</Button>
        </CardFooter>
      </Card>
    );
  }
  
  function getTimeAgo(date: Date | string) {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return format(messageDate, 'MMM d, yyyy');
  }
  
  function getInitials(name: string) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }
  
  function getMessageStatus(message: any, hasResponses: boolean) {
    if (hasResponses) {
      return { label: "Responded", variant: "outline" as const };
    }
    if (message.isShared) {
      return { label: "Shared", variant: "secondary" as const };
    }
    return { label: "Private", variant: "outline" as const };
  }
  
  const message = messageData;
  const responses = message.responses || [];
  const status = getMessageStatus(message, responses.length > 0);
  const senderName = message.user?.displayName || message.user?.firstName || "You";
  const isCurrentUser = user?.id === message.userId;
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-2xl font-bold flex-grow">Message Thread</h2>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      
      {/* Original message */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{senderName}</CardTitle>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeAgo(message.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Original Expression:</h3>
            <p className="text-sm italic text-muted-foreground bg-muted p-3 rounded-md">
              {message.rawMessage}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-1">Transformed Message:</h3>
            <p className="text-sm">{message.transformedMessage}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-1 text-sm">Communication Elements:</h3>
              <ul className="text-xs list-disc pl-5">
                {message.communicationElements?.map((element: string, i: number) => (
                  <li key={i} className="mt-1">{element}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-sm">Delivery Tips:</h3>
              <ul className="text-xs list-disc pl-5">
                {message.deliveryTips?.map((tip: string, i: number) => (
                  <li key={i} className="mt-1">{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Responses section */}
      <div className="mt-6">
        <h3 className="font-medium text-lg mb-4">Responses</h3>
        
        {responses.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No responses yet.</p>
        ) : (
          <div className="space-y-4">
            {responses.map((resp: any) => (
              <Card key={resp.id} className="w-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(resp.user?.displayName || resp.user?.firstName || "Partner")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {resp.user?.displayName || resp.user?.firstName || "Partner"}
                      </CardTitle>
                      <div className="flex items-center text-muted-foreground text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeAgo(resp.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{resp.content}</p>
                  
                  {resp.aiSummary && (
                    <>
                      <Separator className="my-3" />
                      <div className="bg-muted/50 p-3 rounded-md">
                        <h4 className="text-xs font-medium mb-1">AI Summary:</h4>
                        <p className="text-xs text-muted-foreground">{resp.aiSummary}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Response form - only show if the message isn't from the current user */}
        {!isCurrentUser && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Your Response</CardTitle>
              <CardDescription>
                Share your thoughts on this message with your partner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Type your response here..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleSubmitResponse}
                disabled={!response.trim() || responseMutation.isPending}
              >
                {responseMutation.isPending && (
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                )}
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}