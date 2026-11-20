"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  createContext,
  type FocusEvent,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type EmakiScrollDirection = "rtl" | "ltr";

export interface EmakiScrollProps extends Omit<ComponentProps<"section">, "children"> {
  children?: ReactNode;
  direction?: EmakiScrollDirection;
  height?: number;
  length?: number;
}

export interface EmakiPanelProps extends Omit<ComponentProps<"article">, "title"> {
  title: ReactNode;
  src?: string;
  alt?: string;
}

type Side = "left" | "right";
type Pt = [number, number];

interface Geo {
  w: number;
  h: number;
  want: number;
  narrow: boolean;
  width: number;
  paper: number;
  knob: number;
  cap: number;
  rMin: number;
  rMax: number;
  span: number;
  panel: number;
  lead: number;
  count: number;
  wound: number;
  k: number;
}

interface PanelInfo {
  index: number;
  rtl: boolean;
  stack: boolean;
  narrow: boolean;
}

const HOLD = 0.3;
const LINGER = 0.5;
const CREASE = 40;
const CAST = 18;
const TUCK = 6;
const BLEED = 8;
const TONES = [0, 3.5, 1.5, 4.5, 2.5];
const SPRING = { stiffness: 70, damping: 17, restDelta: 0.00002, restSpeed: 0.0001 };

const PROFILE: Pt[] = [
  [-0.04, 0.42],
  [0, 0.42],
  [0.07, 0.42],
  [0.13, 0.78],
  [0.2, 0.8],
  [0.245, 0.73],
  [0.3, 0.9],
  [0.48, 0.99],
  [0.72, 1],
  [0.86, 0.96],
  [0.95, 0.84],
  [1, 0.64],
];
const RINGS: { v: number; light: boolean }[] = [
  { v: 0.14, light: true },
  { v: 0.24, light: false },
  { v: 0.29, light: true },
  { v: 0.85, light: false },
];

const PanelContext = createContext<PanelInfo | null>(null);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f = (n: number) => (Math.round(n * 100) / 100).toString();
const V = (name: string) => `var(--miyuki-emaki-scroll-${name})`;
const mix = (name: string, pct: number) => `color-mix(in oklab, ${V(name)} ${pct}%, transparent)`;

const THEME = [
  "[--miyuki-emaki-scroll-paper:oklch(0.962_0.012_80)]",
  "[--miyuki-emaki-scroll-cool:oklch(0.94_0.016_238)]",
  "[--miyuki-emaki-scroll-back:oklch(0.945_0.016_76)]",
  "[--miyuki-emaki-scroll-tint:oklch(0.9_0.035_72)]",
  "[--miyuki-emaki-scroll-ink:var(--foreground)]",
  "[--miyuki-emaki-scroll-ink-soft:color-mix(in_oklab,var(--foreground)_74%,var(--miyuki-emaki-scroll-paper))]",
  "[--miyuki-emaki-scroll-edge:oklch(0.48_0.04_70/0.2)]",
  "[--miyuki-emaki-scroll-shade:oklch(0.28_0.045_252)]",
  "[--miyuki-emaki-scroll-light:oklch(1_0_0)]",
  "[--miyuki-emaki-scroll-wood:oklch(0.5_0.062_56)]",
  "[--miyuki-emaki-scroll-drop:oklch(0.42_0.09_250)]",
  "dark:[--miyuki-emaki-scroll-paper:oklch(0.35_0.016_248)] ink:[--miyuki-emaki-scroll-paper:oklch(0.35_0_0)]",
  "dark:[--miyuki-emaki-scroll-cool:oklch(0.33_0.024_244)] ink:[--miyuki-emaki-scroll-cool:oklch(0.33_0_0)]",
  "dark:[--miyuki-emaki-scroll-back:oklch(0.41_0.016_248)] ink:[--miyuki-emaki-scroll-back:oklch(0.41_0_0)]",
  "dark:[--miyuki-emaki-scroll-tint:oklch(0.42_0.02_244)] ink:[--miyuki-emaki-scroll-tint:oklch(0.42_0_0)]",
  "dark:[--miyuki-emaki-scroll-ink:oklch(0.95_0.012_82)]",
  "dark:[--miyuki-emaki-scroll-ink-soft:oklch(0.82_0.016_78)]",
  "dark:[--miyuki-emaki-scroll-edge:oklch(0.9_0.02_80/0.13)]",
  "dark:[--miyuki-emaki-scroll-shade:oklch(0.1_0.02_250/0.78)] ink:[--miyuki-emaki-scroll-shade:oklch(0.1_0_0/0.78)]",
  "dark:[--miyuki-emaki-scroll-light:oklch(0.94_0.03_82/0.5)]",
  "dark:[--miyuki-emaki-scroll-wood:oklch(0.44_0.05_56)]",
  "dark:[--miyuki-emaki-scroll-drop:oklch(0.06_0.02_250)] ink:[--miyuki-emaki-scroll-drop:oklch(0.06_0_0)]",
].join(" ");

const STOPS: [string, number, number][] = [
  ["shade", 26, 0],
  ["shade", 9, 4],
  ["light", 12, 11],
  ["light", 72, 19],
  ["light", 38, 23],
  ["light", 8, 31],
  ["shade", 4, 45],
  ["shade", 16, 62],
  ["shade", 34, 78],
  ["shade", 44, 90],
  ["shade", 36, 96],
  ["shade", 24, 100],
];

const cylinder = (rtl: boolean) =>
  `linear-gradient(${rtl ? 90 : 270}deg, ${STOPS.map(([c, p, at]) => `${mix(c, p)} ${at}%`).join(", ")})`;

function layout(w: number, h: number, want: number, count: number): Geo {
  const narrow = w < 600;
  const pad = narrow ? 12 : clamp(Math.round(w * 0.04), 24, 56);
  const width = Math.max(240, Math.min(w - pad * 2, 1120));
  const rMax = narrow ? 17 : 26;
  const rMin = narrow ? 11 : 17;
  const knob = rMax + (narrow ? 2 : 3);
  const cap = narrow ? 22 : 30;
  const paper = Math.round(Math.max(Math.min(want, 200), Math.min(narrow ? want * 0.82 : want, h - cap * 2 - 150)));
  const span = width - knob * 2;
  const open = span - rMin - rMax;
  const panel = Math.round(narrow ? open * 0.86 : clamp(paper * 1.3, open * 0.5, open * 0.66));
  const wound = Math.max(1, (count - 1) * panel);
  return {
    w,
    h,
    want,
    narrow,
    width,
    paper,
    knob,
    cap,
    rMin,
    rMax,
    span,
    panel,
    lead: (open - panel) / 2,
    count,
    wound,
    k: (rMax * rMax - rMin * rMin) / wound,
  };
}

function paperAt(p: number, n: number) {
  if (n <= 1) return 0;
  const u = clamp(p, 0, 1) * n;
  const q = clamp(((u - HOLD) / (n - 2 * HOLD)) * (n - 1), 0, n - 1);
  return q - (LINGER * Math.sin(2 * Math.PI * q)) / (2 * Math.PI);
}

function progressOf(i: number, n: number) {
  if (n <= 1) return 0;
  return (HOLD + (i / (n - 1)) * (n - 2 * HOLD)) / n;
}

const radius = (s: number, g: Geo) => Math.sqrt(g.rMin * g.rMin + g.k * Math.max(0, s));
const turn = (r: number, g: Geo) => (2 * (r - g.rMin)) / g.k;

function supply(taken: number, rTaken: number, g: Geo) {
  const G = g.wound - g.rMin - g.rMax - taken + rTaken;
  const s = G + g.k / 2 + Math.sqrt(Math.max(0, (g.k * g.k) / 4 + g.k * G + g.rMin * g.rMin));
  return clamp(s, 0, g.wound);
}

function spline(points: Pt[]) {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function profileAt(v: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [v1, r1] = PROFILE[i];
    if (v1 < v) continue;
    const [v0, r0] = PROFILE[i - 1];
    return r0 + ((r1 - r0) * (v - v0)) / (v1 - v0 || 1);
  }
  return PROFILE[PROFILE.length - 1][1];
}

function knobPaths(knob: number, cap: number, top: boolean) {
  const y = (v: number) => (top ? cap * (1 - v) : cap * v);
  const right: Pt[] = PROFILE.map(([v, r]) => [r * knob, y(v)]);
  const left: Pt[] = PROFILE.slice()
    .reverse()
    .map(([v, r]) => [-r * knob, y(v)]);
  const start = (p: Pt) => `M${f(p[0])} ${f(p[1])}`;
  return {
    outline: `${start(right[0])}${spline(right)}L${f(left[0][0])} ${f(left[0][1])}${spline(left)}Z`,
    meridian: `${start(right[0])}${spline(right)}`,
    rings: RINGS.map(({ v, light }) => {
      const half = profileAt(v) * knob * 0.97;
      return { d: `M${f(-half)} ${f(y(v))}L${f(half)} ${f(y(v))}`, light };
    }),
  };
}

let grainCache: Promise<{ day: string; night: string }> | null = null;

function paperGrain() {
  if (grainCache) return grainCache;
  const size = 224;
  const draw = (tone: [number, number, number], strength: number) =>
    new Promise<string>((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      const rng = createRng("emaki-scroll-paper");
      const [r, g, b] = tone;
      ctx.lineCap = "round";
      for (let i = 0; i < 220; i++) {
        const x = rng() * size;
        const y = rng() * size;
        const len = 5 + rng() ** 2 * 30;
        const a = rng() * Math.PI;
        const bend = rng.range(-0.5, 0.5) * len;
        const dx = Math.cos(a) * len;
        const dy = Math.sin(a) * len;
        ctx.strokeStyle = `rgba(${r},${g},${b},${(rng.range(0.05, 0.13) * strength).toFixed(3)})`;
        ctx.lineWidth = rng.range(0.5, 1.1);
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            ctx.beginPath();
            ctx.moveTo(x + ox, y + oy);
            ctx.quadraticCurveTo(
              x + ox + dx / 2 - dy * 0.2 + bend * 0.1,
              y + oy + dy / 2 + bend * 0.2,
              x + ox + dx,
              y + oy + dy,
            );
            ctx.stroke();
          }
        }
      }
      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = `rgba(${r},${g},${b},${(rng.range(0.03, 0.09) * strength).toFixed(3)})`;
        const s = rng.range(0.6, 1.4);
        ctx.fillRect(rng() * size, rng() * size, s, s);
      }
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ""));
    });
  grainCache = Promise.all([draw([92, 72, 50], 1), draw([255, 242, 220], 0.3)]).then(([day, night]) => ({
    day,
    night,
  }));
  return grainCache;
}

function Knob({ geo, axis, top, side, fill }: { geo: Geo; axis: number; top: boolean; side: Side; fill: string }) {
  const paths = useMemo(() => knobPaths(geo.knob, geo.cap, top), [geo.knob, geo.cap, top]);
  const grains = useMemo(() => {
    const rng = createRng(`emaki-scroll-knob-${side}-${top ? "t" : "b"}`);
    return [0, 1, 2, 3].map((i) => ({
      phi: (i / 4) * Math.PI * 2 + rng.range(-0.5, 0.5),
      alpha: rng.range(0.16, 0.3),
    }));
  }, [side, top]);
  return (
    <svg
      aria-hidden="true"
      className="absolute overflow-visible"
      style={{ left: axis - geo.knob, top: top ? 0 : geo.cap + geo.paper, width: geo.knob * 2, height: geo.cap }}
      viewBox={`${-geo.knob} 0 ${geo.knob * 2} ${geo.cap}`}
    >
      <path d={paths.outline} style={{ fill: V("wood") }} />
      <path d={paths.outline} fill={`url(#${fill})`} />
      {paths.rings.map((ring, i) => (
        <path
          key={i}
          d={ring.d}
          fill="none"
          strokeWidth={ring.light ? 0.8 : 1}
          style={{ stroke: ring.light ? mix("light", 34) : mix("shade", 38) }}
        />
      ))}
      {grains.map((g, i) => (
        <path
          key={i}
          data-emaki-part="grain"
          data-emaki-side={side}
          data-phi={g.phi}
          data-alpha={g.alpha}
          d={paths.meridian}
          fill="none"
          strokeWidth={0.9}
          vectorEffect="non-scaling-stroke"
          opacity={0}
          style={{ stroke: V("shade") }}
        />
      ))}
    </svg>
  );
}

function Roll({ geo, side, rtl, fill }: { geo: Geo; side: Side; rtl: boolean; fill: string }) {
  const axis = side === "left" ? geo.knob : geo.width - geo.knob;
  const lines = useMemo(() => {
    const rng = createRng(`emaki-scroll-roll-${side}`);
    return Array.from({ length: 7 }, (_, i) => {
      const seam = i % 3 !== 2;
      return {
        phi: (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3),
        alpha: seam ? rng.range(0.14, 0.24) : rng.range(0.1, 0.16),
        top: seam ? 0 : rng.range(0.08, 0.4),
        bottom: seam ? 0 : rng.range(0.08, 0.4),
      };
    });
  }, [side]);
  const dropX = rtl ? 3 : -3;
  return (
    <>
      {[true, false].map((top) => (
        <span
          key={top ? "t" : "b"}
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: axis - geo.knob + dropX,
            top: (top ? 0 : geo.cap + geo.paper) + 4,
            width: geo.knob * 2,
            height: geo.cap,
            background: `radial-gradient(closest-side, ${mix("drop", 26)}, ${mix("drop", 10)} 60%, transparent)`,
          }}
        />
      ))}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ left: axis - geo.rMax, top: geo.cap, width: geo.rMax * 2, height: geo.paper }}
      >
        <div
          data-emaki-part="body"
          data-emaki-side={side}
          className="absolute inset-0 will-change-transform"
          style={{
            background: `${cylinder(rtl)}, ${V("back")}`,
            boxShadow: `${dropX}px 5px 10px -3px ${mix("drop", 34)}, inset 0 1px 0 ${mix("shade", 14)}, inset 0 -1px 0 ${mix("shade", 18)}`,
          }}
        />
        {lines.map((line, i) => (
          <span
            key={i}
            data-emaki-part="line"
            data-emaki-side={side}
            data-phi={line.phi}
            data-alpha={line.alpha}
            className="absolute w-px will-change-transform"
            style={{
              left: geo.rMax - 0.5,
              top: `${line.top * 100}%`,
              bottom: `${line.bottom * 100}%`,
              background: V("shade"),
            }}
          />
        ))}
      </div>
      <Knob geo={geo} axis={axis} top side={side} fill={fill} />
      <Knob geo={geo} axis={axis} top={false} side={side} fill={fill} />
    </>
  );
}

function crease(side: Side, cast: boolean) {
  const width = CREASE + TUCK + (cast ? CAST : 0);
  const stops: [number, number][] = cast
    ? [
        [CREASE + CAST, 0],
        [CREASE, 6],
        [28, 10],
        [16, 17],
        [7, 28],
        [2, 40],
        [0, 48],
        [-TUCK, 52],
      ]
    : [
        [CREASE, 0],
        [28, 4],
        [16, 11],
        [7, 22],
        [2, 34],
        [0, 43],
        [-TUCK, 48],
      ];
  const at = (d: number) => `${f(((width - TUCK - d) / width) * 100)}%`;
  return {
    width,
    background: `linear-gradient(${side === "right" ? 90 : 270}deg, ${stops
      .map(([d, p]) => `${mix("shade", p)} ${at(d)}`)
      .join(", ")})`,
  };
}

export function EmakiPanel({ title, src, alt = "", className, style, children, ...props }: EmakiPanelProps) {
  const info = useContext(PanelContext);
  const index = info?.index ?? 0;
  const rtl = info?.rtl ?? true;
  const stack = info?.stack ?? true;
  const narrow = info?.narrow ?? false;
  return (
    <article
      {...props}
      data-emaki-index={index}
      className={cn(
        "relative flex shrink-0",
        stack
          ? "w-full gap-4 p-5 sm:gap-5 sm:p-7"
          : narrow
            ? "h-full gap-2.5 px-3.5 pt-4 pb-3.5"
            : "h-full gap-3.5 px-5.5 pt-5.5 pb-5",
        className,
      )}
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        width: stack ? undefined : V("panel"),
        background: mix("tint", TONES[index % TONES.length]),
        ...style,
      }}
    >
      {index > 0 ? (
        <span
          aria-hidden="true"
          className={cn("pointer-events-none absolute", stack ? "inset-x-0 top-0 h-px" : "inset-y-0 w-px")}
          style={{ background: V("edge"), ...(stack ? null : rtl ? { right: 0 } : { left: 0 }) }}
        />
      ) : null}
      <h3
        className={cn(
          "shrink-0 font-display leading-none font-semibold tracking-[-0.005em] text-(--miyuki-emaki-scroll-ink)",
          narrow ? "text-[15px]" : "text-[17px]",
        )}
        style={{ writingMode: "vertical-rl" }}
      >
        {title}
      </h3>
      <div className="flex min-w-0 flex-1 flex-col">
        {src ? (
          <div
            className={cn("relative overflow-hidden rounded-[2px]", stack ? "aspect-[16/9]" : "min-h-0 flex-1")}
            style={{ boxShadow: `0 0 0 1px ${V("edge")}, 0 1px 3px ${mix("drop", 16)}` }}
          >
            <img src={src} alt={alt} draggable={false} className="absolute inset-0 size-full object-cover" />
          </div>
        ) : null}
        {children != null ? (
          <div
            className={cn(
              "text-pretty text-(--miyuki-emaki-scroll-ink-soft)",
              narrow ? "mt-2.5 text-xs/[1.5]" : "mt-3 text-[13px]/[1.5]",
              !src && "flex-1",
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function EmakiScroll({
  children,
  direction = "rtl",
  height = 360,
  length = 80,
  className,
  style,
  onFocus,
  ...props
}: EmakiScrollProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const rtl = direction !== "ltr";
  const fill = `miyuki-emaki-scroll-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const items = useMemo(
    () => Children.toArray(children).filter(isValidElement) as ReactElement<{ title?: ReactNode }>[],
    [children],
  );
  const count = items.length;
  const [measured, setMeasured] = useState<Geo | null>(null);
  const geo = measured ?? layout(960, 640, height, count);
  const [index, setIndex] = useState(0);
  const shown = useRef(0);
  const [grain, setGrain] = useState<{ day: string; night: string } | null>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, SPRING);

  useEffect(() => {
    let live = true;
    paperGrain().then((g) => live && setGrain(g));
    return () => {
      live = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (reduce) return;
    const stage = stageRef.current;
    if (!stage) return;
    const run = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      setMeasured((prev) =>
        prev && prev.w === w && prev.h === h && prev.want === height && prev.count === count
          ? prev
          : layout(w, h, height, count),
      );
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [reduce, height, count]);

  useLayoutEffect(() => {
    if (reduce || !measured) return;
    const g = measured;
    const root = sectionRef.current;
    if (!root) return;
    const strip = root.querySelector<HTMLElement>("[data-emaki-part=strip]");
    const sides = (["left", "right"] as const).map((side) => {
      const all = <T extends HTMLElement | SVGElement>(part: string) =>
        Array.from(root.querySelectorAll<T>(`[data-emaki-part=${part}][data-emaki-side=${side}]`)).map((el) => ({
          el,
          phi: Number(el.dataset.phi),
          alpha: Number(el.dataset.alpha),
        }));
      return {
        side,
        take: (side === "right") === rtl,
        body: root.querySelector<HTMLElement>(`[data-emaki-part=body][data-emaki-side=${side}]`),
        crease: root.querySelector<HTMLElement>(`[data-emaki-part=crease][data-emaki-side=${side}]`),
        lines: all<HTMLElement>("line"),
        grains: all<SVGPathElement>("grain"),
      };
    });
    const sign = rtl ? 1 : -1;
    let prev: [number, number] | null = null;
    let clear = 1;
    const apply = (p: number) => {
      const t = paperAt(p, g.count);
      const taken = t * g.panel;
      const rT = radius(taken, g);
      const rS = radius(supply(taken, rT, g), g);
      const aT = -sign * turn(rT, g);
      const aS = sign * turn(rS, g);
      const spin = prev ? Math.max(Math.abs(aT - prev[0]), Math.abs(aS - prev[1])) : 0;
      prev = [aT, aS];
      const want = 1 - 0.8 * clamp((spin - 0.3) / 0.6, 0, 1);
      clear += (want - clear) * (want < clear ? 0.35 : 0.12);
      if (strip) strip.style.transform = `translate3d(${f(sign * (taken - rT))}px,0,0)`;
      for (const s of sides) {
        const r = s.take ? rT : rS;
        const a = s.take ? aT : aS;
        if (s.body) s.body.style.transform = `scaleX(${(r / g.rMax).toFixed(4)})`;
        if (s.crease) s.crease.style.transform = `translate3d(${f(s.side === "right" ? TUCK - r : r - TUCK)}px,0,0)`;
        for (const line of s.lines) {
          const ang = line.phi + a;
          const c = Math.cos(ang);
          line.el.style.transform = `translate3d(${f(r * Math.sin(ang))}px,0,0)`;
          line.el.style.opacity = c > 0 ? (line.alpha * clear * c ** 0.7).toFixed(3) : "0";
        }
        for (const grainLine of s.grains) {
          const ang = grainLine.phi + a;
          const c = Math.cos(ang);
          grainLine.el.setAttribute("transform", `scale(${Math.sin(ang).toFixed(4)} 1)`);
          grainLine.el.style.opacity = c > 0 ? (grainLine.alpha * clear * c).toFixed(3) : "0";
        }
      }
      if (Math.abs(t - shown.current) > 0.55) {
        const next = clamp(Math.round(t), 0, Math.max(0, g.count - 1));
        if (next !== shown.current) {
          shown.current = next;
          setIndex(next);
        }
      }
    };
    apply(smooth.get());
    return smooth.on("change", apply);
  }, [measured, reduce, rtl, smooth]);

  const panels = useMemo(
    () =>
      items.map((child, i) => (
        <PanelContext.Provider
          key={child.key ?? i}
          value={{ index: i, rtl, stack: reduce, narrow: !reduce && geo.narrow }}
        >
          {child}
        </PanelContext.Provider>
      )),
    [items, rtl, reduce, geo.narrow],
  );

  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    onFocus?.(e);
    if (reduce) return;
    const target = e.target as HTMLElement;
    const root = sectionRef.current;
    if (!root || !target.matches?.(":focus-visible")) return;
    const panel = target.closest<HTMLElement>("[data-emaki-index]");
    if (!panel) return;
    const range = root.offsetHeight - window.innerHeight;
    const top = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.round(top + progressOf(Number(panel.dataset.emakiIndex), count) * range) });
  };

  const paperBackground = `linear-gradient(180deg, ${mix("cool", 60)}, transparent 24%, transparent 76%, ${mix("cool", 60)}), ${V("paper")}`;
  const grainStyle = {
    "--miyuki-emaki-scroll-grain-day": grain?.day ? `url(${grain.day})` : "none",
    "--miyuki-emaki-scroll-grain-night": grain?.night ? `url(${grain.night})` : "none",
  } as CSSProperties;
  const grainLayer = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 [background-image:var(--miyuki-emaki-scroll-grain-day)] [background-size:224px_224px] dark:[background-image:var(--miyuki-emaki-scroll-grain-night)]"
    />
  );
  const current = items[Math.min(index, Math.max(0, count - 1))];
  const lit = rtl ? 1 : -1;
  const castSide: Side = rtl ? "left" : "right";
  const open = geo.span - geo.rMin - geo.rMax;

  return (
    <section
      {...props}
      ref={sectionRef}
      onFocus={handleFocus}
      className={cn("relative text-foreground", THEME, className)}
      style={{ height: reduce ? undefined : `calc(100svh + ${count * length}vh)`, ...grainStyle, ...style }}
    >
      {reduce ? (
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <div
            className="relative overflow-clip rounded-[3px]"
            style={{
              background: V("paper"),
              boxShadow: `0 0 0 1px ${V("edge")}, 0 1px 2px ${mix("drop", 10)}, 0 14px 30px -14px ${mix("drop", 30)}`,
            }}
          >
            {grainLayer}
            <div className="relative flex flex-col">{panels}</div>
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          className="sticky top-0 flex h-svh w-full flex-col items-center justify-center overflow-clip pb-[4svh]"
        >
          <div
            className="relative shrink-0 transition-opacity duration-500"
            style={{ width: geo.width, height: geo.paper + geo.cap * 2, opacity: measured ? 1 : 0 }}
          >
            <svg aria-hidden="true" className="absolute size-0">
              <defs>
                <linearGradient id={fill} x1={rtl ? 0 : 1} x2={rtl ? 1 : 0} y1={0} y2={0}>
                  {STOPS.map(([c, p, at], i) => (
                    <stop key={i} offset={`${at}%`} style={{ stopColor: mix(c, p) }} />
                  ))}
                </linearGradient>
              </defs>
            </svg>
            <div
              className="absolute overflow-clip"
              style={{
                left: geo.knob,
                top: geo.cap,
                width: geo.span,
                height: geo.paper,
                boxShadow: `0 1px 1.5px ${mix("drop", 10)}, ${lit * 2}px 12px 26px -12px ${mix("drop", 34)}`,
              }}
            >
              <div
                data-emaki-part="strip"
                className="absolute inset-y-0 flex will-change-transform"
                style={
                  {
                    [rtl ? "right" : "left"]: -BLEED,
                    width: open + (count - 1) * geo.panel + BLEED * 2,
                    flexDirection: rtl ? "row-reverse" : "row",
                    background: paperBackground,
                    "--miyuki-emaki-scroll-panel": `${geo.panel}px`,
                  } as CSSProperties
                }
              >
                {grainLayer}
                <div className="shrink-0" style={{ width: geo.lead + BLEED }} />
                {panels}
                <div className="shrink-0" style={{ width: geo.lead + BLEED }} />
              </div>
              {(["left", "right"] as const).map((side) => {
                const c = crease(side, side === castSide);
                return (
                  <span
                    key={side}
                    aria-hidden="true"
                    data-emaki-part="crease"
                    data-emaki-side={side}
                    className="pointer-events-none absolute inset-y-0 will-change-transform"
                    style={{ [side]: 0, width: c.width, background: c.background }}
                  />
                );
              })}
            </div>
            <Roll geo={geo} side="left" rtl={rtl} fill={fill} />
            <Roll geo={geo} side="right" rtl={rtl} fill={fill} />
          </div>
          <div
            aria-hidden="true"
            className="relative mt-6 grid h-5 w-full max-w-full place-items-center px-4 text-sm transition-opacity duration-500"
            style={{ opacity: measured && count > 0 ? 1 : 0 }}
          >
            <AnimatePresence initial={false}>
              <motion.p
                key={index}
                className="max-w-full truncate [grid-area:1/1]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.14, ease: [0.33, 0, 0.2, 1] } }}
                exit={{ opacity: 0, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
              >
                <span className="text-muted-foreground tabular-nums">
                  {Math.min(index + 1, count)} of {count}
                </span>
                {current?.props.title != null ? (
                  <>
                    <span className="text-muted-foreground">, </span>
                    <span className="font-medium">{current.props.title}</span>
                  </>
                ) : null}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
