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
  inviteToken: z.string().optional().or(z.literal("")),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Invite registration schema
const inviteSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  inviteToken: z.string().min(1, "Invite token is required"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegistrationFormValues = z.infer<typeof registrationSchema>;
type InviteRegistrationValues = z.infer<typeof inviteSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [isInviteRegistration, setIsInviteRegistration] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<{
    partnerFirstName?: string;
    partnerLastName?: string;
    partnerEmail?: string;
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
            console.error("Failed to fetch invite details");
          }
        } catch (error) {
          console.error("Error fetching invite:", error);
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
    loginMutation.mutate(data);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4 mb-4">
              <img 
                src="/assets/logo-icon.png" 
                alt="CoupleClarity Logo" 
                className="h-20 w-auto" 
              />
              <img 
                src="/assets/logo-text.png" 
                alt="CoupleClarity" 
                className="h-10 w-auto" 
              />
            </div>
            <CardTitle className="text-3xl font-bold text-primary-blue">
              Welcome
            </CardTitle>
            <CardDescription className="text-lg">
              Transform emotional expressions into empathetic communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInviteRegistration ? (
              // Invite Registration Form
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    You've been invited to join CoupleClarity!
                  </h2>
                  {inviteDetails && (
                    <p className="mt-2">
                      {inviteDetails.partnerFirstName} {inviteDetails.partnerLastName} has invited you to strengthen your communication.
                    </p>
                  )}
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
                    onClick={() => {
                      console.log("Invitation form button clicked");
                      console.log("Form data:", inviteForm.getValues());
                      console.log("Form errors:", inviteForm.formState.errors);
                    }}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Accept Invitation & Register
                  </Button>
                </form>
              </div>
            ) : (
              // Regular Login/Register Tabs
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        {...loginForm.register("username")}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
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
                        <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
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
                      Login
                    </Button>
                    
                    <div className="text-center mt-4">
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
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
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-2">Invite Your Partner (Optional)</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Want to invite your partner to join CoupleClarity? Provide their details below, and we'll send them an invitation.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="partnerFirstName">Partner's First Name</Label>
                          <Input
                            id="partnerFirstName"
                            {...registrationForm.register("partnerFirstName")}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="partnerLastName">Partner's Last Name</Label>
                          <Input
                            id="partnerLastName"
                            {...registrationForm.register("partnerLastName")}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="partnerEmail">Partner's Email</Label>
                        <Input
                          id="partnerEmail"
                          type="email"
                          {...registrationForm.register("partnerEmail")}
                        />
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
                      Register
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
        
        <div className="hidden lg:flex flex-col justify-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-blue to-accent-coral bg-clip-text text-transparent">
              Strengthen Your Connection
            </h1>
            <p className="text-xl">
              CoupleClarity helps you express difficult emotions in a constructive way, 
              transforming potential conflicts into opportunities for deeper connection.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center">
                <div className="mr-3 h-5 w-5 rounded-full bg-primary-blue flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
                <span>Express your emotions without fear</span>
              </li>
              <li className="flex items-center">
                <div className="mr-3 h-5 w-5 rounded-full bg-primary-blue flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
                <span>Transform raw feelings into empathetic messages</span>
              </li>
              <li className="flex items-center">
                <div className="mr-3 h-5 w-5 rounded-full bg-primary-blue flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
                <span>Share your heart in a way your partner can receive</span>
              </li>
              <li className="flex items-center">
                <div className="mr-3 h-5 w-5 rounded-full bg-primary-blue flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
                <span>Build a foundation of understanding and trust</span>
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-gradient-to-r from-primary-blue/10 to-accent-coral/10 rounded-lg">
              <p className="text-primary-blue font-medium">
                "CoupleClarity transformed how we communicate during difficult moments. 
                It's like having a relationship translator."
              </p>
              <p className="text-sm mt-2 text-muted-foreground">— Sarah & Michael, using CoupleClarity for 6 months</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}