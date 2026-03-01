import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { 
  PencilIcon, 
  EyeIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  MessageSquareIcon,
  UserIcon,
  UsersIcon,
  FilterIcon,
  LockIcon,
  ShareIcon,
  Brain,
  PencilLine,
  HeartHandshake,
  Shield,
  HelpCircle,
  Loader2,
  Reply
} from "lucide-react";
import { type JournalEntry } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { JournalEntryForm } from "./journal-entry-form";
import { JournalResponseForm } from "./journal-response-form";
import { apiUrl } from "@/lib/config";

interface JournalTimelineProps {
  limit?: number;
}

export function JournalTimeline({ limit }: JournalTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "private" | "shared">("all");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to fetch all journal entries
  const {
    data: entries,
    isLoading,
    error,
    refetch
  } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal", { limit }],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/journal?limit=${limit || ""}`), {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch journal entries");
      }
      
      return res.json();
    },
  });

  // Query to fetch shared journal entries
  const {
    data: sharedEntries,
    isLoading: isLoadingShared,
  } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal/shared", { limit }],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/journal/shared?limit=${limit || ""}`), {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch shared journal entries");
      }
      
      return res.json();
    },
  });

  // Filtered entries based on the active filter
  const filteredEntries = entries && sharedEntries ? 
    activeFilter === "all" 
      ? [...entries]
      : activeFilter === "private" 
        ? entries.filter(entry => entry.isPrivate && !entry.isShared)
        : entries.filter(entry => entry.isShared)
    : [];

  // Sort entries by creation date (newest first)
  filteredEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate limit based on the prop
  const displayEntries = limit ? filteredEntries.slice(0, limit) : filteredEntries;

  // Handle marking an entry as resolved
  const handleMarkResolved = async (entryId: number) => {
    try {
      await fetch(apiUrl(`/api/journal/${entryId}/mark-resolved`), {
        method: "POST",
        credentials: "include",
      });
      
      toast({
        title: "Journal entry marked as resolved",
        description: "The journal entry has been marked as resolved.",
      });
      
      // Refetch entries
      refetch();
    } catch (error) {
      console.error("Error marking journal entry as resolved:", error);
      toast({
        title: "Error",
        description: "Failed to mark journal entry as resolved. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get entry status badge
  const getEntryStatus = (entry: JournalEntry) => {
    if (entry.isShared) {
      // If has partner response
      if (entry.hasPartnerResponse) {
        return {
          label: "Partner responded",
          variant: "default",
          icon: <CheckCircleIcon className="h-3 w-3 mr-1" />
        };
      }
      // If awaiting response
      return {
        label: "Awaiting partner response",
        variant: "secondary",
        icon: <ClockIcon className="h-3 w-3 mr-1" />
      };
    }
    
    // If AI analyzed
    if (entry.aiSummary) {
      return {
        label: "AI analyzed",
        variant: "outline",
        icon: <MessageSquareIcon className="h-3 w-3 mr-1" />
      };
    }

    // Default for private entries
    return {
      label: "Private",
      variant: "outline",
      icon: <LockIcon className="h-3 w-3 mr-1" />
    };
  };

  // Loading state
  if (isLoading || isLoadingShared) {
    return (
      <div className="flex justify-center items-center p-6 flex-col gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading journal entries...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center p-6 text-destructive">
        <p>Error loading journal entries. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-xl font-bold">Journal Timeline</h2>
        
        <ToggleGroup 
          type="single" 
          value={activeFilter}
          onValueChange={(value) => value && setActiveFilter(value as "all" | "private" | "shared")}
          className="border rounded-md"
        >
          <ToggleGroupItem value="all" aria-label="Show all entries">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="private" aria-label="Show private entries only">
            <LockIcon className="h-4 w-4 mr-1" /> Private
          </ToggleGroupItem>
          <ToggleGroupItem value="shared" aria-label="Show shared entries only">
            <ShareIcon className="h-4 w-4 mr-1" /> Shared
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground space-y-4">
            <div className="rounded-full bg-muted p-3">
              <PencilLine className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">No journal entries found</p>
              <p className="text-sm">
                {activeFilter === "all" 
                  ? "Start writing to build your journal history."
                  : activeFilter === "private" 
                    ? "Create private entries for personal reflection."
                    : "Share entries with your partner for deeper connection."
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="mt-2"
            >
              {activeFilter !== "all" ? "Show all entries" : "Create an entry"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayEntries.map((entry) => {
              const status = getEntryStatus(entry);
              
              return (
                <Card key={entry.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {entry.isPrivate && !entry.isShared && (
                            <LockIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          {entry.isShared && (
                            <ShareIcon className="h-4 w-4 text-primary" />
                          )}
                          {entry.title}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(entry.createdAt), "MMMM dd, yyyy")} (
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })})
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant as any} className="flex items-center">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">
                      {entry.content}
                    </p>
                    
                    {entry.emotions && entry.emotions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Emotions:</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.emotions.slice(0, 3).map(emotion => (
                            <Badge 
                              key={emotion} 
                              variant="outline" 
                              className="capitalize text-xs px-2 py-0"
                            >
                              {emotion}
                            </Badge>
                          ))}
                          {entry.emotions.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-0">
                              +{entry.emotions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-start gap-2 pt-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View journal entry details</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit this journal entry</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* For entry owner: ability to mark as resolved */}
                    {entry.isShared && !entry.hasPartnerResponse && entry.userId === user?.id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkResolved(entry.id)}
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Mark Resolved
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark this entry as resolved</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* For partner: ability to respond to entry */}
                    {entry.isShared && !entry.hasPartnerResponse && entry.userId !== user?.id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsRespondDialogOpen(true);
                              }}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Respond
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Respond to this journal entry</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* View dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Journal Entry</DialogTitle>
            <DialogDescription>
              {selectedEntry && format(new Date(selectedEntry.createdAt), "MMMM dd, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{selectedEntry.title}</h3>
                <div className="flex gap-2">
                  {selectedEntry.isPrivate && !selectedEntry.isShared && (
                    <Badge variant="outline" className="flex items-center">
                      <LockIcon className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  {selectedEntry.isShared && (
                    <Badge className="flex items-center">
                      <ShareIcon className="h-3 w-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                  {selectedEntry.emotions && selectedEntry.emotions.length > 0 && (
                    selectedEntry.emotions.map(emotion => (
                      <Badge key={emotion} variant="secondary" className="capitalize">
                        {emotion}
                      </Badge>
                    ))
                  )}
                </div>
                <p className="whitespace-pre-wrap">{selectedEntry.content}</p>
              </div>

              {/* AI Analysis section */}
              {selectedEntry.aiSummary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="insights" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="insights">Insights</TabsTrigger>
                        <TabsTrigger value="refined">Refined Version</TabsTrigger>
                        <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="insights" className="space-y-3 mt-4">
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <PencilLine className="h-3 w-3" /> Summary
                          </h4>
                          <p className="text-sm">{selectedEntry.aiSummary}</p>
                        </div>
                        
                        {selectedEntry.emotionalInsight && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <HeartHandshake className="h-3 w-3" /> Emotional Insight
                            </h4>
                            <p className="text-sm">{selectedEntry.emotionalInsight}</p>
                          </div>
                        )}
                        
                        {selectedEntry.patternCategory && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Brain className="h-3 w-3" /> Pattern Detected
                            </h4>
                            <p className="text-sm capitalize">{selectedEntry.patternCategory.replace(/_/g, " ")}</p>
                            
                            {selectedEntry.emotionalScore && (
                              <div className="mt-2">
                                <h4 className="text-xs font-medium text-muted-foreground">Emotional Intensity</h4>
                                <div className="w-full bg-muted rounded-full h-2 mt-1">
                                  <div
                                    className="bg-primary rounded-full h-2"
                                    style={{ width: `${selectedEntry.emotionalScore * 10}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {selectedEntry.emotionalScore < 4 ? 'Low' : 
                                   selectedEntry.emotionalScore < 7 ? 'Moderate' : 
                                   'High'} intensity ({selectedEntry.emotionalScore}/10)
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="refined" className="space-y-3 mt-4">
                        {selectedEntry.aiRefinedContent ? (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-sm italic whitespace-pre-wrap">{selectedEntry.aiRefinedContent}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No refined version available.</p>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="suggestions" className="space-y-3 mt-4">
                        {selectedEntry.suggestedResponse && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <MessageSquareIcon className="h-3 w-3" /> Suggested Partner Response
                            </h4>
                            <p className="text-sm">{selectedEntry.suggestedResponse}</p>
                          </div>
                        )}
                        
                        {selectedEntry.suggestedBoundary && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Suggested Boundary
                            </h4>
                            <p className="text-sm">{selectedEntry.suggestedBoundary}</p>
                          </div>
                        )}
                        
                        {selectedEntry.reflectionPrompt && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <HelpCircle className="h-3 w-3" /> Reflection Question
                            </h4>
                            <p className="text-sm italic">"{selectedEntry.reflectionPrompt}"</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <JournalEntryForm
              existingEntry={{
                id: selectedEntry.id,
                title: selectedEntry.title,
                content: selectedEntry.content,
                isPrivate: selectedEntry.isPrivate,
                isShared: selectedEntry.isShared,
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedEntry(null);
                refetch();
              }}
              defaultTab={selectedEntry.isPrivate && !selectedEntry.isShared ? "private" : "shared"}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Response dialog */}
      <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Respond to Journal Entry</DialogTitle>
            <DialogDescription>
              {selectedEntry && 
                `Share your thoughts about "${selectedEntry.title}" with your partner`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <JournalResponseForm 
              journalEntry={selectedEntry}
              onSuccess={() => {
                setIsRespondDialogOpen(false);
                toast({
                  title: "Response submitted",
                  description: "Your response has been sent to your partner.",
                });
                // Invalidate both journal queries to refresh the list
                queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
                queryClient.invalidateQueries({ queryKey: ["/api/journal/shared"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}