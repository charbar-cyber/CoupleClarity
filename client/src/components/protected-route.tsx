import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

// Support both prop patterns for ProtectedRoute
type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
} | {
  children: React.ReactNode;
};

export function ProtectedRoute(props: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check if component is being used with the path/component pattern
  const isPathComponentPattern = 'path' in props && 'component' in props;

  if (isPathComponentPattern) {
    const { path, component: Component } = props;
    
    return (
      <Route path={path}>
        {() => {
          if (isLoading) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            );
          }

          if (!user) {
            return <Redirect to="/auth" />;
          }

          return <Component />;
        }}
      </Route>
    );
  } else {
    // Handle children pattern
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }
    
    if (!user) {
      setLocation("/auth");
      return null;
    }
    
    return <>{props.children}</>;
  }
}