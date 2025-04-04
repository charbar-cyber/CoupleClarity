import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { conflictInitiationSchema } from "@shared/schema";
import type { ConflictInitiationInput } from "@shared/schema";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface DetailedConflictCreationFormProps {
  partnerId: number;
  partnerName: string;
}

// Interface for the transformed message response
interface TransformedMessageResponse {
  transformedMessage: string;
  communicationElements: string[];
  deliveryTips: string[];
}

export default function DetailedConflictCreationForm({ partnerId, partnerName }: DetailedConflictCreationFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [transformedMessageData, setTransformedMessageData] = useState<TransformedMessageResponse | null>(null);
  
  // Form definition with validation
  const form = useForm<ConflictInitiationInput>({
    resolver: zodResolver(conflictInitiationSchema),
    defaultValues: {
      partnerId,
      topic: "",
      situation: "",
      feelings: "",
      impact: "",
      request: ""
    }
  });
  
  // Transform the message using OpenAI
  const transformMutation = useMutation({
    mutationFn: async (data: ConflictInitiationInput) => {
      const response = await apiRequest("POST", "/api/transform-conflict", data);
      return await response.json();
    },
    onSuccess: (data: TransformedMessageResponse) => {
      setTransformedMessageData(data);
      setIsPreviewMode(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Transformation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Create conflict thread with transformed message
  const createConflictMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const threadData = {
        partnerId,
        title: form.getValues().topic,
        description: form.getValues().situation,
      };
      
      // First create the thread
      const threadResponse = await apiRequest("POST", "/api/conflict-threads", threadData);
      const threadResult = await threadResponse.json();
      
      // Then create the message within the thread
      const messageData = {
        threadId: threadResult.id,
        content: messageContent,
        isAIGenerated: true
      };
      
      const messageResponse = await apiRequest("POST", `/api/conflict-threads/${threadResult.id}/messages`, messageData);
      const messageResult = await messageResponse.json();
      
      return { thread: threadResult, message: messageResult };
    },
    onSuccess: (data) => {
      toast({
        title: "Conflict thread created",
        description: "Your message has been sent to your partner.",
      });
      
      // Invalidate queries to refresh conflict threads list
      queryClient.invalidateQueries({ queryKey: ["/api/conflict-threads"] });
      
      // Navigate to the thread detail page
      navigate(`/conflict-threads/${data.thread.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create conflict thread",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle preview button click
  const onPreviewClick = (data: ConflictInitiationInput) => {
    transformMutation.mutate(data);
  };
  
  // Handle edit click to go back to form
  const onEditClick = () => {
    setIsPreviewMode(false);
  };
  
  // Handle send click to create thread with transformed message
  const onSendClick = () => {
    if (transformedMessageData) {
      createConflictMutation.mutate(transformedMessageData.transformedMessage);
    }
  };
  
  const isLoading = transformMutation.isPending || createConflictMutation.isPending;
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create a Conflict Thread</CardTitle>
        <CardDescription>
          Express your concerns in a structured way, and let AI help you communicate effectively.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPreviewMode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onPreviewClick)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="What is this conflict about?" {...field} />
                    </FormControl>
                    <FormDescription>
                      A brief title for this conversation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="situation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what happened..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the specific events or circumstances you'd like to discuss.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="feelings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Feelings</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="How do you feel about this?" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Express how this situation makes you feel emotionally.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="How does this affect you or your relationship?" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Explain how this situation impacts you or your relationship.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="request"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request or Solution</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What would you like to happen next?" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      What would you like to happen or change? Be specific about your needs.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <input type="hidden" {...form.register("partnerId")} />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  <>Preview AI-Transformed Message</>
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Your transformed message to {partnerName}</h3>
              <div className="bg-muted p-4 rounded-md mb-4 whitespace-pre-wrap">
                {transformedMessageData?.transformedMessage}
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Communication Elements Used</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {transformedMessageData?.communicationElements.map((element, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Delivery Tips</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
                    <div className="flex items-start mb-2">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0" />
                      <span className="font-medium text-sm">Tips for effective communication</span>
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-7">
                      {transformedMessageData?.deliveryTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isPreviewMode ? (
          <>
            <Button variant="outline" onClick={onEditClick} disabled={isLoading}>
              Edit Message
            </Button>
            <Button 
              onClick={onSendClick} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send to {partnerName}</>
              )}
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-sm text-muted-foreground">
            Fill out all fields to create an AI-assisted message
          </div>
        )}
      </CardFooter>
    </Card>
  );
}