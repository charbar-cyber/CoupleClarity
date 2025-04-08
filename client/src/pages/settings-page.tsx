import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { Redirect, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPreference } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sun, Moon, Bell, User, MessageSquare, PaintBucket, UserCog, LogOut, Users, Mail, Send, ImageIcon } from "lucide-react";
import { UserPreferences } from "@shared/schema";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ChangeUsernameForm } from "@/components/change-username-form";

// Theme options
type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const { user, isLoading: authLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Use our theme hook
  const { theme, setTheme } = useTheme();
  
  // Get user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    enabled: !!user,
  });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    dailyReminders: true,
    messageAlerts: true,
  });
  
  // Partner invite form state
  const [partnerInviteForm, setPartnerInviteForm] = useState({
    partnerFirstName: "",
    partnerLastName: "",
    partnerEmail: "",
  });

  // Get partnerships
  const { data: partnerships = [], isLoading: partnershipsLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "partnerships"],
    queryFn: () => fetch(`/api/users/${user?.id}/partnerships`).then(res => res.json()),
    enabled: !!user?.id,
  });
  
  // Initialize form state for user profile
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string; email: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: error.message,
      });
    },
  });
  
  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await apiRequest("PATCH", "/api/user/preferences", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated",
        description: "Your preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update preferences",
        description: error.message,
      });
    },
  });
  
  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };
  
  // Partner invite mutation
  const invitePartnerMutation = useMutation({
    mutationFn: async (data: { partnerFirstName: string; partnerLastName: string; partnerEmail: string }) => {
      const res = await apiRequest("POST", "/api/invites", {
        fromUserId: user?.id,
        partnerFirstName: data.partnerFirstName,
        partnerLastName: data.partnerLastName,
        partnerEmail: data.partnerEmail,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "Your partner has been invited to join CoupleClarity.",
      });
      // Reset form
      setPartnerInviteForm({
        partnerFirstName: "",
        partnerLastName: "",
        partnerEmail: "",
      });
      // Refresh partnerships
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "partnerships"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: error.message,
      });
    },
  });
  
  // Handle partner invite form submission
  const handlePartnerInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invitePartnerMutation.mutate(partnerInviteForm);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <PaintBucket className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="partner" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Partner</span>
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Communication</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how CoupleClarity looks for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Theme</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose how CoupleClarity looks for you. Select light mode, dark mode, or follow your system settings.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={theme === "light" ? "default" : "outline"} 
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-8 w-8" />
                      <span>Light</span>
                    </Button>
                    <Button 
                      variant={theme === "dark" ? "default" : "outline"} 
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-8 w-8" />
                      <span>Dark</span>
                    </Button>
                    <Button 
                      variant={theme === "system" ? "default" : "outline"} 
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("system")}
                    >
                      <div className="flex">
                        <Sun className="h-8 w-8" />
                        <Moon className="h-8 w-8 ml-[-12px]" />
                      </div>
                      <span>System</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback className="text-lg">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 flex items-center gap-1"
                      onClick={() => navigate("/settings/avatar")}
                    >
                      <ImageIcon className="h-3 w-3" />
                      <span>Customize Avatar</span>
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                      id="displayName" 
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Partner Settings */}
        <TabsContent value="partner">
          <Card>
            <CardHeader>
              <CardTitle>Partner Management</CardTitle>
              <CardDescription>
                Invite your partner to join CoupleClarity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {partnershipsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : partnerships.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Your Partner</h3>
                  {partnerships.map((partnership: any) => (
                    <div key={partnership.id} className="border rounded-md p-4">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {partnership.partner?.firstName?.[0]}{partnership.partner?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <h4 className="font-medium">{partnership.partner?.firstName} {partnership.partner?.lastName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Status: {partnership.status === 'active' ? 
                              <span className="text-green-600 font-medium">Active</span> : 
                              <span className="text-amber-600 font-medium">Pending</span>
                            }
                          </p>
                          {partnership.status !== 'active' && (
                            <p className="text-xs text-muted-foreground">
                              Partner has been invited but hasn't accepted yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center p-6 border border-dashed rounded-lg">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No Partner Connected</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Invite your partner to join CoupleClarity to get the most out of the platform.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <form onSubmit={handlePartnerInviteSubmit}>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Invite Your Partner</h3>
                      <p className="text-sm text-muted-foreground">
                        Fill in your partner's details below to send them an invitation to join CoupleClarity.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="partnerFirstName">First Name</Label>
                          <Input
                            id="partnerFirstName"
                            placeholder="Your partner's first name"
                            value={partnerInviteForm.partnerFirstName}
                            onChange={(e) => setPartnerInviteForm(prev => ({ ...prev, partnerFirstName: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="partnerLastName">Last Name</Label>
                          <Input
                            id="partnerLastName"
                            placeholder="Your partner's last name"
                            value={partnerInviteForm.partnerLastName}
                            onChange={(e) => setPartnerInviteForm(prev => ({ ...prev, partnerLastName: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="partnerEmail">Email Address</Label>
                        <Input
                          id="partnerEmail"
                          type="email"
                          placeholder="partner@example.com"
                          value={partnerInviteForm.partnerEmail}
                          onChange={(e) => setPartnerInviteForm(prev => ({ ...prev, partnerEmail: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={invitePartnerMutation.isPending}>
                        {invitePartnerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Invitation...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Communication Settings */}
        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle>Communication Preferences</CardTitle>
              <CardDescription>
                Manage your communication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferencesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : preferences ? (
                <>
                  <div className="grid gap-4">
                    <div>
                      <h3 className="font-medium mb-2">Your Love Language</h3>
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                        <span>{formatPreference(preferences.loveLanguage)}</span>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Your Conflict Style</h3>
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                        <span>{formatPreference(preferences.conflictStyle)}</span>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Your Communication Style</h3>
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                        <span>{formatPreference(preferences.communicationStyle)}</span>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Your Repair Style</h3>
                      <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                        <span>{formatPreference(preferences.repairStyle)}</span>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">You haven't set up your communication preferences yet.</p>
                  <Button onClick={() => navigate('/onboarding')}>Complete Onboarding</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-reminders">Daily Check-in Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders for your daily relationship check-ins
                    </p>
                  </div>
                  <Switch 
                    id="daily-reminders" 
                    checked={notificationSettings.dailyReminders}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, dailyReminders: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="message-alerts">New Message Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts when your partner sends you a message
                    </p>
                  </div>
                  <Switch 
                    id="message-alerts" 
                    checked={notificationSettings.messageAlerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, messageAlerts: checked }))}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Account Information</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your username, password, and other account settings.
                </p>
                <div className="grid gap-4">
                  {/* Import the ChangeUsernameForm component */}
                  <ChangeUsernameForm />
                  <ChangePasswordForm />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
                <div className="space-y-2">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}