import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserX } from "lucide-react";
import { DirectMessageChat } from "@/components/direct-message-chat";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@shared/schema";
import { apiUrl } from "@/lib/config";

export default function DirectMessagePage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute<{ partnerId: string }>("/messages/direct/:partnerId");
  const { user } = useAuth();
  
  const partnerId = params?.partnerId ? parseInt(params.partnerId) : undefined;
  
  // Get partner user information
  const { data: partner, isLoading, error } = useQuery<User>({
    queryKey: ["/api/users", partnerId],
    queryFn: async () => {
      if (!partnerId) throw new Error("Partner ID is required");
      const res = await fetch(apiUrl(`/api/users/${partnerId}`));
      if (!res.ok) throw new Error("Failed to fetch partner information");
      return res.json();
    },
    enabled: !!partnerId,
  });
  
  useEffect(() => {
    // Redirect if the partner ID is the same as the current user
    if (partnerId && user && partnerId === user.id) {
      navigate("/");
    }
  }, [partnerId, user, navigate]);
  
  const handleBack = () => {
    navigate("/");
  };
  
  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Heading level={1} className="m-0">Direct Messages</Heading>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <Heading level={3}>Partner not found</Heading>
          <p className="text-muted-foreground mb-6">
            We couldn't find this user or you don't have permission to message them.
          </p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      ) : partner ? (
        <DirectMessageChat partner={partner} />
      ) : null}
    </Container>
  );
}