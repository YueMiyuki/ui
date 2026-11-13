"use client";

import { CircleAlert, Clock } from "lucide-react";
import type { ReactNode, Ref } from "react";
import {
  TimeField as AriaTimeField,
  type TimeFieldProps as AriaTimeFieldProps,
  composeRenderProps,
  DateInput,
  DateSegment,
  FieldError,
  Label,
  Text,
  type TimeValue,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type TimeFieldSize = "sm" | "md" | "lg";

const heights: Record<TimeFieldSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<TimeFieldSize, string> = { sm: "ps-7", md: "ps-8", lg: "ps-9" };
const padEnd: Record<TimeFieldSize, string> = { sm: "pe-1.5", md: "pe-2", lg: "pe-2.5" };
const iconStart: Record<TimeFieldSize, string> = { sm: "start-2.5", md: "start-3", lg: "start-3.5" };

export interface TimeFieldProps<T extends TimeValue = TimeValue> extends Omit<AriaTimeFieldProps<T>, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: TimeFieldSize;
  ref?: Ref<HTMLDivElement>;
}

export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  size = "md",
  className,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {({ isInvalid }) => (
        <>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <div className="relative">
            <Clock
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                iconStart[size],
              )}
            />
            <DateInput
              className={({ isHovered, isFocusWithin }) =>
                cn(
                  "flex w-full min-w-0 items-center overflow-hidden rounded-lg border bg-card text-sm whitespace-nowrap text-foreground shadow-xs outline-none",
                  "transition-[border-color,box-shadow] duration-150 ease-settle",
                  isInvalid
                    ? "border-destructive"
                    : isFocusWithin
                      ? "border-brand"
                      : isHovered
                        ? "border-border-strong"
                        : "border-input",
                  isFocusWithin && "ring-[3px]",
                  isFocusWithin && (isInvalid ? "ring-destructive/25" : "ring-ring"),
                  heights[size],
                  padStart[size],
                  padEnd[size],
                )
              }
            >
              {(segment) => (
                <DateSegment
                  segment={segment}
                  className={cn(
                    "rounded-sm px-1 leading-5 text-foreground tabular-nums caret-transparent outline-none",
                    "data-[placeholder]:text-muted-foreground",
                    "data-[type=literal]:px-0 data-[type=literal]:text-muted-foreground",
                    segment.type === "literal" && segment.text.trim() === "" && "-mx-px",
                    "data-[focused]:bg-brand data-[focused]:text-brand-foreground",
                    "data-[invalid]:text-destructive data-[invalid]:data-[focused]:bg-destructive data-[invalid]:data-[focused]:text-destructive-foreground",
                  )}
                />
              )}
            </DateInput>
          </div>
          {description != null && !isInvalid && (
            <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
              {description}
            </Text>
          )}
          <FieldError className="flex items-start gap-1.5 text-[13px] leading-5 text-destructive empty:hidden">
            {(validation) => {
              const message =
                typeof errorMessage === "function"
                  ? errorMessage(validation)
                  : (errorMessage ?? validation.validationErrors.join(" "));
              if (message == null || message === "") return null;
              return (
                <>
                  <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
                  <span>{message}</span>
                </>
              );
            }}
          </FieldError>
        </>
      )}
    </AriaTimeField>
  );
}
