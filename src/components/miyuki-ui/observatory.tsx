"use client";

import { CalendarDate, Time } from "@internationalized/date";
import { CircleCheck, Moon, TriangleAlert } from "lucide-react";
import { type ComponentProps, type CSSProperties, Suspense, useState } from "react";
import { I18nProvider } from "react-aria-components";
import { Badge } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { type CalendarEvent, type CalendarSource, EventCalendar } from "@/components/miyuki-ui/calendar";
import { MoonPhase, MoonStrip, moonPhase } from "@/components/miyuki-ui/moon-phase";
import { NumberField } from "@/components/miyuki-ui/number-field";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { FallingStars, StarField } from "@/components/miyuki-ui/star-field";
import { SunArc } from "@/components/miyuki-ui/sun-arc";
import { TimeField } from "@/components/miyuki-ui/time-field";
import { WeatherIcon } from "@/components/miyuki-ui/weather-icon";
import { cn } from "@/lib/utils";

export type ObservatoryProps = Omit<ComponentProps<"div">, "children">;

const TONIGHT = "2027-02-26";
const SUNRISE = "06:09";
const SUNSET = "17:28";
const DARK_FROM = 19 * 60 + 1;
const DARK_TO = 24 * 60 + 4 * 60 + 36;
const LUNAR_DAY = 1490;
const PRICE = 600;
const CAPACITY = 40;

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};
const span = (m: number) => {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
};
const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
const shiftDay = (iso: string, n: number) =>
  new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const longDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const formatDay = (iso: string) => longDate.format(new Date(`${iso}T12:00:00Z`));

function moonNight(iso: string) {
  const info = moonPhase(iso);
  const transit = 720 + info.age * 48.76;
  const cycles = [-1, 0, 1].map((k) => [transit - 371 + k * LUNAR_DAY, transit + 371 + k * LUNAR_DAY] as const);
  const up = (t: number) => cycles.some(([a, b]) => t >= a && t <= b);
  const rise = cycles.map(([a]) => a).find((a) => a >= 720) ?? cycles[2][0];
  const set = cycles.map(([, b]) => b).find((b) => b >= 720) ?? cycles[2][1];
  let best = { from: 0, to: 0 };
  let total = 0;
  let start = -1;
  for (let t = DARK_FROM; t <= DARK_TO + 1; t++) {
    const dark = t <= DARK_TO && !up(t);
    if (dark) {
      total++;
      if (start < 0) start = t;
    } else if (start >= 0) {
      if (t - start > best.to - best.from) best = { from: start, to: t };
      start = -1;
    }
  }
  return { ...info, rise, set, up, dark: best, total };
}

function nextNewMoon(iso: string) {
  for (let i = 0; i < 31; i++) {
    const day = shiftDay(iso, i);
    if (moonPhase(day).age < 1) return day;
  }
  return iso;
}

const TONIGHT_MOON = moonNight(TONIGHT);
const TODAY = new CalendarDate(2027, 2, 26);
const MONTH = new CalendarDate(2027, 2, 1);

const HOURS = [
  { h: 18, cloud: 62, seeing: 2 },
  { h: 19, cloud: 34, seeing: 2 },
  { h: 20, cloud: 7, seeing: 4 },
  { h: 21, cloud: 4, seeing: 4 },
  { h: 22, cloud: 3, seeing: 4 },
  { h: 23, cloud: 5, seeing: 4 },
  { h: 0, cloud: 6, seeing: 3 },
  { h: 1, cloud: 9, seeing: 3 },
  { h: 2, cloud: 14, seeing: 3 },
  { h: 3, cloud: 23, seeing: 3 },
  { h: 4, cloud: 41, seeing: 2 },
  { h: 5, cloud: 57, seeing: 2 },
].map((row) => {
  const at = (row.h < 12 ? row.h + 24 : row.h) * 60;
  return {
    ...row,
    at,
    moon: TONIGHT_MOON.up(at + 30),
    best: at >= 20 * 60 && at + 60 <= TONIGHT_MOON.rise,
  };
});

const READOUTS = [
  { label: "Seeing", value: "4 of 5", note: "Steady air after 20:00" },
  { label: "Cloud cover", value: "4%", note: "Clear from 20:00 to 03:00" },
  {
    label: "Moonrise",
    value: clock(TONIGHT_MOON.rise),
    note: `${Math.round(TONIGHT_MOON.illumination * 100)}% lit, waning`,
  },
  {
    label: "At the dome",
    value: "−8 °C",
    note: "Wind 2 m/s from the north-west",
  },
];

const NIGHTS = [
  { id: "2027-02-26", label: "Tonight", left: 14 },
  { id: "2027-02-27", label: "Sat 27 Feb", left: 6 },
  { id: "2027-03-05", label: "Fri 5 Mar", left: 31 },
];

const CALENDARS: CalendarSource[] = [
  { id: "open", label: "Open nights", color: "var(--brand)" },
  { id: "sky", label: "In the sky", color: "var(--chart-3)" },
  { id: "talks", label: "Talks and families", color: "var(--chart-2)" },
  { id: "closed", label: "Cancelled", color: "var(--chart-5)" },
];

const openNight = (day: string, title = "Open night", notes?: string): CalendarEvent => ({
  id: `open-${day}`,
  title,
  start: `2027-02-${day}T19:00`,
  end: `2027-02-${day}T23:00`,
  calendar: "open",
  location: "Main dome, 60 cm telescope",
  notes: notes ?? "Doors at 19:00, last entry 22:30. Sessions at the telescope every half hour.",
});

const EVENTS: CalendarEvent[] = [
  openNight("05"),
  {
    id: "snowed-out",
    title: "Closed: snow",
    start: "2027-02-06T19:00",
    end: "2027-02-06T23:00",
    calendar: "closed",
    notes:
      "The road from Tōyako Onsen closed at 15:00 after 40 cm of snow. Everyone booked has been moved to the 13th.",
  },
  {
    id: "new-moon",
    title: "New moon",
    start: "2027-02-06",
    calendar: "sky",
    notes: "The darkest night of the month, and we were snowed in.",
  },
  {
    id: "jupiter",
    title: "Jupiter at opposition",
    start: "2027-02-11",
    calendar: "sky",
    notes: "Jupiter is opposite the sun, at its closest and brightest, and up all night. Four moons in the eyepiece.",
  },
  openNight(
    "11",
    "Holiday open night",
    "An extra night for National Foundation Day. The telescope stays on Jupiter until 21:30.",
  ),
  openNight("12"),
  openNight("13"),
  {
    id: "sun-morning",
    title: "Sunspot morning",
    start: "2027-02-13T10:00",
    end: "2027-02-13T11:30",
    calendar: "talks",
    location: "Solar telescope, south terrace",
    notes: "Looking at the sun safely through the filtered refractor. Ages six and up, with a grown-up.",
  },
  openNight("19"),
  {
    id: "talk",
    title: "Winter sky talk",
    start: "2027-02-19T18:00",
    end: "2027-02-19T18:45",
    calendar: "talks",
    location: "Lecture room",
    notes: "Finding Orion, the Winter Triangle and the Pleiades without a chart, before the doors open.",
  },
  openNight("20"),
  {
    id: "meteors",
    title: "Fireball night",
    start: "2027-02-20T18:00",
    end: "2027-02-20T18:50",
    calendar: "talks",
    location: "Lecture room",
    notes:
      "The month's brightest fireballs from our two all-sky cameras, frame by frame, and how we work out where they fell.",
  },
  {
    id: "full-moon",
    title: "Full moon",
    start: "2027-02-21",
    calendar: "sky",
    notes: "The snow moon rises at 17:35, as the sun sets.",
  },
  {
    id: "zodiacal",
    title: "Zodiacal light",
    start: "2027-02-24",
    end: "2027-02-28",
    calendar: "sky",
    notes: "A faint cone of light in the west for an hour after twilight ends, before the moon rises.",
  },
  openNight("26"),
  openNight("27"),
];

export function Observatory({ className, ...props }: ObservatoryProps) {
  const [day, setDay] = useState(TONIGHT);
  const [night, setNight] = useState(NIGHTS[0].id);

  return (
    <div {...props} className={cn("min-h-dvh bg-background text-foreground", className)}>
      <header className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <a
          href="#observatory-tonight"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-foreground">
            <path d="M3.5 20.5V14a8.5 8.5 0 0 1 17 0v6.5Z" fill="currentColor" opacity="0.9" />
            <path d="M11 6.2h2v8.3h-2Z" className="fill-background" />
            <path d="M2 20.5h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Hoshimi Observatory</span>
            <span className="text-xs text-muted-foreground">Lake Tōya, 412 m</span>
          </span>
        </a>
        <nav aria-label="On this page" className="ms-auto hidden items-center gap-1 text-sm md:flex">
          {[
            ["Tonight", "#observatory-tonight"],
            ["Moon and sun", "#observatory-moon"],
            ["Calendar", "#observatory-calendar"],
            ["Visiting", "#observatory-notice"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {label}
            </a>
          ))}
        </nav>
        <Button
          size="sm"
          variant="secondary"
          className="ms-auto md:ms-0"
          onPress={() => {
            const el = document.getElementById("observatory-book");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            el?.querySelector<HTMLElement>("[role=radio], button")?.focus({ preventScroll: true });
          }}
        >
          Book a place
        </Button>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Sky />
        <Hours />

        <div id="observatory-moon" className="mt-6 grid scroll-mt-6 gap-6 lg:grid-cols-12">
          <MoonCard day={day} onDay={setDay} />
          <section
            aria-labelledby="observatory-sun"
            className="flex flex-col overflow-clip rounded-2xl border border-border bg-card/60 p-5 sm:p-6 lg:col-span-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="observatory-sun" className="font-display text-xl font-semibold tracking-[-0.02em]">
                The sun today
              </h2>
              <p className="text-[13px] text-muted-foreground">Drag it to any hour</p>
            </div>
            <SunArc
              className="mt-6"
              sunrise={SUNRISE}
              sunset={SUNSET}
              twilight={45}
              defaultTime="16:52"
              label="Friday 26 February"
              height={180}
            />
            <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-[13px] text-muted-foreground">Fully dark</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {clock(DARK_FROM)} to {clock(DARK_TO)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">Twilight after sunset</dt>
                <dd className="mt-0.5 font-medium tabular-nums">1 h 33 min</dd>
              </div>
            </dl>
          </section>
        </div>

        <section id="observatory-calendar" aria-label="Events this month" className="mt-10 scroll-mt-6">
          <I18nProvider locale="en-GB">
            <EventCalendar
              events={EVENTS}
              calendars={CALENDARS}
              today={TODAY}
              defaultMonth={MONTH}
              onEventClick={(event) => {
                const date =
                  typeof event.start === "string" ? event.start.slice(0, 10) : event.start.toString().slice(0, 10);
                if (event.calendar === "open" && NIGHTS.some((n) => n.id === date)) setNight(date);
              }}
              showNewEvent={false}
            />
          </I18nProvider>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Booking night={night} onNight={setNight} />
          <Notice />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-8 text-[13px] text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Hoshimi Observatory · 41 Tsukiura, Tōyako, Hokkaido</p>
          <p>Open nights Friday and Saturday, 19:00 to 23:00</p>
        </div>
      </footer>
    </div>
  );
}

function Sky() {
  const tones = cn(
    "[--miyuki-observatory-top:color-mix(in_oklab,var(--brand)_13%,var(--card))]",
    "[--miyuki-observatory-glow:color-mix(in_oklab,var(--chart-4)_20%,var(--card))]",
    "[--miyuki-observatory-far:color-mix(in_oklab,var(--brand-strong)_18%,var(--card))]",
    "[--miyuki-observatory-ground:color-mix(in_oklab,var(--brand-strong)_26%,var(--card))]",
    "dark:[--miyuki-observatory-top:var(--background)]",
    "dark:[--miyuki-observatory-glow:color-mix(in_oklab,color-mix(in_oklab,var(--brand)_70%,var(--chart-3))_24%,var(--background))]",
    "dark:[--miyuki-observatory-far:color-mix(in_oklab,var(--brand)_9%,var(--background))]",
    "dark:[--miyuki-observatory-ground:color-mix(in_oklab,var(--background)_82%,black)]",
  );
  return (
    <section
      id="observatory-tonight"
      aria-labelledby="observatory-tonight-title"
      className={cn(
        "relative isolate mt-2 flex scroll-mt-6 flex-col overflow-clip rounded-3xl border border-border",
        tones,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,var(--miyuki-observatory-top)_40%,var(--miyuki-observatory-glow)_88%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <StarField density={80} className="hidden dark:block" />
        <StarField density={170} className="dark:hidden" />
        <FallingStars minDelay={3500} maxDelay={9000} />
      </div>

      <div className="px-6 pt-8 sm:px-10 sm:pt-10 lg:px-12 lg:pt-12">
        <p className="text-[13px] text-muted-foreground tabular-nums">Tonight · Friday 26 February</p>
        <h1
          id="observatory-tonight-title"
          className="mt-3 max-w-[17ch] font-display text-[2.375rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl"
        >
          Clear and dark until the moon rises at {clock(TONIGHT_MOON.rise)}
        </h1>
        <p className="mt-4 max-w-[38rem] text-base/7 text-pretty text-muted-foreground">
          Doors at 19:00. The 60 cm telescope is on Jupiter until nine, then the Orion Nebula.
        </p>
      </div>

      <div aria-hidden="true" className="min-h-20 flex-1 sm:min-h-28" />

      <div aria-hidden="true" className="relative h-24 sm:h-32">
        <svg viewBox="0 0 1200 140" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path
            d="M0 140V86C70 82 130 70 200 74C270 78 320 64 380 66C450 68 500 80 580 78C640 76 690 72 740 64C800 52 852 16 892 8C904 5 916 5 928 9C968 22 1022 56 1080 68C1120 76 1160 74 1200 78V140Z"
            className="fill-(--miyuki-observatory-far)"
          />
          <path
            d="M0 140V112C80 108 150 98 230 101C320 104 360 116 450 114C540 112 600 102 690 104C780 106 830 118 930 116C1030 114 1100 104 1200 108V140Z"
            className="fill-(--miyuki-observatory-ground)"
          />
        </svg>
        <svg
          viewBox="0 0 40 30"
          className="absolute h-[22px] w-[30px] -translate-x-1/2 translate-y-[3px] sm:h-[30px] sm:w-10"
          style={{ left: "19.2%", bottom: "27.8%" } as CSSProperties}
        >
          <path d="M8 16h24v14H8Z" className="fill-(--miyuki-observatory-ground)" />
          <path d="M5.5 17a14.5 14.5 0 0 1 29 0Z" className="fill-(--miyuki-observatory-ground)" />
          <path d="M18.6 3.6h2.8V17h-2.8Z" className="fill-(--miyuki-observatory-glow)" />
          <circle cx="13" cy="25" r="3" className="fill-chart-5 opacity-30 blur-[2px]" />
          <circle cx="13" cy="25" r="1" className="fill-chart-5" />
        </svg>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 bg-(--miyuki-observatory-ground) px-6 pt-2 pb-7 sm:px-10 lg:grid-cols-4 lg:px-12 lg:pb-9">
        {READOUTS.map((r, i) => (
          <div key={r.label} className={cn("flex flex-col", i > 0 && "lg:border-l lg:border-foreground/10 lg:ps-6")}>
            <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
            <dd className="mt-1 font-display text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums sm:text-[2rem]">
              {r.value}
            </dd>
            <dd className="mt-2 text-[13px] text-muted-foreground">{r.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Hours() {
  const best = HOURS.filter((h) => h.best);
  const cell = (on: boolean) => cn("px-1 text-center", on && "bg-brand-soft/70 dark:bg-brand-soft/45");
  return (
    <section
      aria-labelledby="observatory-hours"
      className="mt-6 rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="observatory-hours" className="font-display text-xl font-semibold tracking-[-0.02em]">
          Hour by hour
        </h2>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Best between <span className="font-medium text-foreground">{clock(best[0].at)}</span> and{" "}
          <span className="font-medium text-foreground">{clock(TONIGHT_MOON.rise)}</span>, before moonrise
        </p>
      </div>
      <div className="-mx-5 mt-4 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="row" className="w-20 py-2 pe-3 text-start text-[13px] font-normal text-muted-foreground">
                Hour
              </th>
              {HOURS.map((h, i) => (
                <th
                  key={h.h}
                  scope="col"
                  className={cn(
                    cell(h.best),
                    "py-2 text-xs font-medium tabular-nums",
                    h.best && i === HOURS.indexOf(best[0]) && "rounded-tl-lg",
                    h.best && h === best[best.length - 1] && "rounded-tr-lg",
                  )}
                >
                  {pad(h.h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="py-1.5 pe-3 text-start text-[13px] font-normal text-muted-foreground">
                Sky
              </th>
              {HOURS.map((h) => (
                <td key={h.h} className={cn(cell(h.best), "py-1.5")}>
                  <WeatherIcon
                    kind={h.cloud >= 30 ? "cloudy" : "clear-night"}
                    animate="never"
                    size={22}
                    label={h.cloud >= 30 ? "Cloudy" : "Clear"}
                    className="mx-auto"
                  />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pe-3 text-start text-[13px] font-normal text-muted-foreground">
                Cloud
              </th>
              {HOURS.map((h) => (
                <td
                  key={h.h}
                  className={cn(
                    cell(h.best),
                    "py-1.5 tabular-nums",
                    h.cloud < 10 ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {h.cloud}%
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pe-3 text-start text-[13px] font-normal text-muted-foreground">
                Seeing
              </th>
              {HOURS.map((h) => (
                <td key={h.h} className={cn(cell(h.best), "py-2.5")}>
                  <span role="img" aria-label={`${h.seeing} of 5`} className="flex justify-center gap-[3px]">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <span
                        key={d}
                        className={cn("size-1 rounded-full", d <= h.seeing ? "bg-brand" : "bg-border-strong")}
                      />
                    ))}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pe-3 text-start text-[13px] font-normal text-muted-foreground">
                Moon
              </th>
              {HOURS.map((h) => (
                <td
                  key={h.h}
                  className={cn(
                    cell(h.best),
                    "py-2",
                    h.best && h === best[0] && "rounded-bl-lg",
                    h.best && h === best[best.length - 1] && "rounded-br-lg",
                  )}
                >
                  {h.moon ? (
                    <Moon aria-label="Moon up" className="mx-auto size-3.5 text-muted-foreground" />
                  ) : (
                    <span className="sr-only">Moon down</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MoonCard({ day, onDay }: { day: string; onDay: (day: string) => void }) {
  const moon = moonNight(day);
  const next = nextNewMoon(day);
  const lit = Math.round(moon.illumination * 100);
  const darkSpan = moon.dark.to - moon.dark.from;
  return (
    <section
      aria-labelledby="observatory-moon-title"
      className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 lg:col-span-7"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="observatory-moon-title" className="font-display text-xl font-semibold tracking-[-0.02em]">
          The moon
        </h2>
        <p className="text-[13px] text-muted-foreground">Choose a night below</p>
      </div>
      <div className="mt-6 grid items-center gap-x-10 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <MoonPhase date={day} size={184} className="mx-auto sm:mx-0 sm:ms-2" />
        <div>
          <p className="text-[13px] text-muted-foreground">{day === TONIGHT ? "Tonight" : formatDay(day)}</p>
          <p className="mt-1 font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{moon.name}</p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {lit}% lit · {moon.age.toFixed(1)} days old
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-[13px] text-muted-foreground">Moonrise</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {clock(moon.rise)}
                {moon.rise >= 1440 ? <span className="font-normal text-muted-foreground"> next day</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Moonset</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {clock(moon.set)}
                {moon.set >= 1440 ? <span className="font-normal text-muted-foreground"> next day</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Dark sky</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {darkSpan > 0 ? `${clock(moon.dark.from)} to ${clock(moon.dark.to)}` : "None tonight"}
                {darkSpan > 0 ? (
                  <span className="block text-[13px] font-normal text-muted-foreground">{span(darkSpan)}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Next new moon</dt>
              <dd className="mt-0.5 font-medium">{next === day ? "Tonight" : formatDay(next)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <MoonStrip
        from={TONIGHT}
        days={14}
        value={day}
        onChange={onDay}
        label="Night"
        className="mt-6 border-t border-border pt-4"
      />
    </section>
  );
}

function Booking({ night, onNight }: { night: string; onNight: (night: string) => void }) {
  const [arrival, setArrival] = useState<Time | null>(new Time(20, 0));
  const [people, setPeople] = useState(2);
  const [booked, setBooked] = useState<Record<string, { people: number; arrival: string; ref: string }>>({});
  const current = NIGHTS.find((n) => n.id === night) ?? NIGHTS[0];
  const taken = booked[night];
  const left = current.left - (taken?.people ?? 0);
  const min = new Time(19, 0);
  const max = new Time(22, 30);
  const valid = arrival != null && arrival.compare(min) >= 0 && arrival.compare(max) <= 0;
  const time = arrival ? `${pad(arrival.hour)}:${pad(arrival.minute)}` : "";
  const when = night === TONIGHT ? "Tonight" : formatDay(night);

  return (
    <section
      id="observatory-book"
      aria-labelledby="observatory-book-title"
      className="@container scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:col-span-7"
    >
      <div className="grid gap-x-10 @xl:grid-cols-2">
        <div>
          <h2 id="observatory-book-title" className="font-display text-xl font-semibold tracking-[-0.02em]">
            Book an open night
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {yen(PRICE)} a person, paid at the door. Under 16s free.
          </p>

          <SegmentedControl
            aria-label="Night"
            size="sm"
            fullWidth
            selectedKeys={[night]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (typeof next === "string") onNight(next);
            }}
            className="mt-5"
          >
            {NIGHTS.map((n) => (
              <Segment key={n.id} id={n.id}>
                {n.label}
              </Segment>
            ))}
          </SegmentedControl>

          <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">{formatDay(night)}, 19:00 to 23:00</span>
            <span
              className={cn("shrink-0 tabular-nums", left <= 8 ? "font-medium text-warning-strong" : "text-foreground")}
            >
              {left} of {CAPACITY} left
            </span>
          </div>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border">
            <span
              className="block h-full origin-left rounded-full bg-brand transition-transform duration-300 ease-settle"
              style={{ transform: `scaleX(${(CAPACITY - left) / CAPACITY})` }}
            />
          </span>
          <p className="mt-4 hidden text-[13px]/5 text-pretty text-muted-foreground @xl:block">
            Click an open night in the calendar to book it. Telescope sessions start every half hour; groups of more
            than eight, please write to us.
          </p>
        </div>
        <div>
          {taken ? (
            <div
              role="status"
              className="mt-6 flex flex-col items-start gap-3 border-t border-border pt-5 @xl:mt-0 @xl:border-t-0 @xl:pt-0"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-success-strong">
                <CircleCheck aria-hidden="true" className="size-4" />
                Booked
              </p>
              <p className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">
                {when} at {taken.arrival}
              </p>
              <p className="text-[13px]/5 text-pretty text-muted-foreground">
                {taken.people} {taken.people === 1 ? "place" : "places"}, reference{" "}
                <span className="font-medium text-foreground tabular-nums">{taken.ref}</span>. We hold them for half an
                hour, then they go to the queue at the door.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onPress={() =>
                  setBooked((b) => {
                    const rest = { ...b };
                    delete rest[night];
                    return rest;
                  })
                }
              >
                Change booking
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 @xl:mt-0">
                <Suspense fallback={<div aria-hidden="true" className="h-[62px]" />}>
                  <TimeField
                    label="Arrival"
                    value={arrival}
                    onChange={setArrival}
                    minValue={min}
                    maxValue={max}
                    hourCycle={24}
                    errorMessage="Between 19:00 and 22:30"
                  />
                </Suspense>
                <NumberField
                  label="People"
                  minValue={1}
                  maxValue={Math.min(8, left)}
                  value={Math.min(people, left)}
                  onChange={(v) => setPeople(Number.isNaN(v) ? 1 : v)}
                />
              </div>
              <p className="mt-2 text-[13px]/5 text-muted-foreground @xl:hidden">
                Telescope sessions start every half hour. Groups of more than eight, please write to us.
              </p>
              <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {Math.min(people, left)} × {yen(PRICE)}
                </span>
                <span className="font-display text-xl font-semibold tracking-[-0.02em] tabular-nums">
                  {yen(Math.min(people, left) * PRICE)}
                </span>
              </div>
              <Button
                size="lg"
                className="mt-4 w-full"
                isDisabled={!valid || left === 0}
                onPress={() => {
                  const n = Math.min(people, left);
                  setBooked((b) => ({
                    ...b,
                    [night]: {
                      people: n,
                      arrival: time,
                      ref: `HM-${night.slice(5, 7)}${night.slice(8, 10)}-${118 + n * 7}`,
                    },
                  }));
                }}
              >
                {left === 0
                  ? "Fully booked"
                  : `Book ${Math.min(people, left)} ${Math.min(people, left) === 1 ? "place" : "places"} at ${valid ? time : "…"}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Notice() {
  return (
    <aside
      id="observatory-notice"
      aria-labelledby="observatory-notice-title"
      className="scroll-mt-6 rounded-2xl border border-border p-5 sm:p-6 lg:col-span-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="observatory-notice-title" className="flex items-center gap-2 text-sm font-medium">
          <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
          Visitor notice
        </h2>
        <Badge size="sm" tone="warning">
          Icy road
        </Badge>
      </div>
      <p className="mt-3 text-[13px]/5 text-pretty text-foreground/80">
        The road up from Tōyako Onsen was ploughed at noon but freezes after dark. Come on winter tyres, or take the
        18:40 shuttle from the bus terminal. The dome is open to the sky and unheated, so dress for −8 °C.
      </p>
      <p className="mt-3 text-[13px]/5 text-pretty text-foreground/80">
        Past the gate, red light only: white torches and phone screens undo twenty minutes of everyone&apos;s dark
        adaptation.
      </p>
      <p className="mt-4 text-xs text-muted-foreground tabular-nums">Updated Friday 26 February, 14:10</p>
    </aside>
  );
}
