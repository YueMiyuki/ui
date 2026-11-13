"use client";

import { useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Tab as AriaTab,
  TabList as AriaTabList,
  type TabListProps as AriaTabListProps,
  TabPanel as AriaTabPanel,
  type TabPanelProps as AriaTabPanelProps,
  type TabProps as AriaTabProps,
  Tabs as AriaTabs,
  type TabsProps as AriaTabsProps,
  composeRenderProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

type Orientation = "horizontal" | "vertical";
type Point = [number, number];

interface PoolApi {
  register: (tab: HTMLElement, wet: HTMLElement) => () => void;
  select: (tab: HTMLElement) => void;
  ready: boolean;
}

const OrientationContext = createContext<Orientation>("horizontal");
const PoolContext = createContext<PoolApi | null>(null);

const LEAD = { k: 470, c: 30 };
const TRAIL = { k: 250, c: 19.5 };
const TRAIL_DELAY = 0.045;
const MENISCUS = 1.8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

const keyframes = `
@keyframes miyuki-tide-tabs-in { from { opacity: 0; transform: translateY(4px); } }
@keyframes miyuki-tide-tabs-fade { from { opacity: 0; } }
`;

interface Shape {
  a: number;
  b: number;
  rest: number;
  depth: number;
  lead: number;
  floor: boolean;
}

function profile({ a, b, rest, depth, lead, floor }: Shape): Point[] {
  const R = Math.min(depth, rest) / 2;
  const flat = Math.max(0, depth / 2 - R);
  const L = Math.max(b - a, 2);
  const s = L / Math.max(rest, 1);
  let rl: number;
  let rr: number;
  let neck: number;
  if (s >= 1) {
    const st = 1 - 1 / s;
    const head = R * (1 - 0.06 * st);
    const tail = R * (1 - 0.58 * Math.min(1, st * 1.5));
    rl = lead >= 0 ? tail : head;
    rr = lead >= 0 ? head : tail;
    neck = 2 * R * clamp(1 / s, 0.18, 1);
  } else {
    const squeeze = Math.min(1, (1 - s) / 0.22);
    rl = rr = R * (1 + 0.1 * squeeze);
    neck = rl * 2;
  }
  const fit = Math.min(1, L / (rl + rr));
  const al = rl * fit;
  const ar = rr * fit;
  const cl = a + al;
  const cr = b - ar;
  const span = Math.max(cr - cl, 0);
  const mid = depth / 2;
  const centre = (r: number) => (floor ? depth - r : mid);
  const spread = (half: number) => (floor ? 0 : flat * (0.55 + 0.45 * clamp(half / R, 0, 1.1)));
  const peak = lead >= 0 ? 0.3 : 0.7;
  const gamma = Math.log(0.5) / Math.log(peak);
  const thick = (t: number) => {
    const base = 2 * rl + (2 * rr - 2 * rl) * smooth(t);
    const dip = Math.max(0, rl + rr - neck);
    const bump = Math.sin(Math.PI * t ** gamma) ** 2;
    return Math.max(base - dip * bump, 1.5);
  };
  const top = (t: number) => (floor ? depth - thick(t) : mid - thick(t) / 2 - spread(thick(t) / 2));
  const bottom = (t: number) => (floor ? depth : mid + thick(t) / 2 + spread(thick(t) / 2));
  const cap = (c: number, along: number, r: number, ang: number, upper: boolean): Point => [
    c + along * Math.cos(ang),
    centre(r) - r * Math.sin(ang) + (upper ? -spread(r) : spread(r)),
  ];

  const capSteps = 12;
  const bridgeSteps = Math.max(6, Math.round(span / 4));
  const out: Point[] = [];
  for (let i = 0; i <= capSteps; i++) out.push(cap(cl, al, rl, Math.PI - (Math.PI / 2) * (i / capSteps), true));
  for (let i = 1; i < bridgeSteps; i++) out.push([cl + span * (i / bridgeSteps), top(i / bridgeSteps)]);
  for (let i = 0; i <= capSteps; i++) out.push(cap(cr, ar, rr, Math.PI / 2 - (Math.PI / 2) * (i / capSteps), true));
  if (!floor && flat > 0) out.push([cr + ar, centre(rr) + spread(rr)]);
  for (let i = 1; i <= capSteps; i++) out.push(cap(cr, ar, rr, -(Math.PI / 2) * (i / capSteps), false));
  for (let i = bridgeSteps - 1; i >= 1; i--) out.push([cl + span * (i / bridgeSteps), bottom(i / bridgeSteps)]);
  for (let i = 0; i <= capSteps; i++) out.push(cap(cl, al, rl, -Math.PI / 2 - (Math.PI / 2) * (i / capSteps), false));
  return out;
}

function meniscus(pts: Point[], inset: number): Point[] {
  const n = pts.length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sign = area > 0 ? -1 : 1;
  const marks = pts.map((p, i) => {
    const [px, py] = pts[(i - 1 + n) % n];
    const [nx, ny] = pts[(i + 1) % n];
    let ox = (ny - py) * sign;
    let oy = -(nx - px) * sign;
    const len = Math.hypot(ox, oy) || 1;
    ox /= len;
    oy /= len;
    return { p: [p[0] - ox * inset, p[1] - oy * inset] as Point, up: oy < -0.5 };
  });
  let bestStart = -1;
  let bestLen = 0;
  for (let i = 0; i < n; i++) {
    if (!marks[i].up || marks[(i - 1 + n) % n].up) continue;
    let len = 0;
    while (len < n && marks[(i + len) % n].up) len++;
    if (len > bestLen) {
      bestLen = len;
      bestStart = i;
    }
  }
  if (bestStart < 0) return [];
  return Array.from({ length: bestLen }, (_, k) => marks[(bestStart + k) % n].p);
}

function pathOf(points: Point[], dx: number, dy: number, close: boolean) {
  let d = "";
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    d += `${i === 0 ? "M" : "L"}${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`;
  }
  return close ? `${d}Z` : d;
}

export interface TideTabsProps extends AriaTabsProps {
  ref?: Ref<HTMLDivElement>;
}

export function TideTabs({ orientation = "horizontal", className, children, ...props }: TideTabsProps) {
  return (
    <AriaTabs
      {...props}
      orientation={orientation}
      className={composeRenderProps(className, (cls) =>
        cn("flex min-w-0", orientation === "vertical" ? "flex-row gap-6" : "flex-col gap-5", cls),
      )}
    >
      {composeRenderProps(children, (content) => (
        <OrientationContext value={orientation}>
          <style href="miyuki-tide-tabs" precedence="miyuki">
            {keyframes}
          </style>
          {content}
        </OrientationContext>
      ))}
    </AriaTabs>
  );
}

class Pool {
  tabs = new Map<HTMLElement, HTMLElement>();
  a = 0;
  b = 0;
  va = 0;
  vb = 0;
  A = 0;
  B = 0;
  cross = 0;
  depth = 0;
  wallA = -Infinity;
  wallB = Infinity;
  lead = 1;
  since = 0;
  placed = false;
  tab: HTMLElement | null = null;
  raf = 0;
  last = 0;
  vertical: boolean;
  reduce = false;
  svg: SVGSVGElement | null = null;
  body: SVGPathElement | null = null;
  shine: SVGPathElement | null = null;
  grad: SVGLinearGradientElement | null = null;
  onReady: (() => void) | null = null;
  ro: ResizeObserver | null = null;

  constructor(vertical: boolean) {
    this.vertical = vertical;
  }

  along = (el: HTMLElement) => (this.vertical ? el.offsetTop : el.offsetLeft);
  length = (el: HTMLElement) => (this.vertical ? el.offsetHeight : el.offsetWidth);

  attach(parts: {
    svg: SVGSVGElement | null;
    body: SVGPathElement | null;
    shine: SVGPathElement | null;
    grad: SVGLinearGradientElement | null;
    onReady: () => void;
  }) {
    Object.assign(this, parts);
    if (this.placed) this.onReady?.();
    this.draw();
  }

  setReduce(reduce: boolean) {
    this.reduce = reduce;
  }

  setVertical(vertical: boolean) {
    if (this.vertical === vertical) return;
    this.vertical = vertical;
    this.measure(false);
  }

  register(tab: HTMLElement, wet: HTMLElement) {
    this.tabs.set(tab, wet);
    if (!this.ro && typeof ResizeObserver !== "undefined") this.ro = new ResizeObserver(() => this.measure(false));
    this.ro?.observe(tab);
    this.draw();
    return () => {
      this.tabs.delete(tab);
      this.ro?.unobserve(tab);
    };
  }

  select(tab: HTMLElement) {
    const changed = this.tab !== tab;
    this.tab = tab;
    this.measure(changed);
  }

  draw() {
    const { body, shine: shineEl } = this;
    if (!body || !shineEl || !this.placed) return;
    const outline = profile({
      a: this.a,
      b: this.b,
      rest: this.B - this.A,
      depth: this.depth,
      lead: this.lead,
      floor: !this.vertical,
    });
    const cross = this.cross;
    const map = (pts: Point[]): Point[] =>
      this.vertical ? pts.map(([u, v]) => [cross + v, u]) : pts.map(([u, v]) => [u, cross + v]);
    const out = map(outline);
    const shine = meniscus(out, MENISCUS);
    body.setAttribute("d", pathOf(out, 0, 0, true));
    shineEl.setAttribute("d", pathOf(shine, 0, 0, false));
    const grad = this.grad;
    if (grad && shine.length > 1) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const [x] of shine) {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
      grad.setAttribute("x1", String(lo));
      grad.setAttribute("x2", String(hi));
    }
    const lo = Math.min(this.a, this.b) - 4;
    const hi = Math.max(this.a, this.b) + 4;
    for (const [tab, wet] of this.tabs) {
      const start = this.along(tab);
      const end = start + this.length(tab);
      wet.style.clipPath =
        end < lo || start > hi ? "inset(50%)" : `path("${pathOf(out, -tab.offsetLeft, -tab.offsetTop, true)}")`;
    }
  }

  settled() {
    return (
      Math.abs(this.a - this.A) < 0.05 &&
      Math.abs(this.b - this.B) < 0.05 &&
      Math.abs(this.va) < 0.5 &&
      Math.abs(this.vb) < 0.5
    );
  }

  step(dt: number) {
    this.since += dt;
    let left = dt;
    while (left > 0) {
      const h = Math.min(left, 1 / 240);
      left -= h;
      const leadIsB = this.lead >= 0;
      const trailOn = this.since > TRAIL_DELAY;
      const pa = leadIsB ? TRAIL : LEAD;
      const pb = leadIsB ? LEAD : TRAIL;
      if (!leadIsB || trailOn) {
        this.va += (pa.k * (this.A - this.a) - pa.c * this.va) * h;
        this.a += this.va * h;
      }
      if (leadIsB || trailOn) {
        this.vb += (pb.k * (this.B - this.b) - pb.c * this.vb) * h;
        this.b += this.vb * h;
      }
      if (this.b > this.wallB) {
        this.b = this.wallB;
        if (this.vb > 0) this.vb *= -0.2;
      }
      if (this.a < this.wallA) {
        this.a = this.wallA;
        if (this.va < 0) this.va *= -0.2;
      }
      const least = (this.B - this.A) * 0.72;
      if (this.b - this.a < least) {
        if (leadIsB) {
          this.a = this.b - least;
          this.va = Math.min(this.va, this.vb);
        } else {
          this.b = this.a + least;
          this.vb = Math.max(this.vb, this.va);
        }
      }
    }
  }

  frame = (now: number) => {
    const dt = this.last ? clamp((now - this.last) / 1000, 0, 1 / 30) : 1 / 60;
    this.last = now;
    this.step(dt);
    if (this.settled()) {
      this.raf = 0;
      this.snap();
      return;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  snap() {
    this.a = this.A;
    this.b = this.B;
    this.va = this.vb = 0;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.draw();
  }

  measure(animate: boolean) {
    const tab = this.tab;
    if (!tab?.isConnected) return;
    const A = this.along(tab);
    const B = A + this.length(tab);
    const first = !this.placed;
    this.cross = this.vertical ? tab.offsetLeft : tab.offsetTop;
    this.depth = this.vertical ? tab.offsetWidth : tab.offsetHeight;
    if (!first && animate) {
      const from = (this.a + this.b) / 2;
      const to = (A + B) / 2;
      if (Math.abs(to - from) > 0.5) {
        this.lead = to > from ? 1 : -1;
        this.since = 0;
      }
    }
    this.A = A;
    this.B = B;
    this.wallA = Infinity;
    this.wallB = -Infinity;
    for (const el of this.tabs.keys()) {
      if (!el.isConnected) continue;
      this.wallA = Math.min(this.wallA, this.along(el));
      this.wallB = Math.max(this.wallB, this.along(el) + this.length(el));
    }
    if (!Number.isFinite(this.wallA)) this.wallA = A;
    if (!Number.isFinite(this.wallB)) this.wallB = B;
    this.placed = true;
    if (first || !animate) {
      this.snap();
      if (first) this.onReady?.();
      return;
    }
    if (this.reduce) {
      this.snap();
      this.svg?.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
      return;
    }
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.ro = null;
  }
}

export interface TideTabListProps<T extends object = object> extends AriaTabListProps<T> {
  color?: string;
  ref?: Ref<HTMLDivElement>;
}

export function TideTabList<T extends object>({
  color = "var(--brand)",
  className,
  style,
  ...props
}: TideTabListProps<T>) {
  const orientation = useContext(OrientationContext);
  const vertical = orientation === "vertical";
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^\w-]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const shineRef = useRef<SVGPathElement>(null);
  const shineGradRef = useRef<SVGLinearGradientElement>(null);
  const [ready, setReady] = useState(false);
  const [pool] = useState(() => new Pool(vertical));

  useLayoutEffect(() => {
    pool.setReduce(reduce);
  }, [pool, reduce]);

  useLayoutEffect(() => {
    pool.setVertical(vertical);
  }, [pool, vertical]);

  useLayoutEffect(() => {
    pool.attach({
      svg: svgRef.current,
      body: bodyRef.current,
      shine: shineRef.current,
      grad: shineGradRef.current,
      onReady: () => setReady(true),
    });
  }, [pool]);

  useLayoutEffect(() => {
    pool.draw();
  }, [pool, ready]);

  useEffect(() => () => pool.dispose(), [pool]);

  const api = useMemo<PoolApi>(
    () => ({
      register: (tab, wet) => pool.register(tab, wet),
      select: (tab) => pool.select(tab),
      ready,
    }),
    [pool, ready],
  );

  return (
    <PoolContext value={api}>
      <div
        className={cn(
          "relative isolate flex max-w-full rounded-full bg-muted p-1 ring-1 ring-border ring-inset",
          vertical ? "flex-col self-start rounded-[22px]" : "self-start",
        )}
        style={{ "--miyuki-tide-tabs-water": color } as CSSProperties}
      >
        <svg
          ref={svgRef}
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", !ready && "invisible")}
        >
          <defs>
            <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--miyuki-tide-tabs-water) 86%, white)" }} />
              <stop offset="0.55" style={{ stopColor: "var(--miyuki-tide-tabs-water)" }} />
              <stop
                offset="1"
                style={{ stopColor: "color-mix(in oklab, var(--miyuki-tide-tabs-water) 86%, var(--brand-strong))" }}
              />
            </linearGradient>
            <linearGradient
              ref={shineGradRef}
              id={`${uid}-shine`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.22" stopColor="white" stopOpacity="0.62" />
              <stop offset="0.6" stopColor="white" stopOpacity="0.5" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="dark:drop-shadow-[0_0_10px_color-mix(in_oklab,var(--miyuki-tide-tabs-water)_45%,transparent)]">
            <path ref={bodyRef} fill={`url(#${uid}-body)`} />
            <path
              ref={shineRef}
              fill="none"
              stroke={`url(#${uid}-shine)`}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70 dark:opacity-90"
            />
          </g>
        </svg>
        <AriaTabList
          {...props}
          style={style}
          className={composeRenderProps(className, (cls) => cn("flex", vertical ? "flex-col gap-0.5" : "gap-0.5", cls))}
        />
      </div>
    </PoolContext>
  );
}

export interface TideTabProps extends Omit<AriaTabProps, "children"> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function TideTab({ className, children, ...props }: TideTabProps) {
  const orientation = useContext(OrientationContext);
  const vertical = orientation === "vertical";
  return (
    <AriaTab
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/tab relative flex h-8 shrink-0 cursor-default items-center rounded-full px-3 text-sm font-medium whitespace-nowrap outline-none select-none sm:px-4",
          "text-muted-foreground transition-[color,box-shadow] duration-150 ease-settle",
          "data-[hovered]:text-foreground data-[selected]:text-foreground",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          vertical ? "justify-start" : "justify-center",
          cls,
        ),
      )}
    >
      {({ isSelected }) => (
        <TabFace selected={isSelected} vertical={vertical}>
          {children}
        </TabFace>
      )}
    </AriaTab>
  );
}

function TabFace({ selected, vertical, children }: { selected: boolean; vertical: boolean; children: ReactNode }) {
  const pool = useContext(PoolContext);
  const wetRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wet = wetRef.current;
    const tab = wet?.parentElement;
    if (!pool || !wet || !tab) return;
    return pool.register(tab, wet);
  }, [pool]);

  useLayoutEffect(() => {
    const tab = wetRef.current?.parentElement;
    if (selected && pool && tab) pool.select(tab);
  }, [selected, pool]);

  const ready = pool?.ready ?? false;

  return (
    <>
      {selected && !ready && (
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-(--miyuki-tide-tabs-water,var(--brand))" />
      )}
      <span className="relative inline-flex min-w-0 items-center gap-2">{children}</span>
      <span
        ref={wetRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center gap-2 px-3 text-brand-foreground sm:px-4",
          vertical ? "justify-start" : "justify-center",
        )}
        style={{ clipPath: selected && !ready ? "none" : "inset(50%)" }}
      >
        {children}
      </span>
    </>
  );
}

export interface TideTabPanelProps extends AriaTabPanelProps {
  ref?: Ref<HTMLDivElement>;
}

export function TideTabPanel({ className, ...props }: TideTabPanelProps) {
  return (
    <AriaTabPanel
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "min-w-0 flex-1 rounded-lg text-sm text-foreground outline-none",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[entering]:animate-[miyuki-tide-tabs-in_260ms_cubic-bezier(0.22,1,0.36,1)]",
          "motion-reduce:data-[entering]:animate-[miyuki-tide-tabs-fade_120ms_ease-out]",
          cls,
        ),
      )}
    />
  );
}
