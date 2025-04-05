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
  const Component = `h${level}` as keyof JSX.IntrinsicElements;

  const styles = {
    h1: "text-3xl font-bold tracking-tight mb-6",
    h2: "text-2xl font-semibold tracking-tight mb-4",
    h3: "text-xl font-semibold tracking-tight mb-3",
    h4: "text-lg font-medium mb-2",
    h5: "text-base font-medium mb-2",
    h6: "text-sm font-medium mb-2",
  }[`h${level}`];

  return (
    <Component className={cn(styles, className)} {...props}>
      {children}
    </Component>
  );
}