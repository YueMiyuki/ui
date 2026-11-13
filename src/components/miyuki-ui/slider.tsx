"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode, Ref } from "react";
import {
  Slider as AriaSlider,
  type SliderProps as AriaSliderProps,
  composeRenderProps,
  Label,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type SliderSize = "sm" | "md";

const sizes = {
  md: { thumb: 18, bar: "h-1.5", thumbClass: "size-[18px]", track: "h-[18px]" },
  sm: { thumb: 16, bar: "h-1", thumbClass: "size-4", track: "h-4" },
} as const;

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

export interface SliderProps<T extends number | number[] = number | number[]>
  extends Omit<AriaSliderProps<T>, "children"> {
  label?: ReactNode;
  showValue?: boolean;
  marks?: number[];
  size?: SliderSize;
  thumbLabels?: [string, string];
  ref?: Ref<HTMLDivElement>;
}

export function Slider<T extends number | number[]>({
  label,
  showValue = true,
  marks,
  size = "md",
  thumbLabels = ["Minimum", "Maximum"],
  minValue = 0,
  maxValue = 100,
  className,
  ...props
}: SliderProps<T>) {
  const reduce = useReducedMotion();
  const s = sizes[size];
  const half = s.thumb / 2;

  return (
    <AriaSlider
      {...props}
      minValue={minValue}
      maxValue={maxValue}
      className={composeRenderProps(className, (cls) =>
        cn("flex w-full flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {(label != null || showValue) && (
        <div className="flex items-baseline justify-between gap-4">
          {label != null ? <Label className="text-sm font-medium text-foreground">{label}</Label> : <span />}
          {showValue && (
            <SliderOutput
              className={({ state }) =>
                cn(
                  "text-sm text-muted-foreground tabular-nums transition-opacity duration-150 ease-settle",
                  state.values.length === 1 && state.isThumbDragging(0) && "opacity-0",
                )
              }
            >
              {({ state }) => state.values.map((_, i) => state.getThumbValueLabel(i)).join(" – ")}
            </SliderOutput>
          )}
        </div>
      )}
      <SliderTrack
        className={cn("relative data-[disabled]:cursor-not-allowed", s.track)}
        style={{ marginInline: half }}
      >
        {({ state }) => {
          const range = state.values.length > 1;
          const start = range ? state.getThumbPercent(0) * 100 : 0;
          const end = state.getThumbPercent(state.values.length - 1) * 100;
          const span = maxValue - minValue || 1;
          return (
            <>
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 rounded-full bg-muted ring-1 ring-border ring-inset",
                  s.bar,
                )}
                style={{ insetInline: -half }}
              />
              <div
                className={cn("absolute top-1/2 -translate-y-1/2 rounded-full bg-brand", s.bar)}
                style={
                  range
                    ? { insetInlineStart: `${start}%`, width: `${end - start}%` }
                    : { insetInlineStart: -half, width: `calc(${end}% + ${half}px)` }
                }
              />
              {marks?.map((mark) => (
                <span
                  key={mark}
                  aria-hidden="true"
                  className="absolute top-full mt-0.5 h-1.5 w-px -translate-x-1/2 rounded-full bg-border-strong"
                  style={{ insetInlineStart: `${((mark - minValue) / span) * 100}%` }}
                />
              ))}
              {state.values.map((_, index) => (
                <SliderThumb
                  key={index}
                  index={index}
                  aria-label={range ? thumbLabels[index] : undefined}
                  className={cn(
                    "top-1/2 cursor-grab outline-none data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed",
                    s.thumbClass,
                  )}
                >
                  {({ isDragging, isFocusVisible }) => (
                    <>
                      <span
                        className={cn(
                          "block size-full rounded-full border border-border-strong bg-white shadow-sm",
                          "transition-[scale,box-shadow] duration-150 ease-settle",
                          (isDragging || isFocusVisible) && "scale-110 ring-[4px] ring-ring",
                        )}
                      />
                      <AnimatePresence>
                        {isDragging && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2">
                            <motion.span
                              className="block rounded-md bg-primary px-1.5 py-0.5 text-xs whitespace-nowrap text-primary-foreground tabular-nums shadow-sm"
                              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1, transition: reduce ? { duration: 0.12 } : SETTLE }}
                              exit={{ opacity: 0, y: reduce ? 0 : 2, transition: { duration: 0.12, ease: "easeOut" } }}
                            >
                              {state.getThumbValueLabel(index)}
                            </motion.span>
                          </span>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </SliderThumb>
              ))}
            </>
          );
        }}
      </SliderTrack>
    </AriaSlider>
  );
}
