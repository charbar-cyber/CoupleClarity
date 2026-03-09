import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart, MessageCircleHeart, Sparkles, Calendar,
  Wrench, Rocket
} from "lucide-react";

const CONVERSATION_TYPES = [
  {
    id: "softened_startup" as const,
    title: "Softened Startup",
    description: "Raise a concern with care — using 'I' statements, not blame",
    icon: MessageCircleHeart,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    id: "dreams_within_conflict" as const,
    title: "Dreams Within Conflict",
    description: "Explore the deeper dreams and values behind a disagreement",
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "appreciation_ritual" as const,
    title: "Appreciation Ritual",
    description: "Share specific, heartfelt appreciation for each other",
    icon: Heart,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/30",
  },
  {
    id: "weekly_checkin" as const,
    title: "Weekly Check-in",
    description: "Touch base on your week, stressors, and connection",
    icon: Calendar,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "repair_conversation" as const,
    title: "Repair Conversation",
    description: "Reconnect after a conflict or misunderstanding",
    icon: Wrench,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "future_planning" as const,
    title: "Future Planning",
    description: "Align on shared dreams, goals, and vision together",
    icon: Rocket,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
];

interface ConversationTypeSelectorProps {
  selected: string | null;
  onSelect: (type: string) => void;
}

export default function ConversationTypeSelector({ selected, onSelect }: ConversationTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CONVERSATION_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;
        return (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-muted-foreground/20"
            }`}
            onClick={() => onSelect(type.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${type.bg}`}>
                  <Icon className={`h-5 w-5 ${type.color}`} />
                </div>
                <CardTitle className="text-base">{type.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{type.description}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { CONVERSATION_TYPES };
