"use client";

import type { ReactNode, Ref } from "react";
import {
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
  TooltipTrigger as AriaTooltipTrigger,
  composeRenderProps,
  OverlayArrow,
  type TooltipTriggerComponentProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-tooltip-in {
  from { opacity: 0; transform: translate(var(--miyuki-tooltip-x, 0), var(--miyuki-tooltip-y, 0)) scale(0.96); }
}
@keyframes miyuki-tooltip-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-tooltip-fade-in { from { opacity: 0; } }
@keyframes miyuki-tooltip-fade-out { to { opacity: 0; } }
`;

export interface TooltipTriggerProps extends TooltipTriggerComponentProps {
  delay?: number;
}

export function TooltipTrigger({ delay = 500, ...props }: TooltipTriggerProps) {
  return <AriaTooltipTrigger delay={delay} {...props} />;
}

export interface TooltipProps extends Omit<AriaTooltipProps, "children"> {
  children?: ReactNode;
  shortcut?: ReactNode;
  arrow?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Tooltip({
  children,
  shortcut,
  arrow = false,
  placement = "top",
  offset,
  className,
  ...props
}: TooltipProps) {
  return (
    <>
      <style href="miyuki-tooltip" precedence="miyuki">
        {keyframes}
      </style>
      <AriaTooltip
        {...props}
        placement={placement}
        offset={offset ?? (arrow ? 9 : 6)}
        className={composeRenderProps(className, (cls) =>
          cn(
            "max-w-60 rounded-md bg-primary px-2 py-1 text-xs leading-4 text-primary-foreground shadow-md select-none",
            "origin-(--trigger-anchor-point)",
            "data-[placement=top]:[--miyuki-tooltip-y:4px] data-[placement=bottom]:[--miyuki-tooltip-y:-4px]",
            "data-[placement=left]:[--miyuki-tooltip-x:4px] data-[placement=right]:[--miyuki-tooltip-x:-4px]",
            "data-[entering]:animate-[miyuki-tooltip-in_160ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-tooltip-out_100ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-tooltip-fade-in_100ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-tooltip-fade-out_100ms_ease-in_forwards]",
            cls,
          ),
        )}
      >
        {arrow && (
          <OverlayArrow className="group/arrow data-[placement=top]:-mt-px data-[placement=bottom]:-mb-px data-[placement=left]:-ml-px data-[placement=right]:-mr-px">
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              aria-hidden="true"
              className={cn(
                "block fill-primary",
                "group-data-[placement=bottom]/arrow:rotate-180",
                "group-data-[placement=left]/arrow:-rotate-90",
                "group-data-[placement=right]/arrow:rotate-90",
              )}
            >
              <path d="M0 0 4.8 4.8Q6 6 7.2 4.8L12 0Z" />
            </svg>
          </OverlayArrow>
        )}
        {shortcut != null ? (
          <span className="flex items-center gap-2">
            <span className="min-w-0">{children}</span>
            <kbd className="-me-1 inline-flex h-4 shrink-0 items-center rounded-[4px] bg-primary-foreground/15 px-1 font-mono text-[11px] leading-none text-primary-foreground/85">
              {shortcut}
            </kbd>
          </span>
        ) : (
          children
        )}
      </AriaTooltip>
    </>
  );
}
