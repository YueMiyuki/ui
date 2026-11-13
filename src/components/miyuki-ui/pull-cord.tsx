"use client";

import { useReducedMotion } from "motion/react";
import { type HTMLAttributes, type Ref, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PullCordSize = "sm" | "md" | "lg";

export interface PullCordProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  pulled?: boolean;
  defaultPulled?: boolean;
  onPull?: (pulled: boolean) => void;
  length?: number;
  label?: string;
  size?: PullCordSize;
  isDisabled?: boolean;
  sound?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const beads: Record<PullCordSize, { w: number; h: number; cord: number }> = {
  sm: { w: 14, h: 18, cord: 1.25 },
  md: { w: 18, h: 23, cord: 1.5 },
  lg: { w: 22, h: 28, cord: 1.75 },
};

const MOUNT = 9;
const WIDTH = 64;
const STIFF = 520;
const GRAVITY = 2600;
const RADIAL = 14;
const SWING = 1.6;
const DROP = "M10 1.2C10 1.2 2 10.6 2 17A8 8 0 0 0 18 17C18 10.6 10 1.2 10 1.2Z";

let audio: AudioContext | null = null;
function click() {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const length = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2200;
    band.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    source.connect(band).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    audio = null;
  }
}

export function PullCord({
  pulled,
  defaultPulled = false,
  onPull,
  length = 120,
  label = "Light",
  size = "md",
  isDisabled = false,
  sound = false,
  className,
  style,
  onPointerMove,
  ref,
  ...props
}: PullCordProps) {
  const reduce = useReducedMotion() ?? false;
  const [own, setOwn] = useState(defaultPulled);
  const on = pulled ?? own;
  const bead = beads[size];
  const threshold = Math.round(Math.min(56, Math.max(24, length * 0.3)));
  const height = MOUNT + length + bead.h + threshold + 12;
  const clip = `miyuki-pull-cord-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const root = useRef<HTMLDivElement | null>(null);
  const cordRef = useRef<SVGPathElement>(null);
  const beadRef = useRef<HTMLButtonElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<{
    grab: (event: PointerEvent) => void;
    script: () => void;
    nudge: (event: PointerEvent) => void;
  } | null>(null);
  const state = useRef({ on, controlled: pulled !== undefined, onPull, sound, disabled: isDisabled });

  useEffect(() => {
    state.current = { on, controlled: pulled !== undefined, onPull, sound, disabled: isDisabled };
  });

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      root.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const toggle = useCallback(() => {
    const s = state.current;
    const next = !s.on;
    if (!s.controlled) setOwn(next);
    s.on = next;
    s.onPull?.(next);
    if (s.sound) click();
    const mount = mountRef.current;
    if (mount) {
      mount.style.translate = "-50% 1.5px";
      setTimeout(() => {
        mount.style.translate = "";
      }, 90);
    }
  }, []);

  useEffect(() => {
    const cord = cordRef.current;
    const el = beadRef.current;
    if (!cord || !el) return;
    const ax = WIDTH / 2;
    const ay = MOUNT;
    const rest = length;
    const natural = rest - GRAVITY / STIFF;
    const p = { x: 0, y: rest, vx: 0, vy: 0 };
    let detent = 0;
    let detentV = 0;
    let frame = 0;
    let last = 0;
    let drag: null | {
      id: number;
      ox: number;
      oy: number;
      tx: number;
      ty: number;
      startX: number;
      startY: number;
      at: number;
      moved: number;
      clicked: boolean;
    } = null;
    let script: null | { start: number; clicked: boolean } = null;
    let suppress = false;
    const pointer = { x: 0, y: 0, t: 0, side: 0 };

    const draw = () => {
      const d = Math.hypot(p.x, p.y);
      const bx = ax + p.x;
      const by = ay + p.y + detent;
      const width = bead.cord * Math.min(1.15, Math.max(0.55, Math.sqrt(rest / Math.max(d, 1))));
      if (d < natural - 0.5) {
        const sag = Math.sqrt(Math.max(0, natural * natural - d * d)) * 0.5;
        const nx = -p.y / Math.max(d, 1);
        const ny = p.x / Math.max(d, 1);
        const dir = p.vx >= 0 ? 1 : -1;
        cord.setAttribute(
          "d",
          `M${ax} ${ay}Q${(ax + p.x / 2 + nx * sag * dir).toFixed(2)} ${(ay + p.y / 2 + ny * sag * dir).toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)}`,
        );
      } else {
        cord.setAttribute("d", `M${ax} ${ay}L${bx.toFixed(2)} ${by.toFixed(2)}`);
      }
      cord.style.strokeWidth = width.toFixed(2);
      const angle = (-Math.atan2(p.x, p.y) * 180) / Math.PI;
      el.style.transform = `translate(${(bx - bead.w / 2).toFixed(2)}px, ${(by - 1).toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
    };

    const crossing = (clicked: boolean) => {
      const pull = Math.hypot(p.x, p.y) - rest;
      if (!clicked && pull >= threshold) {
        toggle();
        detentV = 260;
        return true;
      }
      return clicked;
    };

    const step = (dt: number) => {
      const d = Math.max(0.001, Math.hypot(p.x, p.y));
      const ux = p.x / d;
      const uy = p.y / d;
      let fx = 0;
      let fy = GRAVITY;
      const ext = d - natural;
      if (ext > 0) {
        fx -= STIFF * ext * ux;
        fy -= STIFF * ext * uy;
      }
      const vr = p.vx * ux + p.vy * uy;
      const tx = p.vx - vr * ux;
      const ty = p.vy - vr * uy;
      const radial = ext > 0 ? RADIAL : 1;
      fx -= radial * vr * ux + SWING * tx;
      fy -= radial * vr * uy + SWING * ty;
      p.vx += fx * dt;
      p.vy += fy * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      detentV += (-900 * detent - 30 * detentV) * dt;
      detent += detentV * dt;
      if (drag) {
        const k = 1 - Math.exp(-dt * 38);
        const nx = p.x + (drag.tx - p.x) * k;
        const ny = p.y + (drag.ty - p.y) * k;
        p.vx = dt > 0 ? (nx - p.x) / dt : 0;
        p.vy = dt > 0 ? (ny - p.y) / dt : 0;
        p.x = nx;
        p.y = ny;
        drag.clicked = crossing(drag.clicked);
      } else if (script) {
        const u = Math.min(1, (now - script.start) / 150);
        const e = 1 - (1 - u) ** 3;
        const ny = rest + (threshold + 7) * e;
        p.vx = 0;
        p.vy = dt > 0 ? (ny - p.y) / dt : 0;
        p.x *= 0.8;
        p.y = ny;
        script.clicked = crossing(script.clicked);
        if (u >= 1) {
          script = null;
          p.vy = 0;
        }
      } else {
        const sub = 4;
        for (let i = 0; i < sub; i++) step(dt / sub);
      }
      draw();
      const settled =
        !drag &&
        !script &&
        Math.abs(p.vx) < 2 &&
        Math.abs(p.vy) < 2 &&
        Math.abs(p.x) < 0.25 &&
        Math.abs(p.y - rest) < 0.25 &&
        Math.abs(detent) < 0.05;
      if (settled) {
        p.x = 0;
        p.y = rest;
        p.vx = p.vy = 0;
        detent = 0;
        draw();
        frame = 0;
      } else {
        frame = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const local = (event: PointerEvent) => {
      const box = (root.current ?? el).getBoundingClientRect();
      return { x: event.clientX - box.left - ax, y: event.clientY - box.top - ay };
    };

    const soften = (x: number, y: number) => {
      const sx = x / (1 + Math.abs(x) / 70);
      const d = Math.hypot(sx, y);
      if (d <= rest) return { x: sx, y };
      const ext = d - rest;
      const eff = ext / (1 + ext / (threshold * 4.5));
      const s = (rest + eff) / d;
      return { x: sx * s, y: y * s };
    };

    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const q = local(event);
      const target = soften(q.x - drag.ox, q.y - drag.oy);
      drag.tx = target.x;
      drag.ty = target.y;
      drag.moved = Math.max(drag.moved, Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY));
    };

    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const tap = drag.moved < 4 && performance.now() - drag.at < 400;
      drag = null;
      el.releasePointerCapture?.(event.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      suppress = true;
      setTimeout(() => {
        suppress = false;
      }, 0);
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 1600) {
        p.vx *= 1600 / speed;
        p.vy *= 1600 / speed;
      }
      if (tap) engine.current?.script();
      else if (reduce) {
        p.x = 0;
        p.y = rest;
        p.vx = p.vy = 0;
        draw();
      }
      wake();
    };

    engine.current = {
      grab: (event) => {
        if (state.current.disabled) return;
        const q = local(event);
        drag = {
          id: event.pointerId,
          ox: q.x - p.x,
          oy: q.y - p.y,
          tx: p.x,
          ty: p.y,
          startX: event.clientX,
          startY: event.clientY,
          at: performance.now(),
          moved: 0,
          clicked: false,
        };
        script = null;
        el.setPointerCapture?.(event.pointerId);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        wake();
      },
      script: () => {
        if (state.current.disabled) return;
        if (reduce) {
          toggle();
          return;
        }
        script = { start: performance.now(), clicked: false };
        wake();
      },
      nudge: (event) => {
        if (drag || script || reduce || state.current.disabled) return;
        const q = local(event);
        const now = performance.now();
        const dtp = Math.max(1, now - pointer.t);
        const vx = ((q.x - pointer.x) / dtp) * 1000;
        const span = Math.max(1, p.y);
        const cross = p.x * q.y - p.y * q.x;
        const side = Math.sign(cross);
        const near = q.y > 0 && q.y < span + bead.h && Math.abs(cross) / Math.max(1, Math.hypot(p.x, p.y)) < 16;
        if (near && pointer.side !== 0 && side !== pointer.side && now - pointer.t < 80) {
          const reach = Math.min(1, q.y / span);
          p.vx += Math.max(-170, Math.min(170, vx * 0.2)) * (0.35 + 0.65 * reach);
          wake();
        }
        pointer.x = q.x;
        pointer.y = q.y;
        pointer.t = now;
        pointer.side = side;
      },
    };

    const onClick = (event: MouseEvent) => {
      if (suppress) {
        event.preventDefault();
        return;
      }
      engine.current?.script();
    };
    el.addEventListener("click", onClick);
    draw();

    return () => {
      el.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(frame);
      engine.current = null;
    };
  }, [length, threshold, bead.w, bead.h, bead.cord, reduce, toggle]);

  return (
    <div
      {...props}
      ref={setRef}
      className={cn("relative inline-block shrink-0 select-none", isDisabled && "opacity-50", className)}
      style={{ width: WIDTH, height, ...style }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") engine.current?.nudge(event.nativeEvent);
        onPointerMove?.(event);
      }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground"
        width={WIDTH}
        height={height}
      >
        <path
          ref={cordRef}
          d={`M${WIDTH / 2} ${MOUNT}L${WIDTH / 2} ${MOUNT + length}`}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={bead.cord}
        />
      </svg>
      <span
        ref={mountRef}
        aria-hidden="true"
        className="absolute top-0 left-1/2 h-[9px] w-7 -translate-x-1/2 rounded-b-[5px] rounded-t-[2px] border border-border-strong bg-card shadow-xs transition-transform duration-75"
      />
      <button
        ref={beadRef}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={isDisabled}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          engine.current?.grab(event.nativeEvent);
        }}
        className={cn(
          "group/bead absolute top-0 left-0 origin-[50%_1px] cursor-grab touch-none rounded-full outline-none active:cursor-grabbing",
          "before:absolute before:-inset-3 before:content-['']",
          "focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default",
        )}
        style={{
          width: bead.w,
          height: bead.h,
          transform: `translate(${WIDTH / 2 - bead.w / 2}px, ${MOUNT + length - 1}px)`,
        }}
      >
        <svg viewBox="0 0 20 26" width={bead.w} height={bead.h} className="pointer-events-none block overflow-visible">
          <defs>
            <clipPath id={clip}>
              <path d={DROP} />
            </clipPath>
          </defs>
          <path d={DROP} className="fill-card" />
          <g clipPath={`url(#${clip})`}>
            <g
              className={cn(
                "transition-transform ease-[cubic-bezier(0.3,1.35,0.5,1)]",
                reduce ? "duration-150" : "duration-600",
              )}
              style={{ transform: `translateY(${on ? 0 : 19}px)` }}
            >
              <path d="M-2 7.5Q3 6.4 10 7.5T22 7.5V28H-2Z" className="fill-brand" />
              <path d="M-2 7.5Q3 6.4 10 7.5T22 7.5" fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={0.8} />
            </g>
            <ellipse cx={6.6} cy={14.5} rx={2} ry={3.6} fill="white" opacity={0.55} transform="rotate(18 6.6 14.5)" />
          </g>
          <path
            d={DROP}
            fill="none"
            className="stroke-foreground/45 transition-colors group-hover/bead:stroke-foreground/70"
            strokeWidth={1.2}
          />
          <circle cx={10} cy={2.2} r={1.6} className="fill-muted-foreground" />
        </svg>
      </button>
    </div>
  );
}
