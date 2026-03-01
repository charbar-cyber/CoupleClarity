import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Memory, memoryTypes } from "@shared/schema";
import WelcomeCard from "@/components/welcome-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Star, MessageCircle, Award, Heart, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/config";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  content: z.string().min(10, "Content must be at least 10 characters"),
  date: z.string().optional(),
  type: z.enum(memoryTypes as unknown as [string, ...string[]]),
  isSignificant: z.boolean().default(false),
  partnershipId: z.number(),
});

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const partnershipId = user?.partnerships?.[0]?.id;
  
  // Query for fetching memories based on active tab
  const { data: memories, isLoading } = useQuery({
    queryKey: [
      activeTab === "all" 
        ? `/api/partnerships/${partnershipId}/memories`
        : activeTab === "significant"
          ? `/api/partnerships/${partnershipId}/memories/significant`
          : `/api/partnerships/${partnershipId}/memories/type/${activeTab}`
    ],
    enabled: !!partnershipId,
  });

  // Query for search
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: [`/api/partnerships/${partnershipId}/memories/search`, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(apiUrl(`/api/partnerships/${partnershipId}/memories/search?q=${encodeURIComponent(searchQuery)}`));
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: !!partnershipId && searchQuery.trim().length > 0,
  });

  // Set up form for creating new memories
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      date: new Date().toISOString().split('T')[0],
      type: "custom",
      isSignificant: false,
      partnershipId: partnershipId || 0,
    },
  });

  // Update partnership ID when user loads
  useEffect(() => {
    if (partnershipId) {
      form.setValue("partnershipId", partnershipId);
    }
  }, [partnershipId, form]);

  // Mutation for creating new memories
  const createMemoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/memories", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/partnerships/${partnershipId}/memories`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/partnerships/${partnershipId}/memories/significant`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/partnerships/${partnershipId}/memories/type/${form.getValues("type")}`],
      });
      toast({
        title: "Memory created",
        description: "Your memory has been saved successfully.",
      });
      form.reset();
      setOpenDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create memory",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Effect to filter memories based on search query
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setFilteredMemories(searchResults || []);
    } else {
      setFilteredMemories(memories || []);
    }
  }, [memories, searchResults, searchQuery]);

  function getTimeAgo(dateString: string | Date) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return format(date, "MMM d, yyyy");
  }

  function getMemoryTypeIcon(type: string) {
    switch (type) {
      case "milestone":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case "conflict_resolution":
        return <MessageCircle className="h-4 w-4 text-amber-600" />;
      case "appreciation":
        return <Award className="h-4 w-4 text-purple-600" />;
      case "check_in":
        return <Heart className="h-4 w-4 text-rose-600" />;
      default:
        return <Star className="h-4 w-4 text-emerald-600" />;
    }
  }

  function formatMemoryType(type: string) {
    switch (type) {
      case "milestone": return "Milestone";
      case "conflict_resolution": return "Conflict Resolution";
      case "appreciation": return "Appreciation";
      case "check_in": return "Check-in";
      case "custom": return "Custom Memory";
      default: return type;
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMemoryMutation.mutate(values);
  }

  if (!user || !partnershipId) {
    return (
      <main className="flex-grow py-6 px-4 md:px-0">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-neutral-500">
                  Please complete partner connection to access memories
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow py-6 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <WelcomeCard activeTab="history" onChangeTab={() => {}} />
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Relationship Timeline</CardTitle>
                <CardDescription>Browse your shared relationship memories</CardDescription>
              </div>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span>Add Memory</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Memory</DialogTitle>
                    <DialogDescription>
                      Add a special moment or milestone to your relationship timeline.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="First date, Anniversary, etc." {...field} />
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
                            <FormLabel>Details</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe this memory..." 
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="milestone">Milestone</SelectItem>
                                  <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                                  <SelectItem value="appreciation">Appreciation</SelectItem>
                                  <SelectItem value="check_in">Check-in</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="isSignificant"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Mark as significant</FormLabel>
                              <FormDescription>
                                Significant memories appear at the top of your timeline
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setOpenDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMemoryMutation.isPending}>
                          {createMemoryMutation.isPending ? "Saving..." : "Save Memory"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 px-4 pl-10"
              />
              <span className="absolute left-3 top-3 text-neutral-500">
                <Search size={16} />
              </span>
            </div>
            
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="significant">Significant</TabsTrigger>
                <TabsTrigger value="milestone">Milestones</TabsTrigger>
                <TabsTrigger value="conflict_resolution">Conflicts</TabsTrigger>
                <TabsTrigger value="appreciation">Appreciation</TabsTrigger>
                <TabsTrigger value="check_in">Check-ins</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="space-y-4">
                {isLoading || isSearching ? (
                  // Loading state
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-3/4 mt-1" />
                    </div>
                  ))
                ) : filteredMemories && filteredMemories.length > 0 ? (
                  // Memories list
                  filteredMemories.map((memory: Memory) => (
                    <Card key={memory.id} className={`border transition-colors ${memory.isSignificant ? 'bg-amber-50 border-amber-200' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {getMemoryTypeIcon(memory.type)}
                            <CardTitle className="text-base font-medium">
                              {memory.title}
                              {memory.isSignificant && (
                                <Star className="h-3 w-3 text-amber-500 ml-1 inline" />
                              )}
                            </CardTitle>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-neutral-500">
                            <span>{formatMemoryType(memory.type)}</span>
                            <span>•</span>
                            <span>{getTimeAgo(memory.date || memory.createdAt)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-neutral-700">{memory.content}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  // Empty state
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-neutral-500 mb-2">No memories found</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setOpenDialog(true)}
                    >
                      Add your first memory
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
