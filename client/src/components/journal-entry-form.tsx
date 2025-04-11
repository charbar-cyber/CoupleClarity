import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { journalEntrySchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClarityCoach } from "./clarity-coach";

// Type for the journal analysis response
interface JournalAnalysis {
  aiSummary: string;
  aiRefinedContent: string;
  emotionalInsight: string;
  emotionalScore: number;
  suggestedResponse: string;
  suggestedBoundary: string;
  reflectionPrompt: string;
  patternCategory: string;
  emotions: string[];
}

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Loader2, Brain, PencilLine, Shield, HelpCircle, AlertCircle, HeartHandshake, BrainCog, Sparkles } from "lucide-react";

// Extended schema for client-side validation
const clientJournalSchema = journalEntrySchema.extend({
  isPrivate: z.boolean().default(true),
  isShared: z.boolean().default(false),
});

type JournalFormValues = z.infer<typeof clientJournalSchema>;

interface JournalEntryFormProps {
  existingEntry?: {
    id: number;
    title: string;
    content: string;
    isPrivate: boolean;
    isShared: boolean;
  };
  onSuccess?: () => void;
  defaultTab?: "private" | "shared";
}

export function JournalEntryForm({
  existingEntry,
  onSuccess,
  defaultTab = "private",
}: JournalEntryFormProps) {
  const [activeTab, setActiveTab] = useState<"private" | "shared">(defaultTab);
  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisSection, setShowAnalysisSection] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(clientJournalSchema),
    defaultValues: existingEntry
      ? {
          title: existingEntry.title,
          content: existingEntry.content,
          rawContent: existingEntry.content,
          isPrivate: existingEntry.isPrivate,
          isShared: existingEntry.isShared,
        }
      : {
          title: "",
          content: "",
          rawContent: "",
          isPrivate: activeTab === "private",
          isShared: activeTab === "shared",
        },
  });

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newTab = value as "private" | "shared";
    setActiveTab(newTab);
    
    // Update form values based on tab
    form.setValue("isPrivate", newTab === "private");
    form.setValue("isShared", newTab === "shared");
  };

  // Analyze journal entry using AI
  const analysisMutation = useMutation({
    mutationFn: async () => {
      const title = form.getValues('title');
      const content = form.getValues('content');
      
      if (!title || !content) {
        throw new Error("Please provide both a title and content for analysis");
      }
      
      setIsAnalyzing(true);
      
      const res = await apiRequest("POST", "/api/journal/analyze", {
        journalEntry: content,
        title: title,
        entryId: existingEntry?.id
      });
      
      return res.json() as Promise<JournalAnalysis>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setShowAnalysisSection(true);
      setIsAnalyzing(false);
      
      // Update form with AI refined content if sharing
      if (form.getValues('isShared')) {
        form.setValue('content', data.aiRefinedContent);
      }
      
      // Update form with AI analysis data
      form.setValue('aiSummary', data.aiSummary);
      form.setValue('aiRefinedContent', data.aiRefinedContent);
      form.setValue('emotions', data.emotions);
      
      toast({
        title: "Journal Analysis Complete",
        description: "Your entry has been analyzed with emotional intelligence insights.",
      });
    },
    onError: (error) => {
      console.error("Error analyzing journal entry:", error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze your journal entry. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Function to handle analysis request
  const handleAnalyze = () => {
    if (!form.getValues('title') || !form.getValues('content')) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content for your journal entry.",
        variant: "destructive",
      });
      return;
    }
    
    analysisMutation.mutate();
  };
  
  // Function to handle inserting a prompt from Clarity Coach
  const handleInsertPrompt = (prompt: string) => {
    const currentContent = form.getValues('content');
    const newContent = currentContent ? `${currentContent}\n\n${prompt}` : prompt;
    form.setValue('content', newContent);
    
    toast({
      title: "Prompt Added",
      description: "The suggested prompt has been added to your journal entry.",
    });
  };
  
  // Create or update journal entry
  const mutation = useMutation({
    mutationFn: async (values: JournalFormValues) => {
      if (existingEntry) {
        // Update existing entry
        const res = await apiRequest("PUT", `/api/journal/${existingEntry.id}`, values);
        return res.json();
      } else {
        // Create new entry
        const res = await apiRequest("POST", "/api/journal", values);
        return res.json();
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal/shared"] });
      
      // Show success message
      toast({
        title: existingEntry
          ? "Journal entry updated"
          : "Journal entry created",
        description: existingEntry
          ? "Your journal entry has been updated successfully."
          : "Your journal entry has been saved successfully.",
      });
      
      // Reset form if creating new entry
      if (!existingEntry) {
        form.reset({
          title: "",
          content: "",
          rawContent: "",
          isPrivate: activeTab === "private",
          isShared: activeTab === "shared",
        });
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to save journal entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: JournalFormValues) {
    // Ensure rawContent gets set before submission
    if (!values.rawContent) {
      values.rawContent = values.content;
    }
    
    mutation.mutate(values);
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="private">Private Journal</TabsTrigger>
          <TabsTrigger value="shared">Shared Journal</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Journal entry title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        activeTab === "private"
                          ? "Write your private thoughts here..."
                          : "Write a journal entry to share with your partner..."
                      }
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {activeTab === "private" && (
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Share with partner
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Your partner will be able to see this entry
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !form.getValues('title') || !form.getValues('content')}
              >
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
              </Button>
              
              <Button
                type="submit"
                className="flex-1"
                disabled={mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {existingEntry ? "Update" : "Save"} Journal Entry
              </Button>
            </div>
            
            {/* Analysis results section */}
            {analysis && showAnalysisSection && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-primary" />
                    Emotional Intelligence Analysis
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights about your journal entry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysis.aiSummary}
                    </p>
                  </div>
                  
                  {/* Emotions detected */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Emotions Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.emotions.map((emotion) => (
                        <Badge key={emotion} variant="outline" className="capitalize">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Pattern category */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pattern Detected</h4>
                    <Badge variant="secondary" className="capitalize">
                      {analysis.patternCategory.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Emotional intensity: {analysis.emotionalScore}/10
                    </p>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full">
                    {/* Refined content */}
                    <AccordionItem value="refined">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center">
                          <PencilLine className="mr-2 h-4 w-4" />
                          Emotionally Aware Version
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {analysis.aiRefinedContent}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => {
                            form.setValue('content', analysis.aiRefinedContent);
                            toast({
                              title: "Content Updated",
                              description: "The emotionally aware version has been applied to your entry."
                            });
                          }}
                        >
                          Use This Version
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Emotional insight */}
                    <AccordionItem value="insight">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center">
                          <Brain className="mr-2 h-4 w-4" />
                          Emotional Insight
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {analysis.emotionalInsight}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Suggested response */}
                    <AccordionItem value="response">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center">
                          <HeartHandshake className="mr-2 h-4 w-4" />
                          Partner Response Suggestion
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {analysis.suggestedResponse}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Suggested boundary */}
                    <AccordionItem value="boundary">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Healthy Boundary Suggestion
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {analysis.suggestedBoundary}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Reflection prompt */}
                    <AccordionItem value="reflection">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Reflection Question
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                          {analysis.reflectionPrompt}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setIsDrawerOpen(true)} 
                    variant="outline"
                    className="w-full"
                  >
                    <BrainCog className="mr-2 h-4 w-4" />
                    Open Clarity Coach
                  </Button>
                </CardFooter>
              </Card>
            )}
          </form>
        </Form>
      </Tabs>
      
      {/* Clarity Coach Drawer */}
      {analysis && (
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-center">
              <DrawerTitle className="flex items-center justify-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                Clarity Coach
              </DrawerTitle>
              <DrawerDescription>
                Personalized emotional guidance and writing prompts
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2 overflow-y-auto max-h-[60vh]">
              {analysis && (
                <ClarityCoach 
                  journalEntry={{
                    id: existingEntry?.id || 0,
                    title: form.getValues('title'),
                    content: form.getValues('content'),
                    emotions: analysis.emotions,
                    emotionalScore: analysis.emotionalScore,
                    reflectionPrompt: analysis.reflectionPrompt,
                    patternCategory: analysis.patternCategory
                  }}
                  onSharePrompt={handleInsertPrompt}
                />
              )}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}