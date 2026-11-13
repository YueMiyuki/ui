"use client";

import { scaleLinear } from "d3-scale";
import { area, curveCatmullRom, curveMonotoneX, line } from "d3-shape";
import { Bookmark, Download } from "lucide-react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ToggleButton } from "react-aria-components";
import { Button, buttonStyles } from "@/components/miyuki-ui/button";
import {
  ActiveDot,
  AreaGradient,
  ChartPlot,
  Crosshair,
  closestIndex,
  formatNumber,
  RevealMask,
  textWidth,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";
import { cn } from "@/lib/utils";

export interface RoutePoint {
  x: number;
  y: number;
  km: number;
  m: number;
  lat?: number;
  lon?: number;
}

export interface RouteWaypoint {
  km: number;
  name: string;
  kind?: "peak" | "place";
  label?: boolean;
}

export interface RouteCardRoute {
  name: string;
  region?: string;
  distance: number;
  ascent: number;
  descent?: number;
  time: string;
  grade: { label: string; level: number };
  points: RoutePoint[];
  waypoints?: RouteWaypoint[];
  mapKm?: number;
  north?: number;
}

export interface RouteCardProps extends Omit<ComponentProps<"article">, "children"> {
  route: RouteCardRoute;
  map?: string;
  saved?: boolean;
  defaultSaved?: boolean;
  onSave?: (saved: boolean) => void;
  onDownload?: (gpx: string | null) => void;
}

const MAP_RATIO = 11 / 21;
const PLOT = { height: 104, top: 16, bottom: 22 };
const SAMPLES = 96;
const DRAW = { duration: 1.7, ease: [0.45, 0.05, 0.25, 1] as [number, number, number, number] };
const SETTLE = { stiffness: 420, damping: 34 };

function along(points: RoutePoint[], km: number) {
  if (points.length === 0) return { x: 0, y: 0, m: 0, lat: undefined, lon: undefined };
  if (km <= points[0].km) return points[0];
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    if (km <= b.km) {
      const a = points[i - 1];
      const t = b.km > a.km ? (km - a.km) / (b.km - a.km) : 0;
      const mix = (p?: number, q?: number) => (p == null || q == null ? undefined : p + (q - p) * t);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        m: a.m + (b.m - a.m) * t,
        lat: mix(a.lat, b.lat),
        lon: mix(a.lon, b.lon),
      };
    }
  }
  return points[points.length - 1];
}

function escapeXml(text: string) {
  return text.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c,
  );
}

function toGpx(route: RouteCardRoute): string | null {
  const track = route.points.filter((p) => p.lat != null && p.lon != null);
  if (track.length < 2) return null;
  const name = escapeXml(route.name);
  const coord = (lat: number, lon: number) => `lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"`;
  const marks = (route.waypoints ?? []).flatMap((w) => {
    const p = along(route.points, w.km);
    return p.lat == null || p.lon == null
      ? []
      : [`  <wpt ${coord(p.lat, p.lon)}><ele>${Math.round(p.m)}</ele><name>${escapeXml(w.name)}</name></wpt>`];
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="route-card" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${name}</name></metadata>`,
    ...marks,
    `  <trk><name>${name}</name><trkseg>`,
    ...track.map((p) => `    <trkpt ${coord(p.lat as number, p.lon as number)}><ele>${Math.round(p.m)}</ele></trkpt>`),
    "  </trkseg></trk>",
    "</gpx>",
    "",
  ].join("\n");
}

function fileName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "route"}.gpx`;
}

type Side = "above" | "below" | "left" | "right";

interface MapLabel {
  key: string;
  name: string;
  alt: string;
  peak: boolean;
  px: number;
  py: number;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

const LABEL_ROOM = 6;

function placeLabels(route: RouteCardRoute, width: number, height: number): MapLabel[] {
  const ends = [route.points[0], route.points[route.points.length - 1]].filter(Boolean);
  const peaks = (route.waypoints ?? []).filter((w) => w.kind !== "place").map((w) => along(route.points, w.km));
  const taken: [number, number, number, number][] = [
    ...ends.map((p): [number, number, number, number] => [
      p.x * width - 6,
      p.y * height - 6,
      p.x * width + 6,
      p.y * height + 6,
    ]),
    ...peaks.map((p): [number, number, number, number] => [
      p.x * width - 6,
      p.y * height - 8,
      p.x * width + 6,
      p.y * height + 3,
    ]),
    [0, height - 34, route.mapKm ? 84 : 0, height],
    [width - 42, height - 28, width, height],
  ];
  const fixed = taken.length;
  const track: [number, number][] = [];
  for (let i = 0; i < route.points.length; i++) {
    const a = route.points[i];
    const b = route.points[i + 1] ?? a;
    for (let t = 0; t < 1; t += 0.25) track.push([(a.x + (b.x - a.x) * t) * width, (a.y + (b.y - a.y) * t) * height]);
  }
  const out: MapLabel[] = [];
  for (const w of route.waypoints ?? []) {
    if (w.label === false) continue;
    const p = along(route.points, w.km);
    const px = p.x * width;
    const py = p.y * height;
    const peak = w.kind !== "place";
    const inward: Side = px < width / 2 ? "right" : "left";
    const outward: Side = inward === "right" ? "left" : "right";
    const sides: Side[] = peak ? ["above", "below", inward, outward] : [inward, "above", "below", outward];
    const full = formatNumber(Math.round(p.m));
    let chosen: MapLabel | null = null;
    for (const alt of [full, ""]) {
      const wide = textWidth(w.name) + (alt ? 4 + textWidth(alt) : 0);
      for (const side of sides) {
        let x = px;
        let y = py;
        let left: number;
        let anchor: MapLabel["anchor"] = "middle";
        if (side === "above" || side === "below") {
          left = Math.max(6, Math.min(width - 6 - wide, px - wide / 2));
          x = left + wide / 2;
          y = side === "above" ? py - 11 : py + 19;
        } else if (side === "right") {
          x = px + 9;
          left = x;
          y = py + 4;
          anchor = "start";
        } else {
          x = px - 9;
          left = x - wide;
          y = py + 4;
          anchor = "end";
        }
        const box: [number, number, number, number] = [left - 2, y - 10, left + wide + 2, y + 3];
        const inside = box[0] >= 2 && box[2] <= width - 2 && box[1] >= 2 && box[3] <= height - 2;
        const clear = taken.every(
          (t, i) =>
            box[2] + (i >= fixed ? LABEL_ROOM : 0) <= t[0] ||
            box[0] >= t[2] + (i >= fixed ? LABEL_ROOM : 0) ||
            box[3] <= t[1] ||
            box[1] >= t[3],
        );
        const offLine = track.every(
          ([tx, ty]) => tx < box[0] - 2 || tx > box[2] + 2 || ty < box[1] - 2 || ty > box[3] + 2,
        );
        if (inside && clear && offLine) {
          taken.push(box);
          chosen = { key: `${w.km}-${w.name}`, name: w.name, alt, peak, px, py, x, y, anchor };
          break;
        }
      }
      if (chosen) break;
    }
    if (chosen) out.push(chosen);
  }
  return out;
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-[15px] leading-5 font-semibold whitespace-nowrap text-foreground tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function RouteMap({ route, map, active }: { route: RouteCardRoute; map?: string; active: number | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef);
  const height = width * MAP_RATIO;
  const reduce = useReducedMotion();
  const inView = useInViewOnce(boxRef, { threshold: 0.4 });
  const drawn = reduce || inView;
  const sx = useSpring(0, SETTLE);
  const sy = useSpring(0, SETTLE);
  const shown = useRef(false);
  const target = active == null ? null : along(route.points, active);
  const tx = target ? target.x * width : null;
  const ty = target ? target.y * height : null;

  useEffect(() => {
    if (tx == null || ty == null) {
      shown.current = false;
      return;
    }
    if (reduce || !shown.current) {
      sx.jump(tx);
      sy.jump(ty);
    } else {
      sx.set(tx);
      sy.set(ty);
    }
    shown.current = true;
  }, [tx, ty, reduce, sx, sy]);

  const path =
    line<RoutePoint>()
      .x((p) => p.x * width)
      .y((p) => p.y * height)
      .curve(curveCatmullRom.alpha(0.5))(route.points) ?? "";
  const start = route.points[0];
  const end = route.points[route.points.length - 1];
  const labels = placeLabels(route, width, height);
  const scaleKm = route.mapKm ? ([0.5, 1, 2, 5, 10].find((k) => (k / route.mapKm!) * width >= 40) ?? 10) : null;
  const scalePx = scaleKm && route.mapKm ? (scaleKm / route.mapKm) * width : 0;
  const draw = reduce ? { duration: 0 } : DRAW;
  const after = reduce ? { duration: 0 } : { duration: 0.4, delay: DRAW.duration * 0.85 };

  return (
    <div ref={boxRef} className="relative aspect-[21/11] w-full overflow-hidden border-b border-border bg-muted">
      {map ? (
        <img
          src={map}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-90 select-none dark:opacity-45"
        />
      ) : null}
      {width > 0 && start && end ? (
        <svg width={width} height={height} aria-hidden="true" className="absolute inset-0 block overflow-visible">
          <motion.path
            d={path}
            fill="none"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-card"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: drawn ? 1 : 0 }}
            transition={draw}
          />
          <motion.path
            d={path}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-brand"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: drawn ? 1 : 0 }}
            transition={draw}
          />
          <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: drawn ? 1 : 0 }} transition={after}>
            {labels.map((l) => (
              <g key={l.key}>
                {l.peak ? (
                  <path
                    d={`M${l.px} ${l.py - 6.5}L${l.px + 5} ${l.py + 2}L${l.px - 5} ${l.py + 2}Z`}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    className="fill-foreground stroke-card"
                  />
                ) : null}
                <text
                  x={l.x}
                  y={l.y}
                  textAnchor={l.anchor}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="fill-foreground stroke-muted text-[11px] font-medium [paint-order:stroke]"
                >
                  {l.name}
                  {l.alt ? (
                    <tspan dx={4} className="fill-muted-foreground font-normal tabular-nums">
                      {l.alt}
                    </tspan>
                  ) : null}
                </text>
              </g>
            ))}
            <circle
              cx={end.x * width}
              cy={end.y * height}
              r={4.5}
              strokeWidth={2}
              className="fill-foreground stroke-card"
            />
          </motion.g>
          <motion.circle
            cx={start.x * width}
            cy={start.y * height}
            r={4.5}
            strokeWidth={2}
            className="fill-card stroke-brand"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: drawn ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
          />
          <motion.g
            style={{ x: sx, y: sy }}
            initial={false}
            animate={{ opacity: target ? 1 : 0, scale: target ? 1 : 0.6 }}
            transition={reduce ? { duration: 0 } : { duration: 0.16 }}
          >
            <circle r={11} className="fill-brand" opacity={0.18} />
            <circle r={5.5} strokeWidth={2.5} className="fill-brand stroke-card" />
          </motion.g>
        </svg>
      ) : null}
      <div className="pointer-events-none absolute right-3 bottom-2.5 flex items-center gap-1 text-[11px] leading-none font-medium text-foreground/70">
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3"
          style={{ transform: `rotate(${route.north ?? 0}deg)` }}
        >
          <path d="M6 1.25 9 10 6 8.4 3 10Z" className="fill-current" />
        </svg>
        <span>N</span>
      </div>
      {scaleKm ? (
        <div className="pointer-events-none absolute bottom-2.5 left-3 flex flex-col gap-0.5 text-[11px] leading-none text-foreground/70 tabular-nums">
          <span>{scaleKm} km</span>
          <span className="h-1 border-x border-b border-current" style={{ width: scalePx }} />
        </div>
      ) : null}
    </div>
  );
}

function Profile({
  route,
  samples,
  onActive,
}: {
  route: RouteCardRoute;
  samples: { km: number; m: number }[];
  onActive: (km: number | null) => void;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const innerH = PLOT.height - PLOT.top - PLOT.bottom;
  const lo = Math.min(...route.points.map((p) => p.m));
  const hi = Math.max(...route.points.map((p) => p.m));
  const peak = route.points.reduce((best, p) => (p.m > best.m ? p : best), route.points[0]);
  const x = scaleLinear()
    .domain([0, route.distance])
    .range([0, Math.max(0, width)]);
  const y = scaleLinear().domain([lo, hi]).range([innerH, 0]);
  const xs = samples.map((s) => x(s.km));

  const { active, bind } = useNearestIndex({
    count: samples.length,
    focusIndex: 0,
    locate: (px) => (width > 0 ? closestIndex(xs, px) : null),
  });

  const activeKm = active == null ? null : samples[active].km;
  useEffect(() => {
    onActive(activeKm);
  }, [activeKm, onActive]);

  const shape = area<{ km: number; m: number }>()
    .x((s) => x(s.km))
    .y0(innerH)
    .y1((s) => y(s.m))
    .curve(curveMonotoneX);
  const ridge = line<{ km: number; m: number }>()
    .x((s) => x(s.km))
    .y((s) => y(s.m))
    .curve(curveMonotoneX);

  const named = (km: number) =>
    (route.waypoints ?? []).find((w) => Math.abs(w.km - km) <= route.distance / SAMPLES)?.name ?? null;
  const current = active == null ? null : samples[active];
  const near = current ? named(current.km) : null;
  const summary =
    `Elevation profile over ${formatNumber(route.distance, 1)} km. Starts at ${formatNumber(route.points[0].m)} m, ` +
    `highest ${formatNumber(peak.m)} m at ${formatNumber(peak.km, 1)} km, ` +
    `ends at ${formatNumber(route.points[route.points.length - 1].m)} m.`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
        <span className="text-muted-foreground">Elevation</span>
        <span aria-live="polite" className="min-w-0 truncate text-right tabular-nums">
          {current ? (
            <>
              <span className="font-medium text-foreground">{formatNumber(Math.round(current.m))} m</span>
              <span className="text-muted-foreground">
                {" "}
                at {formatNumber(current.km, 1)} km{near ? `, ${near}` : ""}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              High point {formatNumber(Math.round(peak.m))} m{named(peak.km) ? `, ${named(peak.km)}` : ""}
            </span>
          )}
        </span>
      </div>
      <ChartPlot ref={plotRef} summary={summary} height={PLOT.height} className="mt-2" {...bind}>
        {width > 0 && (
          <svg width={width} height={PLOT.height} className="block overflow-visible">
            <defs>
              <RevealMask id={`${uid}-reveal`} width={width} height={innerH} play={inView} />
              <AreaGradient id={`${uid}-fill`} color="var(--chart-1)" />
            </defs>
            <g transform={`translate(0 ${PLOT.top})`}>
              <g aria-hidden="true" className="stroke-border" strokeDasharray="2 4" shapeRendering="crispEdges">
                <line x1={0} x2={width} y1={0.5} y2={0.5} />
                <line x1={0} x2={width} y1={innerH - 0.5} y2={innerH - 0.5} />
              </g>
              <g mask={`url(#${uid}-reveal)`}>
                <path d={shape(route.points) ?? ""} fill={`url(#${uid}-fill)`} />
                <path
                  d={ridge(route.points) ?? ""}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ stroke: "var(--chart-1)" }}
                />
                {(route.waypoints ?? []).map((w) => {
                  const p = along(route.points, w.km);
                  return (
                    <circle
                      key={`${w.km}-${w.name}`}
                      cx={x(w.km)}
                      cy={y(p.m)}
                      r={2.5}
                      strokeWidth={1.5}
                      className="fill-card"
                      style={{ stroke: "var(--chart-1)" }}
                    />
                  );
                })}
              </g>
              <g aria-hidden="true" className="fill-muted-foreground text-[11px] tabular-nums">
                <text x={width} y={-5} textAnchor="end">
                  {formatNumber(Math.round(hi))} m
                </text>
                <text x={0} y={innerH - 5}>
                  {formatNumber(Math.round(lo))} m
                </text>
                <text x={0} y={innerH + 16}>
                  0 km
                </text>
                <text x={width} y={innerH + 16} textAnchor="end">
                  {formatNumber(route.distance, 1)} km
                </text>
              </g>
              {current && (
                <>
                  <Crosshair x={x(current.km)} bottom={innerH} />
                  <ActiveDot cx={x(current.km)} cy={y(current.m)} color="var(--chart-1)" />
                </>
              )}
            </g>
          </svg>
        )}
      </ChartPlot>
    </div>
  );
}

export function RouteCard({
  route,
  map,
  saved,
  defaultSaved = false,
  onSave,
  onDownload,
  className,
  ...props
}: RouteCardProps) {
  const [activeKm, setActiveKm] = useState<number | null>(null);
  const [ownSaved, setOwnSaved] = useState(defaultSaved);
  const isSaved = saved ?? ownSaved;
  const headingId = useId();

  const samples = Array.from({ length: SAMPLES }, (_, i) => {
    const km = (route.distance * i) / (SAMPLES - 1);
    return { km, m: along(route.points, km).m };
  });

  const download = () => {
    const gpx = toGpx(route);
    if (onDownload) {
      onDownload(gpx);
      return;
    }
    if (!gpx) return;
    const url = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(route.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const level = Math.max(0, Math.min(5, Math.round(route.grade.level)));

  return (
    <article
      aria-labelledby={headingId}
      {...props}
      className={cn(
        "@container w-full overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <RouteMap route={route} map={map} active={activeKm} />
      <div className="p-5">
        <h3 id={headingId} className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground">
          {route.name}
        </h3>
        {route.region ? <p className="text-[13px] leading-5 text-muted-foreground">{route.region}</p> : null}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 @[22rem]:grid-cols-4">
          <Figure label="Distance">{formatNumber(route.distance, 1)} km</Figure>
          <Figure label="Ascent">+{formatNumber(route.ascent)} m</Figure>
          <Figure label="Time">{route.time}</Figure>
          <Figure label="Grade">
            {route.grade.label}
            <span aria-hidden="true" className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={cn("h-2.5 w-1 rounded-full", i < level ? "bg-brand" : "bg-border-strong")} />
              ))}
            </span>
            <span className="sr-only">, {level} of 5</span>
          </Figure>
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <Profile route={route} samples={samples} onActive={setActiveKm} />
        </div>

        <div className="mt-5 flex gap-2">
          <ToggleButton
            isSelected={isSaved}
            onChange={(next) => {
              if (saved == null) setOwnSaved(next);
              onSave?.(next);
            }}
            className={cn(
              buttonStyles({ variant: "secondary" }),
              "flex-1 data-[selected]:border-brand/40 data-[selected]:bg-brand-soft data-[selected]:text-brand-strong",
            )}
          >
            <Bookmark aria-hidden="true" className={cn("transition-[fill] duration-150", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save"}
          </ToggleButton>
          <Button variant="primary" className="flex-1" iconStart={<Download aria-hidden="true" />} onPress={download}>
            Download GPX
          </Button>
        </div>
      </div>
    </article>
  );
}
