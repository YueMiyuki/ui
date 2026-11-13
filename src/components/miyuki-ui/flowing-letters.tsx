"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { onThemeChange, resolveColor } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface FlowingLettersProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  colors?: string[];
  lineWidth?: number;
  lineGap?: number;
  curve?: number;
  duration?: number;
  ref?: Ref<HTMLSpanElement>;
}

const DEFAULT_COLORS = ["var(--chart-2)", "var(--brand)", "var(--chart-3)"];

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

function transform(word: string, mode: string) {
  if (mode === "uppercase") return word.toUpperCase();
  if (mode === "lowercase") return word.toLowerCase();
  if (mode === "capitalize") return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}

const RENDERING: Record<string, CanvasTextRendering> = {
  optimizelegibility: "optimizeLegibility",
  optimizespeed: "optimizeSpeed",
  geometricprecision: "geometricPrecision",
};

function applyFont(ctx: CanvasRenderingContext2D, cs: CSSStyleDeclaration) {
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.fontKerning = cs.fontKerning === "none" ? "none" : "normal";
  ctx.textRendering = RENDERING[cs.textRendering.toLowerCase()] ?? "auto";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.direction = cs.direction === "rtl" ? "rtl" : "ltr";
}

export function FlowingLetters({
  text,
  colors = DEFAULT_COLORS,
  lineWidth = 2,
  lineGap = 6,
  curve = 18,
  duration = 5,
  className,
  ref,
  ...props
}: FlowingLettersProps) {
  const own = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion() === true;
  const [failed, setFailed] = useState(false);
  const colorKey = (colors.length > 0 ? colors : DEFAULT_COLORS).join("|");

  useLayoutEffect(() => {
    const root = own.current;
    const textEl = glyphs.current;
    const canvas = surface.current;
    if (!root || !textEl || !canvas) return;
    const ctx = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const wash = document.createElement("canvas");
    const mctx = mask.getContext("2d");
    const wctx = wash.getContext("2d");
    if (!ctx || !mctx || !wctx) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    const list = colorKey.split("|");
    let palette: string[] = [];
    let W = 0;
    let H = 0;
    let scale = 1;
    let wavelength = 200;
    let inkTop = 0;
    let inkBottom = 0;
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    let onScreen = true;

    const resolve = () => {
      palette = list.map((c) => resolveColor(c, root));
    };

    const layout = () => {
      const cs = getComputedStyle(textEl);
      const size = parseFloat(cs.fontSize) || 16;
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      const bleed = Math.ceil(size * 0.35 + 2);
      W = box.width / k + bleed * 2;
      H = box.height / k + bleed * 2;
      wavelength = Math.max(80, size * 1.9);
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      const pw = Math.max(1, Math.ceil(W * scale));
      const ph = Math.max(1, Math.ceil(H * scale));
      canvas.style.left = `${-bleed}px`;
      canvas.style.top = `${-bleed}px`;
      canvas.style.width = `${pw / scale}px`;
      canvas.style.height = `${ph / scale}px`;
      for (const c of [canvas, mask, wash]) {
        if (c.width !== pw) c.width = pw;
        if (c.height !== ph) c.height = ph;
      }

      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, pw, ph);
      mctx.setTransform(scale, 0, 0, scale, 0, 0);
      applyFont(mctx, cs);
      mctx.fillStyle = "#000";
      inkTop = Infinity;
      inkBottom = -Infinity;
      const node = textEl.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const source = node.textContent ?? "";
        for (const match of source.matchAll(/\S+/g)) {
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          const rect = range.getClientRects()[0];
          if (!rect) continue;
          const word = transform(match[0], cs.textTransform);
          const metrics = mctx.measureText(word);
          const x = (rect.left - box.left) / k + bleed;
          const y = (rect.top - box.top) / k + bleed + metrics.fontBoundingBoxAscent;
          mctx.fillText(word, x, y);
          inkTop = Math.min(inkTop, y - metrics.actualBoundingBoxAscent);
          inkBottom = Math.max(inkBottom, y + metrics.actualBoundingBoxDescent);
        }
      }
      if (!Number.isFinite(inkTop)) {
        inkTop = 0;
        inkBottom = H;
      }
    };

    const gradient = (c: CanvasRenderingContext2D, unit: number) => {
      if (palette.length < 2) return palette[0] ?? "#000";
      const g = c.createLinearGradient(0, inkTop * unit, 0, inkBottom * unit);
      palette.forEach((color, i) => g.addColorStop(i / (palette.length - 1), color));
      return g;
    };

    const tint = () => {
      wctx.setTransform(1, 0, 0, 1, 0, 0);
      wctx.globalCompositeOperation = "source-over";
      wctx.clearRect(0, 0, wash.width, wash.height);
      wctx.drawImage(mask, 0, 0);
      wctx.globalCompositeOperation = "source-in";
      wctx.fillStyle = gradient(wctx, scale);
      wctx.fillRect(0, 0, wash.width, wash.height);
    };

    const draw = () => {
      const pitch = Math.max(1, lineWidth + lineGap);
      const phase = (elapsed / (Math.max(0.5, duration) * 1000)) * Math.PI * 2;
      const kx = (Math.PI * 2) / wavelength;
      const step = 4;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineWidth = Math.max(0.5, lineWidth);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = gradient(ctx, 1);
      let row = 0;
      for (let y0 = -curve - pitch; y0 < H + curve + pitch; y0 += pitch, row++) {
        ctx.beginPath();
        for (let x = -step; x <= W + step; x += step) {
          const y =
            y0 +
            curve * (0.8 * Math.sin(kx * x - phase + row * 0.06) + 0.2 * Math.sin(2.3 * kx * x + phase * 1.7 + 1.1));
          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "destination-over";
      ctx.globalAlpha = 0.14;
      ctx.drawImage(wash, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const running = () => !reduced && onScreen && document.visibilityState === "visible";
    const frame = () => {
      const now = performance.now();
      elapsed += Math.min(100, now - last);
      last = now;
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
      tint();
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
      tint();
      draw();
    });
    let density: MediaQueryList | null = null;
    const onDensity = () => {
      refresh();
      watchDensity();
    };
    const watchDensity = () => {
      density?.removeEventListener("change", onDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      density.addEventListener("change", onDensity);
    };
    watchDensity();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      visible.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      fonts?.removeEventListener("loadingdone", onFonts);
      stopTheme();
      density?.removeEventListener("change", onDensity);
    };
  }, [text, colorKey, lineWidth, lineGap, curve, duration, reduced]);

  return (
    <span {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block", className)}>
      <span ref={glyphs} className={cn(hydrated && !failed && "text-transparent")}>
        {text}
      </span>
      <canvas ref={surface} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 select-none" />
    </span>
  );
}
