import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, DirectMessage } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiUrl, wsUrl } from "@/lib/config";

interface DirectMessageChatProps {
  partner: User;
}

export function DirectMessageChat({ partner }: DirectMessageChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch messages between the current user and partner
  const { data: messages, isLoading } = useQuery<DirectMessage[]>({
    queryKey: ["/api/direct-messages", partner.id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/direct-messages/${partner.id}`));
      if (!res.ok) throw new Error("Failed to fetch direct messages");
      return res.json();
    },
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await fetch(apiUrl("/api/direct-messages"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: partner.id,
          content: messageText,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (newMessage) => {
      // Update cache
      queryClient.setQueryData(
        ["/api/direct-messages", partner.id],
        (oldData: DirectMessage[] = []) => [...oldData, newMessage]
      );
      
      // Send WebSocket notification
      if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "new_direct_message",
            data: {
              ...newMessage,
              senderName: user?.displayName,
              recipientId: partner.id
            }
          })
        );
      }
      
      // Clear input field
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await fetch(apiUrl(`/api/direct-messages/${messageId}/read`), {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark message as read");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: ["/api/direct-messages/unread/count"]
      });
    },
  });
  
  // Setup WebSocket connection
  useEffect(() => {
    const socket = new WebSocket(wsUrl('/ws'));
    wsRef.current = socket;
    
    socket.onopen = () => {
      setWsConnected(true);
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle incoming direct message
      if (data.type === "new_direct_message" && data.data.senderId === partner.id) {
        queryClient.setQueryData(
          ["/api/direct-messages", partner.id],
          (oldData: DirectMessage[] = []) => [...oldData, data.data]
        );
        
        // Mark as read (since we're viewing the conversation)
        markAsReadMutation.mutate(data.data.id);
      }
    };
    
    socket.onclose = () => {
      setWsConnected(false);
    };
    
    return () => {
      socket.close();
    };
  }, [queryClient, partner.id, markAsReadMutation]);
  
  // Mark any unread messages as read when the component mounts
  useEffect(() => {
    if (messages) {
      messages.forEach((message) => {
        if (message.recipientId === user?.id && !message.isRead) {
          markAsReadMutation.mutate(message.id);
        }
      });
    }
  }, [messages, user?.id, markAsReadMutation]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };
  
  if (isLoading) {
    return (
      <Card className="p-4 h-[500px] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <p>Loading messages...</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="flex flex-col h-[500px]">
      <div className="p-4 border-b bg-muted/20 flex items-center space-x-3">
        <Avatar>
          <AvatarFallback>{getInitials(partner.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{partner.displayName}</h3>
          <p className="text-sm text-muted-foreground">
            {wsConnected ? "Online" : "Offline"}
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.senderId === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p>{message.content}</p>
                <div className="text-xs mt-1 flex items-center justify-end space-x-1">
                  <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                  {message.senderId === user?.id && message.isRead && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          className="resize-none min-h-[60px]"
        />
        <Button
          type="submit"
          disabled={!messageText.trim() || sendMessageMutation.isPending}
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </Card>
  );
}