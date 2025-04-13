import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { journalSectionRef } from "./journal-section";
import { 
  PenSquare, 
  ListTodo, 
  BookOpen, 
  HeartHandshake, 
  Sparkles, 
  TrendingUp, 
  ArrowRight
} from "lucide-react";

interface QuickAccessCardsProps {
  userId?: number;
  partnerId?: number;
}

export function QuickAccessCards({ userId, partnerId }: QuickAccessCardsProps) {
  const [, setLocation] = useLocation();

  // Get recent journal entries
  const { data: recentJournals } = useQuery({
    queryKey: ['/api/journal/recent'],
    queryFn: async () => {
      const res = await fetch('/api/journal/recent');
      if (!res.ok) throw new Error('Failed to fetch recent journals');
      return res.json();
    }
  });

  // Get partner's recent journal activity
  const { data: partnerActivity } = useQuery({
    queryKey: ['/api/journal/partner-activity'],
    queryFn: async () => {
      if (!partnerId) return null;
      const res = await fetch('/api/journal/partner-activity');
      if (!res.ok) throw new Error('Failed to fetch partner activity');
      return res.json();
    },
    enabled: !!partnerId
  });

  // Get emotion trends (mock for now, would be calculated from actual data)
  const { data: emotionTrends } = useQuery({
    queryKey: ['/api/emotions/trends'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/emotions/trends');
        if (!res.ok) throw new Error('Failed to fetch emotion trends');
        return res.json();
      } catch (error) {
        console.error('Error fetching emotion trends:', error);
        // Return a default placeholder if API isn't implemented yet
        return { 
          dominant: 'contentment',
          trend: 'improving',
          insight: 'Your overall emotional state has been improving this week'
        };
      }
    }
  });

  // Directly open new journal entry dialog
  const handleNewJournalEntry = () => {
    // First navigate to the home page
    setLocation("/");
    
    // Then use the ref to open the dialog with a longer delay to ensure navigation completes
    setTimeout(() => {
      console.log("Opening journal dialog via ref");
      journalSectionRef.openNewEntryDialog();
    }, 300);
  };

  // Navigate to response form for a shared entry
  const handleRespond = (entryId: number) => {
    setLocation(`/journal/${entryId}/respond`);
  };

  // Navigate to send appreciation form
  const handleSendAppreciation = () => {
    setLocation("/appreciation/new");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* New Journal Entry - Primary CTA */}
      <Card 
        className="bg-gradient-to-br from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10 transition-colors cursor-pointer border-primary/20" 
        onClick={(e) => {
          e.stopPropagation(); // Just in case
          handleNewJournalEntry();
        }}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <PenSquare className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">New Journal Entry</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Express yourself or share thoughts with your partner
          </p>
          <Button 
            className="mt-auto" 
            variant="default" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click from interfering
              handleNewJournalEntry();
            }}
          >
            Start Writing
          </Button>
        </CardContent>
      </Card>

      {/* Your Reflections This Week */}
      <Card 
        className="hover:bg-accent/5 transition-colors cursor-pointer border"
        onClick={(e) => {
          e.stopPropagation();
          handleNewJournalEntry();
        }}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-indigo-600" />
            </div>
            <Badge variant="outline">{recentJournals?.count || 0} entries</Badge>
          </div>
          <h3 className="font-semibold text-lg mb-1">Your Reflections</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {recentJournals?.count > 0 
              ? `You've written ${recentJournals.count} reflections this week`
              : "No reflections yet this week. Start your first one!"}
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-between" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click from interfering
              handleNewJournalEntry();
            }}
          >
            Continue Journaling
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Partner Journal Activity */}
      <Card className="hover:bg-accent/5 transition-colors cursor-pointer border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            {partnerId && partnerActivity?.unreadCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {partnerActivity.unreadCount} unread
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">Partner Activity</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {!partnerId ? "Connect with a partner to see their activity" :
              partnerActivity?.latestEntry 
                ? `Your partner shared "${partnerActivity.latestEntry.title}"`
                : "Your partner hasn't shared any entries yet"}
          </p>
          {partnerId && partnerActivity?.latestEntry && (
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click from interfering
                handleRespond(partnerActivity.latestEntry.id);
              }}
            >
              Respond to Entry
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Insights (based on emotion trends) */}
      <Card 
        className="hover:bg-accent/5 transition-colors cursor-pointer border md:col-span-2"
        onClick={(e) => {
          e.stopPropagation();
          handleNewJournalEntry();
        }}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            {emotionTrends?.trend === 'improving' && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <TrendingUp className="h-3 w-3 mr-1" />
                Improving
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">Emotional Insights</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {emotionTrends?.insight || "Continue journaling to receive emotional insights"}
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-between" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click from interfering
              handleNewJournalEntry();
            }}
          >
            Explore Patterns
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Send an Appreciation */}
      <Card 
        className="hover:bg-accent/5 transition-colors cursor-pointer border"
        onClick={(e) => {
          e.stopPropagation();
          if (partnerId) handleSendAppreciation();
        }}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <HeartHandshake className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-1">Send Appreciation</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Let your partner know they're valued with a quick appreciation note
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-between"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click from interfering
              handleSendAppreciation();
            }}
            disabled={!partnerId}
          >
            Express Gratitude
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}