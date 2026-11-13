"use client";

import { X } from "lucide-react";
import type { Ref } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps, composeRenderProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export type CloseButtonSize = "sm" | "md" | "lg";
export type CloseButtonVariant = "ghost" | "filled";

export interface CloseButtonProps extends Omit<AriaButtonProps, "children"> {
  size?: CloseButtonSize;
  variant?: CloseButtonVariant;
  ref?: Ref<HTMLButtonElement>;
}

const sizes: Record<CloseButtonSize, { box: string; icon: string }> = {
  sm: { box: "size-5", icon: "size-3" },
  md: { box: "size-6", icon: "size-3.5" },
  lg: { box: "size-8", icon: "size-4" },
};

const variants: Record<CloseButtonVariant, string> = {
  ghost: "data-[hovered]:bg-accent",
  filled: "bg-secondary data-[hovered]:bg-accent",
};

export function CloseButton({
  size = "md",
  variant = "ghost",
  className,
  "aria-label": ariaLabel = "Close",
  ...props
}: CloseButtonProps) {
  return (
    <AriaButton
      {...props}
      aria-label={ariaLabel}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/close inline-flex shrink-0 cursor-default items-center justify-center rounded-full text-muted-foreground select-none outline-none",
          "transition-[transform,background-color,color] duration-150 ease-settle",
          "data-[hovered]:text-foreground data-[pressed]:scale-[0.94]",
          "focus-visible:ring-[3px] focus-visible:ring-ring data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          sizes[size].box,
          variants[variant],
          cls,
        ),
      )}
    >
      <X
        aria-hidden="true"
        strokeWidth={2}
        className={cn(
          "pointer-events-none shrink-0 transition-transform duration-200 ease-settle group-data-[hovered]/close:rotate-90 motion-reduce:transition-none motion-reduce:group-data-[hovered]/close:rotate-0",
          sizes[size].icon,
        )}
      />
    </AriaButton>
  );
}
