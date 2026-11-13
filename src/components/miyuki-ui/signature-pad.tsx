"use client";

import { Eraser, Undo2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/miyuki-ui/button";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { Switch } from "@/components/miyuki-ui/switch";
import { cn } from "@/lib/utils";

export interface SignaturePoint {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

export type SignatureStroke = SignaturePoint[];

export interface SignaturePadHandle {
  toDataURL: (type?: string, quality?: number) => string;
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
  strokes: () => SignatureStroke[];
  name: () => string;
}

export interface SignaturePadProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  onChange?: (strokes: SignatureStroke[]) => void;
  onNameChange?: (name: string) => void;
  color?: string;
  height?: number;
  label?: ReactNode;
  isDisabled?: boolean;
  ref?: Ref<SignaturePadHandle>;
}

const MIN_W = 0.8;
const MAX_W = 5.4;
const FAST = 2.2;
const BLEED_MS = 520;
const SCRIPT = '"Snell Roundhand", "Segoe Script", "Brush Script MT", "Apple Chancery", cursive';
const NAME_SIZE = 34;
const NAME_LEFT = 42;

interface Sample {
  x: number;
  y: number;
  w: number;
}

function widths(points: SignaturePoint[]): Sample[] {
  const out: Sample[] = [];
  let speed = 0;
  let w = MAX_W * 0.82;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const q = points[i - 1];
      const dt = Math.max(1, p.time - q.time);
      const v = Math.hypot(p.x - q.x, p.y - q.y) / dt;
      speed = speed * 0.72 + v * 0.28;
    }
    let target = MAX_W - (MAX_W - MIN_W) * Math.min(1, speed / FAST) ** 0.62;
    if (p.pressure !== undefined) target *= 0.55 + p.pressure * 0.9;
    w = i === 0 ? target * 0.92 : w * 0.7 + target * 0.3;
    out.push({ x: p.x, y: p.y, w });
  }
  return out;
}

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function drawSpan(ctx: CanvasRenderingContext2D, s: Sample[], from: number) {
  ctx.beginPath();
  if (s.length === 1) {
    stamp(ctx, s[0].x, s[0].y, s[0].w / 2);
    ctx.fill();
    return;
  }
  for (let i = Math.max(1, from); i < s.length; i++) {
    const a = s[i - 2] ?? s[i - 1];
    const b = s[i - 1];
    const c = s[i];
    const start = i === 1 ? { x: a.x, y: a.y, w: a.w } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: (a.w + b.w) / 2 };
    const end = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2, w: (b.w + c.w) / 2 };
    const length = Math.hypot(b.x - start.x, b.y - start.y) + Math.hypot(end.x - b.x, end.y - b.y);
    const steps = Math.max(1, Math.ceil(length / Math.max(0.35, Math.min(start.w, end.w) * 0.22)));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const u = 1 - t;
      const x = u * u * start.x + 2 * u * t * b.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * b.y + t * t * end.y;
      stamp(ctx, x, y, (start.w + (end.w - start.w) * t) / 2);
    }
  }
  ctx.fill();
}

function drawTail(ctx: CanvasRenderingContext2D, s: Sample[]) {
  if (s.length < 2) return;
  const a = s[s.length - 2];
  const b = s[s.length - 1];
  const start = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: (a.w + b.w) / 2 };
  const length = Math.hypot(b.x - start.x, b.y - start.y);
  const steps = Math.max(1, Math.ceil(length / 0.5));
  ctx.beginPath();
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    stamp(ctx, start.x + (b.x - start.x) * t, start.y + (b.y - start.y) * t, (start.w + (b.w * 0.7 - start.w) * t) / 2);
  }
  ctx.fill();
}

interface Bleed {
  x: number;
  y: number;
  w: number;
  born: number;
  lobes: { dx: number; dy: number; k: number }[];
}

function drawBleed(ctx: CanvasRenderingContext2D, b: Bleed, progress: number, ink: Rgba) {
  const ease = 1 - (1 - progress) ** 3;
  const radius = b.w * (0.5 + 0.48 * ease);
  const rgb = `${ink[0] * 255}, ${ink[1] * 255}, ${ink[2] * 255}`;
  for (const lobe of b.lobes) {
    const r = radius * lobe.k;
    const x = b.x + lobe.dx * b.w * ease;
    const y = b.y + lobe.dy * b.w * ease;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, 0.5)`);
    g.addColorStop(0.55, `rgba(${rgb}, 0.36)`);
    g.addColorStop(0.85, `rgba(${rgb}, 0.12)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function SignaturePad({
  onChange,
  onNameChange,
  color = "var(--foreground)",
  height = 200,
  label,
  isDisabled = false,
  className,
  ref,
  ...props
}: SignaturePadProps) {
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const padRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const bleedRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<SignatureStroke[]>([]);
  const bleeds = useRef<Bleed[]>([]);
  const live = useRef<{ stroke: SignatureStroke; samples: Sample[]; id: number } | null>(null);
  const view = useRef({ ink: [0, 0, 0, 1] as Rgba, dpr: 1, w: 0, h: 0, redraw: () => {}, animate: () => {} });
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const name = typing ? typed.trim() : "";

  const emit = () => {
    setCount(strokes.current.length);
    onChange?.(strokes.current.map((s) => s.slice()));
  };

  const switchTyping = (on: boolean) => {
    setTyping(on);
    onChange?.(on ? [] : strokes.current.map((s) => s.slice()));
    onNameChange?.(on ? typed.trim() : "");
    if (on) requestAnimationFrame(() => nameRef.current?.focus());
  };

  const changeName = (next: string) => {
    setTyped(next);
    onNameChange?.(next.trim());
  };

  useEffect(() => {
    const pad = padRef.current;
    const ink = inkRef.current;
    const bleed = bleedRef.current;
    const ictx = ink?.getContext("2d");
    const bctx = bleed?.getContext("2d");
    if (!pad || !ink || !bleed || !ictx || !bctx) return;
    const v = view.current;
    let raf = 0;

    const fillStyle = () => {
      const [r, g, b, a] = v.ink;
      return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
    };

    const paintBleeds = (now: number) => {
      bctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      bctx.clearRect(0, 0, v.w, v.h);
      let growing = false;
      for (const b of bleeds.current) {
        const p = reduce ? 1 : Math.min(1, (now - b.born) / BLEED_MS);
        if (p < 1) growing = true;
        drawBleed(bctx, b, p, v.ink);
      }
      return growing;
    };

    const tick = () => {
      raf = 0;
      if (paintBleeds(performance.now())) raf = requestAnimationFrame(tick);
    };

    v.animate = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    v.redraw = () => {
      ictx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      ictx.clearRect(0, 0, v.w, v.h);
      ictx.fillStyle = fillStyle();
      for (const s of strokes.current) {
        const samples = widths(s);
        drawSpan(ictx, samples, 1);
        drawTail(ictx, samples);
      }
      if (live.current) drawSpan(ictx, live.current.samples, 1);
      paintBleeds(performance.now());
      v.animate();
    };

    const resize = () => {
      const was = { w: v.w, h: v.h };
      v.dpr = Math.min(2, window.devicePixelRatio || 1);
      v.w = pad.clientWidth;
      v.h = pad.clientHeight;
      if (was.w > 0 && v.w > 0 && was.w !== v.w) {
        const k = v.w / was.w;
        for (const stroke of strokes.current) {
          for (const point of stroke) {
            point.x *= k;
            point.y = (point.y - was.h / 2) * k + v.h / 2;
          }
        }
      }
      for (const c of [ink, bleed]) {
        c.width = Math.round(v.w * v.dpr);
        c.height = Math.round(v.h * v.dpr);
      }
      v.redraw();
    };

    v.ink = toRgba(color, ink);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(pad);
    const media = window.matchMedia(`(resolution: ${v.dpr}dppx)`);
    const onDpr = () => resize();
    media.addEventListener("change", onDpr);
    const offTheme = onThemeChange(() => {
      v.ink = toRgba(color, ink);
      v.redraw();
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      media.removeEventListener("change", onDpr);
      offTheme();
      v.redraw = () => {};
      v.animate = () => {};
    };
  }, [color, reduce]);

  const point = (e: PointerEvent | ReactPointerEvent): SignaturePoint => {
    const rect = padRef.current!.getBoundingClientRect();
    const p: SignaturePoint = { x: e.clientX - rect.left, y: e.clientY - rect.top, time: e.timeStamp };
    if (e.pointerType === "pen" && e.pressure > 0) p.pressure = e.pressure;
    return p;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDisabled || typing || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const first = point(e);
    const stroke = [first];
    const samples = widths(stroke);
    live.current = { stroke, samples, id: e.pointerId };
    const ctx = inkRef.current?.getContext("2d");
    if (ctx) {
      ctx.setTransform(view.current.dpr, 0, 0, view.current.dpr, 0, 0);
      const [r, g, b, a] = view.current.ink;
      ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
      drawSpan(ctx, samples, 1);
    }
    bleeds.current.push({
      x: first.x,
      y: first.y,
      w: samples[0].w,
      born: performance.now(),
      lobes: Array.from({ length: 6 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + Math.random() * 0.8;
        const d = i === 0 ? 0 : 0.28 + Math.random() * 0.3;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, k: i === 0 ? 1.15 : 0.55 + Math.random() * 0.35 };
      }),
    });
    view.current.animate();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const from = l.samples.length;
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const p = point(ev);
      const prev = l.stroke[l.stroke.length - 1];
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 0.6) continue;
      l.stroke.push(p);
    }
    if (l.stroke.length === from) return;
    l.samples = widths(l.stroke);
    const ctx = inkRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(view.current.dpr, 0, 0, view.current.dpr, 0, 0);
    const [r, g, b, a] = view.current.ink;
    ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
    drawSpan(ctx, l.samples, Math.max(1, from));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    live.current = null;
    strokes.current.push(l.stroke);
    const ctx = inkRef.current?.getContext("2d");
    if (ctx) drawTail(ctx, l.samples);
    emit();
  };

  const undo = () => {
    if (!strokes.current.length) return;
    strokes.current.pop();
    bleeds.current.pop();
    view.current.redraw();
    emit();
  };

  const clear = () => {
    if (typing) return changeName("");
    if (!strokes.current.length) return;
    strokes.current = [];
    bleeds.current = [];
    view.current.redraw();
    emit();
  };

  useImperativeHandle(ref, () => ({
    toDataURL: (type = "image/png", quality?: number) => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(view.current.w * scale));
      canvas.height = Math.max(1, Math.round(view.current.h * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const [r, g, bl, a] = view.current.ink;
        ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${bl * 255}, ${a})`;
        if (typing) {
          ctx.font = `${NAME_SIZE}px ${SCRIPT}`;
          const room = view.current.w - NAME_LEFT - 24;
          const wide = ctx.measureText(name).width;
          if (wide > room) ctx.font = `${(NAME_SIZE * room) / wide}px ${SCRIPT}`;
          ctx.fillText(name, NAME_LEFT, height * 0.7 - 4);
        } else {
          for (const b of bleeds.current) drawBleed(ctx, b, 1, view.current.ink);
          for (const s of strokes.current) {
            const samples = widths(s);
            drawSpan(ctx, samples, 1);
            drawTail(ctx, samples);
          }
        }
      }
      return canvas.toDataURL(type, quality);
    },
    clear,
    undo,
    isEmpty: () => (typing ? name === "" : strokes.current.length === 0),
    strokes: () => (typing ? [] : strokes.current.map((s) => s.slice())),
    name: () => name,
  }));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  };

  const status = typing
    ? name
      ? "Signed with a typed name"
      : "No signature yet"
    : count === 0
      ? "No signature yet"
      : count === 1
        ? "Signed, 1 stroke"
        : `Signed, ${count} strokes`;

  return (
    <div
      {...props}
      className={cn("flex w-full flex-col gap-1.5", isDisabled && "opacity-50", className)}
      data-disabled={isDisabled || undefined}
    >
      <div className="flex min-h-5 items-center justify-between gap-3">
        {label != null ? (
          <span id={`${id}-label`} className="min-w-0 text-sm font-medium text-foreground">
            {label}
          </span>
        ) : (
          <span />
        )}
        <Switch size="sm" isSelected={typing} onChange={switchTyping} isDisabled={isDisabled} className="shrink-0">
          Type instead
        </Switch>
      </div>
      <div
        ref={padRef}
        role={typing ? undefined : "img"}
        tabIndex={isDisabled || typing ? -1 : 0}
        aria-labelledby={typing ? undefined : label != null ? `${id}-label ${id}-status` : `${id}-status`}
        aria-describedby={typing ? undefined : `${id}-hint`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "relative touch-none overflow-hidden rounded-xl border border-border bg-card shadow-xs outline-none select-none",
          "transition-[box-shadow,border-color] duration-150 ease-settle focus-visible:ring-[3px] focus-visible:ring-ring",
          "has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring",
          isDisabled ? "cursor-not-allowed" : typing ? "cursor-text" : "cursor-crosshair",
        )}
        style={{ height }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply dark:opacity-[0.07] dark:mix-blend-screen"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.35 0 0 0 0 0.45 0 0 0 1.2 -0.2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23f)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 flex items-end gap-2"
          style={{ top: height * 0.7 - 12 }}
        >
          <svg viewBox="0 0 10 10" className="mb-1.5 size-2.5 shrink-0 text-muted-foreground">
            <path
              d="M 1.5 1.5 L 8.5 8.5 M 8.5 1.5 L 1.5 8.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="mb-0 h-px flex-1 bg-border-strong" />
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-6 text-xs text-muted-foreground transition-opacity duration-200 ease-settle",
            (count > 0 || typing) && "opacity-0",
          )}
          style={{ top: height * 0.7 + 6 }}
        >
          Sign above the line
        </span>
        <canvas
          ref={bleedRef}
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0 size-full", typing && "invisible")}
        />
        <canvas
          ref={inkRef}
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0 size-full", typing && "invisible")}
        />
        {typing && (
          <input
            ref={nameRef}
            value={typed}
            onChange={(e) => changeName(e.target.value)}
            disabled={isDisabled}
            autoComplete="name"
            spellCheck={false}
            placeholder="Type your name"
            aria-labelledby={label != null ? `${id}-label` : undefined}
            aria-label={label == null ? "Your name" : undefined}
            className="absolute right-6 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
            style={{
              left: NAME_LEFT,
              top: height * 0.7 - 44,
              height: 52,
              fontFamily: SCRIPT,
              fontSize: NAME_SIZE,
              lineHeight: "52px",
            }}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-status`} aria-live="polite" className="text-[13px] text-muted-foreground">
          {status}
        </span>
        <span id={`${id}-hint`} className="sr-only">
          Draw with a mouse, pen or finger, or turn on Type instead to type your name. Press Control or Command and Z to
          undo the last stroke.
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            iconStart={<Undo2 />}
            isDisabled={isDisabled || typing || count === 0}
            onPress={undo}
          >
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconStart={<Eraser />}
            isDisabled={isDisabled || (typing ? typed === "" : count === 0)}
            onPress={clear}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
