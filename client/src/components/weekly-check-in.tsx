import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const checkInFormSchema = z.object({
  responses: z.array(
    z.object({
      promptId: z.number(),
      response: z.string().min(1, "Response cannot be empty"),
    })
  ),
  isShared: z.boolean().default(false),
});

type CheckInFormValues = z.infer<typeof checkInFormSchema>;

interface Prompt {
  id: number;
  prompt: string;
  category: string;
}

interface WeeklyCheckInProps {
  userId?: number;
}

export default function WeeklyCheckIn({ userId }: WeeklyCheckInProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch check-in status
  const { 
    data: checkInStatus, 
    isLoading: isStatusLoading 
  } = useQuery({
    queryKey: ['/api/check-in/latest', userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/check-in/latest${userId ? `?userId=${userId}` : ''}`);
        if (res.status === 404) {
          return { needsNewCheckIn: true, currentWeek: new Date() };
        }
        if (!res.ok) throw new Error('Failed to fetch check-in status');
        return res.json();
      } catch (error) {
        console.error("Error fetching check-in status:", error);
        // Default to needing a new check-in if there's an error
        return { needsNewCheckIn: true, currentWeek: new Date() };
      }
    },
    enabled: !!userId // Only run query if userId is defined
  });

  // Fetch prompts for the check-in
  const { 
    data: prompts, 
    isLoading: isPromptsLoading 
  } = useQuery({
    queryKey: ['/api/check-in/prompts', userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/check-in/prompts${userId ? `?userId=${userId}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch check-in prompts');
        return res.json();
      } catch (error) {
        console.error("Error fetching check-in prompts:", error);
        return [];
      }
    },
    enabled: (isExpanded || (checkInStatus?.needsNewCheckIn === true)) && !!userId,
  });

  // Prepare form with default values
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: {
      responses: [],
      isShared: false,
    },
  });

  // Set default form values when prompts are loaded
  useEffect(() => {
    if (prompts && prompts.length > 0) {
      form.reset({
        responses: prompts.map((prompt: Prompt) => ({
          promptId: prompt.id,
          response: "",
        })),
        isShared: shareWithPartner,
      });
    }
  }, [prompts, form, shareWithPartner]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: CheckInFormValues) => {
      // Include userId in request body if available
      const payload = userId ? { ...data, userId } : data;
      
      const res = await fetch('/api/check-in/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit check-in');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in submitted",
        description: "Your weekly check-in has been saved",
        variant: "default",
      });
      setIsExpanded(false);
      queryClient.invalidateQueries({ queryKey: ['/api/check-in/latest'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit check-in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    data.isShared = shareWithPartner;
    submitMutation.mutate(data);
  });

  if (isStatusLoading) {
    return (
      <Card className="w-full mb-6">
        <CardContent className="pt-6 flex items-center justify-center min-h-[120px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Check if needs a new check-in
  const needsCheckIn = checkInStatus?.needsNewCheckIn !== false;
  
  // Format the date for display
  const weekStartDate = checkInStatus?.currentWeek 
    ? format(new Date(checkInStatus.currentWeek), 'MMM d, yyyy')
    : format(new Date(), 'MMM d, yyyy');

  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          Weekly Check-in
          {!needsCheckIn && (
            <CheckCircle2 className="h-5 w-5 ml-2 text-green-500" />
          )}
          {needsCheckIn && (
            <AlertCircle className="h-5 w-5 ml-2 text-amber-500" />
          )}
        </CardTitle>
        <CardDescription>
          Week of {weekStartDate}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        {!isExpanded && needsCheckIn && (
          <div className="space-y-2">
            <p className="text-sm">
              Take a moment to reflect on your relationship this week. Your responses can help you track patterns and growth.
            </p>
            <Button 
              onClick={() => setIsExpanded(true)}
              className="w-full"
            >
              Start Weekly Check-in
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        
        {!isExpanded && !needsCheckIn && (
          <div className="text-sm">
            <p>You've completed your check-in for this week. 
               A new check-in will be available next week.</p>
          </div>
        )}
        
        {isExpanded && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {isPromptsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {prompts && prompts.map((prompt: Prompt, index: number) => (
                  <div key={prompt.id} className="space-y-2">
                    <Label htmlFor={`response-${prompt.id}`} className="text-sm font-medium">
                      {prompt.prompt}
                    </Label>
                    <Textarea
                      id={`response-${prompt.id}`}
                      className="min-h-[80px]"
                      placeholder="Write your thoughts here..."
                      {...form.register(`responses.${index}.response`)}
                    />
                    <input 
                      type="hidden" 
                      value={prompt.id} 
                      {...form.register(`responses.${index}.promptId`, {
                        valueAsNumber: true
                      })} 
                    />
                    {form.formState.errors.responses?.[index]?.response && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.responses[index]?.response?.message}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </form>
        )}
      </CardContent>
      
      {isExpanded && (
        <CardFooter className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 w-full">
            <Switch
              id="share-check-in"
              checked={shareWithPartner}
              onCheckedChange={setShareWithPartner}
            />
            <Label htmlFor="share-check-in" className="text-sm">
              Share these reflections with my partner
            </Label>
          </div>
          
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setIsExpanded(false)}
              className="flex-1"
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitMutation.isPending}
              className="flex-1"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit Check-in"
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}