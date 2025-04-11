import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Edit, Trash2, Share, Lock, MessageCircle, Heart } from "lucide-react";
import { type JournalEntry } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { JournalEntryForm } from "./journal-entry-form";
import { useToast } from "@/hooks/use-toast";

interface JournalEntriesListProps {
  limit?: number;
}

export function JournalEntriesList({ limit = 10 }: JournalEntriesListProps) {
  const [activeTab, setActiveTab] = useState<"private" | "shared">("private");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  // Query to fetch private journal entries
  const {
    data: privateEntries,
    isLoading: isLoadingPrivate,
    error: privateError,
  } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal", { isPrivate: true, limit }],
    queryFn: async () => {
      const res = await fetch(`/api/journal?isPrivate=true&limit=${limit}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch private journal entries");
      }
      
      return res.json();
    },
  });

  // Query to fetch shared journal entries
  const {
    data: sharedEntries,
    isLoading: isLoadingShared,
    error: sharedError,
  } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal/shared", { limit }],
    queryFn: async () => {
      const res = await fetch(`/api/journal/shared?limit=${limit}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch shared journal entries");
      }
      
      return res.json();
    },
  });

  // Handle entry deletion
  const handleDelete = async () => {
    if (!entryToDelete) return;
    
    try {
      await apiRequest("DELETE", `/api/journal/${entryToDelete}`);
      
      toast({
        title: "Journal entry deleted",
        description: "Your journal entry has been deleted successfully.",
      });
      
      // Refetch entries
      if (activeTab === "private") {
        window.location.reload();
      } else {
        window.location.reload();
      }
      
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Prepare entry for editing
  const handleEdit = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  // Prepare entry for deletion
  const handleDeleteConfirm = (entryId: number) => {
    setEntryToDelete(entryId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue={activeTab}
        onValueChange={(value) => setActiveTab(value as "private" | "shared")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="private">My Journal</TabsTrigger>
          <TabsTrigger value="shared">Shared Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="private" className="mt-4">
          {isLoadingPrivate ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : privateError ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load journal entries. Please try again.
            </div>
          ) : !privateEntries || privateEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No journal entries yet.</p>
              <p className="mt-2">Start writing in your private journal today!</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {privateEntries.map((entry) => (
                  <Card key={entry.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        <div className="flex space-x-1">
                          <TooltipProvider>
                            {entry.isShared ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline">
                                    <Share className="h-3 w-3 mr-1" />
                                    Shared
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  This entry is shared with your partner
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Private
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  This entry is private to you
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </div>
                      <CardDescription>
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">
                        {entry.content.length > 200
                          ? `${entry.content.substring(0, 200)}...`
                          : entry.content}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfirm(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-4">
          {isLoadingShared ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sharedError ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load shared journal entries. Please try again.
            </div>
          ) : !sharedEntries || sharedEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No shared journal entries yet.</p>
              <p className="mt-2">
                Share your thoughts with your partner to strengthen your
                connection.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {sharedEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        <Badge>
                          {entry.userId === (window as any)?.user?.id
                            ? "You"
                            : "Partner"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">
                        {entry.content.length > 200
                          ? `${entry.content.substring(0, 200)}...`
                          : entry.content}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      {entry.userId === (window as any)?.user?.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConfirm(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm">
                            <Heart className="h-4 w-4 mr-1" />
                            Appreciate
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Comment
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

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
              }}
              defaultTab={selectedEntry.isPrivate ? "private" : "shared"}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this journal entry? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}