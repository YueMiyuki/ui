"use client";

import {
  type CSSProperties,
  isValidElement,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type ToastTone = "neutral" | "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface ToastAction {
  label: ReactNode;
  onPress: () => void;
}

export interface ToastOptions {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  icon?: ReactNode;
  action?: ToastAction;
  duration?: number;
  onDismiss?: (id: string) => void;
}

export interface ToastPromiseMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

interface ToastRecord {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  tone: ToastTone;
  icon?: ReactNode;
  action?: ToastAction;
  duration?: number;
  onDismiss?: (id: string) => void;
  version: number;
  leaving: false | { index: number };
}

const EXIT_MS = 200;
const EMPTY: ToastRecord[] = [];
let records: ToastRecord[] = EMPTY;
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

function upsert(options: ToastOptions & { title: ReactNode }) {
  const id = options.id ?? `miyuki-toast-${++seq}`;
  const current = records.find((r) => r.id === id);
  const next: ToastRecord = {
    id,
    title: options.title,
    description: options.description,
    tone: options.tone ?? "neutral",
    icon: options.icon,
    action: options.action,
    duration: options.duration,
    onDismiss: options.onDismiss ?? current?.onDismiss,
    version: current ? current.version + 1 : 0,
    leaving: false,
  };
  records = current ? records.map((r) => (r.id === id ? next : r)) : [next, ...records];
  emit();
  return id;
}

function dismiss(id?: string) {
  const live = records.filter((r) => !r.leaving);
  const targets = id === undefined ? live : live.filter((r) => r.id === id);
  if (targets.length === 0) return;
  records = records.map((r) => (targets.includes(r) ? { ...r, leaving: { index: live.indexOf(r) } } : r));
  emit();
  for (const target of targets) {
    target.onDismiss?.(target.id);
    setTimeout(() => {
      records = records.filter((r) => r.id !== target.id || !r.leaving);
      emit();
    }, EXIT_MS);
  }
}

function isOptions(value: unknown): value is ToastOptions {
  return typeof value === "object" && value !== null && !isValidElement(value) && !Array.isArray(value);
}

type ToastInput = ReactNode | ToastOptions;
type ExtraOptions = Omit<ToastOptions, "title" | "tone">;

function create(tone: ToastTone | undefined, input: ToastInput, options?: ExtraOptions) {
  const base: ToastOptions = isOptions(input) ? input : { ...options, title: input };
  return upsert({ ...base, title: base.title ?? "", tone: tone ?? base.tone });
}

function resolve<V>(message: ReactNode | ((value: V) => ReactNode), value: V): ReactNode {
  return typeof message === "function" ? message(value) : message;
}

export const toast = Object.assign((input: ToastInput, options?: ExtraOptions) => create(undefined, input, options), {
  success: (input: ToastInput, options?: ExtraOptions) => create("success", input, options),
  error: (input: ToastInput, options?: ExtraOptions) => create("error", input, options),
  warning: (input: ToastInput, options?: ExtraOptions) => create("warning", input, options),
  info: (input: ToastInput, options?: ExtraOptions) => create("info", input, options),
  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: ToastPromiseMessages<T>,
    options?: Omit<ExtraOptions, "duration">,
  ) {
    const id = upsert({ ...options, title: messages.loading, tone: "loading", duration: Infinity });
    const settle = (tone: ToastTone, title: ReactNode) => {
      if (!records.some((r) => r.id === id && !r.leaving)) return;
      upsert({ ...options, id, tone, title });
    };
    (typeof promise === "function" ? promise() : promise).then(
      (value) => settle("success", resolve(messages.success, value)),
      (error: unknown) => settle("error", resolve(messages.error, error)),
    );
    return id;
  },
  dismiss: (id?: string) => dismiss(id),
});

const keyframes = `
@keyframes miyuki-toast-in { from { opacity: 0; transform: translateY(var(--miyuki-toast-enter)) scale(0.97); } }
@keyframes miyuki-toast-out { to { opacity: 0; transform: translate(var(--miyuki-toast-out-x), var(--miyuki-toast-out-y)) scale(0.97); } }
@keyframes miyuki-toast-fade-in { from { opacity: 0; } }
@keyframes miyuki-toast-fade-out { to { opacity: 0; } }
@keyframes miyuki-toast-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes miyuki-toast-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-toast-pulse { 50% { opacity: 0.4; } }
@keyframes miyuki-toast-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
`;

const toneColor: Record<ToastTone, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning-strong dark:text-warning",
  info: "text-brand",
  loading: "text-brand",
};

const drainColor: Record<ToastTone, string> = {
  neutral: "bg-foreground/20",
  success: "bg-success/70",
  error: "bg-destructive/70",
  warning: "bg-warning/80",
  info: "bg-brand/70",
  loading: "bg-brand/70",
};

const draw =
  "[stroke-dasharray:1] motion-safe:animate-[miyuki-toast-draw_260ms_cubic-bezier(0.22,1,0.36,1)_120ms_both]";
const appear = "motion-safe:animate-[miyuki-toast-fade-in_160ms_ease-out_260ms_both]";

function ToneIcon({ tone }: { tone: ToastTone }) {
  const [spinning, setSpinning] = useState(tone === "loading");
  if (tone === "loading" && !spinning) setSpinning(true);

  if (tone === "neutral") return null;
  if (tone === "warning") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.75 21.5 19.75H2.5Z" className="fill-current/12" />
        <path d="M12 9.75v4" pathLength={1} className={draw} />
        <path d="M12 16.9h.01" className={appear} />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g
        className={cn(
          spinning && "motion-safe:animate-[miyuki-toast-spin_0.8s_linear_infinite]",
          tone === "loading" && "motion-reduce:animate-[miyuki-toast-pulse_1.4s_ease-in-out_infinite]",
        )}
        style={{ transformOrigin: "12px 12px" }}
      >
        <circle
          cx={12}
          cy={12}
          r={9.25}
          pathLength={1}
          className="fill-current/10 transition-[stroke-dasharray,fill-opacity] duration-500 ease-settle"
          style={{
            strokeDasharray: tone === "loading" ? "0.28 1" : "1 0",
            fillOpacity: tone === "loading" ? 0 : undefined,
            transform: "rotate(-90deg)",
            transformOrigin: "12px 12px",
          }}
          onTransitionEnd={() => {
            if (tone !== "loading") setSpinning(false);
          }}
        />
      </g>
      {tone === "success" && <path key="success" d="M8.25 12.25 10.9 14.9 15.9 9.6" pathLength={1} className={draw} />}
      {tone === "error" && (
        <g key="error">
          <path d="M12 7.6v5.15" pathLength={1} className={draw} />
          <path d="M12 16.3h.01" className={appear} />
        </g>
      )}
      {tone === "info" && (
        <g key="info">
          <path d="M12 7.7h.01" className={appear} />
          <path d="M12 11v5.3" pathLength={1} className={draw} />
        </g>
      )}
    </svg>
  );
}

interface ItemProps {
  toast: ToastRecord;
  index: number;
  style: CSSProperties;
  muted: boolean;
  paused: boolean;
  duration: number;
  top: boolean;
  onHeight: (id: string, height: number) => void;
}

function ToastItem({ toast: t, index, style, muted, paused, duration, top, onHeight }: ItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; at: number } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [flung, setFlung] = useState<number | null>(null);
  const ms = t.duration ?? duration;
  const timed = t.tone !== "loading" && Number.isFinite(ms) && ms > 0;
  const leaving = t.leaving !== false;
  const x = drag ?? flung ?? 0;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => onHeight(t.id, el.offsetHeight + 2));
    observer.observe(el);
    return () => observer.disconnect();
  }, [t.id, onHeight]);

  const release = (event: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || drag == null) return setDrag(null);
    const dx = event.clientX - s.x;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - s.at);
    setDrag(null);
    if (Math.abs(dx) > 72 || (Math.abs(dx) > 16 && speed > 0.5)) {
      setFlung(dx);
      dismiss(t.id);
    }
  };

  const card = {
    "--miyuki-toast-x": `${x}px`,
    "--miyuki-toast-enter": top ? "-8px" : "8px",
    "--miyuki-toast-out-x": flung != null ? `${Math.sign(flung) * 420}px` : "0px",
    "--miyuki-toast-out-y": flung != null ? "0px" : top ? "-6px" : "6px",
    transform: x ? `translateX(${x}px)` : undefined,
    opacity: drag != null ? Math.max(0.35, 1 - Math.abs(drag) / 300) : undefined,
  } as CSSProperties;

  return (
    <div
      role={t.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      data-index={index}
      data-leaving={leaving || undefined}
      className={cn(
        "absolute inset-x-0 transition-[transform,height,opacity] duration-[420ms] ease-settle motion-reduce:transition-opacity",
        top ? "top-0 origin-bottom" : "bottom-0 origin-top",
      )}
      style={style}
    >
      <div
        className={cn(
          "relative h-full touch-pan-y overflow-clip rounded-xl border border-border bg-popover text-popover-foreground shadow-lg select-none",
          drag == null && "transition-[transform,opacity] duration-200 ease-settle",
          leaving
            ? "pointer-events-none animate-[miyuki-toast-out_180ms_ease-in_forwards] motion-reduce:animate-[miyuki-toast-fade-out_120ms_ease-in_forwards]"
            : "animate-[miyuki-toast-in_340ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-[miyuki-toast-fade-in_140ms_ease-out]",
        )}
        style={card}
        onPointerDown={(event) => {
          if (event.button !== 0 || leaving) return;
          if ((event.target as Element).closest("button, a, input, textarea, select")) return;
          start.current = { x: event.clientX, y: event.clientY, at: performance.now() };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const s = start.current;
          if (!s) return;
          const dx = event.clientX - s.x;
          const dy = event.clientY - s.y;
          if (drag == null) {
            if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
              start.current = null;
              return;
            }
            if (Math.abs(dx) < 4) return;
          }
          setDrag(dx);
        }}
        onPointerUp={release}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
      >
        <div
          ref={contentRef}
          className={cn(
            "flex items-start gap-3 py-3.5 ps-4 pe-3 transition-opacity duration-200",
            muted && "opacity-0",
          )}
        >
          {(t.icon != null || t.tone !== "neutral") && (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center transition-colors duration-300 [&_svg]:size-5",
                t.icon != null && "[&_svg]:size-[18px]",
                toneColor[t.tone],
              )}
            >
              {t.icon ?? <ToneIcon tone={t.tone} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm leading-5 font-medium text-foreground">{t.title}</div>
            {t.description != null && (
              <div className="mt-0.5 text-[13px] leading-[18px] text-pretty text-muted-foreground">{t.description}</div>
            )}
          </div>
          {t.action && (
            <Button
              size="sm"
              variant="secondary"
              className="-my-1 h-7 rounded-md px-2.5 text-[13px]"
              onPress={() => {
                t.action?.onPress();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </Button>
          )}
          <CloseButton size="md" aria-label="Dismiss" className="-my-0.5" onPress={() => dismiss(t.id)} />
        </div>
        {timed && (
          <span
            key={t.version}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[miyuki-toast-drain_linear_forwards] rtl:origin-right",
              drainColor[t.tone],
            )}
            style={{ animationDuration: `${ms}ms`, animationPlayState: paused ? "paused" : "running" }}
            onAnimationEnd={(event) => {
              if (event.animationName === "miyuki-toast-drain") dismiss(t.id);
            }}
          />
        )}
      </div>
    </div>
  );
}

const noop = () => () => {};

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export interface ToasterProps {
  position?: ToastPosition;
  duration?: number;
  visibleToasts?: number;
  gap?: number;
  offset?: number;
  label?: string;
  className?: string;
}

const PEEK = 10;
const SHRINK = 0.05;

export function Toaster({
  position = "bottom-right",
  duration = 5000,
  visibleToasts = 3,
  gap = 10,
  offset = 16,
  label = "Notifications",
  className,
}: ToasterProps) {
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
  const [heights, setHeights] = useState<Record<string, number>>({});

  const onHeight = useCallback((id: string, height: number) => {
    setHeights((old) => (old[id] === height ? old : { ...old, [id]: height }));
  }, []);

  const live = toasts.filter((t) => !t.leaving);
  if (live.length === 0 && hovered) setHovered(false);
  const expanded = (hovered || focused) && live.length > 0;
  const top = position.startsWith("top");
  const sign = top ? 1 : -1;
  const shown = live.slice(0, Math.max(1, visibleToasts));
  const heightOf = (id: string) => heights[id] ?? 64;
  const front = shown[0] ? heightOf(shown[0].id) : 0;
  const offsets: number[] = [];
  let total = 0;
  for (const t of shown) {
    offsets.push(total);
    total += heightOf(t.id) + gap;
  }
  const stack = shown.length === 0 ? 0 : expanded ? total - gap : front + PEEK * (shown.length - 1);

  if (!client) return null;

  const side: CSSProperties = position.endsWith("left")
    ? { left: offset }
    : position.endsWith("right")
      ? { right: offset }
      : { left: "50%", transform: "translateX(-50%)" };

  return createPortal(
    <section
      aria-label={label}
      className={cn("fixed z-[100]", className)}
      style={{ ...side, [top ? "top" : "bottom"]: offset, width: `min(360px, calc(100vw - ${offset * 2}px))` }}
    >
      <style href="miyuki-toast" precedence="miyuki">
        {keyframes}
      </style>
      <div
        className="relative"
        style={{ height: stack }}
        onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {toasts.map((t) => {
          const index = t.leaving ? t.leaving.index : live.indexOf(t);
          const slot = Math.min(index, shown.length - 1, visibleToasts - 1);
          const hidden = index >= visibleToasts;
          const y = expanded ? sign * (offsets[Math.max(0, slot)] ?? 0) : sign * PEEK * Math.max(0, slot);
          const scale = expanded ? 1 : 1 - SHRINK * Math.max(0, slot);
          const height = expanded || index === 0 || !front ? heights[t.id] : front;
          return (
            <ToastItem
              key={t.id}
              toast={t}
              index={index}
              top={top}
              duration={duration}
              muted={!expanded && index > 0}
              paused={expanded || pageHidden || hidden}
              onHeight={onHeight}
              style={{
                transform: `translateY(${y}px) scale(${scale})`,
                height,
                zIndex: (100 - index) * 2 + (t.leaving ? 1 : 0),
                opacity: hidden ? 0 : 1,
                pointerEvents: hidden ? "none" : undefined,
              }}
            />
          );
        })}
      </div>
    </section>,
    document.body,
  );
}
