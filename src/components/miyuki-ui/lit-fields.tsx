"use client";

import { CircleAlert } from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useRef,
  useState,
} from "react";
import {
  composeRenderProps,
  FieldError,
  Form,
  type FormProps,
  Input,
  Label,
  Text,
  TextField,
  type TextFieldProps,
  ToggleButton,
  type ValidationResult,
} from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Divider } from "@/components/miyuki-ui/divider";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { SocialButton, type SocialProvider } from "@/components/miyuki-ui/social-button";
import { cn } from "@/lib/utils";

export interface GlowInputProps extends Omit<TextFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  placeholder?: string;
  trailing?: ReactNode;
  glowColor?: string;
  glowRadius?: number;
  ref?: Ref<HTMLDivElement>;
}

const AT = "at var(--miyuki-lit-fields-x, 50%) var(--miyuki-lit-fields-y, 50%)";
const TONE = "var(--miyuki-lit-fields-tone, var(--miyuki-lit-fields-color))";

export function GlowInput({
  label,
  description,
  errorMessage,
  placeholder,
  trailing,
  glowColor = "var(--brand)",
  glowRadius = 110,
  isRequired,
  className,
  style,
  ...props
}: GlowInputProps) {
  const aim = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const k = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
    el.style.setProperty("--miyuki-lit-fields-x", `${((e.clientX - rect.left) / k).toFixed(1)}px`);
    el.style.setProperty("--miyuki-lit-fields-y", `${((e.clientY - rect.top) / k).toFixed(1)}px`);
    el.setAttribute("data-lit", "");
  };

  return (
    <TextField
      {...props}
      isRequired={isRequired}
      style={composeRenderProps(
        style,
        (s) =>
          ({
            "--miyuki-lit-fields-color": glowColor,
            "--miyuki-lit-fields-r": `${glowRadius}px`,
            ...s,
          }) as CSSProperties,
      )}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/glow flex min-w-0 flex-col gap-1.5 data-[disabled]:opacity-50",
          "data-[invalid]:[--miyuki-lit-fields-tone:var(--destructive)]",
          cls,
        ),
      )}
    >
      {({ isInvalid }) => (
        <>
          {label != null && (
            <Label className="flex w-fit items-baseline gap-0.5 text-sm font-medium text-foreground">
              {label}
              {isRequired && (
                <span aria-hidden="true" className="text-brand-strong">
                  *
                </span>
              )}
            </Label>
          )}
          <div
            onPointerEnter={aim}
            onPointerMove={aim}
            onPointerLeave={(e) => e.currentTarget.removeAttribute("data-lit")}
            className={cn(
              "group/frame relative isolate rounded-lg bg-input p-px shadow-xs",
              "transition-[background-color,box-shadow] duration-150 ease-settle",
              "focus-within:bg-brand focus-within:ring-[3px] focus-within:ring-ring",
              isInvalid && "bg-destructive focus-within:bg-destructive focus-within:ring-destructive/25",
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 -z-10 rounded-[14px] opacity-0 blur-[6px] transition-opacity duration-300 ease-settle group-data-[lit]/frame:opacity-25 dark:group-data-[lit]/frame:opacity-60 motion-reduce:transition-none"
              style={{
                background: `radial-gradient(calc(var(--miyuki-lit-fields-r) * 0.7) circle ${AT}, ${TONE}, transparent 70%)`,
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/frame:opacity-100 motion-reduce:transition-none"
              style={{
                background: `radial-gradient(var(--miyuki-lit-fields-r) circle ${AT}, ${TONE}, transparent 72%)`,
              }}
            />
            <div className="relative flex h-9 items-center overflow-hidden rounded-[9px] bg-card">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/frame:opacity-100 motion-reduce:transition-none"
                style={{
                  background: `radial-gradient(calc(var(--miyuki-lit-fields-r) * 0.9) circle ${AT}, color-mix(in oklab, ${TONE} 9%, transparent), transparent 70%)`,
                }}
              />
              <Input
                placeholder={placeholder}
                className={cn(
                  "relative h-full w-full min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none",
                  "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                  trailing != null && "pe-1",
                )}
              />
              {trailing != null && <span className="relative flex shrink-0 items-center pe-1">{trailing}</span>}
            </div>
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
    </TextField>
  );
}

export interface LitFieldsValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LitFieldsProps extends Omit<FormProps, "onSubmit" | "children" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  submitLabel?: ReactNode;
  providers?: SocialProvider[];
  onSubmit?: (values: LitFieldsValues) => void | Promise<void>;
  onProviderPress?: (provider: SocialProvider) => void;
  ref?: Ref<HTMLFormElement>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WATER = "color-mix(in oklab, var(--brand) 78%, var(--primary-foreground))";

function SubmitButton({ children, isPending }: { children: ReactNode; isPending: boolean }) {
  const line = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  const sweep = (on: boolean) => {
    const el = line.current;
    if (!el) return;
    if (reduce) {
      animate(el, { opacity: on ? 1 : 0, x: "0%" }, { duration: 0.12 });
      return;
    }
    if (on) animate(el, { x: ["-70%", "0%"], opacity: [0, 1] }, { duration: 0.42, ease: [0.22, 1, 0.36, 1] });
    else animate(el, { x: "70%", opacity: 0 }, { duration: 0.24, ease: [0.4, 0, 1, 1] });
  };

  return (
    <Button type="submit" isPending={isPending} onHoverChange={sweep} className="w-full overflow-clip">
      {children}
      <span ref={line} aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-0 h-4 opacity-0">
        <span
          className="absolute inset-x-6 bottom-0 h-3 opacity-45 blur-[5px] dark:opacity-30"
          style={{ background: `radial-gradient(50% 100% at 50% 100%, ${WATER}, transparent)` }}
        />
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${WATER} 28%, ${WATER} 72%, transparent)` }}
        />
      </span>
    </Button>
  );
}

function PasswordToggle({ visible, onChange }: { visible: boolean; onChange: (visible: boolean) => void }) {
  return (
    <ToggleButton
      isSelected={visible}
      onChange={onChange}
      aria-label="Show password"
      className={cn(
        "grid size-7 cursor-default place-items-center rounded-md text-muted-foreground outline-none",
        "transition-[background-color,color] duration-150 ease-settle",
        "data-[hovered]:bg-accent data-[hovered]:text-foreground",
        "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
      )}
    >
      <MorphIcon shapes={morphIcons.eyeOpenClosed} shape={visible ? "open" : "closed"} size={16} strokeWidth={1.75} />
    </ToggleButton>
  );
}

export function LitFields({
  title = "Create your account",
  description,
  submitLabel = "Create account",
  providers = ["github", "google"],
  onSubmit,
  onProviderPress,
  className,
  ...props
}: LitFieldsProps) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const read = (key: string) => String(data.get(key) ?? "");
    const result = onSubmit?.({
      firstName: read("firstName").trim(),
      lastName: read("lastName").trim(),
      email: read("email").trim(),
      password: read("password"),
    });
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
      } finally {
        setPending(false);
      }
    }
  };

  return (
    <Form
      {...props}
      onSubmit={submit}
      className={cn(
        "flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance text-foreground">
          {title}
        </h2>
        {description != null && (
          <p className="text-sm leading-[22px] text-pretty text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <GlowInput
            name="firstName"
            label="First name"
            autoComplete="given-name"
            isRequired
            validate={(v) => (v.trim() === "" ? "Enter your first name." : null)}
          />
          <GlowInput
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            isRequired
            validate={(v) => (v.trim() === "" ? "Enter your last name." : null)}
          />
        </div>
        <GlowInput
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          isRequired
          validate={(v) =>
            v.trim() === ""
              ? "Enter your email address."
              : EMAIL.test(v.trim())
                ? null
                : "Enter an address like name@example.com."
          }
        />
        <GlowInput
          name="password"
          type={visible ? "text" : "password"}
          label="Password"
          autoComplete="new-password"
          description="At least 8 characters."
          isRequired
          validate={(v) => (v.length < 8 ? "Use at least 8 characters." : null)}
          trailing={<PasswordToggle visible={visible} onChange={setVisible} />}
        />
      </div>

      <SubmitButton isPending={pending}>{submitLabel}</SubmitButton>

      {providers.length > 0 && (
        <>
          <Divider label="or" />
          <div className="flex flex-col gap-2.5">
            {providers.map((provider) => (
              <SocialButton
                key={provider}
                provider={provider}
                className="w-full"
                onPress={() => onProviderPress?.(provider)}
              />
            ))}
          </div>
        </>
      )}
    </Form>
  );
}
