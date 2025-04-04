import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import ConflictThreadDetail from "@/components/conflict-thread-detail";

export default function ConflictThreadDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const threadId = params.id ? parseInt(params.id) : NaN;
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (isNaN(threadId)) {
    return <Redirect to="/conflict" />;
  }
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <ConflictThreadDetail threadId={threadId} />
    </div>
  );
}