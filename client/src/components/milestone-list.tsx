import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MilestoneItem } from "./milestone-item";
import { MilestoneDialog } from "./milestone-dialog";
import { Loader2, Plus, CalendarRange } from "lucide-react";

// Get milestone type options from schema
const milestoneTypes = [
  { value: "all", label: "All Milestones" },
  { value: "first_date", label: "First Date" },
  { value: "anniversary", label: "Anniversary" },
  { value: "engagement", label: "Engagement" },
  { value: "wedding", label: "Wedding" },
  { value: "moving_in", label: "Moving In" },
  { value: "baby", label: "New Baby" },
  { value: "vacation", label: "Vacation" },
  { value: "other", label: "Other" },
];

export function MilestoneList() {
  const [selectedType, setSelectedType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  
  // Fetch all milestones
  const { data: allMilestones, isLoading, error } = useQuery({
    queryKey: ["/api/partnership/milestones"],
    refetchOnWindowFocus: false,
  });
  
  // Handle opening the dialog for editing a milestone
  const handleOpenEditDialog = (milestone: any) => {
    setEditingMilestone(milestone);
    setIsDialogOpen(true);
  };
  
  // Handle opening the dialog for adding a new milestone
  const handleAddMilestone = () => {
    setEditingMilestone(null);
    setIsDialogOpen(true);
  };
  
  // Handle dialog close
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingMilestone(null);
    }
  };
  
  // Filter milestones by type
  const filteredMilestones = allMilestones
    ? selectedType === "all"
      ? allMilestones
      : allMilestones.filter((milestone: any) => milestone.type === selectedType)
    : [];
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        Error loading milestones. Please try again later.
      </div>
    );
  }
  
  // Render empty state
  if (!allMilestones || allMilestones.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No milestones yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Start capturing important moments in your relationship.
        </p>
        <Button onClick={handleAddMilestone} className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Add First Milestone
        </Button>
        
        {/* Dialog for adding a milestone */}
        <MilestoneDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          existingMilestone={editingMilestone}
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Relationship Milestones</h2>
        <Button onClick={handleAddMilestone}>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>
      
      <Tabs defaultValue="all" onValueChange={setSelectedType}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto">
            {milestoneTypes.map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        {milestoneTypes.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4 mt-4">
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {type.value !== "all" ? type.label.toLowerCase() : ""} milestones found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMilestones.map((milestone: any) => (
                  <MilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    onOpenEditDialog={handleOpenEditDialog}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Dialog for adding/editing a milestone */}
      <MilestoneDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        existingMilestone={editingMilestone}
      />
    </div>
  );
}