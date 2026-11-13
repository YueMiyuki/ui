"use client";

import { CircleAlert } from "lucide-react";
import { type MouseEvent, type ReactNode, type Ref, useRef } from "react";
import {
  Input as AriaInput,
  type InputProps as AriaInputProps,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  composeRenderProps,
  FieldError,
  Group,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type InputSize = "sm" | "md" | "lg";

const heights: Record<InputSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<InputSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const padEnd: Record<InputSize, string> = { sm: "pe-2.5", md: "pe-3", lg: "pe-3.5" };
const actionSize: Record<InputSize, string> = { sm: "me-1 *:size-6", md: "me-1 *:size-7", lg: "me-1.5 *:size-9" };

interface FieldState {
  isHovered: boolean;
  isFocused: boolean;
  isInvalid: boolean;
  isReadOnly: boolean;
}

function fieldBox({ isHovered, isFocused, isInvalid, isReadOnly }: FieldState) {
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

export interface InputProps extends Omit<AriaInputProps, "size"> {
  size?: InputSize;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ size = "md", className, readOnly, ...props }: InputProps) {
  return (
    <AriaInput
      {...props}
      readOnly={readOnly}
      className={composeRenderProps(className, (cls, state) =>
        cn(
          fieldBox({ ...state, isReadOnly: Boolean(readOnly) }),
          "w-full min-w-0 placeholder:text-muted-foreground",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          heights[size],
          padStart[size],
          padEnd[size],
          cls,
        ),
      )}
    />
  );
}

export interface TextFieldProps extends Omit<AriaTextFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: InputSize;
  placeholder?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  action?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function TextField({
  label,
  description,
  errorMessage,
  size = "md",
  placeholder,
  iconStart,
  iconEnd,
  action,
  prefix,
  suffix,
  isReadOnly = false,
  className,
  fieldClassName,
  ...props
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function focusInput(event: MouseEvent) {
    if (event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  const addon = cn(
    "flex h-full shrink-0 items-center bg-muted text-sm text-muted-foreground select-none",
    padStart[size],
    padEnd[size],
  );

  return (
    <AriaTextField
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
            isReadOnly={isReadOnly}
            onMouseDown={focusInput}
            className={(state) =>
              cn(
                fieldBox({
                  isHovered: state.isHovered,
                  isFocused: state.isFocusWithin,
                  isInvalid: state.isInvalid,
                  isReadOnly,
                }),
                "flex w-full items-center overflow-hidden",
                "data-[disabled]:cursor-not-allowed",
                heights[size],
                fieldClassName,
              )
            }
          >
            {prefix != null && <span className={cn(addon, "border-e border-input")}>{prefix}</span>}
            {iconStart != null && (
              <span
                aria-hidden="true"
                className={cn("flex shrink-0 text-muted-foreground [&_svg]:size-4", padStart[size])}
              >
                {iconStart}
              </span>
            )}
            <AriaInput
              ref={inputRef}
              placeholder={placeholder}
              className={cn(
                "h-full w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                iconStart != null ? "ps-2" : padStart[size],
                iconEnd != null ? "pe-2" : action != null ? "pe-1" : padEnd[size],
              )}
            />
            {iconEnd != null && (
              <span
                aria-hidden="true"
                className={cn("flex shrink-0 text-muted-foreground [&_svg]:size-4", padEnd[size])}
              >
                {iconEnd}
              </span>
            )}
            {action != null && (
              <span
                data-slot="action"
                className={cn(
                  "flex shrink-0 items-center [&_svg]:size-4",
                  "*:flex *:shrink-0 *:cursor-default *:items-center *:justify-center *:rounded-md *:text-muted-foreground *:outline-none",
                  "*:transition-[background-color,color] *:duration-150 *:ease-settle",
                  "*:hover:bg-accent *:hover:text-foreground *:data-[hovered]:bg-accent *:data-[hovered]:text-foreground",
                  "*:data-[selected]:text-foreground",
                  "*:focus-visible:ring-[3px] *:focus-visible:ring-ring *:data-[focus-visible]:ring-[3px] *:data-[focus-visible]:ring-ring",
                  "*:disabled:pointer-events-none *:disabled:opacity-50 *:data-[disabled]:pointer-events-none *:data-[disabled]:opacity-50",
                  actionSize[size],
                )}
              >
                {action}
              </span>
            )}
            {suffix != null && <span className={cn(addon, "border-s border-input")}>{suffix}</span>}
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
    </AriaTextField>
  );
}
