"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface InstantPhotoProps extends Omit<ComponentProps<"figure">, "children"> {
  src: string;
  alt?: string;
  caption?: ReactNode;
  duration?: number;
  developed?: boolean;
  eject?: boolean;
  tilt?: number;
  onDeveloped?: () => void;
}

const SPREAD = 0.09;
const EJECT_MS = 1250;
const BACK = { type: "spring", stiffness: 260, damping: 18 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function stage(q: number) {
  const n = 14;
  const cast = smooth(0.2, 0.95, q);
  const gain = [lerp(0.8, 1, cast), lerp(0.95, 1, cast), lerp(1.07, 1, cast)];
  const lift = smooth(0, 0.4, q);
  const haze = [lerp(0.4, 0.55, lift), lerp(0.47, 0.59, lift), lerp(0.46, 0.575, lift)];
  const rows: string[] = [];
  for (let ch = 0; ch < 3; ch++) {
    const values: string[] = [];
    for (let k = 0; k < n; k++) {
      const L = k / (n - 1);
      const w = smooth(0, 1, (q - (0.02 + 0.48 * L)) / 0.38);
      const dev = Math.min(1, L * gain[ch] + (1 - cast) * 0.02);
      values.push(lerp(haze[ch], dev, w).toFixed(3));
    }
    rows.push(values.join(" "));
  }
  const color = smooth(0.48, 1, q);
  const sat = lerp(0.4, 1, smooth(0.62, 1, q));
  return { rows, color, sat };
}

export function InstantPhoto({
  src,
  alt = "",
  caption,
  duration = 8,
  developed,
  eject = false,
  tilt = 0,
  onDeveloped,
  className,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: InstantPhotoProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const energy = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; t: number; lx: number; ly: number } | null>(null);
  const doneRef = useRef(onDeveloped);
  const [ejectState, setEjecting] = useState(eject && developed !== true);
  const ejecting = ejectState && !reduced;
  const [busy, setBusy] = useState(developed !== true);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(tilt);
  const initial = developed === true ? 1 : 0;
  const id = (name: string) => `miyuki-instant-photo-${uid}-${name}`;
  const holdRef = useRef(eject && developed !== true && !reduced);

  useEffect(() => {
    doneRef.current = onDeveloped;
  }, [onDeveloped]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const layers = (["lead", "lag"] as const).map((name) => ({
      image: svg.querySelector<SVGImageElement>(`[data-layer="${name}"]`),
      funcs: Array.from(svg.querySelectorAll(`[data-filter="${name}"] [data-func]`)),
      mix: svg.querySelector(`[data-filter="${name}"] [data-mix]`),
      sat: svg.querySelector(`[data-filter="${name}"] [data-sat]`),
      offset: name === "lead" ? SPREAD : -SPREAD,
    }));

    const apply = (q: number) => {
      const finished = q >= 1;
      for (const layer of layers) {
        if (!layer.image) continue;
        if (finished) {
          layer.image.removeAttribute("filter");
          if (layer.offset > 0) layer.image.setAttribute("visibility", "hidden");
          continue;
        }
        layer.image.setAttribute("filter", `url(#miyuki-instant-photo-${uid}-${layer.offset > 0 ? "lead" : "lag"})`);
        layer.image.removeAttribute("visibility");
        const s = stage(clamp01(q + layer.offset));
        layer.funcs.forEach((f, ch) => f.setAttribute("tableValues", s.rows[ch]));
        layer.mix?.setAttribute("k2", (1 - s.color).toFixed(3));
        layer.mix?.setAttribute("k3", s.color.toFixed(3));
        layer.sat?.setAttribute("values", s.sat.toFixed(3));
      }
    };

    if (developed !== undefined) {
      apply(developed ? 1 : 0);
      return;
    }

    let q = 0;
    let raf = 0;
    let last = 0;
    apply(0);
    const tick = (ms: number) => {
      const dt = last ? Math.min(0.1, (ms - last) / 1000) : 0;
      last = ms;
      energy.current *= Math.exp(-dt * 1.6);
      q += (dt / Math.max(0.5, duration)) * (1 + 0.8 * energy.current);
      apply(Math.min(1, q));
      if (q >= 1) {
        setBusy(false);
        doneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const wait = setTimeout(
      () => {
        holdRef.current = false;
        raf = requestAnimationFrame(tick);
      },
      holdRef.current ? EJECT_MS : 0,
    );
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(raf);
    };
  }, [src, developed, duration, uid]);

  useEffect(() => {
    rotate.set(tilt);
  }, [tilt, rotate]);

  function shake() {
    energy.current = Math.min(1, energy.current + 0.6);
    if (reduced) return;
    animate(x, [0, -9, 8, -6, 4, -2, 0], { duration: 0.55, ease: "easeInOut" });
    animate(rotate, [tilt, tilt - 3, tilt + 2.6, tilt - 1.8, tilt + 1, tilt], { duration: 0.55, ease: "easeInOut" });
  }

  const ejectY = ["-104%", "-74%", "-71%", "-37%", "-34%", "0%"];

  return (
    <figure
      {...props}
      tabIndex={0}
      aria-busy={busy && developed === undefined ? true : undefined}
      aria-roledescription="instant print"
      aria-label={alt || "Instant print"}
      aria-description="Press Space to shake it."
      className={cn(
        "group/print relative m-0 w-56 shrink-0 touch-none rounded-[4px] outline-none select-none",
        "[--miyuki-instant-photo-paper:oklch(0.986_0.004_240)] dark:[--miyuki-instant-photo-paper:oklch(0.875_0.008_240)] ink:[--miyuki-instant-photo-paper:oklch(0.875_0_0)]",
        "focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(e);
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          shake();
        }
      }}
      onPointerDown={(e: PointerEvent<HTMLElement>) => {
        onPointerDown?.(e);
        if (reduced || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, lx: e.clientX, ly: e.clientY };
      }}
      onPointerMove={(e: PointerEvent<HTMLElement>) => {
        onPointerMove?.(e);
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dt = Math.max(1, e.timeStamp - d.t);
        const vx = (e.clientX - d.lx) / dt;
        const speed = Math.hypot(vx, (e.clientY - d.ly) / dt);
        energy.current = Math.min(1, energy.current + Math.max(0, speed - 0.6) * 0.05);
        d.t = e.timeStamp;
        d.lx = e.clientX;
        d.ly = e.clientY;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        x.set(Math.sign(dx) * Math.min(60, Math.abs(dx) * 0.6));
        y.set(Math.sign(dy) * Math.min(40, Math.abs(dy) * 0.5));
        rotate.set(tilt + Math.max(-9, Math.min(9, vx * 4)));
      }}
      onPointerUp={(e: PointerEvent<HTMLElement>) => {
        onPointerUp?.(e);
        if (!drag.current) return;
        drag.current = null;
        animate(x, 0, BACK);
        animate(y, 0, BACK);
        animate(rotate, tilt, BACK);
      }}
      onPointerCancel={(e: PointerEvent<HTMLElement>) => {
        onPointerCancel?.(e);
        drag.current = null;
        animate(x, 0, BACK);
        animate(y, 0, BACK);
        animate(rotate, tilt, BACK);
      }}
    >
      {ejecting ? (
        <motion.span
          aria-hidden="true"
          className="absolute -inset-x-4 -top-2.5 z-10 h-3.5 rounded-full bg-[oklch(0.24_0.025_252)] shadow-[inset_0_1px_0_oklch(1_0_0/0.16),inset_0_-2px_0_oklch(0.12_0.02_252),0_3px_8px_oklch(0.25_0.05_252/0.35)] dark:bg-[oklch(0.3_0.025_252)] ink:bg-[oklch(0.3_0_0)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.12),inset_0_-2px_0_oklch(0.16_0.02_252),0_3px_8px_oklch(0.02_0.02_252/0.6)] ink:shadow-[inset_0_1px_0_oklch(1_0_0/0.12),inset_0_-2px_0_oklch(0.16_0_0),0_3px_8px_oklch(0.02_0_0/0.6)]"
          initial={{ opacity: 0, scaleX: 0.92 }}
          animate={{ opacity: [0, 1, 1, 0], scaleX: [0.92, 1, 1, 1], y: [0, 0, 0, -8] }}
          transition={{ duration: EJECT_MS / 1000 + 0.35, times: [0, 0.08, 0.78, 1] }}
        />
      ) : null}
      {ejecting ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-1 -top-1 z-[5] h-5 bg-linear-to-b from-[oklch(0.25_0.05_252/0.38)] ink:from-[oklch(0.25_0_0/0.38)] to-transparent"
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: EJECT_MS / 1000 + 0.2, times: [0, 0.85, 1] }}
        />
      ) : null}
      <div className={cn(ejecting && "[clip-path:inset(-0.25rem_-3rem_-3rem_-3rem)]")}>
        <motion.div
          initial={ejecting ? { y: "-104%" } : false}
          animate={ejecting ? { y: ejectY } : undefined}
          transition={{ duration: EJECT_MS / 1000, times: [0, 0.3, 0.38, 0.72, 0.8, 1], ease: "linear" }}
          onAnimationComplete={() => {
            if (!ejecting) return;
            setEjecting(false);
            animate(y, [0, 7, 0], { duration: 0.55, ease: "easeOut" });
            animate(rotate, [0, tilt], { type: "spring", stiffness: 170, damping: 13 });
          }}
        >
          <motion.div
            className="light relative bg-(--miyuki-instant-photo-paper) px-[6%] pt-[6%] pb-[5%] shadow-[0_1px_1px_oklch(0.42_0.09_250/0.12),0_6px_16px_-4px_oklch(0.42_0.09_250/0.22),0_22px_40px_-18px_oklch(0.42_0.09_250/0.32)] dark:shadow-[0_1px_1px_oklch(0.05_0.02_250/0.5),0_8px_18px_-4px_oklch(0.05_0.02_250/0.6),0_26px_44px_-16px_oklch(0.05_0.02_250/0.75)] ink:shadow-[0_1px_1px_oklch(0.05_0_0/0.5),0_8px_18px_-4px_oklch(0.05_0_0/0.6),0_26px_44px_-16px_oklch(0.05_0_0/0.75)]"
            style={{ x, y, rotate: ejecting ? 0 : rotate, borderRadius: 4 }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.05] mix-blend-multiply"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
                backgroundSize: "140px 140px",
              }}
            />
            <div className="relative aspect-square overflow-hidden bg-[oklch(0.5_0.03_178)] shadow-[inset_0_0_0_1px_oklch(0.2_0.03_250/0.18)]">
              <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 size-full"
              >
                <defs>
                  {(["lead", "lag"] as const).map((name) => {
                    const s = stage(clamp01(initial + (name === "lead" ? SPREAD : -SPREAD)));
                    return (
                      <filter
                        key={name}
                        id={id(name)}
                        data-filter={name}
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray" />
                        <feComponentTransfer in="gray" result="tone">
                          <feFuncR data-func="" type="table" tableValues={s.rows[0]} />
                          <feFuncG data-func="" type="table" tableValues={s.rows[1]} />
                          <feFuncB data-func="" type="table" tableValues={s.rows[2]} />
                        </feComponentTransfer>
                        <feColorMatrix
                          data-sat=""
                          in="SourceGraphic"
                          type="saturate"
                          values={s.sat.toFixed(3)}
                          result="color"
                        />
                        <feComposite
                          data-mix=""
                          in="tone"
                          in2="color"
                          operator="arithmetic"
                          k1="0"
                          k2={(1 - s.color).toFixed(3)}
                          k3={s.color.toFixed(3)}
                          k4="0"
                        />
                      </filter>
                    );
                  })}
                  <filter id={id("noise")} x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse">
                    <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed={src.length % 97} />
                    <feColorMatrix type="matrix" values="2.6 0 0 0 -0.8  2.6 0 0 0 -0.8  2.6 0 0 0 -0.8  0 0 0 0 1" />
                  </filter>
                  <linearGradient id={id("bias")} x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#000" stopOpacity="0" />
                  </linearGradient>
                  <mask id={id("mask")} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                    <rect width="100" height="100" filter={`url(#${id("noise")})`} />
                    <rect width="100" height="100" fill={`url(#${id("bias")})`} />
                  </mask>
                </defs>
                <image
                  data-layer="lag"
                  href={src}
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                  filter={initial >= 1 ? undefined : `url(#${id("lag")})`}
                />
                <image
                  data-layer="lead"
                  href={src}
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                  mask={`url(#${id("mask")})`}
                  filter={initial >= 1 ? undefined : `url(#${id("lead")})`}
                  visibility={initial >= 1 ? "hidden" : undefined}
                />
              </svg>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(128deg,oklch(1_0_0/0.16)_0%,oklch(1_0_0/0.04)_32%,transparent_46%,transparent_70%,oklch(1_0_0/0.06)_100%)] shadow-[inset_0_1px_3px_oklch(0.2_0.03_250/0.22)]"
              />
            </div>
            <figcaption className="flex min-h-[3.25rem] items-center justify-center px-1 pt-[5%] text-center text-[13px] leading-snug text-foreground/80">
              {caption}
            </figcaption>
          </motion.div>
        </motion.div>
      </div>
    </figure>
  );
}
