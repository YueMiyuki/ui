"use client";

import { type CSSProperties, type ReactNode, type Ref, useId } from "react";
import {
  Meter as AriaMeter,
  type MeterProps as AriaMeterProps,
  composeRenderProps,
  Label,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type MeterVariant = "bar" | "segments";

export interface MeterThresholds {
  warning?: number;
  danger?: number;
}

export interface MeterProps extends Omit<AriaMeterProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  showValue?: boolean;
  thresholds?: MeterThresholds;
  variant?: MeterVariant;
  ref?: Ref<HTMLDivElement>;
}

const tones = {
  normal: "bg-brand",
  warning: "bg-warning",
  danger: "bg-destructive",
} as const;

export function Meter({
  label,
  description,
  showValue = true,
  thresholds,
  variant = "bar",
  className,
  ...props
}: MeterProps) {
  const warning = thresholds?.warning ?? 75;
  const danger = thresholds?.danger ?? 90;
  const descriptionId = useId();
  const describedBy = [props["aria-describedby"], description != null ? descriptionId : null].filter(Boolean).join(" ");

  return (
    <AriaMeter
      {...props}
      aria-describedby={describedBy || undefined}
      className={composeRenderProps(className, (cls) => cn("flex w-full flex-col gap-1.5", cls))}
    >
      {({ percentage, valueText }) => {
        const tone = percentage >= danger ? "danger" : percentage >= warning ? "warning" : "normal";
        return (
          <>
            {(label != null || showValue) && (
              <div className="flex items-baseline justify-between gap-4">
                {label != null ? <Label className="text-sm font-medium text-foreground">{label}</Label> : <span />}
                {showValue && <span className="text-sm text-muted-foreground tabular-nums">{valueText}</span>}
              </div>
            )}
            {variant === "segments" ? (
              <div aria-hidden="true" className="grid h-1.5 grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => {
                  const fill = Math.min(Math.max((percentage - i * 10) / 10, 0), 1);
                  return (
                    <span
                      key={i}
                      className="relative overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
                    >
                      <span
                        className={cn(
                          "absolute inset-0 origin-left transition-[scale,background-color] duration-300 ease-settle rtl:origin-right motion-reduce:transition-none",
                          tones[tone],
                        )}
                        style={{ scale: `${fill} 1` }}
                      />
                    </span>
                  );
                })}
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="relative h-1.5 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
              >
                <span
                  className={cn(
                    "absolute inset-0 translate-x-(--miyuki-meter-x) rounded-full rtl:-translate-x-(--miyuki-meter-x)",
                    "transition-[translate,background-color] duration-300 ease-settle motion-reduce:transition-none",
                    tones[tone],
                  )}
                  style={{ "--miyuki-meter-x": `${percentage - 100}%` } as CSSProperties}
                />
              </div>
            )}
            {description != null && (
              <p id={descriptionId} className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </>
        );
      }}
    </AriaMeter>
  );
}
