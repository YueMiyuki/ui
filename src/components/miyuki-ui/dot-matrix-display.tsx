"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef } from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type DotMatrixMode = "static" | "scroll";
export type DotMatrixTransition = "wipe" | "rain" | "blink" | "none";

export interface DotMatrixLine {
  text: string;
  mode?: DotMatrixMode;
  color?: string;
  align?: "left" | "center" | "right";
  tone?: "lit" | "dim";
}

export interface DotMatrixDisplayProps extends Omit<ComponentProps<"div">, "children"> {
  text: string | (string | DotMatrixLine)[];
  rows?: number;
  cols?: number;
  mode?: DotMatrixMode;
  transition?: DotMatrixTransition;
  color?: string;
  speed?: number;
  ref?: Ref<HTMLDivElement>;
}

const FONT: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "###..|#..#.|#...#|#...#|#...#|#..#.|###..",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "#####|...#.|..#..|...#.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
  " ": "...|...|...|...|...|...|...",
  ".": ".|.|.|.|.|.|#",
  ",": "..|..|..|..|..|.#|#.",
  ":": ".|#|#|.|#|#|.",
  ";": "..|.#|.#|..|.#|.#|#.",
  "!": "#|#|#|#|#|.|#",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  "'": "#|#|.|.|.|.|.",
  '"': "#.#|#.#|...|...|...|...|...",
  "-": "....|....|....|####|....|....|....",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "/": "....#|....#|...#.|..#..|.#...|#....|#....",
  "(": "..#|.#.|#..|#..|#..|.#.|..#",
  ")": "#..|.#.|..#|..#|..#|.#.|#..",
  "&": ".##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#",
  "%": "##..#|##..#|...#.|..#..|.#...|#..##|#..##",
  "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.",
  "@": ".###.|#...#|#.###|#.#.#|#.###|#....|.###.",
  "=": ".....|.....|#####|.....|#####|.....|.....",
  "*": ".....|..#..|#.#.#|.###.|#.#.#|..#..|.....",
  "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
  ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
  _: ".....|.....|.....|.....|.....|.....|#####",
  "|": "#|#|#|#|#|#|#",
  "°": ".#.|#.#|.#.|...|...|...|...",
  "·": ".|.|.|#|.|.|.",
  $: "..#..|.####|#.#..|.###.|..#.#|####.|..#..",
  "¥": "#...#|.#.#.|..#..|#####|..#..|#####|..#..",
  "→": ".....|..#..|...#.|#####|...#.|..#..|.....",
  "←": ".....|..#..|.#...|#####|.#...|..#..|.....",
  "×": ".....|#...#|.#.#.|..#..|.#.#.|#...#|.....",
};

const ALIAS: Record<string, string> = {
  "–": "-",
  "—": "-",
  "−": "-",
  "‐": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "‧": "·",
  "•": "·",
};

const glyphCache = new Map<string, number[]>();

function glyph(ch: string): number[] {
  const hit = glyphCache.get(ch);
  if (hit) return hit;
  const rows = (FONT[ch] ?? FONT["?"]).split("|");
  const cols = Array.from({ length: rows[0].length }, (_, x) =>
    rows.reduce((mask, row, y) => (row[x] === "#" ? mask | (1 << y) : mask), 0),
  );
  glyphCache.set(ch, cols);
  return cols;
}

function normalize(text: string) {
  return Array.from(text.normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .map((c) => ALIAS[c] ?? c)
    .join("")
    .toUpperCase();
}

function bitmap(text: string): number[] {
  const out: number[] = [];
  Array.from(normalize(text)).forEach((ch, i) => {
    if (i > 0) out.push(0);
    out.push(...glyph(ch));
  });
  return out;
}

function pages(text: string, cols: number): number[][] {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const out: number[][] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (bitmap(next).length <= cols - 2 || !current) current = next;
    else {
      out.push(bitmap(current));
      current = word;
    }
  }
  if (current) out.push(bitmap(current));
  return out.length ? out : [[]];
}

interface Resolved {
  text: string;
  mode: DotMatrixMode;
  color: string;
  align: "left" | "center" | "right";
  tone: "lit" | "dim";
}

interface LineState {
  key: string;
  line: Resolved;
  bmp: number[];
  shownAt: number;
  prev: { bmp: number[]; shownAt: number; line: Resolved } | null;
  changedAt: number;
}

const LINE_GAP = 2;
const HOLD = 1400;
const SCROLL_GAP = 28;

const hash = (a: number, b: number) => {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x79b9, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2d);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

function resolveLines(text: DotMatrixDisplayProps["text"], mode: DotMatrixMode, color: string): Resolved[] {
  const list = typeof text === "string" ? text.split("\n") : text;
  return list.map((l) =>
    typeof l === "string"
      ? { text: l, mode, color, align: "left", tone: "lit" }
      : {
          text: l.text,
          mode: l.mode ?? mode,
          color: l.color ?? color,
          align: l.align ?? "left",
          tone: l.tone ?? "lit",
        },
  );
}

function duration(kind: DotMatrixTransition, cols: number) {
  if (kind === "wipe") return Math.min(1300, Math.max(520, cols * 8));
  if (kind === "rain") return 1500;
  if (kind === "blink") return 900;
  return 0;
}

const mix = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];
const css = ([r, g, b, a]: Rgba) =>
  `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

export function DotMatrixDisplay({
  text,
  rows: rowsProp,
  cols = 96,
  mode = "static",
  transition = "wipe",
  color = "var(--brand)",
  speed = 20,
  className,
  ref,
  ...props
}: DotMatrixDisplayProps) {
  const reduce = useReducedMotion() === true;
  const lines = resolveLines(text, mode, color);
  const rows = rowsProp ?? lines.length * 7 + (lines.length - 1) * LINE_GAP + 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef(lines);
  const stateRef = useRef<LineState[]>([]);
  const kick = useRef<() => void>(() => {});
  const config = useRef({ cols, rows, transition, speed, reduce });

  useEffect(() => {
    linesRef.current = lines;
    config.current = { cols, rows, transition, speed, reduce };
    kick.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let dark = false;
    let off: HTMLCanvasElement | null = null;
    const sprites = new Map<string, { core: HTMLCanvasElement; glow: HTMLCanvasElement; size: number }>();
    let frame = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== "hidden";
    let grid = new Float32Array(0);
    let colorGrid: string[] = [];

    const pitch = () => width / config.current.cols;

    const prepare = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      const bg = toRgba("var(--background)", canvas);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.5;
      sprites.clear();
      const { cols: c, rows: r } = config.current;
      const p = pitch() * dpr;
      off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext("2d");
      if (o) {
        const base = dark ? toRgba("var(--foreground)", canvas) : toRgba("var(--border-strong)", canvas);
        base[3] = dark ? 0.075 : 0.42;
        o.fillStyle = css(base);
        const rad = p * 0.36;
        o.beginPath();
        for (let y = 0; y < r; y++) {
          for (let x = 0; x < c; x++) {
            const cx = (x + 0.5) * p;
            const cy = (y + 0.5) * p;
            o.moveTo(cx + rad, cy);
            o.arc(cx, cy, rad, 0, Math.PI * 2);
          }
        }
        o.fill();
      }
    };

    const sprite = (value: string) => {
      const hit = sprites.get(value);
      if (hit) return hit;
      const p = pitch() * dpr;
      const base = toRgba(value, canvas);
      base[3] = 1;
      const rad = p * 0.38;
      const coreSize = Math.ceil(p);
      const core = document.createElement("canvas");
      core.width = core.height = coreSize;
      const c = core.getContext("2d");
      if (c) {
        const g = c.createRadialGradient(
          coreSize / 2 - rad * 0.25,
          coreSize / 2 - rad * 0.3,
          0,
          coreSize / 2,
          coreSize / 2,
          rad,
        );
        const white: Rgba = [1, 1, 1, 1];
        const ink: Rgba = [0.05, 0.08, 0.16, 1];
        g.addColorStop(0, css(dark ? mix(base, white, 0.55) : mix(base, white, 0.12)));
        g.addColorStop(0.55, css(dark ? mix(base, white, 0.18) : mix(base, ink, 0.1)));
        g.addColorStop(1, css(dark ? base : mix(base, ink, 0.26)));
        c.fillStyle = g;
        c.beginPath();
        c.arc(coreSize / 2, coreSize / 2, rad, 0, Math.PI * 2);
        c.fill();
      }
      const glowSize = Math.ceil(p * 3.4);
      const glow = document.createElement("canvas");
      glow.width = glow.height = glowSize;
      const gctx = glow.getContext("2d");
      if (gctx) {
        const g = gctx.createRadialGradient(
          glowSize / 2,
          glowSize / 2,
          rad * 0.6,
          glowSize / 2,
          glowSize / 2,
          glowSize / 2,
        );
        const strength = dark ? 0.34 : 0.09;
        g.addColorStop(0, css([...base.slice(0, 3), strength] as Rgba));
        g.addColorStop(0.45, css([...base.slice(0, 3), strength * 0.32] as Rgba));
        g.addColorStop(1, css([...base.slice(0, 3), 0] as Rgba));
        gctx.fillStyle = g;
        gctx.fillRect(0, 0, glowSize, glowSize);
      }
      const out = { core, glow, size: coreSize };
      sprites.set(value, out);
      return out;
    };

    const syncState = (now: number) => {
      const list = linesRef.current;
      const { cols: c, reduce: r } = config.current;
      stateRef.current = list.map((line, i) => {
        const key = `${line.text}|${line.tone}|${line.align}|${line.color}|${line.mode}|${r}|${c}`;
        const old = stateRef.current[i];
        if (old && old.key === key) return old;
        const bmp = bitmap(line.text);
        if (!old) return { key, line, bmp, shownAt: now, prev: null, changedAt: -Infinity };
        return {
          key,
          line,
          bmp,
          shownAt: now,
          prev: { bmp: old.bmp, shownAt: old.shownAt, line: old.line },
          changedAt: now,
        };
      });
    };

    const placed = (bmp: number[], line: Resolved, shownAt: number, now: number, c: number) => {
      if (line.mode === "scroll" && !config.current.reduce) {
        const period = bmp.length + SCROLL_GAP;
        const s = Math.floor((Math.max(0, now - shownAt - HOLD) / 1000) * config.current.speed) % period;
        return { start: 1 - s, repeat: period };
      }
      if (line.mode === "scroll") {
        const list = pages(line.text, c);
        const page = list[Math.floor(Math.max(0, now - shownAt) / 3200) % list.length];
        return { start: 1, repeat: 0, bmp: page };
      }
      const w = bmp.length;
      const start = line.align === "center" ? Math.floor((c - w) / 2) : line.align === "right" ? c - 1 - w : 1;
      return { start, repeat: 0 };
    };

    const columnAt = (bmp: number[], start: number, repeat: number, x: number) => {
      let i = x - start;
      if (repeat > 0) i = ((i % repeat) + repeat) % repeat;
      return i >= 0 && i < bmp.length ? bmp[i] : 0;
    };

    const draw = (now: number) => {
      const { cols: c, rows: r, transition: kind } = config.current;
      const list = linesRef.current;
      syncState(now);
      if (grid.length !== c * r) {
        grid = new Float32Array(c * r);
        colorGrid = new Array(c * r).fill("");
      }
      grid.fill(0);
      const total = list.length * 7 + (list.length - 1) * LINE_GAP;
      const top0 = Math.floor((r - total) / 2);
      let busy = false;

      list.forEach((line, li) => {
        const st = stateRef.current[li];
        if (!st) return;
        const top = top0 + li * (7 + LINE_GAP);
        const level = line.tone === "dim" ? 0.34 : 1;
        const set = (x: number, y: number, v: number, col: string) => {
          if (x < 0 || x >= c || y < top || y >= top + 7 || y < 0 || y >= r) return;
          const idx = y * c + x;
          if (v > grid[idx]) {
            grid[idx] = v;
            colorGrid[idx] = col;
          }
        };
        const now0 = placed(st.bmp, line, st.shownAt, now, c);
        const bmpNow = now0.bmp ?? st.bmp;
        if (line.mode === "scroll") busy = true;
        const dur = config.current.reduce ? 0 : duration(kind, c);
        const q = st.prev && dur > 0 ? (now - st.changedAt) / dur : 1;
        const paint = (
          bmp: number[],
          pos: { start: number; repeat: number },
          x: number,
          v: number,
          col: string,
          shift = 0,
        ) => {
          const m = columnAt(bmp, pos.start, pos.repeat, x);
          if (!m) return;
          for (let y = 0; y < 7; y++) if (m & (1 << y)) set(x, top + y + shift, v, col);
        };

        if (q >= 1 || !st.prev) {
          for (let x = 0; x < c; x++) paint(bmpNow, now0, x, level, line.color);
          return;
        }
        busy = true;
        const prev = st.prev;
        const was = placed(prev.bmp, prev.line, prev.shownAt, st.changedAt, c);
        const bmpWas = was.bmp ?? prev.bmp;
        const levelWas = prev.line.tone === "dim" ? 0.34 : 1;
        const t = now - st.changedAt;

        if (kind === "wipe") {
          const edge = q * (c + 3);
          for (let x = 0; x < c; x++) {
            if (x < edge - 2) paint(bmpNow, now0, x, level, line.color);
            else if (x >= edge) paint(bmpWas, was, x, levelWas * (x < edge + 1 ? 0.5 : 1), prev.line.color);
            if (x >= edge - 2 && x < edge) {
              const head = x >= edge - 1;
              for (let y = 0; y < 7; y++) set(x, top + y, head ? 1 : 0.34, line.color);
            }
          }
        } else if (kind === "blink") {
          const on = q < 0.12 ? -1 : q < 0.26 ? 0.5 : q < 0.38 ? 0 : q < 0.55 ? 1 : q < 0.64 ? 0 : 1;
          for (let x = 0; x < c; x++) {
            if (on < 0) paint(bmpWas, was, x, levelWas * (1 - q / 0.12) * 0.6, prev.line.color);
            else if (on > 0) paint(bmpNow, now0, x, level * on, line.color);
          }
        } else if (kind === "rain") {
          const outFor = dur * 0.3;
          for (let x = 0; x < c; x++) {
            const tout = t - hash(x, 3) * outFor;
            const fall = tout > 0 ? Math.floor(0.5 * 0.00026 * tout * tout) : 0;
            if (fall < 9) {
              const m = columnAt(bmpWas, was.start, was.repeat, x);
              for (let y = 0; y < 7; y++) {
                if (!(m & (1 << y))) continue;
                set(x, top + y + fall, levelWas * (fall > 0 ? 0.75 : 1), prev.line.color);
                if (fall > 0) set(x, top + y + fall - 1, levelWas * 0.22, prev.line.color);
              }
            }
            const m = columnAt(bmpNow, now0.start, now0.repeat, x);
            if (!m) continue;
            const tin = t - outFor * 0.7 - hash(x, 11) * dur * 0.38;
            if (tin < 0) continue;
            const height = 9 + Math.floor(hash(x, 5) * 5);
            const lift = height - Math.min(height, Math.floor(0.5 * 0.0002 * tin * tin));
            for (let y = 0; y < 7; y++) {
              if (!(m & (1 << y))) continue;
              const row = top + y - lift;
              set(x, row, level * (lift > 0 ? 0.82 : 1), line.color);
              if (lift > 0) {
                set(x, row - 1, level * 0.3, line.color);
                set(x, row - 2, level * 0.1, line.color);
              }
            }
          }
        }
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (off) ctx.drawImage(off, 0, 0);
      const p = pitch() * dpr;
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < grid.length; i++) {
        const v = grid[i];
        if (v <= 0.01) continue;
        const s = sprite(colorGrid[i]);
        const x = (i % c) + 0.5;
        const y = Math.floor(i / c) + 0.5;
        const gs = s.glow.width;
        ctx.globalAlpha = Math.min(1, v * v);
        ctx.drawImage(s.glow, x * p - gs / 2, y * p - gs / 2);
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < grid.length; i++) {
        const v = grid[i];
        if (v <= 0.01) continue;
        const s = sprite(colorGrid[i]);
        const x = (i % c) + 0.5;
        const y = Math.floor(i / c) + 0.5;
        ctx.globalAlpha = Math.min(1, v);
        ctx.drawImage(s.core, x * p - s.size / 2, y * p - s.size / 2);
      }
      ctx.globalAlpha = 1;
      return busy;
    };

    let prepared = "";
    let timer = 0;
    const loop = (now: number) => {
      frame = 0;
      const size = `${config.current.cols}x${config.current.rows}`;
      if (size !== prepared) {
        prepared = size;
        prepare();
      }
      const busy = draw(now);
      if (!busy || !visible || !pageVisible) return;
      if (config.current.reduce) timer = window.setTimeout(() => start(), 400);
      else frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (frame || width === 0) return;
      window.clearTimeout(timer);
      frame = requestAnimationFrame(loop);
    };
    kick.current = start;

    const resize = new ResizeObserver(() => {
      prepare();
      prepared = `${config.current.cols}x${config.current.rows}`;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
      start();
    });
    resize.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onVisibility = () => {
      pageVisible = document.visibilityState !== "hidden";
      if (pageVisible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const stopTheme = onThemeChange(() => {
      prepare();
      draw(performance.now());
      start();
    });
    return () => {
      kick.current = () => {};
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      resize.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stopTheme();
    };
  }, []);

  return (
    <div
      ref={ref}
      {...props}
      className={cn("rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-3 dark:bg-background", className)}
    >
      <div className="sr-only">
        {lines.map((line, i) => (
          <p key={i}>{line.text}</p>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block w-full"
        style={{ aspectRatio: `${cols} / ${rows}` }}
      />
    </div>
  );
}
