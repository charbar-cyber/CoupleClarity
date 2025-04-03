import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Message } from "@shared/schema";
import WelcomeCard from "@/components/welcome-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  
  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    if (messages) {
      if (searchQuery.trim() === "") {
        setFilteredMessages(messages);
      } else {
        const lowercaseQuery = searchQuery.toLowerCase();
        setFilteredMessages(
          messages.filter((message: Message) =>
            message.emotion.toLowerCase().includes(lowercaseQuery) ||
            message.rawMessage.toLowerCase().includes(lowercaseQuery) ||
            message.transformedMessage.toLowerCase().includes(lowercaseQuery)
          )
        );
      }
    }
  }, [messages, searchQuery]);

  function getTimeAgo(dateString: Date) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return format(date, "MMM d, yyyy");
  }

  function getEmotionColor(emotion: string) {
    const emotionColors: Record<string, string> = {
      frustrated: "bg-red-100 text-red-700",
      hurt: "bg-purple-100 text-purple-700",
      anxious: "bg-blue-100 text-blue-700",
      disappointed: "bg-amber-100 text-amber-700",
      overwhelmed: "bg-indigo-100 text-indigo-700",
      confused: "bg-cyan-100 text-cyan-700",
      angry: "bg-rose-100 text-rose-700",
      sad: "bg-slate-100 text-slate-700"
    };
    
    return emotionColors[emotion.toLowerCase()] || "bg-gray-100 text-gray-700";
  }

  return (
    <main className="flex-grow py-6 px-4 md:px-0">
      <div className="container mx-auto max-w-4xl">
        <WelcomeCard activeTab="history" onChangeTab={() => {}} />
        
        <div className="bg-white rounded-lg shadow-card p-6">
          <h3 className="font-heading font-medium text-lg text-primary mb-4">Message History</h3>
          
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="Search your messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 px-4 pl-10 border border-neutral-200"
            />
            <span className="absolute left-3 top-3 text-neutral-500">
              <Search size={16} />
            </span>
          </div>
          
          {isLoading ? (
            // Loading state
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border-b border-neutral-200 py-4">
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            ))
          ) : filteredMessages && filteredMessages.length > 0 ? (
            // Messages list
            filteredMessages.map((message: Message) => (
              <div key={message.id} className="border-b border-neutral-200 py-4 hover:bg-neutral-50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-medium text-neutral-900">Transformed Message</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getEmotionColor(message.emotion)}`}>
                      {message.emotion.charAt(0).toUpperCase() + message.emotion.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">{getTimeAgo(message.createdAt)}</span>
                </div>
                <p className="text-neutral-700 text-sm line-clamp-2">
                  {message.transformedMessage}
                </p>
              </div>
            ))
          ) : (
            // Empty state
            <div className="text-center py-8">
              <p className="text-neutral-500">No messages found</p>
            </div>
          )}
          
          {messages && messages.length > 10 && (
            <div className="text-center mt-6">
              <button className="text-primary text-sm hover:underline">
                Load more history
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
