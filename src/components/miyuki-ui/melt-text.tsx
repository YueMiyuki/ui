"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MeltTextProps extends Omit<ComponentProps<"span">, "children" | "color"> {
  children: string;
  intensity?: number;
  color?: string;
  ref?: Ref<HTMLSpanElement>;
}

interface Site {
  x: number;
  y: number;
  run: number;
  baseline: number;
  top: number;
  heat: number;
  cool: number;
  soft: number;
}

interface Drop {
  site: Site;
  x: number;
  size: number;
  age: number;
  fallAt: number;
  fallY: number;
  speed: number;
  bead: HTMLSpanElement;
  neck: HTMLSpanElement;
}

interface Puddle {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  node: HTMLSpanElement;
}

const BEAD = 1.2;
const SAG = 1.1;
const RECOVER = 1.8;
const EVAPORATE = 8;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;

function findSites(root: HTMLElement, text: HTMLElement): { sites: Site[]; em: number } {
  const cs = getComputedStyle(text);
  const em = parseFloat(cs.fontSize) || 16;
  const box = root.getBoundingClientRect();
  const scale = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
  const W = Math.ceil(box.width / scale) + 4;
  const H = Math.ceil(box.height / scale + em * 0.6);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const node = text.firstChild;
  if (!ctx || !node || node.nodeType !== Node.TEXT_NODE) return { sites: [], em };
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.fontKerning = cs.fontKerning === "none" ? "none" : "normal";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  const words: { left: number; right: number; top: number; baseline: number }[] = [];
  const range = document.createRange();
  const source = node.textContent ?? "";
  for (const match of source.matchAll(/\S+/g)) {
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const rect = range.getClientRects()[0];
    if (!rect) continue;
    const metrics = ctx.measureText(match[0]);
    const x = (rect.left - box.left) / scale;
    const top = (rect.top - box.top) / scale;
    const baseline = top + metrics.fontBoundingBoxAscent;
    ctx.fillText(match[0], x, baseline);
    words.push({ left: x, right: x + metrics.width, top: baseline - metrics.actualBoundingBoxAscent, baseline });
  }
  const data = ctx.getImageData(0, 0, W, H).data;
  const sites: Site[] = [];
  const reach = Math.max(2, Math.round(em * 0.06));
  for (const word of words) {
    const x0 = Math.max(0, Math.floor(word.left) - 2);
    const x1 = Math.min(W - 1, Math.ceil(word.right) + 2);
    const yLow = Math.min(H - 1, Math.ceil(word.baseline + em * 0.3));
    const yHigh = Math.max(0, Math.floor(word.baseline - em * 0.5));
    const bottom: number[] = [];
    for (let x = x0; x <= x1; x++) {
      let found = -1;
      for (let y = yLow; y >= yHigh; y--) {
        if (data[(y * W + x) * 4 + 3] > 110) {
          found = y;
          break;
        }
      }
      bottom.push(found);
    }
    let start = -1;
    const flush = (end: number) => {
      if (start < 0) return;
      const run = end - start;
      if (run >= 3) {
        let y = 0;
        for (let i = start; i < end; i++) y = Math.max(y, bottom[i]);
        sites.push({
          x: x0 + (start + end - 1) / 2,
          y: y + 1,
          run,
          baseline: word.baseline,
          top: word.top,
          heat: 0,
          cool: 0,
          soft: 0,
        });
      }
      start = -1;
    };
    for (let i = 0; i < bottom.length; i++) {
      const b = bottom[i];
      let lowest = b >= word.baseline - em * 0.04;
      for (let k = Math.max(0, i - reach); lowest && k <= Math.min(bottom.length - 1, i + reach); k++) {
        if (bottom[k] > b + 0.75) lowest = false;
      }
      if (lowest && start < 0) start = i;
      if (!lowest) flush(i);
    }
    flush(bottom.length);
  }
  return { sites, em };
}

export function MeltText({ children, intensity = 0.5, color, className, style, ref, ...props }: MeltTextProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const own = useRef<HTMLSpanElement>(null);
  const crisp = useRef<HTMLSpanElement>(null);
  const dropLayer = useRef<HTMLSpanElement>(null);
  const puddleLayer = useRef<HTMLSpanElement>(null);
  const goo = useRef<SVGFEGaussianBlurElement>(null);
  const reduce = useReducedMotion() === true;
  const amount = clamp(intensity);

  useEffect(() => {
    const root = own.current;
    const text = crisp.current;
    const beads = dropLayer.current;
    const pool = puddleLayer.current;
    if (!root || !text || !beads || !pool || reduce) return;

    let sites: Site[] = [];
    let em = 16;
    const drops: Drop[] = [];
    const puddles: Puddle[] = [];
    const pointer = { x: 0, y: 0, inside: false };
    let raf = 0;
    let last = 0;

    const measure = () => {
      ({ sites, em } = findSites(root, text));
      goo.current?.setAttribute("stdDeviation", (em * 0.016).toFixed(2));
    };

    const blob = (layer: HTMLElement) => {
      const el = document.createElement("span");
      el.style.cssText = "position:absolute;left:0;top:0;border-radius:9999px;background:currentColor";
      layer.appendChild(el);
      return el;
    };

    const spawn = (site: Site) => {
      const size = em * 0.052 * (0.88 + Math.random() * 0.24);
      drops.push({
        site,
        x: site.x + (Math.random() - 0.5) * Math.min(site.run * 0.4, em * 0.05),
        size,
        age: 0,
        fallAt: 0,
        fallY: 0,
        speed: 0,
        bead: blob(beads),
        neck: blob(beads),
      });
    };

    const land = (x: number, size: number, baseline: number) => {
      const near = puddles.find((p) => Math.abs(p.x - x) < p.w + em * 0.12);
      if (near) {
        near.x = (near.x * near.w + x * size) / (near.w + size);
        near.w += size * 0.9;
        near.h = Math.min(em * 0.03, near.h + size * 0.12);
        near.life = 1;
        return;
      }
      puddles.push({ x, y: baseline + em * 0.22, w: size * 1.3, h: size * 0.5, life: 1, node: blob(pool) });
    };

    const step = (dt: number) => {
      const cap = 1 + Math.round(amount * 2);
      const gain = 0.5 + 1.4 * amount;
      for (const site of sites) {
        let near = 0;
        if (pointer.inside && pointer.y > site.top - em * 0.12 && pointer.y < site.baseline + em * 0.4) {
          near = clamp(1 - Math.abs(pointer.x - site.x) / (em * 0.34));
        }
        site.heat = clamp(site.heat + dt * (near * gain - 0.3), 0, 1.2);
        site.cool = Math.max(0, site.cool - dt);
        if (site.heat >= 1 && site.cool <= 0 && drops.length < cap) {
          spawn(site);
          site.heat = 0.3;
          site.cool = 3.4 + Math.random() * 1.6;
        }
      }
      for (const site of sites) site.soft = Math.min(1, site.heat) * 0.55;

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.age += dt;
        const { size, site } = d;
        const y0 = site.y;
        let r = size;
        let cy: number;
        let sx = 1;
        let sy = 1;
        const neckTop = y0 - size * 0.6;
        let neckBottom = neckTop;
        let neckWidth = 0;
        if (d.age < BEAD) {
          const t = d.age / BEAD;
          r = size * easeOut(t);
          cy = y0 + r * 0.25;
          sy = 1 + 0.12 * t;
          site.soft = Math.max(site.soft, 0.7 * t);
        } else if (d.age < BEAD + SAG) {
          const t = (d.age - BEAD) / SAG;
          cy = y0 + size * (0.25 + 2.3 * easeIn(t));
          sx = 1 - 0.1 * t;
          sy = 1.12 + 0.18 * t;
          neckBottom = cy;
          neckWidth = size * (1.15 - 0.45 * t);
          site.soft = Math.max(site.soft, 0.7 + 0.3 * t);
        } else {
          if (d.fallAt === 0) {
            d.fallAt = d.age;
            d.fallY = y0 + size * 2.55;
          }
          const t = d.age - d.fallAt;
          d.speed = em * 9 * t;
          cy = d.fallY + 0.5 * em * 9 * t * t;
          sx = 0.9;
          sy = 1.22 + Math.min(0.12, d.speed / (em * 40));
          const pinch = clamp(t / 0.14);
          neckBottom = d.fallY - size * 1.6 * pinch;
          neckWidth = size * 0.7 * (1 - pinch);
          site.soft = Math.max(site.soft, 1 - clamp(t / RECOVER));
          if (cy >= site.baseline + em * 0.22) {
            land(d.x, size, site.baseline);
            d.bead.remove();
            d.neck.remove();
            drops.splice(i, 1);
            continue;
          }
        }
        d.bead.style.width = d.bead.style.height = `${size * 2}px`;
        d.bead.style.transform = `translate(${d.x - size}px, ${cy - size}px) scale(${((r / size) * sx).toFixed(3)}, ${((r / size) * sy).toFixed(3)})`;
        if (neckWidth > 0.2 && neckBottom > neckTop) {
          d.neck.style.display = "";
          d.neck.style.width = `${neckWidth}px`;
          d.neck.style.height = `${neckBottom - neckTop}px`;
          d.neck.style.transform = `translate(${d.x - neckWidth / 2}px, ${neckTop}px)`;
        } else {
          d.neck.style.display = "none";
        }
      }

      for (let i = puddles.length - 1; i >= 0; i--) {
        const p = puddles[i];
        p.life -= dt / EVAPORATE;
        p.w += dt * em * 0.03 * p.life * p.life;
        if (p.life <= 0) {
          p.node.remove();
          puddles.splice(i, 1);
          continue;
        }
        const h = p.h * Math.sqrt(p.life);
        p.node.style.width = `${p.w * 2}px`;
        p.node.style.height = `${h * 2}px`;
        p.node.style.transform = `translate(${p.x - p.w}px, ${p.y - h}px)`;
      }

      const holes = sites
        .filter((s) => s.soft > 0.02)
        .map((s) => {
          const keep = (1 - 0.9 * s.soft).toFixed(3);
          return `radial-gradient(circle ${(em * 0.1).toFixed(1)}px at ${s.x.toFixed(1)}px ${(s.y - em * 0.04).toFixed(1)}px, rgb(0 0 0 / ${keep}) 35%, #000 100%)`;
        });
      text.style.maskImage = holes.length ? holes.join(",") : "";
      text.style.webkitMaskImage = text.style.maskImage;
      text.style.maskComposite = "intersect";
      text.style.setProperty("-webkit-mask-composite", "source-in");

      return pointer.inside || drops.length > 0 || puddles.length > 0 || sites.some((s) => s.heat > 0 || s.soft > 0.02);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = step(dt) ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      pointer.x = (e.clientX - box.left) / k;
      pointer.y = (e.clientY - box.top) / k;
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    document.fonts?.ready.then(measure).catch(() => {});
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      beads.replaceChildren();
      pool.replaceChildren();
      text.style.maskImage = "";
      text.style.webkitMaskImage = "";
    };
  }, [children, amount, reduce]);

  return (
    <span
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative isolate inline-block", className)}
      style={{ ...style, color }}
    >
      <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
        <filter id={`${uid}-goo`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur ref={goo} in="SourceGraphic" stdDeviation="2" result="blur" />
          <feComponentTransfer in="blur">
            <feFuncA type="linear" slope="22" intercept="-10" />
          </feComponentTransfer>
        </filter>
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+0.6em)] select-none"
        style={{ filter: `url(#${uid}-goo)` }}
      >
        <span className="block opacity-[0.86]">{children}</span>
        <span ref={dropLayer} className="absolute inset-0" />
      </span>
      <span
        ref={puddleLayer}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+0.6em)] opacity-35 select-none"
        style={{ filter: `url(#${uid}-goo)` }}
      />
      <span ref={crisp} className="block">
        {children}
      </span>
    </span>
  );
}
