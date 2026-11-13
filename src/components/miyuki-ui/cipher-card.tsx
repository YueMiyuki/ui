"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type PointerEvent, useEffect, useMemo, useRef } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface CipherCardProps extends Omit<ComponentProps<"div">, "children"> {
  text?: string;
  charset?: string;
  radius?: number;
  colors?: [string, string];
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const FIELD = 2400;
const THROTTLE = 70;
const SHARE = 0.35;
const AT = "at var(--miyuki-cipher-card-x, 50%) var(--miyuki-cipher-card-y, 50%)";

function write(field: HTMLElement, value: string) {
  const node = field.firstChild;
  if (node instanceof Text && !node.nextSibling) node.data = value;
  else field.textContent = value;
}

function Mark({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={cn("pointer-events-none absolute size-2.5 text-muted-foreground/70", className)}
    >
      <path d="M5 0.5v9M0.5 5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CipherCard({
  text = "",
  charset = DEFAULT_CHARSET,
  radius = 220,
  colors = ["var(--brand)", "var(--chart-3)"],
  className,
  style,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: CipherCardProps) {
  const reduced = useReducedMotion() ?? false;
  const fieldRef = useRef<HTMLDivElement>(null);
  const glyphs = useRef<string[]>([]);
  const lastScramble = useRef(0);
  const pool = useMemo(() => [...(charset || DEFAULT_CHARSET)], [charset]);

  const initial = useMemo(() => {
    const rng = createRng(`cipher:${charset}`);
    return Array.from({ length: FIELD }, () => rng.pick(pool));
  }, [charset, pool]);

  useEffect(() => {
    glyphs.current = [...initial];
    const field = fieldRef.current;
    if (!field) return;
    write(field, glyphs.current.join(""));
    const fill = () => {
      const probe = field.firstChild instanceof Text ? field : null;
      if (!probe) return;
      const cols = Math.ceil(field.clientWidth / 6) + 2;
      const lines = Math.ceil(field.clientHeight / 14) + 2;
      const needed = cols * lines;
      const list = glyphs.current;
      if (list.length >= needed) return;
      while (list.length < needed) list.push(pool[Math.floor(Math.random() * pool.length)]);
      write(field, list.join(""));
    };
    fill();
    const ro = new ResizeObserver(fill);
    ro.observe(field);
    return () => ro.disconnect();
  }, [initial, pool]);

  const scramble = (force = false) => {
    const field = fieldRef.current;
    if (!field || reduced) return;
    const now = performance.now();
    if (!force && now - lastScramble.current < THROTTLE) return;
    lastScramble.current = now;
    const list = glyphs.current;
    const swaps = Math.floor(list.length * SHARE);
    for (let k = 0; k < swaps; k++) {
      list[Math.floor(Math.random() * list.length)] = pool[Math.floor(Math.random() * pool.length)];
    }
    write(field, list.join(""));
  };

  function aim(el: HTMLElement, x: number, y: number) {
    const rect = el.getBoundingClientRect();
    const sx = el.offsetWidth / (rect.width || 1);
    const sy = el.offsetHeight / (rect.height || 1);
    el.style.setProperty("--miyuki-cipher-card-x", `${((x - rect.left) * sx).toFixed(1)}px`);
    el.style.setProperty("--miyuki-cipher-card-y", `${((y - rect.top) * sy).toFixed(1)}px`);
  }

  const timer = useRef(0);
  const stopCycle = () => {
    window.clearInterval(timer.current);
    timer.current = 0;
  };
  useEffect(() => stopCycle, []);

  const mouse = (e: PointerEvent) => e.pointerType !== "touch";
  const [from, to] = colors;

  return (
    <div
      tabIndex={0}
      role="img"
      aria-label={text || "Cipher card"}
      {...props}
      className={cn(
        "group/cipher relative isolate overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring",
        "[--miyuki-cipher-card-wash:10%] dark:[--miyuki-cipher-card-wash:20%]",
        className,
      )}
      style={
        {
          "--miyuki-cipher-card-r": `${radius}px`,
          "--miyuki-cipher-card-from": from,
          "--miyuki-cipher-card-to": to,
          ...style,
        } as CSSProperties
      }
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (!mouse(e)) return;
        aim(e.currentTarget, e.clientX, e.clientY);
        e.currentTarget.setAttribute("data-lit", "");
        scramble(true);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!mouse(e)) return;
        aim(e.currentTarget, e.clientX, e.clientY);
        e.currentTarget.setAttribute("data-lit", "");
        scramble();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (!mouse(e) || e.currentTarget.matches(":focus-visible")) return;
        e.currentTarget.removeAttribute("data-lit");
      }}
      onFocus={(e) => {
        onFocus?.(e);
        const el = e.currentTarget;
        if (e.target !== el || !el.matches(":focus-visible")) return;
        el.style.setProperty("--miyuki-cipher-card-x", "50%");
        el.style.setProperty("--miyuki-cipher-card-y", "50%");
        el.setAttribute("data-lit", "");
        stopCycle();
        if (!reduced) timer.current = window.setInterval(() => scramble(true), 140);
      }}
      onBlur={(e) => {
        onBlur?.(e);
        stopCycle();
        e.currentTarget.removeAttribute("data-lit");
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/cipher:opacity-100"
        style={{
          background: `radial-gradient(var(--miyuki-cipher-card-r) circle ${AT}, color-mix(in oklab, var(--miyuki-cipher-card-from) var(--miyuki-cipher-card-wash), transparent), transparent 70%)`,
        }}
      />
      <div
        ref={fieldRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-px -z-10 overflow-hidden px-1 font-mono text-[11px] leading-[14px] font-medium break-all whitespace-normal text-transparent select-none",
          "bg-clip-text opacity-0 transition-opacity duration-300 ease-settle group-data-[lit]/cipher:opacity-100",
        )}
        style={{
          backgroundImage: `radial-gradient(var(--miyuki-cipher-card-r) circle ${AT}, var(--miyuki-cipher-card-from) 8%, color-mix(in oklab, var(--miyuki-cipher-card-from) 45%, var(--miyuki-cipher-card-to)) 38%, var(--miyuki-cipher-card-to) 70%)`,
          maskImage: `radial-gradient(var(--miyuki-cipher-card-r) circle ${AT}, #000 0%, rgb(0 0 0 / 0.75) 30%, transparent 72%)`,
          WebkitMaskImage: `radial-gradient(var(--miyuki-cipher-card-r) circle ${AT}, #000 0%, rgb(0 0 0 / 0.75) 30%, transparent 72%)`,
        }}
      >
        {initial.join("")}
      </div>
      <Mark className="top-3 left-3" />
      <Mark className="top-3 right-3" />
      <Mark className="bottom-3 left-3" />
      <Mark className="right-3 bottom-3" />
      {text ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className={cn(
              "relative grid size-32 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg",
              "dark:border-transparent dark:bg-primary dark:text-primary-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className="absolute inset-1.5 rounded-full border border-dashed border-foreground/15 dark:border-primary-foreground/20"
            />
            <span className="font-display text-2xl font-semibold tracking-[-0.02em]">{text}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
