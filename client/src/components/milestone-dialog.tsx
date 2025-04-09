import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCelebrationAnimations } from "@/hooks/use-animations";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarIcon } from "lucide-react";

// Form schema for milestone
const milestoneFormSchema = z.object({
  type: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  date: z.date({
    required_error: "Date is required",
  }),
  imageUrl: z.string().optional().nullable(),
  isPrivate: z.boolean().default(false),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMilestone?: {
    id: number;
    type: string;
    title: string;
    description: string | null;
    date: string;
    imageUrl: string | null;
    isPrivate: boolean;
    partnershipId: number;
  };
}

export function MilestoneDialog({ 
  open, 
  onOpenChange, 
  existingMilestone 
}: MilestoneDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const isEditing = !!existingMilestone;

  // Form with validation
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      type: "other",
      title: "",
      description: "",
      date: new Date(),
      imageUrl: "",
      isPrivate: false,
    },
  });

  // Load existing milestone data if editing
  useEffect(() => {
    if (existingMilestone && open) {
      form.reset({
        type: existingMilestone.type,
        title: existingMilestone.title,
        description: existingMilestone.description,
        date: new Date(existingMilestone.date),
        imageUrl: existingMilestone.imageUrl,
        isPrivate: existingMilestone.isPrivate,
      });
    } else if (!existingMilestone && open) {
      // Reset form when opening for a new milestone
      form.reset({
        type: "other",
        title: "",
        description: "",
        date: new Date(),
        imageUrl: "",
        isPrivate: false,
      });
    }
  }, [existingMilestone, form, open]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    // If closing and not due to form submission
    if (!newOpen && !submitMutation.isPending) {
      onOpenChange(newOpen);
    }
  };

  // Use celebration animations
  const { celebrateMilestone } = useCelebrationAnimations();

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (values: MilestoneFormValues) => {
      if (existingMilestone) {
        // Update existing milestone
        const res = await apiRequest(
          "PUT",
          `/api/partnership/milestones/${existingMilestone.id}`,
          values
        );
        return await res.json();
      } else {
        // Create new milestone
        const res = await apiRequest(
          "POST",
          "/api/partnership/milestones",
          values
        );
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Milestone updated" : "Milestone created",
        description: isEditing
          ? "Your milestone has been updated successfully."
          : "Your milestone has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/partnership/milestones"] });

      // Trigger confetti celebration animation after successful submission
      if (!isEditing) {
        // Only show confetti for new milestones
        celebrateMilestone(`You've added an important moment to your relationship journey!`);
      }

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} milestone. Please try again.`,
        variant: "destructive",
      });
      console.error(`Error ${isEditing ? "updating" : "creating"} milestone:`, error);
    },
  });

  // Form submission handler
  function onSubmit(values: MilestoneFormValues) {
    submitMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Milestone" : "Add New Milestone"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this relationship milestone."
              : "Capture an important moment in your relationship."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a milestone type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="first_date">First Date</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="moving_in">Moving In Together</SelectItem>
                      <SelectItem value="baby">New Baby</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="other">Other Special Moment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Title of your milestone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsDateOpen(false);
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this milestone..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Share the story behind this milestone (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a photo URL to remember this moment (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Private Milestone</FormLabel>
                    <FormDescription>
                      Only visible to you and your partner
                    </FormDescription>
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

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="ml-2"
              >
                {submitMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Milestone" : "Add Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}