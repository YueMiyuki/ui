"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface FrostTextProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  stagger?: number;
  duration?: number;
  thaw?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

interface Needle {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  w: number;
}

interface Glyph {
  ch: string;
  x: number;
  baseline: number;
  bx: number;
  by: number;
  bw: number;
  bh: number;
  tex: HTMLCanvasElement;
  edge: Needle[];
  crystals: Needle[];
  edgeSets: Needle[][];
  crystalSets: Needle[][];
  done: HTMLCanvasElement | null;
  glints: [number, number, number][];
}

function bucket(set: Needle[]) {
  const map = new Map<number, Needle[]>();
  for (const n of set) {
    const key = Math.max(1, Math.round(n.w * 4));
    let b = map.get(key);
    if (!b) map.set(key, (b = []));
    b.push(n);
  }
  return Array.from(map.values(), (b) => b.sort((x, y) => x.t - y.t));
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
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

function contours(a: Uint8ClampedArray, w: number, h: number) {
  const th = 128;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[(y * w + x) * 4 + 3]);
  const key = (x: number, y: number, v: number) => (y * (w + 1) + x) * 2 + v;
  const pos = (k: number): [number, number] => {
    const v = k & 1;
    const cell = k >> 1;
    const x = cell % (w + 1);
    const y = Math.floor(cell / (w + 1));
    if (v === 0) {
      const p = at(x, y);
      const q = at(x + 1, y);
      return [x + (q === p ? 0.5 : (th - p) / (q - p)), y];
    }
    const p = at(x, y);
    const q = at(x, y + 1);
    return [x, y + (q === p ? 0.5 : (th - p) / (q - p))];
  };
  const links = new Map<number, number[]>();
  const add = (p: number, q: number) => {
    let l = links.get(p);
    if (!l) links.set(p, (l = []));
    l.push(q);
    let m = links.get(q);
    if (!m) links.set(q, (m = []));
    m.push(p);
  };
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = at(x, y) >= th ? 8 : 0;
      const tr = at(x + 1, y) >= th ? 4 : 0;
      const br = at(x + 1, y + 1) >= th ? 2 : 0;
      const bl = at(x, y + 1) >= th ? 1 : 0;
      const c = tl | tr | br | bl;
      if (c === 0 || c === 15) continue;
      const T = key(x, y, 0);
      const B = key(x, y + 1, 0);
      const L = key(x, y, 1);
      const R = key(x + 1, y, 1);
      switch (c) {
        case 1:
        case 14:
          add(L, B);
          break;
        case 2:
        case 13:
          add(B, R);
          break;
        case 3:
        case 12:
          add(L, R);
          break;
        case 4:
        case 11:
          add(T, R);
          break;
        case 6:
        case 9:
          add(T, B);
          break;
        case 7:
        case 8:
          add(L, T);
          break;
        case 5:
          add(L, T);
          add(B, R);
          break;
        case 10:
          add(T, R);
          add(L, B);
          break;
      }
    }
  }
  const seen = new Set<number>();
  const loops: [number, number][][] = [];
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop: [number, number][] = [];
    let prev = -1;
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(pos(cur));
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !seen.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length > 6) loops.push(loop);
  }
  return loops;
}

function resample(loop: [number, number][], step: number) {
  const out: [number, number][] = [];
  let carry = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x0, y0] = loop[i];
    const [x1, y1] = loop[(i + 1) % loop.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    let d = carry;
    while (d < len) {
      const t = d / len;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      d += step;
    }
    carry = d - len;
  }
  const smooth = out.map((_, i) => {
    const a = out[(i - 1 + out.length) % out.length];
    const b = out[i];
    const c = out[(i + 1) % out.length];
    return [(a[0] + b[0] * 2 + c[0]) / 4, (a[1] + b[1] * 2 + c[1]) / 4] as [number, number];
  });
  return smooth;
}

export function FrostText({
  text,
  stagger = 0.09,
  duration = 1.6,
  thaw = false,
  className,
  ref,
  ...props
}: FrostTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.4 });
  const [failed, setFailed] = useState(false);
  const goal = useRef({ thaw, started: false, kick: () => {} });

  useEffect(() => {
    goal.current.thaw = thaw;
    goal.current.started = goal.current.started || inView;
    goal.current.kick();
  }, [thaw, inView]);

  useEffect(() => {
    const root = own.current;
    const textEl = glyphs.current;
    const canvas = surface.current;
    if (!root || !textEl || !canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    const work = document.createElement("canvas");
    const wctx = work.getContext("2d");
    const low = document.createElement("canvas");
    const lctx = low.getContext("2d");
    if (!ctx || !sctx || !wctx || !lctx) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    let W = 0;
    let H = 0;
    let bleed = 0;
    let scale = 1;
    let size = 16;
    let font = "";
    let list: Glyph[] = [];
    let dark = false;
    let line: Rgba = [0, 0.3, 0.6, 1];
    let face: Rgba = [0.6, 0.8, 1, 1];
    let needle: Rgba = [0.2, 0.4, 0.7, 1];
    let glint: Rgba = WHITE;
    let T = 0;
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let clock = 0;
    const control = goal.current;
    const per = Math.max(0.3, duration);
    const gap = Math.max(0, stagger);
    const total = () => Math.max(0, list.length - 1) * gap + per;

    const resolve = () => {
      const bg = toRgba("var(--background)", root);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.4;
      const brand = toRgba("var(--brand)", root);
      const strong = toRgba("var(--brand-strong)", root);
      if (dark) {
        line = mix(WHITE, brand, 0.1);
        face = mix(WHITE, brand, 0.42);
        needle = WHITE;
        glint = WHITE;
      } else {
        line = mix(strong, brand, 0.25);
        face = mix(brand, WHITE, 0.55);
        needle = strong;
        glint = WHITE;
      }
    };

    const texture = (g: Glyph, seed: string) => {
      const c = g.tex;
      c.width = g.bw;
      c.height = g.bh;
      const t = c.getContext("2d");
      if (!t) return;
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.clearRect(0, 0, g.bw, g.bh);
      t.setTransform(scale, 0, 0, scale, -g.bx, -g.by);
      t.font = font;
      t.letterSpacing = "0px";
      t.textBaseline = "alphabetic";
      t.fillStyle = css(face, dark ? 0.66 : 0.5);
      t.fillText(g.ch, g.x + bleed, g.baseline + bleed);
      t.globalCompositeOperation = "source-atop";
      const rng = createRng(seed);
      const x0 = g.bx / scale;
      const y0 = g.by / scale;
      const w = g.bw / scale;
      const h = g.bh / scale;
      const count = Math.round((w * h) / (size * size * 0.0035));
      t.lineCap = "round";
      for (let i = 0; i < count; i++) {
        const x = x0 + rng() * w;
        const y = y0 + rng() * h;
        const ang = (Math.floor(rng() * 6) * Math.PI) / 3 + (rng() - 0.5) * 0.12;
        const len = size * (0.018 + rng() * 0.05);
        const ex = x + Math.cos(ang) * len;
        const ey = y + Math.sin(ang) * len;
        t.strokeStyle = css(needle, (dark ? 0.25 : 0.2) + rng() * 0.35);
        t.lineWidth = Math.max(0.5, size * (0.004 + rng() * 0.004));
        t.beginPath();
        t.moveTo(x, y);
        t.lineTo(ex, ey);
        if (rng() < 0.4) {
          const mx = (x + ex) / 2;
          const my = (y + ey) / 2;
          for (const side of [-1, 1]) {
            const b = ang + side * (Math.PI / 3);
            t.moveTo(mx, my);
            t.lineTo(mx + Math.cos(b) * len * 0.45, my + Math.sin(b) * len * 0.45);
          }
        }
        t.stroke();
      }
      for (let i = 0; i < count * 0.25; i++) {
        t.fillStyle = css(glint, 0.35 + rng() * 0.5);
        const r = Math.max(0.4, size * 0.004);
        t.fillRect(x0 + rng() * w, y0 + rng() * h, r, r);
      }
      t.globalCompositeOperation = "source-over";
    };

    const build = (g: Glyph, index: number) => {
      const rng = createRng(`${text}|${index}|${g.ch}`);
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      if (scratch.width < g.bw) scratch.width = g.bw;
      if (scratch.height < g.bh) scratch.height = g.bh;
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      sctx.setTransform(scale, 0, 0, scale, -g.bx, -g.by);
      sctx.font = font;
      sctx.letterSpacing = "0px";
      sctx.textBaseline = "alphabetic";
      sctx.fillStyle = "#000";
      sctx.fillText(g.ch, g.x + bleed, g.baseline + bleed);
      const data = sctx.getImageData(0, 0, g.bw, g.bh).data;
      const inside = (px: number, py: number) => {
        const x = Math.round(px);
        const y = Math.round(py);
        if (x < 0 || y < 0 || x >= g.bw || y >= g.bh) return false;
        return data[(y * g.bw + x) * 4 + 3] > 128;
      };
      const loops = contours(data, g.bw, g.bh).map((l) => resample(l, Math.max(1.5, scale * 1.4)));
      const toCss = (p: [number, number]): [number, number] => [(p[0] + g.bx) / scale, (p[1] + g.by) / scale];
      g.edge = [];
      g.crystals = [];
      g.glints = [];
      let longest = 0;
      const timed: { loop: [number, number][]; arrive: Float32Array; dir: Int8Array }[] = [];
      for (const loop of loops) {
        const n = loop.length;
        const seeds = Math.max(1, Math.min(3, Math.round((n * 1.4) / (size * 1.1))));
        const arrive = new Float32Array(n).fill(Infinity);
        const dir = new Int8Array(n);
        const offset = Math.floor(rng() * n);
        for (let s = 0; s < seeds; s++) {
          const at = (offset + Math.floor((s / seeds) * n + rng() * (n / seeds) * 0.4)) % n;
          const delay = s === 0 ? 0 : rng() * n * 0.08;
          for (let i = 0; i < n; i++) {
            const fwd = (i - at + n) % n;
            const back = (at - i + n) % n;
            const d = Math.min(fwd, back) + delay;
            if (d < arrive[i]) {
              arrive[i] = d;
              dir[i] = fwd <= back ? 1 : -1;
            }
          }
        }
        for (let i = 0; i < n; i++) longest = Math.max(longest, arrive[i]);
        timed.push({ loop, arrive, dir });
      }
      const span = Math.max(1, longest);
      const width = Math.max(0.75, size * 0.011);
      for (const { loop, arrive, dir } of timed) {
        const n = loop.length;
        for (let i = 0; i < n; i++) {
          const a = toCss(loop[i]);
          const b = toCss(loop[(i + 1) % n]);
          const t = Math.min(arrive[i], arrive[(i + 1) % n]) / span;
          g.edge.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], t, w: width });
        }
        let next = 0;
        for (let i = 0; i < n; i++) {
          if (i < next) continue;
          next = i + Math.max(2, Math.round((size * (0.022 + rng() * 0.04)) / 1.4));
          const p = loop[i];
          const q = loop[(i + dir[i] + n) % n];
          const tx = q[0] - p[0];
          const ty = q[1] - p[1];
          const tl = Math.hypot(tx, ty) || 1;
          const ux = tx / tl;
          const uy = ty / tl;
          let nx = -uy;
          let ny = ux;
          if (inside(p[0] + nx * 2.5, p[1] + ny * 2.5)) {
            nx = -nx;
            ny = -ny;
          }
          const out = rng() < 0.46 ? 1 : -1;
          const lean = Math.PI / 6 + rng() * 0.25;
          const base = Math.atan2(ny * out, nx * out);
          const fwd = Math.atan2(uy, ux);
          let diff = fwd - base;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const ang = base + Math.sign(diff) * lean;
          const long = rng() < 0.07;
          const len = size * (long ? 0.05 + rng() * 0.05 : 0.009 + rng() * 0.018) * (out < 0 ? 1.15 : 1);
          const t0 = arrive[i] / span;
          const [sx, sy] = toCss(p);
          const ex = sx + Math.cos(ang) * len;
          const ey = sy + Math.sin(ang) * len;
          const w = Math.max(0.5, width * (long ? 0.85 : 0.65));
          g.crystals.push({ x0: sx, y0: sy, x1: ex, y1: ey, t: t0, w });
          const branches = long ? 2 + Math.floor(rng() * 2) : rng() < 0.3 ? 1 : 0;
          for (let b = 0; b < branches; b++) {
            const f = 0.3 + (b / Math.max(1, branches)) * 0.55 + rng() * 0.08;
            const bx = sx + (ex - sx) * f;
            const by = sy + (ey - sy) * f;
            const side = b % 2 ? 1 : -1;
            const ba = ang + side * (Math.PI / 3);
            const bl = len * (1 - f) * (0.45 + rng() * 0.35);
            g.crystals.push({
              x0: bx,
              y0: by,
              x1: bx + Math.cos(ba) * bl,
              y1: by + Math.sin(ba) * bl,
              t: t0 + f * 0.06,
              w: w * 0.75,
            });
          }
        }
      }
      for (let i = 0; i < 3; i++) {
        let tries = 0;
        while (tries++ < 40) {
          const px = rng() * g.bw;
          const py = rng() * g.bh;
          if (inside(px, py)) {
            g.glints.push([(px + g.bx) / scale, (py + g.by) / scale, rng() * Math.PI * 2]);
            break;
          }
        }
      }
      g.edgeSets = bucket(g.edge);
      g.crystalSets = bucket(g.crystals);
      g.done = null;
      texture(g, `${text}|tex|${index}`);
    };

    const layout = () => {
      const cs = getComputedStyle(textEl);
      size = parseFloat(cs.fontSize) || 16;
      font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      bleed = Math.ceil(size * 0.25 + 6);
      W = box.width / k + bleed * 2;
      H = box.height / k + bleed * 2;
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      const pw = Math.max(1, Math.ceil(W * scale));
      const ph = Math.max(1, Math.ceil(H * scale));
      canvas.width = pw;
      canvas.height = ph;
      work.width = pw;
      work.height = ph;
      canvas.style.left = `${-bleed}px`;
      canvas.style.top = `${-bleed}px`;
      canvas.style.width = `${pw / scale}px`;
      canvas.style.height = `${ph / scale}px`;
      list = [];
      const node = textEl.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.font = font;
      sctx.letterSpacing = "0px";
      const source = node.textContent ?? "";
      const range = document.createRange();
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
        sctx.font = font;
        const m = sctx.measureText(ch);
        const x = (rect.left - box.left) / k;
        const baseline = (rect.top - box.top) / k + m.fontBoundingBoxAscent;
        const margin = size * 0.24;
        const left = x + bleed - m.actualBoundingBoxLeft - margin;
        const right = x + bleed + m.actualBoundingBoxRight + margin;
        const top = baseline + bleed - m.actualBoundingBoxAscent - margin;
        const bottom = baseline + bleed + m.actualBoundingBoxDescent + margin;
        const bx = Math.floor(left * scale);
        const by = Math.floor(top * scale);
        list.push({
          ch,
          x,
          baseline,
          bx,
          by,
          bw: Math.max(2, Math.ceil(right * scale) - bx),
          bh: Math.max(2, Math.ceil(bottom * scale) - by),
          tex: document.createElement("canvas"),
          edge: [],
          crystals: [],
          edgeSets: [],
          crystalSets: [],
          done: null,
          glints: [],
        });
      }
      list.forEach((g, i) => build(g, i));
    };

    const strokeSet = (c: CanvasRenderingContext2D, sets: Needle[][], p: number, grow: number, color: string) => {
      c.strokeStyle = color;
      c.lineCap = "round";
      for (const b of sets) {
        if (!b.length || b[0].t > p) continue;
        c.lineWidth = b[0].w;
        c.beginPath();
        for (const n of b) {
          if (n.t > p) break;
          const f = grow <= 0 ? 1 : Math.min(1, (p - n.t) / grow);
          c.moveTo(n.x0, n.y0);
          c.lineTo(n.x0 + (n.x1 - n.x0) * f, n.y0 + (n.y1 - n.y0) * f);
        }
        c.stroke();
      }
    };

    const lines = (c: CanvasRenderingContext2D, g: Glyph, outline: number) => {
      strokeSet(c, g.edgeSets, outline * 1.02, 0.04, css(line, dark ? 0.92 : 0.9));
      strokeSet(c, g.crystalSets, outline * 1.02, 0.14, css(line, dark ? 0.7 : 0.62));
    };

    const finished = (g: Glyph) => {
      if (g.done) return g.done;
      const c = document.createElement("canvas");
      c.width = g.bw;
      c.height = g.bh;
      const d = c.getContext("2d");
      if (!d) return null;
      d.drawImage(g.tex, 0, 0);
      d.setTransform(scale, 0, 0, scale, -g.bx, -g.by);
      lines(d, g, 1);
      g.done = c;
      return c;
    };

    const drawGlyph = (g: Glyph, p: number) => {
      if (p <= 0) return;
      if (p >= 1) {
        const c = finished(g);
        if (c) {
          ctx.drawImage(c, g.bx, g.by);
          return;
        }
      }
      const outline = Math.min(1, p / 0.55);
      const fill = Math.max(0, Math.min(1, (p - 0.42) / 0.58));
      if (fill > 0) {
        wctx.setTransform(1, 0, 0, 1, 0, 0);
        wctx.globalCompositeOperation = "source-over";
        wctx.clearRect(g.bx, g.by, g.bw, g.bh);
        if (fill >= 1) {
          wctx.drawImage(g.tex, g.bx, g.by);
        } else {
          const lw = Math.ceil(g.bw / scale);
          const lh = Math.ceil(g.bh / scale);
          if (low.width < lw) low.width = lw;
          if (low.height < lh) low.height = lh;
          lctx.setTransform(1, 0, 0, 1, 0, 0);
          lctx.clearRect(0, 0, lw + 1, lh + 1);
          lctx.setTransform(1, 0, 0, 1, -g.bx / scale, -g.by / scale);
          lctx.font = font;
          lctx.letterSpacing = "0px";
          lctx.textBaseline = "alphabetic";
          lctx.lineJoin = "round";
          const eased = 1 - (1 - fill) ** 2;
          lctx.strokeStyle = "#000";
          lctx.lineWidth = size * 0.32 * eased + 0.5;
          lctx.strokeText(g.ch, g.x + bleed, g.baseline + bleed);
          wctx.imageSmoothingEnabled = true;
          wctx.drawImage(low, 0, 0, lw, lh, g.bx, g.by, lw * scale, lh * scale);
          wctx.globalCompositeOperation = "source-in";
          wctx.drawImage(g.tex, g.bx, g.by);
          wctx.globalCompositeOperation = "source-over";
        }
        ctx.drawImage(work, g.bx, g.by, g.bw, g.bh, g.bx, g.by, g.bw, g.bh);
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      lines(ctx, g, outline);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      list.forEach((g, i) => {
        const p = Math.max(0, Math.min(1, (T - i * gap) / per));
        drawGlyph(g, p);
      });
      if (T >= total()) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        for (const g of list) {
          for (const [x, y, phase] of g.glints) {
            const a = Math.max(0, Math.sin(clock * 1.3 + phase)) ** 6;
            if (a < 0.02) continue;
            const r = size * 0.035 * (0.6 + a * 0.4);
            ctx.globalAlpha = a * (dark ? 0.95 : 0.9);
            ctx.strokeStyle = css(glint, 1);
            ctx.lineWidth = Math.max(0.6, size * 0.006);
            ctx.beginPath();
            ctx.moveTo(x - r, y);
            ctx.lineTo(x + r, y);
            ctx.moveTo(x, y - r);
            ctx.lineTo(x, y + r);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    };

    const running = () => onScreen && document.visibilityState === "visible";
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      clock += dt;
      const g = control;
      const end = total();
      if (g.started) {
        if (g.thaw) T = Math.max(0, T - dt * 1.3);
        else T = Math.min(end, T + dt);
      }
      draw();
      const idle = !g.started || (g.thaw && T <= 0);
      raf = idle ? 0 : requestAnimationFrame(frame);
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

    control.kick = () => {
      if (!raf && running()) sync();
    };

    resolve();
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
      list.forEach((g, i) => {
        texture(g, `${text}|tex|${i}`);
        g.done = null;
      });
      draw();
    });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      fonts?.removeEventListener("loadingdone", onFonts);
      stopTheme();
      control.kick = () => {};
    };
  }, [text, stagger, duration, reduced]);

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block", className)}>
      <span ref={glyphs} className={cn(!failed && !reduced && "text-transparent motion-reduce:[color:inherit]")}>
        {text}
      </span>
      <canvas
        ref={surface}
        aria-hidden="true"
        className={cn("pointer-events-none absolute top-0 left-0 select-none", (failed || reduced) && "hidden")}
      />
    </span>
  );
}
