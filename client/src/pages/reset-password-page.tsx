import { ResetPasswordForm } from "@/components/reset-password-form";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";

// Simple inline logo component
const Logo = ({ className = "" }) => (
  <Link href="/" className={`flex items-center ${className}`}>
    <div className="mr-2 rounded-md bg-primary p-1.5">
      <Heart className="h-6 w-6 text-primary-foreground" />
    </div>
    <span className="text-xl font-bold">CoupleClarity</span>
  </Link>
);

export default function ResetPasswordPage() {
  const { user, isLoading } = useAuth();

  // Redirect to home if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl">
          {/* Left column - form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="flex justify-center mb-8">
                <Logo className="h-12 w-auto" />
              </div>
              <ResetPasswordForm />
            </div>
          </div>

          {/* Right column - info/image */}
          <div className="hidden md:flex flex-col justify-center p-12 bg-muted rounded-2xl">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Create a new password
              </h2>
              <p className="text-muted-foreground">
                Choose a strong password that you don't use on other sites. A mix of letters, numbers, and symbols makes for the most secure password.
              </p>
              <div className="space-y-2">
                <h3 className="font-medium">Security tips:</h3>
                <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                  <li>Use at least 8 characters</li>
                  <li>Mix uppercase and lowercase letters</li>
                  <li>Include numbers and special characters</li>
                  <li>Avoid easily guessed information (birthdays, names, etc.)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}