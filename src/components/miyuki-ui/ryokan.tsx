"use client";

import { type CalendarDate, getWeeksInMonth, parseDate } from "@internationalized/date";
import { Bath, BedDouble, Check, Ruler, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, Suspense, useEffect, useId, useState } from "react";
import { useLocale } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { RangeCalendar } from "@/components/miyuki-ui/date-calendar";
import { FooterWaterline } from "@/components/miyuki-ui/footer-waterline";
import { TextField } from "@/components/miyuki-ui/input";
import { NumberField } from "@/components/miyuki-ui/number-field";
import { RadioCard, RadioGroup } from "@/components/miyuki-ui/radio";
import { Steam } from "@/components/miyuki-ui/steam";
import { TideProgress } from "@/components/miyuki-ui/tide-progress";
import { cn } from "@/lib/utils";

function CalendarSpace({ month, className }: { month?: CalendarDate | null; className?: string }) {
  const { locale } = useLocale();
  const weeks = month ? getWeeksInMonth(month, locale) : 5;
  return (
    <div aria-hidden="true" className={cn("w-[252px] max-w-full", className)} style={{ height: 76 + 38 * weeks }} />
  );
}

interface Room {
  id: string;
  name: string;
  size: number;
  guests: number;
  rate: number;
  blurb: string;
  detail: string;
}

const ROOMS: Room[] = [
  {
    id: "river",
    name: "River room",
    size: 24,
    guests: 3,
    rate: 28600,
    blurb: "Eight tatami mats and a low window over the Kiritani river. You hear the water all night.",
    detail: "Futons laid at 20:00",
  },
  {
    id: "garden",
    name: "Garden room",
    size: 32,
    guests: 2,
    rate: 36300,
    blurb: "Ten mats, a sitting veranda and a cypress tub on the terrace, filled from the spring.",
    detail: "Private cypress bath",
  },
  {
    id: "yukimi",
    name: "Snow-viewing room",
    size: 46,
    guests: 4,
    rate: 44000,
    blurb: "Two rooms under the eaves with a round window on the ridge. Our largest, and the warmest in a storm.",
    detail: "Two rooms, sleeps four",
  },
];

const BATH_TAX = 150;
const childRate = (rate: number) => Math.round((rate * 0.7) / 100) * 100;
const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const FULL = new Set(["2027-02-05", "2027-02-06", "2027-02-20", "2027-02-27", "2027-03-13"]);
const OPEN_FROM = parseDate("2027-02-12");
const OPEN_TO = parseDate("2027-03-31");

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const short = (d: CalendarDate) => dayFormat.format(new Date(Date.UTC(d.year, d.month - 1, d.day)));

interface PublicBath {
  id: string;
  name: string;
  kind: string;
  temp: number;
  holds: number;
  hours: [number, number][];
  busy: [number, number][];
}

const h = (hour: number, minute = 0) => hour * 60 + minute;

const BATHS: PublicBath[] = [
  {
    id: "kawa",
    name: "Kawa-no-yu",
    kind: "Open-air, by the river",
    temp: 41,
    holds: 10,
    hours: [
      [h(6), h(9, 30)],
      [h(15), h(23)],
    ],
    busy: [
      [h(6), 0.2],
      [h(7), 0.5],
      [h(9), 0.1],
      [h(15), 0.2],
      [h(17), 0.6],
      [h(18), 0.2],
      [h(20, 30), 0.8],
      [h(22), 0.3],
      [h(23), 0.1],
    ],
  },
  {
    id: "kiri",
    name: "Kiri-no-yu",
    kind: "Indoor, cypress and stone",
    temp: 42,
    holds: 12,
    hours: [
      [h(5), h(10)],
      [h(14), h(24)],
    ],
    busy: [
      [h(5), 0.1],
      [h(6, 30), 0.45],
      [h(8), 0.3],
      [h(10), 0.1],
      [h(14), 0.15],
      [h(16, 30), 0.5],
      [h(18), 0.15],
      [h(21), 0.7],
      [h(23), 0.25],
      [h(24), 0.05],
    ],
  },
];

function occupancy(bath: PublicBath, now: number) {
  const open = bath.hours.find(([a, b]) => now >= a && now < b);
  if (!open)
    return { open: false, people: 0, next: bath.hours.find(([a]) => a > now)?.[0] ?? bath.hours[0][0], closes: 0 };
  const pts = bath.busy;
  let level = pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ta, va] = pts[i];
    const [tb, vb] = pts[i + 1];
    if (now >= ta && now <= tb) level = va + ((vb - va) * (now - ta)) / Math.max(1, tb - ta);
    else if (now > tb) level = vb;
  }
  return { open: true, people: Math.max(0, Math.round(level * bath.holds)), next: 0, closes: open[1] };
}

const clock = (minute: number) =>
  `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const hoursText = (bath: PublicBath) =>
  bath.hours.map(([a, b]) => `${clock(a)}–${b === 1440 ? "24:00" : clock(b)}`).join(" and ");

const MENU: { course: string; dish: string }[] = [
  { course: "Sakizuke", dish: "Sweet shrimp from Otaru port under yuzu jelly" },
  { course: "Hassun", dish: "Herring roe on kelp, simmered burdock and one roasted chestnut" },
  { course: "Owan", dish: "Clear broth with a hairy crab dumpling and mitsuba" },
  { course: "Otsukuri", dish: "Flounder, scallop and squid, cut at the counter" },
  { course: "Yakimono", dish: "Atka mackerel grilled over binchō charcoal" },
  { course: "Nimono", dish: "Daikon simmered in kelp stock with Shiraoi beef" },
  { course: "Shokuji", dish: "Rice from Rankoshi, red miso soup and pickles from our cellar" },
  { course: "Mizugashi", dish: "Haskap sorbet and a cup of roasted green tea" },
];

const SECTIONS = [
  { id: "rooms", label: "Rooms" },
  { id: "baths", label: "Baths" },
  { id: "dinner", label: "Dinner" },
  { id: "getting-here", label: "Getting here" },
];

function useMinute() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const date = new Date();
      setNow(date.getHours() * 60 + date.getMinutes());
      timer = window.setTimeout(tick, 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds()) + 40);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

function Picture({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} draggable={false} className={cn("object-cover", className)} />
  ) : (
    <div
      role="img"
      aria-label={alt}
      className={cn("bg-[linear-gradient(160deg,var(--brand-soft),var(--muted)_60%,var(--accent))]", className)}
    />
  );
}

function LineMap() {
  const stations = [
    { name: "Otaru", x: 44 },
    { name: "Asari", x: 150, here: true },
    { name: "Zenibako", x: 262 },
    { name: "Teine", x: 380 },
    { name: "Sapporo", x: 516 },
  ];
  return (
    <svg
      viewBox="0 0 560 250"
      role="img"
      aria-label="Map: the Shiokaze Line runs along the shore from Otaru to Sapporo. Shizuku is twelve minutes by shuttle up the valley from Asari station."
      className="h-auto w-full"
    >
      <path d="M0 0H560V54C500 64 450 40 380 50S250 70 190 52 80 40 0 58Z" className="fill-brand-soft" />
      <path
        d="M0 58C80 40 130 70 190 52S310 30 380 50 500 64 560 54"
        fill="none"
        strokeWidth={1.2}
        className="stroke-brand/40"
      />
      <text
        x={548}
        y={30}
        textAnchor="end"
        className="fill-brand-strong text-[11px] max-sm:text-[17px]"
        fontStyle="italic"
      >
        Ishikari Bay
      </text>
      <path
        d="M150 96C150 140 170 158 196 176S236 206 246 214"
        fill="none"
        strokeWidth={2.5}
        strokeDasharray="5 5"
        strokeLinecap="round"
        className="stroke-foreground/55"
      />
      <path
        d="M112 236C150 200 180 214 214 196S270 178 300 200"
        fill="none"
        strokeWidth={1}
        className="stroke-border-strong"
      />
      <path d="M96 248C142 212 182 228 220 210S286 192 326 214" fill="none" strokeWidth={1} className="stroke-border" />
      <text x={186} y={160} className="fill-muted-foreground text-[11px] max-sm:text-[17px]">
        Shuttle, 12 min
      </text>
      <line x1={44} y1={96} x2={516} y2={96} strokeWidth={6} strokeLinecap="round" className="stroke-brand" />
      {stations.map((s) => (
        <g key={s.name}>
          <circle
            cx={s.x}
            cy={96}
            r={s.here ? 9 : 6.5}
            strokeWidth={2.5}
            className={cn("fill-card", s.here ? "stroke-brand" : "stroke-foreground/80")}
          />
          {s.here && <circle cx={s.x} cy={96} r={4} className="fill-brand" />}
          <text
            x={s.x}
            y={128}
            textAnchor="middle"
            className={cn(
              "text-[13px] max-sm:text-[19px]",
              s.here ? "fill-foreground font-semibold" : "fill-muted-foreground",
            )}
          >
            {s.name}
          </text>
        </g>
      ))}
      <g transform="translate(252 218)">
        <circle r={13} className="fill-primary" />
        <path
          d="M0-7C3 -2.5 4.6 0.4 4.6 2.4A4.6 4.6 0 0 1-4.6 2.4C-4.6 0.4-3-2.5 0-7Z"
          className="fill-primary-foreground"
        />
      </g>
      <text x={272} y={224} className="fill-foreground text-[13px] font-semibold max-sm:text-[19px]">
        Shizuku
      </text>
    </svg>
  );
}

export interface RyokanImages {
  hero?: string;
  rooms?: string[];
  bath?: string;
}

export interface RyokanProps extends ComponentProps<"div"> {
  images?: RyokanImages;
}

export function Ryokan({ images = {}, className, ...props }: RyokanProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const now = useMinute();
  const [roomId, setRoomId] = useState("garden");
  const [range, setRange] = useState<{ start: CalendarDate; end: CalendarDate } | null>({
    start: parseDate("2027-02-12"),
    end: parseDate("2027-02-14"),
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const room = ROOMS.find((r) => r.id === roomId) ?? ROOMS[0];
  const nights = range ? range.end.compare(range.start) : 0;
  const lines =
    nights > 0
      ? [
          {
            id: "adults",
            label: `${room.name}, adults`,
            detail: `${plural(adults, "adult")} × ${plural(nights, "night")} × ${yen(room.rate)}`,
            amount: adults * nights * room.rate,
          },
          ...(children > 0
            ? [
                {
                  id: "children",
                  label: `${room.name}, children`,
                  detail: `${plural(children, "child", "children")} × ${plural(nights, "night")} × ${yen(childRate(room.rate))}`,
                  amount: children * nights * childRate(room.rate),
                },
              ]
            : []),
          {
            id: "tax",
            label: "Bathing tax",
            detail: `${plural(adults, "adult")} × ${plural(nights, "night")} × ${yen(BATH_TAX)}`,
            amount: adults * nights * BATH_TAX,
          },
        ]
      : [];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  const chooseRoom = (id: string) => {
    const next = ROOMS.find((r) => r.id === id) ?? ROOMS[0];
    setRoomId(next.id);
    const a = Math.min(adults, next.guests);
    setAdults(a);
    setChildren(Math.min(children, next.guests - a));
    setSent(null);
  };

  const request = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(true);
      document.getElementById(`${uid}-email`)?.querySelector("input")?.focus();
      return;
    }
    if (!range || nights < 1) return;
    setSent(
      `SZ-${String(range.start.month).padStart(2, "0")}${String(range.start.day).padStart(2, "0")}-${room.id === "river" ? "R" : room.id === "garden" ? "G" : "Y"}${adults}${children}`,
    );
  };

  const toBooking = (id?: string) => {
    if (id) chooseRoom(id);
    document.getElementById(`${uid}-book`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div {...props} className={cn("w-full bg-background text-foreground", className)}>
      <section
        aria-labelledby={`${uid}-name`}
        className="relative isolate flex h-[min(92svh,880px)] min-h-[560px] flex-col overflow-clip sm:h-[min(100svh,880px)] sm:min-h-[600px]"
      >
        <Picture
          src={images.hero}
          alt="The Kiritani valley at dusk, snow on the ridges"
          className="absolute inset-0 -z-20 size-full"
        />
        <div aria-hidden="true" className="dark absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_70%,transparent),color-mix(in_oklab,var(--background)_25%,transparent)_45%,transparent_70%)]" />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-[30%] bg-linear-to-t from-background via-background/70 to-transparent"
        />
        <Steam
          aria-hidden="true"
          density={0.62}
          rise={0.8}
          sway={0.4}
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-[9%] bg-linear-to-t from-background to-transparent"
        />

        <div className="dark text-foreground">
          <nav
            aria-label="Shizuku"
            className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-10"
          >
            <a
              href="#"
              className="rounded-md font-display text-xl font-semibold tracking-[-0.03em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Shizuku
            </a>
            <ul className="hidden items-center gap-1 md:flex">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${uid}-${s.id}`}
                    className="inline-flex h-8 items-center rounded-md px-3 text-sm text-foreground/85 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" onPress={() => toBooking()} className="bg-card/50 backdrop-blur-md">
              Book a stay
            </Button>
          </nav>
        </div>

        <div className="dark flex flex-1 flex-col justify-center pb-[20vh] text-foreground sm:pb-[22%]">
          <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
            <h1
              id={`${uid}-name`}
              className="font-display text-[clamp(4.5rem,15vw,11rem)] leading-[0.9] font-semibold tracking-[-0.05em] text-foreground"
            >
              Shizuku
            </h1>
            <p className="mt-5 max-w-[32rem] text-lg leading-7 text-pretty text-foreground/90">
              A hot spring inn of twelve rooms in the Kiritani valley above Otaru, on a spring that has run at 43°C
              since 1911.
            </p>
            <Button size="lg" onPress={() => toBooking()} className="mt-8">
              Check availability
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
        <section id={`${uid}-rooms`} aria-labelledby={`${uid}-rooms-title`} className="scroll-mt-6 pt-16 sm:pt-20">
          <div className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-end">
            <h2
              id={`${uid}-rooms-title`}
              className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl"
            >
              Rooms
            </h2>
            <p className="text-base leading-7 text-pretty text-muted-foreground">
              Every room looks over the river or the forest. Rates are per person, per night, with dinner and breakfast.
            </p>
          </div>
          <ul className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-3">
            {ROOMS.map((r, i) => (
              <li key={r.id} className="group/room flex flex-col">
                <div className="overflow-clip rounded-2xl">
                  <Picture
                    src={images.rooms?.[i]}
                    alt={`The view from the ${r.name.toLowerCase()}`}
                    className="aspect-[4/3] w-full transition-transform md:aspect-[4/5] duration-700 ease-settle group-hover/room:scale-[1.03] motion-reduce:transition-none"
                  />
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <h3 className="text-xl leading-7 font-semibold tracking-[-0.02em]">{r.name}</h3>
                  <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    from <span className="font-semibold text-foreground">{yen(r.rate)}</span>
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">{r.blurb}</p>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-foreground/85 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
                  <li className="flex items-center gap-1.5 tabular-nums">
                    <Ruler aria-hidden="true" />
                    {r.size} m²
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Users aria-hidden="true" />
                    Up to {r.guests}
                  </li>
                  <li className="flex items-center gap-1.5">
                    {r.id === "garden" ? <Bath aria-hidden="true" /> : <BedDouble aria-hidden="true" />}
                    {r.detail}
                  </li>
                </ul>
                <Button variant="secondary" size="sm" onPress={() => toBooking(r.id)} className="mt-5 self-start">
                  Choose this room
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section id={`${uid}-baths`} aria-labelledby={`${uid}-baths-title`} className="scroll-mt-6 pt-24 sm:pt-32">
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <h2
                id={`${uid}-baths-title`}
                className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl"
              >
                The baths
              </h2>
              <p className="mt-5 text-base leading-7 text-pretty text-foreground/85">
                The spring rises ninety metres up the valley and runs through the inn before it goes back to the river.
                It is a soft sodium chloride water, kind to tired legs after a day in the snow.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
                {[
                  ["At the source", "43°C"],
                  ["Flow", "180 L/min"],
                  ["Since", "1911"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[13px] text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-lg leading-6 font-semibold tracking-[-0.01em] tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                <h3 className="text-base font-semibold">Hours, and how busy it is now</h3>
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  {now == null ? "" : `At ${clock(now)}`}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {BATHS.map((b) => {
                  const o = now == null ? null : occupancy(b, now);
                  const share = o ? Math.round((o.people / b.holds) * 100) : 0;
                  const word = !o
                    ? ""
                    : !o.open
                      ? `Closed until ${clock(o.next)}`
                      : share < 34
                        ? "Quiet"
                        : share < 67
                          ? "Some bathers"
                          : "Busy";
                  return (
                    <li key={b.id} className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-lg leading-7 font-semibold tracking-[-0.01em]">
                          {b.name} <span className="text-sm font-normal text-muted-foreground">{b.kind}</span>
                        </p>
                        <p className="mt-1 text-sm text-foreground/85 tabular-nums">Open {hoursText(b)}</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                          {b.temp}°C, room for {b.holds}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4">
                        <div className="sm:text-end">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              o && !o.open ? "text-muted-foreground" : "text-foreground",
                            )}
                          >
                            {word}
                          </p>
                          <p className="text-[13px] text-muted-foreground tabular-nums">
                            {o?.open ? `${o.people} of ${b.holds} bathers` : o ? "Cleaned and refilled" : ""}
                          </p>
                        </div>
                        <TideProgress
                          shape="bar"
                          size={44}
                          value={share}
                          showValue={false}
                          aria-label={b.name}
                          valueLabel={o?.open ? `${o.people} of ${b.holds} bathers` : "Closed"}
                        />
                      </div>
                    </li>
                  );
                })}
                <li className="flex flex-col gap-1 py-6">
                  <p className="text-lg leading-7 font-semibold tracking-[-0.01em]">
                    Shizuku-no-yu{" "}
                    <span className="text-sm font-normal text-muted-foreground">Private, for your party</span>
                  </p>
                  <p className="text-sm text-foreground/85 tabular-nums">
                    Forty-minute turns from 15:00 to 22:20. Book a time at the front desk.
                  </p>
                </li>
              </ul>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Both baths are quietest before breakfast and after 22:00. Towels and yukata are in your room.
              </p>
            </div>
          </div>
          <figure className="relative mt-14 overflow-clip rounded-3xl">
            <Picture
              src={images.bath}
              alt="Kawa-no-yu, the open-air bath by the river, at night"
              className="aspect-[4/3] w-full sm:aspect-[21/8]"
            />
            <figcaption className="dark absolute inset-x-0 bottom-0 bg-linear-to-t from-background/80 to-transparent px-5 pt-16 pb-5 text-sm text-foreground sm:px-8 sm:pb-7">
              <span className="font-semibold">Kawa-no-yu after dark.</span>{" "}
              <span className="text-foreground/85">
                The open-air bath stays open until 23:00, lit by lanterns along the river.
              </span>
            </figcaption>
          </figure>
        </section>

        <section id={`${uid}-dinner`} aria-labelledby={`${uid}-dinner-title`} className="scroll-mt-6 pt-24 sm:pt-32">
          <div className="rounded-3xl border border-border bg-card px-5 py-10 shadow-sm sm:px-10 sm:py-14">
            <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
              <div>
                <h2
                  id={`${uid}-dinner-title`}
                  className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl"
                >
                  Dinner
                </h2>
                <p className="mt-5 text-base leading-7 text-pretty text-foreground/85">
                  The February menu: eight courses from the port and the hills behind it, served in your room at 18:00
                  or 19:30.
                </p>
                <p className="mt-4 text-[13px] leading-5 text-pretty text-muted-foreground">
                  Tell us about allergies when you book. The kitchen can cook without fish, meat or wheat with a
                  day&rsquo;s notice.
                </p>
              </div>
              <ol className="gap-x-12 sm:columns-2">
                {MENU.map((m) => (
                  <li key={m.course} className="break-inside-avoid border-t border-border py-4">
                    <p className="text-[13px] text-muted-foreground">{m.course}</p>
                    <p className="mt-0.5 text-base leading-6 text-pretty text-foreground">{m.dish}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          id={`${uid}-getting-here`}
          aria-labelledby={`${uid}-getting-title`}
          className="scroll-mt-6 pt-24 sm:pt-32"
        >
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div className="order-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:order-1">
              <LineMap />
            </div>
            <div className="order-1 lg:order-2">
              <h2
                id={`${uid}-getting-title`}
                className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl"
              >
                Getting here
              </h2>
              <dl className="mt-6 flex flex-col divide-y divide-border border-y border-border">
                {[
                  ["From Sapporo", "Rapid train on the Shiokaze Line to Asari, 28 minutes, ¥650."],
                  ["From Otaru", "Any train to Asari, 7 or 8 minutes, ¥260."],
                  [
                    "From Asari",
                    "Our shuttle waits at the south exit at 15:00, 16:00 and 17:00 and takes 12 minutes up the valley. At other times, ring us from the station.",
                  ],
                  [
                    "By car",
                    "Park at the inn. The last two kilometres are steep, so bring winter tyres from November to April.",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-sm font-medium">{k}</dt>
                    <dd className="text-sm leading-6 text-pretty text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id={`${uid}-book`} aria-labelledby={`${uid}-book-title`} className="scroll-mt-6 pt-24 pb-8 sm:pt-32">
          <div className="mb-8 max-w-[40rem]">
            <h2
              id={`${uid}-book-title`}
              className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl"
            >
              Check availability
            </h2>
            <p className="mt-3 text-base leading-7 text-pretty text-muted-foreground">
              Choose your nights, a room and who is coming. Nothing is charged now; you pay at the inn when you leave.
            </p>
          </div>
          <div className="@container overflow-clip rounded-2xl border border-border bg-card shadow-md">
            <div className="grid @min-[56rem]:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="@container/main min-w-0 p-5 sm:p-7">
                <div className="grid gap-x-10 gap-y-8 @min-[42rem]/main:grid-cols-[auto_minmax(0,1fr)]">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">Nights</p>
                    <Suspense fallback={<CalendarSpace month={OPEN_FROM} className="-ms-1.5 self-start" />}>
                      <RangeCalendar
                        aria-label="Nights at Shizuku"
                        value={range}
                        onChange={(r) => {
                          setRange(
                            r ? { start: parseDate(r.start.toString()), end: parseDate(r.end.toString()) } : null,
                          );
                          setSent(null);
                        }}
                        minValue={OPEN_FROM}
                        maxValue={OPEN_TO}
                        defaultFocusedValue={OPEN_FROM}
                        isDateUnavailable={(d) => FULL.has(d.toString())}
                        className="-ms-1.5 self-start"
                      />
                    </Suspense>
                    <p className="max-w-[16rem] text-[13px] leading-5 text-muted-foreground">
                      Nights struck through are full. Check in from 15:00, leave by 10:00.
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col gap-8">
                    <RadioGroup label="Room" value={roomId} onChange={chooseRoom}>
                      <div className="grid gap-2.5">
                        {ROOMS.map((r) => (
                          <RadioCard
                            key={r.id}
                            value={r.id}
                            description={`Up to ${r.guests} guests, ${r.size} m²`}
                            trailing={yen(r.rate)}
                          >
                            {r.name}
                          </RadioCard>
                        ))}
                      </div>
                    </RadioGroup>
                    <div className="grid gap-4 @min-[26rem]/main:grid-cols-2">
                      <NumberField
                        label="Adults"
                        minValue={1}
                        maxValue={room.guests}
                        value={adults}
                        onChange={(v) => {
                          const a = Number.isNaN(v) ? 1 : Math.min(room.guests, Math.max(1, v));
                          setAdults(a);
                          setChildren((c) => Math.min(c, room.guests - a));
                          setSent(null);
                        }}
                      />
                      <NumberField
                        label="Children, 4 to 11"
                        minValue={0}
                        maxValue={room.guests - adults}
                        value={children}
                        onChange={(v) => {
                          setChildren(Number.isNaN(v) ? 0 : Math.min(room.guests - adults, Math.max(0, v)));
                          setSent(null);
                        }}
                      />
                    </div>
                    <p className="-mt-5 text-[13px] leading-5 text-muted-foreground">
                      The {room.name.toLowerCase()} sleeps {room.guests}. Children pay {yen(childRate(room.rate))} a
                      night.
                    </p>
                  </div>
                </div>
              </div>

              <aside
                aria-label="Your stay"
                className="flex flex-col gap-4 border-t border-border bg-muted p-5 sm:p-7 @min-[56rem]:border-s @min-[56rem]:border-t-0"
              >
                <div className="flex items-center gap-3">
                  <Picture src={images.rooms?.[ROOMS.indexOf(room)]} alt="" className="size-14 shrink-0 rounded-lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{room.name}</p>
                    <p className="text-[13px] text-muted-foreground">With dinner and breakfast</p>
                  </div>
                </div>
                <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Dates</dt>
                    <dd className="text-end tabular-nums">
                      {range && nights > 0 ? (
                        <>
                          {short(range.start)} to {short(range.end)}
                          <span className="block text-[13px] text-muted-foreground">{plural(nights, "night")}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not chosen</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Guests</dt>
                    <dd className="text-end">
                      {plural(adults, "adult")}
                      {children > 0 ? `, ${plural(children, "child", "children")}` : ""}
                    </dd>
                  </div>
                </dl>
                <ul className="border-t border-border pt-2.5">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.id}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.12 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                          <div className="min-w-0">
                            <p>{l.label}</p>
                            <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">{l.detail}</p>
                          </div>
                          <p className="shrink-0 tabular-nums">{yen(l.amount)}</p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {lines.length === 0 && (
                    <li className="py-1.5 text-[13px] text-muted-foreground">Choose your nights to see the price.</li>
                  )}
                </ul>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-2xl leading-8 font-semibold tracking-[-0.01em] tabular-nums">{yen(total)}</span>
                </div>
                <p className="-mt-2 text-[13px] text-muted-foreground">Tax included. Pay at the inn by card or cash.</p>
                <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
                  {sent ? (
                    <div
                      role="status"
                      className="flex flex-col gap-1.5 rounded-xl bg-success-soft p-4 text-success-strong"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Check aria-hidden="true" className="size-4 shrink-0" />
                        Request sent
                      </p>
                      <p className="text-[13px] leading-5 tabular-nums">Reference {sent}</p>
                      <p className="text-[13px] leading-5">
                        We are holding the {room.name.toLowerCase()} for you. The front desk will confirm to{" "}
                        {email.trim()} within a day.
                      </p>
                    </div>
                  ) : (
                    <>
                      <TextField
                        id={`${uid}-email`}
                        label="Email"
                        type="email"
                        autoComplete="email"
                        placeholder="So we can confirm"
                        value={email}
                        onChange={(v) => {
                          setEmail(v);
                          if (emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) setEmailError(false);
                        }}
                        isInvalid={emailError}
                        errorMessage="Enter an email address so we can confirm your stay."
                        validationBehavior="aria"
                      />
                      <Button onPress={request} isDisabled={nights < 1} className="w-full">
                        Request {nights > 0 ? plural(nights, "night") : "these nights"}
                      </Button>
                    </>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <FooterWaterline
        word="Shizuku"
        links={[
          ...SECTIONS.map((s) => ({ label: s.label, href: `#${uid}-${s.id}` })),
          { label: "Book a stay", href: `#${uid}-book` },
        ]}
        className="mt-16"
      >
        <p>Shizuku, 2-7 Kiritani, Otaru, Hokkaido 047-0151. Telephone 0134-62-0418.</p>
        <p>Check-in from 15:00, check-out by 10:00. The shuttle meets trains at Asari station.</p>
      </FooterWaterline>
    </div>
  );
}
