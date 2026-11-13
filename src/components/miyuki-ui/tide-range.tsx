"use client";

import { useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  composeRenderProps,
  Label,
  Slider,
  type SliderProps,
  type SliderRenderProps,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

type SliderState = SliderRenderProps["state"];

const HALF = 12;
const AIR = 60;
const WATER = 40;
const CREST = 10;
const SCALE = 22;
const MAST = 49;
const FLAG_H = 17;
const DROP = FLAG_H + 2;
const EDGE = 8;
const CELL = 3;
const TILT = 0.15;

export interface TideRangeProps extends Omit<SliderProps<number[]>, "children" | "orientation"> {
  label?: ReactNode;
  thumbLabels?: [string, string];
  color?: string;
  ref?: Ref<HTMLDivElement>;
}

function snap(value: number, min: number, step: number) {
  return min + Math.round((value - min) / step) * step;
}

export function TideRange({
  label,
  thumbLabels = ["Minimum", "Maximum"],
  color = "var(--brand)",
  minValue = 0,
  maxValue = 100,
  step = 1,
  value,
  defaultValue,
  className,
  style,
  ...props
}: TideRangeProps) {
  const reduce = useReducedMotion() ?? false;
  const span = maxValue - minValue;
  const initial =
    value === undefined
      ? (defaultValue ?? [snap(minValue + span * 0.25, minValue, step), snap(minValue + span * 0.6, minValue, step)])
      : undefined;

  return (
    <Slider
      {...props}
      value={value}
      defaultValue={initial}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      className={composeRenderProps(className, (cls) =>
        cn(
          "flex w-full flex-col gap-1 data-[disabled]:opacity-50",
          "[--miyuki-tide-range-deep:color-mix(in_oklab,var(--miyuki-tide-range-water)_70%,var(--foreground))]",
          "dark:[--miyuki-tide-range-deep:color-mix(in_oklab,var(--miyuki-tide-range-water)_46%,var(--background))]",
          "[--miyuki-tide-range-bed:color-mix(in_oklab,var(--chart-4)_20%,var(--muted))]",
          "dark:[--miyuki-tide-range-bed:color-mix(in_oklab,var(--chart-4)_5%,color-mix(in_oklab,var(--miyuki-tide-range-water)_20%,var(--card)))]",
          "[--miyuki-tide-range-foam:rgb(255_255_255)]",
          "dark:[--miyuki-tide-range-foam:color-mix(in_oklab,white_70%,var(--miyuki-tide-range-water))]",
          cls,
        ),
      )}
      style={composeRenderProps(style, (s) => ({ "--miyuki-tide-range-water": color, ...s }) as CSSProperties)}
    >
      {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
      <SliderTrack
        className="relative touch-none data-[disabled]:cursor-not-allowed"
        style={{ height: AIR + WATER + SCALE, marginInline: HALF }}
      >
        {({ state }) => (
          <Channel state={state} minValue={minValue} maxValue={maxValue} thumbLabels={thumbLabels} reduce={reduce} />
        )}
      </SliderTrack>
    </Slider>
  );
}

interface ChannelProps {
  state: SliderState;
  minValue: number;
  maxValue: number;
  thumbLabels: [string, string];
  reduce: boolean;
}

function niceStep(span: number, slots: number) {
  const raw = span / Math.max(1, slots);
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= raw - 1e-9) return m * power;
  return span;
}

function Channel({ state, minValue, maxValue, thumbLabels, reduce }: ChannelProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riggingRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const clothRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const lineRefs = useRef<(SVGGElement | null)[]>([null, null]);
  const flagRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const live = useRef({ percents: [0, 1], kick: () => {} });
  const [width, setWidth] = useState(0);
  const [flagW, setFlagW] = useState<[number, number]>([36, 36]);

  const count = Math.min(2, state.values.length);
  const percents = state.values.slice(0, 2).map((_, i) => state.getThumbPercent(i));
  const key = percents.join(",");

  useLayoutEffect(() => {
    live.current.percents = key.split(",").map(Number);
    live.current.kick();
  }, [key]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setWidth(box.clientWidth);
      const a = flagRefs.current[0]?.offsetWidth ?? 36;
      const b = flagRefs.current[1]?.offsetWidth ?? 36;
      setFlagW((prev) => (prev[0] === a && prev[1] === b ? prev : [a, b]));
    });
    ro.observe(box);
    for (const flag of flagRefs.current) if (flag) ro.observe(flag);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;
    const handle = live.current;

    let cw = 0;
    let ch = WATER + CREST + 4;
    let dpr = 1;
    let n = 0;
    let h = new Float32Array(0);
    let v = new Float32Array(0);
    let ys = new Float32Array(0);
    let gradient: CanvasGradient | null = null;
    let palette = {
      water: [0, 0, 0, 1] as Rgba,
      bed: [0, 0, 0, 1] as Rgba,
      foam: [1, 1, 1, 1] as Rgba,
      deep: [0, 0, 0, 1] as Rgba,
    };
    const buoys = [0, 1].map(() => ({ x: 0, vx: 0, y: CREST, vy: 0, a: 0, va: 0, ready: false, spawn: 0 }));
    const foam: { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number }[] = [];
    let raf = 0;
    let last = 0;
    let clock = 0;
    let visible = true;
    let accumulator = 0;

    const rgba = (c: Rgba, a: number) =>
      `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

    const readColors = () => {
      palette = {
        water: toRgba("var(--miyuki-tide-range-water)", canvas),
        deep: toRgba("var(--miyuki-tide-range-deep)", canvas),
        bed: toRgba("var(--miyuki-tide-range-bed)", canvas),
        foam: toRgba("var(--miyuki-tide-range-foam)", canvas),
      };
      gradient = ctx.createLinearGradient(0, CREST - 3, 0, CREST + WATER);
      gradient.addColorStop(0, rgba(palette.water, 0.16));
      gradient.addColorStop(0.42, rgba(palette.water, 0.34));
      gradient.addColorStop(1, rgba(palette.deep, 0.94));
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = box.clientWidth + HALF * 2;
      ch = WATER + CREST + 4;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      n = Math.ceil(cw / CELL) + 2;
      h = new Float32Array(n);
      v = new Float32Array(n);
      ys = new Float32Array(Math.ceil(cw / 2) + 2);
      readColors();
    };

    const heightAt = (x: number) => {
      const f = Math.max(0, Math.min(n - 1.001, x / CELL));
      const i = Math.floor(f);
      return h[i] + (h[i + 1] - h[i]) * (f - i);
    };

    const swell = (x: number, t: number) =>
      1.5 * Math.sin(x * 0.045 - t * 1.15) +
      0.9 * Math.sin(x * 0.101 + t * 0.73 + 1.7) +
      0.35 * Math.sin(x * 0.23 - t * 2.1);

    const surface = (x: number, t: number) => CREST + swell(x, reduce ? 0 : t) + heightAt(x);

    const smooth = (a: number, b: number, x: number) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    const targets = () => {
      const track = cw - HALF * 2;
      return handle.percents.map((p) => HALF + p * track);
    };

    const stepWater = () => {
      for (let i = 0; i < n; i++) {
        const l = h[i > 0 ? i - 1 : 0];
        const r = h[i < n - 1 ? i + 1 : n - 1];
        v[i] += (l + r - 2 * h[i]) * 0.32;
        v[i] *= 0.982;
      }
      for (let i = 0; i < n; i++) {
        h[i] = Math.max(-6, Math.min(6, (h[i] + v[i]) * 0.997));
      }
    };

    const stepBuoys = (dt: number, t: number) => {
      const goal = targets();
      for (let i = 0; i < count; i++) {
        const b = buoys[i];
        if (!b.ready) {
          b.x = goal[i];
          b.y = surface(goal[i], t);
          b.ready = true;
        }
        if (reduce) {
          b.x = goal[i];
          b.y = surface(goal[i], 0);
          b.vx = 0;
          b.a = 0;
          continue;
        }
        const ax = 720 * (goal[i] - b.x) - 46 * b.vx;
        b.vx += ax * dt;
        b.x += b.vx * dt;
        const ay = 140 * (surface(b.x, t) - b.y) - 7 * b.vy;
        b.vy += ay * dt;
        b.y += b.vy * dt;
        const slope = (surface(b.x + 4, t) - surface(b.x - 4, t)) / 8;
        const lean = Math.max(-TILT, Math.min(TILT, Math.atan(slope) * 0.6 + b.vx / 1500));
        const aa = 170 * (lean - b.a) - 9 * b.va;
        b.va += aa * dt;
        b.a = Math.max(-TILT, Math.min(TILT, b.a + b.va * dt));

        const speed = Math.abs(b.vx);
        if (speed > 6) {
          const dir = Math.sign(b.vx);
          const c = Math.round(b.x / CELL);
          const push = Math.min(speed, 700) * 0.0011;
          for (const [o, s] of [
            [2, -1],
            [3, -0.6],
            [-2, 0.7],
            [-3, 0.5],
          ] as const) {
            const k = c + o * dir;
            if (k >= 0 && k < n) v[k] += s * push;
          }
          b.spawn += speed * dt * 0.09;
          while (b.spawn > 1 && foam.length < 90) {
            b.spawn -= 1;
            foam.push({
              x: b.x - dir * (6 + Math.random() * 6),
              y: surface(b.x, t) + 1 + Math.random() * 7,
              vx: -dir * (8 + Math.random() * 18) + b.vx * 0.08,
              vy: -2 + Math.random() * 6,
              life: 0.5 + Math.random() * 0.6,
              age: 0,
              r: 0.6 + Math.random() * 1.1,
            });
          }
        }
      }
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const bottom = CREST + WATER;
      const r = 10;
      const len = ys.length;
      for (let i = 0; i < len; i++) ys[i] = surface(Math.min(cw, i * 2), t);

      const body = new Path2D();
      body.moveTo(0, ys[0]);
      for (let i = 1; i < len; i++) body.lineTo(Math.min(cw, i * 2), ys[i]);
      body.lineTo(cw, bottom - r);
      body.arcTo(cw, bottom, cw - r, bottom, r);
      body.lineTo(r, bottom);
      body.arcTo(0, bottom, 0, bottom - r, r);
      body.closePath();
      if (gradient) ctx.fillStyle = gradient;
      ctx.fill(body);

      const x0 = buoys[0].ready ? buoys[0].x : targets()[0];
      const x1 = count > 1 ? (buoys[1].ready ? buoys[1].x : targets()[1]) : x0;
      const shallow = CREST + 13;
      const deep = bottom + 6;
      const bed = new Path2D();
      for (let x = 0; x <= cw + 2; x += 2) {
        const m = smooth(x0 - 6, x0 + 14, x) * (1 - smooth(x1 - 14, x1 + 6, x));
        const y = shallow + (deep - shallow) * m + Math.sin(x * 0.09) * 0.8 + Math.sin(x * 0.031 + 1) * 1.1;
        if (x === 0) bed.moveTo(x, y);
        else bed.lineTo(x, y);
      }
      const floor = new Path2D(bed);
      floor.lineTo(cw + 2, bottom + 2);
      floor.lineTo(0, bottom + 2);
      floor.closePath();
      ctx.save();
      ctx.clip(body);
      ctx.fillStyle = rgba(palette.bed, 1);
      ctx.fill(floor);
      ctx.strokeStyle = rgba(palette.deep, 0.18);
      ctx.lineWidth = 1;
      ctx.stroke(bed);

      for (const f of foam) {
        const k = 1 - f.age / f.life;
        ctx.fillStyle = rgba(palette.foam, 0.85 * k);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.6 + 0.4 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(0, ys[0]);
      for (let i = 1; i < len; i++) ctx.lineTo(Math.min(cw, i * 2), ys[i]);
      ctx.strokeStyle = rgba(palette.water, 0.9);
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    const place = (t: number) => {
      const goal = targets();
      for (let i = 0; i < count; i++) {
        const b = buoys[i];
        const rig = riggingRefs.current[i];
        if (rig)
          rig.style.transform = `translate(${(b.x - goal[i]).toFixed(2)}px, ${(b.y - CREST).toFixed(2)}px) rotate(${b.a.toFixed(4)}rad)`;
        const line = lineRefs.current[i];
        if (line)
          line.setAttribute(
            "transform",
            `translate(0 ${(surface(b.x, t) - b.y).toFixed(2)}) rotate(${((-b.a * 180) / Math.PI).toFixed(2)})`,
          );
        const cloth = clothRefs.current[i];
        if (cloth)
          cloth.style.transform = reduce
            ? ""
            : `skewY(${(Math.sin(t * 2.4 + i * 1.9) * 1.6 - b.vx / 260).toFixed(2)}deg)`;
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!reduce) {
        clock += dt;
        accumulator += dt;
        let guard = 0;
        while (accumulator >= 1 / 120 && guard++ < 8) {
          stepBuoys(1 / 120, clock);
          stepWater();
          accumulator -= 1 / 120;
        }
        for (let i = foam.length - 1; i >= 0; i--) {
          const f = foam[i];
          f.age += dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.vx *= 0.96;
          if (f.age >= f.life) foam.splice(i, 1);
        }
      } else {
        stepBuoys(0, 0);
      }
      draw(clock);
      place(clock);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    handle.kick = start;

    resize();
    start();
    const ro = new ResizeObserver(() => {
      resize();
      start();
    });
    ro.observe(box);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readColors();
      start();
    });
    return () => {
      stop();
      handle.kick = () => {};
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
    };
  }, [count, reduce]);

  const xs = percents.map((p) => p * width);
  const lo = -HALF + EDGE;
  const hi = width + HALF - EDGE;
  const dirs = [xs[0] - flagW[0] >= lo ? -1 : 1, count > 1 && xs[1] + flagW[1] <= hi ? 1 : -1];
  const boxes = xs.map((x, i) => (dirs[i] < 0 ? [x - flagW[i], x] : [x, x + flagW[i]]));
  const clash = count > 1 && boxes[0][1] + 6 > boxes[1][0] && boxes[1][1] + 6 > boxes[0][0];
  const crosses = (i: number) => boxes[i][0] - 3 <= xs[1 - i] && xs[1 - i] <= boxes[i][1] + 3;
  const high = clash && crosses(1) && !crosses(0) ? 1 : 0;
  const lowered = [clash && high !== 0, clash && high !== 1];

  const span = maxValue - minValue || 1;
  const tickStep = niceStep(span, Math.max(2, Math.floor(width / 72)));
  const ticks: number[] = [];
  for (let t = Math.ceil(minValue / tickStep - 1e-9) * tickStep; t <= maxValue + 1e-9; t += tickStep) {
    ticks.push(Math.round(t * 1e6) / 1e6 + 0);
  }

  return (
    <>
      <div
        ref={boxRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: AIR + WATER }}
      >
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{ left: -HALF, top: AIR - CREST, width: `calc(100% + ${HALF * 2}px)`, height: WATER + CREST + 4 }}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0"
        style={{ top: AIR + WATER + 2, height: SCALE - 2 }}
      >
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ left: `${((t - minValue) / span) * 100}%` }}
          >
            <span className="h-1 w-px bg-border-strong" />
            <span className="text-xs leading-none whitespace-nowrap text-muted-foreground tabular-nums">
              {state.getFormattedValue(t)}
            </span>
          </span>
        ))}
      </div>
      {state.values.slice(0, 2).map((_, i) => (
        <SliderThumb
          key={i}
          index={i}
          aria-label={count > 1 ? thumbLabels[i] : undefined}
          className={cn(
            "z-10 size-7 cursor-grab rounded-full outline-none",
            "data-[dragging]:z-20 data-[dragging]:cursor-grabbing data-[focus-visible]:z-20 data-[disabled]:cursor-not-allowed",
          )}
          style={{ top: AIR, zIndex: clash ? (i === high ? 30 : 25) : undefined }}
        >
          {({ isDragging, isFocusVisible, isHovered }) => (
            <div
              ref={(el) => {
                riggingRefs.current[i] = el;
              }}
              className="pointer-events-none absolute top-1/2 left-1/2 size-0"
            >
              <span
                className="pointer-events-auto absolute w-3 -translate-x-1/2"
                style={{ top: -MAST, height: MAST - 6 }}
              />
              <span
                className="absolute w-[1.5px] -translate-x-1/2 bg-primary"
                style={{ top: -MAST, height: MAST - 8 }}
              />
              <span
                className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                style={{ top: -MAST }}
              />
              <div
                className="pointer-events-auto absolute transition-transform duration-300 ease-settle motion-reduce:transition-none"
                style={{
                  left: 0,
                  top: -MAST + 1,
                  transform: `translate(${dirs[i] < 0 ? "-100%" : "0%"}, ${lowered[i] ? DROP : 0}px)`,
                }}
              >
                <div
                  ref={(el) => {
                    clothRefs.current[i] = el;
                    flagRefs.current[i] = el;
                  }}
                  className={cn(
                    "bg-primary px-1.5 text-xs leading-[17px] font-medium whitespace-nowrap text-primary-foreground tabular-nums shadow-xs",
                    dirs[i] < 0 ? "rounded-s-[4px]" : "rounded-e-[4px]",
                  )}
                  style={{ height: FLAG_H, transformOrigin: dirs[i] < 0 ? "100% 50%" : "0% 50%" }}
                >
                  {state.getThumbValueLabel(i)}
                </div>
              </div>
              <span
                className={cn(
                  "absolute -top-[11px] -left-[11px] size-[22px] rounded-full transition-[box-shadow] duration-150 ease-settle",
                  isFocusVisible ? "ring-[3px] ring-ring" : isDragging || isHovered ? "ring-[3px] ring-ring/40" : "",
                )}
              />
              <Buoy
                lineRef={(el) => {
                  lineRefs.current[i] = el;
                }}
              />
            </div>
          )}
        </SliderThumb>
      ))}
    </>
  );
}

function Buoy({ lineRef }: { lineRef: (el: SVGGElement | null) => void }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      viewBox="-10 -10 20 20"
      className="pointer-events-auto absolute -top-[10px] -left-[10px] size-5 overflow-visible"
    >
      <defs>
        <clipPath id={`${id}-hull`}>
          <ellipse cx="0" cy="0" rx="8.6" ry="7.6" />
        </clipPath>
      </defs>
      <path d="M -1.7 -9.4 h 3.4 v 3.2 h -3.4 Z" style={{ fill: "var(--primary)" }} />
      <ellipse cx="0" cy="0" rx="8.6" ry="7.6" style={{ fill: "var(--primary)" }} />
      <ellipse cx="-2.8" cy="-3.4" rx="3.4" ry="1.8" fill="white" opacity="0.3" />
      <g clipPath={`url(#${id}-hull)`}>
        <g ref={lineRef}>
          <rect
            x="-14"
            y="0"
            width="28"
            height="16"
            style={{ fill: "color-mix(in oklab, var(--miyuki-tide-range-water) 58%, transparent)" }}
          />
          <path d="M -12 0 H 12" strokeWidth="1.4" style={{ stroke: "var(--miyuki-tide-range-water)" }} />
        </g>
      </g>
    </svg>
  );
}
