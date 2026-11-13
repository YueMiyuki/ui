"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface TideTextProps extends Omit<ComponentProps<"span">, "children"> {
  children: string;
  value?: number;
  scroll?: boolean;
  color?: string;
  ref?: Ref<HTMLSpanElement>;
}

interface Glyph {
  ch: string;
  x: number;
  baseline: number;
  top: number;
  bottom: number;
  right: number;
  line: number;
}

interface Line {
  left: number;
  right: number;
  top: number;
  bottom: number;
  dx: number;
  h: Float32Array;
  v: Float32Array;
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

function fontOf(cs: CSSStyleDeclaration) {
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

function measure(root: HTMLElement, text: HTMLElement, ctx: CanvasRenderingContext2D, k: number): Glyph[] {
  const node = text.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return [];
  const cs = getComputedStyle(text);
  ctx.font = fontOf(cs);
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const box = root.getBoundingClientRect();
  const source = node.textContent ?? "";
  const range = document.createRange();
  const out: Glyph[] = [];
  let line = -1;
  let lineTop = -Infinity;
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
    const m = ctx.measureText(ch);
    const y = (rect.top - box.top) / k;
    if (y > lineTop + rect.height / k / 2) {
      line++;
      lineTop = y;
    }
    const baseline = y + m.fontBoundingBoxAscent;
    out.push({
      ch,
      x: (rect.left - box.left) / k,
      baseline,
      top: baseline - m.actualBoundingBoxAscent,
      bottom: baseline + m.actualBoundingBoxDescent,
      right: (rect.right - box.left) / k,
      line,
    });
  }
  return out;
}

function erode(src: Uint8ClampedArray, w: number, h: number, r: number) {
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = src[i * 4 + 3];
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 255;
      for (let d = -r; d <= r && m > 0; d++) {
        const xx = x + d;
        const v = xx < 0 || xx >= w ? 0 : a[row + xx];
        if (v < m) m = v;
      }
      tmp[row + x] = m;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 255;
      for (let d = -r; d <= r && m > 0; d++) {
        const yy = y + d;
        const v = yy < 0 || yy >= h ? 0 : tmp[yy * w + x];
        if (v < m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return { a, out };
}

const mix = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  1,
];
const css = (c: Rgba, alpha = 1) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${alpha})`;

export function TideText({
  children,
  value,
  scroll = true,
  color = "var(--brand)",
  className,
  ref,
  ...props
}: TideTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const [failed, setFailed] = useState(false);
  const target = useRef<number | null>(null);
  const controlled = value !== undefined;
  const live = hydrated && !reduced && !failed;

  useEffect(() => {
    target.current = controlled ? Math.max(0, Math.min(100, value)) / 100 : null;
  }, [controlled, value]);

  useEffect(() => {
    const root = own.current;
    const textEl = glyphs.current;
    const canvas = surface.current;
    if (!root || !textEl || !canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const rim = document.createElement("canvas");
    const mctx = mask.getContext("2d", { willReadFrequently: true });
    const rctx = rim.getContext("2d");
    if (!ctx || !mctx || !rctx) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    let W = 0;
    let H = 0;
    let scale = 1;
    let bleed = 0;
    let size = 16;
    let lines: Line[] = [];
    let ink: Rgba = [0, 0, 0, 1];
    let water: Rgba = [0, 0.4, 0.8, 1];
    let dark = false;
    let level = 0;
    let speed = 0;
    let seeded = false;
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let clock = 0;
    let acc = 0;
    const bubbles: { x: number; y: number; r: number; line: number; vy: number; life: number }[] = [];

    const resolve = () => {
      ink = toRgba(getComputedStyle(root).color, root);
      water = toRgba(color, root);
      const bg = toRgba("var(--background)", root);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.4;
    };

    const tintRim = () => {
      rctx.setTransform(1, 0, 0, 1, 0, 0);
      rctx.globalCompositeOperation = "source-in";
      rctx.fillStyle = css(ink, dark ? 0.92 : 0.88);
      rctx.fillRect(0, 0, rim.width, rim.height);
      rctx.globalCompositeOperation = "source-over";
    };

    let scroller: HTMLElement | null = null;
    const findScroller = () => {
      scroller = null;
      for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          scroller = el;
          return;
        }
      }
    };
    const scrollProgress = () => {
      const r = root.getBoundingClientRect();
      const frame = scroller?.getBoundingClientRect();
      const top = frame ? frame.top : 0;
      const height = frame ? frame.height : window.innerHeight || 1;
      const span = Math.max(1, height - r.height);
      return Math.max(0, Math.min(1, (top + height - r.bottom) / span));
    };

    const goal = () => target.current ?? (scroll ? scrollProgress() : 0.5);

    const layout = () => {
      findScroller();
      const cs = getComputedStyle(textEl);
      size = parseFloat(cs.fontSize) || 16;
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      bleed = Math.ceil(size * 0.2 + 4);
      W = box.width / k + bleed * 2;
      H = box.height / k + bleed * 2;
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      const pw = Math.max(1, Math.ceil(W * scale));
      const ph = Math.max(1, Math.ceil(H * scale));
      canvas.style.left = `${-bleed}px`;
      canvas.style.top = `${-bleed}px`;
      canvas.style.width = `${pw / scale}px`;
      canvas.style.height = `${ph / scale}px`;
      for (const c of [canvas, mask, rim]) {
        c.width = pw;
        c.height = ph;
      }

      const list = measure(root, textEl, mctx, k);
      mctx.setTransform(scale, 0, 0, scale, 0, 0);
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = "#000";
      for (const g of list) mctx.fillText(g.ch, g.x + bleed, g.baseline + bleed);
      mctx.setTransform(1, 0, 0, 1, 0, 0);

      const stroke = Math.max(1.15, Math.min(2.6, size * 0.019));
      const r = Math.max(1, Math.round(stroke * scale));
      const data = mctx.getImageData(0, 0, pw, ph);
      const { a, out } = erode(data.data, pw, ph, r);
      const img = rctx.createImageData(pw, ph);
      for (let i = 0; i < pw * ph; i++) {
        img.data[i * 4 + 3] = Math.max(0, a[i] - out[i]);
      }
      rctx.putImageData(img, 0, 0);
      tintRim();

      const old = lines;
      lines = [];
      for (const g of list) {
        const L = (lines[g.line] ??= {
          left: Infinity,
          right: -Infinity,
          top: Infinity,
          bottom: -Infinity,
          dx: 6,
          h: new Float32Array(0),
          v: new Float32Array(0),
        });
        L.left = Math.min(L.left, g.x);
        L.right = Math.max(L.right, g.right);
        L.top = Math.min(L.top, g.top);
        L.bottom = Math.max(L.bottom, g.bottom);
      }
      lines = lines.filter(Boolean);
      for (const [i, L] of lines.entries()) {
        const n = Math.max(4, Math.ceil((L.right - L.left) / 6) + 1);
        L.dx = (L.right - L.left) / (n - 1);
        L.h = new Float32Array(n);
        L.v = new Float32Array(n);
        const prev = old[i];
        if (prev && prev.h.length > 1) {
          for (let j = 0; j < n; j++) {
            const f = (j / (n - 1)) * (prev.h.length - 1);
            L.h[j] = prev.h[Math.round(f)];
            L.v[j] = prev.v[Math.round(f)];
          }
        }
      }
    };

    const ambient = (x: number, t: number) =>
      size * (0.017 * Math.sin(x / (size * 0.42) - t * 1.9) + 0.01 * Math.sin(x / (size * 0.23) + t * 2.7 + 1.3));

    const step = (dt: number, want: number) => {
      const kLevel = 20;
      const prevSpeed = speed;
      speed += (-(level - want) * kLevel - speed * 5.6) * dt;
      level += speed * dt;
      const push = (speed - prevSpeed) / Math.max(dt, 1e-4);
      for (const L of lines) {
        const n = L.h.length;
        const amp = size * 0.0085;
        for (let j = 0; j < n; j++) {
          const u = j / (n - 1);
          const mode = Math.cos(Math.PI * u) + 0.35 * Math.cos(Math.PI * 2 * u + 0.6);
          L.v[j] += push * amp * mode * dt * 60;
        }
        if (Math.random() < Math.abs(speed) * dt * 40) {
          const j = Math.floor(Math.random() * n);
          const kick = size * (0.6 + Math.random()) * Math.min(1.5, Math.abs(speed));
          L.v[j] -= kick;
          if (j > 0) L.v[j - 1] -= kick * 0.5;
          if (j < n - 1) L.v[j + 1] -= kick * 0.5;
        }
        const c2 = (size * 3.6) ** 2;
        const pull = 6;
        const damp = 1.35;
        for (let j = 0; j < n; j++) {
          const left = L.h[j > 0 ? j - 1 : j + 1];
          const right = L.h[j < n - 1 ? j + 1 : j - 1];
          const lap = (left + right - 2 * L.h[j]) / (L.dx * L.dx);
          L.v[j] += (c2 * lap - pull * L.h[j] - damp * L.v[j]) * dt;
        }
        for (let j = 0; j < n; j++) {
          L.h[j] += L.v[j] * dt;
          const cap = size * 0.16;
          if (L.h[j] > cap) L.h[j] = cap;
          if (L.h[j] < -cap) L.h[j] = -cap;
        }
      }
      if (Math.abs(speed) > 0.05 && Math.random() < Math.abs(speed) * dt * 18 && lines.length) {
        const li = Math.floor(Math.random() * lines.length);
        const L = lines[li];
        bubbles.push({
          x: L.left + Math.random() * (L.right - L.left),
          y: L.bottom - Math.random() * size * 0.1,
          r: size * (0.008 + Math.random() * 0.014),
          line: li,
          vy: size * (0.5 + Math.random() * 0.6),
          life: 0,
        });
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.life += dt;
        b.y -= b.vy * dt;
        b.x += Math.sin(b.life * 9 + i) * size * 0.01;
        const L = lines[b.line];
        if (!L || b.y < surfaceY(L, b.x) + b.r || b.life > 4) bubbles.splice(i, 1);
      }
    };

    const surfaceY = (L: Line, x: number) => {
      const depth = L.bottom - L.top;
      const m = size * 0.05;
      const base = L.bottom + m - (depth + m * 2) * level;
      const f = Math.max(0, Math.min(L.h.length - 1, (x - L.left) / L.dx));
      const j = Math.floor(f);
      const t = f - j;
      const h = L.h[j] * (1 - t) + (L.h[Math.min(L.h.length - 1, j + 1)] ?? 0) * t;
      return base + h + ambient(x, clock);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, bleed * scale, bleed * scale);
      ctx.fillStyle = css(ink, dark ? 0.05 : 0.035);
      ctx.fillRect(-bleed, -bleed, W, H);
      const lift = dark ? mix(water, [1, 1, 1, 1], 0.1) : mix(water, [1, 1, 1, 1], 0.12);
      const deep = dark ? mix(water, [0.02, 0.06, 0.16, 1], 0.6) : mix(water, [0.02, 0.07, 0.2, 1], 0.5);
      const meniscus = dark ? mix(water, [1, 1, 1, 1], 0.7) : mix(water, [1, 1, 1, 1], 0.62);
      for (const L of lines) {
        const pad = size * 0.1;
        const x0 = L.left - pad;
        const x1 = L.right + pad;
        const stepX = 3;
        const trace = (offset: number) => {
          ctx.beginPath();
          for (let x = x0; x <= x1 + stepX; x += stepX) {
            const y = surfaceY(L, Math.min(x, x1)) + offset;
            if (x === x0) ctx.moveTo(x, y);
            else ctx.lineTo(Math.min(x, x1), y);
          }
        };
        trace(0);
        ctx.lineTo(x1, L.bottom + pad);
        ctx.lineTo(x0, L.bottom + pad);
        ctx.closePath();
        const yTop = Math.min(L.bottom, surfaceY(L, (L.left + L.right) / 2));
        const g = ctx.createLinearGradient(0, yTop, 0, L.bottom + pad);
        g.addColorStop(0, css(lift, 0.96));
        g.addColorStop(0.18, css(water, 0.97));
        g.addColorStop(1, css(deep, 1));
        ctx.fillStyle = g;
        ctx.fill();
        trace(Math.max(1.6, size * 0.026));
        ctx.lineWidth = Math.max(1.4, size * 0.03);
        ctx.strokeStyle = css(deep, dark ? 0.3 : 0.18);
        ctx.stroke();
        trace(0.3);
        ctx.lineWidth = Math.max(1, size * 0.013);
        ctx.strokeStyle = css(meniscus, dark ? 0.95 : 0.9);
        ctx.stroke();
      }
      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = dark ? "rgba(225, 245, 255, 0.55)" : "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = Math.max(0.7, b.r * 0.45);
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(rim, 0, 0);
    };

    const running = () => onScreen && document.visibilityState === "visible";
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      acc += dt;
      const fixed = 1 / 240;
      const want = goal();
      while (acc >= fixed) {
        step(fixed, want);
        acc -= fixed;
      }
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
      if (!seeded) {
        seeded = true;
        level = target.current === null && scroll ? scrollProgress() : 0;
      }
      draw();
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
      tintRim();
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
    };
  }, [children, color, scroll, reduced]);

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block", className)}>
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
