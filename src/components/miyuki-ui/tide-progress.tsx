"use client";

import { useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, type Ref, useEffect, useId, useRef } from "react";
import {
  ProgressBar as AriaProgressBar,
  type ProgressBarProps as AriaProgressBarProps,
  composeRenderProps,
  Label,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type TideProgressShape = "circle" | "pill" | "bar";

export interface TideProgressProps extends Omit<AriaProgressBarProps, "children"> {
  shape?: TideProgressShape;
  size?: number;
  showValue?: boolean;
  color?: string;
  label?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const BUBBLES = 7;
const STEPS = 28;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function dims(shape: TideProgressShape, size: number): [number, number] {
  const h = Math.max(16, size);
  if (shape === "pill") return [Math.round(h * 0.44), h];
  if (shape === "bar") return [Math.round(h * 3), h];
  return [h, h];
}

interface Surface {
  y: number;
  amp: number;
  k: number;
  phase: number;
  tilt: number;
}

function points(w: number, s: Surface) {
  const out: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const x = -2 + ((w + 4) * i) / STEPS;
    const y = s.y + s.amp * Math.sin(s.k * x + s.phase) + s.tilt * (x - w / 2);
    out.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return out;
}

function waterPath(w: number, h: number, s: Surface) {
  return `M-2 ${h + 4} L${points(w, s).join(" L")} L${w + 2} ${h + 4} Z`;
}

function linePath(w: number, s: Surface) {
  return `M${points(w, s).join(" L")}`;
}

function levelY(h: number, level: number, pad: number) {
  return h + pad - clamp(level, 0, 1) * (h + pad * 2);
}

function Vessel({
  shape,
  size,
  percentage,
  indeterminate,
  showValue,
  valueText,
  color,
}: {
  shape: TideProgressShape;
  size: number;
  percentage: number;
  indeterminate: boolean;
  showValue: boolean;
  valueText?: string;
  color: string;
}) {
  const [w, h] = dims(shape, size);
  const uid = useId().replace(/[^\w-]/g, "");
  const reduce = useReducedMotion();
  const backRef = useRef<SVGPathElement>(null);
  const frontRef = useRef<SVGPathElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGPathElement>(null);
  const bubbleRefs = useRef<(SVGCircleElement | null)[]>([]);
  const kick = useRef<(level: number) => void>(() => {});
  const latest = useRef(0);

  const pad = Math.max(3, h * 0.05);
  const baseAmp = Math.max(1.4, Math.min(h * 0.028, 5));
  const target = indeterminate ? 0.5 : percentage / 100;
  const front: Surface = {
    y: levelY(h, target, pad),
    amp: baseAmp,
    k: (Math.PI * 2) / (w * 0.95),
    phase: 0.6,
    tilt: 0,
  };
  const back: Surface = {
    y: front.y - baseAmp * 0.6,
    amp: baseAmp * 0.85,
    k: (Math.PI * 2) / (w * 0.7),
    phase: 2.4,
    tilt: 0,
  };
  const initialFront = waterPath(w, h, front);
  const initialBack = waterPath(w, h, back);
  const initialLine = linePath(w, front);

  useEffect(() => {
    latest.current = target;
    kick.current(target);
  }, [target]);

  useEffect(() => {
    const frontEl = frontRef.current;
    const backEl = backRef.current;
    const lineEl = lineRef.current;
    const clipEl = clipRef.current;
    if (!frontEl || !backEl || !lineEl || !clipEl) return;
    const still = !!reduce;
    const startLevel = clamp(latest.current, 0, 1);
    const sim = {
      level: startLevel,
      velocity: 0,
      target: startLevel,
      agitation: 0,
      tilt: 0,
      tiltVelocity: 0,
      p1: 0.6,
      p2: 2.4,
      time: 0,
      nextBubble: 0.4,
    };
    const bubbles = Array.from({ length: BUBBLES }, () => ({
      live: false,
      x: 0,
      y: 0,
      r: 1,
      speed: 20,
      wobble: 0,
      seed: 0,
    }));
    const k1 = (Math.PI * 2) / (w * 0.95);
    const k2 = (Math.PI * 2) / (w * 0.7);
    const insideX = (y: number) => {
      if (shape === "circle") {
        const r = w / 2;
        const dy = y - h / 2;
        return Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.8;
      }
      if (shape === "pill") {
        const r = w / 2;
        const dy = y < r ? r - y : y > h - r ? y - (h - r) : 0;
        return Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.7;
      }
      return w / 2 - 8;
    };

    let raf = 0;
    let last = 0;
    let onScreen = false;

    const render = () => {
      const agitate = 1 + sim.agitation;
      const surfaceY = levelY(h, sim.level, pad + baseAmp * sim.agitation);
      const a1 = baseAmp * agitate;
      const f: Surface = { y: surfaceY, amp: a1, k: k1, phase: sim.p1, tilt: sim.tilt };
      const b: Surface = { y: surfaceY - baseAmp * 0.6, amp: a1 * 0.85, k: k2, phase: sim.p2, tilt: -sim.tilt * 0.6 };
      const water = waterPath(w, h, f);
      frontEl.setAttribute("d", water);
      clipEl.setAttribute("d", water);
      backEl.setAttribute("d", waterPath(w, h, b));
      lineEl.setAttribute("d", linePath(w, f));
      for (let i = 0; i < BUBBLES; i++) {
        const el = bubbleRefs.current[i];
        const bubble = bubbles[i];
        if (!el) continue;
        if (!bubble.live) {
          el.setAttribute("opacity", "0");
          continue;
        }
        const x = bubble.x + Math.sin(sim.time * 3 + bubble.seed) * 1.4;
        const top = surfaceY + a1 * Math.sin(k1 * x + sim.p1) + sim.tilt * (x - w / 2);
        const fade = clamp((bubble.y - top) / 10, 0, 1) * clamp((h - bubble.y) / 6, 0, 1);
        el.setAttribute("cx", x.toFixed(2));
        el.setAttribute("cy", bubble.y.toFixed(2));
        el.setAttribute("r", bubble.r.toFixed(2));
        el.setAttribute("opacity", fade.toFixed(3));
        if (bubble.y < top + 1) bubble.live = false;
      }
    };

    const advance = (dt: number) => {
      sim.time += dt;
      if (indeterminate) sim.target = 0.5 + 0.11 * Math.sin(sim.time * 0.9) + 0.03 * Math.sin(sim.time * 2.3);
      const stiffness = 70;
      const damping = 2 * Math.sqrt(stiffness) * 0.62;
      const force = stiffness * (sim.target - sim.level) - damping * sim.velocity;
      sim.velocity += force * dt;
      sim.level += sim.velocity * dt;
      const surge = Math.abs(force) * 0.0035;
      sim.agitation = Math.min(2.6, sim.agitation * Math.exp(-dt / 0.8) + surge * dt * 60 * 0.08);
      const omega = 7.2;
      const tiltForce = -omega * omega * sim.tilt - 2 * 0.16 * omega * sim.tiltVelocity;
      sim.tiltVelocity += tiltForce * dt;
      sim.tilt += sim.tiltVelocity * dt;
      if (indeterminate) sim.tilt = 0.05 * Math.sin(sim.time * 1.2) * Math.min(1, h / w);
      const speed = 1 + sim.agitation * 0.6;
      sim.p1 += dt * 2.1 * speed;
      sim.p2 -= dt * 1.3 * speed;
      sim.nextBubble -= dt;
      if (sim.nextBubble <= 0 && sim.level > 0.12) {
        sim.nextBubble = 0.5 + Math.random() * 1.4;
        const free = bubbles.find((b) => !b.live);
        if (free) {
          const y = h - 4 - Math.random() * 6;
          const span = insideX(y);
          free.live = true;
          free.x = w / 2 + (Math.random() * 2 - 1) * span;
          free.y = y;
          free.r = 0.8 + Math.random() * Math.max(0.6, h * 0.012);
          free.speed = 14 + Math.random() * 14;
          free.seed = Math.random() * 10;
        }
      }
      for (const bubble of bubbles) if (bubble.live) bubble.y -= bubble.speed * dt;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 1 / 60;
      last = now;
      advance(dt);
      render();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    kick.current = (next: number) => {
      if (indeterminate) return;
      const level = clamp(next, 0, 1);
      if (still) {
        sim.level = level;
        sim.target = level;
        render();
        return;
      }
      const delta = level - sim.target;
      sim.target = level;
      sim.agitation = Math.min(2.6, sim.agitation + Math.abs(delta) * 6);
      sim.tiltVelocity +=
        (delta > 0 ? 1 : -1) * Math.min(0.5, Math.abs(delta) * 3) * Math.min(1, h / w) * (Math.random() < 0.5 ? -1 : 1);
    };

    const svg = frontEl.ownerSVGElement;
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    if (svg) io.observe(svg);
    document.addEventListener("visibilitychange", sync);
    render();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      kick.current = () => {};
    };
  }, [w, h, shape, reduce, indeterminate, pad, baseAmp]);

  const fontSize = clamp(Math.min(w * 0.24, h * 0.3), 11, 60);
  const [number, unit] = (() => {
    const text = valueText ?? "";
    const m = text.match(/^(.*?)(\s?%)$/);
    return m ? [m[1], m[2]] : [text, ""];
  })();
  const numeral = (fill: string) => (
    <text
      x={w / 2}
      y={h / 2}
      textAnchor="middle"
      dominantBaseline="central"
      className="font-display font-semibold tabular-nums"
      style={{ fill, fontSize, letterSpacing: "-0.02em" }}
    >
      {number}
      {unit ? (
        <tspan style={{ fontSize: fontSize * 0.55 }} dx={fontSize * 0.04}>
          {unit.trim()}
        </tspan>
      ) : null}
    </text>
  );

  const radius = shape === "circle" ? w / 2 : shape === "pill" ? w / 2 : Math.min(h * 0.26, 14);
  const outline =
    shape === "circle" ? (
      <circle cx={w / 2} cy={h / 2} r={w / 2} />
    ) : (
      <rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} />
    );

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="block shrink-0 overflow-visible"
      style={{ "--miyuki-tide-progress-water": color } as CSSProperties}
    >
      <defs>
        <clipPath id={`${uid}-vessel`}>{outline}</clipPath>
        <clipPath id={`${uid}-water`}>
          <path ref={clipRef} d={initialFront} />
        </clipPath>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--miyuki-tide-progress-water) 82%, white)" }} />
          <stop offset="0.35" style={{ stopColor: "var(--miyuki-tide-progress-water)" }} />
          <stop
            offset="1"
            style={{ stopColor: "color-mix(in oklab, var(--miyuki-tide-progress-water) 86%, var(--foreground))" }}
          />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${uid}-vessel)`}>
        <rect width={w} height={h} className="fill-muted" />
        <path
          ref={backRef}
          d={initialBack}
          style={{ fill: "color-mix(in oklab, var(--miyuki-tide-progress-water) 38%, transparent)" }}
        />
        <path ref={frontRef} d={initialFront} fill={`url(#${uid}-fill)`} />
        <path
          ref={lineRef}
          d={initialLine}
          fill="none"
          style={{ stroke: "color-mix(in oklab, var(--miyuki-tide-progress-water) 45%, white)" }}
          strokeOpacity="0.9"
          strokeWidth={Math.max(1, Math.min(2, h * 0.012))}
        />
        {Array.from({ length: BUBBLES }, (_, i) => (
          <circle
            key={i}
            ref={(el) => {
              bubbleRefs.current[i] = el;
            }}
            r="1"
            opacity="0"
            fill="white"
            fillOpacity="0.25"
            stroke="white"
            strokeOpacity="0.7"
            strokeWidth="0.75"
          />
        ))}
        {showValue && !indeterminate ? (
          <>
            {numeral("var(--foreground)")}
            <g clipPath={`url(#${uid}-water)`}>
              {numeral("var(--miyuki-tide-progress-under, var(--brand-foreground))")}
            </g>
          </>
        ) : null}
      </g>
      {shape === "circle" ? (
        <circle cx={w / 2} cy={h / 2} r={w / 2 - 0.5} fill="none" className="stroke-border-strong" strokeWidth="1" />
      ) : (
        <rect
          x={0.5}
          y={0.5}
          width={w - 1}
          height={h - 1}
          rx={radius - 0.5}
          ry={radius - 0.5}
          fill="none"
          className="stroke-border-strong"
          strokeWidth="1"
        />
      )}
      {shape === "circle" ? (
        <path
          d={`M ${w * 0.2} ${h * 0.24} A ${w / 2 - 4} ${h / 2 - 4} 0 0 1 ${w * 0.42} ${h * 0.07}`}
          fill="none"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth={Math.max(1, w * 0.012)}
          strokeLinecap="round"
        />
      ) : shape === "pill" ? (
        <rect
          x={w * 0.2}
          y={radius * 0.7}
          width={Math.max(1.5, w * 0.06)}
          height={h * 0.3}
          rx={Math.max(0.75, w * 0.03)}
          fill="white"
          fillOpacity="0.4"
        />
      ) : (
        <rect
          x={radius * 0.8}
          y={Math.max(3, h * 0.12)}
          width={w * 0.2}
          height={Math.max(1.5, h * 0.05)}
          rx={Math.max(0.75, h * 0.025)}
          fill="white"
          fillOpacity="0.4"
        />
      )}
    </svg>
  );
}

export function TideProgress({
  shape = "circle",
  size = 120,
  showValue = true,
  color = "var(--brand)",
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: TideProgressProps) {
  return (
    <AriaProgressBar
      {...props}
      aria-label={ariaLabel ?? (label == null ? "Progress" : undefined)}
      className={composeRenderProps(className, (cls) => cn("inline-flex flex-col items-center gap-2.5", cls))}
    >
      {({ percentage = 0, valueText, isIndeterminate }) => (
        <>
          <Vessel
            shape={shape}
            size={size}
            percentage={percentage}
            indeterminate={isIndeterminate}
            showValue={showValue}
            valueText={valueText}
            color={color}
          />
          {label != null ? <Label className="text-sm text-muted-foreground">{label}</Label> : null}
        </>
      )}
    </AriaProgressBar>
  );
}
