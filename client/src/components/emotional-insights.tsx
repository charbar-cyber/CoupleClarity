import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import EmotionalExpressionsTracker from "./emotional-expressions-tracker";
import EmotionalPatternsInsights from "./emotional-patterns-insights";

interface EmotionalInsightsProps {
  userId?: number;
}

interface EmotionData {
  emotion: string;
  count: number;
  color: string;
}

const EMOTION_COLORS = {
  angry: "#FF5252",
  frustrated: "#FF7043",
  disappointed: "#FFB74D",
  hurt: "#9575CD",
  sad: "#64B5F6",
  anxious: "#4DB6AC",
  fear: "#7986CB",
  overwhelmed: "#BA68C8",
  guilty: "#A1887F",
  jealous: "#D81B60",
  happy: "#4CAF50",
  excited: "#FFC107",
  grateful: "#8BC34A",
  love: "#E91E63",
  proud: "#3F51B5"
};

const DEFAULT_EMOTIONS = [
  { emotion: "frustrated", count: 0, color: EMOTION_COLORS.frustrated },
  { emotion: "anxious", count: 0, color: EMOTION_COLORS.anxious },
  { emotion: "hurt", count: 0, color: EMOTION_COLORS.hurt },
  { emotion: "sad", count: 0, color: EMOTION_COLORS.sad },
  { emotion: "angry", count: 0, color: EMOTION_COLORS.angry }
];

export default function EmotionalInsights({ userId }: EmotionalInsightsProps) {
  const [activeTab, setActiveTab] = useState("themes");
  const [emotionData, setEmotionData] = useState<EmotionData[]>(DEFAULT_EMOTIONS);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  
  // Fetch emotion analytics data from the server
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/emotions/analytics', userId],
    queryFn: async () => {
      try {
        const res = await fetch('/api/emotions/analytics' + (userId ? `?userId=${userId}` : ''));
        if (!res.ok) throw new Error('Failed to fetch emotion analytics');
        return res.json();
      } catch (error) {
        console.error('Error fetching emotion analytics:', error);
        // Return default data if there's an error
        return { emotionData: [], timelineData: [], totalExpressions: 0 };
      }
    },
    enabled: !!userId // Only run query if userId is defined
  });
  
  useEffect(() => {
    if (analyticsData) {
      // Process analytics data
      const { emotionData: emotions, timelineData: timeline } = analyticsData;
      
      // Add color information to emotion data
      const formattedEmotionData = emotions
        .map((item: { emotion: string; count: number }) => ({
          emotion: item.emotion,
          count: item.count,
          color: EMOTION_COLORS[item.emotion as keyof typeof EMOTION_COLORS] || "#999999"
        }))
        .slice(0, 5); // Top 5 emotions
      
      setEmotionData(formattedEmotionData.length > 0 ? formattedEmotionData : DEFAULT_EMOTIONS);
      setTimelineData(timeline || []);
    }
  }, [analyticsData]);
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Emotional Insights</CardTitle>
          <CardDescription>Loading your emotional patterns...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  const EmotionPieChart = () => (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={emotionData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="emotion"
            label={({ emotion, percent }) => `${emotion}: ${(percent * 100).toFixed(0)}%`}
          >
            {emotionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
  
  const EmotionTimeline = () => {
    // Get the top 3 most frequent emotions for the timeline
    const topEmotions = emotionData.slice(0, 3).map(d => d.emotion);
    
    return (
      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timelineData}>
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {topEmotions.map(emotion => (
              <Bar 
                key={emotion} 
                dataKey={emotion} 
                stackId="a" 
                fill={EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || "#999999"} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  const EmotionInsights = () => {
    // Create insights based on the emotion data
    const totalExpressions = analyticsData?.totalExpressions || 0;
    const topEmotion = emotionData[0]?.emotion || "none";
    const topEmotionPercentage = totalExpressions > 0 && emotionData[0]?.count
      ? ((emotionData[0].count / totalExpressions) * 100).toFixed(0) 
      : 0;
    
    const getEmotionCategory = (emotion: string) => {
      const negativeEmotions = ['angry', 'frustrated', 'disappointed', 'hurt', 'sad', 'anxious', 'fear', 'overwhelmed', 'guilty', 'jealous'];
      const positiveEmotions = ['happy', 'excited', 'grateful', 'love', 'proud'];
      
      if (negativeEmotions.includes(emotion)) return 'challenging';
      if (positiveEmotions.includes(emotion)) return 'positive';
      return 'neutral';
    };
    
    const emotionCategory = getEmotionCategory(topEmotion);
    
    return (
      <div className="space-y-4 mt-4">
        <div className="bg-muted/50 p-4 rounded-md">
          <h3 className="font-medium text-sm mb-2">Key Insights</h3>
          
          {totalExpressions === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emotional expressions logged yet. Start expressing your emotions to see insights.
            </p>
          ) : (
            <>
              <p className="text-sm mb-2">
                <span className="font-medium">Primary emotion:</span> You've expressed feeling <span className="font-medium" style={{ color: EMOTION_COLORS[topEmotion as keyof typeof EMOTION_COLORS] || '#000' }}>{topEmotion}</span> in {topEmotionPercentage}% of your communications.
              </p>
              
              {emotionCategory === 'challenging' && (
                <p className="text-sm mb-2">
                  Your communications often express challenging emotions. Consider discussing these patterns with your partner.
                </p>
              )}
              
              {emotionCategory === 'positive' && (
                <p className="text-sm mb-2">
                  Your communications often express positive emotions. Keep nurturing these positive patterns!
                </p>
              )}
              
              <p className="text-sm">
                Total expressions analyzed: {totalExpressions}
              </p>
            </>
          )}
        </div>
        
        <div className="bg-muted/50 p-4 rounded-md">
          <h3 className="font-medium text-sm mb-2">Communication Tips</h3>
          
          {emotionCategory === 'challenging' && (
            <ul className="text-xs list-disc pl-5 space-y-1">
              <li>Consider scheduling regular check-ins with your partner about these feelings</li>
              <li>Use "I" statements when expressing these emotions</li>
              <li>Reflect on the patterns: are there specific triggers?</li>
              <li>Balance expressing difficult emotions with appreciation</li>
            </ul>
          )}
          
          {emotionCategory === 'positive' && (
            <ul className="text-xs list-disc pl-5 space-y-1">
              <li>Continue to be specific about what you appreciate</li>
              <li>Pair positive expressions with small acts of kindness</li>
              <li>Create rituals to regularly express these feelings</li>
              <li>Don't hesitate to also express more difficult emotions when needed</li>
            </ul>
          )}
          
          {emotionCategory === 'neutral' || totalExpressions === 0 ? (
            <ul className="text-xs list-disc pl-5 space-y-1">
              <li>Express a wide range of emotions for better connection</li>
              <li>Be specific about how situations make you feel</li>
              <li>Share both challenging and positive emotions</li>
              <li>Use the emotion transformation tools regularly</li>
            </ul>
          ) : null}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-8">
      {/* Basic emotional insights card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Emotional Insights</CardTitle>
          <CardDescription>
            Patterns and trends in your emotional expressions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="themes" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="themes" className="mt-4">
              <h3 className="text-sm font-medium mb-2">Most Common Emotions</h3>
              <EmotionPieChart />
            </TabsContent>
            
            <TabsContent value="trends" className="mt-4">
              <h3 className="text-sm font-medium mb-2">Emotional Patterns Over Time</h3>
              <EmotionTimeline />
            </TabsContent>
            
            <TabsContent value="insights" className="mt-4">
              <h3 className="text-sm font-medium mb-2">What This Means For Your Relationship</h3>
              <EmotionInsights />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Advanced emotion tracking */}
      <EmotionalExpressionsTracker />
      
      {/* Advanced emotion pattern analysis */}
      <EmotionalPatternsInsights />
    </div>
  );
}