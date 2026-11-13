"use client";

import { type GeoPermissibleObjects, type GeoProjection, geoEquirectangular, geoNaturalEarth1, geoPath } from "d3-geo";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface WorldMapPlace {
  lat: number;
  lng: number;
  label?: string;
}

export interface WorldMapRoute {
  from: WorldMapPlace;
  to: WorldMapPlace;
}

export interface WorldMapProps extends ComponentProps<"div"> {
  routes?: WorldMapRoute[];
  dotColor?: string;
  routeColors?: string[];
  dotSpacing?: number;
  projection?: "naturalEarth" | "equirectangular";
  duration?: number;
  centerLng?: number;
}

const DEFAULT_ROUTE_COLORS = ["var(--brand)", "var(--chart-2)"];
const NIGHT = "--miyuki-world-map-night";
const NORTH = 84;
const SOUTH = -57;
const HOLD = 1.1;
const FADE = 0.9;
const REST = 0.5;
const RING = 1.5;

type Topology = Parameters<typeof feature>[0];
let landCache: GeoPermissibleObjects | null = null;

function getLand() {
  if (!landCache) {
    const topo = landTopology as unknown as Topology;
    landCache = feature(topo, topo.objects.land) as GeoPermissibleObjects;
  }
  return landCache;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function makeProjection(kind: WorldMapProps["projection"], centerLng: number, w: number, h: number) {
  const projection = kind === "equirectangular" ? geoEquirectangular() : geoNaturalEarth1();
  projection.rotate([-centerLng, 0]).precision(0.2);
  const edge: [number, number][] = [];
  for (let d = -179.5; d <= 179.5; d += 3.5) edge.push([centerLng + d, NORTH], [centerLng + d, SOUTH]);
  for (let lat = SOUTH; lat <= NORTH; lat += 3) edge.push([centerLng - 179.5, lat], [centerLng + 179.5, lat]);
  const padX = Math.max(12, w * 0.025);
  const padY = Math.max(12, h * 0.05);
  projection.fitExtent(
    [
      [padX, padY],
      [Math.max(padX + 1, w - padX), Math.max(padY + 1, h - padY)],
    ],
    { type: "MultiPoint", coordinates: edge },
  );
  return projection;
}

function sampleLand(projection: GeoProjection, w: number, h: number, spacing: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Float32Array(0);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  geoPath(projection, ctx)(getLand());
  ctx.fill();
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds({ type: "Sphere" });
  const cols = Math.floor((x1 - x0) / spacing);
  const rows = Math.floor((y1 - y0) / spacing);
  const ox = x0 + (x1 - x0 - cols * spacing) / 2;
  const oy = y0 + (y1 - y0 - rows * spacing) / 2;
  const out: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const y = oy + j * spacing;
    const py = Math.round(y);
    if (py < 0 || py >= canvas.height) continue;
    for (let i = 0; i <= cols; i++) {
      const x = ox + i * spacing;
      const px = Math.round(x);
      if (px < 0 || px >= canvas.width) continue;
      if (data[(py * canvas.width + px) * 4 + 3] < 128) continue;
      const geo = projection.invert?.([x, y]);
      if (!geo || geo[1] < SOUTH) continue;
      out.push(x, y);
    }
  }
  return new Float32Array(out);
}

interface Curve {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
}

type Side = "right" | "left" | "top" | "bottom";

interface Endpoint {
  key: string;
  x: number;
  y: number;
  label?: string;
  side: Side;
}

const SIDES: [Side, number, number][] = [
  ["right", 1, 0],
  ["left", -1, 0],
  ["top", 0, -1],
  ["bottom", 0, 1],
];

function layout(routes: WorldMapRoute[], projection: GeoProjection | null, w: number, h: number) {
  if (!projection) return { curves: [] as Curve[], places: [] as Endpoint[] };
  const lift = Math.min(w, h * 2) * 0.16;
  const curves: Curve[] = [];
  const seen = new Map<string, Endpoint & { dirs: [number, number][] }>();
  const visit = (place: WorldMapPlace, x: number, y: number, tx: number, ty: number) => {
    const key = `${place.lat.toFixed(3)},${place.lng.toFixed(3)}`;
    const len = Math.hypot(tx, ty) || 1;
    const prev = seen.get(key);
    if (!prev) seen.set(key, { key, x, y, label: place.label, side: "right", dirs: [[tx / len, ty / len]] });
    else {
      prev.dirs.push([tx / len, ty / len]);
      if (!prev.label && place.label) prev.label = place.label;
    }
  };
  for (const route of routes) {
    const a = projection([route.from.lng, route.from.lat]);
    const b = projection([route.to.lng, route.to.lat]);
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = dy / len;
    let ny = -dx / len;
    if (ny > 0 || (ny === 0 && nx < 0)) {
      nx = -nx;
      ny = -ny;
    }
    const k = Math.min(len * 0.32, lift);
    const c = {
      ax: a[0],
      ay: a[1],
      bx: b[0],
      by: b[1],
      cx: (a[0] + b[0]) / 2 + nx * k,
      cy: (a[1] + b[1]) / 2 + ny * k,
    };
    curves.push(c);
    visit(route.from, c.ax, c.ay, c.cx - c.ax, c.cy - c.ay);
    visit(route.to, c.bx, c.by, c.cx - c.bx, c.cy - c.by);
  }
  const all = [...seen.values()];
  const boxes: [number, number, number, number][] = [];
  const order = all.map((_, i) => i).sort((a, b) => all[b].dirs.length - all[a].dirs.length);
  const places: Endpoint[] = all.map((p) => ({ key: p.key, x: p.x, y: p.y, label: p.label, side: p.side }));
  for (const i of order) {
    const { dirs, x, y, label } = all[i];
    if (!label) continue;
    const bw = label.length * 6.8 + 14;
    const options = SIDES.map(([side, sx, sy]) => {
      const box: [number, number, number, number] =
        side === "right"
          ? [x + 10, y - 10, x + 10 + bw, y + 10]
          : side === "left"
            ? [x - 10 - bw, y - 10, x - 10, y + 10]
            : side === "top"
              ? [x - bw / 2, y - 29, x + bw / 2, y - 9]
              : [x - bw / 2, y + 9, x + bw / 2, y + 29];
      const clearance = Math.min(...dirs.map(([dx, dy]) => 1 - (dx * sx + dy * sy)));
      return { side, box, score: clearance + (sx !== 0 ? 0.35 : 0) + (side === "right" ? 0.05 : 0) };
    }).sort((a, b) => b.score - a.score);
    const fits = options.find(({ box: [x0, y0, x1, y1] }) => {
      if (x0 < 4 || y0 < 4 || x1 > w - 4 || y1 > h - 4) return false;
      if (boxes.some(([a0, b0, a1, b1]) => x0 < a1 + 2 && x1 > a0 - 2 && y0 < b1 + 2 && y1 > b0 - 2)) return false;
      return !all.some((p) => p !== all[i] && p.x > x0 - 5 && p.x < x1 + 5 && p.y > y0 - 5 && p.y < y1 + 5);
    });
    if (fits) {
      boxes.push(fits.box);
      places[i].side = fits.side;
    } else places[i].label = undefined;
  }
  return { curves, places };
}

const LABEL_SIDE: Record<Side, string> = {
  right: "translate-x-[10px] -translate-y-1/2",
  left: "-translate-x-[calc(100%+10px)] -translate-y-1/2",
  top: "-translate-x-1/2 -translate-y-[calc(100%+9px)]",
  bottom: "-translate-x-1/2 translate-y-[9px]",
};

export function WorldMap({
  routes: routesProp = [],
  dotColor = "var(--foreground)",
  routeColors = DEFAULT_ROUTE_COLORS,
  dotSpacing = 6,
  projection = "naturalEarth",
  duration = 2.4,
  centerLng = 0,
  className,
  children,
  ...props
}: WorldMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLCanvasElement>(null);
  const routesRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();

  const spacing = clamp(dotSpacing, 3, 24);
  const tints = routeColors.length > 0 ? routeColors : DEFAULT_ROUTE_COLORS;
  const tintKey = tints.join("|");
  const routeKey = JSON.stringify(routesProp);
  const routes = useMemo(() => JSON.parse(routeKey) as WorldMapRoute[], [routeKey]);

  const proj = useMemo(
    () => (size.w > 0 && size.h > 0 ? makeProjection(projection, centerLng, size.w, size.h) : null),
    [projection, centerLng, size.w, size.h],
  );
  const { curves, places } = useMemo(() => layout(routes, proj, size.w, size.h), [routes, proj, size.w, size.h]);
  const description = useMemo(() => {
    const named = routes.filter((r) => r.from.label && r.to.label);
    if (named.length === 0) return "World map";
    return `World map with routes: ${named.map((r) => `${r.from.label} to ${r.to.label}`).join(", ")}`;
  }, [routes]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = dotsRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !proj) return;
    const { w, h } = size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const dots = sampleLand(proj, w, h, spacing);
    const radius = spacing * 0.2;

    const draw = () => {
      const night = cssVar(NIGHT, canvas) === "1";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = rgba(dotColor, night ? 0.26 : 0.24, canvas);
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 2) {
        ctx.moveTo(dots[i] + radius, dots[i + 1]);
        ctx.arc(dots[i], dots[i + 1], radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      for (const p of places) {
        ctx.moveTo(p.x + spacing * 1.15, p.y);
        ctx.arc(p.x, p.y, spacing * 1.15, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    draw();
    return onThemeChange(draw);
  }, [proj, size, spacing, dotColor, places]);

  useEffect(() => {
    const canvas = routesRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !proj) return;
    const { w, h } = size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));

    const palette = tintKey.split("|");
    const still = !!reduce;
    const draw = Math.max(0.4, duration);
    const period = draw + HOLD + FADE + REST;
    const paths = curves;
    const stagger = paths.length > 0 ? period / paths.length : 0;

    let night = false;
    let strokes: CanvasGradient[] = [];
    let heads: string[] = [];
    let starts: string[] = [];
    let halo = "";

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      const c0 = palette[0];
      const c1 = palette[palette.length - 1];
      const ink = (c: string) => (night ? c : `color-mix(in oklab, ${c} 86%, var(--foreground))`);
      strokes = paths.map((p) => {
        const g = ctx.createLinearGradient(p.ax, p.ay, p.bx, p.by);
        g.addColorStop(0, rgba(ink(c0), 0.32, canvas));
        g.addColorStop(0.4, rgba(ink(c0), 0.85, canvas));
        g.addColorStop(1, rgba(ink(c1), 1, canvas));
        return g;
      });
      heads = [rgba(ink(c1), 1, canvas), rgba(night ? `color-mix(in oklab, ${c1} 40%, white)` : ink(c1), 1, canvas)];
      starts = [rgba(ink(c0), 1, canvas), rgba(ink(c1), 1, canvas)];
      halo = rgba("var(--background)", 0.9, canvas);
    };

    const point = (p: Curve, t: number) => {
      const u = 1 - t;
      return [u * u * p.ax + 2 * u * t * p.cx + t * t * p.bx, u * u * p.ay + 2 * u * t * p.cy + t * t * p.by] as const;
    };

    const ring = (x: number, y: number, age: number, color: string) => {
      if (age < 0 || age > RING) return;
      const t = age / RING;
      ctx.globalAlpha = (1 - t) ** 1.6 * (night ? 0.8 : 0.7);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 3 + easeOut(t) * spacing * 2.6, 0, Math.PI * 2);
      ctx.stroke();
    };

    const dot = (x: number, y: number, color: string, glow: number) => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, 4.25, 0, Math.PI * 2);
      ctx.fill();
      if (night && glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.28 * glow;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2.75, 0, Math.PI * 2);
      ctx.fill();
    };

    const paint = (time: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      const arrived = new Set<number>();

      for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        const local = still ? draw : (((time - i * stagger) % period) + period) % period;
        const progress = local < draw ? easeInOut(local / draw) : 1;
        const alpha = local < draw + HOLD ? 1 : local < draw + HOLD + FADE ? 1 - (local - draw - HOLD) / FADE : 0;
        if (alpha <= 0 || progress <= 0) continue;
        if (local >= draw) arrived.add(i);

        const t = progress;
        const qx = p.ax + (p.cx - p.ax) * t;
        const qy = p.ay + (p.cy - p.ay) * t;
        const [ex, ey] = point(p, t);
        ctx.beginPath();
        ctx.moveTo(p.ax, p.ay);
        ctx.quadraticCurveTo(qx, qy, ex, ey);
        ctx.strokeStyle = strokes[i];
        if (night) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = alpha * 0.22;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        if (!still && local < draw) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = heads[0];
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = heads[1];
          ctx.beginPath();
          ctx.arc(ex, ey, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!still) {
        for (let i = 0; i < paths.length; i++) {
          const p = paths[i];
          const local = (((time - i * stagger) % period) + period) % period;
          ring(p.ax, p.ay, local, starts[0]);
          ring(p.bx, p.by, local - draw, starts[1]);
        }
      }

      ctx.globalAlpha = 1;
      const drawn = new Set<string>();
      for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        const a = `${p.ax.toFixed(1)},${p.ay.toFixed(1)}`;
        const b = `${p.bx.toFixed(1)},${p.by.toFixed(1)}`;
        if (!drawn.has(b)) {
          drawn.add(b);
          dot(p.bx, p.by, starts[1], arrived.has(i) ? 1 : 0.4);
        }
        if (!drawn.has(a)) {
          drawn.add(a);
          dot(p.ax, p.ay, starts[0], 1);
        }
      }
    };

    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      paint(time);
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && paths.length > 0;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    readColors();
    paint(time);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      paint(time);
    });

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
    };
  }, [proj, size, spacing, tintKey, curves, duration, reduce]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-world-map-night:0] dark:[--miyuki-world-map-night:1]",
        className,
      )}
      {...props}
    >
      <div role="img" aria-label={description} className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={dotsRef} aria-hidden="true" className="absolute inset-0 block size-full" />
        <canvas ref={routesRef} aria-hidden="true" className="absolute inset-0 block size-full" />
        {places.map((p) =>
          p.label ? (
            <span
              key={p.key}
              aria-hidden="true"
              className={cn(
                "absolute rounded-md bg-background/80 px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap text-foreground backdrop-blur-[2px]",
                LABEL_SIDE[p.side],
              )}
              style={{ top: p.y, left: p.x }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
      {children}
    </div>
  );
}
