import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import ConflictResolutionForm from "@/components/conflict-resolution-form";

export default function ConflictResolutionPage() {
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
    <div className="container py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-primary-blue">Resolve Conflict</h1>
      <p className="text-muted-foreground mb-8">
        Document how you and your partner resolved this conflict, and what you learned from the experience.
      </p>
      
      <div className="bg-gradient-to-r from-primary-blue/10 to-accent-coral/10 p-4 rounded-lg mb-8">
        <p className="text-primary-blue font-medium">
          Reflecting on conflicts helps strengthen your relationship. Take your time to document what you've learned.
        </p>
      </div>
      
      <ConflictResolutionForm threadId={threadId} />
    </div>
  );
}