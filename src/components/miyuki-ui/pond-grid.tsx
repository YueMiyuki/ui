"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useEffectEvent, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface PondGridCell {
  row: number;
  column: number;
}

export interface PondGridProps extends ComponentProps<"div"> {
  cellSize?: number;
  color?: string;
  borderColor?: string;
  interactive?: boolean;
  idle?: boolean;
  onCellClick?: (cell: PondGridCell) => void;
}

const NIGHT = "--miyuki-pond-grid-night";
const SPEED = 7.5;
const RISE = 0.08;
const RELAX = 0.2;
const ECHO = { delay: 0.2, strength: 0.34 };
const MAX_RIPPLES = 16;
const DROP_EVERY: [number, number] = [2.4, 5.2];

const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";

const MASK =
  "linear-gradient(to bottom, #000 30%, rgb(0 0 0 / 0.5) 62%, transparent 94%), radial-gradient(ellipse 62% 110% at 50% 22%, #000 45%, transparent 100%)";

interface Ripple {
  x: number;
  y: number;
  start: number;
  strength: number;
  falloff: number;
  reach: number;
  live: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function pulse(tau: number) {
  if (tau <= 0) return 0;
  if (tau < RISE) {
    const k = tau / RISE;
    return k * k * (3 - 2 * k);
  }
  return Math.exp(-(tau - RISE) / RELAX);
}

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

export function PondGrid({
  cellSize = 56,
  color = "var(--brand)",
  borderColor = "var(--border-strong)",
  interactive = true,
  idle = true,
  onCellClick,
  className,
  children,
  ...props
}: PondGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const reportCell = useEffectEvent((cell: PondGridCell) => onCellClick?.(cell));

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    const size = Math.max(12, cellSize);
    const still = !!reduce;
    const rain = idle && !still;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let x0 = 0;
    let y0 = 0;
    let level = new Float32Array(0);
    let hover = new Float32Array(0);

    let night = false;
    let line = "";
    let edge = "";
    let well: CanvasGradient | null = null;

    const ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({
      x: 0,
      y: 0,
      start: 0,
      strength: 0,
      falloff: 0,
      reach: 0,
      live: false,
    }));
    let hovered = -1;
    let time = 0;
    let nextDrop = 0.7;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let dirty = true;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      line = rgba(borderColor, night ? 0.9 : 1, canvas);
      edge = rgba(color, 1, canvas);
      well = ctx.createLinearGradient(0, 0, 0, size);
      well.addColorStop(0, rgba(color, 1, canvas));
      well.addColorStop(0.35, rgba(color, night ? 0.8 : 0.72, canvas));
      well.addColorStop(1, rgba(color, night ? 0.62 : 0.5, canvas));
      dirty = true;
    };

    const layout = () => {
      cols = Math.ceil(w / size) + 1;
      rows = Math.ceil(h / size) + 1;
      x0 = (w - cols * size) / 2;
      y0 = Math.min(0, (h - rows * size) / 2);
      const n = cols * rows;
      if (level.length < n) {
        level = new Float32Array(n);
        hover = new Float32Array(n);
      } else {
        hover.fill(0);
      }
      hovered = -1;
      dirty = true;
    };

    const spawn = (col: number, row: number, strength: number, falloff: number, reach: number) => {
      let slot = ripples.find((r) => !r.live);
      if (!slot) slot = ripples.reduce((a, b) => (a.start < b.start ? a : b));
      slot.x = col;
      slot.y = row;
      slot.start = time;
      slot.strength = strength;
      slot.falloff = falloff;
      slot.reach = still ? 0.5 : reach;
      slot.live = true;
      dirty = true;
      wake();
    };

    const advance = () => {
      let busy = false;
      level.fill(0, 0, cols * rows);
      for (const ripple of ripples) {
        if (!ripple.live) continue;
        const age = time - ripple.start;
        const speed = still ? Infinity : SPEED;
        if (age > ripple.reach / (still ? Infinity : SPEED) + ECHO.delay + RELAX * 6) {
          ripple.live = false;
          continue;
        }
        busy = true;
        const c0 = Math.max(0, Math.floor(ripple.x - ripple.reach));
        const c1 = Math.min(cols - 1, Math.ceil(ripple.x + ripple.reach));
        const r0 = Math.max(0, Math.floor(ripple.y - ripple.reach));
        const r1 = Math.min(rows - 1, Math.ceil(ripple.y + ripple.reach));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const dx = c - ripple.x;
            const dy = r - ripple.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > ripple.reach) continue;
            const tau = age - (still ? 0 : d / speed);
            if (tau <= 0) continue;
            const ring = pulse(tau) + ECHO.strength * pulse(tau - ECHO.delay);
            const tail = ripple.reach < 2 ? 1 : clamp((ripple.reach - d) / 1.5, 0, 1);
            const v = (ripple.strength * ring * tail) / (1 + d * ripple.falloff);
            const i = r * cols + c;
            level[i] = Math.min(1.2, level[i] + v);
          }
        }
      }
      return busy;
    };

    const easeHover = (dt: number) => {
      let busy = false;
      const k = 1 - Math.exp(-dt * 18);
      const off = 1 - Math.exp(-dt * 7);
      const n = cols * rows;
      for (let i = 0; i < n; i++) {
        const target = i === hovered ? 1 : 0;
        const v = hover[i];
        if (v === target) continue;
        const next = v + (target - v) * (target ? k : off);
        hover[i] = Math.abs(next - target) < 0.004 ? target : next;
        busy = true;
      }
      return busy;
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lw = Math.max(1, Math.round(dpr)) / dpr;
      const snap = (v: number) => (Math.round(v * dpr) + (Math.max(1, Math.round(dpr)) % 2) / 2) / dpr;
      ctx.lineWidth = lw;
      ctx.strokeStyle = line;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = snap(x0 + c * size);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let r = 0; r <= rows; r++) {
        const y = snap(y0 + r * size);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = night ? "lighter" : "source-over";
      const fillStrength = night ? 0.3 : 0.22;
      const hoverStrength = night ? 0.12 : 0.09;
      const edgeStrength = night ? 0.75 : 0.6;
      const radius = Math.min(4, size * 0.08);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const v = Math.min(1, level[i]);
          const hv = hover[i];
          if (v < 0.004 && hv < 0.004) continue;
          const x = x0 + c * size;
          const y = y0 + r * size;
          const inset = 1 + v * Math.min(4, size * 0.07);
          const sink = v * Math.min(1.5, size * 0.03);
          ctx.globalAlpha = Math.min(1, v * fillStrength + hv * hoverStrength);
          ctx.fillStyle = well ?? edge;
          ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
          ctx.beginPath();
          ctx.roundRect(inset, inset + sink, size - inset * 2, size - inset * 2, radius * v);
          ctx.fill();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const outline = v * edgeStrength + hv * 0.3;
          if (outline > 0.015) {
            ctx.globalAlpha = Math.min(1, outline);
            ctx.strokeStyle = edge;
            ctx.lineWidth = lw;
            ctx.strokeRect(snap(x), snap(y), size, size);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      dirty = false;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      if (rain && time >= nextDrop) {
        nextDrop = time + DROP_EVERY[0] + Math.random() * (DROP_EVERY[1] - DROP_EVERY[0]);
        const col = Math.floor(cols * (0.18 + Math.random() * 0.64));
        const row = Math.floor(rows * (0.12 + Math.random() * 0.5));
        spawn(col, row, 0.62, 0.32, 5.5);
      }
      const moving = advance();
      const easing = easeHover(dt);
      if (moving || easing || dirty) draw();
      if (!moving && !easing && !rain) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      const run = onScreen && !document.hidden;
      if (run) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      layout();
      advance();
      draw();
    };

    const cellAt = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const col = Math.floor((event.clientX - box.left - x0) / size);
      const row = Math.floor((event.clientY - box.top - y0) / size);
      if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
      return { col, row };
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const cell = cellAt(event);
      const next = cell ? cell.row * cols + cell.col : -1;
      if (next !== hovered) {
        hovered = next;
        wake();
      }
    };
    const onLeave = () => {
      hovered = -1;
      wake();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(OWN_CLICKS)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) return;
      const cell = cellAt(event);
      if (!cell) return;
      spawn(cell.col, cell.row, 1, 0.07, Math.hypot(cols, rows) + 2);
      reportCell({ row: cell.row, column: cell.col });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    if (interactive) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
      root.addEventListener("click", onClick);
    }
    readColors();
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("click", onClick);
    };
  }, [cellSize, color, borderColor, interactive, idle, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-pond-grid-night:0] dark:[--miyuki-pond-grid-night:1]",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ maskImage: MASK, WebkitMaskImage: MASK, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>
      {children}
    </div>
  );
}
