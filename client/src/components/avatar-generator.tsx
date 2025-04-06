import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

// Schema for the avatar prompt
const avatarFormSchema = z.object({
  prompt: z.string().min(10, "Please provide a detailed description for the AI to generate a good avatar"),
});

type AvatarFormValues = z.infer<typeof avatarFormSchema>;

// Default avatar prompt suggestions
const PROMPT_SUGGESTIONS = [
  "A professional headshot with a friendly smile",
  "A minimalist avatar with abstract design",
  "A colorful cartoon character with my personality traits",
  "A fantasy-style character portrait",
  "A nature-themed avatar with earthy colors",
];

export function AvatarGenerator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const form = useForm<AvatarFormValues>({
    resolver: zodResolver(avatarFormSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const generateAvatarMutation = useMutation({
    mutationFn: async (prompt: string) => {
      setIsGenerating(true);
      const res = await apiRequest('POST', '/api/avatar/generate', { prompt });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setPreviewAvatar(data.avatarUrl);
      setIsGenerating(false);
      toast({
        title: 'Avatar generated!',
        description: 'Your new avatar has been generated.',
      });
      // Invalidate user data to refresh avatar in UI
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: 'Generation failed',
        description: error.message || "Couldn't generate avatar. Please try again with a different description.",
        variant: 'destructive',
      });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await apiRequest('POST', '/api/avatar/update', { avatarUrl });
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      setCurrentAvatar(previewAvatar);
      setPreviewAvatar(null);
      toast({
        title: 'Avatar updated!',
        description: 'Your profile avatar has been updated.',
      });
      // Invalidate user data to refresh avatar in UI
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || "Couldn't update avatar.",
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: AvatarFormValues) => {
    generateAvatarMutation.mutate(values.prompt);
  };

  const applyPromptSuggestion = (suggestion: string) => {
    form.setValue('prompt', suggestion);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your AI Avatar</CardTitle>
        <CardDescription>
          Describe how you'd like your avatar to look, and our AI will generate it for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe how you want your avatar to look..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPromptSuggestion(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Avatar
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="flex flex-col gap-4 items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">
                {previewAvatar ? 'Preview Avatar' : 'Current Avatar'}
              </p>
              <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-2 border-border">
                {(previewAvatar || currentAvatar) ? (
                  <img
                    src={previewAvatar || currentAvatar || ''}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    No Avatar
                  </div>
                )}
              </div>
            </div>

            {previewAvatar && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => updateAvatarMutation.mutate(previewAvatar)}
                  disabled={updateAvatarMutation.isPending}
                >
                  {updateAvatarMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Use This Avatar'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreviewAvatar(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}