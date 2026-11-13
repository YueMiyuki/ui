"use client";

import { CircleAlert, Minus, Plus } from "lucide-react";
import { type MouseEvent, type ReactNode, type Ref, useRef } from "react";
import {
  NumberField as AriaNumberField,
  type NumberFieldProps as AriaNumberFieldProps,
  Button,
  composeRenderProps,
  FieldError,
  Group,
  Input,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type NumberFieldSize = "sm" | "md" | "lg";

const heights: Record<NumberFieldSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<NumberFieldSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const stepWidth: Record<NumberFieldSize, string> = { sm: "w-7", md: "w-8", lg: "w-10" };

function fieldBox({
  isHovered,
  isFocused,
  isInvalid,
  isReadOnly,
}: {
  isHovered: boolean;
  isFocused: boolean;
  isInvalid: boolean;
  isReadOnly: boolean;
}) {
  return cn(
    "rounded-lg border text-sm text-foreground outline-none",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
    isReadOnly ? "bg-muted shadow-none" : "bg-card shadow-xs",
    isInvalid
      ? "border-destructive"
      : isFocused
        ? "border-brand"
        : isHovered && !isReadOnly
          ? "border-border-strong"
          : "border-input",
    isFocused && "ring-[3px]",
    isFocused && (isInvalid ? "ring-destructive/25" : "ring-ring"),
  );
}

export interface NumberFieldProps extends Omit<AriaNumberFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  placeholder?: string;
  size?: NumberFieldSize;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function NumberField({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  className,
  fieldClassName,
  isReadOnly = false,
  ...props
}: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function focusInput(event: MouseEvent) {
    if (event.target === inputRef.current || (event.target as Element).closest("button")) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  const stepper = cn(
    "flex h-full shrink-0 cursor-default items-center justify-center border-s border-input text-muted-foreground outline-none select-none",
    "transition-[background-color,color] duration-300 ease-settle data-[pressed]:duration-0",
    "data-[hovered]:bg-accent data-[hovered]:text-foreground",
    "data-[pressed]:bg-brand-soft data-[pressed]:text-brand-strong",
    "data-[focus-visible]:bg-accent data-[focus-visible]:text-foreground",
    "data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-muted-foreground/45",
    size === "lg" ? "[&_svg]:size-4" : "[&_svg]:size-3.5",
    stepWidth[size],
  );

  return (
    <AriaNumberField
      {...props}
      isReadOnly={isReadOnly}
      className={composeRenderProps(className, (cls) =>
        cn("group/field flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ isInvalid }) => (
        <>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Group
            onMouseDown={focusInput}
            className={(state) =>
              cn(
                fieldBox({
                  isHovered: state.isHovered,
                  isFocused: state.isFocusWithin,
                  isInvalid: state.isInvalid,
                  isReadOnly,
                }),
                "flex w-full items-center overflow-hidden data-[disabled]:cursor-not-allowed",
                heights[size],
                fieldClassName,
              )
            }
          >
            <Input
              ref={inputRef}
              placeholder={placeholder}
              className={cn(
                "h-full w-full min-w-0 flex-1 bg-transparent pe-2 text-sm text-foreground tabular-nums outline-none",
                "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                padStart[size],
              )}
            />
            {!isReadOnly && (
              <>
                <Button slot="decrement" className={stepper}>
                  <Minus aria-hidden="true" strokeWidth={2} />
                </Button>
                <Button slot="increment" className={stepper}>
                  <Plus aria-hidden="true" strokeWidth={2} />
                </Button>
              </>
            )}
          </Group>
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
    </AriaNumberField>
  );
}
