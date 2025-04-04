import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare, Plus, AlertTriangle } from "lucide-react";
import { ConflictThread } from "@shared/schema";

export default function ConflictThreadsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  
  const { data: allThreads, isLoading } = useQuery<ConflictThread[]>({
    queryKey: ['/api/conflict-threads'],
    enabled: !!user,
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!allThreads || allThreads.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Conflict Threads</h2>
        <p className="text-muted-foreground mb-6">
          You haven't started any conflict resolution threads yet.
        </p>
        <Button asChild>
          <Link to="/conflict/new">Start a New Thread</Link>
        </Button>
      </div>
    );
  }
  
  const activeThreads = allThreads.filter(thread => thread.status === 'active');
  const resolvedThreads = allThreads.filter(thread => thread.status === 'resolved');
  const abandonedThreads = allThreads.filter(thread => thread.status === 'abandoned');
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Conflict Threads</h2>
        <Button asChild>
          <Link to="/conflict/new">
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="active" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="mb-6 grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="active" className="relative">
            Active
            {activeThreads.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activeThreads.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved
            {resolvedThreads.length > 0 && (
              <Badge variant="secondary" className="ml-2">{resolvedThreads.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="abandoned">
            Abandoned
            {abandonedThreads.length > 0 && (
              <Badge variant="secondary" className="ml-2">{abandonedThreads.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeThreads.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No active conflict threads. Start a new thread to begin resolving a conflict.
              </p>
              <Button asChild className="mt-4">
                <Link to="/conflict/new">Start a New Thread</Link>
              </Button>
            </div>
          ) : (
            activeThreads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="resolved" className="space-y-4">
          {resolvedThreads.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No resolved conflict threads yet.
              </p>
            </div>
          ) : (
            resolvedThreads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="abandoned" className="space-y-4">
          {abandonedThreads.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No abandoned conflict threads.
              </p>
            </div>
          ) : (
            abandonedThreads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ThreadCardProps {
  thread: ConflictThread;
}

function ThreadCard({ thread }: ThreadCardProps) {
  const isActive = thread.status === 'active';
  const isResolved = thread.status === 'resolved';
  
  return (
    <Card className={`transition-shadow ${isActive ? 'hover:shadow-md' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{thread.topic}</CardTitle>
            <CardDescription className="mt-1">
              Started {formatDate(new Date(thread.createdAt))}
            </CardDescription>
          </div>
          <Badge variant={
            isActive ? "outline" : 
            isResolved ? "secondary" : 
            "destructive"
          }>
            {thread.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {isActive && (
          <div className="flex items-center text-amber-500 mb-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">This conflict needs attention</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant={isActive ? "default" : "secondary"} className="w-full">
          <Link to={`/conflict/${thread.id}`}>
            {isActive ? "Continue Discussion" : "View Thread"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}