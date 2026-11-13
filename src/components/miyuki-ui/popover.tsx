"use client";

import type { ReactNode, Ref } from "react";
import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
  composeRenderProps,
  Dialog,
  type DialogRenderProps,
  DialogTrigger,
  type DialogTriggerProps,
  OverlayArrow,
  type OverlayArrowProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-popover-in {
  from { opacity: 0; transform: translate(var(--miyuki-popover-x, 0), var(--miyuki-popover-y, 0)) scale(0.97); }
}
@keyframes miyuki-popover-out { to { opacity: 0; } }
@keyframes miyuki-popover-fade-in { from { opacity: 0; } }
`;

export function PopoverTrigger(props: DialogTriggerProps) {
  return <DialogTrigger {...props} />;
}

export interface PopoverProps extends Omit<AriaPopoverProps, "children"> {
  children?: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  "aria-label"?: string;
  ref?: Ref<HTMLElement>;
}

export function Popover({
  children,
  className,
  placement = "bottom",
  offset = 10,
  "aria-label": ariaLabel,
  ...props
}: PopoverProps) {
  return (
    <>
      <style href="miyuki-popover" precedence="miyuki">
        {keyframes}
      </style>
      <AriaPopover
        {...props}
        placement={placement}
        offset={offset}
        className={composeRenderProps(className, (cls) =>
          cn(
            "w-max max-w-[min(320px,calc(100vw-24px))] rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-none",
            "origin-(--trigger-anchor-point)",
            "data-[placement=top]:[--miyuki-popover-y:4px] data-[placement=bottom]:[--miyuki-popover-y:-4px]",
            "data-[placement=left]:[--miyuki-popover-x:4px] data-[placement=right]:[--miyuki-popover-x:-4px]",
            "data-[entering]:animate-[miyuki-popover-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-popover-out_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-popover-fade-in_120ms_ease-out]",
            cls,
          ),
        )}
      >
        <Dialog aria-label={ariaLabel} className="outline-none">
          {children}
        </Dialog>
      </AriaPopover>
    </>
  );
}

export type PopoverArrowProps = Omit<OverlayArrowProps, "children">;

export function PopoverArrow({ className, ...props }: PopoverArrowProps) {
  return (
    <OverlayArrow
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/arrow",
          "data-[placement=top]:-mt-px data-[placement=bottom]:-mb-px data-[placement=left]:-ml-px data-[placement=right]:-mr-px",
          cls,
        ),
      )}
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        aria-hidden="true"
        className={cn(
          "block",
          "group-data-[placement=bottom]/arrow:rotate-180",
          "group-data-[placement=left]/arrow:-rotate-90",
          "group-data-[placement=right]/arrow:rotate-90",
        )}
      >
        <path d="M0 0 6.6 6.6Q8 8 9.4 6.6L16 0" fill="var(--popover)" stroke="var(--border)" strokeWidth={1} />
      </svg>
    </OverlayArrow>
  );
}
