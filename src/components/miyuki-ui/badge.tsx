import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "destructive";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
}

const styles: Record<BadgeVariant, Record<BadgeTone, string>> = {
  soft: {
    neutral: "bg-secondary text-secondary-foreground",
    brand: "bg-brand-soft text-brand-strong",
    success: "bg-success-soft text-success-strong",
    warning: "bg-warning-soft text-warning-strong",
    destructive: "bg-destructive-soft text-destructive-strong",
  },
  solid: {
    neutral: "bg-primary text-primary-foreground",
    brand: "bg-brand text-brand-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  },
  outline: {
    neutral: "border border-border-strong text-foreground",
    brand: "border border-border-strong text-brand-strong",
    success: "border border-border-strong text-success-strong",
    warning: "border border-border-strong text-warning-strong",
    destructive: "border border-border-strong text-destructive-strong",
  },
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const sizes: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5",
  md: "h-6 px-2",
};

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot = false,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap tabular-nums",
        "[&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
        sizes[size],
        styles[variant][tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", variant === "solid" ? "bg-current" : dots[tone])}
        />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
