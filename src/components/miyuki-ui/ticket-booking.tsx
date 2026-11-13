"use client";

import { CalendarDate, type DateValue } from "@internationalized/date";
import { ArrowRight, CreditCard, LockKeyhole } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Form } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { DatePicker } from "@/components/miyuki-ui/date-picker";
import { GateTransition } from "@/components/miyuki-ui/gate-transition";
import { TextField } from "@/components/miyuki-ui/input";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { NumberField } from "@/components/miyuki-ui/number-field";
import { Radio, RadioGroup } from "@/components/miyuki-ui/radio";
import { RoutePicker, type RouteStation, type RouteValue } from "@/components/miyuki-ui/route-picker";
import { SeatMap, type SeatMapCar } from "@/components/miyuki-ui/seat-map";
import { SteppingStones } from "@/components/miyuki-ui/stepping-stones";
import { TicketStub } from "@/components/miyuki-ui/ticket-stub";
import { type Departure as PickerDeparture, TimetablePicker } from "@/components/miyuki-ui/timetable-picker";
import { cn } from "@/lib/utils";

type Kind = "local" | "rapid" | "express";
type Dir = "east" | "west";
type DayType = "weekday" | "weekend";
type Part = "morning" | "afternoon" | "evening";

interface Station {
  id: string;
  name: string;
  km: number;
  at: Record<Kind, number | null>;
}

interface Service {
  no: number;
  kind: Kind;
  dir: Dir;
  start: number;
  end: number;
}

interface Train {
  service: Service;
  depart: number;
  arrive: number;
  time: string;
  platform: string;
}

const STATIONS: Station[] = [
  { id: "otaru", name: "Otaru", km: 0, at: { local: 0, rapid: 0, express: 0 } },
  { id: "chikko", name: "Otaru-Chikkō", km: 2.0, at: { local: 3, rapid: 3, express: 3 } },
  { id: "asari", name: "Asari", km: 5.8, at: { local: 8, rapid: 7, express: null } },
  { id: "zenibako", name: "Zenibako", km: 13.6, at: { local: 17, rapid: 15, express: null } },
  { id: "hoshimi", name: "Hoshimi", km: 15.6, at: { local: 20, rapid: null, express: null } },
  { id: "inazumi", name: "Inazumi-Kōen", km: 19.3, at: { local: 24, rapid: null, express: null } },
  { id: "teine", name: "Teine", km: 21.6, at: { local: 27, rapid: 23, express: 20 } },
  { id: "kotoni", name: "Kotoni", km: 30.5, at: { local: 38, rapid: 31, express: null } },
  { id: "sapporo", name: "Sapporo", km: 33.8, at: { local: 43, rapid: 35, express: 30 } },
];

const ROUTE_STATIONS: RouteStation[] = STATIONS.map((s) => ({
  id: s.id,
  name: s.name,
  km: s.km,
  min: s.at.local ?? 0,
}));
const LAST = STATIONS.length - 1;
const TEINE = 6;
const KIND_NAME: Record<Kind, string> = { local: "Local", rapid: "Rapid", express: "Liner" };
const LETTER: Record<string, Kind> = { L: "local", R: "rapid", X: "express" };
const NUMBER_BASE: Record<Kind, number> = { local: 2400, rapid: 3700, express: 5000 };

const every = (from: number, to: number, pattern: string) =>
  Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, pattern]));

const PLAN: Record<DayType, Record<Dir, Record<number, string>>> = {
  weekday: {
    east: {
      5: "L32 L51",
      6: "L05 R18 L29 X41 L53",
      7: "R02 L12 X21 L29 R38 L44 X58",
      8: "L05 R15 L26 X34 L46 R55",
      9: "L02 X17 L28 R39 L51",
      ...every(10, 14, "L06 R19 L36 R49"),
      15: "L06 R19 L32 R44 L55",
      16: "R07 L18 X29 L38 R49 L58",
      17: "R08 L17 X26 L35 R44 L53",
      18: "R04 L14 X25 L36 R47 L58",
      19: "R11 L24 R39 L53",
      20: "R10 L28 R46",
      21: "L04 R22 L41",
      22: "R02 L26 L52",
      23: "L10",
    },
    west: {
      5: "L45",
      6: "L08 L26 R40 L52",
      7: "L06 R17 L28 R43 L54",
      8: "L09 R22 L35 R48 L58",
      9: "R11 L24 R37 L52",
      ...every(10, 14, "L05 R21 L35 R51"),
      15: "L05 R21 L33 R46 L57",
      16: "R08 L18 X27 L36 R45 L54",
      17: "L03t X12 L16 R26 L33t X41 L49 R58",
      18: "L07t X15 L22 R31 L40t X48 L57",
      19: "R06 L16 X25 L35 R47",
      20: "L02 R18 L36 R53",
      21: "L12 R31 L52",
      22: "R14 L35",
      23: "L12",
    },
  },
  weekend: {
    east: { 5: "L41", ...every(6, 21, "L12 R27 L42 R57"), 22: "L12 R33 L52", 23: "L10" },
    west: { 5: "L58", ...every(6, 21, "L03 R18 L33 R48"), 22: "L10 R30 L50", 23: "L12" },
  },
};

function buildServices(day: DayType): Service[] {
  const out: Service[] = [];
  for (const dir of ["east", "west"] as const) {
    const count: Record<Kind, number> = { local: 0, rapid: 0, express: 0 };
    const hours = Object.keys(PLAN[day][dir])
      .map(Number)
      .sort((a, b) => a - b);
    for (const hour of hours) {
      for (const token of PLAN[day][dir][hour].split(" ")) {
        const kind = LETTER[token[0]];
        const no = NUMBER_BASE[kind] + (day === "weekend" ? 100 : 0) + (dir === "east" ? 1 : 2) + 2 * count[kind]++;
        const end = dir === "east" ? LAST : token.endsWith("t") ? TEINE : 0;
        out.push({ no, kind, dir, start: hour * 60 + Number(token.slice(1, 3)), end });
      }
    }
  }
  return out;
}

const SERVICES: Record<DayType, Service[]> = { weekday: buildServices("weekday"), weekend: buildServices("weekend") };

function timeAt(service: Service, index: number): number | null {
  const offset = STATIONS[index].at[service.kind];
  if (offset == null) return null;
  if (service.dir === "east") return index > service.end ? null : service.start + offset;
  if (index < service.end) return null;
  return service.start + (STATIONS[LAST].at[service.kind] ?? 0) - offset;
}

function platform(service: Service, index: number) {
  if (index === 0) return service.kind === "local" ? "2" : "1";
  if (index === LAST) return service.kind === "local" ? "6" : "5";
  return service.dir === "east" ? "1" : "2";
}

function trainsFor(from: number, to: number, day: DayType): Train[] {
  const dir: Dir = to > from ? "east" : "west";
  const out: Train[] = [];
  for (const service of SERVICES[day]) {
    if (service.dir !== dir || service.end === from) continue;
    const depart = timeAt(service, from);
    const arrive = timeAt(service, to);
    if (depart == null || arrive == null) continue;
    out.push({ service, depart, arrive, time: clock(depart), platform: platform(service, from) });
  }
  return out.sort((a, b) => a.depart - b.depart);
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (minute: number) => `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`;
const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;

const FARE_STEPS: [number, number][] = [
  [3, 210],
  [6, 260],
  [10, 300],
  [15, 380],
  [20, 470],
  [25, 560],
  [30, 650],
  [35, 750],
];

function fare(km: number) {
  for (const [limit, price] of FARE_STEPS) if (km <= limit) return price;
  return 840;
}

const HOLIDAYS = new Set(["2027-02-11", "2027-02-23"]);
const TOMORROW = new CalendarDate(2027, 2, 13);
const LAST_DAY = new CalendarDate(2027, 3, 12);

const utc = (d: { year: number; month: number; day: number }) => new Date(Date.UTC(d.year, d.month - 1, d.day));

function dayTypeOf(date: CalendarDate): DayType {
  const weekday = utc(date).getUTCDay();
  return weekday === 0 || weekday === 6 || HOLIDAYS.has(date.toString()) ? "weekend" : "weekday";
}

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

interface CarDef {
  id: string;
  rows: number;
  layout: string;
  name?: string;
  supplement: number;
  busy: number;
}

const CARS: CarDef[] = [
  { id: "1", rows: 13, layout: "AB CD", supplement: 530, busy: 0.42 },
  { id: "2", rows: 13, layout: "AB CD", supplement: 530, busy: 0.38 },
  { id: "3", rows: 11, layout: "AB CD", name: "Quiet car", supplement: 530, busy: 0.3 },
  { id: "4", rows: 9, layout: "A BC", name: "Sea view", supplement: 980, busy: 0.5 },
];

function carsFor(train: Train, date: CalendarDate, fareEach: number): SeatMapCar[] {
  const hour = Math.floor(train.depart / 60);
  const peak = dayTypeOf(date) === "weekday" && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19));
  return CARS.map((car) => {
    const rng = createRng(`${date.toString()}-${train.service.no}-${car.id}`);
    const letters = car.layout.replace(/\s+/g, "").split("");
    const busy = Math.min(0.8, car.busy + (peak ? 0.22 : 0));
    const taken: string[] = [];
    for (let r = 1; r <= car.rows; r++) for (const l of letters) if (rng() < busy) taken.push(`${r}${l}`);
    return { id: car.id, rows: car.rows, layout: car.layout, name: car.name, taken, price: fareEach + car.supplement };
  });
}

function seatParts(key: string) {
  const dash = key.lastIndexOf("-");
  return { car: key.slice(0, dash), code: key.slice(dash + 1) };
}

function luhn(number: string) {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

interface Payment {
  name: string;
  email: string;
  card: string;
  expiry: string;
  cvc: string;
}

type Field = keyof Payment;
const FIELDS: Field[] = ["name", "card", "expiry", "cvc", "email"];

function paymentErrors(p: Payment): Record<Field, string> {
  const card = p.card.replace(/\D/g, "");
  const [mm, yy] = p.expiry.split("/").map((v) => Number(v));
  let expiry = "";
  if (!/^\d{2}\/\d{2}$/.test(p.expiry)) expiry = "Enter the expiry date as MM/YY.";
  else if (mm < 1 || mm > 12) expiry = "The month must be between 01 and 12.";
  else if ((2000 + yy) * 12 + mm < 2027 * 12 + 2) expiry = "This card has expired. Use another card.";
  return {
    name: p.name.trim() ? "" : "Enter the name as it appears on the card.",
    email: !p.email.trim()
      ? "Enter an email address for your ticket."
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())
        ? ""
        : "Check the email address. It needs an @ and a domain.",
    card: !card
      ? "Enter the card number."
      : card.length !== 16
        ? "Enter all 16 digits of the card number."
        : luhn(card)
          ? ""
          : "This card number is not valid. Check for a mistyped digit.",
    expiry,
    cvc: /^\d{3}$/.test(p.cvc) ? "" : "Enter the 3 digits on the back of the card.",
  };
}

const formatCard = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

function formatExpiry(v: string, previous: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 2) return d;
  if (d.length === 2 && previous.length === 3 && v.length === 2) return d.slice(0, 1);
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

const STEPS = [
  { id: "route", label: "Route" },
  { id: "time", label: "Time" },
  { id: "seats", label: "Seats" },
  { id: "pay", label: "Pay" },
];

const PARTS: { id: Part; label: string; from: number; to: number }[] = [
  { id: "morning", label: "Morning", from: 0, to: 11 * 60 },
  { id: "afternoon", label: "Afternoon", from: 11 * 60, to: 17 * 60 },
  { id: "evening", label: "Evening", from: 17 * 60, to: 24 * 60 },
];

const partOf = (minute: number): Part => PARTS.find((p) => minute >= p.from && minute < p.to)?.id ?? "morning";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SPELLED = ["no", "one", "two", "three", "four"];

interface Line {
  id: string;
  label: string;
  detail: string;
  amount: number;
}

interface Issued {
  reference: string;
  from: string;
  to: string;
  date: CalendarDate;
  train: Train;
  seats: string[];
  car: string;
  passengers: number;
  total: number;
  last4: string;
  email: string;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{term}</dt>
      <dd className="min-w-0 text-end text-sm text-foreground">{children}</dd>
    </div>
  );
}

function LineMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={cn("size-9 shrink-0", className)}>
      <circle cx={20} cy={20} r={18} className="fill-brand" />
      <circle cx={20} cy={20} r={12.5} className="fill-card" />
      <path
        d="M11.5 22.2c2.1-2.2 4.1-2.2 6.2 0s4.1 2.2 6.2 0 4.1-2.2 6.2 0"
        fill="none"
        strokeWidth={2.4}
        strokeLinecap="round"
        className="stroke-brand"
      />
      <path
        d="M13.5 17.4c1.7-1.6 3.4-1.6 5.1 0s3.4 1.6 5.1 0"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-brand/55"
      />
    </svg>
  );
}

export interface TicketBookingProps extends ComponentProps<"div"> {
  defaultRoute?: [string, string];
  defaultPassengers?: number;
}

export function TicketBooking({
  defaultRoute = ["otaru", "sapporo"],
  defaultPassengers = 2,
  className,
  ...props
}: TicketBookingProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [step, setStep] = useState(0);
  const [route, setRoute] = useState<RouteValue | null>(defaultRoute);
  const [passengers, setPassengers] = useState(Math.min(4, Math.max(1, defaultPassengers)));
  const [date, setDate] = useState<CalendarDate>(TOMORROW);
  const [part, setPart] = useState<Part>("morning");
  const [time, setTime] = useState<string | null>(null);
  const [car, setCar] = useState("3");
  const [seats, setSeats] = useState<string[]>([]);
  const [payment, setPayment] = useState<Payment>({ name: "", email: "", card: "", expiry: "", cvc: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [moved, setMoved] = useState(false);
  const [torn, setTorn] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef(0);

  const view = issued ? "ticket" : "booking";
  const lastView = useRef(view);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!moved) return;
    const swapped = lastView.current !== view;
    lastView.current = view;
    const id = window.setTimeout(() => headingRef.current?.focus(), swapped ? 650 : 0);
    return () => window.clearTimeout(id);
  }, [step, view, moved]);

  const fromI = route ? STATIONS.findIndex((s) => s.id === route[0]) : -1;
  const toI = route ? STATIONS.findIndex((s) => s.id === route[1]) : -1;
  const hasRoute = fromI >= 0 && toI >= 0 && fromI !== toI;
  const from = hasRoute ? STATIONS[fromI] : null;
  const to = hasRoute ? STATIONS[toI] : null;
  const km = from && to ? Math.abs(to.km - from.km) : 0;
  const fareEach = hasRoute ? fare(km) : 0;
  const day = dayTypeOf(date);
  const trains = hasRoute ? trainsFor(fromI, toI, day) : [];
  const train = trains.find((t) => t.time === time) ?? null;
  const shown = trains.filter((t) => partOf(t.depart) === part);
  const pickerDepartures: PickerDeparture[] = shown.map((t) => ({
    time: t.time,
    kind: t.service.kind,
    arrives: clock(t.arrive),
    to: STATIONS[t.service.end].name,
    platform: t.platform,
  }));
  const cars = train ? carsFor(train, date, fareEach) : [];
  const towards = to && from ? (toI > fromI ? "Sapporo" : "Otaru") : "";

  const seatLines: Line[] = CARS.flatMap((c) => {
    const here = seats.filter((k) => seatParts(k).car === c.id).map((k) => seatParts(k).code);
    if (here.length === 0) return [];
    return [
      {
        id: `car-${c.id}`,
        label: `${c.name ?? "Reserved"} seat${here.length > 1 ? "s" : ""}, car ${c.id}`,
        detail: `${here.join(", ")} · ${here.length} × ${yen(c.supplement)}`,
        amount: here.length * c.supplement,
      },
    ];
  });
  const lines: Line[] = hasRoute
    ? [
        {
          id: "fare",
          label: "Fare",
          detail: `${plural(passengers, "adult")} × ${yen(fareEach)}`,
          amount: passengers * fareEach,
        },
        ...seatLines,
      ]
    : [];
  const complete = hasRoute && train != null && seats.length === passengers;
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const errors = paymentErrors(payment);
  const show = (f: Field) => (submitted || touched[f]) && errors[f] !== "";

  const ready = [hasRoute, train != null, seats.length === passengers, true][step];
  const remaining = passengers - seats.length;
  const hint = [
    hasRoute ? `${from?.name} to ${to?.name}, ${plural(passengers, "passenger")}` : "Choose where you get on and off.",
    train ? `${train.time} ${KIND_NAME[train.service.kind]} chosen` : "Choose a train to continue.",
    remaining > 0
      ? `Choose ${remaining} more seat${remaining > 1 ? "s" : ""}.`
      : remaining < 0
        ? "Remove a seat to continue."
        : "All seats chosen.",
    "",
  ][step];

  function go(next: number) {
    setMoved(true);
    setStep(next);
  }

  function changeRoute(next: RouteValue) {
    if (route && next[0] === route[0] && next[1] === route[1]) return;
    setRoute(next);
    setTime(null);
    setSeats([]);
  }

  function changeDate(next: DateValue | null) {
    if (!next) return;
    const d = new CalendarDate(next.year, next.month, next.day);
    setDate(d);
    setSeats([]);
    if (time && !(hasRoute && trainsFor(fromI, toI, dayTypeOf(d)).some((t) => t.time === time))) setTime(null);
  }

  function changePassengers(n: number) {
    const value = Number.isNaN(n) ? 1 : Math.min(4, Math.max(1, n));
    setPassengers(value);
    if (seats.length > value) setSeats(seats.slice(0, value));
  }

  function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`input[name="${first}"]`)?.focus();
      return;
    }
    if (!train || !from || !to) return;
    setPaying(true);
    timer.current = window.setTimeout(() => {
      const cardDigits = payment.card.replace(/\D/g, "");
      const firstSeat = seatParts(seats[0]);
      setTorn(false);
      setIssued({
        reference: `NR${pad(date.month)}${pad(date.day)}-${train.service.no}-${firstSeat.code}`,
        from: from.name,
        to: to.name,
        date,
        train,
        seats: seats.map((k) => seatParts(k).code),
        car: [...new Set(seats.map((k) => seatParts(k).car))].join(" and "),
        passengers,
        total,
        last4: cardDigits.slice(-4),
        email: payment.email.trim(),
      });
      setPaying(false);
      setMoved(true);
    }, 1100);
  }

  function restart() {
    setIssued(null);
    setStep(0);
    setRoute(defaultRoute);
    setPassengers(Math.min(4, Math.max(1, defaultPassengers)));
    setDate(TOMORROW);
    setPart("morning");
    setTime(null);
    setCar("3");
    setSeats([]);
    setPayment({ name: "", email: "", card: "", expiry: "", cvc: "" });
    setTouched({});
    setSubmitted(false);
    setMoved(true);
  }

  const headings = ["Where are you going?", "When are you travelling?", "Choose your seats", "Pay for your seats"];
  const leads = [
    "Choose the station where you get on, then the one where you get off. Up to four people can travel on one booking.",
    "Choose a date, then a train. Liner trains run on weekdays only and stop at fewer stations.",
    `Choose ${SPELLED[passengers]} seat${passengers > 1 ? "s" : ""}, one for each passenger. Seats in car 4 face the sea through wide windows and cost ${yen(CARS[3].supplement - CARS[0].supplement)} more.`,
    "Your card is charged once, when you press Pay. We email the ticket to you straight away.",
  ];

  const field = (name: Field, label: string, extra: Partial<ComponentProps<typeof TextField>> = {}) => (
    <TextField
      name={name}
      label={label}
      value={payment[name]}
      onChange={(v) =>
        setPayment((p) => ({
          ...p,
          [name]:
            name === "card"
              ? formatCard(v)
              : name === "expiry"
                ? formatExpiry(v, p.expiry)
                : name === "cvc"
                  ? v.replace(/\D/g, "").slice(0, 3)
                  : v,
        }))
      }
      onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
      isRequired
      isInvalid={show(name)}
      errorMessage={errors[name]}
      validationBehavior="aria"
      {...extra}
    />
  );

  const summary = (
    <aside aria-labelledby={`${uid}-summary`} className="lg:sticky lg:top-6">
      <div className="overflow-clip rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/60 px-5 pt-5 pb-4">
          <h2 id={`${uid}-summary`} className="text-[13px] font-medium text-muted-foreground">
            Your journey
          </h2>
          {from && to ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-display text-2xl leading-tight font-semibold tracking-[-0.03em] text-foreground">
              {from.name}
              <ArrowRight aria-label="to" className="size-5 text-muted-foreground" />
              {to.name}
            </p>
          ) : (
            <p className="mt-1.5 text-lg leading-7 font-semibold text-muted-foreground">No route yet</p>
          )}
          {from && to && (
            <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
              {km.toFixed(1)} km on the Shiokaze Line
            </p>
          )}
        </div>
        <dl className="divide-y divide-border px-5 py-1">
          <Row term="Date">{longDate.format(utc(date))}</Row>
          <Row term="Train">
            {train ? (
              <span className="tabular-nums">
                {train.time} {KIND_NAME[train.service.kind]} {train.service.no}
                <span className="block text-[13px] text-muted-foreground">
                  Arrives {clock(train.arrive)}, platform {train.platform}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Not chosen</span>
            )}
          </Row>
          <Row term="Passengers">{plural(passengers, "adult")}</Row>
          <Row term="Seats">
            {seats.length ? (
              <span className="tabular-nums">
                {CARS.filter((c) => seats.some((k) => seatParts(k).car === c.id))
                  .map(
                    (c) =>
                      `Car ${c.id}: ${seats
                        .filter((k) => seatParts(k).car === c.id)
                        .map((k) => seatParts(k).code)
                        .join(", ")}`,
                  )
                  .join("; ")}
              </span>
            ) : (
              <span className="text-muted-foreground">Not chosen</span>
            )}
          </Row>
        </dl>
        <div className="border-t border-border px-5 pt-3 pb-5">
          {lines.length === 0 ? (
            <p className="py-2 text-[13px] text-muted-foreground">Prices appear once you choose a route.</p>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <motion.li
                    key={line.id}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.12 } }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                      <div className="min-w-0">
                        <p className="text-foreground">{line.label}</p>
                        <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">{line.detail}</p>
                      </div>
                      <p className="shrink-0 text-foreground tabular-nums">{yen(line.amount)}</p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground">Total</span>
            {complete ? (
              <span className="text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                {yen(total)}
              </span>
            ) : (
              <span className="text-[13px] text-muted-foreground">After you choose seats</span>
            )}
          </div>
          <p className="mt-3 text-[13px] leading-5 text-pretty text-muted-foreground">
            Change your train for free until it leaves. Refunds up to 30 minutes before departure, less a ¥220 fee.
          </p>
        </div>
        <p aria-live="polite" className="sr-only">
          {complete ? `Total ${yen(total)}` : ""}
        </p>
      </div>
    </aside>
  );

  const panel = (
    <section aria-labelledby={`${uid}-step`} className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
      <div className="px-5 pt-6 sm:px-7 lg:px-6 xl:px-7 sm:pt-7">
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2
          id={`${uid}-step`}
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-xl leading-7 font-semibold tracking-[-0.02em] text-foreground outline-none"
        >
          {headings[step]}
        </h2>
        <p className="mt-1 max-w-[38rem] text-sm leading-6 text-pretty text-muted-foreground">{leads[step]}</p>
      </div>
      <motion.div
        key={step}
        initial={moved ? (reduce ? { opacity: 0 } : { opacity: 0, x: 8 }) : false}
        animate={{ opacity: 1, x: 0 }}
        transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
        className="px-5 pt-7 pb-7 sm:px-7 lg:px-6 xl:px-7"
      >
        {step === 0 && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <RoutePicker
                label="Shiokaze Line, Otaru to Sapporo"
                stations={ROUTE_STATIONS}
                value={route}
                onChange={changeRoute}
                fare={fare}
              />
              <p className="text-[13px] text-muted-foreground">
                Times are for local trains. Rapid and Liner trains are quicker; you choose one next.
              </p>
            </div>
            <NumberField
              label="Passengers"
              description="Adults. Book seats for children at any ticket office."
              minValue={1}
              maxValue={4}
              value={passengers}
              onChange={changePassengers}
              className="max-w-[20rem]"
            />
          </div>
        )}
        {step === 1 && from && to && (
          <div className="@container">
            <div className="grid gap-x-8 gap-y-6 @min-[50rem]:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="flex flex-col gap-6">
                <Suspense fallback={<div aria-hidden="true" className="h-[88px] w-full max-w-[13rem]" />}>
                  <DatePicker
                    label="Date"
                    value={date}
                    onChange={changeDate}
                    minValue={TOMORROW}
                    maxValue={LAST_DAY}
                    description={day === "weekday" ? "Weekday timetable" : "Weekend and holiday timetable"}
                    className="w-full max-w-[13rem]"
                  />
                </Suspense>
                <RadioGroup label="Time of day" value={part} onChange={(v) => setPart(v as Part)}>
                  {PARTS.map((p) => {
                    const list = trains.filter((t) => partOf(t.depart) === p.id);
                    return (
                      <Radio
                        key={p.id}
                        value={p.id}
                        description={
                          list.length
                            ? `${list[0].time} to ${list[list.length - 1].time}, ${plural(list.length, "train")}`
                            : "No trains"
                        }
                      >
                        {p.label}
                      </Radio>
                    );
                  })}
                </RadioGroup>
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <TimetablePicker
                  label={`${from.name} to ${to.name}`}
                  description={`${longDate.format(utc(date))}, ${PARTS.find((p) => p.id === part)?.label.toLowerCase()}`}
                  from={from.name}
                  to={to.name}
                  departures={pickerDepartures}
                  value={time}
                  onChange={(t) => {
                    if (t !== time) setSeats([]);
                    setTime(t);
                  }}
                  kindLabels={{ express: "Liner" }}
                  className="max-w-none"
                />
                {train && partOf(train.depart) !== part && (
                  <p className="text-[13px] text-muted-foreground">
                    Your train, the {train.time} {KIND_NAME[train.service.kind].toLowerCase()}, leaves in the{" "}
                    {partOf(train.depart)}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {step === 2 && train && (
          <SeatMap
            label={`${KIND_NAME[train.service.kind]} ${train.service.no}, ${from?.name} ${train.time} to ${to?.name} ${clock(train.arrive)}`}
            towards={towards}
            cars={cars}
            car={car}
            onCarChange={setCar}
            value={seats}
            onChange={setSeats}
            max={passengers}
          />
        )}
        {step === 3 && (
          <Form
            ref={formRef}
            onSubmit={pay}
            validationBehavior="aria"
            className="flex max-w-[34rem] flex-col gap-5"
            id={`${uid}-pay`}
          >
            {field("name", "Name on card", { autoComplete: "cc-name", placeholder: "As printed on the card" })}
            {field("card", "Card number", {
              autoComplete: "cc-number",
              inputMode: "numeric",
              placeholder: "1234 5678 9012 3456",
              iconStart: <CreditCard />,
            })}
            <div className="grid grid-cols-2 gap-4">
              {field("expiry", "Expiry", { autoComplete: "cc-exp", inputMode: "numeric", placeholder: "MM/YY" })}
              {field("cvc", "Security code", { autoComplete: "cc-csc", inputMode: "numeric", placeholder: "3 digits" })}
            </div>
            {field("email", "Email for your ticket", {
              autoComplete: "email",
              type: "email",
              placeholder: "name@example.com",
            })}
            <div className="rounded-xl bg-muted/70 p-4 lg:hidden">
              <p className="text-[13px] font-medium text-muted-foreground">You are paying for</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {lines.map((line) => (
                  <li key={line.id} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0">
                      {line.label} <span className="text-[13px] text-muted-foreground tabular-nums">{line.detail}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{yen(line.amount)}</span>
                  </li>
                ))}
                <li className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{yen(total)}</span>
                </li>
              </ul>
            </div>
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
              Card details go straight to the bank and are never stored by us.
            </p>
          </Form>
        )}
      </motion.div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7 lg:px-6 xl:px-7">
        {step > 0 ? (
          <Button variant="secondary" onPress={() => go(step - 1)} isDisabled={paying}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="ms-auto flex min-w-0 items-center gap-4">
          {hint ? <span className="hidden text-[13px] text-muted-foreground sm:inline">{hint}</span> : null}
          {step < 3 ? (
            <Button onPress={() => go(step + 1)} isDisabled={!ready}>
              Continue
            </Button>
          ) : (
            <Button type="submit" form={`${uid}-pay`} isPending={paying}>
              Pay {yen(total)}
            </Button>
          )}
        </div>
      </div>
    </section>
  );

  const ticket = issued ? (
    <div className="mx-auto flex w-full max-w-[52rem] flex-col items-center gap-8 pt-2">
      <div className="max-w-[36rem] text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance text-foreground outline-none sm:text-4xl"
        >
          Your seats are reserved
        </h1>
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          We have sent this ticket to {issued.email}. Show it at the gate at {issued.from}, where the stub is torn off
          as you go through.
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-5 rounded-3xl bg-muted/70 px-3 py-10 ring-1 ring-border ring-inset sm:px-8 sm:py-14">
        <TicketStub
          aria-label={`Rail ticket, ${issued.from} to ${issued.to}`}
          className="w-[620px]"
          tearLabel="Tear off the stub"
          onTear={() => setTorn(true)}
          stub={
            <div className="flex flex-col items-center gap-3">
              <span className="rotate-180 text-xs font-medium whitespace-nowrap opacity-80 [writing-mode:vertical-rl]">
                Admit {SPELLED[issued.passengers]}
              </span>
              <span className="flex flex-col items-center font-display text-lg leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                {issued.seats.map((seat) => (
                  <span key={seat}>{seat}</span>
                ))}
              </span>
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium">
                {KIND_NAME[issued.train.service.kind]} {issued.train.service.no}
                <span className="max-sm:hidden">, Shiokaze Line</span>
              </span>
              <span className="shrink-0 tabular-nums opacity-80">No. {issued.reference}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl leading-none font-semibold tracking-[-0.03em] text-balance sm:text-[32px]">
                  {issued.from}
                </p>
                <p className="mt-2 text-sm tabular-nums opacity-80 sm:text-base">{issued.train.time}</p>
              </div>
              <div aria-hidden="true" className="mb-6 flex min-w-6 flex-1 items-center">
                <span className="size-1.5 rounded-full bg-current" />
                <span className="h-px flex-1 bg-current opacity-35" />
                <span className="size-1.5 rounded-full border border-current" />
              </div>
              <div className="min-w-0 text-right">
                <p className="font-display text-xl leading-none font-semibold tracking-[-0.03em] text-balance sm:text-[32px]">
                  {issued.to}
                </p>
                <p className="mt-2 text-sm tabular-nums opacity-80 sm:text-base">{clock(issued.train.arrive)}</p>
              </div>
            </div>
            <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {[
                ["Date", shortDate.format(utc(issued.date))],
                ["Platform", issued.train.platform],
                ["Car", issued.car],
                ["Seats", issued.seats.join(", ")],
                ["Paid", yen(issued.total)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="opacity-80">{k}</dt>
                  <dd className="text-sm font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TicketStub>
        <p aria-live="polite" className="text-[13px] text-muted-foreground">
          {torn ? "Stub torn. Have a good journey." : "Pull the stub to tear it off."}
        </p>
      </div>
      <dl className="w-full max-w-[28rem] divide-y divide-border border-y border-border">
        <Row term="Travelling">{fullDate.format(utc(issued.date))}</Row>
        <Row term="Paid">
          <span className="tabular-nums">
            {yen(issued.total)} by card ending {issued.last4}
          </span>
        </Row>
        <Row term="Reference">
          <span className="tabular-nums">{issued.reference}</span>
        </Row>
      </dl>
      <Button variant="secondary" onPress={restart}>
        Book another journey
      </Button>
    </div>
  ) : null;

  const bookingView = (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-x-10 gap-y-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[34rem]">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
            Reserve a seat
          </h1>
          <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
            A reserved seat on any Shiokaze Line train, from tomorrow until {longDate.format(utc(LAST_DAY))}.
          </p>
        </div>
        <SteppingStones
          aria-label="Booking steps"
          steps={STEPS}
          current={step}
          onStepChange={go}
          className="lg:max-w-[30rem]"
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
        {panel}
        {summary}
      </div>
    </div>
  );

  return (
    <div {...props} className={cn("min-h-dvh w-full bg-background text-foreground", className)}>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <LineMark />
            <div className="min-w-0">
              <p className="truncate text-base leading-6 font-semibold tracking-[-0.01em]">Shiokaze Line</p>
              <p className="truncate text-[13px] leading-5 text-muted-foreground">Seat reservations, Northline Rail</p>
            </div>
          </div>
          <a
            href="#"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Help
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-4 pt-8 pb-20 sm:px-6 sm:pt-10 lg:px-10">
        <GateTransition viewKey={view} tone="glass">
          {view === "booking" ? bookingView : ticket}
        </GateTransition>
      </main>
    </div>
  );
}
