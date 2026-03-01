import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiUrl, wsUrl } from '@/lib/config';

interface DirectMessageButtonProps {
  partnerId: number;
  compact?: boolean;
}

export function DirectMessageButton({ partnerId, compact = false }: DirectMessageButtonProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);
  
  // Get unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/direct-messages/unread/count"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/direct-messages/unread/count"));
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
  
  // Setup WebSocket to listen for new messages
  useEffect(() => {
    const socket = new WebSocket(wsUrl('/ws'));
    
    socket.onopen = () => {
      setWsConnected(true);
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // If new direct message received, invalidate unread count
      if (data.type === "new_direct_message") {
        queryClient.invalidateQueries({
          queryKey: ["/api/direct-messages/unread/count"]
        });
      }
    };
    
    socket.onclose = () => {
      setWsConnected(false);
    };
    
    return () => {
      socket.close();
    };
  }, [queryClient]);
  
  const unreadCount = unreadData?.count || 0;
  
  const handleClick = () => {
    navigate(`/messages/direct/${partnerId}`);
  };
  
  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      className="flex items-center gap-2"
      onClick={handleClick}
    >
      <MessageSquare className={compact ? "h-4 w-4" : "h-5 w-5"} />
      {!compact && "Message"}
      {unreadCount > 0 && (
        <Badge variant="destructive" className="text-xs px-1.5 min-w-5 text-center">
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
}