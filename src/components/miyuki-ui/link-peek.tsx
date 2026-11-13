"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface LinkPeekContent {
  image: string;
  title: string;
  description?: string;
}

export interface LinkPeekProps extends Omit<ComponentProps<"a">, "children" | "href"> {
  href: string;
  children: ReactNode;
  preview: LinkPeekContent;
  width?: number;
  side?: "top" | "bottom";
  delay?: number;
  ref?: Ref<HTMLAnchorElement>;
}

function hostOf(href: string) {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return href;
  }
}

const EDGE = 8;

export function LinkPeek({
  href,
  children,
  preview,
  width = 240,
  side = "top",
  delay = 350,
  className,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: LinkPeekProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const base = useRef(0);
  const nudge = useMotionValue(0);
  const x = useSpring(nudge, { stiffness: 420, damping: 34 });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const place = (link: HTMLAnchorElement) => {
    const r = link.getBoundingClientRect();
    const k = link.offsetWidth > 0 ? r.width / link.offsetWidth : 1;
    const centre = r.left + r.width / 2;
    const left = centre - (width * k) / 2;
    const fitted = Math.min(Math.max(EDGE, left), window.innerWidth - width * k - EDGE);
    base.current = (fitted - left) / k;
  };

  const aim = (link: HTMLAnchorElement, clientX: number) => {
    const r = link.getBoundingClientRect();
    const k = link.offsetWidth > 0 ? r.width / link.offsetWidth : 1;
    const offset = (clientX - (r.left + r.width / 2)) / k;
    const reach = width * 0.12;
    nudge.set(base.current + (reduce ? 0 : Math.max(-reach, Math.min(reach, offset * 0.22))));
  };

  const show = (link: HTMLAnchorElement, clientX: number | null, wait: number) => {
    window.clearTimeout(timer.current);
    const go = () => {
      place(link);
      nudge.jump(base.current);
      x.jump(base.current);
      if (clientX != null) aim(link, clientX);
      setOpen(true);
    };
    if (wait > 0) timer.current = window.setTimeout(go, wait);
    else go();
  };

  const hide = (wait: number) => {
    window.clearTimeout(timer.current);
    if (wait > 0) timer.current = window.setTimeout(() => setOpen(false), wait);
    else setOpen(false);
  };

  const above = side === "top";

  return (
    <a
      {...props}
      href={href}
      onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(e);
        if (e.pointerType === "touch") return;
        if (open) window.clearTimeout(timer.current);
        else show(e.currentTarget, e.clientX, delay);
      }}
      onPointerMove={(e: PointerEvent<HTMLAnchorElement>) => {
        onPointerMove?.(e);
        if (open && e.pointerType !== "touch") aim(e.currentTarget, e.clientX);
      }}
      onPointerLeave={(e: PointerEvent<HTMLAnchorElement>) => {
        onPointerLeave?.(e);
        if (e.currentTarget.matches(":focus-visible")) return;
        hide(open ? 120 : 0);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(e);
        if (e.currentTarget.matches(":focus-visible")) show(e.currentTarget, null, 0);
      }}
      onBlur={(e: FocusEvent<HTMLAnchorElement>) => {
        onBlur?.(e);
        hide(0);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLAnchorElement>) => {
        onKeyDown?.(e);
        if (e.key === "Escape" && open) hide(0);
      }}
      className={cn(
        "relative rounded-sm font-medium whitespace-nowrap text-brand-strong underline decoration-brand/35 decoration-1 underline-offset-[3px] outline-none",
        "transition-[text-decoration-color,box-shadow] duration-150 ease-settle hover:decoration-brand",
        "focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            key="preview"
            aria-hidden="true"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: above ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { opacity: 0, y: above ? 4 : -4, scale: 0.98, transition: { duration: 0.12, ease: "easeIn" } }
            }
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
            style={{ x, width, marginLeft: -width / 2, transformOrigin: above ? "50% 100%" : "50% 0%" }}
            className={cn(
              "absolute left-1/2 z-50 block font-normal whitespace-normal no-underline",
              above ? "bottom-full pb-2.5" : "top-full pt-2.5",
            )}
          >
            <span className="block rounded-xl border border-border bg-popover p-1.5 text-start shadow-lg">
              <img
                src={preview.image}
                alt=""
                draggable={false}
                className="block aspect-[16/10] w-full rounded-md bg-muted object-cover"
              />
              <span className="flex flex-col gap-0.5 px-1.5 pt-2 pb-1">
                <span className="truncate text-sm leading-5 font-medium text-foreground">{preview.title}</span>
                {preview.description != null && (
                  <span className="line-clamp-2 text-xs leading-4 text-muted-foreground">{preview.description}</span>
                )}
                <span className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">{hostOf(href)}</span>
              </span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </a>
  );
}
