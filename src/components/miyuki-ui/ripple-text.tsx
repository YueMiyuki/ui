"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type PointerEvent, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface RippleTextProps extends Omit<ComponentProps<"span">, "children"> {
  children: string;
  amplitude?: number;
  speed?: number;
  ref?: Ref<HTMLSpanElement>;
}

interface Letter {
  ch: string;
  x: number;
  y: number;
  h: number;
  cx: number;
  line: number;
}

interface Wave {
  x: number;
  line: number;
  t0: number;
  amp: number;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function measure(root: HTMLElement, text: HTMLElement): Letter[] {
  const node = text.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return [];
  const box = root.getBoundingClientRect();
  const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
  const source = node.textContent ?? "";
  const range = document.createRange();
  const out: Letter[] = [];
  let line = -1;
  let lineTop = -Infinity;
  for (let i = 0; i < source.length; ) {
    const cp = source.codePointAt(i) ?? 0;
    const len = cp > 0xffff ? 2 : 1;
    const ch = source.slice(i, i + len);
    range.setStart(node, i);
    range.setEnd(node, i + len);
    i += len;
    if (/\s/.test(ch)) continue;
    const rect = range.getClientRects()[0];
    if (!rect || rect.width === 0) continue;
    const x = (rect.left - box.left) / k;
    const y = (rect.top - box.top) / k;
    const h = rect.height / k;
    if (y > lineTop + h * 0.5) {
      line++;
      lineTop = y;
    }
    out.push({ ch, x, y, h, cx: x + rect.width / k / 2, line });
  }
  return out;
}

const gauss = (u: number, w: number) => Math.exp(-(u * u) / (w * w));

export function RippleText({
  children,
  amplitude = 14,
  speed = 1,
  className,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  ref,
  ...props
}: RippleTextProps) {
  const own = useRef<HTMLSpanElement>(null);
  const base = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = useReducedMotion() === true;
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const sim = useRef({
    waves: [] as Wave[],
    px: 0,
    py: 0,
    line: -1,
    vx: 0,
    bow: 0,
    dir: 1,
    lastMove: 0,
    lastWake: 0,
    raf: 0,
    wake: () => {},
  });

  useEffect(() => {
    const root = own.current;
    const text = base.current;
    if (!root || !text || reduced) return;
    let cancelled = false;
    const read = () => {
      if (!cancelled) setLetters(measure(root, text));
    };
    const observer = new ResizeObserver(read);
    observer.observe(root);
    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", read);
    fonts?.ready.then(read).catch(() => {});
    return () => {
      cancelled = true;
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", read);
    };
  }, [children, reduced]);

  useEffect(() => {
    const s = sim.current;
    const els = glyphs.current;
    if (!letters || reduced) return;
    const size = letters.reduce((m, l) => Math.max(m, l.h), 0) || 16;
    const lambda = size * 0.95;
    const c = 560 * Math.max(0.1, speed);
    const life = 2.6 / Math.max(0.25, Math.sqrt(speed));
    let visible = true;

    const height = (x: number, line: number, t: number) => {
      let h = 0;
      for (const w of s.waves) {
        if (w.line !== line) continue;
        const tau = t - w.t0;
        if (tau < 0) continue;
        const r = Math.abs(x - w.x);
        const fade = Math.exp(-tau / (life * 0.42));
        const press =
          -w.amp * 0.75 * gauss(r, lambda * 0.42) * Math.exp(-tau / 0.22) * Math.cos((Math.PI * 2 * tau) / 0.46);
        const spread = 1 + (r / lambda) * 0.12;
        const width = lambda * 0.3 * spread;
        const u = r - c * tau;
        const d = lambda * 0.55 * spread;
        const packet = gauss(u, width) - 0.62 * gauss(u + d, width) + 0.22 * gauss(u + d * 2, width);
        const reach = ((1 - gauss(r, lambda * 0.4)) / Math.sqrt(1 + r / lambda)) * Math.exp(-r / (lambda * 11));
        h += press + w.amp * packet * reach * fade;
      }
      if (s.bow > 0.001 && line === s.line) {
        const ahead = x - s.px - s.dir * lambda * 0.32;
        const behind = x - s.px + s.dir * lambda * 0.55;
        h += amplitude * 0.55 * s.bow * (gauss(ahead, lambda * 0.42) - 0.45 * gauss(behind, lambda * 0.5));
      }
      return h;
    };

    let last = performance.now();
    const frame = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.waves = s.waves.filter((w) => t - w.t0 < life);
      const still = now - s.lastMove > 60;
      s.bow += ((still ? 0 : Math.min(1, Math.abs(s.vx) / 700)) - s.bow) * (1 - Math.exp(-dt / (still ? 0.28 : 0.08)));
      if (still) s.vx *= Math.exp(-dt / 0.1);
      const probe = Math.max(2, lambda * 0.12);
      letters.forEach((l, i) => {
        const el = els[i];
        if (!el) return;
        const h = height(l.cx, l.line, t);
        const slope = (height(l.cx + probe, l.line, t) - height(l.cx - probe, l.line, t)) / (probe * 2);
        const tilt = Math.max(-0.16, Math.min(0.16, -Math.atan(slope) * 0.45));
        el.style.transform = `translate3d(0, ${(-h).toFixed(2)}px, 0) rotate(${tilt.toFixed(4)}rad)`;
      });
      if (s.waves.length > 0 || s.bow > 0.002) {
        s.raf = visible ? requestAnimationFrame(frame) : 0;
      } else {
        s.raf = 0;
        s.bow = 0;
        els.forEach((el) => {
          if (el) el.style.transform = "";
        });
      }
    };
    s.wake = () => {
      if (s.raf || !visible || document.visibilityState !== "visible") return;
      last = performance.now();
      s.raf = requestAnimationFrame(frame);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (!visible) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      } else if (s.waves.length > 0) s.wake();
    });
    if (own.current) observer.observe(own.current);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      } else s.wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.wake = () => {};
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      els.forEach((el) => {
        if (el) el.style.transform = "";
      });
    };
  }, [letters, reduced, amplitude, speed]);

  const locate = (event: PointerEvent<HTMLSpanElement>) => {
    const root = own.current;
    if (!root || !letters || letters.length === 0) return null;
    const box = root.getBoundingClientRect();
    const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
    const x = (event.clientX - box.left) / k;
    const y = (event.clientY - box.top) / k;
    let best = letters[0];
    let score = Infinity;
    for (const l of letters) {
      const dy = y < l.y ? l.y - y : y > l.y + l.h ? y - l.y - l.h : 0;
      const d = Math.abs(x - l.cx) + dy * 4;
      if (d < score) {
        score = d;
        best = l;
      }
    }
    return { x, y, letter: best };
  };

  const active = letters !== null && !reduced;

  return (
    <span
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative inline-block touch-pan-y", className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const hit = active ? locate(event) : null;
        if (!hit) return;
        const s = sim.current;
        s.waves.push({ x: hit.letter.cx, line: hit.letter.line, t0: performance.now() / 1000, amp: amplitude });
        if (s.waves.length > 24) s.waves.shift();
        s.wake();
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        const hit = active ? locate(event) : null;
        if (!hit) return;
        const s = sim.current;
        const now = performance.now();
        const dt = Math.max(1, now - s.lastMove);
        const sameLine = s.line === hit.letter.line && now - s.lastMove < 200;
        const v = sameLine ? ((hit.x - s.px) / dt) * 1000 : 0;
        s.vx = s.vx * 0.6 + v * 0.4;
        if (Math.abs(s.vx) > 30) s.dir = Math.sign(s.vx);
        s.px = hit.x;
        s.py = hit.y;
        s.line = hit.letter.line;
        s.lastMove = now;
        if (Math.abs(s.vx) > 160 && now - s.lastWake > 90) {
          s.lastWake = now;
          const strength = Math.min(1, Math.abs(s.vx) / 1400);
          s.waves.push({ x: hit.x, line: hit.letter.line, t0: now / 1000, amp: amplitude * 0.22 * strength });
          if (s.waves.length > 24) s.waves.shift();
        }
        s.wake();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        sim.current.lastMove = 0;
      }}
    >
      <span ref={base} className={cn(active && "text-transparent")}>
        {children}
      </span>
      {active ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
          {letters.map((l, i) => (
            <span
              key={`${i}-${l.ch}`}
              ref={(el) => {
                glyphs.current[i] = el;
              }}
              className="absolute whitespace-pre"
              style={{
                left: l.x,
                top: l.y,
                height: l.h,
                lineHeight: `${l.h}px`,
                transformOrigin: `50% ${(l.h * 0.78).toFixed(1)}px`,
              }}
            >
              {l.ch}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
