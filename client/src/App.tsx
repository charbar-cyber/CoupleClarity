import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { AnimationProvider } from "@/hooks/use-animations";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import History from "@/pages/history";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import MessageThreadPage from "@/pages/message-thread-page";
import ConflictThreadsPage from "@/pages/conflict-threads-page";
import NewConflictThreadPage from "@/pages/new-conflict-thread-page";
import ConflictThreadDetailPage from "@/pages/conflict-thread-detail-page";
import ConflictResolutionPage from "@/pages/conflict-resolution-page";
import SettingsPage from "@/pages/settings-page";
import AvatarSettingsPage from "@/pages/avatar-settings-page";
import DirectMessagePage from "@/pages/direct-message-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import CoupleProfilePage from "@/pages/couple-profile-page";
import TherapySessionPage from "@/pages/therapy-session-page";
import StyleGuide from "@/components/style-guide";
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
        <Route path="/forgot-password">
          <ForgotPasswordPage />
        </Route>
        <Route path="/reset-password">
          <ResetPasswordPage />
        </Route>
        <Route path="/style-guide">
          <StyleGuide />
        </Route>
        <ProtectedRoute path="/onboarding" component={OnboardingPage} />
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/history" component={History} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/messages/:id" component={MessageThreadPage} />
        <ProtectedRoute path="/conflict" component={ConflictThreadsPage} />
        <ProtectedRoute path="/conflict/new" component={NewConflictThreadPage} />
        <ProtectedRoute path="/conflict/:id/resolve" component={ConflictResolutionPage} />
        <ProtectedRoute path="/conflict/:id" component={ConflictThreadDetailPage} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
        <ProtectedRoute path="/settings/avatar" component={AvatarSettingsPage} />
        <ProtectedRoute path="/couple-profile" component={CoupleProfilePage} />
        <ProtectedRoute path="/messages/direct/:partnerId" component={DirectMessagePage} />
        <ProtectedRoute path="/therapy-sessions" component={TherapySessionPage} />
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
      <ThemeProvider>
        <AuthProvider>
          <AnimationProvider>
            <Router />
            <Toaster />
          </AnimationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
