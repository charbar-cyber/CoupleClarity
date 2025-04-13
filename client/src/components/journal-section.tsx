import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalEntryForm } from "./journal-entry-form";
import { JournalEntriesList } from "./journal-entries-list";
import { JournalTimeline } from "./journal-timeline";

// Export the ref object to use in other components
export const journalSectionRef = {
  openNewEntryDialog: () => {},
};

export function JournalSection() {
  const [activeTab, setActiveTab] = useState<"write" | "read" | "timeline">("read");
  const [isNewEntryDialogOpen, setIsNewEntryDialogOpen] = useState(false);
  const [defaultJournalTab, setDefaultJournalTab] = useState<"private" | "shared">("private");
  
  // Expose a function to open the dialog
  // This overwrites the empty function in the ref
  journalSectionRef.openNewEntryDialog = () => {
    console.log("Opening journal entry dialog programmatically");
    setIsNewEntryDialogOpen(true);
  };
  
  // Listen for the custom event to open the journal form
  useEffect(() => {
    const handleOpenJournalForm = () => {
      console.log("Journal form open event received");
      setIsNewEntryDialogOpen(true);
    };
    
    document.addEventListener('openJournalForm', handleOpenJournalForm);
    console.log("Journal form event listener attached");
    
    return () => {
      document.removeEventListener('openJournalForm', handleOpenJournalForm);
    };
  }, []);
  
  return (
    <Card id="journal-section" className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Journal</CardTitle>
        <Dialog open={isNewEntryDialogOpen} onOpenChange={setIsNewEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-1 items-center">
              <PlusCircle className="h-4 w-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Journal Entry</DialogTitle>
            </DialogHeader>
            <JournalEntryForm 
              onSuccess={() => setIsNewEntryDialogOpen(false)}
              defaultTab={defaultJournalTab}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <Button 
                variant={defaultJournalTab === "private" ? "default" : "outline"} 
                size="sm"
                onClick={() => setDefaultJournalTab("private")}
              >
                Private
              </Button>
              <Button 
                variant={defaultJournalTab === "shared" ? "default" : "outline"} 
                size="sm"
                onClick={() => setDefaultJournalTab("shared")}
              >
                Shared
              </Button>
            </div>
          </div>
          
          <Tabs 
            defaultValue={activeTab} 
            onValueChange={(value) => setActiveTab(value as "write" | "read" | "timeline")}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="read">Read Journal</TabsTrigger>
              <TabsTrigger value="write">Write Journal</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            
            <TabsContent value="read" className="mt-4">
              <JournalEntriesList limit={5} />
            </TabsContent>
            
            <TabsContent value="write" className="mt-4">
              <JournalEntryForm defaultTab={defaultJournalTab} />
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-4">
              <JournalTimeline />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}