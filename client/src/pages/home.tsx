import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import WelcomeCard from "@/components/welcome-card";
import EmotionExpressionForm from "@/components/emotion-expression-form";
import TransformedMessageCard from "@/components/transformed-message-card";
import SuggestedReading from "@/components/suggested-reading";
import { apiRequest } from "@/lib/queryClient";
import { TransformationResponse } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [transformedResponse, setTransformedResponse] = useState<TransformationResponse | null>(null);

  const transformMutation = useMutation({
    mutationFn: async (data: {
      emotion: string;
      rawMessage: string;
      context?: string;
      saveToHistory: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/transform", data);
      return response.json();
    },
    onSuccess: (data: TransformationResponse) => {
      setTransformedResponse(data);
      toast({
        title: "Message transformed successfully",
        description: "Your emotional message has been transformed into empathetic communication.",
      });
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
    transformMutation.mutate(data);
  };

  return (
    <main className="flex-grow py-6 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <WelcomeCard 
          activeTab={showHistory ? "history" : "express"} 
          onChangeTab={(tab) => setShowHistory(tab === "history")}
        />
        
        {!showHistory && (
          <>
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
