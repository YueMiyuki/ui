"use client";

import {
  type CSSProperties,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export interface SnowToastAction {
  label: ReactNode;
  onPress: () => void;
}

export interface SnowToastOptions {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: SnowToastAction;
  duration?: number;
  onDismiss?: (id: string) => void;
}

interface SnowRecord {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: SnowToastAction;
  duration?: number;
  onDismiss?: (id: string) => void;
  melting: number | null;
  version: number;
}

const MELT_MS = 620;
const EMPTY: SnowRecord[] = [];
let records: SnowRecord[] = EMPTY;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function upsert(options: SnowToastOptions & { title: ReactNode }) {
  const id = options.id ?? `miyuki-snow-toast-${++seq}`;
  const current = records.find((r) => r.id === id);
  const next: SnowRecord = {
    id,
    title: options.title,
    description: options.description,
    icon: options.icon,
    action: options.action,
    duration: options.duration,
    onDismiss: options.onDismiss ?? current?.onDismiss,
    melting: null,
    version: current ? current.version + 1 : 0,
  };
  records = current ? records.map((r) => (r.id === id ? next : r)) : [next, ...records];
  emit();
  return id;
}

function dismiss(id?: string) {
  const targets = records.filter((r) => r.melting == null && (id === undefined || r.id === id));
  if (targets.length === 0) return;
  const at = performance.now();
  records = records.map((r) => (targets.includes(r) ? { ...r, melting: at } : r));
  emit();
  for (const target of targets) {
    target.onDismiss?.(target.id);
    setTimeout(() => {
      records = records.filter((r) => r.id !== target.id || r.melting == null);
      emit();
    }, MELT_MS);
  }
}

function isOptions(value: unknown): value is SnowToastOptions {
  return typeof value === "object" && value !== null && !isValidElement(value) && !Array.isArray(value);
}

export const snowToast = Object.assign(
  (message: ReactNode | SnowToastOptions, options?: Omit<SnowToastOptions, "title">) => {
    const base: SnowToastOptions = isOptions(message) ? message : { ...options, title: message };
    return upsert({ ...base, title: base.title ?? "" });
  },
  {
    dismiss: (id?: string) => dismiss(id),
  },
);

const keyframes = `
@keyframes miyuki-snow-toast-melt {
  0% { transform: none; border-radius: 18px; opacity: 1; filter: blur(0); }
  22% { transform: scale(1.01, 0.97) translateY(1px); border-radius: 22px 22px 18px 18px; opacity: 1; }
  58% { transform: scale(1.05, 0.58) translateY(3px); border-radius: 45% 45% 22px 22px / 70% 70% 22px 22px; opacity: 0.8; filter: blur(0.4px); }
  100% { transform: scale(1.14, 0.1) translateY(6px); border-radius: 50% 50% 40px 40px / 100% 100% 40px 40px; opacity: 0; filter: blur(2.5px); }
}
@keyframes miyuki-snow-toast-thin { to { opacity: 0; } }
@keyframes miyuki-snow-toast-puddle {
  0% { transform: scale(0.5, 0.4); opacity: 0; }
  45% { opacity: 1; }
  100% { transform: scale(1.12, 1); opacity: 0; }
}
@keyframes miyuki-snow-toast-drip {
  0% { transform: translateY(-2px) scale(0.5); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translateY(22px) scale(0.9, 1.4); opacity: 0; }
}
@keyframes miyuki-snow-toast-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes miyuki-snow-toast-fade-in { from { opacity: 0; } }
@keyframes miyuki-snow-toast-fade-out { to { opacity: 0; } }
`;

interface Flake {
  lift: number;
  v: number;
  x: number;
  rot: number;
  falling: boolean;
  born: number;
  from: number;
  phase: number;
  squash: number;
  vsquash: number;
  shown: boolean;
}

const FALL_SPEED = 620;
const SWAY = 20;

interface ItemProps {
  toast: SnowRecord;
  duration: number;
  paused: boolean;
  register: (id: string, outer: HTMLLIElement | null, body: HTMLDivElement | null) => void;
  onHeight: (id: string, height: number) => void;
  release: (id: string, keyboard: boolean) => void;
}

function SnowToastItem({ toast: t, duration, paused, register, onHeight, release }: ItemProps) {
  const outer = useRef<HTMLLIElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const ms = t.duration ?? duration;
  const timed = Number.isFinite(ms) && ms > 0;
  const melting = t.melting != null;

  useEffect(() => {
    register(t.id, outer.current, body.current);
    return () => register(t.id, null, null);
  }, [t.id, register]);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const observer = new ResizeObserver(() => onHeight(t.id, el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [t.id, onHeight]);

  return (
    <li
      ref={outer}
      tabIndex={-1}
      data-melting={melting || undefined}
      aria-label={textOf(t.title) || undefined}
      onKeyDown={(event: KeyboardEvent<HTMLLIElement>) => {
        if (event.key === "Escape" || event.key === "Delete") {
          event.preventDefault();
          event.stopPropagation();
          release(t.id, true);
        }
      }}
      onBlur={(event) => event.currentTarget.removeAttribute("data-keyboard")}
      className="group/snow absolute right-0 bottom-0 w-full rounded-[18px] opacity-0 outline-none [will-change:transform,opacity] focus-visible:ring-[3px] focus-visible:ring-ring data-[keyboard]:ring-[3px] data-[keyboard]:ring-ring"
      style={{ transform: "translate3d(0,-100vh,0)" }}
    >
      <div ref={body} className="origin-bottom">
        <div
          ref={card}
          className={cn(
            "relative origin-bottom overflow-clip rounded-[18px] border border-border bg-popover text-popover-foreground shadow-lg",
            melting &&
              "pointer-events-none animate-[miyuki-snow-toast-melt_620ms_cubic-bezier(0.45,0.05,0.55,0.95)_forwards] motion-reduce:animate-[miyuki-snow-toast-fade-out_160ms_ease-in_forwards]",
          )}
        >
          <div
            className={cn(
              "flex items-start gap-3 py-3.5 ps-4 pe-3",
              melting && "animate-[miyuki-snow-toast-thin_220ms_ease-in_forwards]",
            )}
          >
            {t.icon != null && (
              <span className="mt-px flex size-5 shrink-0 items-center justify-center text-brand [&_svg]:size-[18px]">
                {t.icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm leading-5 font-medium text-foreground">{t.title}</div>
              {t.description != null && (
                <div className="mt-0.5 text-[13px] leading-[18px] text-pretty text-muted-foreground">
                  {t.description}
                </div>
              )}
            </div>
            {t.action && (
              <Button
                size="sm"
                variant="secondary"
                className="-my-1 h-7 rounded-md px-2.5 text-[13px]"
                onPress={(event) => {
                  t.action?.onPress();
                  release(t.id, event.pointerType === "keyboard" || event.pointerType === "virtual");
                }}
              >
                {t.action.label}
              </Button>
            )}
            <CloseButton
              size="md"
              aria-label="Dismiss"
              className="-my-0.5"
              onPress={(event) => release(t.id, event.pointerType === "keyboard" || event.pointerType === "virtual")}
            />
          </div>
          {timed && !melting && (
            <span
              key={t.version}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-brand/45 rtl:origin-right",
                "animate-[miyuki-snow-toast-drain_linear_forwards] [animation-play-state:paused] group-data-[landed]/snow:[animation-play-state:running]",
              )}
              style={{ animationDuration: `${ms}ms`, ...(paused ? { animationPlayState: "paused" } : null) }}
              onAnimationEnd={(event) => {
                if (event.animationName === "miyuki-snow-toast-drain") dismiss(t.id);
              }}
            />
          )}
        </div>
        {melting && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 motion-reduce:hidden">
            <span className="absolute inset-x-[8%] -bottom-1.5 h-3 animate-[miyuki-snow-toast-puddle_620ms_ease-out_forwards] rounded-[50%] bg-brand/18 opacity-0 blur-[1px] dark:bg-brand/24" />
            <span className="absolute -bottom-1 left-[28%] size-[5px] animate-[miyuki-snow-toast-drip_480ms_ease-in_140ms_forwards] rounded-full bg-brand/45 opacity-0" />
            <span className="absolute -bottom-1 left-[63%] size-1 animate-[miyuki-snow-toast-drip_420ms_ease-in_260ms_forwards] rounded-full bg-brand/40 opacity-0" />
          </span>
        )}
      </div>
    </li>
  );
}

const noop = () => () => {};

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export interface SnowToasterProps {
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  duration?: number;
  visibleToasts?: number;
  gap?: number;
  offset?: number;
  label?: string;
  className?: string;
}

export function SnowToaster({
  position = "bottom-right",
  duration = 6000,
  visibleToasts = 4,
  gap = 10,
  offset = 16,
  label = "Notifications",
  className,
}: SnowToasterProps) {
  const toasts = useSyncExternalStore(
    subscribe,
    () => records,
    () => EMPTY,
  );
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const pageHidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const heights = useRef(new Map<string, number>());
  const nodes = useRef(new Map<string, { outer: HTMLLIElement; body: HTMLDivElement }>());
  const flakes = useRef(new Map<string, Flake>());
  const order = useRef<SnowRecord[]>([]);
  const frame = useRef(0);
  const last = useRef<number | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const returnFocus = useRef<HTMLElement | null>(null);
  const seen = useRef(new Set<string>());

  useLayoutEffect(() => {
    order.current = toasts;
  }, [toasts]);

  const live = toasts.filter((t) => t.melting == null);
  if (live.length === 0 && hovered) setHovered(false);

  useEffect(() => {
    const fresh = toasts.filter((t) => !seen.current.has(t.id) && t.melting == null);
    for (const t of toasts) seen.current.add(t.id);
    if (fresh.length) {
      const t = fresh[0];
      setAnnouncement(`${textOf(t.title)}${t.description != null ? `. ${textOf(t.description)}` : ""}`);
    }
    const alive = toasts.filter((t) => t.melting == null);
    if (alive.length > visibleToasts) for (const t of alive.slice(visibleToasts)) dismiss(t.id);
  }, [toasts, visibleToasts]);

  const stepRef = useRef<(now: number) => void>(() => {});
  const kick = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame((t) => stepRef.current(t));
  }, []);

  useLayoutEffect(() => {
    stepRef.current = (now: number) => {
      const dt = Math.min(0.033, last.current == null ? 0.016 : (now - last.current) / 1000);
      last.current = now;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const list = order.current;
      const rest = new Map<string, number>();
      let acc = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const t = list[i];
        const h = heights.current.get(t.id) ?? 64;
        const f = t.melting == null ? 1 : Math.max(0, 1 - Math.max(0, now - t.melting - 140) / (MELT_MS - 160));
        rest.set(t.id, acc);
        acc += (h + gap) * f;
      }
      const top = window.innerHeight - offset + 24;
      let busy = false;
      for (const t of list) {
        const node = nodes.current.get(t.id);
        if (!node || !heights.current.has(t.id)) {
          busy = true;
          continue;
        }
        const target = rest.get(t.id) ?? 0;
        let f = flakes.current.get(t.id);
        if (!f) {
          f = {
            lift: reduce ? target : top,
            v: 0,
            x: 0,
            rot: 0,
            falling: !reduce,
            born: now,
            from: top,
            phase: (((t.id.length * 7 + seq * 3) % 10) / 10) * Math.PI * 2,
            squash: 0,
            vsquash: 0,
            shown: false,
          };
          flakes.current.set(t.id, f);
          if (reduce) node.outer.style.animation = "miyuki-snow-toast-fade-in 160ms ease-out";
        }
        if (f.falling) {
          const e = (now - f.born) / 1000;
          const tau = 0.14;
          const fallen = FALL_SPEED * (e - tau * (1 - Math.exp(-e / tau)));
          f.lift = f.from - fallen;
          const above = f.lift - target;
          const calm = Math.max(0, Math.min(1, above / 160));
          const w = (Math.PI * 2) / 1.35;
          f.x = SWAY * Math.sin(w * e + f.phase) * calm;
          f.rot = 6 * Math.sin(w * e + f.phase + 1.2) * calm;
          if (above <= 0) {
            f.falling = false;
            f.lift = target;
            f.v = -FALL_SPEED * 0.3;
            f.x = 0;
            f.rot = 0;
            f.vsquash = 1.1;
            node.outer.setAttribute("data-landed", "");
            for (const other of list) {
              if (other.id === t.id) continue;
              const of = flakes.current.get(other.id);
              const r = rest.get(other.id) ?? 0;
              if (!of || of.falling || r >= target) continue;
              const depth = Math.round((target - r) / 70);
              of.v -= FALL_SPEED * 0.16 * 0.6 ** Math.max(0, depth - 1);
              of.vsquash += 0.45 * 0.6 ** Math.max(0, depth - 1);
            }
          }
          busy = true;
        } else if (reduce) {
          f.lift = target;
          f.v = 0;
          node.outer.setAttribute("data-landed", "");
        } else {
          const sub = 2;
          for (let s = 0; s < sub; s++) {
            const h = dt / sub;
            f.v += (240 * (target - f.lift) - 19 * f.v) * h;
            f.lift += f.v * h;
            f.vsquash += (-420 * f.squash - 16 * f.vsquash) * h;
            f.squash += f.vsquash * h;
          }
          if (
            Math.abs(f.v) > 0.5 ||
            Math.abs(target - f.lift) > 0.3 ||
            Math.abs(f.vsquash) > 0.01 ||
            Math.abs(f.squash) > 0.001
          )
            busy = true;
        }
        const s = Math.max(-0.08, Math.min(0.08, f.squash * 0.06));
        node.outer.style.transform = `translate3d(${f.x.toFixed(2)}px, ${(-f.lift).toFixed(2)}px, 0) rotate(${f.rot.toFixed(2)}deg)`;
        node.body.style.transform = s ? `scale(${(1 + s * 0.45).toFixed(4)}, ${(1 - s).toFixed(4)})` : "";
        if (!reduce || !f.shown) {
          const e = now - f.born;
          node.outer.style.opacity = reduce ? "1" : Math.min(1, e / 220).toFixed(3);
          if (e > 220 || reduce) f.shown = true;
        }
        if (t.melting != null) busy = true;
      }
      for (const id of [...flakes.current.keys()]) if (!list.some((t) => t.id === id)) flakes.current.delete(id);
      if (busy) frame.current = requestAnimationFrame((t) => stepRef.current(t));
      else {
        frame.current = 0;
        last.current = null;
      }
    };
  }, [gap, offset]);

  useEffect(() => {
    kick();
  }, [toasts, kick]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      last.current = null;
    },
    [],
  );

  const register = useCallback(
    (id: string, outer: HTMLLIElement | null, body: HTMLDivElement | null) => {
      if (outer && body) nodes.current.set(id, { outer, body });
      else nodes.current.delete(id);
      kick();
    },
    [kick],
  );

  const onHeight = useCallback(
    (id: string, height: number) => {
      heights.current.set(id, height);
      setSizes((old) => (old[id] === height ? old : { ...old, [id]: height }));
      kick();
    },
    [kick],
  );

  const stack = Math.max(0, live.reduce((sum, t) => sum + (sizes[t.id] ?? 0) + gap, 0) - gap);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.altKey && event.code === "KeyT")) return;
      const newest = order.current.find((t) => t.melting == null);
      if (!newest) return;
      event.preventDefault();
      if (
        !returnFocus.current ||
        !document.querySelector("[data-miyuki-snow-toaster]")?.contains(document.activeElement)
      )
        returnFocus.current = document.activeElement as HTMLElement | null;
      const el = nodes.current.get(newest.id)?.outer;
      el?.setAttribute("data-keyboard", "");
      el?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const release = useCallback((id: string, keyboard: boolean) => {
    const within = nodes.current.get(id)?.outer.contains(document.activeElement) ?? false;
    dismiss(id);
    if (!within || !keyboard) return;
    const next = order.current.find((t) => t.melting == null && t.id !== id);
    const el = next ? nodes.current.get(next.id)?.outer : null;
    if (el) {
      el.setAttribute("data-keyboard", "");
      el.focus();
    } else {
      returnFocus.current?.focus?.();
      returnFocus.current = null;
    }
  }, []);

  if (!client) return null;

  const side: CSSProperties =
    position === "bottom-left"
      ? { left: offset }
      : position === "bottom-right"
        ? { right: offset }
        : { left: "50%", transform: "translateX(-50%)" };

  return createPortal(
    <section
      data-miyuki-snow-toaster=""
      aria-label={`${label} (Alt+T)`}
      className={cn("pointer-events-none fixed z-[100]", className)}
      style={{ ...side, bottom: offset, width: `min(360px, calc(100vw - ${offset * 2}px))` }}
    >
      <style href="miyuki-snow-toast" precedence="miyuki">
        {keyframes}
      </style>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <ol
        className="pointer-events-auto relative"
        style={{ height: stack }}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
        onFocus={(event) => {
          setFocused(true);
          const from = event.relatedTarget as HTMLElement | null;
          if (from && !event.currentTarget.contains(from)) returnFocus.current = from;
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {toasts.map((t) => (
          <SnowToastItem
            key={t.id}
            toast={t}
            duration={duration}
            paused={hovered || focused || pageHidden}
            register={register}
            onHeight={onHeight}
            release={release}
          />
        ))}
      </ol>
    </section>,
    document.body,
  );
}
