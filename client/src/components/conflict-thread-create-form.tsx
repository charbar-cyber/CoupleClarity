import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Create form schema
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title cannot exceed 100 characters"),
  initialMessage: z.string().min(10, "Initial message must be at least 10 characters"),
  partnerId: z.number(),
});

interface ConflictThreadCreateFormProps {
  userId: number;
  partnerId: number;
  partnerName: string;
}

export default function ConflictThreadCreateForm({
  userId,
  partnerId,
  partnerName,
}: ConflictThreadCreateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      initialMessage: "",
      partnerId,
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/conflict-threads", {
        title: data.title,
        partnerId: data.partnerId,
      });
      const thread = await response.json();
      
      // Create the first message in the thread
      const messageResponse = await apiRequest("POST", `/api/conflict-threads/${thread.id}/messages`, {
        content: data.initialMessage,
        isFirstMessage: true,
      });
      
      // Broadcast new thread via WebSocket
      const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'new_conflict_thread',
          data: {
            ...thread,
            initialMessage: data.initialMessage,
          }
        }));
        socket.close();
      };
      
      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conflict-threads"] });
      toast({
        title: "Thread created",
        description: "Your conflict thread has been created successfully.",
      });
      navigate(`/conflict/${thread.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating thread",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    createThreadMutation.mutate(data, {
      onSettled: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a Conflict Thread</CardTitle>
        <CardDescription>
          Create a safe space to discuss a conflict with {partnerName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Communication about household chores" {...field} />
                  </FormControl>
                  <FormDescription>
                    Provide a clear title that describes the topic of conflict
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="initialMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what's on your mind and what you'd like to discuss..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Share your perspective using "I" statements and focus on feelings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <Label>Partner</Label>
              <div className="mt-1 p-3 border rounded-md bg-muted/20">
                {partnerName}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                This conflict thread will be shared with your partner
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/conflict')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Thread"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}