"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PostcardFlipProps extends Omit<ComponentProps<"div">, "children"> {
  front: ReactNode;
  back: ReactNode;
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  turnLabel?: string;
}

type Mat = number[];

const BANDS = 30;
const MARGIN = 48;
const LIGHT = (() => {
  const v = [-0.38, -0.52, 0.76];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();
const HALF = (() => {
  const v = [LIGHT[0], LIGHT[1], LIGHT[2] + 1];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const num = (v: number) => (Math.abs(v) < 1e-7 ? 0 : +v.toFixed(5));

function mul(a: Mat, b: Mat): Mat {
  const o = new Array<number>(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

function rotAbout(kx: number, ky: number, phi: number): Mat {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const t = 1 - c;
  return [
    c + t * kx * kx,
    t * kx * ky,
    -s * ky,
    0,
    t * kx * ky,
    c + t * ky * ky,
    s * kx,
    0,
    s * ky,
    -s * kx,
    c,
    0,
    0,
    0,
    0,
    1,
  ];
}

const tr = (x: number, y: number, z: number): Mat => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

function clipStrip(W: number, H: number, ux: number, uy: number, a: number, b: number): [number, number][] {
  let poly: [number, number][] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const cut = (keep: (p: [number, number]) => number) => {
    const out: [number, number][] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const dp = keep(p);
      const dq = keep(q);
      if (dp >= 0) out.push(p);
      if (dp * dq < 0) {
        const t = dp / (dp - dq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    poly = out;
  };
  cut((p) => p[0] * ux + p[1] * uy - a);
  cut((p) => b - (p[0] * ux + p[1] * uy));
  return poly;
}

interface Pose {
  p: number;
  h: number;
}

function solve(W: number, H: number, { p, h }: Pose) {
  const g0 = Math.min(0.85, Math.atan2(H, W) * 1.3);
  const gamma = g0 * (1 - smooth(0, 0.6, p));
  const ux = Math.cos(gamma);
  const uy = Math.sin(gamma);
  const span = W * ux + H * uy;
  const rh = Math.min(W, H) * 0.075;
  const rt = W * 0.1;
  const R = rh + (rt - rh) * smooth(0, 0.4, p);
  const lh = Math.min(W, H) * 0.24 * h;
  const ell = lh + (span + Math.PI * R + 2 - lh) * easeInOut(p);
  const s0 = span - ell;
  const drop = smooth(0.78, 1, p);
  const curve = (s: number): [number, number] => {
    if (s <= s0) return [s, 0];
    const th = (s - s0) / R;
    if (th < Math.PI) return [s0 + R * Math.sin(th), R * (1 - Math.cos(th)) * (1 - drop)];
    return [s0 - (s - s0 - Math.PI * R), 2 * R * (1 - drop)];
  };
  const edges: number[] = [];
  const cylA = clamp(s0, 0, span);
  const cylB = clamp(s0 + Math.PI * R, 0, span);
  edges.push(0, cylA);
  const n = BANDS - 2;
  for (let i = 1; i < n; i++) edges.push(cylA + ((cylB - cylA) * i) / n);
  edges.push(cylB, span);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < edges.length; i++) {
    const [U] = curve(edges[i]);
    lo = Math.min(lo, U);
    hi = Math.max(hi, U);
  }
  if (s0 + R * 0.5 * Math.PI > 0 && s0 + R * 0.5 * Math.PI < span) hi = Math.max(hi, s0 + R);
  const D = (span / 2 - (lo + hi) / 2) * smooth(0, 0.3, p);
  return { ux, uy, span, s0, R, edges, curve, D };
}

export function PostcardFlip({
  front,
  back,
  flipped: flippedProp,
  defaultFlipped = false,
  onFlippedChange,
  turnLabel = "Turn the postcard over",
  className,
  style,
  ...props
}: PostcardFlipProps) {
  const reduced = useReducedMotion() ?? false;
  const [inner, setInner] = useState(defaultFlipped);
  const flipped = flippedProp ?? inner;
  const [shown, setShown] = useState(flipped);
  const [active, setActive] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLCanvasElement>(null);
  const pose = useRef<
    Pose & {
      target: number;
      hoverTarget: number;
      vel: number;
      hv: number;
      drag: null | { id: number; x: number; p: number; t: number; v: number };
    }
  >({
    p: 0,
    h: 0,
    target: 0,
    hoverTarget: 0,
    vel: 0,
    hv: 0,
    drag: null,
  });
  const loop = useRef<{ wake: () => void; paint: () => void }>({ wake: () => {}, paint: () => {} });
  const live = useRef({ reduced, shown, flipped, onFlippedChange, controlled: flippedProp !== undefined });
  useLayoutEffect(() => {
    live.current = { reduced, shown, flipped, onFlippedChange, controlled: flippedProp !== undefined };
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ w: root.offsetWidth, h: root.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const table = tableRef.current;
    if (!active || !size || !stage || !table) return;
    const { w: W, h: H } = size;
    const ctx = table.getContext("2d");
    const uppers = Array.from(stage.querySelectorAll<HTMLElement>("[data-upper]"));
    const unders = Array.from(stage.querySelectorAll<HTMLElement>("[data-under]"));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    table.width = Math.round((W + MARGIN * 2) * dpr);
    table.height = Math.round((H + MARGIN * 2) * dpr);
    const dark = !!rootRef.current?.closest(".dark") || document.documentElement.classList.contains("dark");
    const neutral =
      dark &&
      !!rootRef.current &&
      getComputedStyle(rootRef.current).getPropertyValue("--miyuki-postcard-flip-ink").trim() === "1";
    const shadeInk = neutral ? "oklch(0.06 0 0)" : dark ? "oklch(0.06 0.02 250)" : "oklch(0.3 0.06 252)";

    const paint = () => {
      const g = solve(W, H, pose.current);
      const { ux, uy, edges, curve, D, s0, R, span } = g;
      const kx = uy;
      const ky = -ux;
      const angle = 90 + (Math.atan2(uy, ux) * 180) / Math.PI;
      const polys: { pts: [number, number][]; z: number }[] = [];
      for (let i = 0; i < BANDS; i++) {
        const up = uppers[i];
        const un = unders[i];
        if (!up || !un) continue;
        const a = edges[i];
        const b = edges[i + 1];
        if (b - a < 0.01) {
          up.style.visibility = un.style.visibility = "hidden";
          continue;
        }
        up.style.visibility = un.style.visibility = "visible";
        const [Ua, Za] = curve(a);
        const [Ub, Zb] = curve(b);
        const phi = Math.atan2(Zb - Za, Ub - Ua);
        const m = mul(tr((Ua + D) * ux, (Ua + D) * uy, Za), mul(rotAbout(kx, ky, phi), tr(-a * ux, -a * uy, 0)));
        const flip = mul(m, [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, W, 0, 0, 1]);
        const pts = clipStrip(W, H, ux, uy, a - 0.6, b + 0.6);
        up.style.transform = `matrix3d(${m.map(num).join(",")})`;
        un.style.transform = `matrix3d(${flip.map(num).join(",")})`;
        up.style.clipPath = `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(",")})`;
        un.style.clipPath = `polygon(${pts.map(([x, y]) => `${(W - x).toFixed(2)}px ${y.toFixed(2)}px`).join(",")})`;
        const nUp = [-Math.sin(phi) * ux, -Math.sin(phi) * uy, Math.cos(phi)];
        const lit = (n: number[]) => (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2];
        const spec = (n: number[]) => Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2]) ** 60;
        const faceShade = (el: HTMLElement, n: number[], gloss: number, isBase: boolean) => {
          const sh = el.lastElementChild as HTMLElement | null;
          if (!sh) return;
          const l = lit(n);
          const s = spec(n) * gloss;
          const layers: string[] = [];
          if (isBase && s0 > 0 && s0 < span) {
            const flapFrom = Math.max(0, 2 * s0 + Math.PI * R - span);
            const ao = `linear-gradient(${angle}deg, transparent ${(s0 - R * 1.4).toFixed(1)}px, color-mix(in oklab, ${shadeInk} 30%, transparent) ${s0.toFixed(1)}px)`;
            layers.push(ao);
            if (flapFrom < s0 - 1) {
              const off = R * 0.9;
              layers.push(
                `linear-gradient(${angle}deg, transparent ${(flapFrom + off - R * 0.6).toFixed(1)}px, color-mix(in oklab, ${shadeInk} 22%, transparent) ${(flapFrom + off + R * 0.5).toFixed(1)}px)`,
              );
            }
          }
          if (l < 1)
            layers.push(
              `linear-gradient(color-mix(in oklab, ${shadeInk} ${Math.min(62, (1 - l) * 70).toFixed(1)}%, transparent) 0 0)`,
            );
          else layers.push(`linear-gradient(oklch(1 0 0 / ${Math.min(0.3, (l - 1) * 0.9).toFixed(3)}) 0 0)`);
          if (s > 0.01) layers.push(`linear-gradient(oklch(1 0 0 / ${Math.min(0.55, s).toFixed(3)}) 0 0)`);
          sh.style.backgroundImage = layers.join(", ");
        };
        const upperIsPicture = !live.current.shown;
        faceShade(up, nUp, upperIsPicture ? 0.9 : 0.25, i === 0);
        faceShade(
          un,
          nUp.map((v) => -v),
          upperIsPicture ? 0.25 : 0.9,
          false,
        );
        const z = Math.max(Za, Zb);
        polys.push({ pts, z });
      }
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, MARGIN * dpr, MARGIN * dpr);
        ctx.clearRect(-MARGIN, -MARGIN, W + MARGIN * 2, H + MARGIN * 2);
        const color = neutral ? "rgba(6, 6, 6, 0.7)" : dark ? "rgba(2, 6, 16, 0.7)" : "rgba(40, 62, 110, 0.26)";
        for (const { pts, z } of polys) {
          if (pts.length < 3) continue;
          const lift = Math.min(z, 3 * R);
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = (6 + lift * 0.5) * dpr;
          const ox = lift * 0.32;
          const oy = 3 + lift * 0.45;
          ctx.shadowOffsetX = (ox + 4000) * dpr;
          ctx.shadowOffsetY = oy * dpr;
          ctx.beginPath();
          pts.forEach(([x, y], k) => {
            const s = x * ux + y * uy;
            const [U] = curve(s);
            const px = x + (U + D - s) * ux - 4000;
            const py = y + (U + D - s) * uy;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fillStyle = "#000";
          ctx.fill();
          ctx.restore();
        }
      }
    };
    loop.current.paint = paint;
    paint();
  }, [active, size, shown]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const s = pose.current;
    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
      last = now;
      s.hv += (-260 * (s.h - s.hoverTarget) - 26 * s.hv) * dt;
      s.h = clamp(s.h + s.hv * dt, 0, 1.15);
      if (!s.drag) {
        if (s.target === 1) {
          s.vel = Math.min(1.25, s.vel + dt * 3.2);
          s.p = Math.min(1, s.p + s.vel * dt);
        } else if (s.p > 0) {
          s.vel = Math.min(1.6, s.vel + dt * 4);
          s.p = Math.max(0, s.p - s.vel * dt);
        }
      }
      loop.current.paint();
      if (s.p >= 1) {
        s.p = 0;
        s.vel = 0;
        s.target = 0;
        s.h = 0;
        s.hv = 0;
        const next = !live.current.shown;
        setShown(next);
        if (!live.current.controlled) setInner(next);
        live.current.onFlippedChange?.(next);
        last = 0;
        return;
      }
      const resting = s.p === 0 && !s.drag && s.hoverTarget === 0 && s.h < 0.002 && Math.abs(s.hv) < 0.01;
      if (resting) {
        s.h = 0;
        setActive(false);
        last = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    };
    loop.current.wake = () => {
      setActive(true);
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(step);
      }
    };
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (flipped === live.current.shown) return;
    if (live.current.reduced) {
      setShown(flipped);
      stageRef.current?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      return;
    }
    const s = pose.current;
    s.target = 1;
    s.vel = 0.15;
    loop.current.wake();
  }, [flipped]);

  const turn = () => {
    const next = !live.current.shown;
    if (live.current.reduced) {
      if (flippedProp === undefined) setInner(next);
      onFlippedChange?.(next);
      return;
    }
    if (flippedProp !== undefined) {
      onFlippedChange?.(next);
      return;
    }
    const s = pose.current;
    s.target = 1;
    s.vel = Math.max(s.vel, 0.15);
    loop.current.wake();
  };

  const upper = shown ? back : front;
  const under = shown ? front : back;
  const W = size?.w ?? 0;
  const H = size?.h ?? 0;

  return (
    <div
      role="group"
      aria-roledescription="postcard"
      {...props}
      ref={rootRef}
      className={cn(
        "group/postcard relative isolate aspect-[148/100] w-[440px] max-w-full cursor-pointer touch-pan-y rounded-[4px] select-none ink:[--miyuki-postcard-flip-ink:1]",
        "[&_img]:pointer-events-none",
        className,
      )}
      style={style}
      onDragStart={(e) => e.preventDefault()}
      onPointerEnter={(e) => {
        props.onPointerEnter?.(e);
        if (e.pointerType !== "mouse" || live.current.reduced) return;
        pose.current.hoverTarget = 1;
        loop.current.wake();
      }}
      onPointerLeave={(e) => {
        props.onPointerLeave?.(e);
        if (pose.current.drag) return;
        pose.current.hoverTarget = 0;
        loop.current.wake();
      }}
      onPointerDown={(e) => {
        props.onPointerDown?.(e);
        if (e.button !== 0 || live.current.reduced || flippedProp !== undefined) return;
        const s = pose.current;
        s.drag = { id: e.pointerId, x: e.clientX, p: s.p, t: performance.now(), v: 0 };
      }}
      onPointerMove={(e) => {
        props.onPointerMove?.(e);
        const s = pose.current;
        const d = s.drag;
        if (!d || d.id !== e.pointerId) return;
        const dx = d.x - e.clientX;
        if (Math.abs(dx) < 6 && s.p === 0) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        const p = clamp(d.p + dx / Math.max(1, W * 1.05), 0, 0.999);
        const t = performance.now();
        d.v = (p - s.p) / Math.max(0.008, (t - d.t) / 1000);
        d.t = t;
        s.p = p;
        s.target = 0;
        loop.current.wake();
      }}
      onPointerUp={(e) => {
        props.onPointerUp?.(e);
        const s = pose.current;
        const d = s.drag;
        if (!d || d.id !== e.pointerId) return;
        s.drag = null;
        if (s.p === 0) return;
        s.target = s.p > 0.45 || d.v > 1.2 ? 1 : 0;
        s.vel = Math.abs(d.v) * 0.5;
        if (e.pointerType !== "mouse") s.hoverTarget = 0;
        loop.current.wake();
      }}
      onPointerCancel={() => {
        pose.current.drag = null;
        pose.current.target = 0;
        loop.current.wake();
      }}
    >
      <div
        aria-hidden={active || undefined}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[4px] shadow-[0_1px_2px_oklch(0.42_0.09_250/0.14),0_12px_26px_-12px_oklch(0.42_0.09_250/0.32)] dark:shadow-[0_1px_2px_oklch(0.02_0.02_250/0.6),0_12px_26px_-12px_oklch(0.02_0.02_250/0.85)] ink:shadow-[0_1px_2px_oklch(0.02_0_0/0.6),0_12px_26px_-12px_oklch(0.02_0_0/0.85)]",
          active && "invisible",
        )}
      >
        {upper}
      </div>
      {active && size ? (
        <div
          ref={stageRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ perspective: 1700 }}
        >
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            <canvas
              ref={tableRef}
              className="absolute"
              style={{
                left: -MARGIN,
                top: -MARGIN,
                width: W + MARGIN * 2,
                height: H + MARGIN * 2,
                transform: "translateZ(-1px)",
              }}
            />
            {Array.from({ length: BANDS }, (_, i) => (
              <div key={i} className="contents">
                <div
                  data-upper=""
                  className="absolute top-0 left-0 overflow-hidden [backface-visibility:hidden]"
                  style={{ width: W, height: H, transformOrigin: "0 0" }}
                >
                  <div inert className="absolute inset-0">
                    {upper}
                  </div>
                  <div className="absolute inset-0" />
                </div>
                <div
                  data-under=""
                  className="absolute top-0 left-0 overflow-hidden [backface-visibility:hidden]"
                  style={{ width: W, height: H, transformOrigin: "0 0" }}
                >
                  <div inert className="absolute inset-0">
                    {under}
                  </div>
                  <div className="absolute inset-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-pressed={shown}
        aria-label={turnLabel}
        className="absolute inset-0 cursor-pointer rounded-[4px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        onClick={turn}
        onFocus={(e) => {
          if (live.current.reduced || !e.currentTarget.matches(":focus-visible")) return;
          pose.current.hoverTarget = 0.8;
          loop.current.wake();
        }}
        onBlur={() => {
          pose.current.hoverTarget = 0;
          loop.current.wake();
        }}
      />
    </div>
  );
}

export interface PostcardBackProps extends ComponentProps<"div"> {
  message: ReactNode;
  signature?: ReactNode;
  address: string[];
  postcode?: string;
  stamp?: ReactNode;
  value?: ReactNode;
  postmark?: { place: string; date: string };
}

const INK = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 2.05'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>",
)}")`;

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.03 .55' numOctaves='2' seed='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.5 -.98'/></filter><rect width='220' height='220' filter='url(#a)'/><rect width='220' height='220' filter='url(#b)'/></svg>",
)}")`;

export function PostcardBack({
  message,
  signature,
  address,
  postcode,
  stamp,
  value = "84",
  postmark,
  className,
  ...props
}: PostcardBackProps) {
  const digits = (postcode ?? "").replace(/\D/g, "").slice(0, 7).padEnd(7, " ").split("");
  return (
    <div
      {...props}
      className={cn(
        "@container relative size-full overflow-hidden bg-[color-mix(in_oklab,var(--card)_95%,var(--warning))] text-[oklch(0.25_0.035_248)] dark:bg-[color-mix(in_oklab,var(--foreground)_88%,var(--warning))]",
        "[--miyuki-postcard-flip-pen:oklch(0.36_0.12_258)] [--miyuki-postcard-flip-mark:oklch(0.32_0.05_250/0.78)] [--miyuki-postcard-flip-red:oklch(0.58_0.17_22)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.26] mix-blend-multiply"
        style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
      />
      <div className="absolute inset-y-[9%] left-1/2 w-px bg-[oklch(0.42_0.06_250/0.35)]" />
      <div className="absolute top-[7%] left-[5%] w-[41%] -rotate-[1.2deg] text-[clamp(10px,3.1cqw,14px)] leading-[1.55] text-(--miyuki-postcard-flip-pen)">
        <div className="tracking-[0.005em]">{message}</div>
        {signature != null ? <div className="mt-2 text-right font-medium">{signature}</div> : null}
      </div>
      <div className="absolute top-[7%] right-[5%] flex flex-col items-end gap-2">
        <div className="relative">
          <div
            className="relative grid aspect-[4/5] w-[clamp(44px,15cqw,68px)] place-items-stretch bg-[color-mix(in_oklab,var(--card)_96%,var(--warning))] p-[4px] shadow-[0_1px_1.5px_oklch(0.2_0.04_250/0.3)] dark:bg-[color-mix(in_oklab,var(--foreground)_94%,var(--warning))]"
            style={{
              maskImage: "linear-gradient(#000 0 0), radial-gradient(circle at 3px 3px, #0000 1.8px, #000 2.2px)",
              maskSize: "calc(100% - 6px) calc(100% - 6px), 6px 6px",
              maskPosition: "center, -3px -3px",
              maskRepeat: "no-repeat, round",
            }}
          >
            <div className="relative overflow-hidden bg-brand-soft">
              {stamp}
              <span className="absolute right-1 bottom-0.5 text-[9px] leading-none font-semibold text-[oklch(0.985_0.004_236)] [text-shadow:0_0_2px_oklch(0.2_0.05_250/0.8)] tabular-nums">
                {value}
              </span>
            </div>
          </div>
          {postmark ? (
            <svg
              viewBox="0 0 150 64"
              aria-hidden="true"
              className="pointer-events-none absolute top-[30%] -left-[118%] w-[230%] -rotate-[8deg] text-(--miyuki-postcard-flip-mark)"
              style={{ maskImage: INK, maskSize: "140px 140px" }}
            >
              <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="32" cy="32" r="21.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
              <text x="32" y="27" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="currentColor">
                {postmark.place}
              </text>
              <text x="32" y="40" textAnchor="middle" fontSize="8" fill="currentColor">
                {postmark.date}
              </text>
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M62 ${14 + i * 9} q 7 -5 14 0 t 14 0 t 14 0 t 14 0 t 14 0 t 14 0`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          ) : null}
        </div>
      </div>
      <div className="absolute right-[5%] bottom-[9%] left-[55%] flex flex-col gap-[clamp(4px,2cqw,9px)]">
        {postcode != null ? (
          <div className="mb-1 flex gap-[3px] self-end">
            {digits.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "grid h-[clamp(14px,5cqw,20px)] w-[clamp(11px,4cqw,16px)] place-items-center border border-(--miyuki-postcard-flip-red) text-[clamp(9px,3cqw,13px)] leading-none text-(--miyuki-postcard-flip-pen) tabular-nums",
                  i === 3 && "ml-[3px]",
                )}
              >
                {d.trim()}
              </span>
            ))}
          </div>
        ) : null}
        {address.map((line, i) => (
          <div
            key={i}
            className="truncate border-b border-[oklch(0.42_0.06_250/0.35)] pb-[2px] text-[clamp(10px,3.1cqw,14px)] leading-tight text-(--miyuki-postcard-flip-pen)"
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
