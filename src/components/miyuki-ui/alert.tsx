"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type ContextType,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ButtonContext, DEFAULT_SLOT } from "react-aria-components";
import { ButtonGroupContext } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "error" | "neutral";
export type AlertVariant = "soft" | "outline";

const icons: Record<AlertTone, ReactNode> = {
  info: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  error: <CircleAlert />,
  neutral: null,
};

const soft: Record<AlertTone, { box: string; icon: string }> = {
  info: {
    box: "border-brand/25 bg-brand-soft ink:border-chart-1/30 ink:bg-[color-mix(in_oklab,var(--chart-1)_24%,var(--card))]",
    icon: "text-brand-strong ink:text-chart-1",
  },
  success: { box: "border-success/25 bg-success-soft", icon: "text-success-strong" },
  warning: { box: "border-warning/25 bg-warning-soft", icon: "text-warning-strong" },
  error: { box: "border-destructive/25 bg-destructive-soft", icon: "text-destructive-strong" },
  neutral: { box: "border-border bg-muted", icon: "text-muted-foreground" },
};

const outline: Record<AlertTone, { box: string; icon: string }> = {
  info: { box: "border-border bg-card shadow-xs", icon: "text-brand ink:text-chart-1" },
  success: { box: "border-border bg-card shadow-xs", icon: "text-success" },
  warning: {
    box: "border-border bg-card shadow-xs",
    icon: "text-[color-mix(in_oklab,var(--warning),var(--warning-strong))] dark:text-warning",
  },
  error: { box: "border-border bg-card shadow-xs", icon: "text-destructive" },
  neutral: { box: "border-border bg-card shadow-xs", icon: "text-muted-foreground" },
};

const noop = () => () => {};

function useMountedLate() {
  const now = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [late] = useState(now);
  return late;
}

type ButtonContextValue = NonNullable<ContextType<typeof ButtonContext>>;

function useDismissSlot(dismiss: () => void): ButtonContextValue {
  const outer = useContext(ButtonContext);
  const slots: Record<string | symbol, unknown> =
    outer != null && typeof outer === "object" && "slots" in outer && outer.slots != null
      ? { ...outer.slots }
      : { [DEFAULT_SLOT]: outer ?? {} };
  return {
    slots: { ...slots, [DEFAULT_SLOT]: slots[DEFAULT_SLOT] ?? {}, dismiss: { onPress: dismiss } },
  } as ButtonContextValue;
}

export interface AlertProps extends ComponentProps<"div"> {
  tone?: AlertTone;
  variant?: AlertVariant;
  icon?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  live?: boolean;
}

export function Alert({
  tone = "info",
  variant = "soft",
  icon,
  onDismiss,
  dismissLabel = "Dismiss",
  live = false,
  className,
  children,
  ref,
  ...props
}: AlertProps) {
  const node = useRef<HTMLDivElement | null>(null);
  const leaving = useRef(false);
  const [gone, setGone] = useState(false);
  const late = useMountedLate();
  const reduce = useReducedMotion();
  const look = (variant === "outline" ? outline : soft)[tone];
  const glyph = icon === undefined ? icons[tone] : icon;

  function dismiss() {
    const el = node.current;
    if (el == null || leaving.current) return;
    leaving.current = true;
    const finish = () => {
      setGone(true);
      onDismiss?.();
    };
    if (reduce) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-out", fill: "forwards" }).onfinish =
        finish;
      return;
    }
    const style = getComputedStyle(el);
    el.style.overflow = "clip";
    el.animate(
      [
        {
          height: `${el.offsetHeight}px`,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          borderTopWidth: style.borderTopWidth,
          borderBottomWidth: style.borderBottomWidth,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          opacity: 1,
        },
        { opacity: 0, offset: 0.6 },
        {
          height: "0px",
          paddingTop: "0px",
          paddingBottom: "0px",
          borderTopWidth: "0px",
          borderBottomWidth: "0px",
          marginTop: "0px",
          marginBottom: "0px",
          opacity: 0,
        },
      ],
      { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    ).onfinish = finish;
  }

  const slot = useDismissSlot(dismiss);

  if (gone) return null;

  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={live && (tone === "error" || tone === "warning") ? "alert" : undefined}
      {...props}
      ref={(el) => {
        node.current = el;
        if (typeof ref === "function") return ref(el);
        if (ref != null) (ref as { current: HTMLDivElement | null }).current = el;
      }}
      className={cn(
        "relative flex gap-3 rounded-xl border p-4 text-sm leading-5 text-foreground",
        look.box,
        late && "animate-[miyuki-alert-in_240ms_cubic-bezier(0.22,1,0.36,1)_both]",
        late && "motion-reduce:animate-[miyuki-alert-fade_120ms_ease-out_both]",
        className,
      )}
    >
      {late && (
        <style href="miyuki-alert" precedence="miyuki">{`
          @keyframes miyuki-alert-in { from { opacity: 0; transform: translateY(-4px); } }
          @keyframes miyuki-alert-fade { from { opacity: 0; } }
        `}</style>
      )}
      {glyph != null && glyph !== false && (
        <span aria-hidden="true" className={cn("flex h-5 shrink-0 items-center [&_svg]:size-4", look.icon)}>
          {glyph}
        </span>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", onDismiss && "pe-8")}>
        <ButtonContext value={slot}>{children}</ButtonContext>
      </div>
      {onDismiss && (
        <CloseButton
          aria-label={dismissLabel}
          onPress={dismiss}
          className={cn("absolute end-3.5 top-3.5", variant === "soft" && "data-[hovered]:bg-foreground/[0.07]")}
        />
      )}
    </div>
  );
}

export type AlertTitleProps = ComponentProps<"div">;

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div data-slot="alert-title" {...props} className={cn("font-medium text-pretty text-foreground", className)} />
  );
}

export type AlertDescriptionProps = ComponentProps<"div">;

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-slot="alert-description"
      {...props}
      className={cn(
        "text-pretty text-foreground/80 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2",
        className,
      )}
    />
  );
}

export type AlertActionsProps = ComponentProps<"div">;

export function AlertActions({ className, children, ...props }: AlertActionsProps) {
  return (
    <div data-slot="alert-actions" {...props} className={cn("mt-2 flex flex-wrap items-center gap-2", className)}>
      <ButtonGroupContext value={{ size: "sm" }}>{children}</ButtonGroupContext>
    </div>
  );
}
