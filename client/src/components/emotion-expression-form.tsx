import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emotionSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, ChevronDown, Plus, X } from "lucide-react";

const emotionOptions = [
  // Positive emotions
  { value: "happy", label: "Happy" },
  { value: "loved", label: "Loved" },
  { value: "appreciated", label: "Appreciated" },
  { value: "grateful", label: "Grateful" },
  { value: "excited", label: "Excited" },
  { value: "hopeful", label: "Hopeful" },
  { value: "content", label: "Content" },
  { value: "proud", label: "Proud" },
  
  // Negative/challenging emotions
  { value: "frustrated", label: "Frustrated" },
  { value: "hurt", label: "Hurt" },
  { value: "anxious", label: "Anxious" },
  { value: "disappointed", label: "Disappointed" },
  { value: "overwhelmed", label: "Overwhelmed" },
  { value: "confused", label: "Confused" },
  { value: "angry", label: "Angry" },
  { value: "sad", label: "Sad" },
];

type EmotionExpressionFormProps = {
  onSubmit: (data: z.infer<typeof emotionSchema>) => void;
  isLoading: boolean;
};

export default function EmotionExpressionForm({ onSubmit, isLoading }: EmotionExpressionFormProps) {
  const [showContext, setShowContext] = useState(false);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof emotionSchema>>({
    resolver: zodResolver(emotionSchema),
    defaultValues: {
      emotion: "",
      rawMessage: "",
      context: "",
      saveToHistory: true,
    },
  });
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = form;
  
  const rawMessage = watch("rawMessage");
  const charCount = rawMessage.length;
  
  function handleClear() {
    reset();
    setShowContext(false);
    setSelectedEmotions([]);
  }

  function addEmotion(emotion: string) {
    if (!selectedEmotions.includes(emotion)) {
      setValue("emotion", emotion);
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  }
  
  function removeEmotion(emotion: string) {
    const updatedEmotions = selectedEmotions.filter(e => e !== emotion);
    setSelectedEmotions(updatedEmotions);
    
    // If there are emotions left, set the current emotion to the last one added
    if (updatedEmotions.length > 0) {
      setValue("emotion", updatedEmotions[updatedEmotions.length - 1]);
    } else {
      // If no emotions left, clear the emotion field
      setValue("emotion", "");
    }
  }

  function toggleContext() {
    setShowContext(!showContext);
    if (showContext) {
      setValue("context", "");
    }
  }

  return (
    <div className="mb-6">
      <Card className="bg-white rounded-lg shadow-card p-6 transition-all duration-300 hover:shadow-card-hover">
        <CardContent className="p-0">
          <h3 className="font-heading font-medium text-lg text-primary mb-4">Express Your Emotions</h3>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-5">
              <Label htmlFor="emotionSelect" className="block text-sm font-medium text-neutral-700 mb-1">
                How are you feeling?
              </Label>
              <div className="relative">
                <Select onValueChange={(value) => addEmotion(value)}>
                  <SelectTrigger className="w-full py-2.5 px-4 border border-neutral-200 rounded-lg bg-white">
                    <SelectValue placeholder="Select an emotion..." />
                  </SelectTrigger>
                  <SelectContent>
                    {emotionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2" id="emotionTags">
                {selectedEmotions.map((emotion) => {
                  const emotionObj = emotionOptions.find(e => e.value === emotion);
                  return (
                    <div 
                      key={emotion} 
                      className={`px-3 py-1 rounded-full flex items-center ${
                        // Positive emotions
                        emotion === 'happy' || emotion === 'loved' || emotion === 'appreciated' || emotion === 'grateful'
                          ? 'bg-green-100 text-green-700'
                        // Excited/energetic emotions
                        : emotion === 'excited' || emotion === 'hopeful' || emotion === 'proud'
                          ? 'bg-amber-100 text-amber-700'
                        // Content emotions
                        : emotion === 'content'
                          ? 'bg-teal-100 text-teal-700'
                        // Negative emotions
                        : emotion === 'frustrated' || emotion === 'angry' 
                          ? 'bg-red-100 text-red-700' 
                        // Anxiety emotions
                        : emotion === 'anxious' || emotion === 'overwhelmed'
                          ? 'bg-blue-100 text-blue-700'
                        // Sad emotions
                        : emotion === 'sad' || emotion === 'hurt' || emotion === 'disappointed'
                          ? 'bg-purple-100 text-purple-700'
                        // Default
                        : 'bg-primary/10 text-primary'
                      } text-sm`}
                    >
                      <span>{emotionObj?.label}</span>
                      <button
                        type="button"
                        className="ml-2 hover:bg-white/30 rounded-full p-0.5 transition-colors"
                        onClick={() => removeEmotion(emotion)}
                        aria-label={`Remove ${emotionObj?.label} emotion`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  type="button"
                  className="px-2 py-1 rounded-full border border-dashed border-neutral-300 text-neutral-500 text-sm hover:bg-neutral-100"
                  onClick={() => {
                    const selectElement = document.querySelector('[id^=radix-]');
                    if (selectElement) {
                      (selectElement as HTMLElement).click();
                    }
                  }}
                >
                  <Plus size={14} className="inline mr-1" /> Add
                </button>
              </div>
              {errors.emotion && (
                <p className="text-red-500 text-xs mt-1">{errors.emotion.message}</p>
              )}
            </div>
            
            <div className="mb-5">
              <Label htmlFor="rawMessage" className="block text-sm font-medium text-neutral-700 mb-1">
                What do you want to express? (Your raw emotions)
              </Label>
              <Textarea 
                id="rawMessage" 
                rows={4} 
                placeholder="Express how you feel, whether it's positive ('I'm really happy that you planned a surprise date for us...') or something more challenging ('I'm frustrated that you're on your phone when we're together...')" 
                className="block w-full py-2.5 px-4 border border-neutral-200 rounded-lg bg-white resize-none"
                {...register("rawMessage")}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-500">Be honest about your emotions</span>
                <span className={`text-xs ${charCount > 500 ? 'text-red-500' : 'text-neutral-500'}`}>
                  {charCount}/500 characters
                </span>
              </div>
              {errors.rawMessage && (
                <p className="text-red-500 text-xs mt-1">{errors.rawMessage.message}</p>
              )}
            </div>
            
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <Label className="block text-sm font-medium text-neutral-700">Context (optional)</Label>
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-primary text-sm p-0 h-auto"
                  onClick={toggleContext}
                >
                  {showContext ? "Remove context" : "Add context"}
                </Button>
              </div>
              {showContext && (
                <div className="mt-2">
                  <Textarea 
                    id="contextDetails" 
                    rows={2} 
                    placeholder="Any relevant background information that helps understand the situation..." 
                    className="block w-full py-2.5 px-4 border border-neutral-200 rounded-lg bg-white resize-none"
                    {...register("context")}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="saveToHistory" 
                  checked={watch("saveToHistory")}
                  onCheckedChange={(checked) => {
                    setValue("saveToHistory", checked as boolean);
                  }}
                />
                <Label 
                  htmlFor="saveToHistory" 
                  className="text-sm text-neutral-700"
                >
                  Save to history
                </Label>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                  onClick={handleClear}
                >
                  Clear
                </Button>
                <Button 
                  type="submit" 
                  className="px-5 py-2 bg-primary text-white hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Transforming..." : "Transform with AI"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
