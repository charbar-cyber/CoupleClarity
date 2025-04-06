import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Calendar, Activity, UserPlus, Copy, Mail, Link as LinkIcon, MessageSquare, MoreHorizontal, UserPlus2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPreference } from "@/lib/utils";
import AppreciationLog from "./appreciation-log";

interface HomebaseProps {
  userId: number;
  partnerId?: number;
  userName: string;
  partnerName?: string;
}

export default function Homebase({ userId, partnerId, userName, partnerName }: HomebaseProps) {
  // Fetch current user's preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to fetch user preferences');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        return null;
      }
    }
  });

  // Fetch partner's preferences if partnerId exists
  const { data: partnerPreferences } = useQuery({
    queryKey: ['/api/users', partnerId, 'preferences'],
    queryFn: async () => {
      if (!partnerId) return null;
      
      try {
        const res = await fetch(`/api/users/${partnerId}/preferences`);
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to fetch partner preferences');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching partner preferences:', error);
        return null;
      }
    },
    enabled: !!partnerId
  });

  // Get initials for avatar fallback
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  // Format love language for display
  const formatLoveLanguage = (loveLanguage?: string) => {
    if (!loveLanguage) return "Not specified";
    return formatPreference(loveLanguage);
  };

  // Mock relationship start date (would come from real data in production)
  const relationshipStartDate = new Date();
  relationshipStartDate.setMonth(relationshipStartDate.getMonth() - 3); // 3 months ago
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  // Mock status (would come from real data in production)
  const userStatus = "Reflecting today";
  const partnerStatus = partnerId ? "Shared a message" : "Not connected";

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-2">
        <CardTitle className="text-2xl">Homebase</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-4">
          {/* Couple Information */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <div className="flex space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Together since:</span>
              </div>
              <span className="text-sm font-medium">{formatDate(relationshipStartDate)}</span>
            </div>
          </div>

          {/* User and Partner Cards side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User Card */}
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{userName}</h3>
              <div className="mt-2 flex items-center">
                <Heart className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm">
                  {userPreferences?.loveLanguage ? formatLoveLanguage(userPreferences.loveLanguage) : "Not set"}
                </span>
              </div>
              <Badge variant="outline" className="mt-2">
                <Activity className="h-3 w-3 mr-1" />
                {userStatus}
              </Badge>
            </div>

            {/* Partner Card */}
            {partnerId && partnerName ? (
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm relative">
                <div className="absolute top-3 right-3">
                  <PartnerInviteMenu />
                </div>
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserInitials(partnerName)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{partnerName}</h3>
                <div className="mt-2 flex items-center">
                  <Heart className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm">
                    {partnerPreferences?.loveLanguage ? formatLoveLanguage(partnerPreferences.loveLanguage) : "Not set"}
                  </span>
                </div>
                <Badge variant="outline" className="mt-2">
                  <Activity className="h-3 w-3 mr-1" />
                  {partnerStatus}
                </Badge>
              </div>
            ) : (
              <InvitePartnerCard />
            )}
          </div>
        </div>

        {/* Love Languages Comparison */}
        {partnerId && userPreferences && partnerPreferences && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Love Languages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">{userName}'s Love Language</h4>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span>{formatLoveLanguage(userPreferences.loveLanguage)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {getLoveLanguageDescription(userPreferences.loveLanguage, 'you')}
                  </p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">{partnerName}'s Love Language</h4>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span>{formatLoveLanguage(partnerPreferences.loveLanguage)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {getLoveLanguageDescription(partnerPreferences.loveLanguage, 'they')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Conflict Threads Section */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Conflict Threads</h3>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/conflict">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    View All
                  </a>
                </Button>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-primary mr-2" />
                      <span>Active Conflicts</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/conflict/new">New Thread</a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create and manage conflict resolution threads with your partner in a safe, guided environment.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Appreciation Log */}
            <Separator className="my-6" />
            <div className="mt-6">
              {partnerId && (
                <AppreciationLog userId={userId} partnerId={partnerId} />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Partner invitation card component
function InvitePartnerCard() {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    partnerFirstName: '',
    partnerLastName: '',
    partnerEmail: ''
  });
  const [inviteLink, setInviteLink] = useState('');
  
  // Get and create an invitation link
  const generateInviteLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invites/generate-link", {});
      return res.json();
    },
    onSuccess: (data) => {
      // Construct the full invitation link with the invitation token
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/auth?token=${data.token}`);
      setIsLinkDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to generate invitation link",
        description: error.message || "Please try again later.",
      });
    }
  });

  // Invite partner by email
  const invitePartnerMutation = useMutation({
    mutationFn: async (data: { partnerFirstName: string; partnerLastName: string; partnerEmail: string }) => {
      const res = await apiRequest("POST", "/api/invites", {
        partnerFirstName: data.partnerFirstName,
        partnerLastName: data.partnerLastName,
        partnerEmail: data.partnerEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent successfully!",
        description: "Your partner will receive an email with instructions to join.",
      });
      setIsEmailDialogOpen(false);
      setPartnerForm({
        partnerFirstName: '',
        partnerLastName: '',
        partnerEmail: ''
      });
      // Refresh partnership data
      queryClient.invalidateQueries({ queryKey: ['/api/partnerships'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: error.message || "Please check the email address and try again.",
      });
    }
  });

  // Handle email form submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invitePartnerMutation.mutate(partnerForm);
  };

  // Copy invitation link to clipboard
  const copyLinkToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          toast({
            title: "Link copied to clipboard!",
            description: "Share this link with your partner to invite them to join.",
          });
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Failed to copy link",
            description: "Please try again or manually select and copy the link.",
          });
        });
    }
  };

  // Generate a new invitation link
  const handleGenerateLink = () => {
    generateInviteLinkMutation.mutate();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border shadow-sm relative h-full">
      <div className="absolute top-0 right-0 p-1.5">
        <Badge variant="outline" className="bg-primary/10 text-primary font-medium">
          Connect
        </Badge>
      </div>
      
      <Avatar className="h-16 w-16 mb-2 opacity-80">
        <AvatarFallback className="bg-muted-foreground/20 text-muted-foreground">
          <UserPlus className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>
      
      <h3 className="font-semibold text-lg mb-2">Add Your Partner</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Connect with your partner to unlock all features of CoupleClarity
      </p>
      
      <div className="flex flex-col gap-3 w-full">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                className="w-full" 
                onClick={() => setIsEmailDialogOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite via Email
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send an invitation email to your partner</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGenerateLink}
                disabled={generateInviteLinkMutation.isPending}
              >
                {generateInviteLinkMutation.isPending ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Create Invitation Link
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a link you can share directly with your partner</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Email Invitation Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Your Partner via Email</DialogTitle>
            <DialogDescription>
              We'll send your partner an email with instructions to join CoupleClarity and connect with you.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEmailSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partnerFirstName">First Name</Label>
                <Input 
                  id="partnerFirstName" 
                  value={partnerForm.partnerFirstName}
                  onChange={(e) => setPartnerForm({...partnerForm, partnerFirstName: e.target.value})}
                  placeholder="Partner's first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerLastName">Last Name</Label>
                <Input 
                  id="partnerLastName" 
                  value={partnerForm.partnerLastName}
                  onChange={(e) => setPartnerForm({...partnerForm, partnerLastName: e.target.value})}
                  placeholder="Partner's last name"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="partnerEmail">Email Address</Label>
              <Input 
                id="partnerEmail" 
                type="email"
                value={partnerForm.partnerEmail}
                onChange={(e) => setPartnerForm({...partnerForm, partnerEmail: e.target.value})}
                placeholder="partner@example.com"
                required
              />
            </div>
            
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={invitePartnerMutation.isPending}
              >
                {invitePartnerMutation.isPending ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Link Invitation Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this Invitation Link</DialogTitle>
            <DialogDescription>
              Your partner can use this link to join CoupleClarity and connect with you automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="inviteLink" className="sr-only">Invitation Link</Label>
              <Input
                id="inviteLink"
                value={inviteLink}
                readOnly
                className="font-mono text-xs sm:text-sm"
              />
            </div>
            <Button 
              type="button" 
              size="icon" 
              onClick={copyLinkToClipboard}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => setIsLinkDialogOpen(false)}
              >
                Done
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Partner Invite Menu Component with dropdown for invite options
function PartnerInviteMenu() {
  const { toast } = useToast();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    partnerFirstName: '',
    partnerLastName: '',
    partnerEmail: ''
  });
  const [inviteLink, setInviteLink] = useState('');
  
  // Get and create an invitation link
  const generateInviteLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invites/generate-link", {});
      return res.json();
    },
    onSuccess: (data) => {
      // Construct the full invitation link with the invitation token
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/auth?token=${data.token}`);
      setIsLinkDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to generate invitation link",
        description: error.message || "Please try again later.",
      });
    }
  });

  // Invite partner by email
  const invitePartnerMutation = useMutation({
    mutationFn: async (data: { partnerFirstName: string; partnerLastName: string; partnerEmail: string }) => {
      const res = await apiRequest("POST", "/api/invites", {
        partnerFirstName: data.partnerFirstName,
        partnerLastName: data.partnerLastName,
        partnerEmail: data.partnerEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent successfully!",
        description: "Your partner will receive an email with instructions to join.",
      });
      setIsEmailDialogOpen(false);
      setPartnerForm({
        partnerFirstName: '',
        partnerLastName: '',
        partnerEmail: ''
      });
      // Refresh partnership data
      queryClient.invalidateQueries({ queryKey: ['/api/partnerships'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: error.message || "Please check the email address and try again.",
      });
    }
  });

  // Handle email form submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invitePartnerMutation.mutate(partnerForm);
  };

  // Copy invitation link to clipboard
  const copyLinkToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          toast({
            title: "Link copied to clipboard!",
            description: "Share this link with your partner to invite them to join.",
          });
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Failed to copy link",
            description: "Please try again or manually select and copy the link.",
          });
        });
    }
  };

  // Generate a new invitation link
  const handleGenerateLink = () => {
    generateInviteLinkMutation.mutate();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-primary/10 hover:bg-primary/20 border-primary/20"
          >
            <UserPlus2 className="h-4 w-4 mr-1 text-primary" />
            <span className="text-xs text-primary font-medium">Invite</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEmailDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Invite via Email</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGenerateLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Create Invitation Link</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Invitation Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Someone via Email</DialogTitle>
            <DialogDescription>
              Send an invitation to join CoupleClarity and connect with you.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEmailSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteFirstName">First Name</Label>
                <Input 
                  id="inviteFirstName" 
                  value={partnerForm.partnerFirstName}
                  onChange={(e) => setPartnerForm({...partnerForm, partnerFirstName: e.target.value})}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteLastName">Last Name</Label>
                <Input 
                  id="inviteLastName" 
                  value={partnerForm.partnerLastName}
                  onChange={(e) => setPartnerForm({...partnerForm, partnerLastName: e.target.value})}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input 
                id="inviteEmail" 
                type="email"
                value={partnerForm.partnerEmail}
                onChange={(e) => setPartnerForm({...partnerForm, partnerEmail: e.target.value})}
                placeholder="email@example.com"
                required
              />
            </div>
            
            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={invitePartnerMutation.isPending}
              >
                {invitePartnerMutation.isPending ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Link Invitation Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this Invitation Link</DialogTitle>
            <DialogDescription>
              The recipient can use this link to join CoupleClarity and connect with you automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="inviteLinkField" className="sr-only">Invitation Link</Label>
              <Input
                id="inviteLinkField"
                value={inviteLink}
                readOnly
                className="font-mono text-xs sm:text-sm"
              />
            </div>
            <Button 
              type="button" 
              size="icon" 
              onClick={copyLinkToClipboard}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => setIsLinkDialogOpen(false)}
              >
                Done
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function for love language descriptions adapted for first/third person
function getLoveLanguageDescription(loveLanguage: string, perspective: 'you' | 'they'): string {
  const descriptions: Record<string, Record<string, string>> = {
    words_of_affirmation: {
      you: "You value verbal acknowledgments of affection, including frequent 'I love you's, verbal compliments, and words of appreciation.",
      they: "They value verbal acknowledgments of affection, including frequent 'I love you's, verbal compliments, and words of appreciation."
    },
    quality_time: {
      you: "You feel most loved when your partner spends meaningful time with you and gives you their full, undivided attention.",
      they: "They feel most loved when you spend meaningful time with them and give them your full, undivided attention."
    },
    acts_of_service: {
      you: "You appreciate when your partner does things to ease your burden or make your life easier. Actions speak louder than words to you.",
      they: "They appreciate when you do things to ease their burden or make their life easier. Actions speak louder than words."
    },
    physical_touch: {
      you: "You feel connected through physical closeness and touch, from holding hands to hugs and intimate moments.",
      they: "They feel connected through physical closeness and touch, from holding hands to hugs and intimate moments."
    },
    gifts: {
      you: "You value thoughtful gifts that show your partner was thinking about you and understands what you like.",
      they: "They value thoughtful gifts that show you were thinking about them and understand what they like."
    },
    not_sure: {
      you: "You're still exploring which love language resonates most with you.",
      they: "They're still exploring which love language resonates most with them."
    }
  };
  
  return descriptions[loveLanguage]?.[perspective] || "No description available.";
}