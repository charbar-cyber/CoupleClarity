import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ChangeUsernameForm() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Change username mutation
  const changeUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const res = await apiRequest("PATCH", "/api/user/username", { username: newUsername });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Username updated",
        description: "Your username has been changed successfully.",
      });
      // Close dialog and reset form
      setOpen(false);
      setUsername("");
      setError(null);
      // Invalidate the user query to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to change username",
        description: error.message,
      });
    },
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // Clear validation error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!username) {
      setError("Username is required");
      return false;
    }
    
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      changeUsernameMutation.mutate(username);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Change Username</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Username</DialogTitle>
          <DialogDescription>
            Enter your new username. This will be visible to others.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-right">
              New Username
            </Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={handleChange}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={changeUsernameMutation.isPending}
            >
              {changeUsernameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Username"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}