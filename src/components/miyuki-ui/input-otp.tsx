"use client";

import { CircleAlert } from "lucide-react";
import { AnimatePresence, motion, type Transition, useAnimate, useReducedMotion } from "motion/react";
import {
  type ChangeEvent,
  type ComponentProps,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

const keyframes = `
@keyframes miyuki-input-otp-blink { 0%, 45% { opacity: 1; } 55%, 95% { opacity: 0; } 100% { opacity: 1; } }
`;

export interface InputOTPProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue" | "children"> {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  groups?: number[];
  mask?: boolean;
  inputMode?: "numeric" | "text";
  isInvalid?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  name?: string;
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
}

export function InputOTP({
  length = 6,
  value: valueProp,
  defaultValue = "",
  onChange,
  onComplete,
  groups,
  mask = false,
  inputMode = "numeric",
  isInvalid = false,
  isDisabled = false,
  autoFocus,
  name,
  label,
  description,
  errorMessage,
  inputRef,
  className,
  id,
  "aria-label": ariaLabel,
  ...props
}: InputOTPProps) {
  const reduce = useReducedMotion();
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const descId = `${autoId}-desc`;
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const [inner, setInner] = useState(() => sanitize(defaultValue, inputMode, length));
  const value = valueProp !== undefined ? sanitize(valueProp, inputMode, length) : inner;
  const [focused, setFocused] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  const wasInvalid = useRef(isInvalid);
  useEffect(() => {
    if (isInvalid && !wasInvalid.current && !reduce && scope.current) {
      animate(scope.current, { x: [0, -6, 5, -3, 2, 0] }, { duration: 0.32, ease: "easeOut" });
    }
    wasInvalid.current = isInvalid;
  }, [isInvalid, reduce, animate, scope]);

  function commit(next: string) {
    if (next === value) return;
    if (valueProp === undefined) setInner(next);
    onChange?.(next);
    if (next.length === length) onComplete?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    commit(sanitize(event.target.value, inputMode, length));
  }

  function handleSelect(event: SyntheticEvent<HTMLInputElement>) {
    const el = event.currentTarget;
    const end = el.value.length;
    const whole = end > 0 && el.selectionStart === 0 && el.selectionEnd === end;
    setAllSelected(whole);
    if (!whole && (el.selectionStart !== end || el.selectionEnd !== end)) el.setSelectionRange(end, end);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const end = event.currentTarget.value.length;
      event.currentTarget.setSelectionRange(end, end);
      setAllSelected(false);
    }
  }

  const chars = Array.from(value);
  const active = focused ? Math.min(chars.length, length - 1) : -1;

  const breaks = new Set<number>();
  if (groups && groups.length > 1) {
    let at = 0;
    for (const g of groups.slice(0, -1)) {
      at += g;
      if (at > 0 && at < length) breaks.add(at - 1);
    }
  }

  const describedBy = (isInvalid && errorMessage != null) || description != null ? descId : undefined;

  return (
    <div {...props} className={cn("inline-flex flex-col gap-1.5", isDisabled && "opacity-50", className)}>
      <style href="miyuki-input-otp" precedence="miyuki">
        {keyframes}
      </style>
      {label != null && (
        <label htmlFor={inputId} className="w-fit text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div ref={scope} className="group/otp relative flex w-fit items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setAllSelected(false);
          }}
          disabled={isDisabled}
          autoFocus={autoFocus}
          inputMode={inputMode}
          autoComplete="one-time-code"
          pattern={inputMode === "numeric" ? "[0-9]*" : undefined}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={ariaLabel}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className="absolute inset-0 z-10 size-full cursor-text appearance-none border-0 bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
        />
        {Array.from({ length }, (_, i) => {
          const ch = chars[i];
          const isActive = i === active;
          return (
            <Fragment key={i}>
              <div
                aria-hidden="true"
                className={cn(
                  "relative flex h-11 w-10 items-center justify-center rounded-lg border text-lg font-medium text-foreground tabular-nums shadow-xs",
                  "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
                  allSelected && ch ? "bg-brand-soft" : "bg-card",
                  isInvalid
                    ? "border-destructive"
                    : isActive
                      ? "border-brand"
                      : ch
                        ? "border-border-strong"
                        : "border-input group-hover/otp:border-border-strong",
                  isActive && "ring-[3px]",
                  isActive && (isInvalid ? "ring-destructive/25" : "ring-ring"),
                )}
              >
                <AnimatePresence initial={false}>
                  {ch != null && (
                    <motion.span
                      key={`${i}-${ch}`}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                      transition={reduce ? { duration: 0.1 } : SETTLE}
                    >
                      {mask ? <span className="size-2.5 rounded-full bg-current" /> : ch}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && ch == null && (
                  <span className="h-5 w-[1.5px] rounded-full bg-foreground animate-[miyuki-input-otp-blink_1.1s_linear_infinite] motion-reduce:animate-none" />
                )}
              </div>
              {breaks.has(i) && (
                <span
                  aria-hidden="true"
                  className="mx-0.5 h-[2px] w-2.5 shrink-0 rounded-full bg-muted-foreground/45"
                />
              )}
            </Fragment>
          );
        })}
      </div>
      {isInvalid && errorMessage != null ? (
        <p id={descId} className="flex items-start gap-1.5 text-[13px] leading-5 text-destructive">
          <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      ) : description != null ? (
        <p id={descId} className="text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function sanitize(raw: string, mode: "numeric" | "text", length: number) {
  const folded = raw.normalize("NFKC");
  const clean = mode === "numeric" ? folded.replace(/\D/g, "") : folded.replace(/[^\p{L}\p{N}]/gu, "");
  return Array.from(clean).slice(0, length).join("");
}
