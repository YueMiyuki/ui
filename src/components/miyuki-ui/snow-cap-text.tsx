"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface SnowCapTextHandle {
  shake: () => void;
}

export interface SnowCapTextProps extends Omit<ComponentProps<"span">, "children" | "ref"> {
  children: string;
  rate?: number;
  maxDepth?: number;
  ref?: Ref<SnowCapTextHandle>;
}

interface Letter {
  left: number;
  top: number;
  bottom: number;
  right: number;
  cols: number;
  surface: Float32Array;
  cap: Float32Array;
  depth: Float32Array;
  link: Uint8Array;
  slope: Float32Array;
  knocked: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  sway: number;
  phase: number;
  freq: number;
  layer: 0 | 1 | 2;
}

interface Chunk {
  pts: [number, number][];
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  life: number;
  top: number;
  bottom: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
}

const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function caseOf(ch: string, mode: string) {
  if (mode === "uppercase") return ch.toUpperCase();
  if (mode === "lowercase") return ch.toLowerCase();
  return ch;
}

const mix = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  1,
];
const css = (c: Rgba, alpha = 1) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${alpha})`;
const WHITE: Rgba = [1, 1, 1, 1];

export function SnowCapText({
  children,
  rate = 1,
  maxDepth,
  className,
  onPointerMove,
  ref,
  ...props
}: SnowCapTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const [failed, setFailed] = useState(false);
  const api = useRef<{ knockAt: (x: number, y: number, dir: number) => void; shake: () => void }>({
    knockAt: () => {},
    shake: () => {},
  });

  useImperativeHandle(ref, () => ({ shake: () => api.current.shake() }), []);

  useEffect(() => {
    const root = own.current;
    const textEl = glyphs.current;
    const backCanvas = back.current;
    const frontCanvas = front.current;
    if (!root || !textEl || !backCanvas || !frontCanvas || reduced) return;
    const bctx = backCanvas.getContext("2d");
    const fctx = frontCanvas.getContext("2d");
    const scratch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!bctx || !fctx || !scratch) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    let W = 0;
    let H = 0;
    let padX = 0;
    let padTop = 0;
    let scale = 1;
    let size = 16;
    let depthMax = 12;
    let letters: Letter[] = [];
    let columns: number[][] = [];
    let flakes: Flake[] = [];
    const chunks: Chunk[] = [];
    const dust: Dust[] = [];
    let dark = false;
    let flakeColor: Rgba = [0.5, 0.6, 0.7, 1];
    let snowTop: Rgba = WHITE;
    let snowShade: Rgba = [0.8, 0.86, 0.94, 1];
    let rim: Rgba = [0.4, 0.5, 0.65, 1];
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let clock = 0;
    const timers: number[] = [];
    const handle = api.current;

    const resolve = () => {
      const bg = toRgba("var(--background)", root);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.4;
      const brand = toRgba("var(--brand)", root);
      const muted = toRgba("var(--muted-foreground)", root);
      if (dark) {
        flakeColor = mix(WHITE, brand, 0.08);
        snowTop = [0.985, 0.99, 1, 1];
        snowShade = mix(WHITE, brand, 0.5);
        rim = mix(brand, [0.05, 0.1, 0.2, 1], 0.45);
      } else {
        flakeColor = mix(muted, brand, 0.35);
        snowTop = WHITE;
        snowShade = mix(WHITE, brand, 0.46);
        rim = mix(brand, muted, 0.4);
      }
    };

    const spawn = (layer: 0 | 1 | 2, anywhere: boolean): Flake => {
      const near = layer === 2;
      const far = layer === 0;
      const r = far ? 0.55 + Math.random() * 0.7 : near ? 2 + Math.random() * 1.3 : 0.9 + Math.random() * 1.1;
      const speed = far ? 16 + Math.random() * 12 : near ? 58 + Math.random() * 26 : 30 + Math.random() * 22;
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -r * 2 - Math.random() * 20,
        r,
        vy: speed * (size / 120) ** 0.35,
        sway: (far ? 5 : near ? 14 : 9) * (0.5 + Math.random()),
        phase: Math.random() * Math.PI * 2,
        freq: 0.5 + Math.random() * 0.9,
        layer,
      };
    };

    const populate = () => {
      const area = W * H;
      const r = Math.max(0, rate);
      const counts: [number, number, number] = [
        Math.round(area * 0.00042 * r),
        Math.round(area * 0.0006 * r),
        Math.round(area * 0.000035 * r),
      ];
      const next: Flake[] = [];
      counts.forEach((n, layer) => {
        const have = flakes.filter((f) => f.layer === layer);
        for (let i = 0; i < n; i++) next.push(have[i] ?? spawn(layer as 0 | 1 | 2, true));
      });
      flakes = next;
    };

    const layout = () => {
      const cs = getComputedStyle(textEl);
      size = parseFloat(cs.fontSize) || 16;
      depthMax = maxDepth ?? Math.max(4, size * 0.12);
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      padX = Math.ceil(size * 0.35 + 8);
      padTop = Math.ceil(size * 0.85 + 12);
      const padBottom = Math.ceil(size * 0.6 + 10);
      W = box.width / k + padX * 2;
      H = box.height / k + padTop + padBottom;
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      const pw = Math.max(1, Math.ceil(W * scale));
      const ph = Math.max(1, Math.ceil(H * scale));
      for (const c of [backCanvas, frontCanvas]) {
        c.width = pw;
        c.height = ph;
        c.style.left = `${-padX}px`;
        c.style.top = `${-padTop}px`;
        c.style.width = `${pw / scale}px`;
        c.style.height = `${ph / scale}px`;
      }

      const old = letters;
      letters = [];
      const node = textEl.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        scratch.font = font;
        scratch.letterSpacing = "0px";
        scratch.textBaseline = "alphabetic";
        const source = node.textContent ?? "";
        const range = document.createRange();
        const ss = 3;
        for (let i = 0; i < source.length; ) {
          const cp = source.codePointAt(i) ?? 0;
          const len = cp > 0xffff ? 2 : 1;
          const raw = source.slice(i, i + len);
          range.setStart(node, i);
          range.setEnd(node, i + len);
          i += len;
          if (/\s/.test(raw)) continue;
          const rect = range.getClientRects()[0];
          if (!rect || rect.width === 0) continue;
          const ch = caseOf(raw, cs.textTransform);
          scratch.font = font;
          const m = scratch.measureText(ch);
          const ox = (rect.left - box.left) / k + padX;
          const baseline = (rect.top - box.top) / k + padTop + m.fontBoundingBoxAscent;
          const inkLeft = Math.floor(ox - m.actualBoundingBoxLeft) - 1;
          const inkRight = Math.ceil(ox + m.actualBoundingBoxRight) + 1;
          const inkTop = Math.floor(baseline - m.actualBoundingBoxAscent) - 1;
          const inkBottom = Math.ceil(baseline + m.actualBoundingBoxDescent) + 1;
          const cols = Math.max(1, inkRight - inkLeft);
          const rows = Math.max(1, inkBottom - inkTop);
          const cw = cols * ss;
          const chh = rows * ss;
          const cv = scratch.canvas;
          if (cv.width < cw) cv.width = cw;
          if (cv.height < chh) cv.height = chh;
          scratch.setTransform(1, 0, 0, 1, 0, 0);
          scratch.clearRect(0, 0, cv.width, cv.height);
          scratch.setTransform(ss, 0, 0, ss, 0, 0);
          scratch.font = font;
          scratch.letterSpacing = "0px";
          scratch.textBaseline = "alphabetic";
          scratch.fillStyle = "#000";
          scratch.fillText(ch, ox - inkLeft, baseline - inkTop);
          const data = scratch.getImageData(0, 0, cw, chh).data;
          const surface = new Float32Array(cols).fill(Infinity);
          for (let c = 0; c < cols; c++) {
            let best = Infinity;
            for (let sx = c * ss; sx < (c + 1) * ss; sx++) {
              for (let sy = 0; sy < chh; sy++) {
                const a = data[(sy * cw + sx) * 4 + 3];
                if (a > 110) {
                  best = Math.min(best, sy + 1 - a / 255);
                  break;
                }
              }
            }
            if (best < Infinity) surface[c] = inkTop + best / ss;
          }
          const link = new Uint8Array(cols);
          for (let c = 0; c < cols - 1; c++) {
            link[c] =
              Number.isFinite(surface[c]) &&
              Number.isFinite(surface[c + 1]) &&
              Math.abs(surface[c] - surface[c + 1]) < 2.6
                ? 1
                : 0;
          }
          const cap = new Float32Array(cols);
          const reach = Math.max(2, depthMax * 0.85);
          for (let c = 0; c < cols; c++) {
            if (!Number.isFinite(surface[c])) continue;
            let a = 0;
            while (c - a - 1 >= 0 && link[c - a - 1] && a < reach * 2) a++;
            let b = 0;
            while (c + b < cols - 1 && link[c + b] && b < reach * 2) b++;
            const edge = Math.min(a, b) + 0.5;
            const shoulder = 0.42 + 0.58 * Math.sqrt(Math.min(1, edge / reach));
            const lp = c > 0 && link[c - 1] ? surface[c - 1] : surface[c];
            const rp = link[c] ? surface[c + 1] : surface[c];
            const slope = Math.abs(rp - lp) / (lp !== surface[c] && rp !== surface[c] ? 2 : 1);
            const hold = Math.max(0, Math.min(1, 1.3 - slope * 0.68));
            const span = a + b + 1;
            const narrow = Math.min(1, 0.35 + span / (depthMax * 2.6));
            cap[c] = hold < 0.14 ? 0 : depthMax * shoulder * hold * narrow;
          }
          const tilt = new Float32Array(cols);
          for (let c = 0; c < cols; c++) {
            const lp = c > 0 && link[c - 1] ? surface[c - 1] : surface[c];
            const rp = link[c] ? surface[c + 1] : surface[c];
            tilt[c] = rp - lp;
          }
          const index = letters.length;
          const prev = old[index];
          const depth = new Float32Array(cols);
          for (let c = 0; c < cols; c++) depth[c] = cap[c] * 0.12;
          if (prev && prev.cols > 1) {
            for (let c = 0; c < cols; c++) {
              const f = Math.round((c / Math.max(1, cols - 1)) * (prev.cols - 1));
              depth[c] = Math.min(cap[c], prev.depth[f]);
            }
          }
          letters.push({
            left: inkLeft,
            top: inkTop,
            bottom: inkBottom,
            right: inkRight,
            cols,
            surface,
            cap,
            depth,
            link,
            slope: tilt,
            knocked: prev?.knocked ?? -10,
          });
        }
      }
      columns = Array.from({ length: Math.ceil(W) + 1 }, () => [] as number[]);
      letters.forEach((l, li) => {
        for (let c = 0; c < l.cols; c++) {
          const X = l.left + c;
          if (X >= 0 && X < columns.length && Number.isFinite(l.surface[c])) columns[X].push(li * 4096 + c);
        }
      });
      for (const list of columns) {
        list.sort((p, q) => letters[p >> 12].surface[p & 4095] - letters[q >> 12].surface[q & 4095]);
      }
      populate();
    };

    const deposit = (l: Letter, c: number, amount: number) => {
      for (let d = -3; d <= 3; d++) {
        const j = c + d;
        if (j < 0 || j >= l.cols || l.cap[j] <= 0) continue;
        if (d < 0 && !l.link[j]) continue;
        if (d > 0 && !l.link[j - 1]) continue;
        const w = Math.exp(-(d * d) / 4.5);
        const room = Math.max(0, 1 - l.depth[j] / Math.max(1e-3, l.cap[j]));
        l.depth[j] += amount * w * room;
      }
    };

    const relax = (l: Letter, dt: number) => {
      const d = l.depth;
      for (let c = 0; c < l.cols; c++) {
        const t = l.slope[c];
        if (d[c] <= 0 || Math.abs(t) < 0.75) continue;
        const to = t > 0 ? c + 1 : c - 1;
        if (to < 0 || to >= l.cols || !l.link[Math.min(c, to)]) continue;
        const m = d[c] * Math.min(1, (Math.abs(t) - 0.75) * 3 * dt);
        d[c] -= m;
        d[to] += m;
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let c = 0; c < l.cols - 1; c++) {
          if (!l.link[c] || l.cap[c] <= 0 || l.cap[c + 1] <= 0) continue;
          const m = (d[c] - d[c + 1]) * 0.12;
          d[c] -= m;
          d[c + 1] += m;
        }
      }
      for (let c = 0; c < l.cols; c++) {
        if (d[c] > l.cap[c]) d[c] = l.cap[c];
        if (d[c] < 0) d[c] = 0;
      }
    };

    const smoothed = (l: Letter, c: number) => {
      let sum = 0;
      let wsum = 0;
      for (let d = -3; d <= 3; d++) {
        const j = c + d;
        if (j < 0 || j >= l.cols) continue;
        if (d < 0 && !l.link[j]) continue;
        if (d > 0 && !l.link[j - 1]) continue;
        const w = 4 - Math.abs(d);
        sum += l.depth[j] * w;
        wsum += w;
      }
      return wsum ? sum / wsum : 0;
    };

    const segments = (l: Letter) => {
      const out: [number, number][] = [];
      let start = -1;
      for (let c = 0; c < l.cols; c++) {
        const has = Number.isFinite(l.surface[c]) && l.cap[c] > 0;
        if (has && start < 0) start = c;
        const ends = !has || c === l.cols - 1 || !l.link[c];
        if (start >= 0 && ends) {
          const end = has ? c : c - 1;
          if (end > start) out.push([start, end]);
          start = -1;
        }
      }
      return out;
    };

    const capPath = (ctx: CanvasRenderingContext2D, l: Letter, a: number, b: number, dy = 0, open = false) => {
      const da = Math.min(smoothed(l, a), l.cap[a]);
      const db = Math.min(smoothed(l, b), l.cap[b]);
      const xa = l.left + a + 0.5;
      const xb = l.left + b + 0.5;
      const oa = Math.min(2.5, da * 0.38);
      const ob = Math.min(2.5, db * 0.38);
      ctx.moveTo(xa - oa, l.surface[a] + 0.9 + dy);
      ctx.quadraticCurveTo(xa - oa, l.surface[a] - da + dy, xa + oa * 0.6, l.surface[a] - da + dy);
      for (let c = a + 1; c < b; c++) ctx.lineTo(l.left + c + 0.5, l.surface[c] - smoothed(l, c) + dy);
      ctx.lineTo(xb - ob * 0.6, l.surface[b] - db + dy);
      ctx.quadraticCurveTo(xb + ob, l.surface[b] - db + dy, xb + ob, l.surface[b] + 0.9 + dy);
      if (open) return;
      for (let c = b; c >= a; c--) ctx.lineTo(l.left + c + 0.5, l.surface[c] + 0.9 + dy);
      ctx.closePath();
    };

    const drawCaps = (ctx: CanvasRenderingContext2D) => {
      for (const l of letters) {
        let peak = 0;
        for (let c = 0; c < l.cols; c++) peak = Math.max(peak, l.depth[c]);
        if (peak < 0.25) continue;
        const segs = segments(l).filter(([a, b]) => {
          for (let c = a; c <= b; c++) if (l.depth[c] > 0.6) return true;
          return false;
        });
        if (!segs.length) continue;
        ctx.beginPath();
        for (const [a, b] of segs) capPath(ctx, l, a, b, Math.max(1, depthMax * 0.12));
        ctx.fillStyle = css(rim, dark ? 0.55 : 0.4);
        ctx.fill();
        for (const [a, b] of segs) {
          let lo = Infinity;
          let hi = -Infinity;
          for (let c = a; c <= b; c++) {
            lo = Math.min(lo, l.surface[c] - smoothed(l, c));
            hi = Math.max(hi, l.surface[c] + 1);
          }
          const g = ctx.createLinearGradient(0, lo, 0, Math.max(lo + 1, hi));
          g.addColorStop(0, css(mix(snowTop, snowShade, dark ? 0.12 : 0.5), 1));
          g.addColorStop(0.55, css(mix(snowTop, snowShade, dark ? 0.55 : 0.82), 1));
          g.addColorStop(1, css(snowShade, 1));
          ctx.beginPath();
          capPath(ctx, l, a, b);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.save();
          ctx.clip();
          ctx.beginPath();
          for (let c = a; c <= b; c++) {
            const x = l.left + c + 0.5;
            const y = l.surface[c] - smoothed(l, c) + 1.1;
            if (c === a) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(1.3, depthMax * 0.13);
          ctx.strokeStyle = css(dark ? snowTop : mix(snowTop, snowShade, 0.12), dark ? 1 : 0.95);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        for (const [a, b] of segs) capPath(ctx, l, a, b, 0, true);
        ctx.lineWidth = dark ? 0.8 : 1;
        ctx.strokeStyle = css(rim, dark ? 0.3 : 0.55);
        ctx.stroke();
      }
    };

    const fade = (x: number, y: number) => {
      const top = Math.min(1, y / (padTop * 0.7));
      const bottom = Math.min(1, (H - y) / (H * 0.18));
      const side = Math.min(1, x / (padX * 1.2), (W - x) / (padX * 1.2));
      return Math.max(0, Math.min(top, bottom, side));
    };

    const knock = (index: number, dir: number, force = 1) => {
      const l = letters[index];
      if (!l || clock - l.knocked < 0.45) return;
      let total = 0;
      for (let c = 0; c < l.cols; c++) total += l.depth[c];
      if (total < l.cols * 0.15) return;
      l.knocked = clock;
      const mid = (l.left + l.right) / 2;
      for (const [a, b] of segments(l)) {
        let c = a;
        while (c < b) {
          const len = Math.min(b - c, 5 + Math.floor(Math.random() * 7));
          const e = c + len;
          let mass = 0;
          for (let j = c; j <= e; j++) mass += l.depth[j];
          if (mass > len * 0.4) {
            const avg = mass / (len + 1);
            let cx = 0;
            let cy = 0;
            for (let j = c; j <= e; j++) {
              cx += l.left + j + 0.5;
              cy += l.surface[j] - l.depth[j] / 2;
            }
            cx /= len + 1;
            cy /= len + 1;
            const rx = (len + 1) * 0.5;
            const ry = Math.max(1.2, avg * 0.62);
            const pts: [number, number][] = [];
            const n = 11;
            const wob = Math.random() * Math.PI * 2;
            for (let p = 0; p < n; p++) {
              const t = (p / n) * Math.PI * 2;
              const jit = 0.82 + 0.3 * Math.abs(Math.sin(t * 2.3 + wob)) + Math.random() * 0.08;
              const flat = Math.sin(t) > 0 ? 0.8 : 1;
              pts.push([Math.cos(t) * rx * jit, Math.sin(t) * ry * jit * flat]);
            }
            const topY = -ry * 1.1;
            const botY = ry;
            const side = Math.sign(cx - mid) || dir;
            chunks.push({
              pts,
              x: cx,
              y: cy,
              vx: (dir * (24 + Math.random() * 46) + side * (10 + Math.random() * 30)) * force,
              vy: -(32 + Math.random() * 56) * force,
              a: 0,
              va: (Math.random() - 0.5) * 9 + dir * 2,
              life: 0,
              top: topY,
              bottom: botY,
            });
            for (let k = 0; k < 5; k++) {
              dust.push({
                x: cx + (Math.random() - 0.5) * len,
                y: cy - Math.random() * 3,
                vx: (Math.random() - 0.5) * 50 + dir * 20,
                vy: -(15 + Math.random() * 50),
                r: 0.5 + Math.random() * 1.1,
                life: 0,
                max: 0.6 + Math.random() * 0.7,
              });
            }
          }
          for (let j = c; j <= e; j++) l.depth[j] *= 0.08;
          c = e + 1;
        }
      }
    };

    handle.knockAt = (x: number, y: number, dir: number) => {
      const X = x + padX;
      const Y = y + padTop;
      letters.forEach((l, i) => {
        if (X >= l.left && X <= l.right && Y >= l.top - depthMax * 2.2 && Y <= l.bottom + 2) knock(i, dir);
      });
    };
    handle.shake = () => {
      letters.forEach((_, i) => {
        timers.push(window.setTimeout(() => knock(i, i % 2 ? 1 : -1, 1.3), i * 45));
      });
    };

    const update = (dt: number) => {
      const wind = 7 + Math.sin(clock * 0.21) * 5;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        const prevY = f.y;
        f.y += f.vy * dt;
        f.x +=
          (wind * (f.layer === 0 ? 0.6 : f.layer === 2 ? 1.4 : 1) + Math.cos(clock * f.freq + f.phase) * f.sway) * dt;
        if (f.x < -10) f.x += W + 20;
        if (f.x > W + 10) f.x -= W + 20;
        if (f.layer === 1) {
          const X = Math.floor(f.x);
          const list = X >= 0 && X < columns.length ? columns[X] : undefined;
          if (list?.length) {
            let landed = false;
            for (const key of list) {
              const l = letters[key >> 12];
              const c = key & 4095;
              const s = l.surface[c] - l.depth[c];
              if (prevY <= s && f.y >= s - 0.5) {
                if (l.cap[c] > 0.5) deposit(l, c, f.r * f.r * 1.7);
                landed = true;
                break;
              }
              if (f.y < s) break;
            }
            if (landed) {
              flakes[i] = spawn(1, false);
              continue;
            }
          }
        }
        if (f.y > H + 6) flakes[i] = spawn(f.layer, false);
      }
      const fine = 0.19 * Math.max(0, rate) * depthMax * dt;
      for (const l of letters) {
        if (clock - l.knocked < 1.2) continue;
        for (let c = 0; c < l.cols; c++) {
          if (l.cap[c] <= 0) continue;
          l.depth[c] += fine * Math.max(0, 1 - l.depth[c] / l.cap[c]) * (0.55 + 0.45 * Math.sin(c * 0.37 + l.left));
        }
        relax(l, dt);
      }
      for (let i = chunks.length - 1; i >= 0; i--) {
        const ch = chunks[i];
        ch.life += dt;
        ch.vy += 820 * dt;
        ch.vx *= Math.exp(-dt * 1.2);
        ch.x += ch.vx * dt;
        ch.y += ch.vy * dt;
        ch.a += ch.va * dt;
        if (ch.life > 0.16 && Math.random() < dt * 22) {
          dust.push({
            x: ch.x,
            y: ch.y,
            vx: ch.vx * 0.3 + (Math.random() - 0.5) * 30,
            vy: ch.vy * 0.3 - 10,
            r: 0.5 + Math.random(),
            life: 0,
            max: 0.5 + Math.random() * 0.5,
          });
        }
        if (ch.life > 1 || ch.y > H + 20) chunks.splice(i, 1);
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life += dt;
        d.vy += 60 * dt;
        d.vx *= Math.exp(-dt * 2.5);
        d.vy *= Math.exp(-dt * 1.4);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.life > d.max) dust.splice(i, 1);
      }
    };

    let soft: HTMLCanvasElement | null = null;
    const softFlake = () => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const g = c.getContext("2d");
      if (g) {
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, css(flakeColor, 1));
        grad.addColorStop(0.45, css(flakeColor, 0.85));
        grad.addColorStop(1, css(flakeColor, 0));
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
      }
      soft = c;
    };

    const drawFlakes = (ctx: CanvasRenderingContext2D, layer: 0 | 1 | 2) => {
      const base = layer === 0 ? (dark ? 0.42 : 0.4) : layer === 2 ? (dark ? 0.7 : 0.55) : dark ? 0.85 : 0.72;
      ctx.fillStyle = css(flakeColor, 1);
      for (const f of flakes) {
        if (f.layer !== layer) continue;
        const a = base * fade(f.x, f.y);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        if (layer === 2 && soft) {
          const r = f.r * 1.7;
          ctx.drawImage(soft, f.x - r, f.y - r, r * 2, r * 2);
          continue;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, backCanvas.width, backCanvas.height);
      bctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFlakes(bctx, 0);

      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
      fctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawCaps(fctx);
      for (const ch of chunks) {
        const alpha = Math.max(0, Math.min(1, 1.15 - ch.life * 1.25)) * fade(ch.x, ch.y);
        if (alpha <= 0.01) continue;
        fctx.save();
        fctx.translate(ch.x, ch.y);
        fctx.rotate(ch.a);
        const shrink = 1 - 0.55 * Math.max(0, Math.min(1, (ch.life - 0.18) / 0.7));
        fctx.scale(shrink, shrink);
        fctx.globalAlpha = alpha;
        const g = fctx.createLinearGradient(0, ch.top, 0, ch.bottom);
        g.addColorStop(0, css(snowTop, 1));
        g.addColorStop(1, css(snowShade, 1));
        fctx.beginPath();
        ch.pts.forEach(([x, y], i) => (i ? fctx.lineTo(x, y + 1) : fctx.moveTo(x, y + 1)));
        fctx.closePath();
        fctx.fillStyle = css(rim, dark ? 0.5 : 0.35);
        fctx.fill();
        fctx.beginPath();
        ch.pts.forEach(([x, y], i) => (i ? fctx.lineTo(x, y) : fctx.moveTo(x, y)));
        fctx.closePath();
        fctx.fillStyle = g;
        fctx.fill();
        fctx.restore();
      }
      fctx.fillStyle = css(dark ? snowTop : mix(snowShade, rim, 0.25), 1);
      for (const d of dust) {
        const a = Math.max(0, 1 - d.life / d.max) * fade(d.x, d.y) * (dark ? 0.9 : 0.85);
        if (a <= 0.01) continue;
        fctx.globalAlpha = a;
        fctx.beginPath();
        fctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        fctx.fill();
      }
      fctx.globalAlpha = 1;
      drawFlakes(fctx, 1);
      drawFlakes(fctx, 2);
    };

    const running = () => onScreen && document.visibilityState === "visible";
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      clock += dt;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (running()) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const refresh = () => {
      layout();
      draw();
    };

    resolve();
    softFlake();
    refresh();

    const resize = new ResizeObserver(refresh);
    resize.observe(root);
    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      sync();
    });
    visible.observe(root);
    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    const fonts = document.fonts;
    const onFonts = () => refresh();
    fonts?.addEventListener("loadingdone", onFonts);
    fonts?.ready.then(onFonts).catch(() => {});
    const stopTheme = onThemeChange(() => {
      resolve();
      softFlake();
      draw();
    });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      resize.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      fonts?.removeEventListener("loadingdone", onFonts);
      stopTheme();
      handle.knockAt = () => {};
      handle.shake = () => {};
    };
  }, [children, rate, maxDepth, reduced]);

  const live = hydrated && !reduced && !failed;
  const lastPointer = useRef({ x: 0, t: 0 });

  return (
    <span
      {...props}
      ref={own}
      className={cn("relative isolate inline-block", className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        const root = own.current;
        if (!root || !live) return;
        const box = root.getBoundingClientRect();
        const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
        const x = (event.clientX - box.left) / k;
        const y = (event.clientY - box.top) / k;
        const dir = Math.sign(x - lastPointer.current.x) || 1;
        lastPointer.current = { x, t: event.timeStamp };
        api.current.knockAt(x, y, dir);
      }}
    >
      <canvas
        ref={back}
        aria-hidden="true"
        className={cn("pointer-events-none absolute -z-10 select-none", !live && "hidden")}
      />
      <span ref={glyphs}>{children}</span>
      <canvas
        ref={front}
        aria-hidden="true"
        className={cn("pointer-events-none absolute z-10 select-none", !live && "hidden")}
      />
    </span>
  );
}
