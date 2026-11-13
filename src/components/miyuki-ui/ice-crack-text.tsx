"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface IceCrackTextProps extends Omit<ComponentProps<"span">, "children"> {
  children: string;
  seed?: number | string;
  ref?: Ref<HTMLSpanElement>;
}

interface Crack {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t0: number;
  t1: number;
  w: number;
}

interface Origin {
  x: number;
  y: number;
  born: number;
  cracks: Crack[];
}

interface Shard {
  img: HTMLCanvasElement;
  ox: number;
  oy: number;
  cx: number;
  cy: number;
  edge: [number, number][];
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  flip: number;
  vflip: number;
  delay: number;
  z: number;
}

const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
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

function clipPolygon(poly: [number, number][], ax: number, ay: number, bx: number, by: number) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const nx = bx - ax;
  const ny = by - ay;
  const side = (p: [number, number]) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp <= 0 !== sq <= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

export function IceCrackText({
  children,
  seed = 1,
  className,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  ref,
  ...props
}: IceCrackTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const [failed, setFailed] = useState(false);
  const api = useRef<{
    hover: (x: number, y: number) => void;
    leave: () => void;
    shatter: (x: number, y: number) => void;
  }>({
    hover: () => {},
    leave: () => {},
    shatter: () => {},
  });

  useEffect(() => {
    const root = own.current;
    const textEl = glyphs.current;
    const canvas = surface.current;
    if (!root || !textEl || !canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const ice = document.createElement("canvas");
    const glow = document.createElement("canvas");
    const tmp = document.createElement("canvas");
    const mctx = mask.getContext("2d", { willReadFrequently: true });
    const ictx = ice.getContext("2d");
    const gctx = glow.getContext("2d");
    const tctx = tmp.getContext("2d");
    const canFilter = "filter" in CanvasRenderingContext2D.prototype;
    if (!ctx || !mctx || !ictx || !gctx || !tctx) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    let W = 0;
    let H = 0;
    let bleed = 0;
    let scale = 1;
    let size = 16;
    let pw = 1;
    let ph = 1;
    let alpha = new Uint8Array(0);
    let ink = { left: 0, top: 0, right: 0, bottom: 0 };
    let lines: { top: number; bottom: number }[] = [];
    let dark = false;
    let pale: Rgba = WHITE;
    let deep: Rgba = [0, 0.3, 0.6, 1];
    let mid: Rgba = [0.3, 0.6, 0.9, 1];
    let crackDark: Rgba = [0, 0.1, 0.3, 1];
    let origins: Origin[] = [];
    let made = 0;
    let hovering = false;
    let heal = 1;
    let shards: Shard[] = [];
    let shatterAt = -1;
    let seam = 0;
    let seamEdges: [number, number][][] = [];
    let clock = 0;
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    const handle = api.current;

    const resolve = () => {
      const bg = toRgba("var(--background)", root);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.4;
      const brand = toRgba("var(--brand)", root);
      const strong = toRgba("var(--brand-strong)", root);
      const sea = toRgba("var(--chart-2)", root);
      const fg = toRgba("var(--foreground)", root);
      if (dark) {
        pale = mix(WHITE, brand, 0.1);
        mid = mix(brand, sea, 0.18);
        deep = mix(brand, [0.05, 0.12, 0.3, 1], 0.38);
        crackDark = mix(brand, [0.02, 0.05, 0.14, 1], 0.7);
      } else {
        pale = mix(mix(brand, sea, 0.25), WHITE, 0.5);
        mid = mix(brand, sea, 0.12);
        deep = mix(strong, fg, 0.42);
        crackDark = mix(strong, fg, 0.65);
      }
    };

    const paintIce = () => {
      for (const c of [ice, glow, tmp]) {
        c.width = pw;
        c.height = ph;
      }
      ictx.setTransform(1, 0, 0, 1, 0, 0);
      ictx.clearRect(0, 0, pw, ph);
      ictx.globalCompositeOperation = "source-over";
      ictx.drawImage(mask, 0, 0);
      ictx.globalCompositeOperation = "source-in";
      ictx.setTransform(scale, 0, 0, scale, 0, 0);
      for (const L of lines) {
        const g = ictx.createLinearGradient(0, L.top + bleed, 0, L.bottom + bleed);
        g.addColorStop(0, css(pale));
        g.addColorStop(0.45, css(mid));
        g.addColorStop(1, css(deep));
        ictx.fillStyle = g;
        ictx.fillRect(0, L.top + bleed - size, W, L.bottom - L.top + size * 2);
      }
      ictx.globalCompositeOperation = "source-atop";
      const rng = createRng(`${seed}|texture`);
      ictx.lineCap = "round";
      for (let i = 0; i < Math.round((ink.right - ink.left) / (size * 0.12)); i++) {
        const x = ink.left + bleed + rng() * (ink.right - ink.left);
        const y = ink.top + bleed + rng() * (ink.bottom - ink.top);
        const len = size * (0.08 + rng() * 0.22);
        const ang = -0.95 + rng() * 0.3;
        ictx.strokeStyle = `rgba(255, 255, 255, ${0.08 + rng() * 0.12})`;
        ictx.lineWidth = Math.max(0.6, size * 0.006);
        ictx.beginPath();
        ictx.moveTo(x, y);
        ictx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ictx.stroke();
      }
      for (let i = 0; i < Math.round((ink.right - ink.left) / (size * 0.2)); i++) {
        const x = ink.left + bleed + rng() * (ink.right - ink.left);
        const y = ink.top + bleed + (0.35 + rng() * 0.65) * (ink.bottom - ink.top);
        const r = size * (0.005 + rng() * 0.012);
        ictx.fillStyle = `rgba(255, 255, 255, ${0.25 + rng() * 0.3})`;
        ictx.beginPath();
        ictx.arc(x, y, r, 0, Math.PI * 2);
        ictx.fill();
      }
      ictx.setTransform(1, 0, 0, 1, 0, 0);
      const bevel = (dx: number, dy: number, color: string, a: number) => {
        tctx.setTransform(1, 0, 0, 1, 0, 0);
        tctx.globalCompositeOperation = "source-over";
        tctx.clearRect(0, 0, pw, ph);
        tctx.drawImage(mask, 0, 0);
        tctx.globalCompositeOperation = "destination-out";
        tctx.drawImage(mask, dx, dy);
        tctx.globalCompositeOperation = "source-in";
        tctx.fillStyle = color;
        tctx.fillRect(0, 0, pw, ph);
        ictx.globalAlpha = a;
        ictx.drawImage(tmp, 0, 0);
        ictx.globalAlpha = 1;
      };
      const d = Math.max(1.5, size * 0.016 * scale);
      ictx.globalCompositeOperation = "source-atop";
      bevel(d * 2.4, d * 2.4, "#fff", dark ? 0.08 : 0.1);
      bevel(d, d, "#fff", dark ? 0.5 : 0.55);
      bevel(-d, -d, css(deep), dark ? 0.5 : 0.38);
      ictx.globalCompositeOperation = "source-over";

      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, pw, ph);
      if (dark) {
        const r = Math.max(2, size * 0.06 * scale);
        if (canFilter) {
          gctx.filter = `blur(${r}px)`;
          gctx.drawImage(mask, 0, 0);
          gctx.filter = "none";
        } else {
          // Safari has no canvas filter: blur through a shadow cast from off the canvas
          gctx.shadowColor = "#fff";
          gctx.shadowBlur = r * 2;
          gctx.shadowOffsetX = pw + r * 4;
          gctx.drawImage(mask, -(pw + r * 4), 0);
          gctx.shadowColor = "transparent";
          gctx.shadowOffsetX = 0;
        }
        gctx.globalCompositeOperation = "source-in";
        gctx.fillStyle = css(mid, 0.38);
        gctx.fillRect(0, 0, pw, ph);
        gctx.globalCompositeOperation = "source-over";
      }
    };

    const layout = () => {
      const cs = getComputedStyle(textEl);
      size = parseFloat(cs.fontSize) || 16;
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      bleed = Math.ceil(size * 0.6 + 12);
      W = box.width / k + bleed * 2;
      H = box.height / k + bleed * 2;
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      pw = Math.max(1, Math.ceil(W * scale));
      ph = Math.max(1, Math.ceil(H * scale));
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.left = `${-bleed}px`;
      canvas.style.top = `${-bleed}px`;
      canvas.style.width = `${pw / scale}px`;
      canvas.style.height = `${ph / scale}px`;
      mask.width = pw;
      mask.height = ph;
      mctx.setTransform(scale, 0, 0, scale, 0, 0);
      mctx.clearRect(0, 0, W, H);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      mctx.font = font;
      mctx.letterSpacing = "0px";
      mctx.textBaseline = "alphabetic";
      mctx.fillStyle = "#000";
      ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      lines = [];
      let lineTop = -Infinity;
      const node = textEl.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE) {
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
          const m = mctx.measureText(ch);
          const x = (rect.left - box.left) / k;
          const y = (rect.top - box.top) / k;
          const baseline = y + m.fontBoundingBoxAscent;
          mctx.fillText(ch, x + bleed, baseline + bleed);
          const top = baseline - m.actualBoundingBoxAscent;
          const bottom = baseline + m.actualBoundingBoxDescent;
          ink.left = Math.min(ink.left, x - m.actualBoundingBoxLeft);
          ink.right = Math.max(ink.right, x + m.actualBoundingBoxRight);
          ink.top = Math.min(ink.top, top);
          ink.bottom = Math.max(ink.bottom, bottom);
          if (y > lineTop + rect.height / k / 2) {
            lines.push({ top, bottom });
            lineTop = y;
          } else {
            const L = lines[lines.length - 1];
            L.top = Math.min(L.top, top);
            L.bottom = Math.max(L.bottom, bottom);
          }
        }
      }
      if (!Number.isFinite(ink.left)) ink = { left: 0, top: 0, right: W - bleed * 2, bottom: H - bleed * 2 };
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      const data = mctx.getImageData(0, 0, pw, ph).data;
      alpha = new Uint8Array(pw * ph);
      for (let i = 0; i < pw * ph; i++) alpha[i] = data[i * 4 + 3];
      paintIce();
      origins = [];
      shards = [];
      shatterAt = -1;
    };

    const inside = (x: number, y: number) => {
      const px = Math.round((x + bleed) * scale);
      const py = Math.round((y + bleed) * scale);
      if (px < 0 || py < 0 || px >= pw || py >= ph) return false;
      return alpha[py * pw + px] > 100;
    };

    const grow = (x: number, y: number) => {
      const rng = createRng(`${seed}|crack|${made++}`);
      const cracks: Crack[] = [];
      const speed = size * 7;
      const branch = (sx: number, sy: number, ang: number, length: number, t: number, w: number, depth: number) => {
        let px = sx;
        let py = sy;
        let a = ang;
        let travelled = 0;
        let time = t;
        while (travelled < length) {
          const step = size * (0.035 + rng() * 0.05);
          a += (rng() - 0.5) * 0.7;
          const nx = px + Math.cos(a) * step;
          const ny = py + Math.sin(a) * step;
          const slow = 1 + (travelled / length) * 1.6;
          const dt = (step / speed) * slow;
          const fade = 1 - (travelled / length) * 0.65;
          cracks.push({ x0: px, y0: py, x1: nx, y1: ny, t0: time, t1: time + dt, w: w * fade });
          time += dt;
          travelled += step;
          px = nx;
          py = ny;
          if (depth < 2 && rng() < 0.2) {
            const side = rng() < 0.5 ? -1 : 1;
            branch(
              px,
              py,
              a + side * (0.45 + rng() * 0.5),
              (length - travelled) * (0.35 + rng() * 0.4),
              time,
              w * fade * 0.7,
              depth + 1,
            );
          }
        }
      };
      const rays = 3 + Math.floor(rng() * 3);
      const turn = rng() * Math.PI * 2;
      for (let i = 0; i < rays; i++) {
        const ang = turn + (i / rays) * Math.PI * 2 + (rng() - 0.5) * 0.9;
        branch(x, y, ang, size * (0.45 + rng() * 0.8), clock, 1, 0);
      }
      for (let i = 0; i < 7; i++) {
        const ang = rng() * Math.PI * 2;
        const len = size * (0.02 + rng() * 0.045);
        cracks.push({
          x0: x,
          y0: y,
          x1: x + Math.cos(ang) * len,
          y1: y + Math.sin(ang) * len,
          t0: clock,
          t1: clock + 0.04,
          w: 0.8,
        });
      }
      origins.push({ x, y, born: clock, cracks });
      if (origins.length > 9) origins.shift();
    };

    const drawCracks = (c: CanvasRenderingContext2D, alphaMul: number) => {
      if (alphaMul <= 0.01 || !origins.length) return;
      c.lineCap = "round";
      const base = Math.max(0.7, size * 0.0085);
      const light = dark ? "rgba(240, 250, 255," : "rgba(255, 255, 255,";
      for (const o of origins) {
        const bruise = Math.min(1, (clock - o.born) / 0.25) * alphaMul;
        const g = c.createRadialGradient(o.x + bleed, o.y + bleed, 0, o.x + bleed, o.y + bleed, size * 0.12);
        g.addColorStop(0, `${light} ${0.55 * bruise})`);
        g.addColorStop(1, `${light} 0)`);
        c.fillStyle = g;
        c.fillRect(o.x + bleed - size * 0.12, o.y + bleed - size * 0.12, size * 0.24, size * 0.24);
        for (const pass of [0, 1]) {
          c.beginPath();
          for (const k of o.cracks) {
            if (clock < k.t0) continue;
            const t = Math.min(1, (clock - k.t0) / Math.max(1e-3, k.t1 - k.t0));
            const ex = k.x0 + (k.x1 - k.x0) * t;
            const ey = k.y0 + (k.y1 - k.y0) * t;
            const off = pass === 0 ? 0 : base * 0.9;
            c.moveTo(k.x0 + bleed + off, k.y0 + bleed + off * 0.6);
            c.lineTo(ex + bleed + off, ey + bleed + off * 0.6);
          }
          if (pass === 0) {
            c.strokeStyle = dark ? css(crackDark, 0.85 * alphaMul) : css(crackDark, 0.78 * alphaMul);
            c.lineWidth = base * 1.25;
          } else {
            c.strokeStyle = `${light} ${(dark ? 0.85 : 0.75) * alphaMul})`;
            c.lineWidth = base * 0.85;
          }
          c.stroke();
        }
      }
    };

    const sheen = (c: CanvasRenderingContext2D) => {
      const span = ink.right - ink.left + size * 2;
      const pos = ((clock / 9) % 1) * span * 1.6 - span * 0.3 + ink.left;
      const g = c.createLinearGradient(
        pos + bleed - size * 0.5,
        ink.top + bleed,
        pos + bleed + size * 0.5,
        ink.bottom + bleed,
      );
      g.addColorStop(0, "rgba(255, 255, 255, 0)");
      g.addColorStop(0.5, `rgba(255, 255, 255, ${dark ? 0.16 : 0.22})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    };

    const shatter = (x: number, y: number) => {
      if (shatterAt >= 0) return;
      const rng = createRng(`${seed}|shards|${made++}`);
      const sites: [number, number][] = [];
      const area = (ink.right - ink.left) * (ink.bottom - ink.top);
      const n = Math.max(30, Math.min(140, Math.round(area / (size * size * 0.032))));
      for (let i = 0; i < n; i++) {
        if (i < n * 0.45) {
          const r = size * 0.5 * Math.sqrt(-2 * Math.log(1 - rng() * 0.98));
          const t = rng() * Math.PI * 2;
          sites.push([x + Math.cos(t) * r, y + Math.sin(t) * r * 0.8]);
        } else {
          sites.push([ink.left + rng() * (ink.right - ink.left), ink.top + rng() * (ink.bottom - ink.top)]);
        }
      }
      const pad = size * 0.1;
      const frame: [number, number][] = [
        [ink.left - pad, ink.top - pad],
        [ink.right + pad, ink.top - pad],
        [ink.right + pad, ink.bottom + pad],
        [ink.left - pad, ink.bottom + pad],
      ];
      const scene = document.createElement("canvas");
      scene.width = pw;
      scene.height = ph;
      const sctx = scene.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(ice, 0, 0);
      sctx.globalCompositeOperation = "source-atop";
      sctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawCracks(sctx, heal);
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      shards = [];
      seamEdges = [];
      for (const s of sites) {
        let poly = frame;
        const near = sites
          .filter((o) => o !== s)
          .map((o) => [o, (o[0] - s[0]) ** 2 + (o[1] - s[1]) ** 2] as const)
          .sort((p, q) => p[1] - q[1]);
        for (const [o] of near.slice(0, 28)) {
          poly = clipPolygon(poly, s[0], s[1], o[0], o[1]);
          if (poly.length < 3) break;
        }
        if (poly.length < 3) continue;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const [px, py] of poly) {
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
        const bx = Math.floor((minX + bleed) * scale) - 1;
        const by = Math.floor((minY + bleed) * scale) - 1;
        const bw = Math.ceil((maxX - minX) * scale) + 3;
        const bh = Math.ceil((maxY - minY) * scale) + 3;
        if (bw < 2 || bh < 2) continue;
        let filled = 0;
        for (let yy = Math.max(0, by); yy < Math.min(ph, by + bh) && filled < 4; yy += 2) {
          for (let xx = Math.max(0, bx); xx < Math.min(pw, bx + bw); xx += 2) {
            if (alpha[yy * pw + xx] > 80) {
              filled++;
              if (filled >= 4) break;
            }
          }
        }
        if (filled < 4) continue;
        const img = document.createElement("canvas");
        img.width = bw;
        img.height = bh;
        const c = img.getContext("2d");
        if (!c) continue;
        c.beginPath();
        poly.forEach(([px, py], i) => {
          const X = (px + bleed) * scale - bx;
          const Y = (py + bleed) * scale - by;
          if (i) c.lineTo(X, Y);
          else c.moveTo(X, Y);
        });
        c.closePath();
        c.save();
        c.clip();
        c.drawImage(scene, -bx, -by);
        c.restore();
        c.globalCompositeOperation = "source-atop";
        c.strokeStyle = dark ? "rgba(240, 250, 255, 0.8)" : "rgba(255, 255, 255, 0.85)";
        c.lineWidth = Math.max(1, scale * size * 0.008);
        c.stroke();
        c.globalCompositeOperation = "source-over";
        let cx = 0;
        let cy = 0;
        for (const [px, py] of poly) {
          cx += px;
          cy += py;
        }
        cx /= poly.length;
        cy /= poly.length;
        const dx = cx - x;
        const dy = cy - y;
        const dist = Math.hypot(dx, dy) || 1;
        const push = Math.min(size * 0.85, (size * 1.6) / (1 + dist / (size * 0.6)));
        const spread = rng() * 0.6 + 0.7;
        seamEdges.push(poly);
        shards.push({
          img,
          ox: bx / scale - bleed,
          oy: by / scale - bleed,
          cx,
          cy,
          edge: poly,
          x: 0,
          y: 0,
          vx: (dx / dist) * push * spread + (rng() - 0.5) * size * 0.35,
          vy: (dy / dist) * push * spread * 0.8 - size * (0.05 + rng() * 0.3),
          a: 0,
          va: (rng() - 0.5) * 4.5,
          flip: 0,
          vflip: (rng() - 0.5) * 3.5,
          delay: rng() * 0.22 + (dist / (size * 4)) * 0.18,
          z: rng(),
        });
      }
      shards.sort((p, q) => p.z - q.z);
      origins = [];
      heal = 1;
      shatterAt = clock;
    };

    const updateShards = (dt: number) => {
      const t = clock - shatterAt;
      let settled = true;
      for (const s of shards) {
        const back = t > 1.15 + s.delay;
        if (!back) {
          const drag = Math.exp(-dt * (t < 0.35 ? 6.5 : 4));
          s.vx *= drag;
          s.vy *= drag;
          if (t > 0.35) s.vy += Math.sin(clock * 2.1 + s.z * 9) * size * 0.05 * dt;
          s.va *= Math.exp(-dt * 3.2);
          s.vflip *= Math.exp(-dt * 3);
          settled = false;
        } else {
          const k = 120;
          const damp = 2 * Math.sqrt(k) * 0.72;
          s.vx += (-k * s.x - damp * s.vx) * dt;
          s.vy += (-k * s.y - damp * s.vy) * dt;
          s.va += (-k * s.a - damp * s.va) * dt;
          s.vflip += (-k * s.flip - damp * s.vflip) * dt;
          if (Math.abs(s.x) + Math.abs(s.y) > 0.25 || Math.abs(s.a) > 0.004 || Math.abs(s.vx) + Math.abs(s.vy) > 2)
            settled = false;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.a += s.va * dt;
        s.flip += s.vflip * dt;
      }
      if (settled && t > 1.4) {
        shards = [];
        shatterAt = -1;
        seam = 1;
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, pw, ph);
      if (shatterAt >= 0) {
        for (const s of shards) {
          const fx = Math.cos(s.flip);
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          ctx.translate(s.cx + bleed + s.x, s.cy + bleed + s.y);
          ctx.rotate(s.a);
          ctx.scale(0.35 + 0.65 * Math.abs(fx), 1);
          ctx.translate(-(s.cx + bleed), -(s.cy + bleed));
          ctx.globalAlpha = 0.75 + 0.25 * Math.abs(fx);
          ctx.drawImage(s.img, s.ox + bleed, s.oy + bleed, s.img.width / scale, s.img.height / scale);
        }
        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        return;
      }
      if (dark) ctx.drawImage(glow, 0, 0);
      ctx.drawImage(ice, 0, 0);
      ctx.globalCompositeOperation = "source-atop";
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      sheen(ctx);
      drawCracks(ctx, heal);
      if (seam > 0.01) {
        ctx.beginPath();
        for (const poly of seamEdges) {
          poly.forEach(([px, py], i) => (i ? ctx.lineTo(px + bleed, py + bleed) : ctx.moveTo(px + bleed, py + bleed)));
          ctx.closePath();
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * seam})`;
        ctx.lineWidth = Math.max(0.8, size * 0.007);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const running = () => onScreen && document.visibilityState === "visible";
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      clock += dt;
      if (!hovering && origins.length) {
        heal -= dt / 1.6;
        if (heal <= 0) {
          origins = [];
          heal = 1;
        }
      }
      if (seam > 0) seam = Math.max(0, seam - dt / 0.45);
      if (shatterAt >= 0) updateShards(dt);
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

    handle.hover = (x: number, y: number) => {
      hovering = true;
      if (shatterAt >= 0) return;
      if (heal < 1 && origins.length) heal = Math.min(1, heal + 0.5);
      if (!inside(x, y)) return;
      const near = origins.some((o) => Math.hypot(o.x - x, o.y - y) < size * 0.42);
      if (!near) grow(x, y);
    };
    handle.leave = () => {
      hovering = false;
    };
    handle.shatter = (x: number, y: number) => shatter(x, y);

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
      paintIce();
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
      handle.hover = () => {};
      handle.leave = () => {};
      handle.shatter = () => {};
    };
  }, [children, seed, reduced]);

  const live = hydrated && !reduced && !failed;
  const local = (clientX: number, clientY: number) => {
    const root = own.current;
    if (!root) return null;
    const box = root.getBoundingClientRect();
    const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
    return { x: (clientX - box.left) / k, y: (clientY - box.top) / k };
  };

  return (
    <span
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative inline-block", className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        const p = live ? local(event.clientX, event.clientY) : null;
        if (p) api.current.hover(p.x, p.y);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        api.current.leave();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const p = live ? local(event.clientX, event.clientY) : null;
        if (p) api.current.shatter(p.x, p.y);
      }}
    >
      <span ref={glyphs} className={cn(live && "text-transparent")}>
        {children}
      </span>
      <canvas
        ref={surface}
        aria-hidden="true"
        className={cn("pointer-events-none absolute top-0 left-0 select-none", !live && "hidden")}
      />
    </span>
  );
}
