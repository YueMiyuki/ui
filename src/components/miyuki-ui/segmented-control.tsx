"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, type Ref, useContext, useId } from "react";
import {
  composeRenderProps,
  ToggleButton,
  ToggleButtonGroup,
  type ToggleButtonGroupProps,
  type ToggleButtonProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type SegmentedControlSize = "sm" | "md";

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const Context = createContext<{ size: SegmentedControlSize; fullWidth: boolean; pill: string }>({
  size: "md",
  fullWidth: false,
  pill: "segment-pill",
});

export interface SegmentedControlProps
  extends Omit<ToggleButtonGroupProps, "selectionMode" | "disallowEmptySelection" | "orientation"> {
  size?: SegmentedControlSize;
  fullWidth?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function SegmentedControl({
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: SegmentedControlProps) {
  const id = useId();
  return (
    <ToggleButtonGroup
      {...props}
      selectionMode="single"
      disallowEmptySelection
      className={composeRenderProps(className, (cls) =>
        cn(
          "rounded-lg bg-muted p-0.5",
          fullWidth ? "flex w-full" : "inline-flex max-w-full",
          "data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {composeRenderProps(children, (content) => (
        <LayoutGroup id={id}>
          <Context value={{ size, fullWidth, pill: `${id}-pill` }}>{content}</Context>
        </LayoutGroup>
      ))}
    </ToggleButtonGroup>
  );
}

export interface SegmentProps extends Omit<ToggleButtonProps, "children"> {
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Segment({ className, children, ...props }: SegmentProps) {
  const { size, fullWidth, pill } = useContext(Context);
  const reduce = useReducedMotion();
  return (
    <ToggleButton
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "relative inline-flex min-w-0 shrink-0 cursor-default items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap outline-none select-none",
          "text-muted-foreground transition-[color,box-shadow] duration-150 ease-settle",
          "data-[hovered]:text-foreground data-[selected]:text-foreground",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          size === "md" ? "h-8 px-3 text-sm" : "h-7 px-2.5 text-[13px]",
          fullWidth && "flex-1 shrink",
          cls,
        ),
      )}
    >
      {({ isSelected }) => (
        <>
          {isSelected && (
            <motion.span
              layoutId={pill}
              aria-hidden="true"
              className="absolute inset-0 bg-card shadow-sm dark:bg-accent"
              style={{ borderRadius: 8 }}
              transition={reduce ? { duration: 0 } : SETTLE}
            />
          )}
          <span className="relative z-10 inline-flex min-w-0 items-center gap-1.5">{children}</span>
        </>
      )}
    </ToggleButton>
  );
}
