import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import History from "@/pages/history";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import Header from "./components/header";
import Footer from "./components/footer";

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to auth page if user is not authenticated
  if (!isLoading && !user) {
    setLocation("/auth");
    return null;
  }
  
  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      {user && <Header />}
      <Switch>
        <Route path="/auth">
          <AuthPage />
        </Route>
        <Route path="/onboarding">
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        </Route>
        <Route path="/">
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>
        <Route path="/history">
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
      {user && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
