import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Lock, Globe, CalendarClock } from "lucide-react";

import { useState } from "react";
import { MilestoneDialog } from "./milestone-dialog";

// Map milestone types to friendly names
const milestoneTypeLabels: Record<string, string> = {
  "first_date": "First Date",
  "anniversary": "Anniversary",
  "engagement": "Engagement",
  "wedding": "Wedding",
  "moving_in": "Moving In Together",
  "baby": "New Baby",
  "vacation": "Vacation",
  "other": "Special Moment"
};

// Map milestone types to icons
const MilestoneTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "first_date":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "anniversary":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "engagement":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "wedding":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "moving_in":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "baby":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    case "vacation":
      return <CalendarClock className="h-5 w-5 mr-1" />;
    default:
      return <CalendarClock className="h-5 w-5 mr-1" />;
  }
};

// Props for the milestone item
interface MilestoneItemProps {
  milestone: {
    id: number;
    type: string;
    title: string;
    description: string | null;
    date: string;
    imageUrl: string | null;
    isPrivate: boolean;
    createdAt: string;
    partnershipId: number;
  };
  onOpenEditDialog?: (milestone: any) => void;
}

export function MilestoneItem({ milestone, onOpenEditDialog }: MilestoneItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Delete milestone mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/partnership/milestones/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Milestone deleted",
        description: "The milestone has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/partnership/milestones"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete milestone. Please try again.",
        variant: "destructive"
      });
      console.error("Error deleting milestone:", error);
    }
  });
  
  // Format date to readable string
  const formattedDate = milestone.date ? format(new Date(milestone.date), "PPP") : "Unknown date";
  
  // Get friendly type label
  const typeLabel = milestoneTypeLabels[milestone.type] || milestone.type;
  
  // Handle edit
  const handleEdit = () => {
    if (onOpenEditDialog) {
      onOpenEditDialog(milestone);
    } else {
      setIsDialogOpen(true);
    }
  };
  
  // Handle delete with confirmation
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      deleteMutation.mutate(milestone.id);
    }
  };
  
  return (
    <>
      <Card className="w-full overflow-hidden">
        {milestone.imageUrl && (
          <div className="w-full h-40 overflow-hidden">
            <img 
              src={milestone.imageUrl} 
              alt={milestone.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <MilestoneTypeIcon type={milestone.type} />
                <span>{typeLabel} • {formattedDate}</span>
                {milestone.isPrivate && (
                  <Lock className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
                )}
              </div>
              <CardTitle className="text-xl">{milestone.title}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        {milestone.description && (
          <CardContent className="py-2">
            <p className="text-muted-foreground">{milestone.description}</p>
          </CardContent>
        )}
        <CardFooter className="pt-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            {milestone.isPrivate ? (
              <>
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                <span>Private</span>
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                <span>Shared</span>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {/* Self-contained edit dialog when no external handler is provided */}
      {!onOpenEditDialog && (
        <MilestoneDialog 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          existingMilestone={milestone}
        />
      )}
    </>
  );
}