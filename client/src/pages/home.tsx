import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import WelcomeCard from "@/components/welcome-card";
import EmotionExpressionForm from "@/components/emotion-expression-form";
import TransformedMessageCard from "@/components/transformed-message-card";
import SuggestedReading from "@/components/suggested-reading";
import Homebase from "@/components/homebase";
import { apiRequest } from "@/lib/queryClient";
import { TransformationResponse } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [transformedResponse, setTransformedResponse] = useState<TransformationResponse | null>(null);
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const { connected, sendMessage } = useWebSocket();
  
  // Get user info
  const userId = user?.id || 1;
  const userName = user?.displayName || user?.firstName || "You";
  
  // For demonstration purposes
  // In a real app, this would be fetched from the API
  const partnerId = 2; // Temporary partner ID
  const partnerName = "Partner";

  const transformMutation = useMutation({
    mutationFn: async (data: {
      emotion: string;
      rawMessage: string;
      context?: string;
      saveToHistory: boolean;
      shareWithPartner?: boolean;
      partnerId?: number;
    }) => {
      const response = await apiRequest(
        "POST", 
        `/api/transform?user_id=${userId}`, 
        data
      );
      return response.json();
    },
    onSuccess: (data: TransformationResponse) => {
      setTransformedResponse(data);
      
      // If message was shared, notify partners via WebSocket
      if (shareWithPartner && connected && data.messageId) {
        sendMessage({
          type: 'new_message',
          data: {
            id: data.messageId,
            transformedMessage: data.transformedMessage,
            communicationElements: data.communicationElements,
            deliveryTips: data.deliveryTips
          }
        });
        
        toast({
          title: "Message shared",
          description: "Your message has been shared with your partner.",
        });
      } else {
        toast({
          title: "Message transformed successfully",
          description: "Your emotional message has been transformed into empathetic communication.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to transform message",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTransform = (data: {
    emotion: string;
    rawMessage: string;
    context?: string;
    saveToHistory: boolean;
  }) => {
    // Add sharing options to the data
    const enrichedData = {
      ...data,
      shareWithPartner,
      partnerId: shareWithPartner ? partnerId : undefined
    };
    
    transformMutation.mutate(enrichedData);
  };

  return (
    <main className="flex-grow py-6 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <Homebase
          userId={userId}
          partnerId={partnerId}
          userName={userName}
          partnerName={partnerName}
        />
        <WelcomeCard 
          activeTab={showHistory ? "history" : "express"} 
          onChangeTab={(tab) => setShowHistory(tab === "history")}
        />
        
        {!showHistory && (
          <>
            <div className="mb-4 flex items-center space-x-2">
              <Switch
                id="share-partner"
                checked={shareWithPartner}
                onCheckedChange={setShareWithPartner}
              />
              <Label htmlFor="share-partner" className="text-sm font-medium">
                Share with partner after transformation
              </Label>
              {!connected && shareWithPartner && (
                <span className="text-xs text-destructive">
                  WebSocket not connected. Share might not work.
                </span>
              )}
            </div>
            
            <EmotionExpressionForm 
              onSubmit={handleTransform} 
              isLoading={transformMutation.isPending}
            />
            
            {transformedResponse && (
              <TransformedMessageCard 
                transformedMessage={transformedResponse.transformedMessage}
                communicationElements={transformedResponse.communicationElements}
                deliveryTips={transformedResponse.deliveryTips}
              />
            )}
            
            <SuggestedReading />
          </>
        )}
      </div>
    </main>
  );
}
