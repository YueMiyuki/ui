"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

const N = 10;
const TAU = Math.PI * 2;
const HANDLE = (4 / 3) * Math.tan(Math.PI / (2 * N));
const STEP = 1 / 120;
const SWELL = 0.03;
const SINK = 0.04;
const PRESS = 0.055;
const DENT = 0.014;
const TURN = 0.6;
const SETTLE = 0.3;
const PERIODS = [34, 21, 13.3];
const WEIGHTS = [0.5, 0.32, 0.18];
const CHANNELS = 6;

interface Field {
  waves: number[];
  theta: number;
  phi: number;
  psi3: number;
  psi4: number;
}

interface Pose {
  h: number;
  jx: number;
  jy: number;
  kc: number;
  ks: number;
  limit: number;
}

interface Shape {
  d: string;
  bottom: number;
  width: number;
}

const REST: Pose = { h: 0, jx: 0, jy: 0, kc: 0, ks: 0, limit: 0.497 };

function makeField(seed: number | string): Field {
  const rng = createRng(`pebble-frame:${seed}`);
  const waves: number[] = [];
  for (let c = 0; c < CHANNELS; c++) {
    for (let j = 0; j < 3; j++) waves.push(TAU / (PERIODS[j] * rng.range(0.84, 1.18)), rng() * TAU);
  }
  return { waves, theta: (rng() * TAU) / N, phi: rng() * Math.PI, psi3: rng() * TAU, psi4: rng() * TAU };
}

function wave(f: Field, c: number, t: number) {
  let s = 0;
  for (let j = 0; j < 3; j++) {
    const k = (c * 3 + j) * 2;
    s += WEIGHTS[j] * Math.sin(f.waves[k] * t + f.waves[k + 1]);
  }
  return s;
}

const px = new Float64Array(N);
const py = new Float64Array(N);
const tx = new Float64Array(N);
const ty = new Float64Array(N);
const num = (v: number) => String(Math.round(v * 10000) / 10000);

function outline(f: Field, wobble: number, t: number, pose: Pose): Shape {
  const E = 0.24 * wobble;
  const M3 = 0.07 * wobble;
  const M4 = 0.015 * wobble;
  const R = Math.min(0.45, 0.482 / ((1 + E) * (1 + M3 + M4 + DENT)));
  const free = 1 - pose.h;
  const e = free * E * (0.68 + 0.32 * wave(f, 0, t));
  const phi = f.phi + TURN * wave(f, 1, t);
  const a3 = free * M3 * (0.55 + 0.45 * wave(f, 2, t));
  const psi3 = f.psi3 + 0.7 * wave(f, 3, t);
  const a4 = free * M4 * (0.5 + 0.5 * wave(f, 4, t));
  const psi4 = f.psi4 + 0.8 * wave(f, 5, t);
  const bend = 10 * (Math.abs(a3) + Math.hypot(pose.kc, pose.ks)) + 17 * Math.abs(a4);
  const tame = bend > 0.7 ? 0.7 / bend : 1;
  const sxx = e * Math.cos(2 * phi) + pose.jx;
  const sxy = e * Math.sin(2 * phi) + pose.jy;
  const size = R * (1 + SWELL * pose.h);

  let reach = 0;
  for (let i = 0; i < N; i++) {
    const th = f.theta + (TAU * i) / N;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const p3 = 3 * (th - psi3);
    const p4 = 4 * (th - psi4);
    const rho =
      1 + tame * (a3 * Math.cos(p3) + a4 * Math.cos(p4) + pose.kc * Math.cos(3 * th) + pose.ks * Math.sin(3 * th));
    const slope =
      tame *
      (-3 * a3 * Math.sin(p3) -
        4 * a4 * Math.sin(p4) -
        3 * pose.kc * Math.sin(3 * th) +
        3 * pose.ks * Math.cos(3 * th));
    const ux = rho * c;
    const uy = rho * sn;
    const dx = slope * c - rho * sn;
    const dy = slope * sn + rho * c;
    px[i] = (ux + sxx * ux + sxy * uy) * size;
    py[i] = (uy + sxy * ux - sxx * uy) * size;
    tx[i] = (dx + sxx * dx + sxy * dy) * size * HANDLE;
    ty[i] = (dy + sxy * dx - sxx * dy) * size * HANDLE;
    reach = Math.max(
      reach,
      Math.abs(px[i] + tx[i]),
      Math.abs(py[i] + ty[i]),
      Math.abs(px[i] - tx[i]),
      Math.abs(py[i] - ty[i]),
    );
  }
  const fit = reach > pose.limit ? pose.limit / reach : 1;

  let bottom = -1;
  let left = 1;
  let right = -1;
  let d = `M${num(0.5 + px[0] * fit)} ${num(0.5 + py[0] * fit)}`;
  for (let i = 0; i < N; i++) {
    const b = (i + 1) % N;
    d += `C${num(0.5 + (px[i] + tx[i]) * fit)} ${num(0.5 + (py[i] + ty[i]) * fit)} ${num(0.5 + (px[b] - tx[b]) * fit)} ${num(0.5 + (py[b] - ty[b]) * fit)} ${num(0.5 + px[b] * fit)} ${num(0.5 + py[b] * fit)}`;
    bottom = Math.max(bottom, py[i]);
    left = Math.min(left, px[i]);
    right = Math.max(right, px[i]);
  }
  return { d: `${d}Z`, bottom: 0.5 + bottom * fit, width: (right - left) * fit };
}

type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let pumpId = 0;

function pump(now: number) {
  pumpId = ticks.size ? requestAnimationFrame(pump) : 0;
  for (const tick of ticks) tick(now);
}

function subscribe(tick: Tick) {
  ticks.add(tick);
  if (!pumpId) pumpId = requestAnimationFrame(pump);
  return () => {
    ticks.delete(tick);
    if (!ticks.size && pumpId) {
      cancelAnimationFrame(pumpId);
      pumpId = 0;
    }
  };
}

interface Springs {
  h: number;
  hv: number;
  g: number;
  gv: number;
  jx: number;
  jxv: number;
  jy: number;
  jyv: number;
  kc: number;
  kcv: number;
  ks: number;
  ksv: number;
}

const still = (): Springs => ({ h: 0, hv: 0, g: 0, gv: 0, jx: 0, jxv: 0, jy: 0, jyv: 0, kc: 0, kcv: 0, ks: 0, ksv: 0 });
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export interface PebbleFrameProps extends ComponentProps<"div"> {
  seed?: number | string;
  wobble?: number;
  speed?: number;
  ring?: boolean;
  interactive?: boolean;
  shadow?: boolean;
  color?: string;
}

export function PebbleFrame({
  seed = 1,
  wobble = 0.5,
  speed = 1,
  ring = false,
  interactive = true,
  shadow = false,
  color = "var(--brand)",
  className,
  style,
  children,
  ref,
  ...props
}: PebbleFrameProps) {
  const reduced = useReducedMotion() ?? false;
  const id = `miyuki-pebble-frame-${useId().replace(/[^\w-]/g, "")}`;
  const field = useMemo(() => makeField(seed), [seed]);
  const amount = Math.min(1, Math.max(0, wobble));
  const initial = useMemo(() => outline(field, amount, 0, REST), [field, amount]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const clipRef = useRef<SVGPathElement>(null);
  const focusRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const opts = useRef({ field, amount, speed });

  useLayoutEffect(() => {
    opts.current = { field, amount, speed };
  });

  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const root = rootRef.current;
    const clip = clipRef.current;
    const content = contentRef.current;
    if (!root || !clip || !content) return;

    let hovered = false;
    let focused = false;
    let hT = 0;
    let armed = false;
    let ringing = 5;
    const aim = () => {
      const next = interactive && (hovered || focused) ? 1 : 0;
      armed = next === 1 && (hT === 0 || armed);
      hT = next;
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      root.dataset.hovered = "";
      hovered = true;
      aim();
    };
    const onLeave = () => {
      delete root.dataset.hovered;
      hovered = false;
      aim();
    };

    if (reduced) {
      if (!interactive) return;
      root.addEventListener("pointerenter", onEnter);
      root.addEventListener("pointerleave", onLeave);
      return () => {
        root.removeEventListener("pointerenter", onEnter);
        root.removeEventListener("pointerleave", onLeave);
        delete root.dataset.hovered;
      };
    }

    const s = still();
    const was = still();
    const pose: Pose = { ...REST };
    let pressed = false;
    let jxT = 0;
    let jyT = 0;
    let kcT = 0;
    let ksT = 0;
    let clock = 0;
    let acc = 0;
    let last = -1;
    let scale = 1;
    let focusLive = root.contains(document.activeElement);
    let focusUntil = 0;
    let visible = false;
    let stop: (() => void) | null = null;

    const step = (dt: number) => {
      const rising = hT > 0.5;
      const k = rising ? 190 : 120;
      const c = rising ? 12 : 19;
      s.hv += (k * (hT - s.h) - c * s.hv) * dt;
      s.h += s.hv * dt;
      s.gv += (150 * (s.h - s.g) - 21 * s.gv) * dt;
      s.g += s.gv * dt;
      if (armed && s.h > 0.85) {
        armed = false;
        ringing = 9;
        const axis = 2 * (opts.current.field.phi + TURN * wave(opts.current.field, 1, clock));
        s.jxv -= SETTLE * Math.cos(axis);
        s.jyv -= SETTLE * Math.sin(axis);
      }
      const c2 = pressed ? 17 : ringing;
      s.jxv += (300 * (jxT - s.jx) - c2 * s.jxv) * dt;
      s.jx += s.jxv * dt;
      s.jyv += (300 * (jyT - s.jy) - c2 * s.jyv) * dt;
      s.jy += s.jyv * dt;
      const c3 = pressed ? 27 : 7.5;
      s.kcv += (760 * (kcT - s.kc) - c3 * s.kcv) * dt;
      s.kc += s.kcv * dt;
      s.ksv += (760 * (ksT - s.ks) - c3 * s.ksv) * dt;
      s.ks += s.ksv * dt;
    };

    const tick = (now: number) => {
      const o = opts.current;
      if (last < 0) last = now;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      clock += dt * o.speed;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 4) {
        Object.assign(was, s);
        step(STEP);
        acc -= STEP;
        n++;
      }
      if (acc >= STEP) acc %= STEP;
      const a = acc / STEP;
      const h = Math.min(1.4, Math.max(-0.2, mix(was.h, s.h, a)));
      const g = Math.min(1.4, Math.max(-0.2, mix(was.g, s.g, a)));
      const next = Math.abs(g) < 1e-4 ? 1 : 1 - SINK * g;
      pose.h = h;
      pose.jx = mix(was.jx, s.jx, a);
      pose.jy = mix(was.jy, s.jy, a);
      pose.kc = mix(was.kc, s.kc, a);
      pose.ks = mix(was.ks, s.ks, a);
      pose.limit = 0.5 * next - 0.003;
      const shape = outline(o.field, o.amount, clock, pose);
      clip.setAttribute("d", shape.d);
      ringRef.current?.setAttribute("d", shape.d);
      if (focusLive || now < focusUntil) focusRef.current?.setAttribute("d", shape.d);
      if (Math.abs(next - scale) > 2e-5 || (next === 1 && scale !== 1)) {
        scale = next;
        content.style.transform = next === 1 ? "" : `scale(${next.toFixed(5)})`;
      }
      const sh = shadowRef.current;
      if (sh) {
        const dy = ((shape.bottom - 0.945) / 0.16) * 100;
        sh.style.transform = `translate3d(0, ${dy.toFixed(2)}%, 0) scale(${(shape.width / 0.84).toFixed(4)}, 1)`;
      }
    };

    const sync = () => {
      const run = visible && !document.hidden;
      if (run && !stop) {
        last = -1;
        stop = subscribe(tick);
      } else if (!run && stop) {
        stop();
        stop = null;
      }
    };

    const release = () => {
      if (pressed) ringing = 5;
      pressed = false;
      jxT = 0;
      jyT = 0;
      kcT = 0;
      ksT = 0;
      delete root.dataset.pressed;
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      const dist = Math.min(1, Math.hypot(dx, dy) / 0.5);
      const angle = dist < 0.12 ? -Math.PI / 2 : Math.atan2(dy, dx);
      pressed = true;
      root.dataset.pressed = "";
      jxT = -PRESS * Math.cos(2 * angle);
      jyT = -PRESS * Math.sin(2 * angle);
      kcT = -DENT * dist * Math.cos(3 * angle);
      ksT = -DENT * dist * Math.sin(3 * angle);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
      s.jxv += 1.1;
      s.kcv -= 0.25;
    };

    const onFocusIn = (e: FocusEvent) => {
      focusLive = true;
      focused = e.target instanceof Element && e.target.matches(":focus-visible");
      aim();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && root.contains(e.relatedTarget)) return;
      focusLive = false;
      focusUntil = last + 400;
      focused = false;
      aim();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((en) => en.isIntersecting);
        sync();
      },
      { rootMargin: "80px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    if (interactive) {
      root.addEventListener("pointerenter", onEnter);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("pointerdown", onDown);
      root.addEventListener("keydown", onKey);
    }

    return () => {
      stop?.();
      io.disconnect();
      release();
      document.removeEventListener("visibilitychange", sync);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("keydown", onKey);
      delete root.dataset.hovered;
      content.style.transform = "";
    };
  }, [reduced, interactive]);

  return (
    <div
      {...props}
      ref={setRoot}
      data-slot="pebble-frame"
      className={cn(
        "group/pebble relative isolate block aspect-square w-48 shrink-0",
        "[--miyuki-pebble-frame-shade:oklch(0.42_0.09_250/0.3)] dark:[--miyuki-pebble-frame-shade:oklch(0.07_0.025_252/0.72)] ink:[--miyuki-pebble-frame-shade:oklch(0.07_0_0/0.72)]",
        className,
      )}
      style={{ "--miyuki-pebble-frame-color": color, ...style } as CSSProperties}
    >
      <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
        <defs>
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <path ref={clipRef} d={initial.d} />
          </clipPath>
        </defs>
      </svg>
      {shadow ? (
        <div
          ref={shadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-[90%] right-[14%] left-[14%] -z-10 h-[16%] origin-center"
          style={{
            backgroundImage:
              "radial-gradient(closest-side, var(--miyuki-pebble-frame-shade), color-mix(in oklab, var(--miyuki-pebble-frame-shade) 45%, transparent) 55%, transparent)",
            transform: `translate3d(0, ${(((initial.bottom - 0.945) / 0.16) * 100).toFixed(2)}%, 0) scale(${(initial.width / 0.84).toFixed(4)}, 1)`,
          }}
        />
      ) : null}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        <path
          ref={focusRef}
          d={initial.d}
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="stroke-ring [stroke-width:0] transition-[stroke-width] duration-200 ease-settle group-has-[:focus-visible]/pebble:[stroke-width:6px] motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 [&_:focus-visible]:outline-none" style={{ clipPath: `url(#${id})` }}>
        <div
          ref={contentRef}
          className="size-full origin-center will-change-transform [&>*]:block [&>*]:size-full [&>img]:object-cover [&>video]:object-cover"
        >
          {children}
        </div>
      </div>
      {ring ? (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <path
            ref={ringRef}
            d={initial.d}
            fill="none"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className="stroke-foreground/15 transition-[stroke] duration-200 ease-settle group-has-[:focus-visible]/pebble:stroke-(--miyuki-pebble-frame-color) group-data-[hovered]/pebble:stroke-(--miyuki-pebble-frame-color) dark:stroke-foreground/20"
          />
        </svg>
      ) : null}
    </div>
  );
}
