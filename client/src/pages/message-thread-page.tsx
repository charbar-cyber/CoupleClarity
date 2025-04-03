import { useLocation, useRoute, useRouter } from "wouter";
import MessageThreadView from "@/components/message-thread-view";
import { useAuth } from "@/hooks/use-auth";

export default function MessageThreadPage() {
  const [, params] = useRoute("/messages/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Parse message ID from the URL
  const messageId = params?.id ? parseInt(params.id) : undefined;
  
  const handleBack = () => {
    navigate("/");
  };
  
  if (!messageId) {
    // If no message ID is provided, return to the main page
    handleBack();
    return null;
  }
  
  return (
    <main className="flex-grow py-6 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <MessageThreadView 
          messageId={messageId} 
          onBack={handleBack}
        />
      </div>
    </main>
  );
}