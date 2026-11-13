"use client";

import type { ReactNode, Ref } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps, composeRenderProps } from "react-aria-components";
import { type ButtonSize, type ButtonVariant, buttonStyles } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends Omit<AriaButtonProps, "children" | "aria-label"> {
  "aria-label": string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("animate-spin motion-reduce:animate-[spin_1.6s_linear_infinite]", className)}
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M14.25 8A6.25 6.25 0 0 0 8 1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({
  variant = "secondary",
  size = "md",
  className,
  children,
  render,
  ...props
}: IconButtonProps) {
  return (
    <AriaButton
      {...props}
      render={(domProps, renderProps) => {
        const withBusy = { ...domProps, "aria-busy": renderProps.isPending || undefined };
        return render ? render(withBusy, renderProps) : <button {...withBusy} />;
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          buttonStyles({ variant, size, iconOnly: true }),
          size === "lg" && "[&_svg]:size-[18px]",
          "data-[pending]:cursor-wait",
          cls,
        ),
      )}
    >
      {({ isPending }) => (isPending ? <Spinner /> : children)}
    </AriaButton>
  );
}
