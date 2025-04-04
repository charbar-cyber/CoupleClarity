import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, FileEdit, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DetailedConflictCreationForm from "@/components/detailed-conflict-creation-form";
import ConflictThreadCreateForm from "@/components/conflict-thread-create-form";
import { Partnership, User } from "@shared/schema";

// Extended Partnership type that includes populated partner data
interface ExtendedPartnership extends Partnership {
  partner?: User;
}

export default function NewConflictThreadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("basic");
  
  const { data: partnerships, isLoading: partnershipsLoading } = useQuery<ExtendedPartnership[]>({
    queryKey: ['/api/users', user?.id, 'partnerships'],
    enabled: !!user,
  });
  
  useEffect(() => {
    // If this is the first render, set the active tab
    if (partnerships && partnerships.length === 1) {
      // If we have a partner, we can use the detailed form
    }
  }, [partnerships]);
  
  if (authLoading || partnershipsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (!partnerships || partnerships.length === 0) {
    return (
      <div className="container py-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">No Partnerships Found</h1>
        <p className="text-muted-foreground mb-6">
          You need to have an active partnership with someone to start a conflict thread.
        </p>
        <Button asChild>
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    );
  }
  
  // In our simplified version, we're assuming the user has only one partner
  // Cast to our extended type that includes partner data
  const partnership = partnerships[0] as ExtendedPartnership;
  
  // Determine the partner's ID and name
  const partnerId = user.id === partnership.user1Id ? partnership.user2Id : partnership.user1Id;
  
  // Access partner data - this was populated in the API route
  const partnerData = partnership.partner;
  const partnerName = partnerData?.displayName || "Partner";
  
  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/conflict-threads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Start a Conflict Thread</h1>
      </div>
      
      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="space-x-2">
            <MessageSquarePlus className="h-4 w-4" />
            <span>Basic</span>
          </TabsTrigger>
          <TabsTrigger value="detailed" className="space-x-2">
            <FileEdit className="h-4 w-4" />
            <span>Detailed with AI Assistance</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Create a simple conflict thread with just a topic and description.
          </div>
          
          {/* We're reusing the existing component */}
          <ConflictThreadCreateForm
            userId={user.id}
            partnerId={partnerId}
            partnerName={partnerName}
          />
        </TabsContent>
        
        <TabsContent value="detailed" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Use the structured format and AI assistance to craft an empathetic message.
          </div>
          
          <DetailedConflictCreationForm
            partnerId={partnerId}
            partnerName={partnerName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}