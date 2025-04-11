import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { JournalEntry } from "@shared/schema";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JournalResponseFormProps {
  journalEntry: JournalEntry;
  onSuccess: () => void;
}

interface ResponsePrompt {
  text: string;
  description: string;
}

const RESPONSE_PROMPTS: ResponsePrompt[] = [
  {
    text: "What I hear you saying is...",
    description: "Show empathy by reflecting their message back"
  },
  {
    text: "That makes sense because...",
    description: "Validate their perspective and feelings"
  },
  {
    text: "Here's how I felt in that moment...",
    description: "Share your own perspective with care"
  },
  {
    text: "I appreciate you sharing this because...",
    description: "Express gratitude for their vulnerability"
  },
  {
    text: "I'd like to understand more about...",
    description: "Show curiosity about their experience"
  }
];

export function JournalResponseForm({ journalEntry, onSuccess }: JournalResponseFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);
  const [aiGeneratedResponse, setAiGeneratedResponse] = useState("");
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      response: ""
    }
  });

  const responseValue = watch("response");
  
  // Handle submit of the response
  const onSubmit = async (data: { response: string }) => {
    if (!data.response.trim()) {
      toast({
        title: "Response required",
        description: "Please enter a response before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Submit the partner response
      const res = await fetch(`/api/journal/${journalEntry.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: data.response
        }),
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error("Failed to submit response");
      }
      
      toast({
        title: "Response submitted",
        description: "Your response has been shared with your partner."
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({
        title: "Error",
        description: "Failed to submit your response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generate AI response
  const generateAiResponse = async (prompt: string) => {
    try {
      setIsGenerating(true);
      
      const res = await fetch("/api/journal/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          journalEntryId: journalEntry.id,
          journalContent: journalEntry.content,
          prompt
        }),
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error("Failed to generate response");
      }
      
      const data = await res.json();
      setAiGeneratedResponse(data.response);
      setIsAiHelpOpen(false);
      
      // Update the form with the generated response
      setValue("response", data.response);
      
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({
        title: "Generation failed",
        description: "Unable to generate a response. Please try again or write your own.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Apply a prompt template to current response
  const applyPrompt = (promptText: string) => {
    const currentText = responseValue || '';
    setValue("response", `${promptText} ${currentText}`);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Your Response</h3>
          
          <Dialog open={isAiHelpOpen} onOpenChange={setIsAiHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Help
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Response Help</DialogTitle>
                <DialogDescription>
                  Get help crafting a thoughtful response to your partner's journal entry.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="prompts">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prompts">Quick Prompts</TabsTrigger>
                  <TabsTrigger value="generate">Generate Full Response</TabsTrigger>
                </TabsList>
                
                <TabsContent value="prompts" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    These prompts can help you start a response in a constructive way:
                  </p>
                  
                  <div className="grid gap-2">
                    {RESPONSE_PROMPTS.map((prompt, index) => (
                      <Card key={index}>
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-sm">{prompt.text}</CardTitle>
                          <CardDescription className="text-xs">{prompt.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="py-2 px-3 flex justify-end">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => applyPrompt(prompt.text)}
                            type="button"
                          >
                            Use This
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="generate" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Choose a style for your response, and the AI will help craft a thoughtful message:
                  </p>
                  
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => generateAiResponse("empathetic")}
                      disabled={isGenerating}
                      type="button"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Empathetic & Understanding
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => generateAiResponse("supportive")}
                      disabled={isGenerating}
                      type="button"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Supportive & Encouraging
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => generateAiResponse("curious")}
                      disabled={isGenerating}
                      type="button"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Curious & Exploring
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => generateAiResponse("appreciative")}
                      disabled={isGenerating}
                      type="button"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Appreciative & Grateful
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAiHelpOpen(false)}>Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Textarea
          {...register("response", { required: "Please enter your response" })}
          placeholder="Share your thoughts and feelings in response to this journal entry..."
          className="min-h-[150px]"
          disabled={isSubmitting}
        />
        {errors.response && (
          <p className="text-sm text-destructive mt-1">{errors.response.message}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Response"
          )}
        </Button>
      </div>
    </form>
  );
}