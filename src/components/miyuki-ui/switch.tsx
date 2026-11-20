"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { composeRenderProps, SwitchButton, SwitchField, type SwitchFieldProps, Text } from "react-aria-components";
import { cn } from "@/lib/utils";

export type SwitchSize = "sm" | "md";

const sizes = {
  md: {
    track: "h-5 w-9",
    width: 36,
    thumb: 16,
    inset: 2,
    stretch: 4,
    gap: "gap-3",
    text: "text-sm leading-5",
    indent: "ps-12",
  },
  sm: {
    track: "h-4 w-7",
    width: 28,
    thumb: 12,
    inset: 2,
    stretch: 3,
    gap: "gap-2.5",
    text: "text-[13px] leading-[18px]",
    indent: "ps-[38px]",
  },
} as const;

const FILL: Transition = { type: "spring", stiffness: 500, damping: 30 };

export interface SwitchProps extends Omit<SwitchFieldProps, "children"> {
  children?: ReactNode;
  description?: ReactNode;
  size?: SwitchSize;
  ref?: Ref<HTMLDivElement>;
}

export function Switch({ children, description, size = "md", className, ...props }: SwitchProps) {
  const reduce = useReducedMotion();
  const s = sizes[size];

  return (
    <SwitchField
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-0.5 data-[disabled]:opacity-50", cls))}
    >
      <SwitchButton
        className={cn(
          "flex w-fit items-start text-foreground outline-none select-none",
          "data-[disabled]:cursor-not-allowed",
          s.gap,
          s.text,
        )}
      >
        {({ isSelected, isPressed, isHovered, isFocusVisible, isReadOnly }) => {
          const stretched = isPressed && !isReadOnly && !reduce;
          const width = s.thumb + (stretched ? s.stretch : 0);
          const x = isSelected ? s.width - s.inset * 2 - width : 0;
          return (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-block shrink-0 rounded-full",
                  "transition-[background-color,box-shadow] duration-200 ease-settle",
                  s.track,
                  size === "sm" && "mt-px",
                  isSelected ? (isHovered ? "bg-brand/90" : "bg-brand") : isHovered ? "bg-border-strong" : "bg-input",
                  isFocusVisible && "ring-[3px] ring-ring",
                )}
              >
                <motion.span
                  className={cn(
                    "absolute rounded-full bg-white shadow-sm",
                    "ink:transition-[background-color] ink:duration-200",
                    isSelected && "ink:bg-brand-foreground",
                  )}
                  style={{ top: s.inset, left: s.inset, height: s.thumb }}
                  initial={false}
                  animate={{ x, width }}
                  transition={reduce ? { duration: 0 } : FILL}
                />
              </span>
              {children != null && <span>{children}</span>}
            </>
          );
        }}
      </SwitchButton>
      {description != null && (
        <Text slot="description" className={cn("text-[13px] leading-5 text-muted-foreground", s.indent)}>
          {description}
        </Text>
      )}
    </SwitchField>
  );
}
