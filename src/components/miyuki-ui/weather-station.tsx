"use client";

import { Bell, CloudSun, Map as MapIcon, MountainSnow, PanelLeft, RadioTower, Settings, Share2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Barometer } from "@/components/miyuki-ui/barometer";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { type ForecastDay, type ForecastHour, ForecastStrip } from "@/components/miyuki-ui/forecast-strip";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { PrecipRadar } from "@/components/miyuki-ui/precip-radar";
import { SnowStakes, type SnowStakesDatum } from "@/components/miyuki-ui/snow-stakes";
import { WeatherIcon, type WeatherKind } from "@/components/miyuki-ui/weather-icon";
import { WindRose } from "@/components/miyuki-ui/wind-rose";
import { cn } from "@/lib/utils";

export interface WeatherStationTown {
  name: string;
  x: number;
  y: number;
}

export interface WeatherStationProps extends Omit<ComponentProps<"div">, "children"> {
  user?: FloatingSidebarUser;
  radarMap?: string;
  towns?: WeatherStationTown[];
}

const deg = (t: number) => `${Math.round(t) < 0 ? "−" : ""}${Math.abs(Math.round(t))}°`;

const NOW = {
  place: "Hakuba village",
  altitude: "760 m",
  date: "Saturday 13 February 2027",
  time: "07:40",
  temp: -6,
  feels: -11,
  kind: "snow" as WeatherKind,
  condition: "Light snow",
  high: -3,
  low: -9,
  wind: 14,
  gust: 31,
  from: "north-west",
  bearing: 315,
  humidity: 92,
  pressure: 1004,
  pressureBefore: 1009,
  visibility: "2.4 km",
  fresh: 18,
  depth: 96,
};

const days: ForecastDay[] = [
  {
    id: "sat",
    label: "Today",
    date: "13",
    title: "Today, Saturday 13 February",
    kind: "snow",
    summary: "Light snow, heavy after dark",
    high: -3,
    low: -9,
    snow: 85,
  },
  {
    id: "sun",
    label: "Sun",
    date: "14",
    title: "Sunday 14 February",
    kind: "heavy-snow",
    summary: "Heavy snow",
    high: -5,
    low: -11,
    snow: 95,
  },
  {
    id: "mon",
    label: "Mon",
    date: "15",
    title: "Monday 15 February",
    kind: "snow",
    summary: "Snow showers",
    high: -6,
    low: -13,
    snow: 70,
  },
  {
    id: "tue",
    label: "Tue",
    date: "16",
    title: "Tuesday 16 February",
    kind: "partly-cloudy",
    summary: "Sunny spells",
    high: -4,
    low: -14,
    snow: 20,
  },
  {
    id: "wed",
    label: "Wed",
    date: "17",
    title: "Wednesday 17 February",
    kind: "clear",
    summary: "Clear and cold",
    high: -2,
    low: -15,
    snow: 5,
  },
  {
    id: "thu",
    label: "Thu",
    date: "18",
    title: "Thursday 18 February",
    kind: "cloudy",
    summary: "Cloudy",
    high: -1,
    low: -9,
    snow: 30,
  },
  {
    id: "fri",
    label: "Fri",
    date: "19",
    title: "Friday 19 February",
    kind: "wind",
    summary: "Windy, snow later",
    high: -3,
    low: -8,
    snow: 55,
  },
];

const today: [number, number, WeatherKind][] = [
  [-8, 60, "snow"],
  [-8, 60, "snow"],
  [-9, 55, "snow"],
  [-9, 55, "snow"],
  [-9, 60, "snow"],
  [-8, 65, "snow"],
  [-7, 70, "snow"],
  [-6, 75, "snow"],
  [-6, 75, "snow"],
  [-5, 70, "snow"],
  [-4, 60, "snow"],
  [-4, 55, "cloudy"],
  [-3, 50, "cloudy"],
  [-3, 55, "cloudy"],
  [-3, 65, "snow"],
  [-4, 75, "snow"],
  [-5, 85, "snow"],
  [-6, 90, "heavy-snow"],
  [-6, 95, "heavy-snow"],
  [-7, 95, "heavy-snow"],
  [-7, 100, "heavy-snow"],
  [-8, 100, "heavy-snow"],
  [-8, 100, "heavy-snow"],
  [-8, 95, "heavy-snow"],
];

const pad = (n: number) => String(n).padStart(2, "0");

function hoursFor(day: ForecastDay): ForecastHour[] {
  if (day.id === "sat") return today.map(([temp, snow, kind], h) => ({ time: `${pad(h)}:00`, temp, snow, kind }));
  const rng = createRng(`hakuba-village-${day.id}`);
  return Array.from({ length: 24 }, (_, h) => {
    const rise =
      h < 5 ? 0 : h <= 14 ? (1 - Math.cos((Math.PI * (h - 5)) / 9)) / 2 : (1 + Math.cos((Math.PI * (h - 14)) / 15)) / 2;
    const temp = Math.round(day.low + (day.high - day.low) * rise + rng.range(-0.4, 0.4));
    const snow = Math.max(0, Math.min(100, Math.round((day.snow + rng.range(-18, 14)) / 5) * 5));
    const night = h < 7 || h >= 18;
    let kind: WeatherKind = day.kind;
    if (snow < 25) kind = night ? "clear-night" : day.kind === "clear" ? "clear" : "partly-cloudy";
    else if (day.kind === "heavy-snow" && snow < 80) kind = "snow";
    else if (day.kind === "wind") kind = h < 14 ? "wind" : "snow";
    return { time: `${pad(h)}:00`, kind, temp, snow };
  });
}

const hours = Object.fromEntries(days.map((d) => [d.id, hoursFor(d)]));

const stakes: SnowStakesDatum[] = [
  { label: "760 m", title: "Hakuba village, 760 m", depth: NOW.depth, fresh: NOW.fresh, temperature: -6.2 },
  { label: "1,020 m", title: "Nakayama, 1,020 m", depth: 142, fresh: 22, temperature: -8.1 },
  { label: "1,380 m", title: "Kamoshika, 1,380 m", depth: 188, fresh: 26, temperature: -10.4 },
  { label: "1,690 m", title: "Usagi ridge, 1,690 m", depth: 231, fresh: 29, temperature: -12.6 },
  { label: "2,010 m", title: "North ridge, 2,010 m", depth: 262, fresh: 31, temperature: -14.9 },
];

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const SHARES = [5.1, 2.2, 1.4, 1.0, 0.9, 0.8, 1.0, 1.3, 2.0, 2.6, 3.9, 6.8, 12.4, 19.6, 23.1, 15.9];
const BANDS = ["0–10", "10–20", "20–30", "30+"];
const wind = POINTS.map((direction, i) => {
  const strength = SHARES[i] / 23.1;
  const centre = 0.4 + 2 * strength;
  const weights = BANDS.map((_, k) => Math.exp(-((k - centre) ** 2) / 1.3));
  const sum = weights.reduce((a, b) => a + b, 0);
  return { direction, bands: weights.map((w) => Math.round((w / sum) * SHARES[i] * 10) / 10) };
});

const radarTimes = Array.from({ length: 12 }, (_, i) => {
  const m = 5 * 60 + 50 + i * 10;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
});

const defaultTowns: WeatherStationTown[] = [
  { name: "Hakuba", x: 50, y: 50 },
  { name: "Otari", x: 56, y: 20 },
  { name: "Ōmachi", x: 44, y: 82 },
  { name: "Nagano", x: 84, y: 60 },
  { name: "Togakushi", x: 76, y: 32 },
];

type Severity = "warning" | "danger" | "advisory";

const alerts: {
  id: string;
  severity: Severity;
  word: string;
  title: string;
  area: string;
  when: string;
  body: ReactNode;
  link: string;
}[] = [
  {
    id: "snow",
    severity: "warning",
    word: "Warning",
    title: "Heavy snow",
    area: "Northern Alps above 1,200 m",
    when: "18:00 today to 12:00 Sunday",
    body: "35 to 50 cm of new snow by Sunday midday, heaviest overnight. Roads above the village may close at short notice.",
    link: "Read the warning",
  },
  {
    id: "avalanche",
    severity: "danger",
    word: "Level 3",
    title: "Avalanche danger considerable",
    area: "Hakuba ridges, above the tree line",
    when: "Bulletin valid until 17:00 today",
    body: "Wind slab on north and east slopes near the ridges. A single skier can release it.",
    link: "Read the bulletin",
  },
  {
    id: "road",
    severity: "advisory",
    word: "Advisory",
    title: "Chains on route 31",
    area: "Hakuba to Otari",
    when: "Until further notice",
    body: "Packed snow above 600 m. Winter tyres and chains are checked at the Ōami junction.",
    link: "See road conditions",
  },
];

const rule: Record<Severity, string> = {
  warning: "bg-warning",
  danger: "bg-destructive",
  advisory: "bg-brand",
};

const word: Record<Severity, string> = {
  warning: "bg-warning-soft text-warning-strong",
  danger: "bg-destructive-soft text-destructive-strong",
  advisory: "bg-brand-soft text-brand-strong",
};

const navItems: FloatingSidebarItem[] = [
  { id: "forecast", label: "Forecast", icon: <CloudSun />, href: "#" },
  { id: "stations", label: "Stations", icon: <RadioTower />, count: 214, href: "#" },
  { id: "alerts", label: "Alerts", icon: <Bell />, count: alerts.length, countTone: "solid", href: "#" },
  { id: "maps", label: "Maps", icon: <MapIcon />, href: "#" },
];

const teams = [{ id: "shirakaba", name: "Shirakaba Weather", plan: "Mountain forecasts", logo: <MountainSnow /> }];

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

function WindArrow({ bearing }: { bearing: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0 text-brand-strong"
      style={{ transform: `rotate(${bearing + 180}deg)` }}
    >
      <path
        d="M8 2.5v11M4.5 6 8 2.5 11.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Fact({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] leading-5 text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
        {children}
      </dd>
      {sub != null && <dd className="text-[13px] leading-5 text-muted-foreground">{sub}</dd>}
    </div>
  );
}

export function WeatherStation({
  user = { name: "Yuna Sato", email: "yuna@shirakaba.example" },
  radarMap,
  towns = defaultTowns,
  className,
  ...props
}: WeatherStationProps) {
  const lg = useMedia("(min-width: 1024px)", true);
  const [menu, setMenu] = useState(false);
  const [settled, setSettled] = useState(false);
  const [narrow, setNarrow] = useState(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      aria-label="Shirakaba Weather"
      teams={teams}
      items={navItems}
      footerItems={[{ id: "settings", label: "Settings", icon: <Settings />, href: "#" }]}
      user={user}
      defaultCurrent="forecast"
      onNavigate={() => setMenu(false)}
      collapsed={drawer ? false : narrow}
      onCollapsedChange={drawer ? undefined : setNarrow}
      collapsible={!drawer}
      className={cn(drawer ? "min-h-0 flex-1" : "h-full", !settled && "transition-none")}
    />
  );

  const change = NOW.pressure - NOW.pressureBefore;

  return (
    <div
      {...props}
      className={cn("relative flex min-h-dvh gap-3 overflow-x-clip bg-background p-3 text-foreground", className)}
    >
      <div className="sticky top-3 hidden h-[calc(100dvh-24px)] shrink-0 lg:block">{sidebar(false)}</div>
      <Drawer
        side="left"
        isOpen={menu && !lg}
        onOpenChange={setMenu}
        closeButton={false}
        aria-label="Navigation"
        className="top-3 bottom-3 left-3 w-[264px] border-0 bg-transparent shadow-none"
      >
        {sidebar(true)}
      </Drawer>

      <main className="@container/main min-w-0 flex-1 pb-8 lg:px-4">
        <div className="mx-auto w-full max-w-[1320px]">
          <header className="flex min-h-11 items-center gap-2 py-1">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Open navigation"
              onPress={() => setMenu(true)}
              className="-ms-1 text-muted-foreground data-[hovered]:text-foreground lg:hidden"
            >
              <PanelLeft />
            </IconButton>
            <Breadcrumbs className="flex-nowrap">
              <Breadcrumb href="#">Forecast</Breadcrumb>
              <Breadcrumb>{NOW.place}</Breadcrumb>
            </Breadcrumbs>
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Share this forecast"
                className="text-muted-foreground data-[hovered]:text-foreground"
              >
                <Share2 />
              </IconButton>
              <Button variant="secondary" size="sm" iconStart={<Bell aria-hidden="true" />}>
                Follow<span className="max-sm:hidden"> station</span>
              </Button>
            </div>
          </header>

          <section
            aria-labelledby="miyuki-weather-station-now"
            className="pt-8 pb-10 @min-[720px]/main:pt-12 @min-[720px]/main:pb-14"
          >
            <div className="grid gap-x-12 gap-y-10 @min-[1040px]/main:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] @min-[1040px]/main:items-end">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground tabular-nums">
                  {NOW.date} · {NOW.time}
                </p>
                <h1
                  id="miyuki-weather-station-now"
                  className="mt-1 text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground"
                >
                  {NOW.place} <span className="font-normal text-muted-foreground">{NOW.altitude}</span>
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 @min-[560px]/main:flex-nowrap">
                  <p className="flex items-start font-display leading-[0.8] font-semibold tracking-[-0.06em] text-foreground tabular-nums">
                    <span className="sr-only">Temperature </span>
                    <span className="text-[7.5rem] @min-[560px]/main:text-[10rem] @min-[1040px]/main:text-[11.5rem]">
                      {deg(NOW.temp).slice(0, -1)}
                    </span>
                    <span className="mt-2 text-5xl tracking-[-0.03em] text-muted-foreground @min-[560px]/main:mt-4 @min-[560px]/main:text-6xl">
                      °C
                    </span>
                  </p>
                  <div className="flex min-w-0 items-center gap-4 @min-[560px]/main:flex-col @min-[560px]/main:items-start @min-[560px]/main:gap-3">
                    <WeatherIcon
                      kind={NOW.kind}
                      size={72}
                      label={NOW.condition}
                      className="size-14 text-foreground @min-[560px]/main:size-[72px]"
                    />
                    <div className="min-w-0">
                      <p className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
                        {NOW.condition}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground tabular-nums">
                        Feels like {deg(NOW.feels)}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground tabular-nums">
                        High {deg(NOW.high)} · Low {deg(NOW.low)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-7 max-w-[36rem] text-base leading-7 text-pretty text-foreground/85">
                  Light snow this morning, turning heavy after dark as a low deepens over the Sea of Japan. Expect 35 to
                  50 cm on the upper slopes by Sunday midday.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 @min-[560px]/main:grid-cols-3 @min-[1040px]/main:grid-cols-2 @min-[1040px]/main:border-t-0 @min-[1040px]/main:border-l @min-[1040px]/main:ps-10 @min-[1040px]/main:pt-0">
                <Fact label="Wind" sub={`From the ${NOW.from}, gusting ${NOW.gust}`}>
                  <WindArrow bearing={NOW.bearing} />
                  {NOW.wind} <span className="text-sm font-normal text-muted-foreground">km/h</span>
                </Fact>
                <Fact label="Pressure" sub={`Falling, ${Math.abs(change)} hPa in 3 hours`}>
                  {NOW.pressure.toLocaleString("en-US")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">hPa</span>
                </Fact>
                <Fact label="New snow" sub="Overnight, since 18:00">
                  {NOW.fresh} <span className="text-sm font-normal text-muted-foreground">cm</span>
                </Fact>
                <Fact label="Snow depth" sub="At the village stake">
                  {NOW.depth} <span className="text-sm font-normal text-muted-foreground">cm</span>
                </Fact>
                <Fact label="Humidity">{NOW.humidity}%</Fact>
                <Fact label="Visibility">{NOW.visibility}</Fact>
              </dl>
            </div>
          </section>

          <ForecastStrip
            label="This week"
            caption={`${NOW.place}, ${NOW.altitude}`}
            days={days}
            hours={hours}
            defaultValue="sat"
            startTime="06:00"
          />

          <section aria-labelledby="miyuki-weather-station-mountain" className="mt-12">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
              <h2
                id="miyuki-weather-station-mountain"
                className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
              >
                On the mountain
              </h2>
              <p className="text-[13px] text-muted-foreground tabular-nums">Five stations, read at 07:00</p>
            </div>
            <div className="grid grid-cols-1 gap-4 @min-[720px]/main:grid-cols-2 @min-[1100px]/main:grid-cols-12">
              <SnowStakes
                className="@min-[720px]/main:col-span-2 @min-[1100px]/main:col-span-6"
                label="Snow depth"
                value={`${NOW.depth} cm`}
                caption={`+${NOW.fresh} cm overnight at the village`}
                data={stakes}
                height={330}
              />
              <WindRose
                className="@min-[1100px]/main:col-span-3"
                label="Wind at the village, last 7 days"
                data={wind}
                bands={BANDS}
                unit="km/h"
                height={272}
              />
              <Barometer
                className="@min-[1100px]/main:col-span-3"
                label="Pressure"
                note="Sea level, 07:40"
                value={NOW.pressure}
                previous={NOW.pressureBefore}
                size={248}
              />
            </div>
          </section>

          <section aria-labelledby="miyuki-weather-station-radar" className="mt-12">
            <h2
              id="miyuki-weather-station-radar"
              className="mb-4 text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground"
            >
              Radar and alerts
            </h2>
            <div className="grid grid-cols-1 gap-4 @min-[1040px]/main:grid-cols-12">
              <PrecipRadar
                className="@min-[1040px]/main:col-span-8"
                label="Snow and rain, last two hours"
                note="Northern Alps radar, every 10 minutes"
                frames={12}
                times={radarTimes}
                wind={{ from: NOW.bearing, speed: 0.024 }}
                seed="hakuba-0213"
                coverage={0.48}
                height={340}
              >
                {radarMap && (
                  <img src={radarMap} alt="" className="size-full object-cover opacity-60 dark:opacity-35" />
                )}
                {towns.map((t) => (
                  <span
                    key={t.name}
                    className="absolute flex -translate-x-1 -translate-y-1/2 items-center gap-1 text-[11px] text-foreground/80"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  >
                    <span className="size-1.5 rounded-full bg-foreground/70 ring-2 ring-card/80" />
                    {t.name}
                  </span>
                ))}
              </PrecipRadar>

              <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm @min-[1040px]/main:col-span-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] leading-5 text-muted-foreground">Active alerts</h3>
                  <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
                    {alerts.length} for this station
                  </p>
                </div>
                <ul className="mt-2 flex flex-1 flex-col divide-y divide-border">
                  {alerts.map((a) => (
                    <li key={a.id} className="relative flex gap-4 py-4 last:pb-0">
                      <span
                        aria-hidden="true"
                        className={cn("w-[3px] shrink-0 self-stretch rounded-full", rule[a.severity])}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h4 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-foreground">
                            {a.title}
                          </h4>
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-full px-1.5 text-xs font-medium",
                              word[a.severity],
                            )}
                          >
                            {a.word}
                          </span>
                        </div>
                        <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
                          {a.area} · {a.when}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-pretty text-foreground/90">{a.body}</p>
                        <a
                          href="#"
                          className="mt-1.5 inline-block rounded-sm text-sm font-medium text-brand-strong underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                        >
                          {a.link}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-5 text-[13px] text-muted-foreground">
            <p>Readings from 214 stations across the Northern Alps.</p>
            <p className="tabular-nums">Next update at 08:00</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
