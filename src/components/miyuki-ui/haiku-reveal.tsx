"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type Ref, useEffect, useId, useRef, useState } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface HaikuRevealProps extends Omit<ComponentProps<"div">, "children"> {
  lines: [string, string, string];
  pause?: number;
  seal?: string | false;
  ref?: Ref<HTMLDivElement>;
}

interface Stamp {
  x: number;
  y: number;
  r: number;
  t: number;
  p: number;
}

const keyframes = `
@keyframes miyuki-haiku-reveal-seal {
  0% { opacity: 0; transform: scale(1.08) rotate(var(--miyuki-haiku-reveal-tilt)); }
  35% { opacity: 0.92; }
  100% { opacity: 1; transform: scale(1) rotate(var(--miyuki-haiku-reveal-tilt)); }
}
`;

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

function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function thin(bin: Uint8Array, w: number, h: number) {
  const kill: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      kill.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!bin[i]) continue;
          const p2 = bin[i - w];
          const p3 = bin[i - w + 1];
          const p4 = bin[i + 1];
          const p5 = bin[i + w + 1];
          const p6 = bin[i + w];
          const p7 = bin[i + w - 1];
          const p8 = bin[i - 1];
          const p9 = bin[i - w - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
          if (a !== 1) continue;
          if (step === 0 ? p2 && p4 && p6 : p2 && p4 && p8) continue;
          if (step === 0 ? p4 && p6 && p8 : p2 && p6 && p8) continue;
          kill.push(i);
        }
      }
      for (const i of kill) bin[i] = 0;
      if (kill.length) changed = true;
    }
  }
}

function distance(bin: Uint8Array, w: number, h: number) {
  const d = new Float32Array(w * h);
  const big = 1e6;
  for (let i = 0; i < w * h; i++) d[i] = bin[i] ? big : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) v = Math.min(v, d[i - w] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[i - w - 1] + Math.SQRT2);
      if (x < w - 1 && y > 0) v = Math.min(v, d[i - w + 1] + Math.SQRT2);
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) v = Math.min(v, d[i + w] + 1);
      if (x < w - 1 && y < h - 1) v = Math.min(v, d[i + w + 1] + Math.SQRT2);
      if (x > 0 && y < h - 1) v = Math.min(v, d[i + w - 1] + Math.SQRT2);
      d[i] = v;
    }
  }
  return d;
}

const OFF = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;

function strokes(skel: Uint8Array, w: number, h: number) {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && skel[y * w + x] === 1;
  const crossing = (x: number, y: number) => {
    let a = 0;
    for (let k = 0; k < 8; k++) {
      const [dx, dy] = OFF[k];
      const [ex, ey] = OFF[(k + 1) % 8];
      if (!on(x + dx, y + dy) && on(x + ex, y + ey)) a++;
    }
    return a;
  };
  const kind = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const c = crossing(x, y);
      kind[y * w + x] = c === 1 ? 1 : c >= 3 ? 3 : 2;
    }
  }
  const used = new Uint8Array(w * h);
  const out: [number, number][][] = [];
  const walk = (sx: number, sy: number, fx: number, fy: number) => {
    const path: [number, number][] = [[sx, sy]];
    let px = sx;
    let py = sy;
    let cx = fx;
    let cy = fy;
    for (let guard = 0; guard < w * h; guard++) {
      path.push([cx, cy]);
      const i = cy * w + cx;
      if (kind[i] !== 2 && !(cx === sx && cy === sy && path.length === 1)) break;
      used[i] = 1;
      let next: [number, number] | null = null;
      for (const pass of [0, 1]) {
        for (let k = pass; k < 8; k += 2) {
          const nx = cx + OFF[k][0];
          const ny = cy + OFF[k][1];
          if ((nx === px && ny === py) || !on(nx, ny)) continue;
          const j = ny * w + nx;
          if (kind[j] === 2 && used[j]) continue;
          if (path.length > 2 && nx === path[path.length - 3]?.[0] && ny === path[path.length - 3]?.[1]) continue;
          next = [nx, ny];
          break;
        }
        if (next) break;
      }
      if (!next) break;
      px = cx;
      py = cy;
      cx = next[0];
      cy = next[1];
    }
    return path;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (kind[i] !== 1 && kind[i] !== 3) continue;
      if (kind[i] === 1 && used[i]) continue;
      used[i] = 1;
      for (let k = 0; k < 8; k++) {
        const nx = x + OFF[k][0];
        const ny = y + OFF[k][1];
        if (!on(nx, ny)) continue;
        const j = ny * w + nx;
        if (kind[j] === 2 && used[j]) continue;
        if (kind[j] !== 2 && used[j] && kind[j] === 1) continue;
        const path = walk(x, y, nx, ny);
        const end = path[path.length - 1];
        const ei = end[1] * w + end[0];
        if (kind[ei] === 1) used[ei] = 1;
        if (path.length > 1) out.push(path);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (kind[i] !== 2 || used[i]) continue;
      used[i] = 1;
      let start: [number, number] | null = null;
      for (let k = 0; k < 8; k++) {
        const nx = x + OFF[k][0];
        const ny = y + OFF[k][1];
        if (on(nx, ny) && !used[ny * w + nx]) {
          start = [nx, ny];
          break;
        }
      }
      if (!start) continue;
      const path = walk(x, y, start[0], start[1]);
      if (path.length > 2) out.push(path);
    }
  }
  return out;
}

export function HaikuReveal({ lines, pause = 900, seal = "雪", className, style, ref, ...props }: HaikuRevealProps) {
  const own = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.5 });
  const [failed, setFailed] = useState(false);
  const [sealAt, setSealAt] = useState<number | null>(null);
  const id = `miyuki-haiku-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const go = useRef({ started: false, kick: () => {} });
  const key = lines.join("\n");

  useEffect(() => {
    if (!inView) return;
    go.current.started = true;
    go.current.kick();
  }, [inView]);

  useEffect(() => {
    const root = own.current;
    const p = body.current;
    const canvas = surface.current;
    if (!root || !p || !canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!ctx || !sctx) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    let pw = 1;
    let ph = 1;
    let scale = 1;
    let img: ImageData | null = null;
    let cover = new Float32Array(0);
    let when = new Float32Array(0);
    let tone = new Float32Array(0);
    let order = new Uint32Array(0);
    let ink: [number, number, number] = [20, 30, 50];
    let range = 1;
    let head = 0;
    let wet = 0;
    let clock = 0;
    let finish = 0;
    let raf = 0;
    let onScreen = true;
    let last = performance.now();
    let built = false;
    let lineEnds: number[] = [];
    const control = go.current;

    const resolve = () => {
      const c = toRgba(getComputedStyle(root).color, root);
      ink = [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
      range = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.5 ? 0.5 : 0.8;
    };

    const build = () => {
      const box = root.getBoundingClientRect();
      const k0 = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      const k = Math.abs(k0 - 1) < 0.01 ? 1 : k0;
      const cssW = box.width / k;
      const cssH = box.height / k;
      scale = Math.min(2, (window.devicePixelRatio || 1) * k);
      pw = Math.max(1, Math.ceil(cssW * scale));
      ph = Math.max(1, Math.ceil(cssH * scale));
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${pw / scale}px`;
      canvas.style.height = `${ph / scale}px`;
      cover = new Float32Array(pw * ph);
      when = new Float32Array(pw * ph).fill(Infinity);
      tone = new Float32Array(pw * ph);
      img = ctx.createImageData(pw, ph);
      lineEnds = [];

      let t = 0.15;
      const spans = Array.from(p.querySelectorAll<HTMLElement>("[data-line]"));
      spans.forEach((span, li) => {
        const node = span.firstChild;
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        const cs = getComputedStyle(span);
        const size = parseFloat(cs.fontSize) || 16;
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const speed = size * 44 * scale;
        const source = node.textContent ?? "";
        const range = document.createRange();
        let prevSpace = false;
        for (let i = 0; i < source.length; ) {
          const cp = source.codePointAt(i) ?? 0;
          const len = cp > 0xffff ? 2 : 1;
          const raw = source.slice(i, i + len);
          range.setStart(node, i);
          range.setEnd(node, i + len);
          const index = i;
          i += len;
          if (/\s/.test(raw)) {
            prevSpace = true;
            continue;
          }
          if (prevSpace) t += 0.09;
          prevSpace = false;
          const rect = range.getClientRects()[0];
          if (!rect || rect.width === 0) continue;
          const ch = caseOf(raw, cs.textTransform);
          sctx.setTransform(1, 0, 0, 1, 0, 0);
          sctx.font = font;
          sctx.letterSpacing = "0px";
          const m = sctx.measureText(ch);
          const ox = ((rect.left - box.left) / k) * scale;
          const base = ((rect.top - box.top) / k + m.fontBoundingBoxAscent) * scale;
          const pad = Math.ceil(size * 0.18 * scale);
          const gx = Math.floor(ox - m.actualBoundingBoxLeft * scale) - pad;
          const gy = Math.floor(base - m.actualBoundingBoxAscent * scale) - pad;
          const gw = Math.ceil((m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * scale) + pad * 2;
          const gh = Math.ceil((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * scale) + pad * 2;
          if (gw < 3 || gh < 3) continue;
          if (scratch.width < gw) scratch.width = gw;
          if (scratch.height < gh) scratch.height = gh;
          sctx.clearRect(0, 0, scratch.width, scratch.height);
          sctx.setTransform(scale, 0, 0, scale, 0, 0);
          sctx.font = font;
          sctx.letterSpacing = "0px";
          sctx.textBaseline = "alphabetic";
          sctx.fillStyle = "#000";
          sctx.fillText(ch, (ox - gx) / scale, (base - gy) / scale);
          const data = sctx.getImageData(0, 0, gw, gh).data;
          const alpha = new Float32Array(gw * gh);
          const bin = new Uint8Array(gw * gh);
          for (let q = 0; q < gw * gh; q++) {
            alpha[q] = data[q * 4 + 3] / 255;
            bin[q] = alpha[q] >= 0.5 ? 1 : 0;
          }
          const dt = distance(bin, gw, gh);
          const skel = bin.slice();
          thin(skel, gw, gh);
          let paths = strokes(skel, gw, gh).filter((path) => {
            const a = path[0];
            const b = path[path.length - 1];
            const span = Math.max(dt[a[1] * gw + a[0]], dt[b[1] * gw + b[0]]);
            return path.length > Math.max(3, span * 1.4);
          });
          if (!paths.length) paths = strokes(skel, gw, gh);
          const terminal = (q: [number, number]) => {
            let n = 0;
            for (const [dx, dy] of OFF) {
              const x = q[0] + dx;
              const y = q[1] + dy;
              if (x >= 0 && y >= 0 && x < gw && y < gh && skel[y * gw + x]) n++;
            }
            return n <= 1;
          };
          const score = (q: [number, number]) => q[1] + q[0] * 0.55;
          const queue = paths.slice();
          const plan: { path: [number, number][]; joined: boolean }[] = [];
          let pen: [number, number] | null = null;
          while (queue.length) {
            let pick = -1;
            let flip = false;
            let joined = false;
            if (pen) {
              let near = Infinity;
              queue.forEach((path, i) => {
                const da = Math.hypot(path[0][0] - pen![0], path[0][1] - pen![1]);
                const db = Math.hypot(path[path.length - 1][0] - pen![0], path[path.length - 1][1] - pen![1]);
                if (da < near) {
                  near = da;
                  pick = i;
                  flip = false;
                }
                if (db < near) {
                  near = db;
                  pick = i;
                  flip = true;
                }
              });
              joined = near <= 2.5;
              if (!joined) pick = -1;
            }
            if (pick < 0) {
              let low = Infinity;
              queue.forEach((path, i) => {
                const a = score(path[0]);
                const b = score(path[path.length - 1]);
                if (Math.min(a, b) < low) {
                  low = Math.min(a, b);
                  pick = i;
                  flip = b < a;
                }
              });
            }
            const chosen = queue.splice(pick, 1)[0];
            const path = flip ? chosen.slice().reverse() : chosen;
            plan.push({ path, joined });
            pen = path[path.length - 1];
          }
          const seed = li * 997 + index * 31;
          const letterStart = t;
          const stamps: Stamp[] = [];
          plan.forEach(({ path, joined }, si) => {
            const smooth = path.map((q, j) => {
              const a = path[Math.max(0, j - 2)];
              const b = path[Math.min(path.length - 1, j + 2)];
              return [(a[0] + q[0] * 2 + b[0]) / 4, (a[1] + q[1] * 2 + b[1]) / 4] as [number, number];
            });
            let length = 0;
            const arc = [0];
            for (let j = 1; j < smooth.length; j++) {
              length += Math.hypot(smooth[j][0] - smooth[j - 1][0], smooth[j][1] - smooth[j - 1][1]);
              arc.push(length);
            }
            const lands = !joined && terminal(path[0]);
            const lifts = terminal(path[path.length - 1]);
            const press = joined ? 0 : 0.012 + hash(seed + si) * 0.012;
            const duration = Math.max(0.02, length / speed) + press;
            for (let j = 0; j < smooth.length; j++) {
              const u = length > 0 ? arc[j] / length : 1;
              const tau = joined ? u : Math.acos(1 - 2 * Math.min(1, Math.max(0, u))) / Math.PI;
              const [x, y] = smooth[j];
              const d0 = dt[Math.round(path[j][1]) * gw + Math.round(path[j][0])] || 1;
              const enter = lands ? Math.exp(-((u / 0.14) ** 2)) : 0;
              const leave = lifts ? Math.exp(-(((1 - u) / 0.12) ** 2)) : 0;
              const pressure = 0.87 + 0.13 * enter + 0.1 * leave - 0.04 * Math.sin(Math.PI * u);
              stamps.push({
                x,
                y,
                r: d0,
                t: t + press * 0.6 + tau * (duration - press),
                p: Math.min(1, pressure),
              });
            }
            const next = plan[si + 1];
            t += duration + (next?.joined ? 0 : 0.01 + hash(seed + si * 3) * 0.012);
          });
          const letterEnd = t;
          const local = new Float32Array(gw * gh).fill(Infinity);
          const ltone = new Float32Array(gw * gh);
          for (const s of stamps) {
            const reach = s.r + 1.2;
            const x0 = Math.max(0, Math.floor(s.x - reach - 1));
            const x1 = Math.min(gw - 1, Math.ceil(s.x + reach + 1));
            const y0 = Math.max(0, Math.floor(s.y - reach - 1));
            const y1 = Math.min(gh - 1, Math.ceil(s.y + reach + 1));
            for (let yy = y0; yy <= y1; yy++) {
              for (let xx = x0; xx <= x1; xx++) {
                const q = yy * gw + xx;
                if (alpha[q] <= 0.02) continue;
                if (Math.hypot(xx - s.x, yy - s.y) > reach + 0.5) continue;
                if (s.t < local[q]) {
                  local[q] = s.t;
                  ltone[q] = s.p;
                }
              }
            }
          }
          for (let yy = 0; yy < gh; yy++) {
            const Y = gy + yy;
            if (Y < 0 || Y >= ph) continue;
            for (let xx = 0; xx < gw; xx++) {
              const X = gx + xx;
              if (X < 0 || X >= pw) continue;
              const q = yy * gw + xx;
              const a = alpha[q];
              if (a < 0.02) continue;
              const P = Y * pw + X;
              const at = Number.isFinite(local[q]) ? local[q] : letterEnd - 0.02;
              const tn = ltone[q] || 0.9;
              if (a > cover[P] || at < when[P]) {
                cover[P] = Math.max(cover[P], a);
                when[P] = Math.min(when[P], at);
                tone[P] = Math.max(tone[P], tn);
              }
            }
          }
          t = Math.max(t, letterStart + 0.05) + 0.02;
        }
        lineEnds.push(t);
        t += pause / 1000;
      });
      finish = (lineEnds[lineEnds.length - 1] ?? 0) + 0.35;
      const count = cover.reduce((n, v) => (v > 0.02 ? n + 1 : n), 0);
      order = new Uint32Array(count);
      let n = 0;
      for (let q = 0; q < cover.length; q++) if (cover[q] > 0.02) order[n++] = q;
      order.sort((a, b) => when[a] - when[b]);
      head = 0;
      wet = 0;
      built = true;
      paint(true);
    };

    const paint = (full: boolean) => {
      if (!img) return;
      const d = img.data;
      const [r, g, b] = ink;
      let x0 = pw;
      let y0 = ph;
      let x1 = -1;
      let y1 = -1;
      const mark = (q: number) => {
        const x = q % pw;
        const y = (q - x) / pw;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      };
      const set = (q: number) => {
        const age = clock - when[q];
        const fresh = age < 0.5 ? 1 + 0.2 * (1 - age / 0.5) : 1;
        const a = Math.min(1, cover[q] * (1 - (1 - tone[q]) * range) * fresh * Math.min(1, age / 0.05));
        d[q * 4] = r;
        d[q * 4 + 1] = g;
        d[q * 4 + 2] = b;
        d[q * 4 + 3] = Math.round(a * 255);
        mark(q);
      };
      if (full) {
        d.fill(0);
        for (let i = 0; i < order.length; i++) {
          const q = order[i];
          if (when[q] <= clock) set(q);
        }
        ctx.putImageData(img, 0, 0);
        return;
      }
      while (wet < head && clock - when[order[wet]] > 0.52) {
        set(order[wet]);
        wet++;
      }
      for (let i = wet; i < head; i++) set(order[i]);
      while (head < order.length && when[order[head]] <= clock) {
        set(order[head]);
        head++;
      }
      if (x1 >= x0) ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    };

    const running = () => onScreen && document.visibilityState === "visible";
    let sealShown = false;
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (control.started && built) {
        clock += dt;
        paint(false);
        if (!sealShown && clock >= finish) {
          sealShown = true;
          setSealAt(clock);
        }
      }
      const done = built && clock > finish + 0.5 && wet >= order.length;
      raf = done ? 0 : requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (running()) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    control.kick = () => {
      if (!raf) sync();
    };

    resolve();
    build();

    const resize = new ResizeObserver(() => build());
    resize.observe(root);
    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      sync();
    });
    visible.observe(root);
    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    const fonts = document.fonts;
    const onFonts = () => build();
    fonts?.addEventListener("loadingdone", onFonts);
    fonts?.ready.then(onFonts).catch(() => {});
    const stopTheme = onThemeChange(() => {
      resolve();
      paint(true);
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
  }, [key, pause, reduced]);

  const animate = !reduced && !failed;
  const tilt = (((key.length * 37) % 9) - 4) * 0.6;
  const mark = seal ? Array.from(seal).slice(0, 4) : [];

  return (
    <div {...props} ref={mergeRefs(own, ref)} className={cn("relative inline-block", className)} style={style}>
      <style href="miyuki-haiku-reveal" precedence="miyuki">
        {keyframes}
      </style>
      <p ref={body} className={cn(animate && "text-transparent motion-reduce:[color:inherit]")}>
        {lines.map((line, i) => (
          <span key={i} data-line="" className="block">
            {line}
          </span>
        ))}
      </p>
      <canvas
        ref={surface}
        aria-hidden="true"
        className={cn("pointer-events-none absolute top-0 left-0 select-none", !animate && "hidden")}
      />
      {mark.length ? (
        <div className="mt-[0.7em] flex justify-end" aria-hidden="true">
          <svg
            viewBox="0 0 40 40"
            className={cn(
              "size-[1.15em] text-chart-5",
              animate && sealAt === null && "opacity-0 motion-reduce:opacity-100",
            )}
            style={
              {
                "--miyuki-haiku-reveal-tilt": `${tilt}deg`,
                transform: `rotate(${tilt}deg)`,
                animation:
                  animate && sealAt !== null
                    ? "miyuki-haiku-reveal-seal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both"
                    : undefined,
              } as CSSProperties
            }
          >
            <defs>
              <filter id={`${id}-worn`} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="7" result="grain" />
                <feColorMatrix
                  in="grain"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.55"
                  result="holes"
                />
                <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
                <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="3" result="warp" />
                <feDisplacementMap in="inked" in2="warp" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
                <rect width="40" height="40" fill="#fff" />
                {mark.length === 1 ? (
                  <text
                    x="20"
                    y="21"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="25"
                    fontWeight="700"
                    fill="#000"
                  >
                    {mark[0]}
                  </text>
                ) : (
                  mark.map((ch, i) => {
                    const cols = Math.ceil(mark.length / 2);
                    const col = Math.floor(i / 2);
                    const row = i % 2;
                    const x = cols === 1 ? 20 : 29 - col * 18;
                    return (
                      <text
                        key={i}
                        x={x}
                        y={12.5 + row * 15.5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={cols === 1 ? 14 : 13}
                        fontWeight="700"
                        fill="#000"
                      >
                        {ch}
                      </text>
                    );
                  })
                )}
              </mask>
            </defs>
            <g filter={`url(#${id}-worn)`}>
              <path
                d="M4.6 5.2 C12 4.3 27.5 4.1 35.3 4.9 C35.9 12.6 36 27.2 35.2 35.1 C27.4 35.8 12.5 35.9 4.8 35.2 C4.1 27.6 4 12.8 4.6 5.2 Z"
                fill="currentColor"
                mask={`url(#${id}-cut)`}
              />
            </g>
          </svg>
        </div>
      ) : null}
    </div>
  );
}
