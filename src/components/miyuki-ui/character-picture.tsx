"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type CharacterPictureCharset = "standard" | "blocks" | "dots" | "binary" | "kana" | (string & {});
export type CharacterPictureAnimation = "fade" | "typewriter" | "rain" | "none";
export type CharacterPictureObjectFit = "cover" | "contain" | "fill";

export interface CharacterPictureProps extends Omit<ComponentProps<"div">, "children"> {
  src: string;
  alt: string;
  columns?: number;
  charset?: CharacterPictureCharset;
  colored?: boolean;
  invert?: "auto" | boolean;
  animation?: CharacterPictureAnimation;
  duration?: number;
  objectFit?: CharacterPictureObjectFit;
}

const POOLS: Record<string, { pool: string; levels: number }> = {
  standard: { pool: " .:-=+*o#%@", levels: 11 },
  blocks: { pool: " ░▒▓█", levels: 5 },
  dots: { pool: " ·:∴⁘⁙•○●", levels: 7 },
  binary: { pool: " 10", levels: 3 },
  kana: { pool: "\u2002･ﾉｼﾂｸﾒｻﾈｵﾑﾎ", levels: 9 },
};

const SUPERSAMPLE = 3;
const TRAIL = 5;
const SHARPEN = 0.6;
const DIFFUSE = 0.25;
const EQUALIZE = 0.6;
const GAMMA = 1.2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Glyph {
  ch: string;
  ink: number;
}

const rampCache = new Map<string, { glyphs: Glyph[]; advance: number }>();

function buildRamp(pool: string, levels: number, family: string) {
  const key = `${family}|${pool}|${levels}`;
  const hit = rampCache.get(key);
  if (hit) return hit;
  const chars = [...pool];
  const size = 64;
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return { glyphs: chars.map((ch, i) => ({ ch, ink: i / Math.max(1, chars.length - 1) })), advance: 0.6 };
  g.font = `${size}px ${family}`;
  const widths = chars.map((ch) => g.measureText(ch).width / size);
  const sorted = widths.slice(1).sort((a, b) => a - b);
  const advance = sorted[Math.floor(sorted.length / 2)] || widths[0] || 0.6;
  const kept = chars.filter((_, i) => i === 0 || Math.abs(widths[i] - advance) / advance < 0.006);
  const metrics = g.measureText("M");
  const ascent = metrics.fontBoundingBoxAscent || size * 0.8;
  const descent = metrics.fontBoundingBoxDescent || size * 0.2;
  const w = Math.max(1, Math.round(advance * size));
  canvas.width = w;
  canvas.height = size;
  g.font = `${size}px ${family}`;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#000";
  const baseline = (size - (ascent + descent)) / 2 + ascent;
  const measured = kept.map((ch, i) => {
    if (i === 0) return { ch, ink: 0 };
    g.clearRect(0, 0, w, size);
    g.fillText(ch, 0, baseline);
    const data = g.getImageData(0, 0, w, size).data;
    let sum = 0;
    for (let k = 3; k < data.length; k += 4) sum += data[k];
    return { ch, ink: sum / 255 / (w * size) };
  });
  measured.sort((a, b) => a.ink - b.ink);
  const top = measured[measured.length - 1]?.ink || 1;
  const picked: Glyph[] = [];
  const count = Math.min(levels, measured.length);
  for (let k = 0; k < count; k++) {
    const target = (k / Math.max(1, count - 1)) * top;
    let best: Glyph | null = null;
    for (const m of measured) {
      if (picked.includes(m)) continue;
      if (!best || Math.abs(m.ink - target) < Math.abs(best.ink - target)) best = m;
    }
    if (best) picked.push(best);
  }
  picked.sort((a, b) => a.ink - b.ink);
  const out = { glyphs: picked.map((p) => ({ ch: p.ch, ink: p.ink / top })), advance };
  rampCache.set(key, out);
  return out;
}

function blur(src: Float32Array, w: number, h: number, radius: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= w) continue;
        sum += src[y * w + xx];
        count++;
      }
      tmp[y * w + x] = sum / count;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= h) continue;
        sum += tmp[yy * w + x];
        count++;
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

function hash(a: number, b: number, c: number) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function CharacterPicture({
  src,
  alt,
  columns = 100,
  charset = "standard",
  colored = false,
  invert = "auto",
  animation = "rain",
  duration = 1.6,
  objectFit = "cover",
  className,
  style,
  ...props
}: CharacterPictureProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLPreElement>(null);
  const headRef = useRef<HTMLPreElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const root = rootRef.current;
    const base = baseRef.current;
    const head = headRef.current;
    const sampler = document.createElement("canvas");
    const paint = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    if (!root || !base || !head || !sctx) return;

    const preset = POOLS[charset] ?? { pool: charset || POOLS.standard.pool, levels: 16 };
    let glyphs: Glyph[] = [];
    let ramp: string[] = [...preset.pool];
    let blank = ramp[0];
    let strong = ramp.slice(1);
    const cols = Math.max(4, Math.round(columns));
    const mode: CharacterPictureAnimation = reduced ? "none" : animation;
    const span = Math.max(0.2, duration) * 1000;

    let image: HTMLImageElement | null = null;
    let advance = 0;
    let rows = 0;
    let width = 0;
    let lineHeight = 0;
    let cells: string[] = [];
    let state: "waiting" | "playing" | "done" = "waiting";
    let visible = false;
    let raf = 0;
    let started = 0;
    let delays = new Float32Array(0);
    let falls = new Float32Array(0);
    let disposed = false;

    const blankRow = () => blank.repeat(cols);

    const measure = () => {
      const built = buildRamp(preset.pool, preset.levels, getComputedStyle(base).fontFamily);
      glyphs = built.glyphs;
      ramp = glyphs.map((g) => g.ch);
      blank = ramp[0];
      strong = ramp.slice(Math.max(1, Math.floor(ramp.length / 2)));
      advance = built.advance > 0.1 ? built.advance : 0.6;
    };

    const layout = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h || !advance) return false;
      const size = w / (cols * advance);
      width = w;
      lineHeight = size;
      rows = Math.max(1, Math.floor(h / lineHeight + 0.001));
      const top = Math.max(0, (h - rows * lineHeight) / 2);
      for (const el of [base, head]) {
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = `${lineHeight}px`;
        el.style.top = `${top}px`;
        el.style.height = `${rows * lineHeight}px`;
      }
      return true;
    };

    const sample = () => {
      if (!image || !rows) return;
      const k = SUPERSAMPLE;
      const sw = cols * k;
      const sh = rows * k;
      sampler.width = sw;
      sampler.height = sh;
      sctx.clearRect(0, 0, sw, sh);
      const iw = image.naturalWidth || 1;
      const ih = image.naturalHeight || 1;
      const boxW = width;
      const boxH = rows * lineHeight;
      if (objectFit === "cover") {
        const s = Math.max(boxW / iw, boxH / ih);
        const cw = boxW / s;
        const ch = boxH / s;
        sctx.drawImage(image, (iw - cw) / 2, (ih - ch) / 2, cw, ch, 0, 0, sw, sh);
      } else if (objectFit === "contain") {
        const s = Math.min(boxW / iw, boxH / ih);
        const dw = ((iw * s) / boxW) * sw;
        const dh = ((ih * s) / boxH) * sh;
        sctx.drawImage(image, 0, 0, iw, ih, (sw - dw) / 2, (sh - dh) / 2, dw, dh);
      } else {
        sctx.drawImage(image, 0, 0, iw, ih, 0, 0, sw, sh);
      }
      const data = sctx.getImageData(0, 0, sw, sh).data;
      const n = cols * rows;
      const lum = new Float32Array(n);
      const rgb = new Uint8ClampedArray(n * 4);
      const opaque = new Uint8Array(n);
      const area = k * k;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let R = 0;
          let G = 0;
          let B = 0;
          let A = 0;
          for (let y = 0; y < k; y++) {
            let o = ((r * k + y) * sw + c * k) * 4;
            for (let x = 0; x < k; x++, o += 4) {
              const a = data[o + 3];
              R += data[o] * a;
              G += data[o + 1] * a;
              B += data[o + 2] * a;
              A += a;
            }
          }
          const i = r * cols + c;
          if (A / area < 26) continue;
          R /= A;
          G /= A;
          B /= A;
          opaque[i] = 1;
          lum[i] = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
          rgb[i * 4] = R;
          rgb[i * 4 + 1] = G;
          rgb[i * 4 + 2] = B;
          rgb[i * 4 + 3] = 255;
        }
      }

      const [fr, fg, fb] = toRgba("currentColor", root);
      const darkSurface = 0.2126 * fr + 0.7152 * fg + 0.0722 * fb > 0.5;
      const brightIsDense = invert === "auto" ? darkSurface : invert;

      const order: number[] = [];
      for (let i = 0; i < n; i++) if (opaque[i]) order.push(i);
      order.sort((a, b) => lum[a] - lum[b]);
      const lo = lum[order[Math.floor(order.length * 0.01)]] ?? 0;
      const hi = lum[order[Math.floor(order.length * 0.99)]] ?? 1;
      const range = Math.max(0.04, hi - lo);
      const tone = new Float32Array(n);
      for (let k = 0; k < order.length; k++) {
        const i = order[k];
        const rank = k / Math.max(1, order.length - 1);
        tone[i] = clamp01((lum[i] - lo) / range) * (1 - EQUALIZE) + rank * EQUALIZE;
      }
      const soft = blur(tone, cols, rows, Math.max(1, Math.round(cols / 40)));
      const want = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = clamp01(tone[i] + (tone[i] - soft[i]) * SHARPEN);
        want[i] = opaque[i] ? (brightIsDense ? t : 1 - t) ** GAMMA : 0;
      }
      cells = new Array(n);
      const levels = glyphs.length;
      for (let r = 0; r < rows; r++) {
        const forward = r % 2 === 0;
        for (let k = 0; k < cols; k++) {
          const c = forward ? k : cols - 1 - k;
          const i = r * cols + c;
          if (!opaque[i]) {
            cells[i] = blank;
            continue;
          }
          const v = want[i];
          let best = 0;
          for (let j = 1; j < levels; j++) if (Math.abs(glyphs[j].ink - v) < Math.abs(glyphs[best].ink - v)) best = j;
          cells[i] = glyphs[best].ch;
          const err = (v - glyphs[best].ink) * DIFFUSE;
          const ahead = forward ? 1 : -1;
          if (c + ahead >= 0 && c + ahead < cols) want[i + ahead] += (err * 7) / 16;
          if (r + 1 < rows) {
            const below = i + cols;
            if (c - ahead >= 0 && c - ahead < cols) want[below - ahead] += (err * 3) / 16;
            want[below] += (err * 5) / 16;
            if (c + ahead >= 0 && c + ahead < cols) want[below + ahead] += err / 16;
          }
        }
      }

      if (colored) {
        const pctx = paint.getContext("2d");
        if (pctx) {
          paint.width = cols;
          paint.height = rows;
          for (let i = 0; i < n; i++) {
            const o = i * 4;
            for (let j = 0; j < 3; j++) {
              const v = rgb[o + j];
              rgb[o + j] = darkSurface ? v + (255 - v) * 0.18 : v * 0.8;
            }
          }
          pctx.putImageData(new ImageData(rgb, cols, rows), 0, 0);
          base.style.backgroundImage = `url(${paint.toDataURL()})`;
        }
      } else {
        base.style.backgroundImage = "";
      }
    };

    const rowText = (r: number) => cells.slice(r * cols, r * cols + cols).join("");

    const showFinal = () => {
      const out: string[] = [];
      for (let r = 0; r < rows; r++) out.push(rowText(r));
      base.textContent = out.join("\n");
      head.textContent = "";
    };

    const showBlank = () => {
      base.textContent = Array.from({ length: rows }, blankRow).join("\n");
      head.textContent = "";
    };

    const frame = (now: number) => {
      const t = now - started;
      const p = t / span;
      if (p >= 1 || !rows) {
        raf = 0;
        state = "done";
        showFinal();
        return;
      }
      const baseRows: string[] = [];
      const headRows: string[] = [];
      if (mode === "typewriter") {
        const shown = Math.floor(p * cols * rows);
        const line = Math.floor(shown / cols);
        const col = shown % cols;
        for (let r = 0; r < rows; r++) {
          if (r < line) baseRows.push(rowText(r));
          else if (r === line) baseRows.push(cells.slice(r * cols, r * cols + col).join("") + blank.repeat(cols - col));
          else baseRows.push(blankRow());
          headRows.push(r === line ? blank.repeat(col) + ramp[ramp.length - 1] : "");
        }
      } else {
        const tick = Math.floor(t / 70);
        const heads = new Float32Array(cols);
        for (let c = 0; c < cols; c++) heads[c] = ((t - delays[c]) / falls[c]) * (rows + TRAIL);
        for (let r = 0; r < rows; r++) {
          let b = "";
          let h = "";
          for (let c = 0; c < cols; c++) {
            const hd = heads[c];
            if (r < hd - TRAIL) {
              b += cells[r * cols + c];
              h += blank;
            } else if (r < hd) {
              b += blank;
              h += strong[Math.floor(hash(r, c, tick) * strong.length)];
            } else {
              b += blank;
              h += blank;
            }
          }
          baseRows.push(b);
          headRows.push(h);
        }
      }
      base.textContent = baseRows.join("\n");
      head.textContent = headRows.join("\n");
      raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (state !== "waiting" || !visible || !cells.length) return;
      if (mode === "none") {
        state = "done";
        showFinal();
        return;
      }
      if (mode === "fade") {
        state = "done";
        showFinal();
        base.animate(
          [
            { opacity: 0, filter: "blur(4px)" },
            { opacity: 1, filter: "blur(0px)" },
          ],
          { duration: span, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
        return;
      }
      state = "playing";
      delays = new Float32Array(cols);
      falls = new Float32Array(cols);
      for (let c = 0; c < cols; c++) {
        const wave = Math.sin((c / cols) * Math.PI * 2.3 + 0.7) * 0.5 + 0.5;
        delays[c] = span * (0.04 + 0.3 * (0.55 * Math.random() + 0.45 * wave));
        falls[c] = Math.max(span * 0.3, span * 0.98 - delays[c] - span * Math.random() * 0.22);
      }
      started = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const refresh = () => {
      if (!layout()) return;
      sample();
      if (state === "done") showFinal();
      else if (state === "waiting") showBlank();
      play();
    };

    const ro = new ResizeObserver(() => refresh());
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      play();
    });
    const offTheme = onThemeChange(() => {
      sample();
      if (state === "done") showFinal();
    });

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    Promise.all([img.decode(), document.fonts?.ready ?? Promise.resolve()])
      .then(() => {
        if (disposed) return;
        image = img;
        root.style.setProperty(
          "--miyuki-character-picture-aspect",
          `${img.naturalWidth || 16} / ${img.naturalHeight || 10}`,
        );
        measure();
        refresh();
        ro.observe(root);
        io.observe(root);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      offTheme();
      base.getAnimations().forEach((a) => a.cancel());
    };
  }, [src, columns, charset, colored, invert, animation, duration, objectFit, reduced]);

  const text =
    "pointer-events-none absolute inset-x-0 top-0 m-0 overflow-hidden font-mono whitespace-pre [font-feature-settings:'liga'_0,'calt'_0] [font-variant-ligatures:none]";

  return (
    <div
      {...props}
      ref={rootRef}
      role="img"
      aria-label={alt}
      className={cn(
        "relative w-full overflow-hidden select-none aspect-(--miyuki-character-picture-aspect)",
        className,
      )}
      style={{ "--miyuki-character-picture-aspect": "16 / 10", ...style } as CSSProperties}
    >
      <pre
        ref={baseRef}
        aria-hidden="true"
        className={cn(text, colored && "bg-size-[100%_100%] bg-clip-text text-transparent [image-rendering:pixelated]")}
      />
      <pre ref={headRef} aria-hidden="true" className={cn(text, "text-brand")} />
    </div>
  );
}
