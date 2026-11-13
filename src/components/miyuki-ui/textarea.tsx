"use client";

import { CircleAlert } from "lucide-react";
import { type MouseEvent, type ReactNode, type Ref, useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  TextArea as AriaTextArea,
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

export type TextAreaSize = "sm" | "md";

export interface TextAreaProps extends Omit<AriaTextFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  placeholder?: string;
  size?: TextAreaSize;
  autoGrow?: boolean;
  minRows?: number;
  maxRows?: number;
  showCount?: boolean;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

const sizes: Record<TextAreaSize, { text: string; pad: string; foot: string }> = {
  sm: { text: "text-[13px] leading-5", pad: "px-2.5 py-1.5", foot: "px-1.5 pb-1.5" },
  md: { text: "text-sm leading-5", pad: "px-3 py-2", foot: "px-2 pb-2" },
};

function Counter({ count, max }: { count: number; max?: number }) {
  const ratio = max ? count / max : 0;
  const tone = max && count >= max ? "limit" : ratio >= 0.9 ? "near" : "calm";
  const left = max ? Math.max(0, max - count) : 0;
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full px-1.5 py-px text-xs leading-4 tabular-nums transition-colors duration-150 ease-settle",
          tone === "calm" && "text-muted-foreground",
          tone === "near" && "bg-warning-soft text-warning-foreground",
          tone === "limit" && "bg-destructive-soft text-destructive",
        )}
      >
        {max ? `${count}/${max}` : count}
      </span>
      {max ? (
        <span className="sr-only" aria-live="polite">
          {tone === "calm" ? "" : `${left} ${left === 1 ? "character" : "characters"} left`}
        </span>
      ) : null}
    </>
  );
}

export function TextArea({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  autoGrow = true,
  minRows = 3,
  maxRows,
  maxLength,
  showCount,
  isReadOnly = false,
  value,
  defaultValue,
  onChange,
  className,
  fieldClassName,
  ...props
}: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const current = value ?? uncontrolled;
  const counting = showCount ?? maxLength != null;
  const s = sizes[size];

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || 20;
    const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const min = minRows * line + chrome;
    const max = maxRows ? maxRows * line + chrome : Infinity;
    if (!autoGrow) {
      el.style.height = "";
      el.style.minHeight = `${min}px`;
      return;
    }
    el.style.height = "0px";
    const content = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(content, min), max)}px`;
    el.style.overflowY = content > max ? "auto" : "hidden";
  }, [autoGrow, minRows, maxRows]);

  useLayoutEffect(fit, [fit, current]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  function focusTextArea(event: MouseEvent) {
    if (event.target === ref.current) return;
    event.preventDefault();
    ref.current?.focus();
  }

  return (
    <AriaTextField
      {...props}
      value={current}
      onChange={(next) => {
        if (value === undefined) setUncontrolled(next);
        onChange?.(next);
      }}
      maxLength={maxLength}
      isReadOnly={isReadOnly}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {({ isInvalid }) => (
        <>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Group
            isReadOnly={isReadOnly}
            onMouseDown={focusTextArea}
            className={({ isHovered, isFocusWithin, isInvalid: invalid }) =>
              cn(
                "flex w-full flex-col overflow-hidden rounded-lg border outline-none",
                "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
                "data-[disabled]:cursor-not-allowed",
                isReadOnly ? "bg-muted shadow-none" : "bg-card shadow-xs",
                invalid
                  ? "border-destructive"
                  : isFocusWithin
                    ? "border-brand"
                    : isHovered && !isReadOnly
                      ? "border-border-strong"
                      : "border-input",
                isFocusWithin && "ring-[3px]",
                isFocusWithin && (invalid ? "ring-destructive/25" : "ring-ring"),
                fieldClassName,
              )
            }
          >
            <AriaTextArea
              ref={ref}
              rows={minRows}
              placeholder={placeholder}
              className={cn(
                "block w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
                "data-[disabled]:cursor-not-allowed",
                autoGrow ? "resize-none overflow-y-hidden" : "resize-y",
                s.text,
                s.pad,
                counting && "pb-1",
              )}
            />
            {counting && (
              <div className={cn("flex justify-end", s.foot)}>
                <Counter count={current.length} max={maxLength} />
              </div>
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
    </AriaTextField>
  );
}
