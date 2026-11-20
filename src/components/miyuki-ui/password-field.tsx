"use client";

import { ArrowBigUpDash, CircleAlert } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Button as AriaButton,
  Input as AriaInput,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  composeRenderProps,
  FieldError,
  Group,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type PasswordFieldSize = "sm" | "md" | "lg";
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;
export type PasswordPurpose = "new" | "current";

export interface PasswordRule {
  label: ReactNode;
  test: (value: string) => boolean;
}

const COMMON = [
  "password",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "master",
  "shadow",
  "superman",
  "trustno",
  "starwars",
  "freedom",
  "whatever",
  "secret",
  "batman",
  "computer",
  "changeme",
  "default",
  "login",
  "hello",
  "access",
  "flower",
  "cheese",
  "michael",
  "charlie",
  "jordan",
  "hunter",
  "killer",
  "ninja",
  "mustang",
];

const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

function stepBetween(a: string, b: string) {
  if (a === b) return "same";
  if (/[a-z0-9]/.test(a) && /[a-z0-9]/.test(b)) {
    const d = (b.codePointAt(0) ?? 0) - (a.codePointAt(0) ?? 0);
    if (d === 1) return "up";
    if (d === -1) return "down";
  }
  for (const row of ROWS) {
    const i = row.indexOf(a);
    const j = row.indexOf(b);
    if (i < 0 || j < 0) continue;
    if (j - i === 1) return "right";
    if (i - j === 1) return "left";
  }
  return null;
}

export function passwordStrength(value: string): PasswordStrength {
  const chars = [...value];
  const n = chars.length;
  if (n === 0) return 0;
  const lower = chars.map((c) => c.toLowerCase());
  const plain = lower.map((c) => LEET[c] ?? c).join("");
  const weight = new Array<number>(n).fill(1);
  const soften = (from: number, to: number, total: number) => {
    const len = to - from;
    if (len <= 0) return;
    weight[from] = Math.min(weight[from], 1);
    for (let k = from + 1; k < to; k++) weight[k] = Math.min(weight[k], Math.max(0, total - 1) / Math.max(1, len - 1));
  };

  let i = 0;
  while (i < n - 1) {
    const kind = stepBetween(lower[i], lower[i + 1]);
    let j = i + 1;
    if (kind) while (j + 1 < n && stepBetween(lower[j], lower[j + 1]) === kind) j++;
    if (kind && j - i + 1 >= 3) soften(i, j + 1, 1.5);
    i = kind ? j : i + 1;
  }

  const text = lower.join("");
  for (const m of text.matchAll(/(.{2,}?)\1+/g)) {
    const start = m.index ?? 0;
    soften(start + m[1].length - 1, start + m[0].length, 1);
  }
  for (const m of text.matchAll(/(?:19|20)\d\d/g)) soften(m.index ?? 0, (m.index ?? 0) + 4, 1.5);
  for (const word of COMMON) {
    let at = plain.indexOf(word);
    while (at >= 0) {
      soften(at, at + word.length, 1.5);
      at = plain.indexOf(word, at + 1);
    }
  }

  const upperAfterFirst = /\p{Lu}/u.test(chars.slice(1).join(""));
  const hasLower = /\p{Ll}/u.test(value);
  const hasUpper = /\p{Lu}/u.test(value);
  let pool = 0;
  if (hasLower || hasUpper) pool += hasLower && upperAfterFirst ? 52 : 26;
  if (/\p{Nd}/u.test(value)) pool += 10;
  if (/[^\p{L}\p{N}]/u.test(value)) pool += 33;
  if (/[^\p{ASCII}]/u.test(value)) pool += 64;
  const bits = weight.reduce((sum, w) => sum + w, 0) * Math.log2(Math.max(pool, 10));

  let level: PasswordStrength = bits < 36 ? 1 : bits < 56 ? 2 : bits < 76 ? 3 : 4;
  const stem = plain.replace(/[^a-z]+$/, "").replace(/^[^a-z]+/, "");
  if (n < 8 || COMMON.includes(stem)) level = 1;
  return level;
}

export const defaultPasswordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => [...v].length >= 8 },
  { label: "Upper and lower case letters", test: (v) => /\p{Lu}/u.test(v) && /\p{Ll}/u.test(v) },
  { label: "A number", test: (v) => /\p{Nd}/u.test(v) },
  { label: "A symbol", test: (v) => /[^\p{L}\p{N}\s]/u.test(v) },
];

const heights: Record<PasswordFieldSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<PasswordFieldSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const actionSize: Record<PasswordFieldSize, string> = {
  sm: "me-1 size-6",
  md: "me-1 size-7",
  lg: "me-1.5 size-9",
};

const tones = [
  null,
  { word: "Weak", fill: "bg-destructive", text: "text-destructive-strong" },
  { word: "Fair", fill: "bg-warning", text: "text-warning-strong" },
  { word: "Good", fill: "bg-brand ink:bg-chart-1", text: "text-brand-strong ink:text-chart-1" },
  { word: "Strong", fill: "bg-success", text: "text-success-strong" },
] as const;

const FILL: Transition = { type: "spring", stiffness: 500, damping: 30 };
const DRAW: Transition = { duration: 0.16, ease: [0.33, 0, 0.2, 1], delay: 0.06 };

function StrengthMeter({ level }: { level: PasswordStrength }) {
  const reduce = useReducedMotion();
  const tone = tones[level];
  const shown = useRef(level);
  const from = shown.current;
  useEffect(() => {
    shown.current = level;
  }, [level]);

  return (
    <div
      role="meter"
      aria-label="Password strength"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={level}
      aria-valuetext={tone ? tone.word : "No password yet"}
      className="flex items-center gap-3"
    >
      <div aria-hidden="true" className="grid flex-1 grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="relative h-1 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset">
            <motion.span
              className={cn(
                "absolute inset-0 origin-left transition-colors duration-200 ease-settle rtl:origin-right",
                tone?.fill,
              )}
              initial={false}
              animate={{ scaleX: level >= i ? 1 : 0 }}
              transition={
                reduce ? { duration: 0 } : { ...FILL, delay: level > from ? Math.max(0, i - 1 - from) * 0.05 : 0 }
              }
            />
          </span>
        ))}
      </div>
      <span aria-hidden="true" className={cn("h-4 w-11 text-end text-xs leading-4 font-medium", tone?.text)}>
        {tone?.word}
      </span>
    </div>
  );
}

function RuleMark({ met }: { met: boolean }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn(
        "mt-0.5 size-4 shrink-0 transition-colors duration-200 ease-settle",
        met ? "text-success" : "text-border-strong",
      )}
    >
      <circle
        cx="8"
        cy="8"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.5"
        className={cn("transition-colors duration-200 ease-settle", met ? "fill-current/15" : "fill-transparent")}
      />
      <motion.path
        d="M5.4 8.2 7.2 10 10.7 6.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={
          met
            ? {
                pathLength: 1,
                opacity: 1,
                transition: reduce
                  ? { pathLength: { duration: 0 }, opacity: { duration: 0.12 } }
                  : { pathLength: DRAW, opacity: { duration: 0.01, delay: 0.06 } },
              }
            : {
                pathLength: reduce ? 1 : 0,
                opacity: 0,
                transition: { opacity: { duration: 0.1 }, pathLength: { duration: 0, delay: 0.1 } },
              }
        }
      />
    </svg>
  );
}

export interface PasswordFieldProps extends Omit<AriaTextFieldProps, "children" | "type"> {
  label?: ReactNode;
  labelAction?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: PasswordFieldSize;
  placeholder?: string;
  purpose?: PasswordPurpose;
  rules?: PasswordRule[];
  strength?: PasswordStrength;
  showStrength?: boolean;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function PasswordField({
  label,
  labelAction,
  description,
  errorMessage,
  size = "md",
  placeholder,
  purpose = "new",
  rules = defaultPasswordRules,
  strength,
  showStrength,
  value,
  defaultValue,
  onChange,
  autoComplete,
  isDisabled,
  isReadOnly = false,
  className,
  fieldClassName,
  "aria-describedby": describedBy,
  ...props
}: PasswordFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = value ?? own;
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const caret = useRef<{ start: number; end: number; dir: "forward" | "backward" | "none"; focused: boolean } | null>(
    null,
  );
  const rulesId = useId();
  const isNew = purpose === "new";
  const meter = showStrength ?? isNew;
  const listed = isNew && rules.length > 0;
  const level = strength ?? passwordStrength(current);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const saved = caret.current;
    caret.current = null;
    if (!el || !saved) return;
    if (saved.focused && document.activeElement !== el) el.focus({ preventScroll: true });
    el.setSelectionRange(saved.start, saved.end, saved.dir);
  }, [visible]);

  function remember() {
    const el = inputRef.current;
    if (!el || el.selectionStart == null) return;
    caret.current = {
      start: el.selectionStart,
      end: el.selectionEnd ?? el.selectionStart,
      dir: el.selectionDirection ?? "none",
      focused: document.activeElement === el,
    };
  }

  function readCaps(event: KeyboardEvent | MouseEvent) {
    if (typeof event.getModifierState === "function") setCaps(event.getModifierState("CapsLock"));
  }

  function focusInput(event: MouseEvent) {
    readCaps(event);
    if (event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  return (
    <AriaTextField
      {...props}
      type={visible ? "text" : "password"}
      value={current}
      onChange={(next) => {
        if (value === undefined) setOwn(next);
        onChange?.(next);
      }}
      autoComplete={autoComplete ?? (isNew ? "new-password" : "current-password")}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      aria-describedby={[describedBy, listed ? rulesId : null].filter(Boolean).join(" ") || undefined}
      className={composeRenderProps(className, (cls) =>
        cn("relative flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ isInvalid }) => (
        <>
          {(label != null || labelAction != null) && (
            <div className="flex items-baseline justify-between gap-3">
              {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
              {labelAction}
            </div>
          )}
          <Group
            onMouseDown={focusInput}
            className={({ isHovered, isFocusWithin, isInvalid: invalid }) =>
              cn(
                "flex w-full items-center overflow-hidden rounded-lg border text-sm text-foreground outline-none",
                isReadOnly ? "bg-muted shadow-none" : "bg-card shadow-xs",
                "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
                "data-[disabled]:cursor-not-allowed",
                invalid
                  ? "border-destructive"
                  : isFocusWithin
                    ? "border-brand"
                    : isHovered && !isReadOnly
                      ? "border-border-strong"
                      : "border-input",
                isFocusWithin && "ring-[3px]",
                isFocusWithin && (invalid ? "ring-destructive/25" : "ring-ring"),
                heights[size],
                fieldClassName,
              )
            }
          >
            <AriaInput
              ref={inputRef}
              placeholder={placeholder}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              onKeyDown={readCaps}
              onKeyUp={readCaps}
              onBlur={() => setCaps(false)}
              className={cn(
                "h-full w-full min-w-0 flex-1 bg-transparent pe-1 text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                "[&::-ms-clear]:hidden [&::-ms-reveal]:hidden",
                padStart[size],
              )}
            />
            <AriaButton
              aria-label={visible ? "Hide password" : "Show password"}
              isDisabled={isDisabled}
              onPressStart={remember}
              onPress={() => {
                if (!caret.current) remember();
                setVisible((v) => !v);
              }}
              className={cn(
                "flex shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none",
                "transition-[background-color,color] duration-150 ease-settle",
                "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:text-foreground",
                "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                "data-[disabled]:pointer-events-none",
                actionSize[size],
              )}
            >
              <MorphIcon shapes={morphIcons.eyeOpenClosed} shape={visible ? "open" : "closed"} size={16} />
            </AriaButton>
          </Group>
          {meter && <StrengthMeter level={current === "" && strength === undefined ? 0 : level} />}
          {caps && (
            <p
              aria-hidden="true"
              className="flex items-center gap-1.5 text-[13px] leading-5 text-warning-strong transition-[opacity,translate] duration-200 ease-settle starting:-translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0"
            >
              <ArrowBigUpDash className="size-3.5 shrink-0" />
              Caps Lock is on
            </p>
          )}
          <span role="status" className="sr-only">
            {caps ? "Caps Lock is on" : ""}
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
          {listed && (
            <ul id={rulesId} aria-label="Password rules" className="mt-1 flex flex-col gap-1.5">
              {rules.map((rule, index) => {
                const met = rule.test(current);
                return (
                  <li
                    key={typeof rule.label === "string" ? rule.label : index}
                    className={cn(
                      "flex items-start gap-2 text-[13px] leading-5 transition-colors duration-200 ease-settle",
                      met ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <RuleMark met={met} />
                    <span>
                      {rule.label}
                      <span className="sr-only">{met ? ", met" : ", not met"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AriaTextField>
  );
}
