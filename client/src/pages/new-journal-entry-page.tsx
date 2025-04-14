import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewJournalEntryPage() {
  const [, navigate] = useLocation();
  const [journalType, setJournalType] = useState<"private" | "shared">("private");
  
  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Create New Journal Entry</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Write Your Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="space-x-2">
                <Button 
                  variant={journalType === "private" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setJournalType("private")}
                >
                  Private
                </Button>
                <Button 
                  variant={journalType === "shared" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setJournalType("shared")}
                >
                  Shared
                </Button>
              </div>
            </div>
            
            <JournalEntryForm 
              defaultTab={journalType}
              onSuccess={() => {
                navigate("/");
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}