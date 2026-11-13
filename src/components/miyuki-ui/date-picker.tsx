"use client";

import { CalendarDays, CircleAlert } from "lucide-react";
import type { ReactNode, Ref } from "react";
import {
  DatePicker as AriaDatePicker,
  type DatePickerProps as AriaDatePickerProps,
  DateRangePicker as AriaDateRangePicker,
  type DateRangePickerProps as AriaDateRangePickerProps,
  Button,
  composeRenderProps,
  DateInput,
  DateSegment,
  type DateValue,
  Dialog,
  FieldError,
  Group,
  Label,
  Popover,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { Calendar, RangeCalendar } from "@/components/miyuki-ui/date-calendar";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-date-picker-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-date-picker-dir, -1) * var(--miyuki-date-picker-dist, 4px))); }
}
@keyframes miyuki-date-picker-out { to { opacity: 0; } }
`;

const popoverStyles = cn(
  "overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
  "data-[placement=top]:[--miyuki-date-picker-dir:1] motion-reduce:[--miyuki-date-picker-dist:0px]",
  "data-[entering]:animate-[miyuki-date-picker-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
  "data-[exiting]:animate-[miyuki-date-picker-out_120ms_ease-out_forwards]",
);

function fieldBox({ hovered, active, invalid }: { hovered: boolean; active: boolean; invalid: boolean }) {
  return cn(
    "flex h-9 w-full min-w-0 items-center rounded-lg border bg-card ps-2 pe-1 text-sm text-foreground shadow-xs outline-none",
    "transition-[border-color,box-shadow] duration-150 ease-settle",
    invalid ? "border-destructive" : active ? "border-brand" : hovered ? "border-border-strong" : "border-input",
    active && "ring-[3px]",
    active && (invalid ? "ring-destructive/25" : "ring-ring"),
  );
}

function Segments({ slot }: { slot?: "start" | "end" }) {
  return (
    <DateInput slot={slot} className="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
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
  );
}

function CalendarButton() {
  return (
    <Button
      className={cn(
        "ms-auto flex size-7 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none",
        "transition-[background-color,color,scale] duration-150 ease-settle",
        "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:scale-[0.94]",
        "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
        "data-[disabled]:cursor-not-allowed",
      )}
    >
      <CalendarDays aria-hidden="true" className="size-4" />
    </Button>
  );
}

function Help({
  description,
  errorMessage,
  isInvalid,
}: {
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  isInvalid: boolean;
}) {
  return (
    <>
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
  );
}

export interface DatePickerProps<T extends DateValue = DateValue> extends Omit<AriaDatePickerProps<T>, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  ref?: Ref<HTMLDivElement>;
}

export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DatePickerProps<T>) {
  return (
    <AriaDatePicker
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {({ isInvalid, isOpen }) => (
        <>
          <style href="miyuki-date-picker" precedence="miyuki">
            {keyframes}
          </style>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Group
            className={({ isHovered, isFocusWithin }) =>
              fieldBox({ hovered: isHovered, active: isFocusWithin || isOpen, invalid: isInvalid })
            }
          >
            <Segments />
            <CalendarButton />
          </Group>
          <Help description={description} errorMessage={errorMessage} isInvalid={isInvalid} />
          <Popover offset={6} className={popoverStyles}>
            <Dialog className="p-2 outline-none">
              <Calendar />
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDatePicker>
  );
}

export interface DateRangePickerProps<T extends DateValue = DateValue>
  extends Omit<AriaDateRangePickerProps<T>, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  visibleMonths?: 1 | 2;
  ref?: Ref<HTMLDivElement>;
}

export function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  visibleMonths = 1,
  className,
  ...props
}: DateRangePickerProps<T>) {
  return (
    <AriaDateRangePicker
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {({ isInvalid, isOpen }) => (
        <>
          <style href="miyuki-date-picker" precedence="miyuki">
            {keyframes}
          </style>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Group
            className={({ isHovered, isFocusWithin }) =>
              fieldBox({ hovered: isHovered, active: isFocusWithin || isOpen, invalid: isInvalid })
            }
          >
            <Segments slot="start" />
            <span aria-hidden="true" className="px-1 text-muted-foreground">
              –
            </span>
            <Segments slot="end" />
            <CalendarButton />
          </Group>
          <Help description={description} errorMessage={errorMessage} isInvalid={isInvalid} />
          <Popover offset={6} className={popoverStyles}>
            <Dialog className="p-2 outline-none">
              <RangeCalendar visibleMonths={visibleMonths} />
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDateRangePicker>
  );
}
