import { useState, useRef } from 'react';
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
import { Loader2, RefreshCw, Upload, ImageIcon, Sparkles } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiUrl } from '@/lib/config';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("generate");
  
  // Reference to file input
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadAvatarMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      const res = await fetch(apiUrl('/api/avatar/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Upload failed");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setPreviewAvatar(data.avatarUrl);
      setIsUploading(false);
      toast({
        title: 'Image uploaded!',
        description: 'Your image has been uploaded successfully.',
      });
      // Invalidate user data to refresh avatar in UI
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: 'Upload failed',
        description: error.message || "Couldn't upload image. Please try again with a different image.",
        variant: 'destructive',
      });
    },
  });
  
  const transformAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      setIsTransforming(true);
      const res = await apiRequest('POST', '/api/avatar/transform-uploaded', { avatarUrl });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setPreviewAvatar(data.avatarUrl);
      setIsTransforming(false);
      toast({
        title: 'Image transformed!',
        description: 'Your image has been transformed into an AI avatar.',
      });
      // Invalidate user data to refresh avatar in UI
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      setIsTransforming(false);
      toast({
        title: 'Transformation failed',
        description: error.message || "Couldn't transform your image. Please try again.",
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
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Create FormData and upload
    const formData = new FormData();
    formData.append('avatar', file);
    
    uploadAvatarMutation.mutate(formData);
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleTransformClick = () => {
    if (previewAvatar) {
      transformAvatarMutation.mutate(previewAvatar);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Avatar</CardTitle>
        <CardDescription>
          Choose how you want to create your profile avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Generate</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-4">
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
                          <Sparkles className="mr-2 h-4 w-4" />
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
                        <ImageIcon className="w-12 h-12 text-gray-400" />
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
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleUploadClick}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">Upload Your Image</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to browse or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF (max. 5MB)
                  </p>
                  
                  <Button 
                    variant="secondary" 
                    className="mt-4" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadClick();
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Select File
                      </>
                    )}
                  </Button>
                </div>
                
                {previewAvatar && (
                  <Button
                    className="w-full"
                    onClick={handleTransformClick}
                    disabled={isTransforming}
                  >
                    {isTransforming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Transforming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Transform to AI Avatar
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col gap-4 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">
                    {previewAvatar ? 'Preview Image' : 'Current Avatar'}
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
                        <ImageIcon className="w-12 h-12 text-gray-400" />
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
                        'Use This Image'
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}