import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { journalEntrySchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Loader2, Brain, PencilLine, Shield, HelpCircle, AlertCircle, HeartHandshake } from "lucide-react";

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
            
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {existingEntry ? "Update" : "Save"} Journal Entry
            </Button>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}