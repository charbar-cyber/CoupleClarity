import * as React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export function Heading({
  level = 2,
  children,
  className,
  ...props
}: HeadingProps) {
  const styles = {
    h1: "text-3xl font-bold tracking-tight mb-6",
    h2: "text-2xl font-semibold tracking-tight mb-4",
    h3: "text-xl font-semibold tracking-tight mb-3",
    h4: "text-lg font-medium mb-2",
    h5: "text-base font-medium mb-2",
    h6: "text-sm font-medium mb-2",
  }[`h${level}`];

  switch (level) {
    case 1:
      return <h1 className={cn(styles, className)} {...props}>{children}</h1>;
    case 2:
      return <h2 className={cn(styles, className)} {...props}>{children}</h2>;
    case 3:
      return <h3 className={cn(styles, className)} {...props}>{children}</h3>;
    case 4:
      return <h4 className={cn(styles, className)} {...props}>{children}</h4>;
    case 5:
      return <h5 className={cn(styles, className)} {...props}>{children}</h5>;
    case 6:
      return <h6 className={cn(styles, className)} {...props}>{children}</h6>;
    default:
      return <h2 className={cn(styles, className)} {...props}>{children}</h2>;
  }
}