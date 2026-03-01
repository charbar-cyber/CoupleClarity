import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Heart, PlusCircle } from "lucide-react";
import { apiUrl } from '@/lib/config';

// Define the appreciation schema
const appreciationSchema = z.object({
  content: z.string().min(1, "Appreciation cannot be empty").max(300, "Appreciation is too long"),
  partnerId: z.number().optional(),
});

type AppreciationFormValues = z.infer<typeof appreciationSchema>;

interface Appreciation {
  id: number;
  userId: number;
  partnerId: number;
  content: string;
  createdAt: string;
}

interface AppreciationLogProps {
  userId?: number;
  partnerId?: number;
}

export default function AppreciationLog({ userId, partnerId }: AppreciationLogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for getting appreciations
  const { data: appreciations, isLoading } = useQuery({
    queryKey: ['/api/appreciations'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/appreciations'));
      if (!res.ok) throw new Error('Failed to fetch appreciation log');
      return res.json() as Promise<Appreciation[]>;
    },
  });

  // Form for adding new appreciations
  const form = useForm<AppreciationFormValues>({
    resolver: zodResolver(appreciationSchema),
    defaultValues: {
      content: "",
      partnerId: partnerId,
    },
  });

  // Mutation for adding a new appreciation
  const addAppreciationMutation = useMutation({
    mutationFn: async (data: AppreciationFormValues) => {
      const res = await fetch(apiUrl('/api/appreciations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add appreciation');
      }
      
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      setIsAdding(false);
      toast({
        title: "Appreciation added",
        description: "Your appreciation has been added to the log",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appreciations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add appreciation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    addAppreciationMutation.mutate(data);
  });

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            Appreciation Log
            <Heart className="h-5 w-5 ml-2 text-rose-500" />
          </div>
          
          {!isAdding && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsAdding(true)}
              className="text-xs flex items-center"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              Add New
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Record small things you appreciate about your partner
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isAdding ? (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you appreciate?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Express something you appreciate about your partner..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addAppreciationMutation.isPending}
                >
                  {addAppreciationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : appreciations && appreciations.length > 0 ? (
          <ScrollArea className="max-h-[250px] pr-3">
            <div className="space-y-4">
              {appreciations.map((appreciation) => (
                <div key={appreciation.id} className="border-l-2 border-rose-200 pl-3 py-1">
                  <p className="text-sm">{appreciation.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(appreciation.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No appreciations added yet.</p>
            <p className="text-sm">Add your first appreciation to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}