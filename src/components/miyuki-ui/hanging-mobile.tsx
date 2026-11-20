"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  Fragment,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type HangingMobileShape = "disc" | "drop" | "leaf" | "crescent" | "crystal";

export interface HangingMobilePiece {
  node?: ReactNode;
  shape?: HangingMobileShape;
  color?: string;
  weight?: number;
}

export interface HangingMobileArm {
  left: HangingMobileItem;
  right: HangingMobileItem;
}

export type HangingMobileItem = HangingMobilePiece | HangingMobileArm;

export interface HangingMobileProps extends Omit<ComponentProps<"div">, "children"> {
  items?: HangingMobileItem;
  breeze?: number;
  interactive?: boolean;
  width?: number;
  height?: number;
  seed?: number | string;
}

interface ShapeDef {
  d: string;
  x0: number;
  w: number;
  h: number;
  crease?: string;
}

const SHAPES: Record<HangingMobileShape, ShapeDef> = {
  disc: { d: "M0 0A20 20 0 1 1 0 40A20 20 0 1 1 0 0Z", x0: -20, w: 40, h: 40 },
  drop: {
    d: "M0 0C7.6 12 18.6 18.6 18.6 31.7A18.6 18.6 0 0 1 -18.6 31.7C-18.6 18.6 -7.6 12 0 0Z",
    x0: -18.6,
    w: 37.2,
    h: 50.3,
  },
  leaf: {
    d: "M0 0C18.61 6.57 23 29.56 -2.19 61.32C-20.8 32.85 -17.52 7.67 0 0Z",
    x0: -14.8,
    w: 30.2,
    h: 61.4,
    crease: "M0.2 5C3.6 21 3.2 41 -1.5 56",
  },
  crescent: { d: "M0 0A28.95 28.95 0 1 0 35.82 27.59A23.03 23.03 0 1 1 0 0Z", x0: -22.1, w: 57.9, h: 57.1 },
  crystal: {
    d: "M0 0L13.4 11.2L13.4 46.9L0 58.1L-13.4 46.9L-13.4 11.2Z",
    x0: -13.4,
    w: 26.8,
    h: 58.1,
    crease: "M0 0L0 58.1",
  },
};

const SHAPE_ORDER: HangingMobileShape[] = ["disc", "drop", "leaf", "crescent", "crystal"];
const TONE_ORDER = ["var(--brand)", "var(--chart-3)", "var(--chart-2)", "var(--foreground)", "var(--chart-6)"];

const DEFAULT_ITEMS: HangingMobileArm = {
  left: {
    left: { shape: "disc", color: "var(--brand)", weight: 2.6 },
    right: {
      left: { shape: "drop", color: "var(--chart-3)", weight: 0.9 },
      right: { shape: "leaf", color: "var(--chart-2)", weight: 1.1 },
    },
  },
  right: {
    left: {
      left: { shape: "crescent", color: "var(--foreground)", weight: 1.2 },
      right: { shape: "crystal", color: "var(--chart-6)", weight: 0.8 },
    },
    right: {
      left: { shape: "disc", color: "var(--chart-5)", weight: 0.45 },
      right: { shape: "drop", color: "var(--chart-2)", weight: 0.85 },
    },
  },
};

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const STEP = 1 / 120;
const GRAV = 300;
const GAP = 14;
const PAPER = 1.3;
const TURN_LIMIT = 1.02;
const LIGHT_X = 0.42;
const LIGHT_Z = 0.75;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const now = () => performance.now();

interface Spec {
  l?: Spec;
  r?: Spec;
  s?: HangingMobileShape;
  c?: string;
  w?: number;
  n?: 1;
}

const isArm = (item: HangingMobileItem): item is HangingMobileArm =>
  typeof item === "object" && item !== null && "left" in item && "right" in item;

function describe(item: HangingMobileItem): Spec {
  if (isArm(item)) return { l: describe(item.left), r: describe(item.right) };
  return { s: item.shape, c: item.color, w: item.weight, n: item.node != null ? 1 : undefined };
}

function collectNodes(item: HangingMobileItem, out: ReactNode[]) {
  if (isArm(item)) {
    collectNodes(item.left, out);
    collectNodes(item.right, out);
  } else out.push(item.node);
}

interface MNode {
  key: string;
  arm: boolean;
  parent: number;
  side: number;
  depth: number;
  left: number;
  right: number;
  piece: number;
  weight: number;
  shape: HangingMobileShape;
  tone: string;
  custom: boolean;
  restWorld: number;
  w0: number;
  zeta: number;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  fs: number;
  ps: number;
  dropSeed: number;
  lenJitter: number;
  bow: number;
}

interface Model {
  nodes: MNode[];
  gust: [number, number, number];
}

function buildModel(spec: Spec, seed: string): Model {
  const nodes: MNode[] = [];
  let pieces = 0;
  const visit = (s: Spec, parent: number, side: number, depth: number, key: string): number => {
    const rng = createRng(`${seed}:${key}`);
    const arm = !!(s.l && s.r);
    const sign = rng() < 0.5 ? -1 : 1;
    const period = arm
      ? depth === 0
        ? rng.range(16, 21)
        : depth === 1
          ? rng.range(10, 14)
          : rng.range(7, 10)
      : s.n
        ? rng.range(8, 12)
        : rng.range(7, 11);
    const i = nodes.length;
    const m: MNode = {
      key,
      arm,
      parent,
      side,
      depth,
      left: -1,
      right: -1,
      piece: -1,
      weight: 1,
      shape: "disc",
      tone: "",
      custom: s.n === 1,
      restWorld: arm
        ? sign * (depth === 0 ? rng.range(0.25, 0.5) : rng.range(0.35, 1.1))
        : sign * rng.range(0.06, s.n ? 0.3 : 0.45),
      w0: TAU / period,
      zeta: arm ? rng.range(0.16, 0.22) : rng.range(0.18, 0.24),
      f1: TAU / (period * rng.range(1.6, 2.2)),
      f2: TAU / (period * rng.range(0.58, 0.72)),
      p1: rng.range(0, TAU),
      p2: rng.range(0, TAU),
      fs: TAU / rng.range(5, 9),
      ps: rng.range(0, TAU),
      dropSeed: rng(),
      lenJitter: rng.range(0.9, 1.1),
      bow: rng.range(0.045, 0.07),
    };
    nodes.push(m);
    if (arm && s.l && s.r) {
      m.left = visit(s.l, i, -1, depth + 1, `${key}l`);
      m.right = visit(s.r, i, 1, depth + 1, `${key}r`);
      m.weight = nodes[m.left].weight + nodes[m.right].weight;
    } else {
      const k = pieces++;
      m.piece = k;
      m.weight = Math.max(0.1, s.w ?? 1);
      m.shape = s.s && s.s in SHAPES ? s.s : SHAPE_ORDER[k % SHAPE_ORDER.length];
      m.tone = s.c ?? TONE_ORDER[k % TONE_ORDER.length];
    }
    return i;
  };
  visit(spec, -1, 0, 0, "m");
  const rng = createRng(`${seed}:air`);
  return { nodes, gust: [rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)] };
}

interface Geo {
  drop: number;
  a: number;
  b: number;
  L: number;
  q: number;
  c: number;
  droop: number;
  reach: number;
  under: number;
  hcm: number;
  inertia: number;
  lEff: number;
  x0: number;
  pw: number;
  ph: number;
}

interface Size {
  x0: number;
  w: number;
  h: number;
}

function arrange(nodes: MNode[], sizes: Size[], W: number, H: number) {
  const geo: Geo[] = nodes.map(() => ({
    drop: 0,
    a: 0,
    b: 0,
    L: 0,
    q: 0,
    c: 0,
    droop: 0,
    reach: 0,
    under: 0,
    hcm: 0,
    inertia: 1,
    lEff: 1,
    x0: 0,
    pw: 0,
    ph: 0,
  }));
  const root = geo[0];
  const slot = new Int32Array(nodes.length).fill(-1);
  let arms = 0;
  for (let i = 0; i < nodes.length; i++) if (nodes[i].arm && arms < 7) slot[i] = arms++;
  const place = (code: number) => {
    let cascades = 0;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const m = nodes[i];
      const g = geo[i];
      if (!m.arm) {
        const sz = sizes[m.piece];
        g.x0 = sz.x0;
        g.pw = sz.w;
        g.ph = sz.h;
        g.reach = Math.max(-sz.x0, sz.x0 + sz.w) + 4;
        g.under = sz.h;
        g.hcm = sz.h * 0.55;
        g.drop = 10 + m.dropSeed * 18;
        continue;
      }
      const l = geo[m.left];
      const r = geo[m.right];
      const wl = nodes[m.left].weight;
      const wr = nodes[m.right].weight;
      const choice = slot[i] < 0 ? 0 : Math.floor(code / 3 ** slot[i]) % 3;
      const hiLeft = choice === 2 ? wl < wr : wl >= wr;
      const hi = hiLeft ? l : r;
      const lo = hiLeft ? r : l;
      const nominal = 230 * 0.62 ** m.depth * m.lenJitter;
      const need = l.reach + r.reach + GAP;
      let L: number;
      if (choice === 0 && need <= nominal * 1.6) {
        L = Math.max(nominal, need);
        lo.drop += (0.12 + 0.4 * m.dropSeed) * Math.min(hi.under, lo.under + lo.drop);
      } else {
        cascades++;
        L = Math.max(nominal, hi.reach + 10);
        const rise = nodes[hiLeft ? m.right : m.left].arm ? lo.q * lo.c * lo.c + 4 : 0;
        lo.drop = Math.max(lo.drop, hi.drop + hi.under + GAP + rise);
      }
      g.L = L;
      g.a = (L * wr) / (wl + wr);
      g.b = (L * wl) / (wl + wr);
      g.q = (L * m.bow) / ((L * L) / 4);
      g.c = (g.b - g.a) / 2;
      g.droop = g.q * g.a * g.b;
      g.under = g.droop + Math.max(l.drop + l.under, r.drop + r.under);
      g.reach = Math.max(g.a + l.reach, g.b + r.reach);
      g.hcm = g.droop + (wl * (l.drop + l.hcm) + wr * (r.drop + r.hcm)) / (wl + wr);
      g.inertia = wl * g.a * g.a + wr * g.b * g.b;
      g.drop = 16 + m.dropSeed * 26;
    }
    root.drop = 26 + nodes[0].dropSeed * 14;
    const fit = Math.min((W / 2 - 6) / root.reach, (H - 6) / (root.drop + root.under + 10), 1.35);
    return fit * (1 + 0.04 * cascades);
  };
  let best = 0;
  let top = -1;
  for (let code = 0; code < 3 ** arms; code++) {
    const score = place(code);
    if (score > top + 1e-9) {
      top = score;
      best = code;
    }
  }
  place(best);
  const tall = root.drop + root.under + 10;
  const sigma = Math.min((W / 2 - 6) / root.reach, (H - 6) / tall, 1.35);
  const extra = (H - 6) / sigma - tall;
  if (extra > 0) root.drop += extra * 0.45;
  for (const g of geo) g.lEff = g.drop + g.hcm;
  return { geo, sigma, zMax: Math.max(40, root.reach) };
}

interface Parts {
  layer: (Element | null)[];
  thread: (SVGPathElement | null)[];
  knot: (SVGCircleElement | null)[];
  halfLayer: (SVGSVGElement | null)[];
  half: (SVGPathElement | null)[];
  wrap: (HTMLDivElement | null)[];
  inner: (HTMLDivElement | null)[];
  shade: (SVGPathElement | null)[];
  glint: (SVGPathElement | null)[];
  haze: (SVGPathElement | null)[];
  fade: SVGLinearGradientElement | null;
}

const emptyParts = (): Parts => ({
  layer: [],
  thread: [],
  knot: [],
  halfLayer: [],
  half: [],
  wrap: [],
  inner: [],
  shade: [],
  glint: [],
  haze: [],
  fade: null,
});

const LAYER = "pointer-events-none absolute inset-0 size-full overflow-visible";

function Paper({
  def,
  weight,
  uid,
  shadeRef,
  glintRef,
  hazeRef,
}: {
  def: ShapeDef;
  weight: number;
  uid: string;
  shadeRef: (el: SVGPathElement | null) => void;
  glintRef: (el: SVGPathElement | null) => void;
  hazeRef: (el: SVGPathElement | null) => void;
}) {
  const s = PAPER * Math.sqrt(weight);
  const pad = 5;
  return (
    <svg
      aria-hidden="true"
      width={(def.w + pad * 2) * s}
      height={(def.h + pad * 2) * s}
      viewBox={`${def.x0 - pad} ${-pad} ${def.w + pad * 2} ${def.h + pad * 2}`}
      className="absolute overflow-visible"
      style={{ left: (def.x0 - pad) * s, top: -pad * s }}
    >
      <defs>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--miyuki-hanging-mobile-rim)" }} stopOpacity="0.95" />
          <stop offset="1" style={{ stopColor: "var(--miyuki-hanging-mobile-rim)" }} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g
        className="dark:hidden"
        transform="translate(0 1.4)"
        style={{ fill: "var(--miyuki-hanging-mobile-shadow)", stroke: "var(--miyuki-hanging-mobile-shadow)" }}
        strokeLinejoin="round"
      >
        <path d={def.d} fillOpacity={0.12} strokeOpacity={0.05} strokeWidth={4.5} />
        <path d={def.d} fill="none" strokeOpacity={0.08} strokeWidth={1.8} />
      </g>
      <path d={def.d} style={{ fill: "var(--miyuki-hanging-mobile-face)" }} />
      <path d={def.d} fill={`url(#${uid}-sheen)`} />
      {def.crease && (
        <path
          d={def.crease}
          fill="none"
          strokeWidth={0.9}
          strokeLinecap="round"
          style={{ stroke: "var(--miyuki-hanging-mobile-crease)" }}
        />
      )}
      <path ref={shadeRef} d={def.d} opacity={0} style={{ fill: "var(--miyuki-hanging-mobile-shade)" }} />
      <path ref={glintRef} d={def.d} opacity={0} fill="#fff" />
      <path d={def.d} fill="none" strokeWidth={1.1} className="hidden dark:inline" stroke={`url(#${uid}-rim)`} />
      <path ref={hazeRef} d={def.d} opacity={0} style={{ fill: "var(--background)" }} />
    </svg>
  );
}

export function HangingMobile({
  items = DEFAULT_ITEMS,
  breeze = 0.4,
  interactive = true,
  width = 560,
  height = 420,
  seed = "hanging-mobile",
  className,
  style,
  ...props
}: HangingMobileProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^\w-]/g, "");
  const sig = JSON.stringify(describe(items));
  const model = useMemo(() => buildModel(JSON.parse(sig) as Spec, String(seed)), [sig, seed]);
  const content: ReactNode[] = [];
  collectNodes(items, content);
  const rootRef = useRef<HTMLDivElement>(null);
  const parts = useRef<Parts>(emptyParts());
  const opts = useRef({ breeze, interactive });
  const wakeRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    opts.current = { breeze: clamp(breeze, 0, 1), interactive };
    wakeRef.current();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const P = parts.current;
    const N = model.nodes;
    const n = N.length;

    const sizes: Size[] = [];
    for (let i = 0; i < n; i++) {
      const m = N[i];
      if (m.arm) continue;
      if (m.custom) {
        const el = P.inner[i];
        const w = el?.offsetWidth || 48;
        const h = el?.offsetHeight || 48;
        sizes[m.piece] = { x0: -w / 2, w, h };
      } else {
        const d = SHAPES[m.shape];
        const s = PAPER * Math.sqrt(m.weight);
        sizes[m.piece] = { x0: d.x0 * s, w: d.w * s, h: d.h * s };
      }
    }
    const { geo, sigma, zMax } = arrange(N, sizes, width, height);
    const [g1, g2, g3] = model.gust;
    const gustAt = (t: number) =>
      clamp(
        0.64 + 0.22 * Math.sin(t * 0.19 + g1) + 0.16 * Math.sin(t * 0.077 + g2) + 0.06 * Math.sin(t * 0.43 + g3),
        0.3,
        1,
      );

    const th = new Float64Array(n);
    const om = new Float64Array(n);
    const tip = new Float64Array(n);
    const tipv = new Float64Array(n);
    const sx = new Float64Array(n);
    const svx = new Float64Array(n);
    const sz = new Float64Array(n);
    const svz = new Float64Array(n);
    const rest = new Float64Array(n);
    const cX = new Float64Array(n);
    const cY = new Float64Array(n);
    const cZ = new Float64Array(n);
    const cVx = new Float64Array(n);
    const cVy = new Float64Array(n);
    const cVz = new Float64Array(n);
    const pVx = new Float64Array(n);
    const pVy = new Float64Array(n);
    const pVz = new Float64Array(n);
    const aX = new Float64Array(n);
    const aY = new Float64Array(n);
    const aZ = new Float64Array(n);
    const eX = new Float64Array(2 * n);
    const eY = new Float64Array(2 * n);
    const eZ = new Float64Array(2 * n);
    const eVx = new Float64Array(2 * n);
    const eVy = new Float64Array(2 * n);
    const eVz = new Float64Array(2 * n);

    for (let i = 0; i < n; i++) {
      const m = N[i];
      const parentRest = m.parent >= 0 ? N[m.parent].restWorld : 0;
      rest[i] = m.custom ? m.restWorld : m.restWorld - parentRest;
      th[i] = m.restWorld;
    }

    const kin = (dt: number) => {
      for (let i = 0; i < n; i++) {
        const m = N[i];
        const g = geo[i];
        let sX = 0;
        let sY = 0;
        let sZ = 0;
        let vX = 0;
        let vY = 0;
        let vZ = 0;
        if (m.parent >= 0) {
          const e = 2 * m.parent + (m.side > 0 ? 1 : 0);
          sX = eX[e];
          sY = eY[e];
          sZ = eZ[e];
          vX = eVx[e];
          vY = eVy[e];
          vZ = eVz[e];
        }
        if (dt > 0) {
          aX[i] = (vX - pVx[i]) / dt;
          aY[i] = (vY - pVy[i]) / dt;
          aZ[i] = (vZ - pVz[i]) / dt;
          pVx[i] = vX;
          pVy[i] = vY;
          pVz[i] = vZ;
        }
        const l = g.drop;
        const ssx = Math.sin(sx[i]);
        const ssz = Math.sin(sz[i]);
        const cy = Math.sqrt(Math.max(0.05, 1 - ssx * ssx - ssz * ssz));
        cX[i] = sX + l * ssx;
        cY[i] = sY + l * cy;
        cZ[i] = sZ + l * ssz;
        const ux = l * Math.cos(sx[i]) * svx[i];
        const uz = l * Math.cos(sz[i]) * svz[i];
        cVx[i] = vX + ux;
        cVz[i] = vZ + uz;
        cVy[i] = vY - (ssx * ux + ssz * uz) / cy;
        if (!m.arm) continue;
        const ct = Math.cos(th[i]);
        const st = Math.sin(th[i]);
        const cp = Math.cos(tip[i]);
        const sp = Math.sin(tip[i]);
        for (let k = 0; k < 2; k++) {
          const s = k ? g.b : -g.a;
          const s1 = s * cp - g.droop * sp;
          const v1 = s * sp + g.droop * cp;
          const e = 2 * i + k;
          eX[e] = cX[i] + s1 * ct;
          eY[e] = cY[i] + v1;
          eZ[e] = cZ[i] + s1 * st;
          eVx[e] = cVx[i] - s1 * st * om[i] - v1 * tipv[i] * ct;
          eVy[e] = cVy[i] + s1 * tipv[i];
          eVz[e] = cVz[i] + s1 * ct * om[i] - v1 * tipv[i] * st;
        }
      }
    };

    const reaction = (i: number, c: number) => {
      const mc = N[c];
      if (!mc.arm) return 0;
      const twist = mc.w0 * mc.w0 * (th[c] - th[i] - rest[c]) + 2 * mc.zeta * mc.w0 * (om[c] - om[i]);
      return (0.5 * geo[c].inertia * twist) / geo[i].inertia;
    };

    const dyn = (dt: number, t: number) => {
      const wind = opts.current.breeze;
      for (let i = 0; i < n; i++) {
        const m = N[i];
        const g = geo[i];
        const gust = wind > 0 ? gustAt(t - cX[i] / 160) : 0;
        const le = g.lEff;
        const ws = Math.sqrt(GRAV / le);
        const gy = GRAV - aY[i];
        const sway = wind * gust * 7;
        const ax =
          (-gy * Math.sin(sx[i]) - aX[i] * Math.cos(sx[i]) + sway * Math.sin(t * m.fs + m.ps)) / le -
          0.14 * ws * svx[i];
        const az =
          (-gy * Math.sin(sz[i]) - aZ[i] * Math.cos(sz[i]) + sway * Math.sin(t * m.fs * 0.79 + m.ps * 1.7)) / le -
          0.14 * ws * svz[i];
        const wallX = Math.abs(sx[i]) > 0.55 ? (Math.abs(sx[i]) - 0.55) * Math.sign(sx[i]) * 60 + svx[i] * 3 : 0;
        const wallZ = Math.abs(sz[i]) > 0.55 ? (Math.abs(sz[i]) - 0.55) * Math.sign(sz[i]) * 60 + svz[i] * 3 : 0;
        svx[i] += (ax - wallX) * dt;
        svz[i] += (az - wallZ) * dt;
        sx[i] = clamp(sx[i] + svx[i] * dt, -1.2, 1.2);
        sz[i] = clamp(sz[i] + svz[i] * dt, -1.2, 1.2);

        const pth = m.parent >= 0 ? th[m.parent] : 0;
        const pom = m.parent >= 0 ? om[m.parent] : 0;
        const w2 = m.w0 * m.w0;
        const dmp = 2 * m.zeta * m.w0;
        const noise = 0.75 * Math.sin(t * m.f1 + m.p1) + 0.25 * Math.sin(t * m.f2 + m.p2);
        let acc: number;
        if (m.arm) {
          acc = -w2 * (th[i] - pth - rest[i]) - dmp * (om[i] - pom);
          acc += reaction(i, m.left) + reaction(i, m.right);
          acc -= 0.35 * om[i] * Math.abs(om[i]);
          acc += wind * 0.75 * w2 * gust * noise;
          const ct = Math.cos(th[i]);
          const st = Math.sin(th[i]);
          let lean = 0;
          for (let k = 0; k < 2; k++) {
            const c = k ? m.right : m.left;
            const s = k ? g.b : -g.a;
            const lc = geo[c].drop;
            lean +=
              N[c].weight *
              (lc * (Math.sin(sx[c]) * ct + Math.sin(sz[c]) * st) +
                (s * lc * (svx[c] * svx[c] + svz[c] * svz[c])) / GRAV);
          }
          const target = clamp(lean / (m.weight * g.hcm), -0.05, 0.05);
          tipv[i] += (23 * (target - tip[i]) - 3.8 * tipv[i]) * dt;
          tip[i] += tipv[i] * dt;
        } else if (m.custom) {
          acc = -w2 * (th[i] - rest[i]) - dmp * (om[i] - 0.45 * pom) + wind * 0.7 * w2 * gust * noise;
          acc -= 0.5 * om[i] * Math.abs(om[i]);
        } else {
          acc = -w2 * (th[i] - pth - rest[i]) - dmp * (om[i] - pom) + wind * 1 * w2 * gust * noise;
          acc -= 0.5 * om[i] * Math.abs(om[i]);
        }
        om[i] += acc * dt;
        th[i] += om[i] * dt;
      }
    };

    const energy = () => {
      let e = 0;
      for (let i = 0; i < n; i++) {
        const m = N[i];
        const pth = m.parent >= 0 && !m.custom ? th[m.parent] : 0;
        const off = th[i] - pth - rest[i];
        e += om[i] * om[i] + svx[i] * svx[i] + svz[i] * svz[i] + tipv[i] * tipv[i];
        e += sx[i] * sx[i] + sz[i] * sz[i] + off * off;
      }
      return e;
    };

    const layers: Element[] = [];
    const base = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      base[i] = layers.length;
      const layer = P.layer[i];
      if (layer) layers.push(layer);
      if (N[i].arm) {
        const l = P.halfLayer[2 * i];
        const r = P.halfLayer[2 * i + 1];
        if (l && r) layers.push(l, r);
      }
    }
    const count = layers.length;
    const zKey = new Float64Array(count);
    const order = new Int32Array(count);
    const zNow = new Int32Array(count).fill(-1);
    for (let i = 0; i < count; i++) order[i] = i;
    const alpha = new Float64Array(4 * n).fill(-1);
    const setAlpha = (slot: number, el: Element | null | undefined, v: number, attr: string) => {
      if (!el || Math.abs(alpha[slot] - v) < 0.004) return;
      alpha[slot] = v;
      el.setAttribute(attr, v.toFixed(3));
    };

    let cw = root.clientWidth || width;
    let S = sigma;
    let ps = sigma;
    let ox = cw / 2;
    const resize = () => {
      cw = root.clientWidth || width;
      const k = cw / width;
      S = sigma * k;
      ps = sigma * k ** 0.6;
      ox = cw / 2;
      P.fade?.setAttribute("y2", String(Math.max(12, geo[0].drop * S * 0.7)));
    };
    resize();

    const f = (v: number) => v.toFixed(2);

    const paint = () => {
      for (let i = 0; i < n; i++) {
        const m = N[i];
        const g = geo[i];
        let px = 0;
        let py = 0;
        if (m.parent >= 0) {
          const e = 2 * m.parent + (m.side > 0 ? 1 : 0);
          px = eX[e];
          py = eY[e];
        }
        const X = ox + cX[i] * S;
        const Y = cY[i] * S;
        const depth = clamp(cZ[i] / zMax, -1, 1);
        const thread = P.thread[i];
        thread?.setAttribute("d", `M${f(ox + px * S)} ${f(py * S)}L${f(X)} ${f(Y)}`);
        setAlpha(4 * i, thread, 0.72 + 0.28 * (depth * 0.5 + 0.5), "stroke-opacity");
        const b = base[i];
        zKey[b] = cZ[i] + b * 1e-6;
        if (m.arm) {
          const knot = P.knot[i];
          knot?.setAttribute("cx", f(X));
          knot?.setAttribute("cy", f(Y));
          const ct = Math.cos(th[i]);
          const st = Math.sin(th[i]);
          const cp = Math.cos(tip[i]);
          const sp = Math.sin(tip[i]);
          const qc = g.q * g.c;
          for (let k = 0; k < 2; k++) {
            const s1 = k ? g.b : -g.a;
            const hs = s1 / 2;
            const hv = -qc * s1;
            const cxl = (hs * cp - hv * sp) * ct;
            const cyl = hs * sp + hv * cp;
            const exl = (s1 * cp - g.droop * sp) * ct;
            const eyl = s1 * sp + g.droop * cp;
            const ex = X + exl * S;
            const ey = Y + eyl * S;
            P.half[2 * i + k]?.setAttribute(
              "d",
              `M${f(X)} ${f(Y)}Q${f(X + cxl * S)} ${f(Y + cyl * S)} ${f(ex)} ${f(ey)}`,
            );
            const hz = cZ[i] + hs * cp * st;
            zKey[b + 1 + k] = hz + (b + 1 + k) * 1e-6;
            setAlpha(
              4 * i + 1 + k,
              P.half[2 * i + k],
              0.74 + 0.26 * (clamp(hz / zMax, -1, 1) * 0.5 + 0.5),
              "stroke-opacity",
            );
          }
          continue;
        }
        const wrap = P.wrap[i];
        if (!wrap) continue;
        const near = 0.93 + 0.07 * depth;
        let face: number;
        if (m.custom) face = Math.cos(TURN_LIMIT * Math.tanh(th[i] / TURN_LIMIT));
        else {
          face = Math.cos(th[i]);
          if (Math.abs(face) < 0.035) face = face < 0 ? -0.035 : 0.035;
        }
        const sc = ps * near;
        wrap.style.transform = `translate3d(${f(X)}px, ${f(Y)}px, 0) rotate(${(-sx[i] * DEG).toFixed(3)}deg) scale(${(sc * face).toFixed(4)}, ${sc.toFixed(4)})`;
        if (!m.custom) {
          const c = Math.cos(th[i]);
          const lit = ((c < 0 ? -1 : 1) * (LIGHT_X * Math.sin(th[i]) + LIGHT_Z * c)) / LIGHT_Z;
          setAlpha(4 * i + 1, P.haze[i], 0.1 * (1 - depth), "opacity");
          setAlpha(4 * i + 2, P.shade[i], clamp((1 - lit) * 0.34, 0, 0.36), "opacity");
          setAlpha(4 * i + 3, P.glint[i], clamp((lit - 1) * 0.9, 0, 0.13), "opacity");
        }
      }
      for (let i = 1; i < count; i++) {
        const v = order[i];
        const key = zKey[v];
        let j = i - 1;
        while (j >= 0 && zKey[order[j]] > key) {
          order[j + 1] = order[j];
          j--;
        }
        order[j + 1] = v;
      }
      for (let r = 0; r < count; r++) {
        const li = order[r];
        if (zNow[li] === r) continue;
        zNow[li] = r;
        (layers[li] as HTMLElement).style.zIndex = String(r + 1);
      }
    };

    let raf = 0;
    let last = 0;
    let acc = 0;
    let clock = 0;
    let visible = true;

    const step = () => {
      kin(STEP);
      dyn(STEP, clock);
      clock += STEP;
    };

    const frame = (t: number) => {
      raf = 0;
      if (!visible || reduced) {
        last = 0;
        return;
      }
      const dt = last ? clamp((t - last) / 1000, 0, STEP * 4) : STEP;
      last = t;
      acc = Math.min(acc + dt, STEP * 4);
      while (acc >= STEP) {
        step();
        acc -= STEP;
      }
      kin(0);
      paint();
      if (opts.current.breeze > 0 || energy() > 1e-5) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && visible && !reduced) raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    let lastX = 0;
    let lastY = 0;
    let lastT = -1;
    const breathe = (x: number, y: number, dx: number, dist: number, speed: number) => {
      const vf = Math.min(speed / 650, 1.8);
      const fx = dx * vf;
      const fz = -dist * vf * 0.4;
      const rel = ps / S;
      for (let i = 0; i < n; i++) {
        const m = N[i];
        const g = geo[i];
        if (m.arm) {
          const ax = eX[2 * i];
          const ay = eY[2 * i];
          const vx = eX[2 * i + 1] - ax;
          const vy = eY[2 * i + 1] - ay;
          const len2 = vx * vx + vy * vy;
          const t = len2 > 1e-6 ? clamp(((x - ax) * vx + (y - ay) * vy) / len2, 0, 1) : 0.5;
          const d = Math.hypot(ax + t * vx - x, ay + t * vy - y);
          if (d > 48) continue;
          const fall = (1 - d / 48) ** 1.5;
          const give = Math.sqrt(2.5 / Math.max(0.5, m.weight));
          om[i] = clamp(om[i] - (0.5 * fall * give * fx) / g.L, -0.9, 0.9);
          svx[i] = clamp(svx[i] + (0.35 * fall * fx) / g.lEff, -1.5, 1.5);
          svz[i] = clamp(svz[i] + (0.35 * fall * fz) / g.lEff, -1.5, 1.5);
          continue;
        }
        const half = g.ph * 0.5 * rel;
        const cxp = cX[i] + Math.sin(sx[i]) * half + (g.x0 + g.pw / 2) * rel * Math.cos(th[i]);
        const cyp = cY[i] + half;
        const reach = Math.max(g.pw, g.ph) * 0.5 * rel + 24;
        const d = Math.hypot(x - cxp, y - cyp);
        if (d > reach) continue;
        const fall = (1 - d / reach) ** 1.5;
        svx[i] = clamp(svx[i] + (1.1 * fall * fx) / g.lEff, -1.5, 1.5);
        svz[i] = clamp(svz[i] + (0.6 * fall * fz) / g.lEff, -1.5, 1.5);
        const c = Math.cos(th[i]);
        const u = clamp((x - cxp) / Math.max(0.3, Math.abs(c)) / reach, -1, 1);
        const twist = -0.8 * fx + 2 * u * (c * fz - Math.sin(th[i]) * fx);
        om[i] = clamp(om[i] + (fall * twist) / Math.max(24, g.pw * rel), -2.4, 2.4);
        const p = m.parent;
        if (p < 0) continue;
        const gp = geo[p];
        const s = m.side > 0 ? gp.b : -gp.a;
        const lever = -s * Math.sin(th[p]) * fx * m.weight;
        om[p] = clamp(om[p] + (2.5 * fall * lever) / gp.inertia, -0.9, 0.9);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive || reduced) return;
      const t = now();
      const rect = root.getBoundingClientRect();
      const zoom = root.offsetWidth ? rect.width / root.offsetWidth : 1;
      const x = ((e.clientX - rect.left) / zoom - ox) / S;
      const y = (e.clientY - rect.top) / zoom / S;
      if (lastT >= 0 && t - lastT < 120) {
        const dts = Math.max(0.004, (t - lastT) / 1000);
        const dx = x - lastX;
        const dist = Math.hypot(dx, y - lastY);
        if (dist > 0.01) {
          breathe(x, y, dx, dist, dist / dts);
          wake();
        }
      }
      lastX = x;
      lastY = y;
      lastT = t;
    };
    const onLeave = () => {
      lastT = -1;
    };

    if (!reduced) for (let i = 0; i < 480; i++) step();
    kin(0);
    paint();
    root.style.opacity = "1";

    const ro = new ResizeObserver(() => {
      resize();
      kin(0);
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
      wakeRef.current = () => {};
    };
  }, [model, reduced, width, height]);

  const P = parts.current;

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative isolate w-full touch-pan-y opacity-0 transition-opacity duration-700 ease-out select-none motion-reduce:duration-200",
        "[--miyuki-hanging-mobile-wire:color-mix(in_oklab,var(--foreground)_86%,var(--background))]",
        "dark:[--miyuki-hanging-mobile-wire:color-mix(in_oklab,var(--foreground)_76%,var(--background))]",
        "[--miyuki-hanging-mobile-thread:color-mix(in_oklab,var(--foreground)_44%,var(--background))]",
        "dark:[--miyuki-hanging-mobile-thread:color-mix(in_oklab,var(--foreground)_40%,var(--background))]",
        "[--miyuki-hanging-mobile-shadow:oklch(0.4_0.09_252)] dark:[--miyuki-hanging-mobile-shadow:oklch(0.08_0.02_252)]",
        "[--miyuki-hanging-mobile-shade:oklch(0.28_0.07_256)] dark:[--miyuki-hanging-mobile-shade:oklch(0.06_0.03_256)]",
        className,
      )}
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}`, ...style }}
    >
      {model.nodes.map((m, i) => {
        if (m.arm) {
          const gauge = m.depth === 0 ? 1.6 : m.depth === 1 ? 1.35 : 1.15;
          return (
            <Fragment key={m.key}>
              <svg
                aria-hidden="true"
                ref={(el) => {
                  P.layer[i] = el;
                }}
                className={LAYER}
              >
                {i === 0 && (
                  <defs>
                    <linearGradient
                      id={`${uid}-fade`}
                      ref={(el) => {
                        P.fade = el;
                      }}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="24"
                    >
                      <stop offset="0" style={{ stopColor: "var(--miyuki-hanging-mobile-thread)" }} stopOpacity="0" />
                      <stop offset="1" style={{ stopColor: "var(--miyuki-hanging-mobile-thread)" }} />
                    </linearGradient>
                  </defs>
                )}
                <path
                  ref={(el) => {
                    P.thread[i] = el;
                  }}
                  fill="none"
                  strokeWidth={0.75}
                  style={{ stroke: i === 0 ? `url(#${uid}-fade)` : "var(--miyuki-hanging-mobile-thread)" }}
                />
                <circle
                  ref={(el) => {
                    P.knot[i] = el;
                  }}
                  r={1.3}
                  style={{ fill: "var(--miyuki-hanging-mobile-wire)" }}
                />
              </svg>
              {[0, 1].map((k) => (
                <svg
                  key={k}
                  aria-hidden="true"
                  ref={(el) => {
                    P.halfLayer[2 * i + k] = el;
                  }}
                  className={LAYER}
                >
                  <path
                    ref={(el) => {
                      P.half[2 * i + k] = el;
                    }}
                    fill="none"
                    strokeWidth={gauge}
                    strokeLinecap="round"
                    style={{ stroke: "var(--miyuki-hanging-mobile-wire)" }}
                  />
                </svg>
              ))}
            </Fragment>
          );
        }
        return (
          <div
            key={m.key}
            ref={(el) => {
              P.layer[i] = el;
            }}
            className="pointer-events-none absolute inset-0"
          >
            <svg aria-hidden="true" className={LAYER}>
              <path
                ref={(el) => {
                  P.thread[i] = el;
                }}
                fill="none"
                strokeWidth={0.75}
                style={{ stroke: "var(--miyuki-hanging-mobile-thread)" }}
              />
            </svg>
            <div
              ref={(el) => {
                P.wrap[i] = el;
              }}
              className={cn(
                "absolute top-0 left-0 origin-top-left",
                "[--miyuki-hanging-mobile-face:color-mix(in_oklab,var(--miyuki-hanging-mobile-tone)_88%,var(--card))]",
                "dark:[--miyuki-hanging-mobile-face:color-mix(in_oklab,var(--miyuki-hanging-mobile-tone)_56%,var(--background))]",
                "[--miyuki-hanging-mobile-rim:color-mix(in_oklab,var(--miyuki-hanging-mobile-tone)_45%,var(--foreground))]",
                "[--miyuki-hanging-mobile-crease:color-mix(in_oklab,var(--miyuki-hanging-mobile-tone)_70%,var(--card))]",
                "dark:[--miyuki-hanging-mobile-crease:color-mix(in_oklab,var(--miyuki-hanging-mobile-tone)_62%,var(--background))]",
              )}
              style={{ "--miyuki-hanging-mobile-tone": m.tone } as CSSProperties}
            >
              {m.custom ? (
                <div
                  ref={(el) => {
                    P.inner[i] = el;
                  }}
                  className="pointer-events-auto absolute top-0 left-0 -translate-x-1/2"
                >
                  {content[m.piece]}
                </div>
              ) : (
                <Paper
                  def={SHAPES[m.shape]}
                  weight={m.weight}
                  uid={`${uid}-${m.key}`}
                  shadeRef={(el) => {
                    P.shade[i] = el;
                  }}
                  glintRef={(el) => {
                    P.glint[i] = el;
                  }}
                  hazeRef={(el) => {
                    P.haze[i] = el;
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
