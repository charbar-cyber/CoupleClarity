import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { JournalEntry } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const journalResponseSchema = z.object({
  content: z.string().min(10, "Your response must be at least 10 characters")
});

type JournalResponseFormValues = z.infer<typeof journalResponseSchema>;

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
    text: "I understand how you feel",
    description: "Express empathy for your partner's emotions"
  },
  {
    text: "Thank you for sharing this with me",
    description: "Show appreciation for their vulnerability"
  },
  {
    text: "I'd like to know more about",
    description: "Express curiosity to understand their perspective better"
  },
  {
    text: "I love that you",
    description: "Highlight something positive you noticed"
  }
];

export function JournalResponseForm({ journalEntry, onSuccess }: JournalResponseFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("write");
  const [generatedResponse, setGeneratedResponse] = useState<string | null>(null);
  
  const form = useForm<JournalResponseFormValues>({
    resolver: zodResolver(journalResponseSchema),
    defaultValues: {
      content: ""
    }
  });

  async function generateResponse(type: string) {
    setIsGenerating(true);
    setGeneratedResponse(null);
    
    try {
      const response = await apiRequest(
        "POST", 
        `/api/journal/generate-response`, 
        {
          journalContent: journalEntry.content,
          responseType: type
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate response');
      }
      
      const data = await response.json();
      setGeneratedResponse(data.response);
      form.setValue('content', data.response);
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error generating response",
        description: "There was a problem generating your response. Please try again or write your own.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function onSubmit(values: JournalResponseFormValues) {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest(
        "POST", 
        `/api/journal/${journalEntry.id}/respond`, 
        values
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }
      
      toast({
        title: "Response submitted",
        description: "Your response has been sent to your partner.",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: "Error submitting response",
        description: error.message || "There was a problem submitting your response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function insertPrompt(prompt: string) {
    const currentContent = form.getValues().content;
    const newContent = currentContent 
      ? `${currentContent}\n\n${prompt} ` 
      : `${prompt} `;
    
    form.setValue('content', newContent, { shouldValidate: true });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Respond to "{journalEntry.title}"</CardTitle>
        <CardDescription>
          Your partner has shared this journal entry with you. Write a thoughtful response.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="write">Write Response</TabsTrigger>
            <TabsTrigger value="ai-assist">AI Assistance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="write" className="space-y-4">
            <div className="bg-muted p-4 rounded-md mb-4">
              <h4 className="font-medium mb-2">Response Prompts</h4>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_PROMPTS.map((prompt, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => insertPrompt(prompt.text)}
                    title={prompt.description}
                  >
                    {prompt.text}
                  </Button>
                ))}
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Response</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write your response here..." 
                          className="min-h-[200px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Response...
                    </>
                  ) : (
                    "Send Response"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="ai-assist" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button 
                variant="outline"
                onClick={() => generateResponse('empathetic')}
                disabled={isGenerating}
              >
                Empathetic Response
              </Button>
              <Button 
                variant="outline"
                onClick={() => generateResponse('supportive')}
                disabled={isGenerating}
              >
                Supportive Response
              </Button>
              <Button 
                variant="outline"
                onClick={() => generateResponse('curious')}
                disabled={isGenerating}
              >
                Curious Response
              </Button>
              <Button 
                variant="outline"
                onClick={() => generateResponse('appreciative')}
                disabled={isGenerating}
              >
                Appreciative Response
              </Button>
            </div>
            
            {isGenerating ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Generating thoughtful response...</p>
              </div>
            ) : generatedResponse ? (
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <p className="whitespace-pre-wrap">{generatedResponse}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedResponse(null)}
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={() => {
                      form.setValue('content', generatedResponse);
                      setActiveTab('write');
                    }}
                  >
                    Use This Response
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Select a response type above to generate an AI-assisted response.</p>
                <p className="mt-2 text-sm">The AI will craft a thoughtful message based on your partner's journal entry.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}