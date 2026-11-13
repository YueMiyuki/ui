"use client";

import { useReducedMotion } from "motion/react";
import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "react-aria-components";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

const PITCH = 44;
const STILE = 14;
const RAIL = 14;
const BEAD_W = 36;
const BEAD_H = 18;
const GAP_HEAVEN = 15;
const GAP_EARTH = 17;
const BEAM = 10;
const BEAM_TOP = RAIL + BEAD_H + GAP_HEAVEN;
const BEAM_BOTTOM = BEAM_TOP + BEAM;
const EARTH_END = BEAM_BOTTOM + BEAD_H * 4 + GAP_EARTH;
const HEIGHT = EARTH_END + RAIL;
const DRIVE = 9000;
const TOP_SPEED = 620;
const BOUNCE = 0.32;

const PLACES = [
  "Ones",
  "Tens",
  "Hundreds",
  "Thousands",
  "Ten thousands",
  "Hundred thousands",
  "Millions",
  "Ten millions",
  "Hundred millions",
  "Billions",
];

export interface AbacusInputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  rods?: number;
  label?: ReactNode;
  isDisabled?: boolean;
  ref?: Ref<HTMLDivElement>;
}

function heavenSlot(digit: number) {
  return digit >= 5 ? BEAM_TOP - BEAD_H / 2 : RAIL + BEAD_H / 2;
}

function earthSlot(digit: number, k: number) {
  return k < digit % 5 ? BEAM_BOTTOM + BEAD_H / 2 + k * BEAD_H : EARTH_END - BEAD_H / 2 - (3 - k) * BEAD_H;
}

function slots(digit: number) {
  return [heavenSlot(digit), earthSlot(digit, 0), earthSlot(digit, 1), earthSlot(digit, 2), earthSlot(digit, 3)];
}

function readDigit(y: number[]) {
  const heaven = y[0] > (heavenSlot(0) + heavenSlot(5)) / 2 ? 5 : 0;
  let earth = 0;
  for (let k = 0; k < 4; k++) if (y[k + 1] < (earthSlot(0, k) + earthSlot(4, k)) / 2) earth = k + 1;
  return heaven + earth;
}

function toDigits(value: number, rods: number) {
  const out: number[] = [];
  let v = Math.max(0, Math.floor(value));
  for (let i = 0; i < rods; i++) {
    out.unshift(v % 10);
    v = Math.floor(v / 10);
  }
  return out;
}

function fromDigits(digits: number[]) {
  return digits.reduce((acc, d) => acc * 10 + d, 0);
}

function beadPath() {
  const w = BEAD_W / 2;
  const h = BEAD_H / 2;
  return `M ${-w} 0 C ${-w + 1} -2.6 ${-w * 0.5} ${-h + 0.2} -4.5 ${-h} H 4.5 C ${w * 0.5} ${-h + 0.2} ${w - 1} -2.6 ${w} 0 C ${w - 1} 2.6 ${w * 0.5} ${h - 0.2} 4.5 ${h} H -4.5 C ${-w * 0.5} ${h - 0.2} ${-w + 1} 2.6 ${-w} 0 Z`;
}

export function AbacusInput({
  value,
  defaultValue = 0,
  onChange,
  rods = 5,
  label,
  isDisabled = false,
  className,
  ...props
}: AbacusInputProps) {
  const reduce = useReducedMotion() ?? false;
  const { locale } = useLocale();
  const id = useId();
  const svgId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const max = 10 ** rods - 1;
  const [internal, setInternal] = useState(() => Math.min(max, Math.max(0, Math.floor(defaultValue))));
  const current = Math.min(max, Math.max(0, Math.floor(value ?? internal)));
  const digits = useMemo(() => toDigits(current, rods), [current, rods]);
  const [shown, setShown] = useState(digits);
  const [initial] = useState(digits);
  const [focusIndex, setFocusIndex] = useState(rods - 1);
  const [focusedRod, setFocusedRod] = useState<number | null>(null);
  const [ring, setRing] = useState(false);
  const beadRefs = useRef<(SVGGElement | null)[][]>([]);
  const rodRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerFocus = useRef(false);
  const kick = useRef<(targets: number[][]) => void>(() => {});
  const latest = useRef<{
    digits: number[];
    isDisabled: boolean;
    commit: (next: number[]) => void;
    grab: (rod: number) => void;
  }>({ digits, isDisabled, commit: () => {}, grab: () => {} });
  const width = STILE * 2 + rods * PITCH;

  const grain = useMemo(() => {
    const rng = createRng(`abacus-${rods}`);
    return Array.from({ length: 7 }, (_, i) => ({
      y: 2 + i * 1.7 + rng.range(-0.4, 0.4),
      a: rng.range(0.4, 1.4),
      f: rng.range(0.012, 0.03),
      p: rng.range(0, Math.PI * 2),
      o: rng.range(0.25, 0.6),
    }));
  }, [rods]);

  const commit = (next: number[]) => {
    const n = fromDigits(next);
    if (n === current) return;
    if (value === undefined) setInternal(n);
    onChange?.(n);
  };

  const grab = (rod: number) => {
    pointerFocus.current = true;
    rodRefs.current[rod]?.focus({ preventScroll: true });
    pointerFocus.current = false;
    setFocusIndex(rod);
    setRing(false);
  };

  useEffect(() => {
    latest.current = { digits, isDisabled, commit, grab };
  });

  useEffect(() => {
    kick.current(digits.map(slots));
  }, [digits]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const start = latest.current.digits.length === rods ? latest.current.digits : initial;
    let targets = start.map(slots);
    const y = (initial.length === rods ? initial : start).map(slots);
    const v = targets.map(() => [0, 0, 0, 0, 0]);
    let drag: { rod: number; bead: number; offset: number; startY: number; moved: boolean; id: number } | null = null;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let busy = true;
    let lastShown = "";

    const place = () => {
      for (let r = 0; r < y.length; r++) {
        for (let b = 0; b < 5; b++) {
          const g = beadRefs.current[r]?.[b];
          if (g) g.setAttribute("transform", `translate(${STILE + PITCH * (r + 0.5)} ${y[r][b].toFixed(2)})`);
        }
      }
      const read = y.map(readDigit);
      const key = read.join("");
      if (key !== lastShown) {
        lastShown = key;
        setShown(read);
      }
    };

    const collide = (ys: number[], vs: number[], i: number, j: number, held: number) => {
      const gap = ys[j] - ys[i];
      if (gap >= BEAD_H) return;
      const overlap = BEAD_H - gap;
      if (i === held) ys[j] += overlap;
      else if (j === held) ys[i] -= overlap;
      else {
        ys[i] -= overlap / 2;
        ys[j] += overlap / 2;
      }
      const rel = vs[j] - vs[i];
      if (rel >= 0) return;
      if (i === held) vs[j] = vs[i] - rel * BOUNCE;
      else if (j === held) vs[i] = vs[j] + rel * BOUNCE;
      else {
        const impulse = (-(1 + BOUNCE) * rel) / 2;
        vs[i] -= impulse;
        vs[j] += impulse;
      }
    };

    const wall = (ys: number[], vs: number[], i: number, lo: number, hi: number) => {
      if (ys[i] < lo) {
        ys[i] = lo;
        if (vs[i] < 0) vs[i] = -vs[i] * BOUNCE;
      } else if (ys[i] > hi) {
        ys[i] = hi;
        if (vs[i] > 0) vs[i] = -vs[i] * BOUNCE;
      }
    };

    const step = (dt: number) => {
      let moving = false;
      for (let r = 0; r < y.length; r++) {
        const ys = y[r];
        const vs = v[r];
        const t = targets[r];
        const held = drag && drag.rod === r ? drag.bead : -1;
        for (let b = 0; b < 5; b++) {
          if (b === held) continue;
          const d = t[b] - ys[b];
          if (Math.abs(d) < 0.05 && Math.abs(vs[b]) < 6) {
            ys[b] = t[b];
            vs[b] = 0;
            continue;
          }
          moving = true;
          vs[b] += Math.sign(d) * DRIVE * dt;
          if (Math.abs(d) < 0.6) vs[b] *= 0.9;
          vs[b] = Math.max(-TOP_SPEED, Math.min(TOP_SPEED, vs[b]));
          ys[b] += vs[b] * dt;
        }
        for (let pass = 0; pass < 3; pass++) {
          wall(ys, vs, 0, RAIL + BEAD_H / 2, BEAM_TOP - BEAD_H / 2);
          wall(ys, vs, 1, BEAM_BOTTOM + BEAD_H / 2, EARTH_END - BEAD_H / 2 - 3 * BEAD_H);
          wall(ys, vs, 4, BEAM_BOTTOM + BEAD_H / 2 + 3 * BEAD_H, EARTH_END - BEAD_H / 2);
          for (let b = 1; b < 4; b++) collide(ys, vs, b, b + 1, held);
          for (let b = 3; b >= 1; b--) collide(ys, vs, b, b + 1, held);
        }
        if (held >= 0) moving = true;
      }
      return moving;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      let moving = false;
      if (reduce) {
        for (let r = 0; r < y.length; r++) {
          if (drag && drag.rod === r) {
            moving = true;
            continue;
          }
          y[r] = targets[r].slice();
          v[r] = [0, 0, 0, 0, 0];
        }
        if (drag) moving = step(0) || moving;
      } else {
        acc += dt;
        let guard = 0;
        let stepped = false;
        while (acc >= 1 / 240 && guard++ < 24) {
          moving = step(1 / 240) || moving;
          acc -= 1 / 240;
          stepped = true;
        }
        if (stepped) busy = moving;
        else moving = busy;
      }
      place();
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const run = () => {
      if (raf) return;
      last = 0;
      acc = 0;
      busy = true;
      raf = requestAnimationFrame(frame);
    };

    const svgY = (clientY: number) => {
      const rect = svg.getBoundingClientRect();
      return ((clientY - rect.top) / rect.height) * HEIGHT;
    };

    const down = (event: PointerEvent) => {
      const bead = (event.target as Element).closest("[data-bead]");
      if (!bead || latest.current.isDisabled || event.button !== 0) return;
      event.preventDefault();
      const rod = Number(bead.getAttribute("data-rod"));
      const index = Number(bead.getAttribute("data-bead"));
      latest.current.grab(rod);
      drag = {
        rod,
        bead: index,
        offset: svgY(event.clientY) - y[rod][index],
        startY: event.clientY,
        moved: false,
        id: event.pointerId,
      };
      v[rod][index] = 0;
      svg.setPointerCapture(event.pointerId);
      run();
    };

    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      if (Math.abs(event.clientY - drag.startY) > 3) drag.moved = true;
      if (!drag.moved) return;
      const b = drag.bead;
      const lo = b === 0 ? RAIL + BEAD_H / 2 : BEAM_BOTTOM + BEAD_H / 2 + (b - 1) * BEAD_H;
      const hi = b === 0 ? BEAM_TOP - BEAD_H / 2 : EARTH_END - BEAD_H / 2 - (4 - b) * BEAD_H;
      y[drag.rod][b] = Math.max(lo, Math.min(hi, svgY(event.clientY) - drag.offset));
      run();
    };

    const up = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const { rod, bead, moved } = drag;
      drag = null;
      const digitsNow = latest.current.digits;
      const next = digitsNow.slice();
      const digit = digitsNow[rod];
      if (!moved) {
        if (bead === 0) next[rod] = digit >= 5 ? digit - 5 : digit + 5;
        else {
          const k = bead - 1;
          const earth = digit % 5;
          next[rod] = digit - earth + (k < earth ? k : k + 1);
        }
      } else {
        next[rod] = readDigit(y[rod]);
      }
      targets = next.map(slots);
      run();
      latest.current.commit(next);
    };

    kick.current = (next) => {
      if (next.length !== y.length) return;
      targets = next;
      run();
    };
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    run();
    return () => {
      cancelAnimationFrame(raf);
      kick.current = () => {};
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
    };
  }, [reduce, rods, initial]);

  const setDigit = (rod: number, digit: number) => {
    const next = digits.slice();
    next[rod] = Math.max(0, Math.min(9, digit));
    commit(next);
  };

  const moveFocus = (rod: number) => {
    const target = Math.max(0, Math.min(rods - 1, rod));
    setFocusIndex(target);
    rodRefs.current[target]?.focus();
  };

  const onKeyDown = (rod: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    setRing(true);
    const digit = digits[rod];
    let handled = true;
    if (event.key === "ArrowUp") setDigit(rod, digit + 1);
    else if (event.key === "ArrowDown") setDigit(rod, digit - 1);
    else if (event.key === "PageUp") setDigit(rod, digit + 5);
    else if (event.key === "PageDown") setDigit(rod, digit - 5);
    else if (event.key === "Home") setDigit(rod, 0);
    else if (event.key === "End") setDigit(rod, 9);
    else if (event.key === "ArrowLeft") moveFocus(rod - 1);
    else if (event.key === "ArrowRight") moveFocus(rod + 1);
    else if (/^[0-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      setDigit(rod, Number(event.key));
      moveFocus(rod + 1);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      setDigit(rod, 0);
      if (event.key === "Backspace") moveFocus(rod - 1);
    } else handled = false;
    if (handled) event.preventDefault();
  };

  const formatted = useMemo(() => new Intl.NumberFormat(locale).format(fromDigits(shown)), [locale, shown]);
  const frameGradient = `${svgId}-frame`;
  const beadGradient = `${svgId}-bead`;

  return (
    <div
      {...props}
      role="group"
      aria-labelledby={label != null ? `${id}-label` : undefined}
      aria-disabled={isDisabled || undefined}
      data-disabled={isDisabled || undefined}
      className={cn(
        "flex w-fit max-w-full flex-col gap-1.5",
        "[--miyuki-abacus-input-wood:oklch(0.8_0.072_72)] [--miyuki-abacus-input-wood-light:oklch(0.88_0.05_80)] [--miyuki-abacus-input-wood-dark:oklch(0.66_0.08_60)]",
        "[--miyuki-abacus-input-grain:oklch(0.6_0.075_55)] [--miyuki-abacus-input-rod:oklch(0.5_0.035_60)]",
        "[--miyuki-abacus-input-bead:oklch(0.34_0.05_40)] [--miyuki-abacus-input-bead-light:oklch(0.55_0.07_50)] [--miyuki-abacus-input-bead-dark:oklch(0.22_0.035_35)]",
        "dark:[--miyuki-abacus-input-wood:oklch(0.4_0.05_55)] dark:[--miyuki-abacus-input-wood-light:oklch(0.5_0.055_62)] dark:[--miyuki-abacus-input-wood-dark:oklch(0.3_0.04_50)]",
        "dark:[--miyuki-abacus-input-grain:oklch(0.27_0.035_45)] dark:[--miyuki-abacus-input-rod:oklch(0.62_0.03_70)]",
        "dark:[--miyuki-abacus-input-bead:oklch(0.7_0.08_68)] dark:[--miyuki-abacus-input-bead-light:oklch(0.85_0.07_78)] dark:[--miyuki-abacus-input-bead-dark:oklch(0.5_0.075_55)]",
        isDisabled && "opacity-50",
        className,
      )}
    >
      {label != null && (
        <span id={`${id}-label`} className="w-fit text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      <output
        id={`${id}-total`}
        aria-live="off"
        className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] text-foreground tabular-nums"
      >
        {formatted}
      </output>
      <div className="relative mt-1.5 w-fit max-w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          aria-hidden="true"
          className="block h-auto max-w-full touch-none select-none"
        >
          <defs>
            <linearGradient id={frameGradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--miyuki-abacus-input-wood-light)" }} />
              <stop offset="0.35" style={{ stopColor: "var(--miyuki-abacus-input-wood)" }} />
              <stop offset="1" style={{ stopColor: "var(--miyuki-abacus-input-wood-dark)" }} />
            </linearGradient>
            <linearGradient id={beadGradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--miyuki-abacus-input-bead-light)" }} />
              <stop offset="0.46" style={{ stopColor: "var(--miyuki-abacus-input-bead)" }} />
              <stop offset="0.5" style={{ stopColor: "var(--miyuki-abacus-input-bead-dark)" }} />
              <stop offset="1" style={{ stopColor: "var(--miyuki-abacus-input-bead)" }} />
            </linearGradient>
          </defs>
          <rect
            x={STILE - 2}
            y={RAIL - 2}
            width={width - STILE * 2 + 4}
            height={HEIGHT - RAIL * 2 + 4}
            className="fill-muted/70 dark:fill-background/50"
          />
          {digits.map((_, r) => (
            <line
              key={r}
              x1={STILE + PITCH * (r + 0.5)}
              x2={STILE + PITCH * (r + 0.5)}
              y1={RAIL}
              y2={HEIGHT - RAIL}
              strokeWidth={2}
              style={{ stroke: "var(--miyuki-abacus-input-rod)" }}
            />
          ))}
          {[
            { x: 0, y: 0, w: width, h: RAIL },
            { x: 0, y: HEIGHT - RAIL, w: width, h: RAIL },
            { x: 0, y: BEAM_TOP, w: width, h: BEAM },
          ].map((p, i) => (
            <g key={i}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`url(#${frameGradient})`} />
              {grain.map((g, j) => (
                <path
                  key={j}
                  d={`M 0 ${(p.y + (g.y / 14) * p.h).toFixed(2)} ${Array.from({ length: 12 }, (_, s) => {
                    const x = ((s + 1) / 12) * width;
                    return `L ${x.toFixed(1)} ${(p.y + (g.y / 14) * p.h + Math.sin(x * g.f + g.p + i) * g.a * (p.h / 14)).toFixed(2)}`;
                  }).join(" ")}`}
                  fill="none"
                  strokeWidth={0.6}
                  opacity={g.o * 0.7}
                  style={{ stroke: "var(--miyuki-abacus-input-grain)" }}
                />
              ))}
              <rect x={p.x} y={p.y} width={p.w} height={0.75} fill="white" opacity={0.35} />
              <rect x={p.x} y={p.y + p.h - 0.75} width={p.w} height={0.75} fill="black" opacity={0.18} />
            </g>
          ))}
          {[0, 1].map((side) => (
            <g key={side}>
              <rect x={side ? width - STILE : 0} y={0} width={STILE} height={HEIGHT} fill={`url(#${frameGradient})`} />
              <rect
                x={side ? width - STILE : STILE - 0.75}
                y={0}
                width={0.75}
                height={HEIGHT}
                fill="black"
                opacity={0.14}
              />
            </g>
          ))}
          <rect
            x={0.5}
            y={0.5}
            width={width - 1}
            height={HEIGHT - 1}
            rx={3}
            fill="none"
            stroke="black"
            strokeOpacity={0.16}
          />
          {digits.map((_, r) =>
            (rods - 1 - r) % 3 === 0 ? (
              <circle
                key={r}
                cx={STILE + PITCH * (r + 0.5)}
                cy={BEAM_TOP + BEAM / 2}
                r={1.6}
                fill="white"
                opacity={0.8}
              />
            ) : null,
          )}
          {digits.map((_, r) => (
            <g key={r}>
              {[0, 1, 2, 3, 4].map((b) => (
                <g
                  key={b}
                  ref={(el) => {
                    beadRefs.current[r] ??= [];
                    beadRefs.current[r][b] = el;
                  }}
                  transform={`translate(${STILE + PITCH * (r + 0.5)} ${(initial.length === rods ? slots(initial[r]) : slots(0))[b]})`}
                  data-rod={r}
                  data-bead={b}
                  className={isDisabled ? "cursor-not-allowed" : "cursor-grab"}
                >
                  <path d={beadPath()} fill={`url(#${beadGradient})`} />
                  <path
                    d={`M ${-BEAD_W / 2 + 4} -2.6 C ${-BEAD_W / 4} -6.6 ${BEAD_W / 4} -6.6 ${BEAD_W / 2 - 4} -2.6`}
                    fill="none"
                    stroke="white"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    opacity={0.32}
                  />
                  <path d={beadPath()} fill="none" stroke="black" strokeOpacity={0.22} strokeWidth={0.75} />
                </g>
              ))}
            </g>
          ))}
        </svg>
        {digits.map((digit, r) => (
          <div
            key={r}
            ref={(el) => {
              rodRefs.current[r] = el;
            }}
            role="spinbutton"
            tabIndex={isDisabled ? -1 : r === focusIndex ? 0 : -1}
            aria-label={PLACES[rods - 1 - r] ?? `10^${rods - 1 - r}`}
            aria-valuenow={digit}
            aria-valuemin={0}
            aria-valuemax={9}
            aria-describedby={`${id}-total`}
            aria-disabled={isDisabled || undefined}
            onKeyDown={onKeyDown(r)}
            onFocus={() => {
              setFocusIndex(r);
              setFocusedRod(r);
              if (!pointerFocus.current) setRing(true);
            }}
            onBlur={() => setFocusedRod((f) => (f === r ? null : f))}
            className={cn(
              "pointer-events-none absolute rounded-md outline-none transition-[box-shadow] duration-150 ease-settle",
              focusedRod === r && ring && "ring-[3px] ring-ring",
            )}
            style={{
              left: `${((STILE + PITCH * r + 2) / width) * 100}%`,
              width: `${((PITCH - 4) / width) * 100}%`,
              top: `${(3 / HEIGHT) * 100}%`,
              bottom: `${(3 / HEIGHT) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
