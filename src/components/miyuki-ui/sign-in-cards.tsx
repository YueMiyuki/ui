"use client";

import { type ComponentProps, type FormEvent, type ReactNode, useState } from "react";
import { type TextFieldProps as AriaTextFieldProps, Form, ToggleButton } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Checkbox } from "@/components/miyuki-ui/checkbox";
import { Divider } from "@/components/miyuki-ui/divider";
import { TextField } from "@/components/miyuki-ui/input";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { SocialButton, type SocialProvider, socialProviders } from "@/components/miyuki-ui/social-button";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const checkEmail = (value: string) =>
  value.trim() === ""
    ? "Enter your email address."
    : EMAIL.test(value.trim())
      ? null
      : "Enter an address like name@example.com.";

function Required({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <span aria-hidden="true" className="ms-0.5 text-muted-foreground">
        *
      </span>
    </>
  );
}

interface PasswordFieldProps extends Omit<AriaTextFieldProps, "children" | "type" | "className"> {
  label: ReactNode;
  description?: ReactNode;
  placeholder?: string;
}

function PasswordField({ label, description, placeholder, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      label={label}
      description={description}
      placeholder={placeholder}
      type={visible ? "text" : "password"}
      action={
        <ToggleButton isSelected={visible} onChange={setVisible} aria-label="Show password">
          <MorphIcon shapes={morphIcons.eyeOpenClosed} shape={visible ? "open" : "closed"} size={16} />
        </ToggleButton>
      }
    />
  );
}

function Providers({
  providers,
  isDisabled,
  onProvider,
}: {
  providers: SocialProvider[];
  isDisabled: boolean;
  onProvider?: (provider: SocialProvider) => void;
}) {
  if (providers.length === 0) return null;
  const single = providers.length === 1;
  const icons = providers.length > 2;
  return (
    <>
      <Divider label="or" className="my-5" />
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(providers.length, 4)}, minmax(0, 1fr))` }}
      >
        {providers.map((provider) => (
          <SocialButton
            key={provider}
            provider={provider}
            variant={icons ? "icon" : "outline"}
            isDisabled={isDisabled}
            onPress={() => onProvider?.(provider)}
            aria-label={single || icons ? undefined : `Continue with ${socialProviders[provider].name}`}
            className="w-full"
          >
            {single ? undefined : socialProviders[provider].name}
          </SocialButton>
        ))}
      </div>
    </>
  );
}

interface ShellProps extends Omit<ComponentProps<"div">, "title" | "onSubmit"> {
  logo?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
}

function Shell({ logo, title, description, footer, className, children, ...props }: ShellProps) {
  return (
    <div
      {...props}
      className={cn(
        "w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        {logo != null && <div className="mb-5 flex">{logo}</div>}
        <h2 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-balance text-foreground">
          {title}
        </h2>
        {description != null && (
          <p className="mt-1.5 text-sm leading-[22px] text-balance text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {footer != null && <p className="mt-6 text-center text-sm leading-5 text-muted-foreground">{footer}</p>}
    </div>
  );
}

function usePendingSubmit<T>(onSubmit?: (values: T) => void | Promise<void>) {
  const [pending, setPending] = useState(false);
  async function run(values: T) {
    const result = onSubmit?.(values);
    if (!(result instanceof Promise)) return;
    setPending(true);
    try {
      await result;
    } finally {
      setPending(false);
    }
  }
  return [pending, run] as const;
}

export interface SignInValues {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignInCardProps extends Omit<ComponentProps<"div">, "title" | "onSubmit"> {
  title?: ReactNode;
  description?: ReactNode;
  logo?: ReactNode;
  providers?: SocialProvider[];
  submitLabel?: ReactNode;
  onSubmit?: (values: SignInValues) => void | Promise<void>;
  onProvider?: (provider: SocialProvider) => void;
  onForgotPassword?: () => void;
  onSwitch?: () => void;
}

export function SignInCard({
  title = "Welcome back",
  description = "Sign in to pick up where you left off.",
  logo,
  providers = ["google", "apple"],
  submitLabel = "Sign in",
  onSubmit,
  onProvider,
  onForgotPassword,
  onSwitch,
  ...props
}: SignInCardProps) {
  const [remember, setRemember] = useState(false);
  const [pending, run] = usePendingSubmit(onSubmit);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({ email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? ""), remember });
  }

  return (
    <Shell
      {...props}
      logo={logo}
      title={title}
      description={description}
      footer={
        onSwitch && (
          <>
            Don&rsquo;t have an account? <LinkButton onPress={onSwitch}>Create one</LinkButton>
          </>
        )
      }
    >
      <Form onSubmit={submit} className="mt-6 flex flex-col">
        <div className="flex flex-col gap-4">
          <TextField
            name="email"
            type="email"
            label={<Required>Email</Required>}
            placeholder="you@example.com"
            autoComplete="email"
            isRequired
            isDisabled={pending}
            validate={checkEmail}
          />
          <PasswordField
            name="password"
            label={<Required>Password</Required>}
            autoComplete="current-password"
            isRequired
            isDisabled={pending}
            validate={(value) => (value === "" ? "Enter your password." : null)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Checkbox isSelected={remember} onChange={setRemember} isDisabled={pending}>
            Remember me
          </Checkbox>
          <LinkButton onPress={onForgotPassword}>Forgot password?</LinkButton>
        </div>
        <Button type="submit" isPending={pending} className="mt-5 w-full">
          {submitLabel}
        </Button>
      </Form>
      <Providers providers={providers} isDisabled={pending} onProvider={onProvider} />
    </Shell>
  );
}

export interface SignUpValues {
  name: string;
  email: string;
  password: string;
}

export interface SignUpCardProps extends Omit<ComponentProps<"div">, "title" | "onSubmit"> {
  title?: ReactNode;
  description?: ReactNode;
  logo?: ReactNode;
  providers?: SocialProvider[];
  submitLabel?: ReactNode;
  minPasswordLength?: number;
  onSubmit?: (values: SignUpValues) => void | Promise<void>;
  onProvider?: (provider: SocialProvider) => void;
  onSwitch?: () => void;
}

export function SignUpCard({
  title = "Create your account",
  description = "It takes a minute. No card needed.",
  logo,
  providers = ["google", "apple"],
  submitLabel = "Create account",
  minPasswordLength = 8,
  onSubmit,
  onProvider,
  onSwitch,
  ...props
}: SignUpCardProps) {
  const [pending, run] = usePendingSubmit(onSubmit);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
  }

  return (
    <Shell
      {...props}
      logo={logo}
      title={title}
      description={description}
      footer={
        onSwitch && (
          <>
            Already have an account? <LinkButton onPress={onSwitch}>Sign in</LinkButton>
          </>
        )
      }
    >
      <Form onSubmit={submit} className="mt-6 flex flex-col">
        <div className="flex flex-col gap-4">
          <TextField
            name="name"
            label={<Required>Full name</Required>}
            autoComplete="name"
            isRequired
            isDisabled={pending}
            validate={(value) => (value.trim() === "" ? "Enter your name." : null)}
          />
          <TextField
            name="email"
            type="email"
            label={<Required>Email</Required>}
            placeholder="you@example.com"
            autoComplete="email"
            isRequired
            isDisabled={pending}
            validate={checkEmail}
          />
          <PasswordField
            name="password"
            label={<Required>Password</Required>}
            description={`At least ${minPasswordLength} characters.`}
            autoComplete="new-password"
            isRequired
            isDisabled={pending}
            validate={(value) =>
              value === ""
                ? "Choose a password."
                : value.length < minPasswordLength
                  ? `Use at least ${minPasswordLength} characters.`
                  : null
            }
          />
        </div>
        <Button type="submit" isPending={pending} className="mt-6 w-full">
          {submitLabel}
        </Button>
      </Form>
      <Providers providers={providers} isDisabled={pending} onProvider={onProvider} />
    </Shell>
  );
}
