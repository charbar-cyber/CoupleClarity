import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import History from "@/pages/history";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import MessageThreadPage from "@/pages/message-thread-page";
import Header from "./components/header";
import Footer from "./components/footer";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      {user && <Header />}
      <Switch>
        <Route path="/auth">
          <AuthPage />
        </Route>
        <ProtectedRoute path="/onboarding" component={OnboardingPage} />
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/history" component={History} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/messages/:id" component={MessageThreadPage} />
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
