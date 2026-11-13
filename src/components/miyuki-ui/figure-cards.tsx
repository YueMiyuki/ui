"use client";

import { Info } from "lucide-react";
import { type ComponentProps, type CSSProperties, type ReactNode, useId } from "react";
import { Button as AriaButton } from "react-aria-components";
import { DeltaChip } from "@/components/miyuki-ui/lib/chart";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type FigureCardVariant = "chip" | "band";

export interface FigureCardProps extends Omit<ComponentProps<"div">, "children"> {
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  invertDelta?: boolean;
  deltaDigits?: number;
  icon?: ReactNode;
  variant?: FigureCardVariant;
  info?: ReactNode;
  comparison?: ReactNode;
}

export function FigureCard({
  label,
  value,
  delta,
  invertDelta = false,
  deltaDigits = 1,
  icon,
  variant = "chip",
  info,
  comparison = "From last month",
  className,
  ...props
}: FigureCardProps) {
  const labelId = useId();
  const band = variant === "band";

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      {...props}
      className={cn(
        "flex h-full min-w-0 flex-col overflow-clip rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex min-h-8 items-center gap-2">
          {icon != null && (
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground [&_svg]:size-4"
            >
              {icon}
            </span>
          )}
          <p id={labelId} className="min-w-0 flex-1 truncate text-sm leading-5 text-muted-foreground">
            {label}
          </p>
          {info != null && (
            <TooltipTrigger delay={300}>
              <AriaButton
                aria-label={typeof label === "string" ? `About ${label}` : "More information"}
                className={cn(
                  "-me-1.5 flex size-6 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none",
                  "transition-[background-color,color] duration-150 ease-settle",
                  "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                )}
              >
                <Info aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </AriaButton>
              <Tooltip placement="top">{info}</Tooltip>
            </TooltipTrigger>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-foreground tabular-nums">{value}</p>
          {!band && delta != null && <DeltaChip value={delta} invert={invertDelta} digits={deltaDigits} />}
        </div>
      </div>
      {band && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border bg-muted px-5 py-2.5">
          <span className="truncate text-[13px] leading-5 text-muted-foreground">{comparison}</span>
          {delta != null && <DeltaChip value={delta} invert={invertDelta} digits={deltaDigits} />}
        </div>
      )}
    </div>
  );
}

export interface FigureCardGroupProps extends ComponentProps<"div"> {
  minCardWidth?: number;
}

export function FigureCardGroup({ minCardWidth = 200, className, style, ...props }: FigureCardGroupProps) {
  return (
    <div
      {...props}
      className={cn(
        "grid w-full grid-cols-[repeat(auto-fit,minmax(min(var(--miyuki-figure-cards-min),100%),1fr))] gap-4",
        className,
      )}
      style={{ "--miyuki-figure-cards-min": `${minCardWidth}px`, ...style } as CSSProperties}
    />
  );
}
