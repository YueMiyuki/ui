"use client";

import type { ReactNode } from "react";
import { Separator, type SeparatorProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerVariant = "single" | "double" | "dashed" | "filled";
export type DividerLabelPosition = "start" | "center" | "end";

export interface DividerProps extends Omit<SeparatorProps, "orientation" | "elementType" | "render" | "children"> {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  label?: ReactNode;
  labelPosition?: DividerLabelPosition;
}

const lines: Record<DividerVariant, Record<DividerOrientation, string>> = {
  single: { horizontal: "h-0 border-t border-border", vertical: "w-0 border-l border-border" },
  double: { horizontal: "h-[5px] border-y border-border", vertical: "w-[5px] border-x border-border" },
  dashed: {
    horizontal: "h-0 border-t border-dashed border-border-strong",
    vertical: "w-0 border-l border-dashed border-border-strong",
  },
  filled: { horizontal: "h-1.5 border-0 bg-muted", vertical: "w-1.5 border-0 bg-muted" },
};

export function Divider({
  orientation = "horizontal",
  variant = "single",
  label,
  labelPosition = "center",
  className,
  ...props
}: DividerProps) {
  const vertical = orientation === "vertical";
  const line = lines[variant][orientation];

  if (label == null || label === false) {
    return (
      <Separator
        {...props}
        orientation={orientation}
        className={cn("shrink-0", vertical ? "self-stretch" : "w-full", line, className)}
      />
    );
  }

  const segment = <span aria-hidden="true" className={cn("flex-1", line)} />;
  const stub = <span aria-hidden="true" className={cn("shrink-0", vertical ? "h-4" : "w-4", line)} />;

  return (
    <Separator
      {...props}
      orientation={orientation}
      elementType="div"
      className={cn("flex shrink-0 items-center gap-3", vertical ? "flex-col self-stretch" : "w-full", className)}
      render={(domProps) => (
        <div {...domProps}>
          {labelPosition === "start" ? stub : segment}
          <span className="shrink-0 text-[13px] leading-5 text-muted-foreground">{label}</span>
          {labelPosition === "end" ? stub : segment}
        </div>
      )}
    />
  );
}
