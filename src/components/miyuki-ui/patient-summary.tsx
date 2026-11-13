"use client";

import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  Clock,
  Droplet,
  FlaskConical,
  HeartPulse,
  Info,
  MessageSquare,
  PanelLeft,
  Pill,
  Stethoscope,
  Thermometer,
  TriangleAlert,
  UserRound,
  Users,
  Wind,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { GoalBars } from "@/components/miyuki-ui/goal-bars";
import { GoalRings } from "@/components/miyuki-ui/goal-rings";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { ChartMarker, chartColor, formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { SleepRing } from "@/components/miyuki-ui/sleep-ring";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/miyuki-ui/table";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { Toaster, toast } from "@/components/miyuki-ui/toast";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY = 86_400_000;

const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) / DAY;
const dateOf = (n: number) => new Date(n * DAY);
const dateNum = (n: number) => dateOf(n).getUTCDate();
const monthOf = (n: number) => dateOf(n).getUTCMonth();
const weekday = (n: number) => (n + 4) % 7;
const shortDate = (n: number) => `${dateNum(n)} ${MONTHS[monthOf(n)]}`;
const longDate = (n: number) => `${WEEKDAY_NAMES[weekday(n)]} ${shortDate(n)}`;

const TODAY = dayOf(2027, 1, 15);
const PATIENT = "Aiko Tanaka";
const PHYSICIAN = "Dr Sora Nakamura";

const STRIDE_KM = 0.00074;

const STEPS: number[] = (() => {
  const rng = createRng("aiko-steps");
  const out: number[] = [];
  for (let d = TODAY - 35; d < TODAY; d++) {
    const guiding = [3, 4, 6, 0].includes(weekday(d)) && rng() > 0.15;
    out.push(Math.round(guiding ? rng.range(17_000, 26_000) : rng.range(5_200, 11_400)));
  }
  out[out.length - 1] = 24_530;
  return out;
})();
const stepsOn = (d: number) => STEPS[d - (TODAY - 35)];

const SLEEP = Array.from({ length: 7 }, (_, i) => {
  const rng = createRng(`aiko-sleep-${i}`);
  const deep = Math.round(rng.range(68, 104));
  const rem = Math.round(rng.range(82, 118));
  const light = Math.round(rng.range(190, 246));
  const awake = Math.round(rng.range(14, 52));
  const score = Math.round(Math.min(96, 62 + deep * 0.13 + rem * 0.08 - awake * 0.28 + rng.range(0, 5)));
  return { night: TODAY - 7 + i, score, stages: [deep, rem, light, awake] };
});

const SLEEP_STAGES = ["Deep", "REM", "Light", "Awake"];
const SLEEP_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-4)"];

const RINGS = [
  { name: "Move", value: 2_140, goal: 1_600, format: (v: number) => `${formatNumber(v)} kcal` },
  { name: "Exercise", value: 190, goal: 150, format: (v: number) => `${Math.floor(v / 60)} h ${v % 60} m` },
  {
    name: "Distance",
    value: Math.round(stepsOn(TODAY - 1) * STRIDE_KM * 10) / 10,
    goal: 16,
    format: (v: number) => `${formatNumber(v, 1)} km`,
  },
];

const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} m`;

interface Vital {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  status: "In range" | "Expected at altitude" | "Watch";
  note: string;
}

const VITALS: Vital[] = [
  { label: "Heart rate", value: "52", unit: "bpm", icon: <HeartPulse />, status: "In range", note: "Resting, 08:40" },
  {
    label: "Blood pressure",
    value: "116/74",
    unit: "mmHg",
    icon: <Droplet />,
    status: "In range",
    note: "Seated, 08:42",
  },
  {
    label: "Oxygen saturation",
    value: "94",
    unit: "%",
    icon: <Wind />,
    status: "Expected at altitude",
    note: "At 1,830 m, Happo station",
  },
  { label: "Temperature", value: "36.7", unit: "°C", icon: <Thermometer />, status: "In range", note: "Ear, 08:40" },
];

interface Allergy {
  name: string;
  reaction: string;
  severity: "Severe" | "Moderate" | "Mild";
}

const ALLERGIES: Allergy[] = [
  { name: "Penicillin", reaction: "Hives and swelling of the lips, 2019", severity: "Severe" },
  { name: "Birch pollen", reaction: "Hay fever from April to May", severity: "Moderate" },
  { name: "Latex", reaction: "Itching where gloves touch the skin", severity: "Mild" },
];

const severityTone: Record<Allergy["severity"], BadgeTone> = {
  Severe: "destructive",
  Moderate: "warning",
  Mild: "neutral",
};

interface Medication {
  name: string;
  dose: string;
  schedule: string;
  status: "Taking" | "As needed" | "Seasonal";
}

const MEDICATIONS: Medication[] = [
  { name: "Acetazolamide", dose: "125 mg", schedule: "Twice daily on ascents above 3,000 m", status: "As needed" },
  { name: "Vitamin D3", dose: "1,000 IU", schedule: "Once daily with breakfast", status: "Taking" },
  { name: "Cetirizine", dose: "10 mg", schedule: "Once daily, April to May", status: "Seasonal" },
  { name: "Ibuprofen", dose: "400 mg", schedule: "Up to three times daily with food", status: "As needed" },
];

const medTone: Record<Medication["status"], BadgeTone> = {
  Taking: "success",
  "As needed": "neutral",
  Seasonal: "brand",
};

interface Appointment {
  id: string;
  day: number;
  start: string;
  end: string;
  title: string;
  clinician: string;
  place: string;
}

const UPCOMING: Appointment[] = [
  {
    id: "a1",
    day: dayOf(2027, 1, 17),
    start: "09:30",
    end: "10:00",
    title: "Knee review",
    clinician: "Dr Emil Lindqvist",
    place: "Room 2",
  },
  {
    id: "a2",
    day: dayOf(2027, 1, 22),
    start: "14:00",
    end: "14:45",
    title: "Physiotherapy",
    clinician: "Hana Ito, physiotherapist",
    place: "Rehab room",
  },
  {
    id: "a3",
    day: dayOf(2027, 1, 26),
    start: "08:15",
    end: "08:30",
    title: "Fasting blood test",
    clinician: "Nurse Mio Sakai",
    place: "Lab",
  },
];

interface Visit {
  id: string;
  day: number;
  reason: string;
  clinician: string;
  outcome: string;
  status: "Follow-up booked" | "Completed" | "Referred";
}

const HISTORY: Visit[] = [
  {
    id: "v1",
    day: dayOf(2027, 1, 2),
    reason: "Knee pain after a long descent",
    clinician: "Dr Emil Lindqvist",
    outcome: "Patellar tendon strain. Physiotherapy twice a week.",
    status: "Follow-up booked",
  },
  {
    id: "v2",
    day: dayOf(2027, 0, 18),
    reason: "Altitude fitness review",
    clinician: PHYSICIAN,
    outcome: "Cleared for guiding above 3,000 m this season.",
    status: "Completed",
  },
  {
    id: "v3",
    day: dayOf(2026, 11, 6),
    reason: "Frostnip, left hand",
    clinician: PHYSICIAN,
    outcome: "Superficial. Healed without scarring.",
    status: "Completed",
  },
  {
    id: "v4",
    day: dayOf(2026, 9, 14),
    reason: "Influenza vaccination",
    clinician: "Nurse Mio Sakai",
    outcome: "Given in the left arm. No reaction.",
    status: "Completed",
  },
  {
    id: "v5",
    day: dayOf(2026, 6, 2),
    reason: "Allergy review",
    clinician: "Dr Yui Hamada",
    outcome: "Birch pollen confirmed by skin test.",
    status: "Referred",
  },
  {
    id: "v6",
    day: dayOf(2026, 2, 21),
    reason: "Sprained right ankle",
    clinician: "Dr Emil Lindqvist",
    outcome: "Grade 1. Strapping and two weeks of rest.",
    status: "Completed",
  },
];

const visitTone: Record<Visit["status"], BadgeTone> = {
  "Follow-up booked": "brand",
  Completed: "success",
  Referred: "neutral",
};

const REASONS = [
  "Knee review",
  "Physiotherapy",
  "Altitude fitness review",
  "Blood test",
  "Vaccination",
  "Something else",
];
const CLINICIANS = [PHYSICIAN, "Dr Emil Lindqvist", "Hana Ito, physiotherapist", "Nurse Mio Sakai"];
const SLOT_DAYS = [1, 2, 3, 4, 5, 7].map((i) => TODAY + i);
const SLOT_TIMES = ["09:00", "10:30", "13:00", "15:30"];
const TAKEN = new Set(["1-09:00", "2-09:00", "2-10:30", "3-13:00", "4-15:30", "5-09:00", "5-10:30", "7-13:00"]);

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

interface FrameProps {
  teams: { id: string; name: string; plan?: string; logo?: ReactNode }[];
  items: FloatingSidebarItem[];
  groups?: FloatingSidebarGroup[];
  current: string;
  user: FloatingSidebarUser;
  crumbs: ReactNode;
  actions: ReactNode;
  children: ReactNode;
  className?: string;
}

function Frame({
  teams,
  items,
  groups,
  current,
  user,
  crumbs,
  actions,
  children,
  className,
  ...props
}: FrameProps & Omit<ComponentProps<"div">, keyof FrameProps>) {
  const lg = useMedia("(min-width: 1024px)", true);
  const xl = useMedia("(min-width: 1280px)", true);
  const [menu, setMenu] = useState(false);
  const [rail, setRail] = useState<boolean | null>(null);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={items}
      groups={groups}
      user={user}
      current={current}
      onNavigate={() => setMenu(false)}
      collapsed={drawer ? false : (rail ?? !xl)}
      onCollapsedChange={drawer ? undefined : setRail}
      collapsible={!drawer}
      className={cn(drawer ? "min-h-0 flex-1" : "h-full", !settled && "transition-none")}
    />
  );

  return (
    <div {...props} className={cn("relative flex min-h-dvh gap-3 bg-background p-3 text-foreground", className)}>
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
      <main className="@container/main min-w-0 flex-1 pb-6 lg:px-3">
        <header className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-2 py-1">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open navigation"
            onPress={() => setMenu(true)}
            className="-ms-1 text-muted-foreground data-[hovered]:text-foreground lg:hidden"
          >
            <PanelLeft />
          </IconButton>
          <Breadcrumbs className="flex-nowrap">{crumbs}</Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

const teams = [{ id: "clinic", name: "Hakuba Clinic", plan: "Mountain medicine, 9 staff", logo: <Stethoscope /> }];

const navItems: FloatingSidebarItem[] = [
  { id: "today", label: "Today", icon: <CalendarDays />, count: 14, href: "#" },
  { id: "patients", label: "Patients", icon: <Users />, href: "#" },
  { id: "messages", label: "Messages", icon: <MessageSquare />, count: 3, countTone: "solid", href: "#" },
  { id: "labs", label: "Lab results", icon: <FlaskConical />, href: "#" },
  { id: "prescriptions", label: "Prescriptions", icon: <Pill />, href: "#" },
];

const card = "rounded-xl border border-border bg-card text-card-foreground shadow-sm";

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] leading-6 font-semibold text-foreground">{children}</h2>
      {aside != null && <span className="text-[13px] text-muted-foreground">{aside}</span>}
    </div>
  );
}

function VitalTile({ vital }: { vital: Vital }) {
  const ok = vital.status === "In range";
  return (
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
      <p className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
        <span aria-hidden="true" className="flex shrink-0 [&_svg]:size-3.5">
          {vital.icon}
        </span>
        <span className="truncate">{vital.label}</span>
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-1 text-foreground">
          <span className="text-xl leading-7 font-semibold tracking-[-0.02em] tabular-nums">{vital.value}</span>
          <span className="text-xs text-muted-foreground">{vital.unit}</span>
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs leading-4 font-medium",
            ok ? "text-success-strong" : vital.status === "Watch" ? "text-warning-strong" : "text-brand-strong",
          )}
        >
          <span aria-hidden="true" className="flex [&_svg]:size-3.5">
            {ok ? <CircleCheck /> : vital.status === "Watch" ? <TriangleAlert /> : <Info />}
          </span>
          {vital.status}
        </p>
      </div>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{vital.note}</p>
    </div>
  );
}

function DateTile({ day, className }: { day: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand-strong",
        className,
      )}
    >
      <span className="text-[11px] leading-3 font-medium">{WEEKDAYS[weekday(day)]}</span>
      <span className="mt-0.5 text-xl leading-6 font-semibold tabular-nums">{dateNum(day)}</span>
      <span className="text-[11px] leading-3">{MONTHS[monthOf(day)]}</span>
    </span>
  );
}

export interface PatientSummaryProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
  avatars?: Record<string, string>;
}

export function PatientSummary({
  user = { name: "Sora Nakamura", email: "sora@hakubaclinic.example" },
  avatars = {},
  ...props
}: PatientSummaryProps) {
  const [night, setNight] = useState(SLEEP.length - 1);
  const [week, setWeek] = useState(0);
  const [appointments, setAppointments] = useState(UPCOMING);
  const [booking, setBooking] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    vitals: `${uid}-vitals`,
    allergies: `${uid}-allergies`,
    medications: `${uid}-medications`,
    upcoming: `${uid}-upcoming`,
    history: `${uid}-history`,
  };

  const sleep = SLEEP[night];
  const weekStart = TODAY - 7 - week * 7;
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const weekSteps = weekDays.map(stepsOn);
  const yesterday = TODAY - 1;
  const next = appointments[0];

  const crumbs = [
    <Breadcrumb key="org" href="#">
      Hakuba Clinic
    </Breadcrumb>,
    <Breadcrumb key="list" href="#">
      Patients
    </Breadcrumb>,
    <Breadcrumb key="page">{PATIENT}</Breadcrumb>,
  ];

  const actions = (
    <>
      <Button
        variant="secondary"
        size="sm"
        iconStart={<MessageSquare />}
        onPress={() => setMessaging(true)}
        aria-label="Message"
        className="max-sm:px-2.5"
      >
        <span className="max-sm:sr-only">Message</span>
      </Button>
      <Button size="sm" iconStart={<CalendarPlus />} onPress={() => setBooking(true)}>
        Book visit
      </Button>
    </>
  );

  const facts: [string, ReactNode][] = [
    ["Age", "34, born 12 Aug 1992"],
    ["Blood type", "A positive"],
    ["Primary physician", PHYSICIAN],
    ["Next visit", next ? `${WEEKDAYS[weekday(next.day)]} ${shortDate(next.day)}, ${next.start}` : "None booked"],
  ];

  return (
    <Frame
      {...props}
      teams={teams}
      items={navItems}
      groups={[]}
      current="patients"
      user={{ ...user, avatar: user.avatar ?? avatars[user.name] }}
      crumbs={crumbs}
      actions={actions}
    >
      <Toaster position="bottom-right" />

      <section aria-labelledby={ids.name} className={cn(card, "mt-3 p-5 @min-[720px]/main:p-6")}>
        <div className="flex flex-col gap-5 @min-[900px]/main:flex-row @min-[900px]/main:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar src={avatars[PATIENT]} name={PATIENT} size="xl" style={{ width: 72, height: 72 }} />
            <div className="min-w-0">
              <h1 id={ids.name} className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground">
                {PATIENT}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Mountain guide, Hakuba · <span className="whitespace-nowrap">Patient HMC-04817</span>
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @min-[560px]/main:grid-cols-4 @min-[900px]/main:ms-auto @min-[900px]/main:border-s @min-[900px]/main:border-border @min-[900px]/main:ps-6">
            {facts.map(([term, value]) => (
              <div key={term} className="min-w-0">
                <dt className="text-xs leading-4 text-muted-foreground">{term}</dt>
                <dd className="mt-1 text-sm leading-5 font-medium text-foreground tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 @min-[1040px]/main:grid-cols-12">
        <div className="grid grid-cols-1 content-start gap-4 @min-[720px]/main:grid-cols-2 @min-[1040px]/main:col-span-3 @min-[1040px]/main:grid-cols-1">
          <section
            aria-labelledby={ids.vitals}
            className={cn(card, "p-5 @min-[720px]/main:col-span-2 @min-[1040px]/main:col-span-1")}
          >
            <SectionTitle aside="Today, at the clinic">
              <span id={ids.vitals}>Vitals</span>
            </SectionTitle>
            <div className="grid grid-cols-1 gap-2 @min-[480px]/main:grid-cols-2 @min-[720px]/main:grid-cols-4 @min-[1040px]/main:grid-cols-1">
              {VITALS.map((v) => (
                <VitalTile key={v.label} vital={v} />
              ))}
            </div>
          </section>

          <section aria-labelledby={ids.allergies} className={cn(card, "p-5")}>
            <SectionTitle aside={`${ALLERGIES.length} recorded`}>
              <span id={ids.allergies}>Allergies</span>
            </SectionTitle>
            <ul className="flex flex-col divide-y divide-border">
              {ALLERGIES.map((a) => (
                <li key={a.name} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm leading-5 font-medium text-foreground">{a.name}</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{a.reaction}</p>
                  </div>
                  <Badge
                    tone={severityTone[a.severity]}
                    size="sm"
                    icon={a.severity === "Severe" ? <TriangleAlert aria-hidden="true" /> : undefined}
                    className="mt-0.5"
                  >
                    {a.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby={ids.medications} className={cn(card, "p-5")}>
            <SectionTitle aside={`${MEDICATIONS.length} on file`}>
              <span id={ids.medications}>Medications</span>
            </SectionTitle>
            <ul className="flex flex-col divide-y divide-border">
              {MEDICATIONS.map((m) => (
                <li key={m.name} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm leading-5 font-medium text-foreground">
                      {m.name} <span className="font-normal text-muted-foreground tabular-nums">{m.dose}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{m.schedule}</p>
                  </div>
                  <Badge tone={medTone[m.status]} size="sm" className="mt-0.5">
                    {m.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-4 @min-[640px]/main:grid-cols-2 @min-[1040px]/main:col-span-9 @min-[1040px]/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
          <SleepRing
            label="Sleep score"
            note={`Night of ${shortDate(sleep.night)}, ${hours(sleep.stages[0] + sleep.stages[1] + sleep.stages[2])} asleep`}
            score={sleep.score}
            stages={sleep.stages.map((minutes, i) => ({ name: SLEEP_STAGES[i], minutes, color: SLEEP_COLORS[i] }))}
            size={168}
            action={
              <PeriodStepper
                previousLabel="Previous night"
                nextLabel="Next night"
                onPrevious={() => setNight((n) => Math.max(0, n - 1))}
                onNext={() => setNight((n) => Math.min(SLEEP.length - 1, n + 1))}
                isPreviousDisabled={night === 0}
                isNextDisabled={night === SLEEP.length - 1}
                labelClassName="min-w-[3.25rem]"
              >
                {night === SLEEP.length - 1 ? "Last night" : WEEKDAYS[weekday(sleep.night)]}
              </PeriodStepper>
            }
          />

          <GoalRings
            label="Activity"
            note={`Yesterday, ${longDate(yesterday)}`}
            size={164}
            thickness={14}
            tiles={false}
            rings={RINGS}
            footer={
              <ul className="flex flex-col gap-2">
                {RINGS.map((r, i) => (
                  <li key={r.name} className="flex items-start justify-between gap-3 text-[13px] leading-5">
                    <span className="flex min-w-0 items-start gap-2">
                      <ChartMarker color={chartColor(i)} className="mt-1.5" />
                      <span className="flex flex-col">
                        <span className="text-foreground">{r.name}</span>
                        <span className="text-xs leading-4 text-muted-foreground tabular-nums">
                          Goal {r.format(r.goal)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-medium text-foreground tabular-nums">{r.format(r.value)}</span>
                  </li>
                ))}
              </ul>
            }
          />

          <GoalBars
            className="@min-[640px]/main:col-span-2 @min-[1040px]/main:col-span-1"
            label="Steps"
            value={formatNumber(Math.round(weekSteps.reduce((a, b) => a + b, 0) / 7))}
            caption="a day"
            labels={weekDays.map((d) => WEEKDAYS[weekday(d)].slice(0, 2))}
            titles={weekDays.map(longDate)}
            data={weekSteps}
            goal={10_000}
            height={196}
            action={
              <PeriodStepper
                previousLabel="Previous week"
                nextLabel="Next week"
                onPrevious={() => setWeek((w) => Math.min(4, w + 1))}
                onNext={() => setWeek((w) => Math.max(0, w - 1))}
                isPreviousDisabled={week === 4}
                isNextDisabled={week === 0}
                labelClassName="min-w-[6.5rem]"
              >
                {shortDate(weekStart).split(" ")[0]}–{shortDate(weekStart + 6)}
              </PeriodStepper>
            }
          />

          <section
            aria-labelledby={ids.upcoming}
            className={cn(card, "p-5 @min-[640px]/main:col-span-2 @min-[1040px]/main:col-span-3")}
          >
            <SectionTitle aside={`${appointments.length} booked`}>
              <span id={ids.upcoming}>Upcoming appointments</span>
            </SectionTitle>
            <ul className="grid grid-cols-1 gap-3 @min-[720px]/main:grid-cols-3">
              {appointments.map((a) => (
                <li key={a.id} className="flex min-w-0 gap-3 rounded-lg border border-border p-3">
                  <DateTile day={a.day} />
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-5 font-medium text-foreground">{a.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-5 text-foreground tabular-nums">
                      <Clock aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="sr-only">{longDate(a.day)}, </span>
                      <span className="truncate">
                        {a.start}–{a.end}, {a.place}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                      <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{a.clinician.split(",")[0]}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby={ids.history}
            className="min-w-0 @min-[640px]/main:col-span-2 @min-[1040px]/main:col-span-3"
          >
            <div className="px-1 pt-2">
              <SectionTitle aside={`${HISTORY.length} visits in the last year`}>
                <span id={ids.history}>Visit history</span>
              </SectionTitle>
            </div>
            <Table aria-labelledby={ids.history} className="shadow-sm">
              <TableHeader>
                <Column isRowHeader>Date</Column>
                <Column>Visit</Column>
                <Column>Seen by</Column>
                <Column>Outcome</Column>
                <Column>Status</Column>
              </TableHeader>
              <TableBody items={HISTORY}>
                {(v) => (
                  <Row id={v.id}>
                    <Cell className="font-medium whitespace-nowrap">
                      {shortDate(v.day)} {dateOf(v.day).getUTCFullYear()}
                    </Cell>
                    <Cell className="min-w-44">{v.reason}</Cell>
                    <Cell className="whitespace-nowrap text-muted-foreground">{v.clinician}</Cell>
                    <Cell className="min-w-60 text-muted-foreground">{v.outcome}</Cell>
                    <Cell className="whitespace-nowrap">
                      <Badge tone={visitTone[v.status]} size="sm" dot>
                        {v.status}
                      </Badge>
                    </Cell>
                  </Row>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      </div>

      <BookingDrawer
        isOpen={booking}
        onOpenChange={setBooking}
        taken={appointments}
        onBook={(a) => {
          setAppointments((list) => [...list, a].sort((x, y) => x.day - y.day || x.start.localeCompare(y.start)));
          setBooking(false);
          toast.success("Visit booked", { description: `${a.title}, ${longDate(a.day)} at ${a.start}` });
        }}
      />
      <MessageDrawer
        isOpen={messaging}
        onOpenChange={setMessaging}
        onSend={() => {
          setMessaging(false);
          toast.success(`Message sent to ${PATIENT}`, { description: "She is notified in the patient app." });
        }}
      />
    </Frame>
  );
}

function plusMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function BookingDrawer({
  isOpen,
  onOpenChange,
  taken,
  onBook,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  taken: Appointment[];
  onBook: (appointment: Appointment) => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [clinician, setClinician] = useState(CLINICIANS[1]);
  const [slot, setSlot] = useState<string | null>(null);
  const slotLabel = useId();
  const busy = useMemo(() => {
    const set = new Set(TAKEN);
    for (const a of taken) set.add(`${a.day - TODAY}-${a.start}`);
    return set;
  }, [taken]);

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} aria-label="Book a visit">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!slot) return;
          const [offset, time] = slot.split("-");
          onBook({
            id: `b-${slot}`,
            day: TODAY + Number(offset),
            start: time,
            end: plusMinutes(time, 30),
            title: reason,
            clinician,
            place: clinician.startsWith("Hana") ? "Rehab room" : clinician.startsWith("Nurse") ? "Lab" : "Room 2",
          });
          setSlot(null);
        }}
      >
        <DrawerHeader>
          <DrawerTitle>Book a visit for {PATIENT}</DrawerTitle>
          <p className="text-[13px] text-muted-foreground">
            Visits are 30 minutes. She gets a reminder the day before.
          </p>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 py-3">
          <Select label="Reason" value={reason} onChange={(key) => key && setReason(String(key))}>
            {REASONS.map((r) => (
              <SelectItem key={r} id={r}>
                {r}
              </SelectItem>
            ))}
          </Select>
          <Select label="With" value={clinician} onChange={(key) => key && setClinician(String(key))}>
            {CLINICIANS.map((c) => (
              <SelectItem key={c} id={c}>
                {c}
              </SelectItem>
            ))}
          </Select>
          <div className="flex flex-col gap-2">
            <p id={slotLabel} className="text-sm font-medium text-foreground">
              Time
            </p>
            <ToggleButtonGroup
              aria-labelledby={slotLabel}
              selectionMode="single"
              selectedKeys={slot ? [slot] : []}
              onSelectionChange={(keys) => setSlot(([...keys][0] as string | undefined) ?? null)}
              orientation="vertical"
              className="flex flex-col gap-3"
            >
              {SLOT_DAYS.map((d) => (
                <div key={d} className="flex flex-col gap-1.5">
                  <p className="text-[13px] text-muted-foreground">{longDate(d)}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SLOT_TIMES.map((t) => {
                      const id = `${d - TODAY}-${t}`;
                      const full = busy.has(id);
                      return (
                        <ToggleButton
                          key={id}
                          id={id}
                          isDisabled={full}
                          aria-label={`${longDate(d)}, ${t}${full ? ", taken" : ""}`}
                          className={cn(
                            "flex h-9 cursor-default items-center justify-center rounded-lg border text-sm tabular-nums outline-none",
                            "transition-[background-color,border-color,color] duration-150 ease-settle",
                            "border-border-strong bg-card text-foreground shadow-xs data-[hovered]:bg-accent",
                            "data-[selected]:border-brand data-[selected]:bg-brand data-[selected]:text-brand-foreground",
                            "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                            "data-[disabled]:border-dashed data-[disabled]:bg-transparent data-[disabled]:text-muted-foreground data-[disabled]:line-through data-[disabled]:shadow-none",
                          )}
                        >
                          {t}
                        </ToggleButton>
                      );
                    })}
                  </div>
                </div>
              ))}
            </ToggleButtonGroup>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!slot}>
            Book visit
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}

function MessageDrawer({
  isOpen,
  onOpenChange,
  onSend,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} aria-label={`Message ${PATIENT}`}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          onSend();
          setText("");
        }}
      >
        <DrawerHeader>
          <DrawerTitle>Message {PATIENT}</DrawerTitle>
          <p className="text-[13px] text-muted-foreground">Sent through the patient app. Not for emergencies.</p>
        </DrawerHeader>
        <DrawerBody className="py-3">
          <TextArea
            label="Message"
            placeholder="Your knee review is on Wednesday at 09:30. Please bring your strapping."
            value={text}
            onChange={setText}
            minRows={6}
            maxLength={600}
          />
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!text.trim()}>
            Send message
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
