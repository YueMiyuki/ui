"use client";

import { curveCatmullRom, line } from "d3-shape";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TextStreamProps extends Omit<ComponentProps<"div">, "children"> {
  text: string | string[];
  rows?: number;
  speed?: number;
  amplitude?: number;
  wavelength?: number;
}

const ROW_STYLES = [
  { size: 0.78, opacity: 0.62, speed: 1.15 },
  { size: 1, opacity: 1, speed: 0.8 },
  { size: 0.6, opacity: 0.52, speed: 1.4 },
  { size: 0.86, opacity: 0.74, speed: 0.95 },
  { size: 0.68, opacity: 0.54, speed: 1.25 },
];

const SEPARATOR = " · ";
const BASE_SPEED = 46;

interface Layout {
  w: number;
  h: number;
  units: number[];
}

export function TextStream({
  text,
  rows = 3,
  speed = 1,
  amplitude = 24,
  wavelength = 480,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  ...props
}: TextStreamProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^\w-]/g, "");
  const root = useRef<HTMLDivElement>(null);
  const measures = useRef<(SVGTextElement | null)[]>([]);
  const paths = useRef<(SVGTextPathElement | null)[]>([]);
  const hovered = useRef(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const count = Math.max(1, Math.round(rows));
  const lines = Array.from({ length: count }, (_, i) =>
    Array.isArray(text) ? (text.length > 0 ? text[i % text.length] : "") : text,
  );
  const unitText = lines.map((l) => `${l}${SEPARATOR}`);
  const band = size ? size.h / count : 0;
  const widest = size ? size.w / 11 : Infinity;
  const fontSizes = lines.map((_, i) => {
    const scale = ROW_STYLES[i % ROW_STYLES.length].size;
    return Math.max(10, Math.min(band * 0.36 * scale, widest * scale));
  });
  const key = `${unitText.join("|")}:${fontSizes.map((f) => f.toFixed(1)).join(",")}`;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) =>
        s && s.w === Math.round(width) && s.h === Math.round(height)
          ? s
          : { w: Math.round(width), h: Math.round(height) },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const units = measures.current.slice(0, count).map((node) => (node ? node.getComputedTextLength() : 0));
      if (units.every((u) => u > 0)) setLayout({ w: size.w, h: size.h, units });
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [size, key, count]);

  useEffect(() => {
    if (!layout) return;
    const el = root.current;
    if (!el) return;
    const offsets = layout.units.map((u, i) => (u * 0.37 * (i + 1)) % u);
    const apply = () => {
      paths.current.forEach((node, i) => node?.setAttribute("startOffset", offsets[i].toFixed(2)));
    };
    apply();
    if (reduced) return;

    let raf = 0;
    let last = 0;
    let factor = 1;
    let visible = true;
    let running = false;

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const target = hovered.current ? 0.22 : 1;
      factor += (target - factor) * (1 - Math.exp(-dt * 3.2));
      layout.units.forEach((u, i) => {
        const s = ROW_STYLES[i % ROW_STYLES.length];
        const dir = i % 2 === 0 ? -1 : 1;
        let o = offsets[i] + dir * BASE_SPEED * speed * s.speed * factor * dt;
        o = ((o % u) + u) % u;
        offsets[i] = o;
      });
      apply();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [layout, reduced, speed]);

  const ready = layout && size && layout.w === size.w && layout.h === size.h;

  return (
    <div
      ref={root}
      {...props}
      className={cn("relative overflow-clip", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
        ...style,
      }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        hovered.current = true;
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        hovered.current = false;
      }}
    >
      <ul className="sr-only">
        {Array.from(new Set(lines)).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {size ? (
        <svg aria-hidden="true" width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
          {lines.map((_, i) => (
            <text
              key={`m-${i}`}
              ref={(node) => {
                measures.current[i] = node;
              }}
              x={-99999}
              y={-99999}
              fontSize={fontSizes[i]}
              style={{ whiteSpace: "pre" }}
              fill="none"
            >
              {unitText[i]}
            </text>
          ))}
          {ready
            ? lines.map((_, i) => {
                const unit = layout.units[i];
                const s = ROW_STYLES[i % ROW_STYLES.length];
                const amp = amplitude * (0.8 + 0.2 * s.size);
                const lambda = wavelength * (0.9 + 0.2 * ((i * 0.618) % 1));
                const phase = i * 1.9;
                const cy = band * (i + 0.5) + fontSizes[i] * 0.34;
                const x0 = -(unit + lambda);
                const x1 = size.w + lambda;
                const step = lambda / 12;
                const pts: [number, number][] = [];
                for (let x = x0; x <= x1 + step; x += step) {
                  pts.push([x, cy + amp * Math.sin((2 * Math.PI * x) / lambda + phase)]);
                }
                const d = line().curve(curveCatmullRom)(pts) ?? "";
                const arc = (x1 - x0) * (1 + ((Math.PI * amp) / lambda) ** 2);
                const repeats = Math.ceil(arc / unit) + 2;
                return (
                  <g key={i}>
                    <path id={`${uid}-row-${i}`} d={d} fill="none" />
                    <text
                      fontSize={fontSizes[i]}
                      fill="currentColor"
                      fillOpacity={s.opacity}
                      style={{ whiteSpace: "pre" }}
                    >
                      <textPath
                        ref={(node) => {
                          paths.current[i] = node;
                        }}
                        href={`#${uid}-row-${i}`}
                      >
                        {unitText[i].repeat(repeats)}
                      </textPath>
                    </text>
                  </g>
                );
              })
            : null}
        </svg>
      ) : null}
    </div>
  );
}
