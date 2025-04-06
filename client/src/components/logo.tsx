import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="mr-2 rounded-md bg-primary p-1.5">
        <Heart className="h-6 w-6 text-primary-foreground" />
      </div>
      <span className="text-xl font-bold">CoupleClarity</span>
    </div>
  );
}