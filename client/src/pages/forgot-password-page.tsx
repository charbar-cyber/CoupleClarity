import { ForgotPasswordForm } from "@/components/forgot-password-form";
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

export default function ForgotPasswordPage() {
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
              <ForgotPasswordForm />
            </div>
          </div>

          {/* Right column - info/image */}
          <div className="hidden md:flex flex-col justify-center p-12 bg-muted rounded-2xl">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Recover your account
              </h2>
              <p className="text-muted-foreground">
                We'll email you a password reset link that will allow you to choose a new password for your account.
              </p>
              <div className="border-l-4 border-primary pl-4 italic">
                <p className="text-muted-foreground">
                  "CoupleClarity has transformed how my partner and I communicate during difficult moments. The tools for expressing emotions without blame have been invaluable."
                </p>
                <p className="text-sm mt-2 font-medium">— Alex & Jordan, using CoupleClarity for 6 months</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}