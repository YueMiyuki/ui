"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type FocusEvent, type PointerEvent, useEffect, useRef } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface KintsugiCardProps extends ComponentProps<"div"> {
  seed?: number | string;
  cracks?: number;
  color?: string;
}

type Point = [number, number];

interface Line {
  pts: Point[];
  w: number[];
}

interface Network {
  x: Float32Array;
  y: Float32Array;
  ea: Int32Array;
  eb: Int32Array;
  len: Float32Array;
  width: Float32Array;
  adj: number[][];
  comp: Int32Array;
  hair: Path2D;
}

interface Handle {
  activate: (x: number, y: number) => void;
  deactivate: () => void;
}

const POUR = 230;
const RUSH = 60;
const SHIMMER = 52;
const BAND = 340;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function turn(to: number, from: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function cross(a: Point, b: Point, c: Point, d: Point): [number, number] | null {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
  return [t, u];
}

function walk(rng: Rng, from: Point, heading: number, W: number, H: number, opts: { to?: Point; length?: number }) {
  const pts: Point[] = [from];
  let [x, y] = from;
  let th = heading;
  let travelled = 0;
  for (let i = 0; i < 400; i++) {
    const step = rng.range(7, 15);
    if (opts.to) {
      const dx = opts.to[0] - x;
      const dy = opts.to[1] - y;
      if (Math.hypot(dx, dy) <= step * 1.3) {
        pts.push(opts.to);
        break;
      }
      th += turn(Math.atan2(dy, dx), th) * 0.26 + rng.range(-0.42, 0.42);
    } else {
      th += rng.range(-0.38, 0.38);
      if (travelled >= (opts.length ?? 0)) break;
    }
    x += Math.cos(th) * step;
    y += Math.sin(th) * step;
    travelled += step;
    const out = x <= 0 || y <= 0 || x >= W || y >= H;
    x = clamp(x, 0, W);
    y = clamp(y, 0, H);
    pts.push([x, y]);
    if (out && !opts.to) break;
  }
  return pts;
}

function edgePoint(rng: Rng, side: number, W: number, H: number): Point {
  const t = rng.range(0.1, 0.9);
  if (side === 0) return [t * W, 0];
  if (side === 1) return [W, t * H];
  if (side === 2) return [t * W, H];
  return [0, t * H];
}

function build(seed: number | string, count: number, W: number, H: number): Network {
  const rng = createRng(`kintsugi-${seed}`);
  const lines: Line[] = [];
  const short = Math.min(W, H);

  for (let i = 0; i < count; i++) {
    let s: Point = [0, 0];
    let e: Point = [W, H];
    for (let tries = 0; tries < 16; tries++) {
      const a = rng.int(0, 3);
      const b = rng() < 0.55 ? (a + 2) % 4 : (a + rng.pick([1, 3])) % 4;
      s = edgePoint(rng, a, W, H);
      e = edgePoint(rng, b, W, H);
      if (Math.hypot(e[0] - s[0], e[1] - s[1]) > short * 0.8) break;
    }
    const pts = walk(rng, s, Math.atan2(e[1] - s[1], e[0] - s[0]), W, H, { to: e });
    const phase = rng.range(0, Math.PI * 2);
    lines.push({ pts, w: pts.map((_, k) => 0.88 + 0.22 * Math.sin(k * 0.42 + phase) + rng.range(-0.06, 0.06)) });

    const branches = rng() < 0.5 ? 1 : 2;
    for (let b = 0; b < branches; b++) {
      const k = rng.int(Math.floor(pts.length * 0.2), Math.max(1, Math.floor(pts.length * 0.8)));
      const at = pts[Math.min(k, pts.length - 2)];
      const next = pts[Math.min(k + 1, pts.length - 1)];
      const dir = Math.atan2(next[1] - at[1], next[0] - at[0]) + (rng() < 0.5 ? -1 : 1) * rng.range(0.5, 1.05);
      const branch = walk(rng, at, dir, W, H, { length: short * rng.range(0.22, 0.48) });
      if (branch.length < 3) continue;
      const base = lines[lines.length - 1].w[k] ?? 0.9;
      lines.push({ pts: branch, w: branch.map((_, j) => base * (1 - 0.72 * (j / (branch.length - 1)))) });
    }
  }

  const inserts: { seg: number; t: number; at: Point; w: number; id: number }[][] = lines.map(() => []);
  let crossings = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i; j < lines.length; j++) {
      const A = lines[i].pts;
      const B = lines[j].pts;
      for (let p = 0; p < A.length - 1; p++) {
        for (let q = i === j ? p + 2 : 0; q < B.length - 1; q++) {
          const hit = cross(A[p], A[p + 1], B[q], B[q + 1]);
          if (!hit) continue;
          const [t, u] = hit;
          const at: Point = [A[p][0] + (A[p + 1][0] - A[p][0]) * t, A[p][1] + (A[p + 1][1] - A[p][1]) * t];
          const id = crossings++;
          const wA = lines[i].w[p] + (lines[i].w[p + 1] - lines[i].w[p]) * t;
          const wB = lines[j].w[q] + (lines[j].w[q + 1] - lines[j].w[q]) * u;
          inserts[i].push({ seg: p, t, at, w: wA, id });
          inserts[j].push({ seg: q, t: u, at, w: wB, id });
        }
      }
    }
  }

  const xs: number[] = [];
  const ys: number[] = [];
  const ws: number[] = [];
  const crossingNode = new Map<number, number>();
  const node = (p: Point, w: number) => {
    xs.push(p[0]);
    ys.push(p[1]);
    ws.push(w);
    return xs.length - 1;
  };
  const rawEdges: [number, number][] = [];
  lines.forEach((line, i) => {
    const extra = inserts[i].sort((a, b) => a.seg - b.seg || a.t - b.t);
    let prev = -1;
    let cursor = 0;
    for (let k = 0; k < line.pts.length; k++) {
      const id = node(line.pts[k], line.w[k]);
      if (prev >= 0) rawEdges.push([prev, id]);
      prev = id;
      while (cursor < extra.length && extra[cursor].seg === k) {
        const ins = extra[cursor++];
        let n = crossingNode.get(ins.id);
        if (n == null) {
          n = node(ins.at, ins.w);
          crossingNode.set(ins.id, n);
        } else ws[n] = Math.max(ws[n], ins.w);
        rawEdges.push([prev, n]);
        prev = n;
      }
    }
  });

  const parent = xs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      if (Math.abs(xs[i] - xs[j]) < 0.8 && Math.abs(ys[i] - ys[j]) < 0.8) parent[find(j)] = find(i);
    }
  }
  const remap = new Map<number, number>();
  const nx: number[] = [];
  const ny: number[] = [];
  const nw: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const r = find(i);
    if (!remap.has(r)) {
      remap.set(r, nx.length);
      nx.push(xs[r]);
      ny.push(ys[r]);
      nw.push(ws[r]);
    }
  }
  const edges = rawEdges
    .map(([a, b]) => [remap.get(find(a))!, remap.get(find(b))!] as [number, number])
    .filter(([a, b]) => a !== b);

  const n = nx.length;
  const m = edges.length;
  const net: Network = {
    x: Float32Array.from(nx),
    y: Float32Array.from(ny),
    ea: new Int32Array(m),
    eb: new Int32Array(m),
    len: new Float32Array(m),
    width: new Float32Array(m),
    adj: Array.from({ length: n }, () => []),
    comp: new Int32Array(n).fill(-1),
    hair: new Path2D(),
  };
  edges.forEach(([a, b], e) => {
    net.ea[e] = a;
    net.eb[e] = b;
    net.len[e] = Math.hypot(nx[b] - nx[a], ny[b] - ny[a]);
    net.width[e] = 2.1 * clamp((nw[a] + nw[b]) / 2, 0.22, 1.2);
    net.adj[a].push(e);
    net.adj[b].push(e);
    net.hair.moveTo(nx[a], ny[a]);
    net.hair.lineTo(nx[b], ny[b]);
  });
  let comps = 0;
  for (let i = 0; i < n; i++) {
    if (net.comp[i] >= 0) continue;
    const stack = [i];
    net.comp[i] = comps;
    while (stack.length) {
      const v = stack.pop()!;
      for (const e of net.adj[v]) {
        const o = net.ea[e] === v ? net.eb[e] : net.ea[e];
        if (net.comp[o] < 0) {
          net.comp[o] = comps;
          stack.push(o);
        }
      }
    }
    comps++;
  }
  return net;
}

function spread(net: Network, px: number, py: number) {
  const n = net.x.length;
  const best = new Map<number, { e: number; s: number; d: number }>();
  for (let e = 0; e < net.len.length; e++) {
    const a = net.ea[e];
    const b = net.eb[e];
    const L = net.len[e] || 1e-6;
    const t = clamp(
      ((px - net.x[a]) * (net.x[b] - net.x[a]) + (py - net.y[a]) * (net.y[b] - net.y[a])) / (L * L),
      0,
      1,
    );
    const d = Math.hypot(net.x[a] + (net.x[b] - net.x[a]) * t - px, net.y[a] + (net.y[b] - net.y[a]) * t - py);
    const c = net.comp[a];
    const cur = best.get(c);
    if (!cur || d < cur.d) best.set(c, { e, s: t * L, d });
  }
  const nearest = Math.min(...[...best.values()].map((v) => v.d));
  const dist = new Float64Array(n).fill(Infinity);
  const sources = new Map<number, { s: number; lag: number }>();
  const queue: [number, number][] = [];
  for (const { e, s, d } of best.values()) {
    const lag = (d - nearest) * 0.9;
    sources.set(e, { s, lag });
    const a = net.ea[e];
    const b = net.eb[e];
    dist[a] = Math.min(dist[a], s + lag);
    dist[b] = Math.min(dist[b], net.len[e] - s + lag);
    queue.push([a, dist[a]], [b, dist[b]]);
  }
  const done = new Uint8Array(n);
  while (queue.length) {
    let k = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i][1] < queue[k][1]) k = i;
    const [v, dv] = queue[k];
    queue[k] = queue[queue.length - 1];
    queue.pop();
    if (done[v] || dv > dist[v]) continue;
    done[v] = 1;
    for (const e of net.adj[v]) {
      const o = net.ea[e] === v ? net.eb[e] : net.ea[e];
      const nd = dv + net.len[e];
      if (nd < dist[o]) {
        dist[o] = nd;
        queue.push([o, nd]);
      }
    }
  }
  let reach = 0;
  for (let i = 0; i < n; i++) if (Number.isFinite(dist[i])) reach = Math.max(reach, dist[i]);
  return { dist, sources, reach };
}

function mix(a: Rgba, b: Rgba, t: number): Rgba {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

function css([r, g, b, a]: Rgba, alpha = 1) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

export function KintsugiCard({
  seed = 7,
  cracks = 3,
  color = "var(--warning)",
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: KintsugiCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const halo = document.createElement("canvas");
    const hctx = halo.getContext("2d");
    const gold = document.createElement("canvas");
    const gctx = gold.getContext("2d");
    if (!hctx || !gctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let net: Network | null = null;
    let flow: ReturnType<typeof spread> | null = null;
    let raf = 0;
    let last = -1;
    let start = 0;
    let alpha = 0;
    let active = false;
    let inView = true;
    let point: [number, number] | null = null;
    let palette = read();

    function read() {
      const base = toRgba(color, root);
      const ground = toRgba("var(--background)", root);
      const night = ground[0] * 0.3 + ground[1] * 0.59 + ground[2] * 0.11 < 0.45;
      return {
        night,
        hair: css(toRgba("var(--foreground)", root), night ? 0.17 : 0.13),
        body: base,
        core: mix(base, [1, 0.98, 0.9, 1], night ? 0.48 : 0.5),
        halo: night ? css(base) : css(mix(base, [0.42, 0.24, 0.04, 1], 0.6)),
      };
    }

    function resize() {
      const rect = root!.getBoundingClientRect();
      const w = Math.round(canvas!.clientWidth || rect.width);
      const h = Math.round(canvas!.clientHeight || rect.height);
      if (w === W && h === H) return;
      W = w;
      H = h;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      gold.width = canvas!.width;
      gold.height = canvas!.height;
      halo.width = Math.max(1, Math.round(W * 0.5));
      halo.height = Math.max(1, Math.round(H * 0.5));
      net = W > 0 && H > 0 ? build(seed, Math.max(1, Math.round(cracks)), W, H) : null;
      flow = net && point && alpha > 0 ? spread(net, point[0], point[1]) : null;
      if (!flow) alpha = 0;
      draw(performance.now());
      kick();
    }

    function lit(
      R: number,
      each: (e: number, lo: number, hi: number, d0: number) => void,
      fronts?: (x: number, y: number, w: number) => void,
    ) {
      if (!net || !flow) return;
      const { dist, sources } = flow;
      for (let e = 0; e < net.len.length; e++) {
        const L = net.len[e];
        const a = net.ea[e];
        const b = net.eb[e];
        const src = sources.get(e);
        let lo1 = 0;
        let hi1 = 0;
        let lo2 = L;
        if (src != null) {
          const r = Math.max(0, R - src.lag);
          lo1 = clamp(src.s - r, 0, L);
          hi1 = clamp(src.s + r, 0, L);
          if (fronts && r > 0) {
            if (src.s - r > 0) fronts(...at(e, src.s - r), net.width[e]);
            if (src.s + r < L) fronts(...at(e, src.s + r), net.width[e]);
          }
        } else {
          const ra = R - dist[a];
          const rb = R - dist[b];
          hi1 = clamp(ra, 0, L);
          lo2 = clamp(L - rb, 0, L);
          if (fronts && ra + rb < L) {
            if (ra > 0 && ra < L) fronts(...at(e, ra), net.width[e]);
            if (rb > 0 && rb < L) fronts(...at(e, L - rb), net.width[e]);
          }
        }
        const d0 = Math.min(dist[a], dist[b]) + L / 2;
        if (hi1 >= lo2) {
          if (Math.min(lo1, lo2) < L) each(e, Math.min(lo1, lo2), L, d0);
        } else {
          if (hi1 > lo1) each(e, lo1, hi1, d0);
          if (L > lo2) each(e, lo2, L, d0);
        }
      }
    }

    function at(e: number, s: number): [number, number] {
      const a = net!.ea[e];
      const b = net!.eb[e];
      const t = net!.len[e] > 0 ? s / net!.len[e] : 0;
      return [net!.x[a] + (net!.x[b] - net!.x[a]) * t, net!.y[a] + (net!.y[b] - net!.y[a]) * t];
    }

    function draw(now: number) {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.globalAlpha = 1;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (!net) return;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.strokeStyle = palette.hair;
      ctx!.lineWidth = 0.75;
      ctx!.stroke(net.hair);
      if (alpha <= 0.002 || !flow) return;

      const T = (now - start) / 1000;
      const R = reduce ? Infinity : POUR * T + RUSH * (1 - Math.exp(-T / 0.14));
      const time = now / 1000;
      const { night } = palette;

      hctx!.setTransform(1, 0, 0, 1, 0, 0);
      hctx!.clearRect(0, 0, halo.width, halo.height);
      hctx!.setTransform(0.5, 0, 0, 0.5, 0, 0);
      hctx!.lineCap = "round";
      hctx!.strokeStyle = palette.halo;
      lit(R, (e, lo, hi) => {
        const [x0, y0] = at(e, lo);
        const [x1, y1] = at(e, hi);
        hctx!.lineWidth = net!.width[e] + (night ? 5 : 2.4);
        hctx!.beginPath();
        hctx!.moveTo(x0, y0);
        hctx!.lineTo(x1, y1);
        hctx!.stroke();
      });

      gctx!.setTransform(1, 0, 0, 1, 0, 0);
      gctx!.clearRect(0, 0, gold.width, gold.height);
      gctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx!.lineCap = "round";
      const shine = (d: number) => {
        if (reduce) return 0.35;
        let p = (d - time * SHIMMER) % BAND;
        if (p < 0) p += BAND;
        p -= BAND / 2;
        return Math.exp(-((p / 34) ** 2));
      };
      lit(
        R,
        (e, lo, hi, d0) => {
          const [x0, y0] = at(e, lo);
          const [x1, y1] = at(e, hi);
          const k = shine(d0);
          gctx!.strokeStyle = css(mix(palette.body, palette.core, 0.28 * k));
          gctx!.lineWidth = net!.width[e];
          gctx!.beginPath();
          gctx!.moveTo(x0, y0);
          gctx!.lineTo(x1, y1);
          gctx!.stroke();
        },
        reduce
          ? undefined
          : (x, y, w) => {
              gctx!.fillStyle = css(palette.body);
              gctx!.beginPath();
              gctx!.arc(x, y, w * 0.62 + 0.55, 0, Math.PI * 2);
              gctx!.fill();
            },
      );
      gctx!.lineCap = "butt";
      lit(R, (e, lo, hi, d0) => {
        const [x0, y0] = at(e, lo);
        const [x1, y1] = at(e, hi);
        gctx!.strokeStyle = css(palette.core, 0.45 + 0.55 * shine(d0));
        gctx!.lineWidth = Math.max(0.55, net!.width[e] * 0.34);
        gctx!.beginPath();
        gctx!.moveTo(x0, y0);
        gctx!.lineTo(x1, y1);
        gctx!.stroke();
      });

      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.imageSmoothingEnabled = true;
      ctx!.globalAlpha = alpha * (night ? 0.28 : 0.3);
      ctx!.drawImage(halo, 0, night ? 0 : dpr * 0.9, canvas!.width, canvas!.height);
      ctx!.globalAlpha = alpha * (night ? 0.9 : 1);
      ctx!.drawImage(gold, 0, 0);
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = 0;
      const dt = last < 0 ? 1 / 60 : clamp((now - last) / 1000, 0, 0.05);
      last = now;
      const target = active ? 1 : 0;
      const tau = reduce ? 0.06 : active ? 0.12 : 0.5;
      alpha = clamp(alpha + (target - alpha) * (1 - Math.exp(-dt / tau)), 0, 1);
      if (!active && alpha < 0.004) {
        alpha = 0;
        flow = null;
      }
      draw(now);
      const T = (now - start) / 1000;
      const pouring = flow != null && !reduce && POUR * T < flow.reach + 40;
      const fading = Math.abs(target - alpha) > 0.003;
      const shimmering = flow != null && !reduce && alpha > 0;
      if (pouring || fading || shimmering) kick();
      else last = -1;
    }

    function kick() {
      if (raf || !inView || document.hidden) {
        if (!raf) last = -1;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    handle.current = {
      activate(x, y) {
        active = true;
        if (net && (!flow || alpha < 0.02)) {
          point = [x, y];
          flow = spread(net, x, y);
          start = performance.now();
        }
        kick();
      },
      deactivate() {
        active = false;
        kick();
      },
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) kick();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      palette = read();
      draw(performance.now());
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      offTheme();
      document.removeEventListener("visibilitychange", onVisibility);
      handle.current = null;
    };
  }, [seed, cracks, color, reduce]);

  const local = (el: HTMLElement, x: number, y: number) => {
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    const sy = rect.height > 0 ? el.offsetHeight / rect.height : 1;
    const border = el.clientLeft;
    return [(x - rect.left) * sx - border, (y - rect.top) * sy - el.clientTop] as const;
  };

  return (
    <div
      ref={rootRef}
      {...props}
      className={cn(
        "relative isolate overflow-clip rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(e);
        handle.current?.activate(...local(e.currentTarget, e.clientX, e.clientY));
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(e);
        if (!e.currentTarget.contains(document.activeElement) || !document.activeElement?.matches(":focus-visible")) {
          handle.current?.deactivate();
        }
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
        const r = e.target.getBoundingClientRect();
        handle.current?.activate(...local(e.currentTarget, r.left + r.width / 2, r.top + r.height / 2));
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(":hover")) {
          handle.current?.deactivate();
        }
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" />
      {children}
    </div>
  );
}
