import { useQuery } from "@tanstack/react-query";
import PartnerDashboard from "@/components/partner-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

interface PartnerSummary {
  id: number;
  displayName: string;
  firstName: string;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: partner, isLoading } = useQuery<PartnerSummary | null>({
    queryKey: ["/api/user/partner"],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Loading your dashboard...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Connect with a partner to unlock the shared dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PartnerDashboard
        userId={user.id}
        partnerId={partner.id}
        partnerName={partner.displayName || partner.firstName}
      />
    </div>
  );
}
