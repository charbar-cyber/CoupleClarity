import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Calendar, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPreference } from "@/lib/utils";

interface HomebaseProps {
  userId: number;
  partnerId?: number;
  userName: string;
  partnerName?: string;
}

export default function Homebase({ userId, partnerId, userName, partnerName }: HomebaseProps) {
  // Fetch current user's preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to fetch user preferences');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        return null;
      }
    }
  });

  // Fetch partner's preferences if partnerId exists
  const { data: partnerPreferences } = useQuery({
    queryKey: ['/api/users', partnerId, 'preferences'],
    queryFn: async () => {
      if (!partnerId) return null;
      
      try {
        const res = await fetch(`/api/users/${partnerId}/preferences`);
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to fetch partner preferences');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching partner preferences:', error);
        return null;
      }
    },
    enabled: !!partnerId
  });

  // Get initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  // Format love language for display
  const formatLoveLanguage = (loveLanguage?: string) => {
    if (!loveLanguage) return "Not specified";
    return formatPreference(loveLanguage);
  };

  // Mock relationship start date (would come from real data in production)
  const relationshipStartDate = new Date();
  relationshipStartDate.setMonth(relationshipStartDate.getMonth() - 3); // 3 months ago
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  // Mock status (would come from real data in production)
  const userStatus = "Reflecting today";
  const partnerStatus = partnerId ? "Shared a message" : "Not connected";

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-2">
        <CardTitle className="text-2xl">Homebase</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Couple Information */}
          <div className="flex flex-col items-center justify-center md:items-start space-y-2">
            <div className="flex items-center gap-4 w-full">
              <div className="flex space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Together since:</span>
              </div>
              <span className="text-sm font-medium">{formatDate(relationshipStartDate)}</span>
            </div>
          </div>

          {/* User and Partner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Card */}
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{userName}</h3>
              <div className="mt-2 flex items-center">
                <Heart className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm">
                  {userPreferences?.loveLanguage ? formatLoveLanguage(userPreferences.loveLanguage) : "Not set"}
                </span>
              </div>
              <Badge variant="outline" className="mt-2">
                <Activity className="h-3 w-3 mr-1" />
                {userStatus}
              </Badge>
            </div>

            {/* Partner Card */}
            {partnerId && partnerName ? (
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserInitials(partnerName)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{partnerName}</h3>
                <div className="mt-2 flex items-center">
                  <Heart className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm">
                    {partnerPreferences?.loveLanguage ? formatLoveLanguage(partnerPreferences.loveLanguage) : "Not set"}
                  </span>
                </div>
                <Badge variant="outline" className="mt-2">
                  <Activity className="h-3 w-3 mr-1" />
                  {partnerStatus}
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border shadow-sm">
                <Avatar className="h-16 w-16 mb-2 opacity-50">
                  <AvatarFallback className="bg-muted">?</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg text-muted-foreground">Partner</h3>
                <span className="text-sm text-muted-foreground mt-2">Not connected yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Love Languages Comparison */}
        {partnerId && userPreferences && partnerPreferences && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Love Languages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">{userName}'s Love Language</h4>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span>{formatLoveLanguage(userPreferences.loveLanguage)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {getLoveLanguageDescription(userPreferences.loveLanguage, 'you')}
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">{partnerName}'s Love Language</h4>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span>{formatLoveLanguage(partnerPreferences.loveLanguage)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {getLoveLanguageDescription(partnerPreferences.loveLanguage, 'they')}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function for love language descriptions adapted for first/third person
function getLoveLanguageDescription(loveLanguage: string, perspective: 'you' | 'they'): string {
  const descriptions: Record<string, Record<string, string>> = {
    words_of_affirmation: {
      you: "You value verbal acknowledgments of affection, including frequent 'I love you's, verbal compliments, and words of appreciation.",
      they: "They value verbal acknowledgments of affection, including frequent 'I love you's, verbal compliments, and words of appreciation."
    },
    quality_time: {
      you: "You feel most loved when your partner spends meaningful time with you and gives you their full, undivided attention.",
      they: "They feel most loved when you spend meaningful time with them and give them your full, undivided attention."
    },
    acts_of_service: {
      you: "You appreciate when your partner does things to ease your burden or make your life easier. Actions speak louder than words to you.",
      they: "They appreciate when you do things to ease their burden or make their life easier. Actions speak louder than words."
    },
    physical_touch: {
      you: "You feel connected through physical closeness and touch, from holding hands to hugs and intimate moments.",
      they: "They feel connected through physical closeness and touch, from holding hands to hugs and intimate moments."
    },
    gifts: {
      you: "You value thoughtful gifts that show your partner was thinking about you and understands what you like.",
      they: "They value thoughtful gifts that show you were thinking about them and understand what they like."
    },
    not_sure: {
      you: "You're still exploring which love language resonates most with you.",
      they: "They're still exploring which love language resonates most with them."
    }
  };
  
  return descriptions[loveLanguage]?.[perspective] || "No description available.";
}