"use client";

import { curveCatmullRom, line } from "d3-shape";
import { Download, GripVertical, House, MountainSnow, Share2 } from "lucide-react";
import { Reorder } from "motion/react";
import {
  type ComponentProps,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type ActionItem, ActionLog } from "@/components/miyuki-ui/action-log";
import { Button } from "@/components/miyuki-ui/button";
import { Checkbox } from "@/components/miyuki-ui/checkbox";
import { ElevationProfile, type ElevationScrub } from "@/components/miyuki-ui/elevation-profile";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { ProgressBar } from "@/components/miyuki-ui/progress";
import { PromptBox } from "@/components/miyuki-ui/prompt-box";
import { StreamingInk } from "@/components/miyuki-ui/streaming-ink";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { cn } from "@/lib/utils";

export interface TripPlannerMember {
  name: string;
  role?: string;
  avatar?: string;
}

export interface TripPlannerProps extends Omit<ComponentProps<"div">, "children"> {
  map?: string;
  party?: TripPlannerMember[];
}

type Kind = "trailhead" | "stop" | "summit" | "hut" | "village";

interface Place {
  id: string;
  name: string;
  m: number;
  x: number;
  y: number;
  kind: Kind;
  side?: "left" | "right" | "above" | "below";
}

const PLACES: Record<string, Place> = {
  trailhead: {
    id: "trailhead",
    name: "Nakayama trailhead",
    m: 1020,
    x: 0.08,
    y: 0.8,
    kind: "trailhead",
    side: "right",
  },
  col: { id: "col", name: "Kamoshika col", m: 1690, x: 0.17, y: 0.52, kind: "stop", side: "left" },
  bench: { id: "bench", name: "Kasumi bench", m: 1880, x: 0.27, y: 0.42, kind: "stop", side: "below" },
  usagi: { id: "usagi", name: "Usagi hut", m: 2050, x: 0.37, y: 0.27, kind: "hut", side: "left" },
  summit: { id: "summit", name: "North ridge summit", m: 2380, x: 0.5, y: 0.12, kind: "summit", side: "right" },
  bowl: { id: "bowl", name: "Tsurugi bowl", m: 1960, x: 0.55, y: 0.45, kind: "stop", side: "left" },
  kasa: { id: "kasa", name: "Kasa col", m: 2140, x: 0.65, y: 0.25, kind: "stop", side: "right" },
  hoshi: { id: "hoshi", name: "Hoshi hut", m: 1840, x: 0.7, y: 0.47, kind: "hut", side: "right" },
  toge: { id: "toge", name: "Tōge pass", m: 2010, x: 0.8, y: 0.3, kind: "stop", side: "right" },
  forest: { id: "forest", name: "Shirakaba forest", m: 1180, x: 0.84, y: 0.63, kind: "stop", side: "left" },
  village: { id: "village", name: "Hakuba village", m: 760, x: 0.92, y: 0.85, kind: "village", side: "left" },
};

interface Day {
  id: string;
  label: string;
  date: string;
  start: string;
  end: string;
  startAt: number;
  color: string;
  note: string;
}

const DAYS: Day[] = [
  {
    id: "d1",
    label: "Day 1",
    date: "Friday 26 February",
    start: "trailhead",
    end: "usagi",
    startAt: 7 * 60 + 30,
    color: "var(--chart-1)",
    note: "Booked, 3 beds",
  },
  {
    id: "d2",
    label: "Day 2",
    date: "Saturday 27 February",
    start: "usagi",
    end: "hoshi",
    startAt: 7 * 60,
    color: "var(--chart-3)",
    note: "Booked, 3 beds",
  },
  {
    id: "d3",
    label: "Day 3",
    date: "Sunday 28 February",
    start: "hoshi",
    end: "village",
    startAt: 7 * 60 + 30,
    color: "var(--chart-2)",
    note: "Bus 15:40 to Hakuba station",
  },
];

const START_ORDER: Record<string, string[]> = {
  d1: ["col", "bench"],
  d2: ["summit", "bowl", "kasa"],
  d3: ["toge", "forest"],
};

const MAP_KM = { x: 14, y: 8.75 };
const SAMPLES = 24;
const REST = 15;

interface Sample {
  x: number;
  y: number;
  km: number;
  m: number;
}

interface Leg {
  id: string;
  day: number;
  from: Place;
  to: Place;
  samples: Sample[];
  km: number;
  up: number;
  down: number;
  minutes: number;
  start: number;
  arrive: number;
}

function makeLeg(a: Place, b: Place, startKm: number): Omit<Leg, "id" | "day" | "start" | "arrive"> {
  const rng = createRng(`${a.id}>${b.id}`);
  const bow = rng.range(-0.05, 0.05);
  const amp = rng.range(0.006, 0.016);
  const waves = rng.int(2, 4);
  const phase = rng.range(0, Math.PI * 2);
  const hill = rng.range(20, 70);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx * MAP_KM.x, dy * MAP_KM.y) || 1;
  const nx = (-dy * MAP_KM.y) / len / MAP_KM.x;
  const ny = (dx * MAP_KM.x) / len / MAP_KM.y;
  const samples: Sample[] = [];
  let km = startKm;
  let up = 0;
  let down = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const off = Math.sin(Math.PI * t) * (bow + amp * Math.sin(waves * Math.PI * t + phase));
    const x = a.x + dx * t + nx * off * MAP_KM.x * 0.1;
    const y = a.y + dy * t + ny * off * MAP_KM.y * 0.1;
    const ease = t * t * (3 - 2 * t);
    const m = a.m + (b.m - a.m) * ease + Math.sin(Math.PI * t) * hill * Math.sin(3 * Math.PI * t + phase);
    if (i > 0) {
      const p = samples[i - 1];
      km += Math.hypot((x - p.x) * MAP_KM.x, (y - p.y) * MAP_KM.y) * 1.18;
      if (m > p.m) up += m - p.m;
      else down += p.m - m;
    }
    samples.push({ x, y, km, m });
  }
  const dist = km - startKm;
  const hours = dist / 4 + up / 400 + down / 1200;
  return { from: a, to: b, samples, km: dist, up, down, minutes: Math.max(15, Math.round((hours * 60) / 5) * 5) };
}

function buildRoute(order: Record<string, string[]>) {
  const legs: Leg[] = [];
  let km = 0;
  DAYS.forEach((day, d) => {
    const stops = [day.start, ...order[day.id], day.end].map((id) => PLACES[id]);
    let clock = day.startAt;
    for (let i = 1; i < stops.length; i++) {
      const leg = makeLeg(stops[i - 1], stops[i], km);
      const start = clock;
      clock += leg.minutes;
      legs.push({ ...leg, id: `${day.id}:${stops[i].id}`, day: d, start, arrive: clock });
      if (i < stops.length - 1) clock += REST;
      km += leg.km;
    }
  });
  const samples = legs.flatMap((leg, i) => (i === 0 ? leg.samples : leg.samples.slice(1)));
  const total = legs.reduce((s, l) => ({ km: s.km + l.km, up: s.up + l.up, down: s.down + l.down }), {
    km: 0,
    up: 0,
    down: 0,
  });
  return { legs, samples, total };
}

type Route = ReturnType<typeof buildRoute>;

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const duration = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`;
const grouped = (n: number) => Math.round(n).toLocaleString("en-US");
const climb = (l: { up: number; down: number }) => (l.up >= l.down ? `+${grouped(l.up)} m` : `−${grouped(l.down)} m`);
const oneDp = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

function useMedia(query: string, fallback: boolean) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

function useBox(ref: RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

function atKm(samples: Sample[], km: number) {
  if (samples.length === 0) return null;
  if (km <= samples[0].km) return samples[0];
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i];
    if (km <= b.km) {
      const a = samples[i - 1];
      const t = b.km > a.km ? (km - a.km) / (b.km - a.km) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, km, m: a.m + (b.m - a.m) * t };
    }
  }
  return samples[samples.length - 1];
}

function Itinerary({
  order,
  onOrder,
  route,
  onHover,
  className,
}: {
  order: Record<string, string[]>;
  onOrder: (day: string, ids: string[]) => void;
  route: Route;
  onHover: (leg: string | null) => void;
  className?: string;
}) {
  const help = useId();
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const where = (day: Day, id: string, list = order[day.id]) =>
    `position ${list.indexOf(id) + 1} of ${list.length} in ${day.label.toLowerCase()}`;

  return (
    <section aria-labelledby={`${help}-title`} className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={`${help}-title`} className="text-base font-semibold tracking-[-0.01em] text-foreground">
          Itinerary
        </h2>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {oneDp(route.total.km)} km · +{grouped(route.total.up)} m
        </p>
      </div>
      <p id={help} className="mt-1 px-1 text-[13px] leading-5 text-muted-foreground">
        Drag a stage to change the order, or focus it and press Space, then the arrow keys.
      </p>
      <p aria-live="assertive" className="sr-only">
        {message}
      </p>
      <div className="mt-4 flex flex-col gap-6">
        {DAYS.map((day, d) => {
          const legs = route.legs.filter((l) => l.day === d);
          const km = legs.reduce((s, l) => s + l.km, 0);
          const up = legs.reduce((s, l) => s + l.up, 0);
          const end = legs[legs.length - 1];
          const start = PLACES[day.start];
          const hut = PLACES[day.end];
          return (
            <section key={day.id} aria-label={`${day.label}, ${day.date}`}>
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: day.color }} />
                  {day.label}
                  <span className="font-normal text-muted-foreground">{day.date}</span>
                </h3>
              </div>
              <p className="mt-0.5 ps-5 text-xs text-muted-foreground tabular-nums">
                {oneDp(km)} km · +{grouped(up)} m · {duration((end?.arrive ?? day.startAt) - day.startAt)}
              </p>
              <div className="relative mt-2">
                <span aria-hidden="true" className="absolute top-4 bottom-4 left-[19px] w-px bg-border-strong" />
                <div className="relative flex items-center gap-3 px-2 py-1.5">
                  <span aria-hidden="true" className="grid w-4 place-items-center">
                    <span className="size-2.5 rounded-full border-2 bg-card" style={{ borderColor: day.color }} />
                  </span>
                  <span className="w-11 shrink-0 text-[13px] font-medium text-muted-foreground tabular-nums">
                    {clock(day.startAt)}
                  </span>
                  <p className="min-w-0 truncate text-[13px] text-muted-foreground">
                    Leave {start.name}, {grouped(start.m)} m
                  </p>
                </div>
                <Reorder.Group
                  axis="y"
                  values={order[day.id]}
                  onReorder={(next: string[], moved: string) => {
                    onOrder(day.id, next);
                    if (grabbed) setMessage(`${PLACES[moved].name}, ${where(day, moved, next)}.`);
                  }}
                  className="relative flex flex-col gap-0.5"
                >
                  {order[day.id].map((id) => {
                    const leg = legs.find((l) => l.to.id === id);
                    const place = PLACES[id];
                    const lifted = grabbed === id;
                    return (
                      <Reorder.Item
                        key={id}
                        value={id}
                        aria-roledescription="movable stage"
                        aria-describedby={help}
                        aria-label={`${place.name}, ${grouped(place.m)} m, arrive ${leg ? clock(leg.arrive) : ""}`}
                        whileDrag={{ scale: 1.02 }}
                        onDragStart={() => setGrabbed(id)}
                        onDragEnd={() => setGrabbed(null)}
                        onPointerEnter={() => leg && onHover(leg.id)}
                        onPointerLeave={() => onHover(null)}
                        onFocus={() => leg && onHover(leg.id)}
                        onBlur={() => {
                          onHover(null);
                          if (grabbed === id) setGrabbed(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === " " && !event.repeat) {
                            if (grabbed === id) {
                              setGrabbed(null);
                              setMessage(`Dropped ${place.name} at ${where(day, id)}.`);
                            } else {
                              setGrabbed(id);
                              setMessage(
                                `Picked up ${place.name}, ${where(day, id)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
                              );
                            }
                          } else if (event.key === "Escape" && grabbed === id) {
                            setGrabbed(null);
                            setMessage(`Cancelled. ${place.name} is back where it was.`);
                          }
                        }}
                        className={cn(
                          "relative flex cursor-grab touch-none items-start gap-3 rounded-lg px-2 py-2 outline-none select-none active:cursor-grabbing",
                          "transition-[background-color,box-shadow] duration-150 ease-settle hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring",
                          lifted && "bg-card shadow-lg ring-1 ring-border hover:bg-card",
                        )}
                      >
                        <span aria-hidden="true" className="grid h-5 w-4 shrink-0 place-items-center">
                          <span className="size-2 rounded-full" style={{ background: day.color }} />
                        </span>
                        <span className="w-11 shrink-0 text-[13px] leading-5 font-medium text-foreground tabular-nums">
                          {leg ? clock(leg.arrive) : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm leading-5 font-medium text-foreground">
                            {place.name}{" "}
                            <span className="font-normal text-muted-foreground tabular-nums">{grouped(place.m)} m</span>
                          </span>
                          <span className="block text-xs leading-5 text-muted-foreground tabular-nums">
                            {leg ? `${oneDp(leg.km)} km · ${climb(leg)} · ${duration(leg.minutes)}` : ""}
                          </span>
                        </span>
                        <GripVertical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
                <div
                  className="relative mt-0.5 flex items-start gap-3 rounded-lg px-2 py-2"
                  onPointerEnter={() => end && onHover(end.id)}
                  onPointerLeave={() => onHover(null)}
                >
                  <span aria-hidden="true" className="grid h-5 w-4 shrink-0 place-items-center">
                    <span className="grid size-4 place-items-center rounded-[5px] bg-primary text-primary-foreground">
                      <House className="size-2.5" strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="w-11 shrink-0 text-[13px] leading-5 font-medium text-foreground tabular-nums">
                    {end ? clock(end.arrive) : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-5 font-semibold text-foreground">
                      {hut.name}{" "}
                      <span className="font-normal text-muted-foreground tabular-nums">{grouped(hut.m)} m</span>
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground tabular-nums">
                      {end ? `${oneDp(end.km)} km · ${climb(end)} · ${duration(end.minutes)}` : ""}
                    </span>
                    <span className="mt-1 inline-flex h-5 items-center rounded-full bg-success-soft px-2 text-xs font-medium text-success-strong">
                      {day.note}
                    </span>
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function Mark({ place, color }: { place: Place; color: string }) {
  if (place.kind === "hut")
    return (
      <g>
        <rect x={-9} y={-9} width={18} height={18} rx={5} className="fill-primary" />
        <path
          d="M-4.5 4V-0.5L0 -4.5L4.5 -0.5V4Z"
          fill="none"
          strokeWidth={1.6}
          strokeLinejoin="round"
          className="stroke-primary-foreground"
        />
      </g>
    );
  if (place.kind === "summit")
    return (
      <g>
        <path d="M0 -9L8.5 6H-8.5Z" strokeWidth={2} strokeLinejoin="round" className="fill-foreground stroke-card" />
      </g>
    );
  if (place.kind === "trailhead" || place.kind === "village")
    return (
      <rect x={-6} y={-6} width={12} height={12} rx={2.5} strokeWidth={2.5} className="fill-foreground stroke-card" />
    );
  return <circle r={6} strokeWidth={3} className="fill-card" style={{ stroke: color }} />;
}

function RouteMap({
  route,
  scrub,
  hover,
  texture,
  className,
}: {
  route: Route;
  scrub: ElevationScrub | null;
  hover: string | null;
  texture?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useBox(ref);
  const ratio = MAP_KM.x / MAP_KM.y;
  const room = { w: Math.max(0, width - 24), h: Math.max(0, height - 72) };
  const fitW = Math.min(room.w, room.h * ratio);
  const fitH = fitW / ratio;
  const ox = (width - fitW) / 2;
  const oy = 12 + (room.h - fitH) / 2;
  const px = (s: { x: number; y: number }) => [ox + s.x * fitW, oy + s.y * fitH] as [number, number];
  const path = line<[number, number]>().curve(curveCatmullRom.alpha(0.5));
  const at = scrub ? atKm(route.samples, scrub.km) : null;
  const legAt = scrub ? route.legs.find((l) => scrub.km <= l.samples[l.samples.length - 1].km + 1e-6) : null;
  const hoverLeg = route.legs.find((l) => l.id === hover);
  const stops = [route.legs[0]?.from, ...route.legs.map((l) => l.to)].filter(Boolean) as Place[];
  const dayOf = (p: Place) => {
    const leg = route.legs.find((l) => l.to.id === p.id) ?? route.legs[0];
    return DAYS[leg?.day ?? 0];
  };

  return (
    <div ref={ref} className={cn("relative overflow-clip rounded-xl border border-border bg-muted", className)}>
      {texture && (
        <img
          src={texture}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-60 dark:opacity-30"
        />
      )}
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="absolute inset-0"
          role="img"
          aria-label={`Route map: ${stops.map((s) => s.name).join(", then ")}. ${oneDp(route.total.km)} km over three days.`}
        >
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {route.legs.map((l) => (
              <path key={`${l.id}-halo`} d={path(l.samples.map(px)) ?? ""} strokeWidth={8} className="stroke-card/80" />
            ))}
            {route.legs.map((l) => {
              const dim = (hoverLeg && hoverLeg.id !== l.id) || (legAt && legAt.day !== l.day);
              return (
                <path
                  key={l.id}
                  d={path(l.samples.map(px)) ?? ""}
                  strokeWidth={hoverLeg?.id === l.id ? 5 : 3.5}
                  className="transition-[opacity,stroke-width] duration-200 ease-settle"
                  style={{ stroke: DAYS[l.day].color, opacity: dim ? 0.4 : 1 }}
                />
              );
            })}
          </g>
          {stops.map((p) => {
            const [x, y] = px(p);
            const tw = p.name.length * 6.7 + 14;
            const wanted = p.side ?? "right";
            const side =
              wanted === "left" && x - tw < 4 ? "right" : wanted === "right" && x + tw > width - 4 ? "left" : wanted;
            const tx = side === "left" ? -13 : side === "right" ? 13 : 0;
            const ty = side === "above" ? -16 : side === "below" ? 22 : 4;
            return (
              <g key={p.id} transform={`translate(${x} ${y})`}>
                <Mark place={p} color={dayOf(p).color} />
                <text
                  x={tx}
                  y={ty}
                  opacity={fitW < 560 && p.kind === "stop" && hoverLeg?.to.id !== p.id && legAt?.to.id !== p.id ? 0 : 1}
                  textAnchor={side === "left" ? "end" : side === "right" ? "start" : "middle"}
                  className={cn(
                    "fill-foreground transition-opacity duration-150",
                    p.kind === "hut" || p.kind === "summit" ? "font-semibold" : "font-medium",
                  )}
                  style={{
                    fontSize: 12,
                    paintOrder: "stroke",
                    stroke: "var(--card)",
                    strokeWidth: 4,
                    strokeLinejoin: "round",
                  }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}
          {at && (
            <g transform={`translate(${px(at).join(" ")})`} className="pointer-events-none">
              <circle r={14} className="fill-brand/20" />
              <circle r={6.5} strokeWidth={2.5} className="fill-brand stroke-card" />
            </g>
          )}
        </svg>
      )}
      {at && legAt && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(8, px(at)[0] + 14), width - 176),
            top: px(at)[1] < 72 ? px(at)[1] + 18 : Math.min(px(at)[1] - 60, height - 60),
          }}
        >
          <p className="font-medium text-foreground">
            {DAYS[legAt.day].label}, towards {legAt.to.name}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {oneDp(scrub?.km ?? 0)} km · {grouped(at.m)} m
          </p>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        {DAYS.map((d) => (
          <span
            key={d.id}
            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-foreground/10 bg-card/75 px-2 text-xs font-medium text-foreground backdrop-blur-xl"
          >
            <span aria-hidden="true" className="h-[3px] w-3.5 rounded-full" style={{ background: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  tasks?: ActionItem[];
  stream?: boolean;
}

const ANSWER = `Friday and Sunday look straightforward. Saturday is the hard day: the ridge to the north summit is exposed, and the forecast has north-west wind at 40 km/h by midday.

I would go to Kasa col first and take the summit only if the wind is still light at 09:00. Drag Kasa col above the summit in day 2 to see how that changes the day; it adds about fifteen minutes to the day.

Both huts have space. Usagi has 6 beds left on Friday and Hoshi has 4 on Saturday. Read the bulletin on Thursday evening before you commit to the ridge.`;

const REPLY = `Noted. I have added that to the plan, and I will read the 06:00 forecast each morning of the trip. If the wind on the ridge goes above 40 km/h, I will message the group.`;

const TASKS: ActionItem[] = [
  { id: "t1", kind: "search", label: "Searched", detail: "wind, Hakuba ridges, 26–28 Feb", status: "done" },
  { id: "t2", kind: "read", label: "Read", detail: "bulletin-hakuba-0213.pdf", status: "done" },
  { id: "t3", kind: "run", label: "Checked", detail: "huts --usagi --hoshi", status: "done" },
];

const PACKING = [
  { id: "beacon", label: "Avalanche transceiver", note: "Fresh batteries" },
  { id: "probe", label: "Probe and shovel" },
  { id: "skins", label: "Skins, glue checked" },
  { id: "crampons", label: "Ski crampons" },
  { id: "axe", label: "Ice axe" },
  { id: "helmet", label: "Helmet" },
  { id: "down", label: "Down jacket" },
  { id: "torch", label: "Headtorch and spare batteries" },
  { id: "liner", label: "Hut sleeping liner" },
  { id: "water", label: "Two litres of water a day" },
  { id: "aid", label: "First-aid kit" },
  { id: "cash", label: "Cash for the huts", note: "¥24,000 each for two nights" },
];

function useStream(text: string, run: boolean, seed: string, onDone: () => void) {
  const [shown, setShown] = useState("");
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!run) return;
    const rng = createRng(seed);
    const parts: string[] = [];
    for (let i = 0; i < text.length; ) {
      const n = rng.int(2, 7);
      parts.push(text.slice(i, i + n));
      i += n;
    }
    let i = 0;
    let timer = window.setTimeout(function next() {
      i++;
      setShown(parts.slice(0, i).join(""));
      if (i >= parts.length) done.current();
      else timer = window.setTimeout(next, 45 + rng() * 70);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [text, run, seed]);
  return shown;
}

function Reply({
  message,
  run,
  reserve,
  onDone,
}: {
  message: Message;
  run: boolean;
  reserve: boolean;
  onDone: (id: string) => void;
}) {
  const text = useStream(message.text, run && !!message.stream, message.id, () => onDone(message.id));
  const live = !!message.stream;
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong"
      >
        <MountainSnow className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[13px] leading-5 text-muted-foreground">Route planner</p>
        {message.tasks && (
          <ActionLog items={message.tasks} aria-label="What the route planner checked" className="mb-3" />
        )}
        <div className="grid">
          <StreamingInk
            text={live ? text : message.text}
            done={!live}
            className="col-start-1 row-start-1 text-sm leading-6"
          />
          {live && reserve && (
            <div aria-hidden="true" className="invisible col-start-1 row-start-1">
              <StreamingInk text={message.text} done className="text-sm leading-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Assistant({
  messages,
  onSend,
  streaming,
  onDone,
  onStop,
  packed,
  onPack,
  run,
  onShown,
  fill,
  className,
}: {
  messages: Message[];
  onSend: (text: string) => void;
  streaming: boolean;
  onDone: (id: string) => void;
  onStop: () => void;
  packed: Set<string>;
  onPack: (id: string, on: boolean) => void;
  run: boolean;
  onShown: () => void;
  fill: boolean;
  className?: string;
}) {
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => onShown(), [onShown]);
  useEffect(() => {
    const el = thread.current;
    if (!el || !fill) return;
    const follow = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
    };
    el.scrollTop = el.scrollHeight;
    const mo = new MutationObserver(follow);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [fill]);

  return (
    <div className={cn("flex min-h-0 flex-col gap-5", className)}>
      <section aria-label="Planning assistant" className={cn("flex flex-col", fill && "min-h-0 flex-1")}>
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">Assistant</h2>
          <p className="text-[13px] text-muted-foreground">Reads forecasts and hut bookings</p>
        </div>
        <div
          ref={thread}
          className={cn(
            "mt-3 flex flex-col gap-5 px-1 pb-4",
            fill &&
              "min-h-0 flex-1 overflow-y-auto pt-2 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] [scrollbar-width:thin]",
          )}
        >
          {messages.map((m) =>
            m.role === "user" ? (
              <p
                key={m.id}
                className="ms-auto max-w-[88%] rounded-2xl rounded-ee-md bg-secondary px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground"
              >
                {m.text}
              </p>
            ) : (
              <Reply key={m.id} message={m} run={run} reserve={!fill} onDone={onDone} />
            ),
          )}
        </div>
        <PromptBox
          placeholder="Ask about the route or huts"
          onSend={(text) => text.trim() && onSend(text.trim())}
          status={streaming ? "streaming" : "idle"}
          onStop={onStop}
          showAttach={false}
          maxRows={4}
        />
      </section>
      <section
        aria-labelledby="miyuki-trip-planner-packing"
        className={cn(
          "flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm",
          fill && "max-h-[34%] min-h-[164px] shrink-0",
        )}
      >
        <h2 id="miyuki-trip-planner-packing" className="sr-only">
          Packing
        </h2>
        <ProgressBar
          label={<span className="font-semibold">Packing</span>}
          value={packed.size}
          maxValue={PACKING.length}
          valueLabel={`${packed.size} of ${PACKING.length} packed`}
          size="sm"
          tone={packed.size === PACKING.length ? "success" : "brand"}
        />
        <ul
          className={cn(
            "mt-3 flex flex-col gap-2.5",
            fill && "-mx-1 min-h-0 overflow-y-auto px-1 py-0.5 [scrollbar-width:thin]",
          )}
        >
          {PACKING.map((item) => (
            <li key={item.id}>
              <Checkbox
                isSelected={packed.has(item.id)}
                onChange={(on) => onPack(item.id, on)}
                description={item.note}
                size="sm"
              >
                <span className={cn("transition-colors duration-200", packed.has(item.id) && "text-muted-foreground")}>
                  {item.label}
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function TripPlanner({ map, party = [], className, ...props }: TripPlannerProps) {
  const lg = useMedia("(min-width: 1024px)", true);
  const [order, setOrder] = useState(START_ORDER);
  const [hover, setHover] = useState<string | null>(null);
  const [scrub, setScrub] = useState<ElevationScrub | null>(null);
  const [run, setRun] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "u1",
      role: "user",
      text: "We want to do the traverse from 26 to 28 February. Is the north ridge sensible, and what would you change?",
    },
    { id: "a1", role: "assistant", text: ANSWER, tasks: TASKS, stream: true },
  ]);
  const [packed, setPacked] = useState(() => new Set(["beacon", "probe", "skins", "helmet", "torch"]));
  const route = buildRoute(order);
  const streaming = messages.some((m) => m.stream);

  const onShown = useCallback(() => setRun(true), []);
  const finish = useCallback(
    (id: string) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, stream: false } : m))),
    [],
  );
  const stop = () => setMessages((list) => list.map((m) => (m.stream ? { ...m, stream: false } : m)));
  const send = (text: string) =>
    setMessages((list) => [
      ...list.map((m) => (m.stream ? { ...m, stream: false } : m)),
      { id: `u${list.length + 1}`, role: "user", text },
      { id: `a${list.length + 2}`, role: "assistant", text: REPLY, stream: true },
    ]);
  const pack = (id: string, on: boolean) =>
    setPacked((set) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const profile = (
    <ElevationProfile
      label="Elevation"
      points={route.samples.map((s) => ({ km: Math.round(s.km * 100) / 100, m: Math.round(s.m) }))}
      waypoints={[...DAYS.map((d) => PLACES[d.end]), PLACES.summit].map((p) => ({
        name: p.name,
        km: Math.round((route.legs.find((l) => l.to.id === p.id)?.samples.at(-1)?.km ?? 0) * 100) / 100,
      }))}
      onScrub={setScrub}
      legend={false}
      height={lg ? 150 : 180}
      className="shrink-0"
    />
  );

  const itinerary = (
    <Itinerary
      order={order}
      onOrder={(day, ids) => setOrder((o) => ({ ...o, [day]: ids }))}
      route={route}
      onHover={setHover}
    />
  );
  const mapPane = (
    <div className={cn("flex min-h-0 flex-col gap-3", lg && "h-full")}>
      <RouteMap
        route={route}
        scrub={scrub}
        hover={hover}
        texture={map}
        className={lg ? "min-h-0 flex-1" : "h-[300px] sm:h-[400px]"}
      />
      {profile}
    </div>
  );
  const assistant = (
    <Assistant
      messages={messages}
      onSend={send}
      streaming={streaming}
      onDone={finish}
      onStop={stop}
      packed={packed}
      onPack={pack}
      run={run}
      onShown={onShown}
      fill={lg}
      className={lg ? "h-full" : undefined}
    />
  );

  return (
    <div
      {...props}
      className={cn(
        "flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:min-h-0 lg:overflow-hidden",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1 sm:flex-none">
          <h1 className="truncate font-display text-xl leading-7 font-semibold tracking-[-0.02em] text-foreground">
            Kamoshika ridge traverse
          </h1>
          <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
            Fri 26 to Sun 28 February 2027 · {oneDp(route.total.km)} km · +{grouped(route.total.up)} m · −
            {grouped(route.total.down)} m
          </p>
        </div>
        {party.length > 0 && (
          <ul aria-label="Party" className="flex items-center -space-x-2 max-sm:hidden">
            {party.map((p) => (
              <li key={p.name} title={p.role ? `${p.name}, ${p.role}` : p.name}>
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="size-8 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium ring-2 ring-background">
                    {p.name[0]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" iconStart={<Download aria-hidden="true" />} className="max-sm:hidden">
            GPX
          </Button>
          <Button variant="primary" size="sm" iconStart={<Share2 aria-hidden="true" />} className="max-sm:px-2.5">
            <span className="max-sm:sr-only">Share with party</span>
          </Button>
        </div>
      </header>

      {lg ? (
        <div className="grid min-h-0 flex-1 grid-cols-[288px_minmax(0,1fr)_300px] gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-y-auto pe-1 [scrollbar-width:thin]">{itinerary}</div>
          <div className="min-h-0">{mapPane}</div>
          <div className="min-h-0">{assistant}</div>
        </div>
      ) : (
        <Tabs variant="pill" defaultSelectedKey="itinerary" className="gap-4 px-4 pt-4 pb-8 sm:px-5">
          <TabList aria-label="Planner" className="flex w-full self-stretch">
            <Tab id="itinerary" className="flex-1">
              Itinerary
            </Tab>
            <Tab id="map" className="flex-1">
              Map
            </Tab>
            <Tab id="assistant" className="flex-1">
              Assistant
            </Tab>
          </TabList>
          <TabPanel id="itinerary">{itinerary}</TabPanel>
          <TabPanel id="map">{mapPane}</TabPanel>
          <TabPanel id="assistant">{assistant}</TabPanel>
        </Tabs>
      )}
    </div>
  );
}
