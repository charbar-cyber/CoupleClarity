import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { z } from "zod";

// Message and response interfaces
interface Message {
  id: number;
  userId: number;
  emotion: string;
  rawMessage: string;
  transformedMessage: string;
  communicationElements: string[];
  deliveryTips: string[];
  createdAt: Date;
  responses?: Response[];
}

interface Response {
  id: number;
  messageId: number;
  userId: number;
  content: string;
  aiSummary: string;
  createdAt: Date;
}

// Response validation schema
const responseSchema = z.object({
  content: z.string().min(1, "Response cannot be empty").max(2000, "Response is too long")
});

type PartnerDashboardProps = {
  userId: number;
  partnerId: number;
  partnerName?: string;
};

export default function PartnerDashboard({ userId, partnerId, partnerName = "Partner" }: PartnerDashboardProps) {
  const { toast } = useToast();
  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null);
  const [responseContent, setResponseContent] = useState("");
  const { connected, messages: wsMessages, sendMessage } = useWebSocket();

  // Fetch shared messages from partner
  const { data: sharedMessages = [], refetch: refetchSharedMessages } = useQuery({
    queryKey: ['/api/partners', partnerId, 'shared-messages'],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${partnerId}/shared-messages`);
      if (!res.ok) throw new Error('Failed to fetch shared messages');
      return res.json();
    }
  });

  // Mutation for creating a response
  const { mutate: createResponse, isPending } = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number, content: string }) => {
      const response = await apiRequest(`/api/messages/${messageId}/responses?user_id=${userId}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the UI with new response
      queryClient.invalidateQueries({ queryKey: ['/api/messages', currentMessageId, 'responses'] });
      
      // Broadcast the new response via WebSocket
      sendMessage({
        type: 'new_response',
        data: data
      });
      
      // Clear response input
      setResponseContent("");
      
      // Show success toast
      toast({
        title: "Response sent",
        description: "Your response has been sent and analyzed.",
      });
    },
    onError: (error) => {
      console.error("Error sending response:", error);
      toast({
        title: "Error",
        description: "Failed to send your response. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle sending response
  const handleSendResponse = () => {
    try {
      // Validate response
      responseSchema.parse({ content: responseContent });
      
      if (currentMessageId) {
        createResponse({ messageId: currentMessageId, content: responseContent });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0]?.message || "Please check your response",
          variant: "destructive",
        });
      }
    }
  };

  // Listen for WebSocket messages
  useEffect(() => {
    const newMessageNotifications = wsMessages.filter(msg => msg.type === 'new_shared_message');
    
    if (newMessageNotifications.length > 0) {
      // Refresh shared messages when a new one is received
      refetchSharedMessages();
      
      // Show notification for new message
      toast({
        title: "New Message",
        description: `${partnerName} has shared a new message with you.`,
      });
    }
  }, [wsMessages, refetchSharedMessages, partnerName, toast]);

  // Get responses for the current message
  const { data: currentResponses = [] } = useQuery({
    queryKey: ['/api/messages', currentMessageId, 'responses'],
    queryFn: async () => {
      if (!currentMessageId) return [];
      
      const res = await fetch(`/api/messages/${currentMessageId}/responses`);
      if (!res.ok) throw new Error('Failed to fetch responses');
      return res.json();
    },
    enabled: !!currentMessageId
  });

  // Get emotion color based on emotion type
  function getEmotionColor(emotion: string) {
    const emotionColors: Record<string, string> = {
      anger: "bg-red-100 text-red-800",
      sadness: "bg-blue-100 text-blue-800",
      fear: "bg-purple-100 text-purple-800",
      joy: "bg-yellow-100 text-yellow-800",
      disgust: "bg-green-100 text-green-800",
      surprise: "bg-pink-100 text-pink-800",
      frustration: "bg-orange-100 text-orange-800",
      disappointment: "bg-slate-100 text-slate-800",
      anxiety: "bg-indigo-100 text-indigo-800",
      guilt: "bg-emerald-100 text-emerald-800",
    };

    return emotionColors[emotion.toLowerCase()] || "bg-gray-100 text-gray-800";
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Partner Dashboard</h1>
        <Badge variant="outline" className={connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>
      
      <Tabs defaultValue="shared" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="shared">Shared Messages</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shared">
          <div className="grid grid-cols-1 gap-6">
            {sharedMessages.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No shared messages yet.</p>
                </CardContent>
              </Card>
            ) : (
              sharedMessages.map((message: Message) => (
                <Card key={message.id} className={currentMessageId === message.id ? "border-2 border-primary" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <Badge className={getEmotionColor(message.emotion)}>
                        {message.emotion}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{partnerName}'s Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-1">Transformed Message</h3>
                        <p className="text-sm">{message.transformedMessage}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Communication Elements</h3>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {message.communicationElements.map((element, i) => (
                            <li key={i}>{element}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Delivery Tips</h3>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {message.deliveryTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start space-y-4">
                    {currentMessageId === message.id ? (
                      <>
                        <Textarea
                          placeholder="Type your response here..."
                          className="w-full h-32"
                          value={responseContent}
                          onChange={(e) => setResponseContent(e.target.value)}
                        />
                        <div className="flex space-x-2 justify-end w-full">
                          <Button variant="outline" onClick={() => setCurrentMessageId(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSendResponse} disabled={isPending}>
                            {isPending ? "Sending..." : "Send Response"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button onClick={() => setCurrentMessageId(message.id)}>
                        Respond
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="responses">
          <div className="grid grid-cols-1 gap-6">
            {currentResponses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    {currentMessageId ? "No responses yet." : "Select a message to view responses."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              currentResponses.map((response: Response) => (
                <Card key={response.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Analysis</CardTitle>
                    <CardDescription>
                      {new Date(response.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-1">Your Response</h3>
                      <p className="text-sm">{response.content}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-1">AI Analysis</h3>
                      <div className="text-sm whitespace-pre-line bg-slate-50 p-4 rounded-md">
                        {response.aiSummary}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}