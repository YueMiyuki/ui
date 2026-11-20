"use client";

import { cancelFrame, frame, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { composeRenderProps, Slider, type SliderProps, SliderThumb, SliderTrack } from "react-aria-components";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type SlideConfirmTone = "brand" | "destructive";

export interface SlideConfirmHandle {
  reset: () => void;
}

export interface SlideConfirmProps
  extends Omit<
    SliderProps<number>,
    | "children"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onChangeEnd"
    | "minValue"
    | "maxValue"
    | "step"
    | "orientation"
    | "formatOptions"
  > {
  label?: string;
  confirmedLabel?: string;
  onConfirm?: () => unknown;
  tone?: SlideConfirmTone;
  resetKey?: string | number;
  ref?: Ref<SlideConfirmHandle>;
}

type Mode = "rest" | "drag" | "home" | "key" | "held";
type Status = "idle" | "pending" | "confirmed";
type Ring = "off" | "spin" | "done";

interface Sim {
  mode: Mode;
  x: number;
  v: number;
  pointer: number;
  goal: number;
  armed: boolean;
  lean: number;
  leanV: number;
  stretch: number;
  stretchV: number;
  stir: number;
  calm: number;
  calmGoal: number;
  flood: number;
  floodV: number;
  floodGoal: number;
  swell: number;
  swellGoal: number;
  drift: number;
  time: number;
  fadeT: number;
  w: number;
  travel: number;
}

const H = 48;
const R = 20;
const INSET = 4;
const GAP = 2.5;
const FLOOD = 22;
const LEAN = 15;
const BOW = 0.35;
const RIPPLE = 1.5;
const STEP = 1 / 120;
const ROWS = Array.from({ length: 15 }, (_, i) => -4 + i * 4);

const ARROW = "M5 12L19 12M13 6L19 12L13 18";
const CHECK = "M9.5 17.5L9.5 17.5M19.5 7.5L9.5 17.5L4.5 12.5";

const tones: Record<SlideConfirmTone, { water: string; wet: string }> = {
  brand: { water: "var(--brand)", wet: "var(--brand-foreground)" },
  destructive: { water: "var(--destructive)", wet: "var(--destructive-foreground)" },
};

const keyframes = "@keyframes miyuki-slide-confirm-spin { to { transform: rotate(360deg); } }";

const WATER = "var(--miyuki-slide-confirm-water)";

const num = (v: number) => String(Math.round(v * 100) / 100);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function createSim(): Sim {
  return {
    mode: "rest",
    x: 0,
    v: 0,
    pointer: 0,
    goal: 0,
    armed: false,
    lean: 0,
    leanV: 0,
    stretch: 0,
    stretchV: 0,
    stir: 0,
    calm: 1,
    calmGoal: 1,
    flood: 0,
    floodV: 0,
    floodGoal: 0,
    swell: 0,
    swellGoal: 0,
    drift: 0,
    time: 0,
    fadeT: 0,
    w: 0,
    travel: 0,
  };
}

function curve(xs: number[], ys: number[]) {
  const n = xs.length;
  let d = `${num(xs[0])} ${num(ys[0])}L${num((xs[0] + xs[1]) / 2)} ${num((ys[0] + ys[1]) / 2)}`;
  for (let i = 1; i < n - 1; i++) {
    d += `Q${num(xs[i])} ${num(ys[i])} ${num((xs[i] + xs[i + 1]) / 2)} ${num((ys[i] + ys[i + 1]) / 2)}`;
  }
  return `${d}L${num(xs[n - 1])} ${num(ys[n - 1])}`;
}

function front(sim: Sim, still: boolean) {
  const stretch = still ? 0 : sim.stretch;
  const base = INSET + R + sim.x + R * (1 + stretch) + GAP + sim.flood * FLOOD;
  const lean = still ? 0 : sim.lean;
  const amp = still ? 0 : RIPPLE * sim.calm * (1 + 0.7 * sim.stir);
  const t = sim.time;
  const xs = ROWS.map((y) => {
    const u = (y - H / 2) / (H / 2);
    const ripple = 0.7 * Math.sin(y * 0.15 - t * 2.1) + 0.3 * Math.sin(y * 0.31 + t * 2.9 + 1.7);
    return base + lean * (u - BOW * u * u) + amp * ripple;
  });
  const line = curve(xs, ROWS);
  return { water: `M-8 ${ROWS[0]}L${line}L-8 ${ROWS[ROWS.length - 1]}Z`, edge: `M${line}` };
}

function swellPath(sim: Sim) {
  const span = sim.w + 48;
  const gap = span / 3;
  let d = "";
  for (let j = 0; j < 3; j++) {
    const bx = ((sim.drift + j * gap) % span) - 24;
    const xs = ROWS.map(
      (y) => bx + 1.6 * Math.sin(y * 0.08 + sim.time * 0.9 + j * 2.1) + 0.6 * Math.sin(y * 0.19 - sim.time * 0.7 + j),
    );
    d += `M${curve(xs, ROWS)}`;
  }
  return d;
}

const REST = front(createSim(), true);

function Words({
  label,
  confirmedLabel,
  done,
  className,
}: {
  label: string;
  confirmedLabel: string;
  done: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center px-[52px] text-sm font-medium",
        className,
      )}
    >
      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
        <span
          className={cn(
            "col-start-1 row-start-1 truncate text-center transition-opacity duration-300 ease-settle",
            done ? "opacity-0" : "opacity-100",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 truncate text-center transition-opacity duration-300 ease-settle",
            done ? "opacity-100" : "opacity-0",
          )}
        >
          {confirmedLabel}
        </span>
      </span>
    </span>
  );
}

export function SlideConfirm({
  label = "Slide to confirm",
  confirmedLabel = "Confirmed",
  onConfirm,
  tone = "brand",
  resetKey,
  isDisabled = false,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  ...props
}: SlideConfirmProps) {
  const reduce = useReducedMotion() === true;
  const [sim] = useState(createSim);
  const [status, setStatus] = useState<Status>("idle");
  const [ring, setRing] = useState<Ring>("off");
  const [value, setValue] = useState(0);
  const [flash, setFlash] = useState(false);
  const glyph = status === "idle" ? ARROW : CHECK;
  const [shownGlyph, setShownGlyph] = useState(glyph);

  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<SVGGElement>(null);
  const drag = useRef<{ id: number; k: number; offset: number } | null>(null);
  const run = useRef(0);
  const committed = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevKey = useRef(resetKey);
  const hooks = useRef({
    kick: () => {},
    commit: () => {},
    reset: () => {},
  });

  const x = useMotionValue(0);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const fade = useMotionValue(1);
  const wet = useMotionValue(0);
  const clip = useMotionValue(`path("${REST.water}")`);
  const edge = useMotionValue(REST.edge);
  const swellD = useMotionValue("");
  const swell = useMotionValue(0);

  const kick = () => hooks.current.kick();

  const drain = () => {
    sim.mode = "home";
    sim.armed = false;
    sim.fadeT = 0;
    sim.floodGoal = 0;
    sim.calmGoal = 1;
    sim.swellGoal = 0;
    kick();
  };

  const fail = () => {
    committed.current = false;
    setStatus("idle");
    setRing("off");
    setValue(0);
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 900);
    drain();
  };

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const id = ++run.current;
    sim.mode = "held";
    sim.armed = false;
    sim.floodGoal = 1;
    sim.calmGoal = 0;
    setValue(100);
    setFlash(false);
    kick();
    let result: unknown;
    try {
      result = onConfirm?.();
    } catch (error) {
      fail();
      throw error;
    }
    if (result != null && typeof (result as PromiseLike<unknown>).then === "function") {
      setStatus("pending");
      setRing("spin");
      sim.swellGoal = reduce ? 0 : 1;
      (result as PromiseLike<unknown>).then(
        () => {
          if (run.current !== id) return;
          setStatus("confirmed");
          setRing("done");
          sim.swellGoal = 0;
          kick();
        },
        () => {
          if (run.current === id) fail();
        },
      );
    } else {
      setStatus("confirmed");
    }
  };

  const reset = () => {
    run.current++;
    committed.current = false;
    drag.current = null;
    clearTimeout(flashTimer.current);
    setStatus("idle");
    setRing("off");
    setValue(0);
    setFlash(false);
    if (sim.mode !== "rest") drain();
  };

  const goTo = (next: number) => {
    if (committed.current || sim.mode === "drag") return;
    if (next >= 100) {
      sim.mode = "key";
      sim.goal = 1;
      sim.armed = true;
    } else if (next <= 0) {
      if (sim.mode !== "rest") {
        sim.mode = "home";
        sim.fadeT = 0;
      }
    } else {
      sim.mode = "key";
      sim.goal = next / 100;
      sim.armed = false;
    }
    kick();
  };

  useEffect(() => {
    hooks.current.commit = commit;
    hooks.current.reset = reset;
  });

  useImperativeHandle(ref, () => ({ reset: () => hooks.current.reset() }), []);

  useEffect(() => {
    if (prevKey.current === resetKey) return;
    prevKey.current = resetKey;
    hooks.current.reset();
  }, [resetKey]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const still = reduce;
    let running = false;
    let visible = true;
    let acc = 0;

    const measure = () => {
      sim.w = track.offsetWidth;
      sim.travel = Math.max(0, sim.w - INSET * 2 - R * 2);
      if (sim.mode === "held") sim.x = sim.travel;
    };

    const arrive = () => {
      sim.mode = "held";
      sim.armed = false;
      queueMicrotask(() => hooks.current.commit());
    };

    const step = (dt: number) => {
      const T = sim.travel;
      sim.time += dt;
      if (still) {
        sim.v = 0;
        sim.lean = 0;
        sim.leanV = 0;
        sim.stretch = 0;
        sim.stretchV = 0;
        sim.stir = 0;
        sim.flood = sim.floodGoal;
        sim.floodV = 0;
        sim.calm = sim.calmGoal;
        sim.swell = 0;
        if (sim.mode === "drag") sim.x = clamp(sim.pointer, 0, T);
        else if (sim.mode === "key") sim.x = sim.goal * T;
        else if (sim.mode === "held") sim.x = T;
        else if (sim.mode === "home") {
          sim.fadeT += dt / 0.26;
          if (sim.fadeT >= 0.5) sim.x = 0;
          if (sim.fadeT >= 1) {
            sim.mode = "rest";
            sim.fadeT = 0;
          }
        }
      } else {
        let a = 0;
        if (sim.mode === "drag") a = 1400 * (sim.pointer - sim.x) - 75 * sim.v;
        else if (sim.mode === "home") a = -120 * sim.x - 19 * sim.v;
        else if (sim.mode === "key") a = 240 * (sim.goal * T - sim.x) - 29 * sim.v;
        else if (sim.mode === "held") a = 240 * (T - sim.x) - 29 * sim.v;
        sim.v += a * dt;
        sim.x += sim.v * dt;
        if (sim.x > T) {
          if (sim.v > 0) sim.stretchV -= Math.min(sim.v, 1800) * 0.0009;
          sim.x = T;
          sim.v = Math.min(0, sim.v);
        }
        if (sim.x < -2) {
          sim.x = -2;
          sim.v = Math.max(0, sim.v);
        }
        if (sim.mode === "home" && Math.abs(sim.x) < 0.15 && Math.abs(sim.v) < 3) {
          sim.mode = "rest";
          sim.x = 0;
          sim.v = 0;
        }
        const lean = sim.mode === "held" ? 0 : LEAN * Math.tanh(sim.v / 650);
        sim.leanV += (130 * (lean - sim.lean) - 12 * sim.leanV) * dt;
        sim.lean += sim.leanV * dt;
        const stretch = 0.1 * Math.tanh(Math.abs(sim.v) / 1000);
        sim.stretchV += (360 * (stretch - sim.stretch) - 19 * sim.stretchV) * dt;
        sim.stretch += sim.stretchV * dt;
        sim.stir += (Math.tanh(Math.abs(sim.v) / 700) - sim.stir) * Math.min(1, dt / 0.35);
        sim.calm += (sim.calmGoal - sim.calm) * Math.min(1, dt / 0.4);
        sim.floodV += (110 * (sim.floodGoal - sim.flood) - 19 * sim.floodV) * dt;
        sim.flood += sim.floodV * dt;
        sim.swell += (sim.swellGoal - sim.swell) * Math.min(1, dt / 0.45);
        sim.drift += dt * 30;
      }
      if (committed.current) return;
      if ((sim.mode === "drag" && sim.x >= T - 0.5) || (sim.mode === "key" && sim.armed && sim.x >= T - 0.75)) {
        arrive();
      }
    };

    const paint = () => {
      const stretch = still ? 0 : sim.stretch;
      x.set(sim.x);
      sx.set(1 + stretch);
      sy.set(1 - stretch * 0.5);
      const reveal = smooth(0, 16, sim.x);
      if (still && sim.mode === "home") {
        const f = Math.abs(1 - 2 * sim.fadeT);
        fade.set(f);
        wet.set(sim.fadeT < 0.5 ? reveal * f : 0);
      } else {
        fade.set(1);
        wet.set(reveal);
      }
      const shape = front(sim, still);
      clip.set(`path("${shape.water}")`);
      edge.set(shape.edge);
      swell.set(sim.swell);
      if (sim.swell > 0.002) swellD.set(swellPath(sim));
    };

    const quiet = () => {
      if (sim.mode === "drag" || sim.mode === "home") return false;
      if (sim.mode === "key" && (sim.armed || Math.abs(sim.goal * sim.travel - sim.x) > 0.05 || Math.abs(sim.v) > 0.5))
        return false;
      if (sim.mode === "held" && (Math.abs(sim.travel - sim.x) > 0.05 || Math.abs(sim.v) > 0.5)) return false;
      if (still) return true;
      if (Math.abs(sim.lean) > 0.02 || Math.abs(sim.leanV) > 0.05) return false;
      if (Math.abs(sim.stretch) > 0.0005 || Math.abs(sim.stretchV) > 0.005) return false;
      if (Math.abs(sim.flood - sim.floodGoal) > 0.001 || Math.abs(sim.floodV) > 0.005) return false;
      if (sim.swellGoal > 0 || sim.swell > 0.002) return false;
      if (Math.abs(sim.calm - sim.calmGoal) > 0.005) return false;
      return sim.x < 0.5 || sim.calm < 0.005;
    };

    const tick = ({ delta }: { delta: number }) => {
      acc += clamp(delta / 1000, 0, 0.05);
      let n = 0;
      while (acc >= STEP && n < 4) {
        step(STEP);
        acc -= STEP;
        n++;
      }
      if (n === 4) acc = Math.min(acc, STEP);
      paint();
      if (quiet()) stop();
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      acc = 0;
      frame.update(tick, true);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelFrame(tick);
    };

    hooks.current.kick = start;
    measure();
    paint();
    start();

    const ro = new ResizeObserver(() => {
      measure();
      paint();
      start();
    });
    ro.observe(track);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    io.observe(track);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      hooks.current.kick = () => {};
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce, sim, x, sx, sy, fade, wet, clip, edge, swellD, swell]);

  useEffect(() => {
    if (!reduce || shownGlyph === glyph) return;
    const g = iconRef.current;
    if (!g) {
      setShownGlyph(glyph);
      return;
    }
    const out = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: "ease-in", fill: "forwards" });
    out.onfinish = () => {
      setShownGlyph(glyph);
      g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out", fill: "forwards" });
    };
    return () => {
      out.onfinish = null;
    };
  }, [glyph, reduce, shownGlyph]);

  const valueText = status !== "idle" ? confirmedLabel : value > 0 && value < 100 ? `${label}, ${value}%` : label;

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setAttribute("aria-valuetext", valueText);
    if (status === "idle") input.removeAttribute("aria-readonly");
    else input.setAttribute("aria-readonly", "true");
  });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (isDisabled || committed.current || e.button !== 0 || !e.isPrimary) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const k = track.offsetWidth > 0 ? track.getBoundingClientRect().width / track.offsetWidth : 1;
    drag.current = { id: e.pointerId, k, offset: e.clientX / k - sim.x };
    sim.mode = "drag";
    sim.pointer = sim.x;
    sim.armed = false;
    sim.fadeT = 0;
    inputRef.current?.focus({ preventScroll: true });
    kick();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || sim.mode !== "drag") return;
    sim.pointer = clamp(e.clientX / d.k - d.offset, 0, sim.travel + 64);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (sim.mode !== "drag") return;
    if (sim.x >= sim.travel - 4 || sim.pointer >= sim.travel - 4) {
      sim.mode = "key";
      sim.goal = 1;
      sim.armed = true;
    } else {
      sim.mode = "home";
      sim.fadeT = 0;
      setValue(0);
    }
    kick();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isDisabled || committed.current || e.target !== inputRef.current) return;
    e.preventDefault();
    setValue(100);
    goTo(100);
  };

  const done = status !== "idle";
  const idle = status === "idle" && !isDisabled;
  const colors = tones[tone];
  const iconD = reduce ? shownGlyph : glyph;

  return (
    <Slider
      {...props}
      aria-label={ariaLabel ?? label}
      value={value}
      minValue={0}
      maxValue={100}
      step={10}
      isDisabled={isDisabled}
      onChange={(next) => {
        if (committed.current || sim.mode === "drag") return;
        setValue(next);
        goTo(next);
      }}
      className={composeRenderProps(className, (cls) =>
        cn("group/slide-confirm w-full min-w-0 select-none data-[disabled]:opacity-50", cls),
      )}
      style={composeRenderProps(
        style,
        (s) =>
          ({
            "--miyuki-slide-confirm-water": colors.water,
            "--miyuki-slide-confirm-wet": colors.wet,
            ...s,
          }) as CSSProperties,
      )}
    >
      <style href="miyuki-slide-confirm" precedence="miyuki">
        {keyframes}
      </style>
      <div ref={trackRef} onKeyDown={onKeyDown} className="relative h-12 w-full touch-pan-y">
        <div className="absolute inset-0 overflow-clip rounded-full bg-muted ring-1 ring-border ring-inset">
          <Words label={label} confirmedLabel={confirmedLabel} done={done} className="text-foreground" />
          <motion.svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            style={{ opacity: wet }}
          >
            <motion.path
              d={edge}
              fill="none"
              strokeWidth={10}
              style={{ stroke: `color-mix(in oklab, ${WATER} 8%, transparent)` }}
            />
            <motion.path
              d={edge}
              fill="none"
              strokeWidth={5}
              style={{ stroke: `color-mix(in oklab, ${WATER} 11%, transparent)` }}
            />
          </motion.svg>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              clipPath: clip,
              opacity: wet,
              backgroundImage: `linear-gradient(to bottom, color-mix(in oklab, ${WATER} 95%, white), ${WATER} 50%, color-mix(in oklab, ${WATER} 95%, black))`,
            }}
          >
            <motion.svg
              className="absolute inset-0 size-full overflow-visible [mask-image:linear-gradient(90deg,transparent,#000_22%,#000_68%,transparent)]"
              style={{ opacity: swell }}
            >
              {[30, 18, 8].map((width) => (
                <motion.path
                  key={width}
                  d={swellD}
                  fill="none"
                  strokeWidth={width}
                  strokeLinecap="round"
                  style={{ stroke: "white", strokeOpacity: 0.04 }}
                />
              ))}
            </motion.svg>
            <svg className="absolute inset-0 size-full overflow-visible">
              <motion.path
                d={edge}
                fill="none"
                strokeWidth={2.2}
                style={{ stroke: `color-mix(in oklab, ${WATER} 55%, white)`, strokeOpacity: 0.85 }}
              />
            </svg>
            <Words
              label={label}
              confirmedLabel={confirmedLabel}
              done={done}
              className="text-[var(--miyuki-slide-confirm-wet)]"
            />
          </motion.div>
        </div>
        <motion.div
          className={cn(
            "group/handle absolute top-1 left-1 size-10 touch-none",
            idle ? "cursor-grab active:cursor-grabbing" : isDisabled ? "cursor-not-allowed" : "cursor-default",
          )}
          style={{ x, opacity: fade }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
        >
          <motion.span
            className={cn(
              "absolute inset-0 rounded-full shadow-sm transition-[background-color,box-shadow] duration-300 ease-settle",
              "group-has-[[data-focus-visible]]/slide-confirm:ring-[3px] group-has-[[data-focus-visible]]/slide-confirm:ring-ring",
              "group-has-[[data-focus-visible]]/slide-confirm:ring-offset-[1.5px] group-has-[[data-focus-visible]]/slide-confirm:ring-offset-background",
              flash ? "bg-destructive" : "bg-primary",
            )}
            style={{ scaleX: sx, scaleY: sy }}
          />
          <svg
            viewBox="-12 -12 48 48"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 size-10 overflow-visible transition-colors duration-300 ease-settle",
              flash ? "text-destructive-foreground" : "text-primary-foreground",
            )}
          >
            <circle
              cx={12}
              cy={12}
              r={17}
              strokeWidth={1.8}
              className={cn(
                "transition-opacity duration-300 ease-settle",
                ring === "spin" ? "opacity-25" : "opacity-0",
              )}
            />
            <circle
              cx={12}
              cy={12}
              r={17}
              strokeWidth={1.8}
              pathLength={1}
              className={cn(
                "origin-center transition-[opacity,stroke-dasharray] duration-500 ease-settle [transform-box:fill-box]",
                "animate-[miyuki-slide-confirm-spin_0.9s_linear_infinite] motion-reduce:animate-[miyuki-slide-confirm-spin_2.4s_linear_infinite]",
                ring === "spin" ? "opacity-100" : "opacity-0 [animation-play-state:paused]",
              )}
              style={{ strokeDasharray: ring === "done" ? "1 0" : "0.28 0.72" }}
            />
            <g
              ref={iconRef}
              className={cn(
                "transition-transform duration-200 ease-settle motion-reduce:transition-none",
                idle && "group-hover/handle:translate-x-[2px]",
              )}
            >
              <MorphPath d={iconD} strokeWidth={2.2} transition={{ stiffness: 260, damping: 24 }} />
            </g>
          </svg>
        </motion.div>
        <SliderTrack className="sr-only" />
        <SliderThumb inputRef={inputRef} className="sr-only" />
      </div>
      <span className="sr-only" aria-live="polite">
        {status === "confirmed" ? confirmedLabel : ""}
      </span>
    </Slider>
  );
}
