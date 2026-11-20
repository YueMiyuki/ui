"use client";

import { useReducedMotion } from "motion/react";
import {
  Children,
  type ComponentProps,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type TanzakuTone = "snow" | "water" | "seafoam" | "wisteria" | "yuzu" | "camellia";

const TONES: Record<TanzakuTone, string> = {
  snow: "[--miyuki-tanzaku-card-tint:var(--card)] dark:[--miyuki-tanzaku-card-tint:var(--foreground)]",
  water: "[--miyuki-tanzaku-card-tint:var(--brand)]",
  seafoam: "[--miyuki-tanzaku-card-tint:var(--chart-2)]",
  wisteria: "[--miyuki-tanzaku-card-tint:var(--chart-3)]",
  yuzu: "[--miyuki-tanzaku-card-tint:var(--chart-4)]",
  camellia: "[--miyuki-tanzaku-card-tint:var(--chart-5)]",
};

const WASHI = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' seed='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.012 .16' numOctaves='3' seed='6' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 3 -1.75'/></filter><rect width='240' height='240' filter='url(#a)'/><rect width='240' height='240' filter='url(#b)'/></svg>",
)}")`;

const THREAD = 22;
const CORD = 16;
const SAG = 7;
const W0 = (2 * Math.PI) / 1.3;
const WT = (2 * Math.PI) / 2.3;

interface Strip {
  slot: HTMLElement;
  rotor: HTMLElement;
  paper: HTMLElement;
  shade: HTMLElement;
  thread: SVGPathElement;
  rest: number;
  a: number;
  v: number;
  t: number;
  tv: number;
  dip: number;
  x: number;
  w: number;
  h: number;
}

interface LineApi {
  register: (i: number, s: Strip | null) => void;
  push: (i: number, side: number) => void;
  reduced: boolean;
}

const LineContext = createContext<LineApi | null>(null);
const SlotContext = createContext<{ index: number; count: number }>({ index: 0, count: 1 });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface TanzakuLineProps extends ComponentProps<"div"> {
  breeze?: number;
}

export function TanzakuLine({ breeze = 0.3, className, children, ...props }: TanzakuLineProps) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const cordRef = useRef<SVGPathElement>(null);
  const strips = useRef<(Strip | null)[]>([]);
  const kick = useRef<() => void>(() => {});
  const items = Children.toArray(children).filter(isValidElement);
  const count = items.length;
  const opts = useRef({ breeze, reduced });
  useLayoutEffect(() => {
    opts.current = { breeze, reduced };
    kick.current();
  });

  const api = useMemo<LineApi>(
    () => ({
      register: (i, s) => {
        strips.current[i] = s;
      },
      push: (i, side) => {
        const s = strips.current[i];
        if (!s || opts.current.reduced) return;
        s.v += side * 1.5;
        s.tv += side * 0.55;
        kick.current();
      },
      reduced,
    }),
    [reduced],
  );

  useEffect(() => {
    const root = rootRef.current;
    const cord = cordRef.current;
    if (!root || !cord) return;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let visible = true;
    let width = root.clientWidth;
    let pointer: { x: number; y: number; t: number } | null = null;

    const layout = () => {
      width = root.clientWidth;
      const r = root.getBoundingClientRect();
      for (const s of strips.current) {
        if (!s) continue;
        const b = s.slot.getBoundingClientRect();
        s.x = b.left - r.left + b.width / 2;
        s.w = s.paper.offsetWidth;
        s.h = s.paper.offsetHeight;
      }
    };

    const sagAt = (x: number) => {
      const f = clamp(x / Math.max(1, width), 0, 1);
      return SAG * 4 * f * (1 - f);
    };

    const paint = () => {
      const list = strips.current.filter((s): s is Strip => !!s);
      for (const s of list) {
        const y = sagAt(s.x) + s.dip;
        s.rotor.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${(-s.a * 57.2958).toFixed(3)}deg)`;
        const tw = s.t * 57.2958;
        s.paper.style.transform = `perspective(520px) rotateY(${tw.toFixed(2)}deg)`;
        const turn = Math.sin(s.t);
        s.shade.style.opacity = Math.min(0.55, Math.abs(turn) * 1.1).toFixed(3);
        s.shade.style.backgroundImage =
          turn > 0
            ? "linear-gradient(90deg, transparent, var(--miyuki-tanzaku-card-shadow))"
            : "linear-gradient(270deg, transparent, var(--miyuki-tanzaku-card-shadow))";
        const bend = clamp(-s.v * 3.2, -7, 7);
        s.thread.setAttribute("d", `M 12 0 Q ${(12 + bend).toFixed(2)} ${THREAD * 0.55} 12 ${THREAD + 8}`);
      }
      let d = `M ${-40} ${CORD + sagAt(0) - 1}`;
      let px = -40;
      let py = CORD;
      for (const s of list) {
        const y = CORD + sagAt(s.x) + s.dip;
        const mx = (px + s.x) / 2;
        d += ` Q ${mx.toFixed(1)} ${((py + y) / 2 + 0.8).toFixed(2)} ${s.x.toFixed(1)} ${y.toFixed(2)}`;
        px = s.x;
        py = y;
      }
      d += ` Q ${((px + width + 40) / 2).toFixed(1)} ${((py + CORD) / 2 + 0.8).toFixed(2)} ${width + 40} ${CORD - 1}`;
      cord.setAttribute("d", d);
    };

    const step = (dt: number) => {
      clock += dt;
      const list = strips.current;
      const { breeze: wind } = opts.current;
      const n = list.length;
      for (let i = 0; i < n; i++) {
        const s = list[i];
        if (!s) continue;
        const left = list[i - 1];
        const right = list[i + 1];
        let acc = -W0 * W0 * Math.sin(s.a) - 2 * 0.06 * W0 * s.v - 0.5 * s.v * Math.abs(s.v);
        const k = 0.05 * W0 * W0;
        if (left) acc += k * (left.a - s.a);
        if (right) acc += k * (right.a - s.a);
        if (wind > 0) {
          const ph = s.x / 260;
          const gust = 0.55 + 0.45 * Math.sin(clock * 0.21 + 1.3) * Math.sin(clock * 0.13 + 0.4);
          const f =
            Math.sin(clock * 0.9 - ph) * 0.6 +
            Math.sin(clock * 1.7 - ph * 1.6 + i) * 0.3 +
            Math.sin(clock * 0.37 - ph * 0.5) * 0.5;
          acc += wind * 1.5 * gust * f;
          s.tv += wind * 0.9 * gust * Math.sin(clock * 0.7 + i * 2.1) * dt;
        }
        s.v += acc * dt;
        s.a += s.v * dt;
        const tacc = -WT * WT * (s.t - s.rest) - 2 * 0.1 * WT * s.tv;
        s.tv += tacc * dt;
        s.t += s.tv * dt;
        const tension = (s.v * s.v) / (W0 * W0) + (1 - Math.cos(s.a));
        s.dip += (tension * 9 - s.dip) * Math.min(1, dt * 14);
      }
      for (let i = 0; i < n - 1; i++) {
        const p = list[i];
        const q = list[i + 1];
        if (!p || !q) continue;
        const reach = THREAD + Math.min(p.h, q.h);
        const span = (p.w * Math.max(0.6, Math.abs(Math.cos(p.t))) + q.w * Math.max(0.6, Math.abs(Math.cos(q.t)))) / 2;
        const gap = q.x - p.x - span + reach * (Math.sin(q.a) - Math.sin(p.a));
        if (gap >= 0) continue;
        const fix = -gap / (2 * reach);
        p.a -= fix / Math.max(0.5, Math.cos(p.a));
        q.a += fix / Math.max(0.5, Math.cos(q.a));
        const rel = p.v - q.v;
        if (rel > 0) {
          const mean = (p.v + q.v) / 2;
          p.v = mean - 0.3 * rel * 0.5;
          q.v = mean + 0.3 * rel * 0.5;
          p.tv -= rel * 0.18;
          q.tv += rel * 0.22;
        }
      }
    };

    const energy = () =>
      strips.current.reduce(
        (e, s) => (s ? e + s.v * s.v + W0 * W0 * s.a * s.a + s.tv * s.tv + WT * WT * (s.t - s.rest) ** 2 : e),
        0,
      );

    const frame = (now: number) => {
      raf = 0;
      if (!visible || opts.current.reduced) return;
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
      last = now;
      const sub = 3;
      for (let i = 0; i < sub; i++) step(dt / sub);
      paint();
      if (opts.current.breeze > 0 || energy() > 1e-5) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && visible && !opts.current.reduced) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    kick.current = wake;

    const onMove = (e: PointerEvent) => {
      if (opts.current.reduced) return;
      const t = performance.now();
      const prev = pointer;
      pointer = { x: e.clientX, y: e.clientY, t };
      if (!prev || t - prev.t > 120) return;
      const dts = Math.max(0.004, (t - prev.t) / 1000);
      const vx = (e.clientX - prev.x) / dts;
      const vy = (e.clientY - prev.y) / dts;
      const r = root.getBoundingClientRect();
      for (const s of strips.current) {
        if (!s) continue;
        const ox = r.left + s.x;
        const oy = r.top + CORD + sagAt(s.x) + s.dip;
        const dx = e.clientX - ox;
        const dy = e.clientY - oy;
        const c = Math.cos(s.a);
        const sn = Math.sin(s.a);
        const lx = dx * c - dy * sn;
        const ly = dx * sn + dy * c;
        const half = (s.w / 2) * Math.max(0.35, Math.abs(Math.cos(s.t)));
        if (ly < THREAD || ly > THREAD + s.h || Math.abs(lx) > half + 4) continue;
        const along = vx * c - vy * sn;
        const surface = s.v * ly;
        const grip = clamp(dts * 22, 0.08, 0.5);
        const dv = ((along - surface) / ly) * grip;
        s.v = clamp(s.v + dv, -2.3, 2.3);
        s.tv = clamp(s.tv + (lx / Math.max(8, half)) * dv * 0.55, -1.2, 1.2);
      }
      wake();
    };
    const onLeave = () => {
      pointer = null;
    };

    layout();
    paint();
    const ro = new ResizeObserver(() => {
      layout();
      paint();
    });
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting) && !document.hidden;
      if (visible) wake();
    });
    io.observe(root);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) wake();
    };
    document.addEventListener("visibilitychange", onVis);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      kick.current = () => {};
    };
  }, [count]);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative isolate",
        "[--miyuki-tanzaku-card-cord:color-mix(in_oklab,var(--foreground)_62%,var(--warning))]",
        "[--miyuki-tanzaku-card-shade:oklch(0.42_0.09_250/0.2)] dark:[--miyuki-tanzaku-card-shade:oklch(0.05_0.02_250/0.62)] ink:[--miyuki-tanzaku-card-shade:oklch(0.05_0_0/0.62)]",
        className,
      )}
      style={{ paddingTop: CORD, ...props.style }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 w-full overflow-visible"
        style={{
          maskImage: "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
        }}
      >
        <path
          ref={cordRef}
          d={`M -40 ${CORD} L 4000 ${CORD}`}
          fill="none"
          stroke="var(--miyuki-tanzaku-card-cord)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </svg>
      <LineContext value={api}>
        <div className="flex items-start justify-center gap-x-2 sm:gap-x-5">
          {items.map((child, index) => (
            <SlotContext key={child.key ?? index} value={{ index, count }}>
              {child}
            </SlotContext>
          ))}
        </div>
      </LineContext>
    </div>
  );
}

export interface TanzakuProps extends ComponentProps<"div"> {
  tone?: TanzakuTone;
  writing?: "vertical" | "horizontal";
  children?: ReactNode;
}

export function Tanzaku({
  tone = "snow",
  writing = "vertical",
  className,
  children,
  onKeyDown,
  ...props
}: TanzakuProps) {
  const line = useContext(LineContext);
  const { index, count } = useContext(SlotContext);
  const seed = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<SVGPathElement>(null);
  const rest = useMemo(() => createRng(`tanzaku-${seed}-${index}`).range(-0.24, 0.24), [seed, index]);
  const f = count > 1 ? (index + 0.5) / count : 0.5;
  const sag = SAG * 4 * f * (1 - f);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const rotor = rotorRef.current;
    const paper = paperRef.current;
    const shade = shadeRef.current;
    const thread = threadRef.current;
    if (!line || !slot || !rotor || !paper || !shade || !thread) return;
    line.register(index, {
      slot,
      rotor,
      paper,
      shade,
      thread,
      rest,
      a: 0,
      v: 0,
      t: rest,
      tv: 0,
      dip: 0,
      x: 0,
      w: paper.offsetWidth,
      h: paper.offsetHeight,
    });
    return () => line.register(index, null);
  }, [line, index, rest]);

  return (
    <div ref={slotRef} className="relative flex shrink-0 flex-col items-center">
      <div
        ref={rotorRef}
        className="flex origin-top flex-col items-center"
        style={{ transform: `translate3d(0, ${sag.toFixed(2)}px, 0)` }}
      >
        <svg aria-hidden="true" width={24} height={THREAD + 10} className="relative z-10 -mb-[10px] overflow-visible">
          <path
            ref={threadRef}
            d={`M 12 0 Q 12 ${THREAD * 0.55} 12 ${THREAD + 8}`}
            fill="none"
            stroke="var(--miyuki-tanzaku-card-cord)"
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <circle cx={12} cy={0.5} r={2.2} fill="var(--miyuki-tanzaku-card-cord)" />
        </svg>
        <div
          tabIndex={0}
          role="group"
          {...props}
          ref={paperRef}
          className={cn(
            "relative isolate flex h-60 w-14 justify-center overflow-clip rounded-[2px] outline-none sm:w-[68px]",
            "bg-[color-mix(in_oklab,var(--miyuki-tanzaku-card-tint)_26%,var(--card))] text-foreground",
            "dark:bg-[color-mix(in_oklab,var(--miyuki-tanzaku-card-tint)_30%,color-mix(in_oklab,var(--foreground)_86%,var(--background)))] dark:text-primary-foreground",
            "[--miyuki-tanzaku-card-shadow:oklch(0.42_0.09_250/0.5)] dark:[--miyuki-tanzaku-card-shadow:oklch(0.05_0.02_250/0.55)] ink:[--miyuki-tanzaku-card-shadow:oklch(0.05_0_0/0.55)]",
            "shadow-[0_1px_1px_var(--miyuki-tanzaku-card-shade),0_10px_18px_-8px_var(--miyuki-tanzaku-card-shade)]",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
            TONES[tone],
            className,
          )}
          style={{ transform: `perspective(520px) rotateY(${(rest * 57.2958).toFixed(2)}deg)`, ...props.style }}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(e);
            const side =
              e.key === "ArrowRight"
                ? 1
                : e.key === "ArrowLeft"
                  ? -1
                  : e.key === "Enter" || e.key === " "
                    ? index % 2
                      ? -1
                      : 1
                    : 0;
            if (!side) return;
            e.preventDefault();
            line?.push(index, side);
          }}
          onPointerDown={(e) => {
            props.onPointerDown?.(e);
            const r = e.currentTarget.getBoundingClientRect();
            line?.push(index, e.clientX < r.left + r.width / 2 ? 0.7 : -0.7);
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-multiply"
            style={{ backgroundImage: WASHI, backgroundSize: "240px 240px" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[6px] left-1/2 size-[6px] -translate-x-1/2 rounded-full bg-background shadow-[inset_0_1px_1.5px_oklch(0.2_0.04_250/0.45)] ink:shadow-[inset_0_1px_1.5px_oklch(0.2_0_0/0.45)]"
          />
          <div
            className={cn(
              "relative pt-7 pr-1 pb-4 pl-1 text-[14px] leading-[1.45] font-medium tracking-[0.01em] sm:pr-2 sm:pl-2 sm:text-[15px]",
              writing === "vertical" ? "[writing-mode:vertical-rl]" : "text-center text-[13px] leading-snug",
            )}
          >
            {children}
          </div>
          <div ref={shadeRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" />
        </div>
      </div>
    </div>
  );
}
