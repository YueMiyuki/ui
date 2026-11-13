"use client";

import { CircleAlert } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import { type MouseEvent, type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import {
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  composeRenderProps,
  FieldError,
  Group,
  Input,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type SearchFieldSize = "sm" | "md" | "lg";

const heights: Record<SearchFieldSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<SearchFieldSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const padEnd: Record<SearchFieldSize, string> = { sm: "pe-1.5", md: "pe-2", lg: "pe-3" };

function fieldBox({ isHovered, isFocused, isInvalid }: { isHovered: boolean; isFocused: boolean; isInvalid: boolean }) {
  return cn(
    "rounded-lg border bg-card text-sm text-foreground shadow-xs outline-none",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
    isInvalid ? "border-destructive" : isFocused ? "border-brand" : isHovered ? "border-border-strong" : "border-input",
    isFocused && "ring-[3px]",
    isFocused && (isInvalid ? "ring-destructive/25" : "ring-ring"),
  );
}

type LensPhase = "lens" | "ring" | "closing";

const MORPH: Transition = { type: "spring", stiffness: 420, damping: 34 };

const lensKeyframes = `
@keyframes miyuki-search-field-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-search-field-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Lens({ isPending }: { isPending: boolean }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<LensPhase>(isPending ? "ring" : "lens");
  if (isPending && phase !== "ring") setPhase("ring");
  if (!isPending && phase === "ring") setPhase(reduce ? "lens" : "closing");

  const ring = phase !== "lens";
  const glass =
    phase === "lens"
      ? { cx: 11, cy: 11, r: 7, pathLength: 1 }
      : phase === "ring"
        ? { cx: 12, cy: 12, r: 9, pathLength: 0.3 }
        : { cx: 12, cy: 12, r: 9, pathLength: 1 };

  return (
    <>
      <style href="miyuki-search-field" precedence="miyuki">
        {lensKeyframes}
      </style>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 shrink-0 overflow-visible">
        <motion.circle
          cx={12}
          cy={12}
          r={9}
          stroke="currentColor"
          strokeWidth={2}
          initial={false}
          animate={{ opacity: phase === "ring" ? 0.18 : 0 }}
          transition={{ duration: 0.2 }}
        />
        <g
          className={cn(
            ring && !reduce && "animate-[miyuki-search-field-spin_0.8s_linear_infinite]",
            phase === "ring" && reduce && "animate-[miyuki-search-field-pulse_1.6s_ease-in-out_infinite]",
          )}
          style={{ transformOrigin: "12px 12px" }}
        >
          <motion.circle
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            initial={false}
            animate={glass}
            transition={reduce ? { duration: 0 } : phase === "closing" ? { duration: 0.16, ease: "easeOut" } : MORPH}
            onAnimationComplete={() => {
              if (phase === "closing") setPhase("lens");
            }}
          />
        </g>
        <motion.path
          d="M16 16 20.6 20.6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={
            phase === "lens"
              ? {
                  pathLength: 1,
                  opacity: 1,
                  transition: reduce
                    ? { duration: 0 }
                    : { pathLength: { ...MORPH, delay: 0.05 }, opacity: { duration: 0.01, delay: 0.05 } },
                }
              : {
                  pathLength: 0,
                  opacity: 0,
                  transition: reduce
                    ? { duration: 0 }
                    : { pathLength: { duration: 0.12, ease: "easeIn" }, opacity: { duration: 0.05, delay: 0.07 } },
                }
          }
        />
      </svg>
    </>
  );
}

interface Shortcut {
  key: string;
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

function parseShortcut(text: string): Shortcut | null {
  const tokens = text
    .replace(/[⌘⌃⌥⇧]/g, (m) => ` ${m} `)
    .split(/[\s+]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
  const key = tokens.pop();
  if (!key) return null;
  const has = (...names: string[]) => tokens.some((t) => names.includes(t));
  return {
    key,
    mod: has("⌘", "cmd", "command", "meta", "mod"),
    ctrl: has("⌃", "ctrl", "control"),
    alt: has("⌥", "alt", "option"),
    shift: has("⇧", "shift"),
  };
}

function isEditable(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  placeholder?: string;
  size?: SearchFieldSize;
  isPending?: boolean;
  shortcut?: string;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SearchField({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  isPending = false,
  shortcut,
  className,
  fieldClassName,
  isDisabled,
  ...props
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const combo = shortcut ? parseShortcut(shortcut) : null;
    if (!combo || isDisabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!combo || e.defaultPrevented || e.repeat) return;
      if (e.key.toLowerCase() !== combo.key) return;
      const plain = !combo.mod && !combo.ctrl && !combo.alt;
      if (combo.mod ? !(e.metaKey || e.ctrlKey) : combo.ctrl ? !e.ctrlKey : e.metaKey || e.ctrlKey) return;
      if (combo.alt !== e.altKey) return;
      if (combo.shift && !e.shiftKey) return;
      if (plain && isEditable(document.activeElement)) return;
      const input = inputRef.current;
      if (!input || document.activeElement === input) return;
      e.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, isDisabled]);

  function focusInput(event: MouseEvent) {
    if (event.target === inputRef.current || (event.target as Element).closest("button")) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  return (
    <AriaSearchField
      {...props}
      isDisabled={isDisabled}
      className={composeRenderProps(className, (cls) =>
        cn("group/field flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ isEmpty, isInvalid }) => (
        <>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Group
            onMouseDown={focusInput}
            className={(state) =>
              cn(
                fieldBox({ isHovered: state.isHovered, isFocused: state.isFocusWithin, isInvalid: state.isInvalid }),
                "flex w-full cursor-text items-center overflow-hidden data-[disabled]:cursor-not-allowed",
                heights[size],
                fieldClassName,
              )
            }
          >
            <span
              className={cn(
                "flex shrink-0 transition-colors duration-150",
                padStart[size],
                isPending ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Lens isPending={isPending} />
            </span>
            <Input
              ref={inputRef}
              placeholder={placeholder}
              aria-busy={isPending || undefined}
              className={cn(
                "h-full w-full min-w-0 flex-1 bg-transparent ps-2 text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
                isEmpty && !shortcut ? padEnd[size] : "pe-1",
              )}
            />
            {!isEmpty ? (
              <CloseButton
                size="sm"
                aria-label="Clear search"
                className={cn(
                  "transition-[scale,opacity,background-color,color] duration-200 ease-settle starting:scale-50 starting:opacity-0",
                  size === "sm" ? "me-1.5" : size === "md" ? "me-2" : "me-3",
                )}
              />
            ) : shortcut ? (
              <kbd
                aria-hidden="true"
                className={cn(
                  "pointer-events-none flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border border-border bg-muted px-1.5 font-mono text-xs leading-none text-muted-foreground",
                  size === "sm" ? "me-1.5" : size === "md" ? "me-2" : "me-3",
                )}
              >
                {shortcut}
              </kbd>
            ) : null}
          </Group>
          <span role="status" className="sr-only">
            {isPending ? "Searching" : ""}
          </span>
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
    </AriaSearchField>
  );
}
