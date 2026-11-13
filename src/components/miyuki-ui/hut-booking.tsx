"use client";

import { type CalendarDate, getWeeksInMonth, parseDate } from "@internationalized/date";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ComponentProps, type ReactNode, Suspense, useEffect, useId, useRef, useState } from "react";
import { Button as AriaButton, useLocale } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { RangeCalendar } from "@/components/miyuki-ui/date-calendar";
import { TextField } from "@/components/miyuki-ui/input";
import { NumberField } from "@/components/miyuki-ui/number-field";
import { Switch } from "@/components/miyuki-ui/switch";
import { cn } from "@/lib/utils";

function CalendarSpace({ month, className }: { month?: CalendarDate | null; className?: string }) {
  const { locale } = useLocale();
  const weeks = month ? getWeeksInMonth(month, locale) : 5;
  return (
    <div aria-hidden="true" className={cn("w-[252px] max-w-full", className)} style={{ height: 76 + 38 * weeks }} />
  );
}

export interface HutPrices {
  bunk: number;
  child?: number;
  dinner: number;
  breakfast: number;
  lunch: number;
}

export interface Hut {
  name: string;
  region: string;
  altitude: number;
  image?: string;
  currency?: string;
  prices: HutPrices;
  open?: { start: string; end: string };
  booked?: string[];
  cancelDays?: number;
}

export interface HutBookingChoice {
  start: string | null;
  end: string | null;
  adults: number;
  children: number;
  dinner: boolean;
  breakfast: boolean;
  lunch: boolean;
  guest: string;
}

export interface HutBookingLine {
  id: string;
  label: string;
  detail: string;
  amount: number;
}

export interface HutBookingResult {
  reference: string;
  hut: string;
  start: string;
  end: string;
  nights: number;
  adults: number;
  children: number;
  meals: { dinner: boolean; breakfast: boolean; lunch: boolean };
  guest: string;
  lines: HutBookingLine[];
  total: number;
}

export interface HutBookingProps extends Omit<ComponentProps<"section">, "children" | "defaultValue"> {
  hut: Hut;
  defaultValue?: Partial<HutBookingChoice>;
  onConfirm?: (booking: HutBookingResult) => void;
}

const STEPS = ["Dates", "Guests and meals", "Confirm"] as const;
const FILL = { type: "spring", stiffness: 500, damping: 30 } as const;
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

const utc = (d: CalendarDate) => new Date(Date.UTC(d.year, d.month - 1, d.day));
const short = (d: CalendarDate) => dayFormat.format(utc(d));
const long = (d: CalendarDate) => longFormat.format(utc(d));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function chance() {
  return {
    key: Date.now(),
    rotate: Math.random() * 16 - 8,
    seed: Math.floor(Math.random() * 90) + 1,
    code: Math.floor(1000 + Math.random() * 9000),
  };
}

function money(currency: string) {
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  return (n: number) => format.format(Math.round(n));
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function priceLines(
  hut: Hut,
  choice: HutBookingChoice,
  nights: number,
  format: (n: number) => string,
): HutBookingLine[] {
  if (nights < 1) return [];
  const { prices } = hut;
  const childRate = prices.child ?? prices.bunk;
  const servings = (choice.adults + choice.children) * nights;
  const lines: HutBookingLine[] = [
    {
      id: "adults",
      label: "Bunks, adults",
      detail: `${plural(choice.adults, "adult")} × ${plural(nights, "night")}`,
      amount: choice.adults * nights * prices.bunk,
    },
  ];
  if (choice.children > 0) {
    lines.push({
      id: "children",
      label: "Bunks, children",
      detail: `${plural(choice.children, "child", "children")} × ${plural(nights, "night")}`,
      amount: choice.children * nights * childRate,
    });
  }
  const meals: [keyof HutPrices & ("dinner" | "breakfast" | "lunch"), string][] = [
    ["dinner", "Dinner"],
    ["breakfast", "Breakfast"],
    ["lunch", "Packed lunch"],
  ];
  for (const [key, label] of meals) {
    if (!choice[key] || servings === 0) continue;
    lines.push({ id: key, label, detail: `${servings} × ${format(prices[key])}`, amount: servings * prices[key] });
  }
  return lines;
}

function Check({ play }: { play: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none">
      <motion.path
        d="M3.6 8.4 6.6 11.2 12.4 4.9"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      />
    </svg>
  );
}

function Progress({ step, locked, onGo }: { step: number; locked: boolean; onGo: (index: number) => void }) {
  const reduce = useReducedMotion();
  return (
    <ol className="flex items-center gap-2" aria-label="Booking steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const marker = (
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums",
              "transition-[background-color,border-color,color] duration-200 ease-settle",
              done && "bg-brand text-brand-foreground",
              current && "border-2 border-brand bg-card text-brand-strong",
              !done && !current && "border border-border-strong text-muted-foreground",
            )}
          >
            {done ? <Check play={!reduce} /> : i + 1}
          </span>
        );
        const text = (
          <span
            className={cn(
              "text-[13px] leading-5 whitespace-nowrap",
              current ? "font-medium text-foreground" : "text-muted-foreground",
              !current && "sr-only @min-[25rem]/main:not-sr-only",
            )}
          >
            {label}
            {done && <span className="sr-only">, done</span>}
          </span>
        );
        return (
          <li key={label} className={cn("flex min-w-0 items-center gap-2", i < STEPS.length - 1 && "flex-1")}>
            {done && !locked ? (
              <AriaButton
                onPress={() => onGo(i)}
                aria-label={`${label}, done. Change`}
                className={cn(
                  "-m-1 flex cursor-default items-center gap-2 rounded-lg p-1 outline-none",
                  "transition-colors duration-150 data-[hovered]:bg-accent",
                  "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                )}
              >
                {marker}
                {text}
              </AriaButton>
            ) : (
              <span aria-current={current ? "step" : undefined} className="flex items-center gap-2">
                {marker}
                {text}
              </span>
            )}
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className="relative h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-border">
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-brand rtl:origin-right"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : FILL}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Total({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const shown = useMotionValue(value);
  const text = useTransform(shown, (v) => format(v));
  useEffect(() => {
    if (reduce) {
      shown.set(value);
      return;
    }
    const controls = animate(shown, value, { duration: 0.45, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, reduce, shown]);
  return <motion.span aria-hidden="true">{text}</motion.span>;
}

interface Stamp {
  key: number;
  rotate: number;
  seed: number;
}

function arcText(name: string) {
  const width = Array.from(name).length * 5.9;
  return width > 108 ? 108 : undefined;
}

function HutStamp({
  name,
  date,
  altitude,
  seed,
  className,
}: {
  name: string;
  date: string;
  altitude: string;
  seed: number;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const length = arcText(name);
  return (
    <svg viewBox="-60 -60 120 120" aria-hidden="true" className={cn("overflow-visible", className)}>
      <defs>
        <path id={`${id}-arc`} d="M -37.5 6 A 37.5 37.5 0 1 1 37.5 6" />
        <filter id={`${id}-ink`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={seed} result="warp" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale={2.4}
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={seed + 7} result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -6 0 0 0 4.15"
            result="pits"
          />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={1} seed={seed + 19} result="wash" />
          <feColorMatrix
            in="wash"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.7 0 0 0 1.9"
            result="density"
          />
          <feComposite in="rough" in2="pits" operator="in" result="pitted" />
          <feComposite in="pitted" in2="density" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle r={53} strokeWidth={3.8} />
        <circle r={47} strokeWidth={1.4} />
        <text fill="currentColor" stroke="none" fontSize={9.8} fontWeight={650} letterSpacing={1} className="font-sans">
          <textPath
            href={`#${id}-arc`}
            startOffset="50%"
            textAnchor="middle"
            textLength={length}
            lengthAdjust={length ? "spacingAndGlyphs" : undefined}
          >
            {name}
          </textPath>
        </text>
        <circle cx={-41} cy={17} r={1.7} fill="currentColor" stroke="none" />
        <circle cx={41} cy={17} r={1.7} fill="currentColor" stroke="none" />
        <path d="M-31 9 L-19 -4 L-13 1 L-1 -16 L8 -6 L13 -10 L25 4 L31 9" strokeWidth={2.8} />
        <path d="M-5.2 -10.4 L-1 -7.8 L3.2 -10.8 M10.4 -8 L13 -6.4 L16.2 -6.6" strokeWidth={1.8} />
        <path d="M-34 9 H34" strokeWidth={1.6} />
        <text
          x={0}
          y={22}
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontSize={8.2}
          fontWeight={600}
          className="font-sans tabular-nums"
        >
          {altitude}
        </text>
        <text
          x={0}
          y={36}
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontSize={11}
          fontWeight={700}
          letterSpacing={0.3}
          className="font-sans tabular-nums"
        >
          {date}
        </text>
      </g>
    </svg>
  );
}

function Line({ label, detail, children }: { label: ReactNode; detail?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="text-foreground">{label}</p>
        {detail != null && <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">{detail}</p>}
      </div>
      <p className="shrink-0 text-foreground tabular-nums">{children}</p>
    </div>
  );
}

export function HutBooking({ hut, defaultValue, onConfirm, className, ...props }: HutBookingProps) {
  const reduce = useReducedMotion();
  const currency = hut.currency ?? "JPY";
  const format = money(currency);
  const initial: HutBookingChoice = {
    start: null,
    end: null,
    adults: 2,
    children: 0,
    dinner: true,
    breakfast: true,
    lunch: false,
    guest: "",
    ...defaultValue,
  };
  const [choice, setChoice] = useState<HutBookingChoice>(initial);
  const [step, setStep] = useState(0);
  const [missingName, setMissingName] = useState(false);
  const [booking, setBooking] = useState<HutBookingResult | null>(null);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState(false);
  const titleId = useId();

  const start = safeDate(choice.start);
  const end = safeDate(choice.end);
  const nights = start && end ? Math.max(0, end.compare(start)) : 0;
  const lines = priceLines(hut, choice, nights, format);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const booked = new Set(hut.booked ?? []);
  const minValue = safeDate(hut.open?.start) ?? undefined;
  const maxValue = safeDate(hut.open?.end) ?? undefined;
  const view = booking ? 3 : step;

  useEffect(() => {
    if (touched) headingRef.current?.focus();
  }, [view, touched]);

  function go(next: number) {
    setTouched(true);
    setStep(next);
  }

  function update(patch: Partial<HutBookingChoice>) {
    setChoice((current) => ({ ...current, ...patch }));
  }

  function confirm() {
    if (!start || !end || nights < 1) {
      go(0);
      return;
    }
    if (!choice.guest.trim()) {
      setMissingName(true);
      guestRef.current?.querySelector("input")?.focus();
      return;
    }
    const initials = hut.name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
    const luck = chance();
    const reference = `${initials}-${String(start.month).padStart(2, "0")}${String(start.day).padStart(2, "0")}-${luck.code}`;
    const result: HutBookingResult = {
      reference,
      hut: hut.name,
      start: start.toString(),
      end: end.toString(),
      nights,
      adults: choice.adults,
      children: choice.children,
      meals: { dinner: choice.dinner, breakfast: choice.breakfast, lunch: choice.lunch },
      guest: choice.guest.trim(),
      lines,
      total,
    };
    setTouched(true);
    setBooking(result);
    setStamp({ key: luck.key, rotate: luck.rotate, seed: luck.seed });
    onConfirm?.(result);
  }

  function restart() {
    setTouched(true);
    setBooking(null);
    setStamp(null);
    setMissingName(false);
    setChoice(initial);
    setStep(0);
  }

  const headings = ["When are you staying?", "Who is coming?", "Check and confirm", "Your bunks are booked"];
  const leads = [
    "Choose the night you arrive and the morning you leave. Full nights are struck through.",
    "Bunks are in the winter room. Meals are served in the dining hut.",
    "Nothing is charged now. You pay in cash at the hut when you arrive.",
    booking ? `We have held your bunks under ${booking.guest}.` : "",
  ];

  const guestsText = [
    plural(choice.adults, "adult"),
    choice.children > 0 ? plural(choice.children, "child", "children") : null,
  ]
    .filter(Boolean)
    .join(", ");
  const mealsText =
    [choice.dinner && "dinner", choice.breakfast && "breakfast", choice.lunch && "packed lunch"]
      .filter(Boolean)
      .join(", ") || "no meals";
  const stampDate = start ? `${start.day}.${ROMAN[start.month - 1]}.${start.year}` : "";
  const enter = reduce ? { opacity: 0 } : { opacity: 0, x: 8 };

  return (
    <section
      aria-labelledby={titleId}
      {...props}
      className={cn(
        "@container/card w-full overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <h2 id={titleId} className="sr-only">
        Book a bunk at {hut.name}
      </h2>
      <div className="grid @min-[40rem]:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="@container/main flex min-w-0 flex-col gap-6 p-5 @min-[40rem]:p-6">
          <Progress step={view} locked={booking != null} onGo={go} />
          <div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="rounded-sm text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {headings[view]}
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{leads[view]}</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={touched ? enter : false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.09 } }}
              transition={reduce ? { duration: 0.12 } : SETTLE}
              className="flex-1 @min-[40rem]/card:min-h-[19rem]"
            >
              {view === 0 && (
                <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
                  <Suspense fallback={<CalendarSpace month={start ?? minValue} className="-ms-1.5" />}>
                    <RangeCalendar
                      aria-label="Nights at the hut"
                      value={start && end ? { start, end } : null}
                      onChange={(range) =>
                        update({
                          start: range ? range.start.toString() : null,
                          end: range ? range.end.toString() : null,
                        })
                      }
                      defaultFocusedValue={start ?? minValue}
                      minValue={minValue}
                      maxValue={maxValue}
                      isDateUnavailable={(date) => booked.has(date.toString())}
                      className="-ms-1.5"
                    />
                  </Suspense>
                  <div className="flex min-w-40 flex-1 flex-col gap-4 pt-1.5">
                    <div>
                      <p className="text-[13px] leading-5 text-muted-foreground">Nights</p>
                      <p className="font-display text-4xl leading-tight font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                        {nights}
                      </p>
                    </div>
                    {start && end && nights > 0 ? (
                      <dl className="flex flex-col gap-2.5 text-sm">
                        <div>
                          <dt className="text-[13px] leading-5 text-muted-foreground">Arrive</dt>
                          <dd className="text-foreground">
                            {long(start)}
                            <span className="block text-[13px] text-muted-foreground">From 14:00</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[13px] leading-5 text-muted-foreground">Leave</dt>
                          <dd className="text-foreground">
                            {long(end)}
                            <span className="block text-[13px] text-muted-foreground">By 09:00</span>
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-[13px] leading-5 text-muted-foreground">
                        {start && end
                          ? "Choose a morning after the night you arrive."
                          : "Choose your first night, then the morning you leave."}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {view === 1 && (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-4 @min-[26rem]/main:grid-cols-2">
                    <NumberField
                      label="Adults"
                      minValue={1}
                      maxValue={8}
                      value={choice.adults}
                      onChange={(v) => update({ adults: Number.isNaN(v) ? 1 : v })}
                    />
                    <NumberField
                      label="Children under 12"
                      minValue={0}
                      maxValue={6}
                      value={choice.children}
                      onChange={(v) => update({ children: Number.isNaN(v) ? 0 : v })}
                    />
                  </div>
                  <fieldset className="flex flex-col gap-3.5">
                    <legend className="mb-3.5 text-sm font-medium text-foreground">Meals</legend>
                    <Switch
                      isSelected={choice.dinner}
                      onChange={(on) => update({ dinner: on })}
                      description={`${format(hut.prices.dinner)} per person, per night. Served at 17:30.`}
                    >
                      Dinner
                    </Switch>
                    <Switch
                      isSelected={choice.breakfast}
                      onChange={(on) => update({ breakfast: on })}
                      description={`${format(hut.prices.breakfast)} per person, per night. From 05:30.`}
                    >
                      Breakfast
                    </Switch>
                    <Switch
                      isSelected={choice.lunch}
                      onChange={(on) => update({ lunch: on })}
                      description={`${format(hut.prices.lunch)} per person, per night. Rice balls and tea for the ridge.`}
                    >
                      Packed lunch
                    </Switch>
                  </fieldset>
                </div>
              )}
              {view === 2 && (
                <div className="flex flex-col gap-6">
                  <dl className="grid gap-x-6 gap-y-3 text-sm @min-[26rem]/main:grid-cols-[auto_minmax(0,1fr)]">
                    <dt className="text-muted-foreground">Dates</dt>
                    <dd className="-mt-2.5 text-foreground @min-[26rem]/main:mt-0">
                      {start && end ? `${long(start)} to ${long(end)}, ${plural(nights, "night")}` : "Not chosen"}
                    </dd>
                    <dt className="text-muted-foreground">Guests</dt>
                    <dd className="-mt-2.5 text-foreground @min-[26rem]/main:mt-0">{guestsText}</dd>
                    <dt className="text-muted-foreground">Meals</dt>
                    <dd className="-mt-2.5 text-foreground first-letter:uppercase @min-[26rem]/main:mt-0">
                      {mealsText}
                    </dd>
                  </dl>
                  <div ref={guestRef} className="max-w-sm">
                    <TextField
                      label="Lead guest"
                      description="The name we put on the bunk list."
                      placeholder="Full name"
                      autoComplete="name"
                      isRequired
                      value={choice.guest}
                      onChange={(guest) => {
                        update({ guest });
                        if (guest.trim()) setMissingName(false);
                      }}
                      isInvalid={missingName}
                      errorMessage="Enter a name for the bunk list."
                      validationBehavior="aria"
                    />
                  </div>
                </div>
              )}
              {view === 3 && booking && (
                <motion.div
                  className="relative flex flex-col gap-5 pb-24 @min-[40rem]/card:pb-0"
                  initial={false}
                  animate={stamp && !reduce ? { y: [0, 0, 1.5, 0] } : { y: 0 }}
                  transition={{ duration: 0.34, times: [0, 0.3, 0.45, 1], ease: "easeOut" }}
                >
                  <dl className="grid gap-x-6 gap-y-3 text-sm @min-[26rem]/main:grid-cols-[auto_minmax(0,1fr)]">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="-mt-2.5 font-medium text-foreground tabular-nums @min-[26rem]/main:mt-0">
                      {booking.reference}
                    </dd>
                    <dt className="text-muted-foreground">Arrive</dt>
                    <dd className="-mt-2.5 text-foreground @min-[26rem]/main:mt-0">
                      {start ? long(start) : ""}, before 16:00 if you can
                    </dd>
                    <dt className="text-muted-foreground">Bring</dt>
                    <dd className="-mt-2.5 text-foreground @min-[26rem]/main:mt-0">
                      A sleeping bag liner and cash for the hut
                    </dd>
                  </dl>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    The warden radios the valley each evening at 18:00. If the ridge closes, your booking moves to the
                    next open night at no charge.
                  </p>
                  {stamp && (
                    <motion.div
                      key={stamp.key}
                      aria-hidden="true"
                      className="pointer-events-none absolute -end-1 bottom-0 size-32 text-chart-5 mix-blend-multiply @min-[40rem]/card:-bottom-28 @min-[40rem]/card:end-2 @min-[40rem]/card:size-36 dark:mix-blend-screen"
                      initial={
                        reduce
                          ? { opacity: 0, rotate: stamp.rotate }
                          : { opacity: 0, scale: 1.5, rotate: stamp.rotate - 5, y: -8 }
                      }
                      animate={{ opacity: 1, scale: 1, rotate: stamp.rotate, y: 0 }}
                      transition={
                        reduce
                          ? { duration: 0.15 }
                          : {
                              opacity: { duration: 0.07 },
                              scale: { type: "spring", stiffness: 720, damping: 22, mass: 0.7 },
                              rotate: { type: "spring", stiffness: 500, damping: 30 },
                              y: { type: "spring", stiffness: 720, damping: 26 },
                            }
                      }
                    >
                      {!reduce && (
                        <motion.span
                          className="absolute inset-[6%] rounded-full bg-current"
                          initial={{ opacity: 0, scale: 0.86 }}
                          animate={{ opacity: [0, 0.1, 0], scale: [0.86, 1.02, 1.12] }}
                          transition={{ duration: 0.6, times: [0, 0.2, 1], delay: 0.08, ease: "easeOut" }}
                        />
                      )}
                      <HutStamp
                        name={hut.name}
                        altitude={`${hut.altitude.toLocaleString("en-US")} m`}
                        date={stampDate}
                        seed={stamp.seed}
                        className="relative size-full"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            {view === 3 ? (
              <Button variant="ghost" onPress={restart} className="-ms-2">
                Make another booking
              </Button>
            ) : (
              <>
                {view > 0 ? (
                  <Button variant="secondary" onPress={() => go(view - 1)}>
                    Back
                  </Button>
                ) : (
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    {nights > 0 ? `${plural(nights, "night")} selected` : "No nights selected"}
                  </span>
                )}
                {view < 2 ? (
                  <Button variant="primary" isDisabled={view === 0 && nights < 1} onPress={() => go(view + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button variant="primary" onPress={confirm}>
                    Confirm booking
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <aside
          aria-label="Booking summary"
          className="relative flex flex-col gap-4 border-t border-border bg-muted p-5 @min-[40rem]:border-s @min-[40rem]:border-t-0 @min-[40rem]:p-6"
        >
          <div className="flex items-center gap-3 @min-[40rem]:flex-col @min-[40rem]:items-stretch">
            {hut.image && (
              <img
                src={hut.image}
                alt=""
                className="size-14 shrink-0 rounded-lg object-cover @min-[40rem]:h-24 @min-[40rem]:w-full"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{hut.name}</p>
              <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
                {hut.altitude.toLocaleString("en-US")} m · {hut.region}
              </p>
            </div>
          </div>
          <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Dates</dt>
              <dd className="text-right text-foreground tabular-nums">
                {start && end && nights > 0 ? (
                  <>
                    {short(start)} → {short(end)}
                    <span className="block text-[13px] text-muted-foreground">{plural(nights, "night")}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Not chosen</span>
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="text-right text-foreground">{guestsText}</dd>
            </div>
          </dl>
          <div className="border-t border-border pt-2.5">
            {lines.length === 0 ? (
              <p className="py-1.5 text-[13px] leading-5 text-muted-foreground">
                Prices appear once you choose your nights.
              </p>
            ) : (
              <ul>
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.li
                      key={line.id}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={
                        reduce
                          ? { opacity: 0, transition: { duration: 0.1 } }
                          : { opacity: 0, height: 0, transition: { duration: 0.12 } }
                      }
                      transition={reduce ? { duration: 0.12 } : SETTLE}
                      className="overflow-hidden"
                    >
                      <Line label={line.label} detail={line.detail}>
                        {format(line.amount)}
                      </Line>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
          <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
              <Total value={total} format={format} />
              <span className="sr-only">{format(total)}</span>
            </span>
          </div>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Pay in cash at the hut.
            {start && nights > 0
              ? ` Free cancellation until ${dateFormat.format(utc(start.subtract({ days: hut.cancelDays ?? 3 })))}.`
              : ""}
          </p>
          <p aria-live="polite" className="sr-only">
            {booking ? `Booked. Reference ${booking.reference}.` : nights > 0 ? `Total ${format(total)}` : ""}
          </p>
        </aside>
      </div>
    </section>
  );
}
