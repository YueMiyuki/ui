"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { cn } from "@/lib/utils";

export type AnnouncementVariant = "pill" | "bar";

const keyframes = `
@keyframes miyuki-announcement-sheen { from { translate: -100% 0; } to { translate: 100% 0; } }
`;

type Phase = "shown" | "closing" | "gone";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function focusAfter(box: HTMLElement) {
  const all = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !box.contains(el) && el.getClientRects().length > 0 && !el.closest('[inert], [aria-hidden="true"]'),
  );
  const next =
    all.find((el) => box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) ??
    all.findLast((el) => box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  if (next) return next.focus();
  const host = box.parentElement?.parentElement;
  if (!host) return;
  if (!host.hasAttribute("tabindex")) {
    host.setAttribute("tabindex", "-1");
    host.addEventListener("blur", () => host.removeAttribute("tabindex"), { once: true });
  }
  host.focus({ preventScroll: true });
}

export interface AnnouncementProps extends Omit<ComponentProps<"div">, "children"> {
  variant?: AnnouncementVariant;
  label?: ReactNode;
  children: ReactNode;
  href?: string;
  linkText?: ReactNode;
  onDismiss?: () => void;
  storageKey?: string;
  dismissLabel?: string;
}

export function Announcement({
  variant = "pill",
  label = "New",
  children,
  href,
  linkText = "Read more",
  onDismiss,
  storageKey,
  dismissLabel = "Dismiss",
  className,
  onTransitionEnd,
  ...props
}: AnnouncementProps) {
  const [phase, setPhase] = useState<Phase>("shown");
  const boxRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const key = storageKey ? `miyuki-announcement:${storageKey}` : null;

  useLayoutEffect(() => {
    if (!key) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(key);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is read after hydration, before paint
    if (stored === "dismissed") setPhase("gone");
  }, [key]);

  const dismiss = () => {
    const box = boxRef.current;
    if (box?.contains(document.activeElement)) focusAfter(box);
    if (key) {
      try {
        window.localStorage.setItem(key, "dismissed");
      } catch {}
    }
    if (reduce) {
      setPhase("gone");
      onDismiss?.();
    } else setPhase("closing");
  };

  if (phase === "gone") return null;

  const link =
    href != null ? (
      <LinkButton href={href} size="sm" tone="brand" className="shrink-0">
        {linkText}
      </LinkButton>
    ) : null;

  return (
    <div
      {...props}
      data-closing={phase === "closing" || undefined}
      className={cn(
        "group/announcement grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-settle",
        "data-[closing]:grid-rows-[0fr] data-[closing]:delay-75",
        variant === "bar" && "w-full",
        className,
      )}
      onTransitionEnd={(event) => {
        onTransitionEnd?.(event);
        if (event.target !== event.currentTarget || event.propertyName !== "grid-template-rows") return;
        if (phase !== "closing") return;
        setPhase("gone");
        onDismiss?.();
      }}
    >
      <div
        ref={boxRef}
        className={cn(
          "min-h-0 overflow-hidden transition-[opacity,scale] duration-200 ease-out",
          "group-data-[closing]/announcement:scale-[0.97] group-data-[closing]/announcement:opacity-0",
        )}
      >
        {variant === "pill" ? (
          <div className="flex justify-center px-1 py-1.5">
            <div className="relative isolate inline-flex max-w-full items-center gap-2.5 overflow-clip rounded-full border border-border bg-card p-1 text-[13px] leading-5 text-foreground shadow-xs">
              <style href="miyuki-announcement" precedence="miyuki">
                {keyframes}
              </style>
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 -z-10 -translate-x-full",
                  "bg-[linear-gradient(100deg,transparent_28%,var(--miyuki-announcement-sheen)_50%,transparent_72%)]",
                  "[--miyuki-announcement-sheen:color-mix(in_oklab,var(--brand)_26%,transparent)] dark:[--miyuki-announcement-sheen:color-mix(in_oklab,var(--brand)_42%,transparent)]",
                  "motion-safe:animate-[miyuki-announcement-sheen_1.5s_cubic-bezier(0.45,0.05,0.25,1)_450ms_both]",
                )}
              />
              {label != null && (
                <Badge tone="brand" size="sm" className="h-[22px] px-2">
                  {label}
                </Badge>
              )}
              <span className="min-w-0 truncate">{children}</span>
              {link && (
                <>
                  <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-border-strong" />
                  {link}
                </>
              )}
              <CloseButton size="sm" aria-label={dismissLabel} onPress={dismiss} className="ms-0.5 size-[22px]" />
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-11 w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-brand-soft py-2.5 ps-12 pe-12 text-sm leading-5 text-foreground">
            {label != null && (
              <Badge tone="brand" variant="solid" size="sm">
                {label}
              </Badge>
            )}
            <span className="text-center text-pretty">{children}</span>
            {link}
            <CloseButton
              size="lg"
              aria-label={dismissLabel}
              onPress={dismiss}
              className="absolute end-2 top-1.5 data-[hovered]:bg-brand/12"
            />
          </div>
        )}
      </div>
    </div>
  );
}
