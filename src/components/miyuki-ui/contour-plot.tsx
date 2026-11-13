"use client";

import { scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartMotion,
  formatNumber,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface ContourPlotFrame {
  width: number;
  height: number;
  x: (value: number) => number;
  y: (value: number) => number;
}

export interface ContourPlotProps extends Omit<ChartCardProps, "children"> {
  values: number[][];
  levels?: number | number[];
  indexEvery?: number;
  unit?: string;
  name?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  format?: (value: number) => string;
  formatLevel?: (value: number) => string;
  colors?: [low: string, high: string];
  extremes?: boolean;
  height?: number;
  underlay?: (frame: ContourPlotFrame) => ReactNode;
  summary?: string;
}

type Point = [number, number];

interface Line {
  level: number;
  points: Point[];
  closed: boolean;
}

interface Extreme {
  kind: "high" | "low";
  x: number;
  y: number;
  value: number;
}

interface Label {
  level: number;
  index: boolean;
  x: number;
  y: number;
  angle: number;
  width: number;
}

const CELL = 3.5;
const AXIS_BOTTOM = 22;
const TOP = 4;
const RIGHT = 2;
const LABEL_SIZE = 10;
const LABEL_HEIGHT = 11;
const MARK_CLEAR = 24;

const plainLevel = (v: number) => String(Number(v.toFixed(2))).replace("-", "−");

function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

function sampler(values: number[][]) {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const get = (c: number, r: number) =>
    values[Math.max(0, Math.min(rows - 1, r))]?.[Math.max(0, Math.min(cols - 1, c))] ?? 0;
  return (gx: number, gy: number) => {
    const c = Math.max(0, Math.min(cols - 2, Math.floor(gx)));
    const r = Math.max(0, Math.min(rows - 2, Math.floor(gy)));
    const tx = gx - c;
    const ty = gy - r;
    const row = (m: number) => cubic(get(c - 1, r + m), get(c, r + m), get(c + 1, r + m), get(c + 2, r + m), tx);
    return cubic(row(-1), row(0), row(1), row(2), ty);
  };
}

function trace(
  fw: number,
  fh: number,
  val: (i: number, j: number) => number,
  t: number,
  X: (i: number) => number,
  Y: (j: number) => number,
  padded: boolean,
): { points: Point[]; closed: boolean }[] {
  const stride = fw + 2;
  const hKey = (i: number, j: number) => ((j + 1) * stride + (i + 1)) * 2;
  const vKey = (i: number, j: number) => ((j + 1) * stride + (i + 1)) * 2 + 1;
  const at = new Map<number, Point>();
  const links = new Map<number, number[]>();

  const place = (key: number, ia: number, ja: number, ib: number, jb: number) => {
    if (at.has(key)) return;
    const va = val(ia, ja);
    const vb = val(ib, jb);
    let f: number;
    if (!Number.isFinite(va)) f = 1;
    else if (!Number.isFinite(vb)) f = 0;
    else f = vb === va ? 0.5 : (t - va) / (vb - va);
    f = Math.max(0, Math.min(1, f));
    at.set(key, [X(ia) + (X(ib) - X(ia)) * f, Y(ja) + (Y(jb) - Y(ja)) * f]);
  };
  const link = (a: number, b: number) => {
    const la = links.get(a);
    if (la) la.push(b);
    else links.set(a, [b]);
    const lb = links.get(b);
    if (lb) lb.push(a);
    else links.set(b, [a]);
  };

  const lo = padded ? -1 : 0;
  const hiI = padded ? fw : fw - 1;
  const hiJ = padded ? fh : fh - 1;
  for (let j = lo; j < hiJ; j++) {
    for (let i = lo; i < hiI; i++) {
      const a = val(i, j);
      const b = val(i + 1, j);
      const c = val(i + 1, j + 1);
      const d = val(i, j + 1);
      const code = (a >= t ? 8 : 0) | (b >= t ? 4 : 0) | (c >= t ? 2 : 0) | (d >= t ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const T = hKey(i, j);
      const R = vKey(i + 1, j);
      const B = hKey(i, j + 1);
      const L = vKey(i, j);
      const edge = (key: number) => {
        if (key === T) place(T, i, j, i + 1, j);
        else if (key === R) place(R, i + 1, j, i + 1, j + 1);
        else if (key === B) place(B, i, j + 1, i + 1, j + 1);
        else place(L, i, j, i, j + 1);
        return key;
      };
      const seg = (p: number, q: number) => link(edge(p), edge(q));
      const centre = (a + b + c + d) / 4 >= t;
      switch (code) {
        case 1:
          seg(L, B);
          break;
        case 2:
          seg(B, R);
          break;
        case 3:
          seg(L, R);
          break;
        case 4:
          seg(T, R);
          break;
        case 5:
          if (centre) {
            seg(T, L);
            seg(B, R);
          } else {
            seg(T, R);
            seg(L, B);
          }
          break;
        case 6:
          seg(T, B);
          break;
        case 7:
          seg(T, L);
          break;
        case 8:
          seg(T, L);
          break;
        case 9:
          seg(T, B);
          break;
        case 10:
          if (centre) {
            seg(T, R);
            seg(L, B);
          } else {
            seg(T, L);
            seg(B, R);
          }
          break;
        case 11:
          seg(T, R);
          break;
        case 12:
          seg(L, R);
          break;
        case 13:
          seg(R, B);
          break;
        case 14:
          seg(L, B);
          break;
      }
    }
  }

  const seen = new Set<number>();
  const out: { points: Point[]; closed: boolean }[] = [];
  const walk = (start: number) => {
    const keys = [start];
    seen.add(start);
    let prev = -1;
    let cur = start;
    for (;;) {
      const next = (links.get(cur) ?? []).find((k) => k !== prev && !seen.has(k));
      if (next == null) break;
      seen.add(next);
      keys.push(next);
      prev = cur;
      cur = next;
    }
    const closed = keys.length > 2 && (links.get(cur) ?? []).includes(start);
    out.push({ points: keys.map((k) => at.get(k) as Point), closed });
  };
  for (const [key, l] of links) if (l.length === 1 && !seen.has(key)) walk(key);
  for (const key of links.keys()) if (!seen.has(key)) walk(key);
  return out;
}

function ringsPath(rings: { points: Point[] }[]): string {
  let d = "";
  for (const { points } of rings) {
    if (points.length < 3) continue;
    d += `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    for (let k = 1; k < points.length; k++) d += `L${points[k][0].toFixed(1)},${points[k][1].toFixed(1)}`;
    d += "Z";
  }
  return d;
}

function linePath({ points, closed }: { points: Point[]; closed: boolean }): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let k = 1; k < points.length; k++) d += `L${points[k][0].toFixed(1)},${points[k][1].toFixed(1)}`;
  return closed ? `${d}Z` : d;
}

function corners(l: { x: number; y: number; angle: number; width: number }, pad: number): Point[] {
  const c = Math.cos(l.angle);
  const s = Math.sin(l.angle);
  const hw = l.width / 2 + pad;
  const hh = LABEL_HEIGHT / 2 + pad;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([u, v]) => [l.x + u * c - v * s, l.y + u * s + v * c] as Point);
}

function overlaps(a: Point[], b: Point[]): boolean {
  for (const poly of [a, b]) {
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k];
      const q = poly[(k + 1) % poly.length];
      const ax = q[1] - p[1];
      const ay = p[0] - q[0];
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const r of a) {
        const v = r[0] * ax + r[1] * ay;
        minA = Math.min(minA, v);
        maxA = Math.max(maxA, v);
      }
      for (const r of b) {
        const v = r[0] * ax + r[1] * ay;
        minB = Math.min(minB, v);
        maxB = Math.max(maxB, v);
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}

function niceStep(span: number, target: number): number {
  const raw = Math.max(span, 1e-9) / target;
  const exp = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 4, 5, 10]) if (m * exp >= raw) return m * exp;
  return 10 * exp;
}

export function ContourPlot({
  values,
  levels,
  indexEvery = 4,
  unit = "",
  name,
  xDomain,
  yDomain,
  formatX,
  formatY,
  format,
  formatLevel = plainLevel,
  colors = ["color-mix(in oklab, var(--brand) 3%, var(--card))", "color-mix(in oklab, var(--brand) 46%, var(--card))"],
  extremes = true,
  height = 260,
  underlay,
  summary,
  footer,
  label,
  ...props
}: ContourPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const reduce = useReducedMotion();
  const id = useChartId("contour");
  const [pointer, setPointer] = useState<Point | null>(null);

  const valueName = name ?? (typeof label === "string" ? label : "Value");
  const fmt = format ?? ((v: number) => `${formatNumber(v, 1)}${unit ? ` ${unit}` : ""}`);
  const rows = values.length;
  const cols = values[0]?.length ?? 0;

  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of values)
      for (const v of row)
        if (Number.isFinite(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1;
    }
    const step = Array.isArray(levels) ? 0 : (levels ?? niceStep(max - min, 12));
    const list = Array.isArray(levels)
      ? levels.slice().sort((a, b) => a - b)
      : (() => {
          const out: number[] = [];
          for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
          return out;
        })();
    const heavy = list.map((v, k) => (step ? Math.round(v / step) % indexEvery === 0 : k % indexEvery === 0));
    return { min, max, step, list, heavy };
  }, [values, levels, indexEvery]);

  const yTickW = (() => {
    if (!yDomain || !formatY) return 0;
    const ticks = scaleLinear().domain(yDomain).ticks(4);
    return ticks.reduce((w, t) => Math.max(w, textWidth(formatY(t))), 0) + 8;
  })();
  const left = yTickW;
  const frameW = Math.max(0, width - left - RIGHT);
  const bottom = xDomain && formatX ? AXIS_BOTTOM : 6;
  const frameH = Math.max(0, height - TOP - bottom);

  const field = useMemo(() => sampler(values), [values]);

  const geometry = useMemo(() => {
    if (frameW <= 0 || frameH <= 0 || rows < 2 || cols < 2) return null;
    const fw = Math.max(2, Math.round(frameW / CELL) + 1);
    const fh = Math.max(2, Math.round(frameH / CELL) + 1);
    const grid = new Float64Array(fw * fh);
    for (let j = 0; j < fh; j++) {
      for (let i = 0; i < fw; i++) {
        grid[j * fw + i] = field((i / (fw - 1)) * (cols - 1), (j / (fh - 1)) * (rows - 1));
      }
    }
    const X = (i: number) => (i / (fw - 1)) * frameW;
    const Y = (j: number) => (j / (fh - 1)) * frameH;
    const inner = (i: number, j: number) => grid[j * fw + i];
    const padded = (i: number, j: number) => (i < 0 || j < 0 || i >= fw || j >= fh ? -Infinity : grid[j * fw + i]);
    const fills = stats.list.map((t) => ringsPath(trace(fw, fh, padded, t, X, Y, true)));
    const lines: Line[][] = stats.list.map((t) =>
      trace(fw, fh, inner, t, X, Y, false)
        .filter((l) => l.points.length > 1)
        .map((l) => ({ level: t, points: l.points, closed: l.closed })),
    );
    return { fw, fh, grid, fills, lines };
  }, [frameW, frameH, rows, cols, field, stats]);

  const toPx = (gx: number, gy: number): Point => [(gx / (cols - 1)) * frameW, (gy / (rows - 1)) * frameH];
  const toGrid = (px: number, py: number): Point => [
    Math.max(0, Math.min(cols - 1, (px / Math.max(1, frameW)) * (cols - 1))),
    Math.max(0, Math.min(rows - 1, (py / Math.max(1, frameH)) * (rows - 1))),
  ];

  const candidates = useMemo(() => {
    if (!extremes || rows < 5 || cols < 5) return [] as Extreme[];
    const radius = Math.max(2, Math.round(Math.min(rows, cols) / 9));
    const found: Extreme[] = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const v = values[r][c];
        let isMax = true;
        let isMin = true;
        for (let dr = -radius; dr <= radius && (isMax || isMin); dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            if (!dr && !dc) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
            const w = values[rr][cc];
            const earlier = dr < 0 || (dr === 0 && dc < 0);
            if (w > v || (w === v && earlier)) isMax = false;
            if (w < v || (w === v && earlier)) isMin = false;
          }
        }
        if (!isMax && !isMin) continue;
        const sign = isMax ? 1 : -1;
        let bx = c;
        let by = r;
        let best = v * sign;
        for (const span of [1, 0.25, 0.0625]) {
          const cx = bx;
          const cy = by;
          for (let k = -4; k <= 4; k++) {
            for (let m = -4; m <= 4; m++) {
              const gx = Math.max(0, Math.min(cols - 1, cx + (k / 4) * span));
              const gy = Math.max(0, Math.min(rows - 1, cy + (m / 4) * span));
              const f = field(gx, gy) * sign;
              if (f > best) {
                best = f;
                bx = gx;
                by = gy;
              }
            }
          }
        }
        found.push({ kind: isMax ? "high" : "low", x: bx, y: by, value: best * sign });
      }
    }
    return found;
  }, [extremes, values, rows, cols, field]);

  const marks = useMemo(() => {
    if (!geometry || candidates.length === 0) return [] as Extreme[];
    const px = candidates.map((m) => [(m.x / (cols - 1)) * frameW, (m.y / (rows - 1)) * frameH] as Point);
    const encloses = (ring: Point[], [x, y]: Point) => {
      let inside = false;
      for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
        const [xa, ya] = ring[a];
        const [xb, yb] = ring[b];
        if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
      }
      return inside;
    };
    const rings = geometry.lines.flat().filter((l) => l.closed);
    const kept = candidates.filter((m, k) =>
      rings.some(
        (ring) =>
          (m.kind === "high" ? ring.level < m.value : ring.level > m.value) &&
          encloses(ring.points, px[k]) &&
          !candidates.some((o, q) => q !== k && o.kind === m.kind && encloses(ring.points, px[q])),
      ),
    );
    const highs = candidates.filter((m) => m.kind === "high");
    const lows = candidates.filter((m) => m.kind === "low");
    const top = highs.reduce<Extreme | null>((b, m) => (!b || m.value > b.value ? m : b), null);
    const bottom = lows.reduce<Extreme | null>((b, m) => (!b || m.value < b.value ? m : b), null);
    for (const g of [top, bottom]) if (g && !kept.includes(g)) kept.push(g);
    return kept;
  }, [geometry, candidates, rows, cols, frameW, frameH]);

  const labels = useMemo(() => {
    if (!geometry) return [] as Label[];
    const { fw, fh, grid } = geometry;
    const at = (px: number, py: number) => {
      const fx = Math.max(0, Math.min(fw - 1.001, (px / frameW) * (fw - 1)));
      const fy = Math.max(0, Math.min(fh - 1.001, (py / frameH) * (fh - 1)));
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const tx = fx - i;
      const ty = fy - j;
      const v00 = grid[j * fw + i];
      const v10 = grid[j * fw + i + 1];
      const v01 = grid[(j + 1) * fw + i];
      const v11 = grid[(j + 1) * fw + i + 1];
      return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
    };
    const step = stats.step || (stats.max - stats.min) / Math.max(1, stats.list.length);
    const placed: Label[] = [];
    const boxes: Point[][] = [];
    const markPx = marks.map((m) => [(m.x / (cols - 1)) * frameW, (m.y / (rows - 1)) * frameH]);
    const candidates = geometry.lines
      .flatMap((group, k) => group.map((line) => ({ line, heavy: stats.heavy[k], k })))
      .map((entry) => {
        const pts = entry.line.points;
        const cum = [0];
        for (let p = 1; p < pts.length; p++)
          cum.push(cum[p - 1] + Math.hypot(pts[p][0] - pts[p - 1][0], pts[p][1] - pts[p - 1][1]));
        return { ...entry, cum, length: cum[cum.length - 1] };
      })
      .sort((a, b) => Number(b.heavy) - Number(a.heavy) || b.length - a.length);

    for (const { line, heavy, cum, length } of candidates) {
      const text = formatLevel(line.level);
      const w = textWidth(text, LABEL_SIZE) + 4;
      const half = w / 2 + 3;
      if (length < w + 30) continue;
      const pts = line.points;
      const pointAt = (s: number): Point => {
        let lo = 0;
        let hi = cum.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] < s) lo = mid;
          else hi = mid;
        }
        const seg = cum[hi] - cum[lo] || 1;
        const t = (s - cum[lo]) / seg;
        return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
      };
      const options: { s: number; x: number; y: number; angle: number; score: number }[] = [];
      for (let s = half + 2; s <= length - half - 2; s += 5) {
        const a = pointAt(s - half);
        const b = pointAt(s + half);
        const [x, y] = pointAt(s);
        if (x < half + 4 || x > frameW - half - 4 || y < 9 || y > frameH - 9) continue;
        const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (chord < half * 1.8) continue;
        let bend = 0;
        for (let p = 0; p < pts.length; p++) {
          if (cum[p] <= s - half || cum[p] >= s + half) continue;
          const dist = Math.abs((b[0] - a[0]) * (a[1] - pts[p][1]) - (a[0] - pts[p][0]) * (b[1] - a[1])) / chord;
          bend = Math.max(bend, dist);
        }
        if (bend > 1.6) continue;
        const gx = (at(x + 2, y) - at(x - 2, y)) / 4;
        const gy = (at(x, y + 2) - at(x, y - 2)) / 4;
        const spacing = step / Math.max(1e-9, Math.hypot(gx, gy));
        if (spacing < 11.5) continue;
        if (markPx.some(([mx, my]) => Math.hypot(mx - x, my - y) < MARK_CLEAR + half)) continue;
        let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;
        const centred = 1 - Math.abs(s / length - 0.5) * 2;
        const margin = Math.min(x, frameW - x, y, frameH - y);
        options.push({
          s,
          x,
          y,
          angle,
          score: centred * 2 + Math.min(1, margin / 60) - bend + Math.min(1.5, spacing / 40),
        });
      }
      options.sort((p, q) => q.score - p.score);
      const cap = heavy ? 1 + Math.floor(length / 300) : length > 420 ? 2 : 1;
      const taken: number[] = [];
      for (const o of options) {
        if (taken.length >= cap) break;
        if (taken.some((s) => Math.abs(s - o.s) < 200)) continue;
        const lbl: Label = { level: line.level, index: heavy, x: o.x, y: o.y, angle: o.angle, width: w };
        const box = corners(lbl, 4);
        if (boxes.some((other) => overlaps(box, other))) continue;
        placed.push(lbl);
        boxes.push(box);
        taken.push(o.s);
      }
    }
    return placed;
  }, [geometry, stats, marks, formatLevel, frameW, frameH, rows, cols]);

  const nodeOf = (px: number, py: number) => {
    const [gx, gy] = toGrid(px, py);
    return Math.round(gy) * cols + Math.round(gx);
  };
  const peakIndex = (() => {
    let best = 0;
    values.forEach((row, r) =>
      row.forEach((v, c) => {
        const b = values[Math.floor(best / cols)]?.[best % cols] ?? -Infinity;
        if (v > b) best = r * cols + c;
      }),
    );
    return best;
  })();

  const { active, setActive, bind } = useNearestIndex({
    count: rows * cols,
    columns: cols,
    focusIndex: peakIndex,
    locate: (px, py) => (frameW > 0 ? nodeOf(px - left, py - TOP) : null),
  });

  const local = (event: PointerEvent<HTMLElement>): Point => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    const sy = rect.height > 0 ? el.offsetHeight / rect.height : 1;
    return [(event.clientX - rect.left) * sx - left, (event.clientY - rect.top) * sy - TOP];
  };
  const inside = ([px, py]: Point) => px >= 0 && py >= 0 && px <= frameW && py <= frameH;

  const handlers = {
    ...bind,
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const p = local(event);
      if (inside(p)) {
        setPointer(p);
        bind.onPointerMove(event);
      } else {
        setPointer(null);
        setActive(null);
      }
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const p = local(event);
      setPointer(inside(p) ? p : null);
      bind.onPointerDown(event);
    },
    onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") setPointer(null);
      bind.onPointerLeave(event);
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      setPointer(null);
      bind.onKeyDown(event);
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      setPointer(null);
      bind.onBlur(event);
    },
  };

  const reading: Point | null = pointer ?? (active != null ? toPx(active % cols, Math.floor(active / cols)) : null);
  const readValue = reading ? field(...toGrid(reading[0], reading[1])) : null;
  const nearestLevel =
    readValue != null && stats.list.length
      ? stats.list.reduce((best, v) => (Math.abs(v - readValue) < Math.abs(best - readValue) ? v : best), stats.list[0])
      : null;
  const nearestK = nearestLevel != null ? stats.list.indexOf(nearestLevel) : -1;

  const xs = xDomain
    ? scaleLinear()
        .domain([0, cols - 1])
        .range(xDomain)
    : null;
  const ys = yDomain
    ? scaleLinear()
        .domain([0, rows - 1])
        .range(yDomain)
    : null;
  const xFrame = scaleLinear()
    .domain(xDomain ?? [0, cols - 1])
    .range([0, frameW]);
  const yFrame = scaleLinear()
    .domain(yDomain ?? [0, rows - 1])
    .range([0, frameH]);
  const where = (gx: number, gy: number) =>
    xs && ys && formatX && formatY
      ? `${formatY(ys(gy))}, ${formatX(xs(gx))}`
      : `Column ${Math.round(gx) + 1}, row ${Math.round(gy) + 1}`;

  const bands = stats.list.length + 1;
  const bandColor = (k: number) =>
    `color-mix(in oklab, ${colors[1]} ${Math.round((k / Math.max(1, bands - 1)) * 100)}%, ${colors[0]})`;

  const description = (() => {
    if (summary) return summary;
    if (rows < 2 || cols < 2) return "No data.";
    const highs = marks.filter((m) => m.kind === "high").sort((a, b) => b.value - a.value);
    const lows = marks.filter((m) => m.kind === "low").sort((a, b) => a.value - b.value);
    const list = (ms: Extreme[], word: string) =>
      ms.length ? `${word} ${ms.map((m) => `${fmt(m.value)} at ${where(m.x, m.y)}`).join("; ")}.` : "";
    return [
      `${valueName} from ${fmt(Math.min(stats.min, ...lows.map((m) => m.value)))} to ${fmt(Math.max(stats.max, ...highs.map((m) => m.value)))}, drawn as ${stats.list.length} contour lines` +
        (stats.step ? ` every ${formatNumber(stats.step, stats.step % 1 ? 1 : 0)}${unit ? ` ${unit}` : ""}.` : "."),
      list(highs, highs.length > 1 ? "Highs" : "High"),
      list(lows, lows.length > 1 ? "Lows" : "Low"),
    ]
      .filter(Boolean)
      .join(" ");
  })();

  const tableStep = Math.max(1, Math.ceil(Math.max(rows, cols) / 12));
  const tableRows = Array.from({ length: Math.ceil(rows / tableStep) }, (_, k) => k * tableStep);
  const tableCols = Array.from({ length: Math.ceil(cols / tableStep) }, (_, k) => k * tableStep);

  const legend = (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <p className="text-[13px] leading-5 text-muted-foreground">
        {stats.step
          ? `Lines every ${formatNumber(stats.step, stats.step % 1 ? 1 : 0)}${unit ? ` ${unit}` : ""}, heavier every ${formatNumber(stats.step * indexEvery, stats.step % 1 ? 1 : 0)}`
          : `${stats.list.length} lines, every ${indexEvery}th heavier`}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-1">
        <div className="flex h-2 overflow-hidden rounded-full">
          {Array.from({ length: bands }, (_, k) => (
            <span key={k} className="h-full w-2.5" style={{ background: bandColor(k) }} />
          ))}
        </div>
        <div className="flex justify-between gap-6 text-[11px] leading-none text-muted-foreground tabular-nums">
          <span>{formatLevel(stats.list[0] ?? stats.min)}</span>
          <span>{formatLevel(stats.list[stats.list.length - 1] ?? stats.max)}</span>
        </div>
      </div>
    </div>
  );

  const xTicks =
    xDomain && formatX
      ? scaleLinear()
          .domain(xDomain)
          .range([0, frameW])
          .ticks(frameW < 320 ? 3 : 5)
      : [];
  const yTicks = yDomain && formatY ? scaleLinear().domain(yDomain).ticks(4) : [];
  const play = inView || !!reduce;

  return (
    <ChartCard label={label} {...props} footer={footer ?? legend}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...handlers}>
        {width > 0 && geometry && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <clipPath id={`${id}-frame`}>
                <rect x={0} y={0} width={frameW} height={frameH} rx={8} />
              </clipPath>
              <mask id={`${id}-gaps`} maskUnits="userSpaceOnUse" x={-4} y={-4} width={frameW + 8} height={frameH + 8}>
                <rect x={-4} y={-4} width={frameW + 8} height={frameH + 8} fill="white" />
                {labels.map((l, k) => (
                  <rect
                    key={k}
                    x={-l.width / 2 - 2}
                    y={-LABEL_HEIGHT / 2 - 1}
                    width={l.width + 4}
                    height={LABEL_HEIGHT + 2}
                    rx={3}
                    fill="black"
                    transform={`translate(${l.x} ${l.y}) rotate(${(l.angle * 180) / Math.PI})`}
                  />
                ))}
                {marks.map((m, k) => {
                  const [mx, my] = toPx(m.x, m.y);
                  const w = textWidth(formatLevel(Math.round(m.value)), 10) + 4;
                  return (
                    <g key={`m${k}`} fill="black">
                      <rect x={mx - 8} y={my - 9} width={16} height={18} rx={4} />
                      <rect x={mx - w / 2} y={my + 9} width={w} height={11} rx={3} />
                    </g>
                  );
                })}
              </mask>
            </defs>
            <g
              aria-hidden="true"
              className="fill-muted-foreground"
              style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
            >
              {yTicks.map((t) => (
                <text key={t} x={left - 8} y={TOP + yFrame(t)} dy="0.34em" textAnchor="end">
                  {formatY?.(t)}
                </text>
              ))}
              {xTicks.map((t) => (
                <text key={t} x={left + xFrame(t)} y={TOP + frameH + 17} textAnchor="middle">
                  {formatX?.(t)}
                </text>
              ))}
            </g>
            <g transform={`translate(${left} ${TOP})`}>
              <g clipPath={`url(#${id}-frame)`}>
                <rect width={frameW} height={frameH} style={{ fill: bandColor(0) }} />
                {geometry.fills.map((d, k) => (
                  <motion.path
                    key={k}
                    d={d}
                    fillRule="evenodd"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: play ? 1 : 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.5, ease: chartMotion.reveal.ease, delay: k * (0.5 / Math.max(1, bands)) }
                    }
                    style={{ fill: bandColor(k + 1) }}
                  />
                ))}
                {underlay?.({ width: frameW, height: frameH, x: xFrame, y: yFrame })}
                <g mask={`url(#${id}-gaps)`} fill="none" strokeLinejoin="round" strokeLinecap="round">
                  {geometry.lines.map((group, k) =>
                    group.map((l, m) => (
                      <motion.path
                        key={`${k}-${m}`}
                        d={linePath(l)}
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: play ? 1 : 0 }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { duration: 1.2, ease: chartMotion.reveal.ease, delay: 0.25 + k * 0.02 }
                        }
                        strokeWidth={stats.heavy[k] ? 1.4 : 0.8}
                        className={cn(
                          "transition-[stroke] duration-200 ease-settle",
                          stats.heavy[k] ? "stroke-foreground/60" : "stroke-foreground/30",
                        )}
                      />
                    )),
                  )}
                  {nearestK >= 0 &&
                    geometry.lines[nearestK].map((l, m) => (
                      <path
                        key={`hl${m}`}
                        d={linePath(l)}
                        strokeWidth={2}
                        className="pointer-events-none stroke-brand-strong"
                      />
                    ))}
                </g>
              </g>
              <rect
                width={frameW}
                height={frameH}
                rx={8}
                fill="none"
                className="stroke-border"
                shapeRendering="geometricPrecision"
              />
              <motion.g
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: play ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 1.1 }}
                textAnchor="middle"
              >
                {labels.map((l, k) => (
                  <text
                    key={k}
                    dy="0.35em"
                    transform={`translate(${l.x} ${l.y}) rotate(${(l.angle * 180) / Math.PI})`}
                    className={cn(
                      l.level === nearestLevel
                        ? "fill-brand-strong font-semibold"
                        : l.index
                          ? "fill-foreground font-medium"
                          : "fill-muted-foreground",
                    )}
                    style={{ fontSize: LABEL_SIZE, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatLevel(l.level)}
                  </text>
                ))}
                {marks.map((m, k) => {
                  const [mx, my] = toPx(m.x, m.y);
                  return (
                    <g key={k} transform={`translate(${mx} ${my})`}>
                      <text
                        dy="0.36em"
                        className={m.kind === "high" ? "fill-brand-strong" : "fill-destructive-strong"}
                        style={{ fontSize: 17, fontWeight: 650 }}
                      >
                        {m.kind === "high" ? "H" : "L"}
                      </text>
                      <text
                        y={14}
                        dy="0.36em"
                        className="fill-foreground"
                        style={{ fontSize: 10, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatLevel(Math.round(m.value))}
                      </text>
                    </g>
                  );
                })}
              </motion.g>
              {reading && (
                <g
                  aria-hidden="true"
                  className="pointer-events-none"
                  style={{ transform: `translate(${reading[0]}px, ${reading[1]}px)` }}
                >
                  <circle r={7} className="fill-foreground/10" />
                  <circle r={3.5} strokeWidth={2} className="fill-foreground stroke-card" />
                </g>
              )}
            </g>
          </svg>
        )}
        {width > 0 && reading && readValue != null && (
          <ChartTooltip
            x={left + reading[0]}
            y={TOP + reading[1]}
            offset={14}
            title={where(...toGrid(reading[0], reading[1]))}
            items={[{ label: valueName, value: fmt(readValue) }]}
          />
        )}
      </ChartPlot>
      <ChartTable
        caption={`${typeof label === "string" ? label : valueName}, every ${tableStep === 1 ? "" : `${tableStep}th `}grid point`}
        columns={["", ...tableCols.map((c) => (xs && formatX ? formatX(xs(c)) : `Column ${c + 1}`))]}
        rows={tableRows.map((r) => [
          ys && formatY ? formatY(ys(r)) : `Row ${r + 1}`,
          ...tableCols.map((c) => fmt(values[r][c])),
        ])}
      />
    </ChartCard>
  );
}
