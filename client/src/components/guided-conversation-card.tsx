import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Clock, CheckCircle2, Pause, XCircle } from "lucide-react";
import { CONVERSATION_TYPES } from "./conversation-type-selector";

interface GuidedConversationCardProps {
  conversation: {
    id: number;
    conversationType: string;
    topic: string | null;
    status: string;
    currentTurnUserId: number | null;
    currentTurnNumber: number;
    totalTurns: number;
    lastActivityAt: string;
    initiatorId: number;
    partnerId: number;
  };
  currentUserId: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  active: { label: "Active", variant: "default", icon: Clock },
  awaiting_partner: { label: "Awaiting Partner", variant: "secondary", icon: Clock },
  paused: { label: "Paused", variant: "outline", icon: Pause },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  abandoned: { label: "Abandoned", variant: "destructive", icon: XCircle },
};

export default function GuidedConversationCard({ conversation, currentUserId }: GuidedConversationCardProps) {
  const typeInfo = CONVERSATION_TYPES.find(t => t.id === conversation.conversationType);
  const Icon = typeInfo?.icon || Clock;
  const status = statusConfig[conversation.status] || statusConfig.active;
  const StatusIcon = status.icon;

  const isMyTurn = conversation.currentTurnUserId === currentUserId && conversation.status === "active";
  const progress = Math.min(conversation.currentTurnNumber / conversation.totalTurns, 1);

  const timeAgo = getTimeAgo(conversation.lastActivityAt);

  return (
    <Link href={`/conversations/${conversation.id}`}>
      <Card className={`cursor-pointer transition-all hover:shadow-md ${isMyTurn ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${typeInfo?.bg || "bg-muted"}`}>
                <Icon className={`h-4 w-4 ${typeInfo?.color || "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{typeInfo?.title || conversation.conversationType}</CardTitle>
                {conversation.topic && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conversation.topic}</p>
                )}
              </div>
            </div>
            <Badge variant={status.variant} className="text-xs">
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {isMyTurn && (
                <Badge variant="default" className="text-xs">Your turn</Badge>
              )}
              <span>Turn {conversation.currentTurnNumber}/{conversation.totalTurns}</span>
            </div>
            <span>{timeAgo}</span>
          </div>
          {conversation.status !== "completed" && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
