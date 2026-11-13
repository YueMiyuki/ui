"use client";

import { useReducedMotion } from "motion/react";
import { type Ref, useEffect, useRef } from "react";
import { Button, type ButtonProps, composeRenderProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface FurinBellProps extends Omit<ButtonProps, "children" | "aria-label"> {
  count?: number;
  sound?: boolean;
  size?: number;
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

const PIVOT = { x: 20, y: 3.4 };
const HANG = 5;
const STRING = 33;
const W1 = 7;
const W2 = 4.6;
const W3 = 6.5;
const W4 = 9;
const L2 = 40;
const GAP = 0.3;
const BOUNCE = 0.4;

const BELL =
  "M20 7.6 C 26.2 7.6 29.9 12.4 30.3 19.4 L 30.9 25.2 C 31.05 26.6 30.4 27.4 29.1 27.4 L 10.9 27.4 C 9.6 27.4 8.95 26.6 9.1 25.2 L 9.7 19.4 C 10.1 12.4 13.8 7.6 20 7.6 Z";
const WAVE =
  "M10.4 19.6 C 11.9 18.3 13.4 18.3 14.9 19.6 S 17.9 20.9 19.4 19.6 S 22.4 18.3 23.9 19.6 S 26.9 20.9 28.4 19.6 S 29.6 18.9 29.8 18.9";

interface State {
  a1: number;
  v1: number;
  a2: number;
  v2: number;
  a3: number;
  v3: number;
  tw: number;
  vt: number;
  t: number;
  flash: number;
}

function strike(audio: { current: AudioContext | null }) {
  const Ctx =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctx) return;
  const ac = (audio.current ??= new Ctx());
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime + 0.01;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.045, t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  out.connect(ac.destination);
  for (const [f, g] of [
    [2793, 1],
    [2802.5, 0.7],
  ]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.value = g;
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 1.15);
  }
}

export function FurinBell({
  count = 0,
  sound = false,
  size = 40,
  label = "Notifications",
  className,
  onHoverStart,
  onPress,
  ...props
}: FurinBellProps) {
  const reduce = useReducedMotion() ?? false;
  const backRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const cordRef = useRef<SVGGElement>(null);
  const stripRef = useRef<SVGGElement>(null);
  const paperRef = useRef<SVGGElement>(null);
  const glintRef = useRef<SVGPathElement>(null);
  const push = useRef<(impulse: number, chime?: boolean) => void>(() => {});
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const last = useRef(count);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    const s: State = { a1: 0, v1: 0, a2: 0, v2: 0, a3: 0, v3: 0, tw: 0, vt: 0, t: 0, flash: 0 };
    let raf = 0;
    let prev = -1;
    let chimeAt = -1;

    function paint() {
      const deg = 180 / Math.PI;
      const hx = PIVOT.x + HANG * Math.sin(s.a1);
      const hy = PIVOT.y + HANG * Math.cos(s.a1);
      const bell = `rotate(${(-s.a1 * deg).toFixed(3)} ${PIVOT.x} ${PIVOT.y})`;
      backRef.current?.setAttribute("transform", bell);
      frontRef.current?.setAttribute("transform", bell);
      cordRef.current?.setAttribute(
        "transform",
        `translate(${hx.toFixed(3)} ${hy.toFixed(3)}) rotate(${(-s.a2 * deg).toFixed(3)})`,
      );
      stripRef.current?.setAttribute("transform", `translate(0 ${STRING}) rotate(${(-s.a3 * deg).toFixed(3)})`);
      const turn = Math.cos(s.tw);
      paperRef.current?.setAttribute("transform", `scale(${Math.max(0.3, Math.abs(turn)).toFixed(3)} 1)`);
      if (glintRef.current) glintRef.current.style.opacity = String(0.55 + 0.45 * s.flash);
    }

    function hit() {
      s.flash = 1;
      if (chimeAt >= 0) {
        chimeAt = -1;
        if (soundRef.current) strike(audio);
      }
    }

    function step(dt: number) {
      const a1 = -W1 * W1 * Math.sin(s.a1) - 2 * 0.06 * W1 * s.v1;
      s.v1 += a1 * dt;
      s.a1 += s.v1 * dt;
      const ax = HANG * (a1 * Math.cos(s.a1) - s.v1 * s.v1 * Math.sin(s.a1));
      const ay = HANG * (-a1 * Math.sin(s.a1) - s.v1 * s.v1 * Math.cos(s.a1));
      const g = W2 * W2 * L2;
      const a2 = (-(g - ay) * Math.sin(s.a2)) / L2 - (ax * Math.cos(s.a2)) / L2 - 2 * 0.12 * W2 * s.v2;
      s.v2 += a2 * dt;
      s.a2 += s.v2 * dt;
      const phi = s.a2 - s.a1;
      if (Math.abs(phi) > GAP) {
        const side = Math.sign(phi);
        const rel = s.v2 - s.v1;
        s.a2 = s.a1 + side * GAP;
        if (rel * side > 0) {
          const j = (1 + BOUNCE) * rel;
          s.v2 -= j * 0.8;
          s.v1 += j * 0.2;
          if (Math.abs(rel) > 0.25) hit();
        }
      }
      const a3 = -W3 * W3 * s.a3 - 2 * 0.18 * W3 * s.v3 - 1.1 * a2;
      s.v3 += a3 * dt;
      s.a3 += s.v3 * dt;
      const wind = (Math.abs(s.v2) + Math.abs(s.v3) * 0.6) * (Math.sin(s.t * 13.7) + 0.6 * Math.sin(s.t * 23.1 + 1.3));
      const at = -W4 * W4 * s.tw - 2 * 0.2 * W4 * s.vt + 9 * wind;
      s.vt += at * dt;
      s.tw += s.vt * dt;
      s.flash = Math.max(0, s.flash - dt * 5);
      s.t += dt;
    }

    function frame(now: number) {
      raf = 0;
      const dt = prev < 0 ? 1 / 60 : Math.min(0.05, Math.max(0, (now - prev) / 1000));
      prev = now;
      const sub = Math.max(1, Math.ceil(dt / 0.004));
      for (let i = 0; i < sub; i++) step(dt / sub);
      if (chimeAt >= 0 && s.t > chimeAt) hit();
      paint();
      const energy =
        Math.abs(s.a1) +
        Math.abs(s.v1) * 0.2 +
        Math.abs(s.a2) +
        Math.abs(s.v2) * 0.2 +
        Math.abs(s.a3) +
        Math.abs(s.tw) +
        Math.abs(s.vt) * 0.1;
      if (energy > 0.002 || s.flash > 0) raf = requestAnimationFrame(frame);
      else {
        Object.assign(s, { a1: 0, v1: 0, a2: 0, v2: 0, a3: 0, v3: 0, tw: 0, vt: 0 });
        paint();
        prev = -1;
      }
    }

    push.current = (impulse, chime = false) => {
      if (chime) chimeAt = s.t + 0.32;
      if (reduce) {
        if (chime && soundRef.current) strike(audio);
        chimeAt = -1;
        return;
      }
      s.v1 += impulse;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  useEffect(() => {
    if (count > last.current) push.current(last.current % 2 === 0 ? 2.5 : -2.5, true);
    last.current = count;
  }, [count]);

  const shown = count > 99 ? "99+" : String(count);
  const unread = count === 1 ? "1 unread" : `${count} unread`;

  return (
    <Button
      {...props}
      aria-label={`${label}, ${unread}`}
      onHoverStart={(e) => {
        onHoverStart?.(e);
        if (e.pointerType === "mouse") push.current(1.3);
      }}
      onPress={(e) => {
        onPress?.(e);
        push.current(0.7);
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          "relative inline-flex shrink-0 cursor-default rounded-lg outline-none select-none [-webkit-tap-highlight-color:transparent]",
          "[--miyuki-furin-bell-glass:14%] [--miyuki-furin-bell-glint:rgb(255_255_255/0.95)] dark:[--miyuki-furin-bell-glass:24%] dark:[--miyuki-furin-bell-glint:rgb(255_255_255/0.7)]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[disabled]:opacity-50",
          cls,
        ),
      )}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 40 80"
        width={size}
        height={size * 2}
        className="pointer-events-none absolute top-0 left-0 overflow-visible"
      >
        <circle cx={PIVOT.x} cy={1.9} r={1.5} fill="none" strokeWidth={0.8} className="stroke-muted-foreground" />
        <g ref={backRef}>
          <line x1={PIVOT.x} x2={PIVOT.x} y1={3.4} y2={8} strokeWidth={0.7} className="stroke-muted-foreground" />
          <ellipse
            cx={20}
            cy={26.9}
            rx={9.6}
            ry={1.5}
            style={{ fill: "color-mix(in oklab, var(--brand) 30%, transparent)" }}
          />
        </g>
        <g ref={cordRef}>
          <line x1={0} x2={0} y1={0} y2={STRING} strokeWidth={0.55} className="stroke-muted-foreground" />
          <rect
            x={-2.4}
            y={15.4}
            width={4.8}
            height={4.4}
            rx={1.6}
            strokeWidth={0.6}
            style={{
              fill: "color-mix(in oklab, var(--brand) 38%, var(--card))",
              stroke: "color-mix(in oklab, var(--brand) 70%, var(--foreground))",
            }}
          />
          <g ref={stripRef}>
            <g ref={paperRef}>
              <rect
                x={-6}
                y={1}
                width={12}
                height={30}
                rx={1.2}
                strokeWidth={0.6}
                className={count > 0 ? "fill-brand stroke-brand" : "fill-card stroke-border-strong"}
              />
              <path
                d="M-6 27.4 H 6"
                strokeWidth={0.5}
                className={count > 0 ? "stroke-brand-foreground/30" : "stroke-border"}
              />
              {count > 0 && (
                <text
                  x={0}
                  y={11.6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-brand-foreground font-semibold"
                  style={{
                    fontSize: shown.length > 2 ? 6.4 : shown.length > 1 ? 8 : 9.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {shown}
                </text>
              )}
            </g>
          </g>
        </g>
        <g ref={frontRef}>
          <path
            d={BELL}
            strokeWidth={0.8}
            style={{
              fill: "color-mix(in oklab, var(--brand) var(--miyuki-furin-bell-glass), transparent)",
              stroke: "color-mix(in oklab, var(--brand) 62%, var(--foreground))",
            }}
          />
          <path d={WAVE} fill="none" strokeWidth={1.1} strokeLinecap="round" className="stroke-brand" opacity={0.85} />
          <path
            ref={glintRef}
            d="M13.2 11.6 C 11.8 13.4 11.3 15.6 11.2 17.4"
            fill="none"
            strokeWidth={1.3}
            strokeLinecap="round"
            style={{ stroke: "var(--miyuki-furin-bell-glint)", opacity: 0.55 }}
          />
          <circle
            cx={20}
            cy={7.4}
            r={1.3}
            style={{ fill: "color-mix(in oklab, var(--brand) 62%, var(--foreground))" }}
          />
        </g>
      </svg>
      <span className="sr-only" aria-live="polite">
        {unread}
      </span>
    </Button>
  );
}
