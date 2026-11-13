"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type BrushAnnotationKind = "underline" | "double" | "circle" | "strike" | "bracket" | "highlight";

export interface BrushAnnotationProps extends Omit<ComponentProps<"span">, "children"> {
  kind?: BrushAnnotationKind;
  color?: string;
  show?: boolean;
  delay?: number;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

type Pt = [number, number];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Metrics {
  em: number;
  ascent: number;
  descent: number;
  xHeight: number;
  capHeight: number;
}

interface Profile {
  start: number;
  press: number;
  liftFrom: number;
  tail: number;
  dryFrom: number;
  dryMin: number;
}

interface Lane {
  u: number;
  end: number;
  spread: number;
  ink: number;
}

interface Stroke {
  pts: number[];
  cum: number[];
  len: number;
  half: number;
  profile: Profile;
  lanes: Lane[];
  phase: [number, number];
  bumps: number[];
  start: number;
  duration: number;
}

interface Cap {
  x: number;
  y: number;
  nx: number;
  ny: number;
  c: number;
  hw: number;
}

interface Geometry {
  strokes: Stroke[];
  total: number;
}

const TAU = Math.PI * 2;
const STEP = 1.75;
const GAP = 90;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 2.4;
const r1 = (v: number) => Math.round(v * 10) / 10;

const PROFILES: Record<BrushAnnotationKind, Profile> = {
  underline: { start: 0.45, press: 0.07, liftFrom: 0.8, tail: 0.55, dryFrom: 0.72, dryMin: 0.38 },
  double: { start: 0.45, press: 0.08, liftFrom: 0.8, tail: 0.55, dryFrom: 0.74, dryMin: 0.4 },
  strike: { start: 0.5, press: 0.06, liftFrom: 0.8, tail: 0.55, dryFrom: 0.74, dryMin: 0.4 },
  circle: { start: 0.4, press: 0.05, liftFrom: 0.78, tail: 0.45, dryFrom: 0.74, dryMin: 0.34 },
  bracket: { start: 0.55, press: 0.06, liftFrom: 0.8, tail: 0.5, dryFrom: 0.76, dryMin: 0.4 },
  highlight: { start: 0.88, press: 0.05, liftFrom: 0.88, tail: 0.65, dryFrom: 0.8, dryMin: 0.32 },
};

const WIDTH: Record<BrushAnnotationKind, number> = {
  underline: 0.18,
  double: 0.15,
  strike: 0.16,
  circle: 0.14,
  bracket: 0.16,
  highlight: 0.95,
};

let measureCtx: CanvasRenderingContext2D | null = null;

function fontMetrics(el: Element): Metrics {
  const s = getComputedStyle(el);
  const em = parseFloat(s.fontSize) || 16;
  const fallback = { em, ascent: em * 0.92, descent: em * 0.24, xHeight: em * 0.53, capHeight: em * 0.71 };
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return fallback;
  measureCtx.font = `${s.fontStyle} ${s.fontWeight} ${em}px ${s.fontFamily}`;
  const x = measureCtx.measureText("x");
  const h = measureCtx.measureText("H");
  return {
    em,
    ascent: x.fontBoundingBoxAscent || fallback.ascent,
    descent: x.fontBoundingBoxDescent || fallback.descent,
    xHeight: x.actualBoundingBoxAscent || fallback.xHeight,
    capHeight: h.actualBoundingBoxAscent || fallback.capHeight,
  };
}

function blockAncestor(el: Element): Element {
  let node = el.parentElement;
  while (node && getComputedStyle(node).display.startsWith("inline")) node = node.parentElement;
  return node ?? document.body;
}

function lineBoxes(content: HTMLElement, origin: DOMRect, scale: number): Box[] {
  const out: Box[] = [];
  for (const r of Array.from(content.getClientRects())) {
    if (r.width < 0.5) continue;
    const box = {
      x: (r.left - origin.left) / scale,
      y: (r.top - origin.top) / scale,
      w: r.width / scale,
      h: r.height / scale,
    };
    const same = out.find((b) => Math.abs(b.y - box.y) < 2);
    if (same) {
      const right = Math.max(same.x + same.w, box.x + box.w);
      same.x = Math.min(same.x, box.x);
      same.w = right - same.x;
    } else out.push(box);
  }
  return out;
}

function wobbler(rng: Rng, amp: number) {
  const f1 = rng.range(0.6, 1.3);
  const f2 = rng.range(2.2, 3.6);
  const p1 = rng();
  const p2 = rng();
  return (s: number) => amp * (0.62 * Math.sin(TAU * (f1 * s + p1)) + 0.38 * Math.sin(TAU * (f2 * s + p2)));
}

function line(x0: number, y0: number, x1: number, y1: number, bow: number, wob: (s: number) => number, lift = 1.35) {
  const pts: Pt[] = [];
  const n = 48;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const k = s ** lift;
    const off = bow * Math.sin(Math.PI * s) + wob(s);
    pts.push([x0 + dx * s + nx * off, y0 + dy * k + ny * off]);
  }
  return pts;
}

function cornered(points: Pt[], radius: number, wob: (s: number) => number) {
  const raw: Pt[] = [];
  const seg = (a: Pt, b: Pt, n: number) => {
    for (let i = 0; i < n; i++) raw.push([a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)]);
  };
  let from = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const la = Math.hypot(p[0] - from[0], p[1] - from[1]);
    const lb = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const r = Math.min(radius, la * 0.45, lb * 0.45);
    const a: Pt = [p[0] + ((from[0] - p[0]) / la) * r, p[1] + ((from[1] - p[1]) / la) * r];
    const b: Pt = [p[0] + ((q[0] - p[0]) / lb) * r, p[1] + ((q[1] - p[1]) / lb) * r];
    seg(from, a, Math.max(4, Math.round(la / 3)));
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      const u = 1 - t;
      raw.push([u * u * a[0] + 2 * u * t * p[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p[1] + t * t * b[1]]);
    }
    from = b;
  }
  const last = points[points.length - 1];
  seg(from, last, Math.max(4, Math.round(Math.hypot(last[0] - from[0], last[1] - from[1]) / 3)));
  raw.push(last);
  const n = raw.length - 1;
  return raw.map(([x, y], i): Pt => {
    const s = i / n;
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(n, i + 1)];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const l = Math.hypot(tx, ty) || 1;
    const w = wob(s);
    return [x - (ty / l) * w, y + (tx / l) * w];
  });
}

function corners(points: Pt[]) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out: number[] = [];
  let run = 0;
  for (let i = 0; i < lengths.length - 1; i++) {
    run += lengths[i];
    out.push(run / total);
  }
  return out;
}

function resample(raw: Pt[]) {
  const cumRaw = [0];
  for (let i = 1; i < raw.length; i++) {
    cumRaw.push(cumRaw[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  }
  const total = cumRaw[cumRaw.length - 1];
  const n = Math.max(8, Math.ceil(total / STEP));
  const pts: number[] = [];
  const cum: number[] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = (total * i) / n;
    while (j < cumRaw.length - 2 && cumRaw[j + 1] < s) j++;
    const span = cumRaw[j + 1] - cumRaw[j] || 1;
    const t = clamp((s - cumRaw[j]) / span);
    pts.push(raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t);
    cum.push(s);
  }
  return { pts, cum, len: total };
}

function makeStroke(
  raw: Pt[],
  width: number,
  profile: Profile,
  rng: Rng,
  bumps: number[] = [],
): Omit<Stroke, "start" | "duration"> {
  const { pts, cum, len } = resample(raw);
  const count = Math.round(clamp(width / 1.5, 3, 11));
  const lanes: Lane[] = [];
  const longest = rng.int(0, count - 1);
  for (let k = 0; k < count; k++) {
    const u = -1 + (2 * k + 1) / count;
    const edge = Math.abs(u);
    lanes.push({
      u,
      end: k === longest ? 1 : clamp(1 - rng.range(0.02, 0.11) - edge * rng.range(0.02, 0.07), 0.82, 0.99),
      spread: rng.range(-0.3, 0.3),
      ink: rng.range(0.55, 1.15),
    });
  }
  return { pts, cum, len, half: width / 2, profile, lanes, phase: [rng(), rng()], bumps };
}

function widthAt(t: number, p: Profile, phase: [number, number], bumps: number[]) {
  const press = t < p.press ? p.start + (1 - p.start) * easeOut(t / p.press) : 1;
  let bump = 0.08 * Math.exp(-(((t - p.press * 1.7) / 0.07) ** 2));
  for (const b of bumps) bump += 0.16 * Math.exp(-(((t - b) / 0.035) ** 2));
  const lift = t > p.liftFrom ? 1 - (1 - p.tail) * smooth((t - p.liftFrom) / (1 - p.liftFrom)) : 1;
  const breath = 1 + 0.05 * Math.sin(TAU * (2.1 * t + phase[0])) + 0.03 * Math.sin(TAU * (5.3 * t + phase[1]));
  return Math.max(0, (press + bump) * lift * breath);
}

function dryAt(t: number, p: Profile) {
  return t < p.dryFrom ? 1 : 1 - (1 - p.dryMin) * smooth((t - p.dryFrom) / (1 - p.dryFrom));
}

function strokePath(stroke: Stroke, progress: number) {
  const { pts, cum, len, half, profile, lanes, phase, bumps } = stroke;
  if (progress <= 0 || len <= 0) return "";
  const n = cum.length;
  const count = lanes.length;
  let d = "";
  for (const lane of lanes) {
    const stop = Math.min(progress, lane.end);
    const live = progress < lane.end;
    const left: string[] = [];
    const right: string[] = [];
    let head: Cap | null = null;
    let tail: Cap | null = null;
    for (let i = 0; i < n; i++) {
      let t = cum[i] / len;
      let x = pts[i * 2];
      let y = pts[i * 2 + 1];
      const prev = Math.max(0, i - 1);
      const next = Math.min(n - 1, i + 1);
      let tx = pts[next * 2] - pts[prev * 2];
      let ty = pts[next * 2 + 1] - pts[prev * 2 + 1];
      let ended = false;
      if (t >= stop) {
        if (i === 0) break;
        const t0 = cum[i - 1] / len;
        const f = clamp((stop - t0) / (t - t0 || 1));
        x = pts[(i - 1) * 2] + (x - pts[(i - 1) * 2]) * f;
        y = pts[(i - 1) * 2 + 1] + (y - pts[(i - 1) * 2 + 1]) * f;
        t = stop;
        ended = true;
      }
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const nx = -ty;
      const ny = tx;
      const H = half * widthAt(t, profile, phase, bumps);
      const late = smooth((t - profile.dryFrom) / (1 - profile.dryFrom));
      const c = (lane.u + lane.spread * late * (2 / count)) * H * (1 + 0.12 * late);
      const fade = clamp((lane.end - t) / 0.07) ** 0.6;
      const dry = dryAt(t, profile);
      const ink = 1 + ((lane.ink - 1) * (1 - dry)) / (1 - profile.dryMin);
      const hw = Math.max((1.4 / count) * H * dry * ink, t < lane.end - 0.02 ? 0.42 : 0) * (live ? 1 : fade);
      left.push(`${r1(x + nx * (c + hw))} ${r1(y + ny * (c + hw))}`);
      right.push(`${r1(x + nx * (c - hw))} ${r1(y + ny * (c - hw))}`);
      if (i === 0) tail = { x, y, nx, ny, c, hw };
      head = { x, y, nx, ny, c, hw };
      if (ended) break;
    }
    if (!head || !tail || left.length < 2) continue;
    d += `M${left[0]}`;
    for (let i = 1; i < left.length; i++) d += `L${left[i]}`;
    if (live) {
      const h = head;
      const cx = h.x + h.nx * h.c;
      const cy = h.y + h.ny * h.c;
      for (let k = 1; k < 6; k++) {
        const a = (k / 6) * Math.PI;
        d += `L${r1(cx + h.nx * h.hw * Math.cos(a) + h.ny * h.hw * Math.sin(a))} ${r1(cy + h.ny * h.hw * Math.cos(a) - h.nx * h.hw * Math.sin(a))}`;
      }
    }
    for (let i = right.length - 1; i >= 0; i--) d += `L${right[i]}`;
    const s = tail;
    const sx = s.x + s.nx * s.c;
    const sy = s.y + s.ny * s.c;
    for (let k = 1; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      d += `L${r1(sx - s.nx * s.hw * Math.cos(a) - s.ny * s.hw * Math.sin(a))} ${r1(sy - s.ny * s.hw * Math.cos(a) + s.nx * s.hw * Math.sin(a))}`;
    }
    d += "Z";
  }
  return d;
}

function build(kind: BrushAnnotationKind, boxes: Box[], m: Metrics, seed: string): Geometry {
  const em = m.em;
  const profile = PROFILES[kind];
  const strokes: Omit<Stroke, "start" | "duration">[] = [];
  const ratio = (b: Box) => b.h / (m.ascent + m.descent || b.h);
  const base = (b: Box) => b.y + m.ascent * ratio(b);

  boxes.forEach((b, i) => {
    const rng = createRng(`${seed}:${kind}:${i}`);
    const yb = base(b);
    const wob = wobbler(rng, em * 0.035);
    if (kind === "underline" || kind === "double") {
      const width = em * WIDTH[kind];
      const x0 = b.x - em * rng.range(0.04, 0.12);
      const x1 = b.x + b.w + em * rng.range(0.3, 0.42);
      const y0 = yb + em * (kind === "double" ? 0.15 : 0.2);
      const rise = em * rng.range(0.03, 0.11);
      strokes.push(makeStroke(line(x0, y0, x1, y0 - rise, em * rng.range(-0.02, 0.05), wob), width, profile, rng));
      if (kind === "double") {
        const wob2 = wobbler(rng, em * 0.035);
        const a = b.x + em * rng.range(0.08, 0.3);
        const z = b.x + b.w + em * rng.range(0.18, 0.3);
        const y1 = y0 + em * 0.24;
        strokes.push(
          makeStroke(
            line(a, y1, z, y1 - em * rng.range(0.02, 0.09), em * rng.range(-0.02, 0.04), wob2),
            width * 0.92,
            profile,
            rng,
          ),
        );
      }
    } else if (kind === "strike") {
      const x0 = b.x - em * rng.range(0.06, 0.14);
      const x1 = b.x + b.w + em * rng.range(0.26, 0.36);
      const y = yb - m.xHeight * 0.52;
      const rise = em * rng.range(0.05, 0.13);
      strokes.push(
        makeStroke(
          line(x0, y + rise * 0.4, x1, y - rise * 0.6, em * rng.range(-0.03, 0.03), wob, 1.1),
          em * WIDTH.strike,
          profile,
          rng,
        ),
      );
    } else if (kind === "highlight") {
      const x0 = b.x - em * rng.range(0.1, 0.18);
      const x1 = b.x + b.w + em * rng.range(0.5, 0.62);
      const y = yb - em * 0.3;
      const rise = em * rng.range(0, 0.06);
      strokes.push(
        makeStroke(
          line(x0, y + rise * 0.5, x1, y - rise * 0.5, em * rng.range(-0.04, 0.03), wobbler(rng, em * 0.03), 1),
          em * WIDTH.highlight,
          profile,
          rng,
        ),
      );
    } else if (kind === "circle") {
      const cx = b.x + b.w / 2 + em * rng.range(-0.06, 0.06);
      const cy = yb - m.capHeight * 0.5 + em * rng.range(-0.03, 0.03);
      const rx = b.w / 2 + em * rng.range(0.26, 0.34);
      const ry = m.capHeight / 2 + em * rng.range(0.4, 0.5);
      const tilt = rng.range(-0.06, 0.04);
      const start = -Math.PI / 2 + rng.range(0.32, 0.55);
      const sweep = TAU + rng.range(0.38, 0.6);
      const grow = rng.range(0.06, 0.11);
      const pts: Pt[] = [];
      const n = 120;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      for (let k = 0; k <= n; k++) {
        const s = k / n;
        const th = start - sweep * s;
        const g = 1 - grow * 0.4 + grow * s + wob(s) / em;
        const ex = rx * g * Math.cos(th);
        const ey = ry * g * Math.sin(th);
        pts.push([cx + ex * ct - ey * st, cy + ex * st + ey * ct]);
      }
      strokes.push(makeStroke(pts, em * WIDTH.circle, profile, rng));
    } else if (kind === "bracket") {
      const top = yb - m.capHeight - em * rng.range(0.24, 0.32);
      const bottom = yb + em * rng.range(0.24, 0.32);
      const serif = em * rng.range(0.32, 0.4);
      const radius = em * 0.1;
      const width = em * WIDTH.bracket;
      if (i === 0) {
        const xl = b.x - em * rng.range(0.16, 0.22);
        const pts: Pt[] = [
          [xl + serif, top + em * rng.range(-0.02, 0.03)],
          [xl, top + em * 0.02],
          [xl - em * rng.range(0, 0.04), bottom],
          [xl + serif * rng.range(0.86, 1), bottom + em * rng.range(0, 0.04)],
        ];
        strokes.push(makeStroke(cornered(pts, radius, wobbler(rng, em * 0.02)), width, profile, rng, corners(pts)));
      }
      if (i === boxes.length - 1) {
        const xr = b.x + b.w + em * rng.range(0.16, 0.22);
        const pts: Pt[] = [
          [xr - serif, top + em * rng.range(-0.02, 0.03)],
          [xr, top + em * 0.03],
          [xr + em * rng.range(0, 0.04), bottom],
          [xr - serif * rng.range(0.86, 1), bottom + em * rng.range(0, 0.04)],
        ];
        strokes.push(makeStroke(cornered(pts, radius, wobbler(rng, em * 0.02)), width, profile, rng, corners(pts)));
      }
    }
  });

  let clock = 0;
  const timed: Stroke[] = strokes.map((s) => {
    const duration = clamp(170 + s.len * (kind === "highlight" ? 1.5 : 1.75), 260, 900);
    const out = { ...s, start: clock, duration };
    clock += duration + GAP;
    return out;
  });
  return { strokes: timed, total: Math.max(0, clock - GAP) };
}

const pace = (t: number) => {
  const x = clamp(t);
  return 0.62 * (0.5 - 0.5 * Math.cos(Math.PI * x)) + 0.38 * easeOut(x);
};

type Status = "idle" | "drawing" | "done";

export function BrushAnnotation({
  kind = "underline",
  color = "var(--primary)",
  show,
  delay = 0,
  children,
  className,
  ref,
  ...props
}: BrushAnnotationProps) {
  const id = useId();
  const reduce = useReducedMotion() === true;
  const contentRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const geometryRef = useRef<Geometry | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [seen, setSeen] = useState(false);
  const wanted = show ?? seen;
  const [lastWanted, setLastWanted] = useState(wanted);
  if (lastWanted !== wanted) {
    setLastWanted(wanted);
    if (!wanted) setStatus("idle");
  }
  const phase = !wanted
    ? "hidden"
    : reduce || status === "done"
      ? "shown"
      : status === "drawing"
        ? "drawing"
        : "hidden";

  const measure = useCallback(() => {
    const content = contentRef.current;
    const svg = svgRef.current;
    if (!content || !svg) return;
    const origin = svg.getBoundingClientRect();
    const scale = origin.width > 0 ? origin.width : 1;
    const boxes = lineBoxes(content, origin, scale);
    const next = boxes.length ? build(kind, boxes, fontMetrics(content), id) : null;
    geometryRef.current = next;
    setGeometry(next);
  }, [kind, id]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(blockAncestor(content));
    window.addEventListener("resize", schedule);
    let alive = true;
    document.fonts?.ready.then(() => alive && schedule());
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [measure]);

  useEffect(() => {
    if (show !== undefined || seen) return;
    const content = contentRef.current;
    if (!content) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, [show, seen]);

  useEffect(() => {
    if (!wanted || reduce) return;
    let timer = 0;
    let frame = 0;
    let begin = -1;
    const tick = (now: number) => {
      const geo = geometryRef.current;
      if (begin < 0) begin = now;
      const elapsed = now - begin;
      if (!geo) {
        frame = requestAnimationFrame(tick);
        return;
      }
      geo.strokes.forEach((s, i) => {
        const el = pathRefs.current[i];
        if (el) el.setAttribute("d", strokePath(s, pace((elapsed - s.start) / s.duration)));
      });
      if (elapsed >= geo.total) setStatus("done");
      else frame = requestAnimationFrame(tick);
    };
    timer = window.setTimeout(() => {
      pathRefs.current.forEach((el) => el?.setAttribute("d", ""));
      setStatus("drawing");
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [wanted, reduce, delay]);

  const highlight = kind === "highlight";
  const Tag = (highlight ? "mark" : kind === "strike" ? "s" : "span") as "span";
  const strokes = geometry?.strokes ?? [];

  return (
    <span ref={ref} {...props} className={cn("relative", highlight && "isolate", className)}>
      <Tag ref={contentRef as Ref<HTMLSpanElement>} className="bg-transparent [color:inherit] no-underline">
        {children}
      </Tag>
      <svg
        ref={svgRef}
        aria-hidden="true"
        width={1}
        height={1}
        className={cn(
          "pointer-events-none absolute top-0 left-0 overflow-visible transition-opacity ease-out",
          highlight ? "-z-10" : "mix-blend-multiply dark:mix-blend-normal",
          phase === "hidden" ? "opacity-0 duration-150" : "opacity-100 duration-0",
        )}
      >
        <g
          style={{ fill: color }}
          opacity={highlight ? undefined : 0.9}
          className={highlight ? "opacity-25 dark:opacity-30" : undefined}
        >
          {strokes.map((s, i) => (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={phase === "drawing" ? undefined : strokePath(s, 1)}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
