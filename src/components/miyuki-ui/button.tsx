"use client";

import { createContext, type ReactNode, type Ref, useContext, useState } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps, composeRenderProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "brand" | "secondary" | "soft" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export const ButtonGroupContext = createContext<{ size?: ButtonSize; isDisabled?: boolean } | null>(null);

export interface ButtonProps extends AriaButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs data-[hovered]:bg-primary/90",
  brand: "bg-brand text-brand-foreground shadow-xs data-[hovered]:bg-brand/90",
  secondary: "border border-border-strong bg-card text-foreground shadow-xs data-[hovered]:bg-accent",
  soft: "bg-secondary text-secondary-foreground data-[hovered]:bg-accent",
  ghost: "text-foreground data-[hovered]:bg-accent",
  destructive: "bg-destructive text-destructive-foreground shadow-xs data-[hovered]:bg-destructive/90",
};

const sizes: Record<ButtonSize, { base: string; square: string }> = {
  sm: { base: "h-8 px-3", square: "size-8" },
  md: { base: "h-9 px-3.5", square: "size-9" },
  lg: { base: "h-11 px-5", square: "size-11" },
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  iconOnly = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
} = {}) {
  return cn(
    "relative inline-flex shrink-0 cursor-default items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium select-none outline-none",
    "transition-[transform,background-color,box-shadow,border-color,color] duration-150 ease-settle",
    "data-[pressed]:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    iconOnly ? sizes[size].square : sizes[size].base,
  );
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

export function Button({
  variant = "primary",
  size: ownSize,
  iconStart,
  iconEnd,
  isPending = false,
  className,
  children,
  render,
  onPressChange,
  ...props
}: ButtonProps) {
  const group = useContext(ButtonGroupContext);
  const size = ownSize ?? group?.size ?? "md";
  const iconOnly = children == null;
  const hasStart = iconStart != null;
  const [pressing, setPressing] = useState(false);

  return (
    <AriaButton
      {...props}
      isDisabled={props.isDisabled ?? group?.isDisabled}
      isPending={isPending}
      onPressChange={(pressed) => {
        setPressing(pressed);
        onPressChange?.(pressed);
      }}
      render={(domProps, renderProps) => {
        const withBusy = { ...domProps, "aria-busy": renderProps.isPending || undefined };
        return render ? render(withBusy, renderProps) : <button {...withBusy} />;
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          buttonStyles({ variant, size, iconOnly }),
          !pressing && "data-[pressed]:scale-100",
          "data-[pending]:cursor-wait",
          cls,
        ),
      )}
    >
      {composeRenderProps(children, (label, { isPending: pending }) => {
        const hideContent = pending && !hasStart;
        return (
          <>
            {pending && hasStart ? <Spinner /> : iconStart}
            {label != null && label !== false ? (
              <span className={cn("truncate", hideContent && "opacity-0")}>{label}</span>
            ) : null}
            {iconEnd != null ? <span className={cn("inline-flex", hideContent && "opacity-0")}>{iconEnd}</span> : null}
            {hideContent ? (
              <span className="absolute inset-0 grid place-items-center">
                <Spinner />
              </span>
            ) : null}
          </>
        );
      })}
    </AriaButton>
  );
}
