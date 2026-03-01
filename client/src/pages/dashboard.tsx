import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PartnerDashboard from "@/components/partner-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/config";

export default function Dashboard() {
  const { toast } = useToast();
  const [activeUserId, setActiveUserId] = useState<number>(1); // Default user 1
  const [activePartnerId, setActivePartnerId] = useState<number>(2); // Default partner 2
  
  // For demonstration purposes, we're simulating two users
  // In a real application, this would come from authentication
  const users = [
    { id: 1, name: "Alex", partnerId: 2, partnerName: "Jordan" },
    { id: 2, name: "Jordan", partnerId: 1, partnerName: "Alex" }
  ];
  
  // Fetch user data - in a real app this would fetch from an API
  const { data: userData } = useQuery({
    queryKey: ['/api/users', activeUserId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/users/${activeUserId}`));
      if (!res.ok) throw new Error('Failed to fetch user data');
      return res.json();
    }
  });
  
  // Fetch partnerships for the user
  const { data: partnerships = [] } = useQuery({
    queryKey: ['/api/users', activeUserId, 'partnerships'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/users/${activeUserId}/partnerships`));
      if (!res.ok) throw new Error('Failed to fetch partnerships');
      return res.json();
    }
  });
  
  // Handle user switching
  const handleUserSwitch = (userId: number) => {
    setActiveUserId(userId);
    // Find the partner ID for this user
    const user = users.find(u => u.id === userId);
    if (user) {
      setActivePartnerId(user.partnerId);
    }
    
    toast({
      title: "User Switched",
      description: `Now viewing as ${userId === 1 ? "Alex" : "Jordan"}`,
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg mb-8 text-white">
        <h1 className="text-4xl font-bold mb-2">CoupleClarity Dashboard</h1>
        <p className="text-lg opacity-90">
          Share your transformed emotional messages with your partner and receive their responses
        </p>
      </div>
      
      {/* User Switcher - Only for demonstration */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium mb-4">Demonstration Mode</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            This is a demonstration with two simulated users. Switch between them to see both perspectives:
          </p>
          <Tabs 
            defaultValue="user1" 
            value={activeUserId === 1 ? "user1" : "user2"} 
            onValueChange={(value) => handleUserSwitch(value === "user1" ? 1 : 2)}
            className="w-full"
          >
            <TabsList className="mb-4 grid grid-cols-2">
              <TabsTrigger value="user1">Alex</TabsTrigger>
              <TabsTrigger value="user2">Jordan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="user1">
              <div className="text-sm">
                <p>
                  <strong>Current User:</strong> Alex
                  <br />
                  <strong>Partner:</strong> Jordan
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="user2">
              <div className="text-sm">
                <p>
                  <strong>Current User:</strong> Jordan
                  <br />
                  <strong>Partner:</strong> Alex
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Partner Dashboard */}
      <PartnerDashboard 
        userId={activeUserId} 
        partnerId={activePartnerId}
        partnerName={users.find(u => u.id === activeUserId)?.partnerName}
      />
    </div>
  );
}