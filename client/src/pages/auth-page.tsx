import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema
const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  partnerEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  partnerFirstName: z.string().optional().or(z.literal("")),
  partnerLastName: z.string().optional().or(z.literal("")),
  inviteToken: z.string().optional(),
});

// Invite registration schema
const inviteSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  inviteToken: z.string(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegistrationFormValues = z.infer<typeof registrationSchema>;
type InviteRegistrationValues = z.infer<typeof inviteSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [isInviteRegistration, setIsInviteRegistration] = useState(false);
  const [showConnectExistingOption, setShowConnectExistingOption] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<{
    partnerFirstName?: string;
    partnerLastName?: string;
    partnerEmail?: string;
    error?: string;
    showConnectOption?: boolean;
  } | null>(null);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [showInviteConfirmPassword, setShowInviteConfirmPassword] = useState(false);
  
  const [_, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  
  // Get the invite token from the URL if present
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("token");
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);
  
  // If invite token is present, fetch the invite details
  useEffect(() => {
    if (inviteToken) {
      setIsInviteRegistration(true);
      setActiveTab("register");
      
      // Fetch invite details
      const fetchInvite = async () => {
        try {
          const response = await fetch(`/api/invites/${inviteToken}`);
          
          if (response.ok) {
            const data = await response.json();
            setInviteDetails(data);
          } else {
            // Handle the case where the invite has already been used
            try {
              const errorData = await response.json();
              console.error("Invite error:", errorData);
              
              if (response.status === 400) {
                setInviteDetails({
                  error: errorData.error,
                  showConnectOption: errorData.showConnectOption || false
                });
                
                if (errorData.error && errorData.error.includes("already been used")) {
                  setShowConnectExistingOption(true);
                }
              } else {
                setInviteDetails({
                  error: "Failed to fetch invite details"
                });
              }
            } catch (e) {
              console.error("Error parsing invite error:", e);
              setInviteDetails({
                error: "Failed to fetch invite details"
              });
            }
          }
        } catch (error) {
          console.error("Error fetching invite:", error);
          setInviteDetails({
            error: "Failed to connect to server"
          });
        }
      };
      
      fetchInvite();
    }
  }, [inviteToken]);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Registration form
  const registrationForm = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: inviteDetails?.partnerEmail || "",
      partnerEmail: "",
      partnerFirstName: "",
      partnerLastName: "",
      inviteToken: inviteToken || "",
    },
  });
  
  // Invite registration form
  const inviteForm = useForm<InviteRegistrationValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: inviteDetails?.partnerEmail || "",
      inviteToken: inviteToken || "",
    },
  });
  
  // Update form when invite details are loaded
  useEffect(() => {
    if (inviteDetails && inviteDetails.partnerEmail) {
      inviteForm.setValue("email", inviteDetails.partnerEmail);
    }
  }, [inviteDetails, inviteForm]);
  
  const onLoginSubmit = (data: LoginFormValues) => {
    if (inviteToken) {
      // If there's an invite token and user is logging in,
      // we'll connect their existing account with the partner
      loginMutation.mutate(data, {
        onSuccess: async () => {
          try {
            // Connect with partner using the invitation token
            const response = await fetch('/api/partnerships/connect-by-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ inviteToken }),
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log("Successfully connected with partner:", data);
              // Redirect to home page or show success message
              setLocation("/");
            } else {
              let errorMessage = "Failed to connect with partner";
              try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
              } catch (e) {
                // If the response isn't JSON, just use the generic error message
              }
              console.error('Failed to connect with partner:', errorMessage);
              alert(`Error: ${errorMessage}`);
            }
          } catch (error) {
            console.error('Error connecting with partner:', error);
            alert(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
          }
        }
      });
    } else {
      // Regular login
      loginMutation.mutate(data);
    }
  };
  
  const onRegisterSubmit = (data: RegistrationFormValues) => {
    const { confirmPassword, ...registrationData } = data;
    registerMutation.mutate(registrationData);
  };
  
  const onInviteSubmit = async (data: InviteRegistrationValues) => {
    const { confirmPassword, ...registrationData } = data;
    
    try {
      console.log("Submitting invite registration data:", { ...registrationData, password: "****" });
      
      // Use the register with invite endpoint 
      const response = await fetch('/api/register/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        credentials: 'include'
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("Invitation accepted successfully:", responseData);
        
        // Update the auth context with the new user
        if (responseData.user) {
          loginMutation.mutate({
            username: registrationData.username,
            password: registrationData.password
          });
        }
      } else {
        let errorMessage = "Failed to accept invitation";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If the response isn't JSON, just use the generic error message
        }
        console.error('Failed to accept invitation:', errorMessage);
        
        // Show error toast
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    }
  };

  // Function to connect an existing user account with an invitation token
  const connectExistingAccount = async () => {
    try {
      if (!user) {
        // User needs to log in first
        setIsInviteRegistration(false);
        setActiveTab("login");
        return;
      }
      
      // Connect with partner using the invitation token
      const response = await fetch('/api/partnerships/connect-by-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteToken }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Successfully connected with partner:", data);
        // Redirect to home page or show success message
        setLocation("/");
      } else {
        let errorMessage = "Failed to connect with partner";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If the response isn't JSON, just use the generic error message
        }
        console.error('Failed to connect with partner:', errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error connecting with partner:', error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-xl mx-auto">
        <Card className="w-full shadow-xl rounded-2xl p-8">
          <CardHeader className="text-center mb-6">
            <div className="flex flex-col items-center justify-center gap-2 mb-4">
              {/* Combined logo layout */}
              <img 
                src="/assets/logo-text.png" 
                alt="CoupleClarity" 
                className="h-48 w-auto" 
              />
            </div>
            <CardTitle className="text-3xl font-semibold text-primary mb-1">
              Welcome
            </CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              When it matters most, speak with clarity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInviteRegistration ? (
              // Invite Registration Form
              <div className="space-y-6">
                {inviteDetails?.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-red-700">
                        Invitation Error
                      </h2>
                      <p className="mt-2 text-red-600">
                        {inviteDetails.error}
                      </p>
                    </div>
                    
                    {showConnectExistingOption && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <h3 className="text-lg font-medium">Already have an account?</h3>
                        <p className="mt-1 mb-4 text-gray-600">
                          Log in with your existing account to connect with your partner.
                        </p>
                        
                        <Button 
                          type="button" 
                          onClick={() => {
                            setIsInviteRegistration(false);
                            setActiveTab("login");
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-white"
                        >
                          Log in with existing account
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold">
                        You've been invited to join CoupleClarity!
                      </h2>
                      {inviteDetails && inviteDetails.partnerFirstName && (
                        <p className="mt-2">
                          {inviteDetails.partnerFirstName} {inviteDetails.partnerLastName} has invited you to strengthen your communication.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-4 my-4">
                      <Button 
                        type="button" 
                        className="w-1/2 bg-primary text-white hover:bg-primary/90" 
                        onClick={() => {
                          // Continue with registration
                        }}
                      >
                        I'm new here
                      </Button>
                      <Button 
                        type="button" 
                        className="w-1/2 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200" 
                        onClick={() => {
                          setIsInviteRegistration(false);
                          setActiveTab("login");
                        }}
                        variant="outline"
                      >
                        I already have an account
                      </Button>
                    </div>
                    
                    <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                      <input type="hidden" {...inviteForm.register("inviteToken")} />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...inviteForm.register("firstName")}
                          />
                          {inviteForm.formState.errors.firstName && (
                            <p className="text-sm text-destructive">{inviteForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...inviteForm.register("lastName")}
                          />
                          {inviteForm.formState.errors.lastName && (
                            <p className="text-sm text-destructive">{inviteForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          disabled={inviteDetails?.partnerEmail ? true : false}
                          {...inviteForm.register("email")}
                        />
                        {inviteForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{inviteForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          {...inviteForm.register("username")}
                        />
                        {inviteForm.formState.errors.username && (
                          <p className="text-sm text-destructive">{inviteForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showInvitePassword ? "text" : "password"}
                              {...inviteForm.register("password")}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              onClick={() => setShowInvitePassword(!showInvitePassword)}
                            >
                              {showInvitePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {inviteForm.formState.errors.password && (
                            <p className="text-sm text-destructive">{inviteForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showInviteConfirmPassword ? "text" : "password"}
                              {...inviteForm.register("confirmPassword")}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              onClick={() => setShowInviteConfirmPassword(!showInviteConfirmPassword)}
                            >
                              {showInviteConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {inviteForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-destructive">{inviteForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full couple-btn-primary"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Accept Invitation & Register
                      </Button>
                    </form>
                  </>
                )}
              </div>
            ) : (
              // Regular Login/Register Tabs
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username or Email</Label>
                      <Input id="login-username" {...loginForm.register("username")} />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <Link className="text-sm text-primary hover:underline" href="/forgot-password">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full couple-btn-primary"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {inviteToken ? "Log in & Connect with Partner" : "Log in"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <input type="hidden" {...registrationForm.register("inviteToken")} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...registrationForm.register("firstName")}
                        />
                        {registrationForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive">{registrationForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...registrationForm.register("lastName")}
                        />
                        {registrationForm.formState.errors.lastName && (
                          <p className="text-sm text-destructive">{registrationForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...registrationForm.register("email")}
                      />
                      {registrationForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{registrationForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...registrationForm.register("username")}
                      />
                      {registrationForm.formState.errors.username && (
                        <p className="text-sm text-destructive">{registrationForm.formState.errors.username.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showRegisterPassword ? "text" : "password"}
                            {...registrationForm.register("password")}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          >
                            {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {registrationForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{registrationForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showRegisterConfirmPassword ? "text" : "password"}
                            {...registrationForm.register("confirmPassword")}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                          >
                            {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {registrationForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">{registrationForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-md font-medium mb-2">Partner Information (Optional)</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter your partner's details to invite them to join you.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="partnerFirstName">Partner's First Name</Label>
                          <Input
                            id="partnerFirstName"
                            {...registrationForm.register("partnerFirstName")}
                          />
                          {registrationForm.formState.errors.partnerFirstName && (
                            <p className="text-sm text-destructive">{registrationForm.formState.errors.partnerFirstName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="partnerLastName">Partner's Last Name</Label>
                          <Input
                            id="partnerLastName"
                            {...registrationForm.register("partnerLastName")}
                          />
                          {registrationForm.formState.errors.partnerLastName && (
                            <p className="text-sm text-destructive">{registrationForm.formState.errors.partnerLastName.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="partnerEmail">Partner's Email</Label>
                        <Input
                          id="partnerEmail"
                          type="email"
                          {...registrationForm.register("partnerEmail")}
                        />
                        {registrationForm.formState.errors.partnerEmail && (
                          <p className="text-sm text-destructive">{registrationForm.formState.errors.partnerEmail.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full couple-btn-primary"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center">
              <button 
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                onClick={async () => {
                  if (confirm("WARNING: This will delete ALL user accounts and cannot be undone! Continue?")) {
                    try {
                      const response = await fetch('/api/debug/reset-users', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        alert("All user accounts have been deleted successfully.");
                        window.location.reload();
                      } else {
                        alert("Failed to reset users. Please try again later.");
                      }
                    } catch (error) {
                      console.error("Error resetting users:", error);
                      alert("An error occurred while resetting users.");
                    }
                  }
                }}
              >
                Reset All User Accounts
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}