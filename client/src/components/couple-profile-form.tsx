import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarIcon } from "lucide-react";

// Schema for couple profile form
const coupleProfileSchema = z.object({
  relationshipType: z.string().optional().nullable(),
  privacyLevel: z.string(),
  anniversaryDate: z.date().optional().nullable(),
  meetingStory: z.string().optional().nullable(),
  relationshipGoals: z.string().optional().nullable(),
  coupleNickname: z.string().optional().nullable(),
  sharedPicture: z.string().optional().nullable(),
});

type CoupleProfileFormValues = z.infer<typeof coupleProfileSchema>;

export function CoupleProfileForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Fetch current couple profile
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/partnership/profile"],
    refetchOnWindowFocus: false,
  });

  // Initialize form with data from the API
  const form = useForm<CoupleProfileFormValues>({
    resolver: zodResolver(coupleProfileSchema),
    defaultValues: {
      relationshipType: null,
      privacyLevel: "standard",
      anniversaryDate: null,
      meetingStory: null,
      relationshipGoals: null,
      coupleNickname: null,
      sharedPicture: null,
    },
  });

  // Update form with data from API when it loads
  useEffect(() => {
    if (data?.partnership) {
      const partnership = data.partnership;
      form.reset({
        relationshipType: partnership.relationshipType,
        privacyLevel: partnership.privacyLevel || "standard",
        anniversaryDate: partnership.anniversaryDate ? new Date(partnership.anniversaryDate) : null,
        meetingStory: partnership.meetingStory,
        relationshipGoals: partnership.relationshipGoals,
        coupleNickname: partnership.coupleNickname,
        sharedPicture: partnership.sharedPicture,
      });
    }
  }, [data, form]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (values: CoupleProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/partnership/profile", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your couple profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/partnership/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update couple profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating couple profile:", error);
    },
  });

  // Submit handler
  function onSubmit(values: CoupleProfileFormValues) {
    saveProfileMutation.mutate(values);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        Error loading couple profile. Please try again later.
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Couple Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="relationshipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dating">Dating</SelectItem>
                      <SelectItem value="engaged">Engaged</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="domestic_partners">Domestic Partners</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This helps us customize your experience.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anniversaryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Anniversary</FormLabel>
                  <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value ? "text-muted-foreground" : ""
                          }`}
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
                        selected={field.value || undefined}
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
                  <FormDescription>
                    When did your relationship begin?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coupleNickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couple Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="The Smiths, etc." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormDescription>
                    A fun name for your relationship (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingStory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How You Met</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your story..."
                      className="resize-none"
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Tell the story of how you two met (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationshipGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are your goals as a couple?"
                      className="resize-none"
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    What are you working towards together? (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="privacyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Privacy Setting</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select privacy level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Controls who can see your relationship information (only visible to you for now)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saveProfileMutation.isPending}
                className="flex gap-2"
              >
                {saveProfileMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}