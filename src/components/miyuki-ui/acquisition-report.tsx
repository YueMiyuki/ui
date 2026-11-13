"use client";

import {
  Bell,
  ChartLine,
  CloudSun,
  Eye,
  House,
  Megaphone,
  MountainSnow,
  MousePointerClick,
  PanelLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  Smartphone,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AreaChart } from "@/components/miyuki-ui/area-chart";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/miyuki-ui/data-table";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { FigureCard } from "@/components/miyuki-ui/figure-cards";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { FunnelChart } from "@/components/miyuki-ui/funnel-chart";
import { GhostBars } from "@/components/miyuki-ui/ghost-bars";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { formatCompact, formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { ProgressBar } from "@/components/miyuki-ui/progress";
import { RadialChart } from "@/components/miyuki-ui/radial-chart";
import { RankedBars } from "@/components/miyuki-ui/ranked-bars";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Toaster, toast } from "@/components/miyuki-ui/toast";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY = 86_400_000;

const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) / DAY;
const dateOf = (n: number) => new Date(n * DAY);
const dateNum = (n: number) => dateOf(n).getUTCDate();
const monthOf = (n: number) => dateOf(n).getUTCMonth();
const shortDate = (n: number) => `${dateNum(n)} ${MONTHS[monthOf(n)]}`;

const TODAY = dayOf(2027, 1, 25);
const START = dayOf(2026, 8, 1);

const CHANNELS = ["Search ads", "Social", "Video", "App stores", "Partners"] as const;
type Channel = (typeof CHANNELS)[number];
type Status = "Active" | "Paused" | "Scheduled" | "Ended";

const RATES: Record<Channel, { cpc: number; ctr: number; install: number }> = {
  "Search ads": { cpc: 38, ctr: 0.042, install: 0.24 },
  Social: { cpc: 22, ctr: 0.011, install: 0.16 },
  Video: { cpc: 30, ctr: 0.006, install: 0.13 },
  "App stores": { cpc: 46, ctr: 0.065, install: 0.36 },
  Partners: { cpc: 18, ctr: 0.02, install: 0.12 },
};

interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  budget: number;
  start: number;
  end: number;
  pausedFrom?: number;
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "powder",
    name: "Powder alerts",
    channel: "Search ads",
    budget: 420_000,
    start: dayOf(2026, 10, 1),
    end: dayOf(2027, 2, 31),
  },
  {
    id: "widget",
    name: "Snow day widget",
    channel: "Social",
    budget: 260_000,
    start: dayOf(2026, 11, 15),
    end: dayOf(2027, 2, 15),
  },
  {
    id: "hakuba",
    name: "Hakuba ski week",
    channel: "Partners",
    budget: 180_000,
    start: dayOf(2027, 0, 10),
    end: dayOf(2027, 1, 28),
  },
  {
    id: "avalanche",
    name: "Avalanche safety",
    channel: "Video",
    budget: 300_000,
    start: dayOf(2026, 11, 1),
    end: dayOf(2027, 3, 30),
  },
  {
    id: "festival",
    name: "Snow festival in Sapporo",
    channel: "Social",
    budget: 220_000,
    start: dayOf(2027, 0, 25),
    end: dayOf(2027, 1, 11),
  },
  {
    id: "onsen",
    name: "Onsen weather",
    channel: "Search ads",
    budget: 150_000,
    start: dayOf(2026, 9, 1),
    end: dayOf(2027, 2, 31),
    pausedFrom: dayOf(2027, 1, 10),
  },
  {
    id: "rail",
    name: "Rail delay alerts",
    channel: "App stores",
    budget: 240_000,
    start: dayOf(2026, 8, 1),
    end: dayOf(2027, 2, 31),
  },
  {
    id: "storms",
    name: "New year storms",
    channel: "Video",
    budget: 200_000,
    start: dayOf(2026, 11, 20),
    end: dayOf(2027, 0, 10),
  },
  {
    id: "lifts",
    name: "Lift queue times",
    channel: "Partners",
    budget: 120_000,
    start: dayOf(2027, 1, 1),
    end: dayOf(2027, 2, 31),
  },
  {
    id: "tides",
    name: "Tide times for anglers",
    channel: "Search ads",
    budget: 160_000,
    start: dayOf(2026, 8, 1),
    end: dayOf(2026, 10, 30),
  },
  {
    id: "autumn",
    name: "Autumn colours",
    channel: "Social",
    budget: 180_000,
    start: dayOf(2026, 8, 1),
    end: dayOf(2026, 10, 15),
  },
  {
    id: "thaw",
    name: "Spring thaw",
    channel: "Social",
    budget: 240_000,
    start: dayOf(2027, 2, 1),
    end: dayOf(2027, 3, 30),
  },
];

interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  installs: number;
  signups: number;
  subscribed: number;
  revenue: number;
}

const ZERO: Metrics = { spend: 0, impressions: 0, clicks: 0, installs: 0, signups: 0, subscribed: 0, revenue: 0 };
const PLAN_VALUE = 3_840;

function addInto(a: Metrics, b: Metrics) {
  for (const key of Object.keys(a) as (keyof Metrics)[]) a[key] += b[key];
}

const DAILY: Record<string, Metrics[]> = Object.fromEntries(
  CAMPAIGNS.map((c) => {
    const rng = createRng(`campaign-${c.id}`);
    const rate = RATES[c.channel];
    const out: Metrics[] = [];
    for (let d = START; d <= TODAY; d++) {
      const live = d >= c.start && d <= c.end && (c.pausedFrom == null || d < c.pausedFrom);
      if (!live) {
        out.push({ ...ZERO });
        continue;
      }
      const weekend = (d + 4) % 7 === 0 || (d + 4) % 7 === 6;
      const snow = [11, 0, 1].includes(monthOf(d)) ? 1.18 : 1;
      const spend = (c.budget / 30) * rng.range(0.86, 1.1);
      const clicks = (spend / (rate.cpc * rng.range(0.9, 1.12))) * (weekend ? 1.12 : 1);
      const installs = clicks * rate.install * rng.range(0.9, 1.1) * snow;
      const signups = installs * rng.range(0.48, 0.56);
      const subscribed = signups * rng.range(0.22, 0.29) * snow;
      out.push({
        spend,
        clicks,
        impressions: clicks / (rate.ctr * rng.range(0.9, 1.1)),
        installs,
        signups,
        subscribed,
        revenue: subscribed * PLAN_VALUE,
      });
    }
    return [c.id, out];
  }),
);

function total(ids: string[], from: number, to: number): Metrics {
  const out = { ...ZERO };
  for (const id of ids)
    for (let d = Math.max(from, START); d <= Math.min(to, TODAY); d++) addInto(out, DAILY[id][d - START]);
  return out;
}

const ALL = CAMPAIGNS.map((c) => c.id);

interface Period {
  year: number;
  month: number;
}

const PERIODS: Period[] = [
  { year: 2026, month: 11 },
  { year: 2027, month: 0 },
  { year: 2027, month: 1 },
];

function bounds({ year, month }: Period) {
  const first = dayOf(year, month, 1);
  const end = dayOf(year, month + 1, 0);
  return { first, end, last: Math.min(end, TODAY) };
}

function statusOf(c: Campaign): Status {
  if (c.start > TODAY) return "Scheduled";
  if (c.end < TODAY) return "Ended";
  if (c.pausedFrom != null && c.pausedFrom <= TODAY) return "Paused";
  return "Active";
}

function unpaid(period: Period, days: number) {
  const rng = createRng(`visitors-${period.year}-${period.month}`);
  const first = dayOf(period.year, period.month, 1);
  const organic: number[] = [];
  const referral: number[] = [];
  for (let d = first; d < first + days; d++) {
    const weekend = (d + 4) % 7 === 0 || (d + 4) % 7 === 6;
    organic.push(Math.round(4_600 * (weekend ? 1.35 : 1) * rng.range(0.82, 1.2)));
    referral.push(Math.round(780 * rng.range(0.7, 1.35)));
  }
  return { organic, referral };
}

const ROAS_MONTHS = [8, 9, 10, 11, 0, 1];
const CHANNEL_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-6)"];
const LAST_SEASON = [3.18, 3.26, 3.34, 3.92, 4.08, 4.14];

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const yen = (v: number) => `¥${formatNumber(Math.round(v))}`;
const count = (v: number) => formatNumber(Math.round(v));
const times = (v: number) => `${v.toFixed(2)}×`;

interface Row {
  id: string;
  name: string;
  channel: Channel;
  status: Status;
  budget: number;
  spend: number;
  installs: number;
  roas: number;
  pace: number;
}

const statusTone: Record<Status, BadgeTone> = {
  Active: "success",
  Paused: "warning",
  Scheduled: "brand",
  Ended: "neutral",
};

const columns: DataTableColumn<Row>[] = [
  {
    id: "name",
    header: "Campaign",
    isRowHeader: true,
    sortable: true,
    value: (r) => r.name,
    cell: (r) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{r.name}</span>
        <span className="truncate text-[13px] font-normal text-muted-foreground">{r.channel}</span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    value: (r) => r.status,
    cell: (r) => (
      <Badge tone={statusTone[r.status]} size="sm" dot>
        {r.status}
      </Badge>
    ),
  },
  { id: "budget", header: "Budget", align: "end", sortable: true, value: (r) => r.budget, cell: (r) => yen(r.budget) },
  { id: "spend", header: "Spend", align: "end", sortable: true, value: (r) => r.spend, cell: (r) => yen(r.spend) },
  {
    id: "pace",
    header: "Budget used",
    sortable: true,
    value: (r) => r.pace,
    cell: (r) => (
      <span className="flex items-center gap-2.5">
        <ProgressBar
          aria-label={`${r.name}, budget used`}
          value={Math.min(100, r.pace * 100)}
          showValue={false}
          size="sm"
          className="w-20"
        />
        <span className="w-9 text-[13px] text-muted-foreground tabular-nums">{Math.round(r.pace * 100)}%</span>
      </span>
    ),
  },
  {
    id: "installs",
    header: "Installs",
    align: "end",
    sortable: true,
    value: (r) => r.installs,
    cell: (r) => count(r.installs),
  },
  {
    id: "roas",
    header: "Return",
    align: "end",
    sortable: true,
    value: (r) => r.roas,
    cell: (r) => (r.spend > 0 ? times(r.roas) : <span className="text-muted-foreground">No spend</span>),
  },
];

const statusFilter: DataTableFilter<Row>[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    value: (r) => r.status,
    options: (Object.keys(statusTone) as Status[]).map((s) => ({ id: s, label: s, tone: statusTone[s] })),
  },
];

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

const teams = [
  { id: "shirakaba", name: "Shirakaba Weather", plan: "Growth, 6 members", logo: <MountainSnow /> },
  { id: "stations", name: "Field stations", plan: "Ridge plan, 6 members" },
];

const navItems: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House />, href: "#" },
  { id: "forecasts", label: "Forecasts", icon: <CloudSun />, href: "#" },
  { id: "alerts", label: "Alerts", icon: <Bell />, href: "#" },
];

const navGroups: FloatingSidebarGroup[] = [
  {
    label: "Growth",
    items: [
      { id: "acquisition", label: "Acquisition", icon: <Target />, href: "#" },
      { id: "campaigns", label: "Campaigns", icon: <Megaphone />, count: 7, href: "#" },
      { id: "audiences", label: "Audiences", icon: <Users />, href: "#" },
      { id: "app", label: "App store pages", icon: <Smartphone />, href: "#" },
    ],
  },
];

export interface AcquisitionReportProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
}

export function AcquisitionReport({
  user = { name: "Mei Watanabe", email: "mei@shirakaba.example" },
  ...props
}: AcquisitionReportProps) {
  const [index, setIndex] = useState(PERIODS.length - 1);
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const period = PERIODS[index];
  const { first, end, last } = bounds(period);
  const partial = last < end;
  const days = last - first + 1;
  const month = MONTH_NAMES[period.month];
  const range = partial ? `1–${dateNum(last)} ${month} ${period.year}` : `${month} ${period.year}`;

  const data = useMemo(() => {
    const prev = bounds({ year: period.month === 0 ? period.year - 1 : period.year, month: (period.month + 11) % 12 });
    const now = total(ALL, first, last);
    const before = total(ALL, prev.first, Math.min(prev.end, prev.first + days - 1));
    const byChannel = CHANNELS.map((ch) => ({
      channel: ch,
      ...total(
        CAMPAIGNS.filter((c) => c.channel === ch).map((c) => c.id),
        first,
        last,
      ),
    }));
    const campaigns = CAMPAIGNS.map((c) => ({ c, m: total([c.id], first, last) }));
    const roas = ROAS_MONTHS.map((m) => {
      const year = m >= 8 ? 2026 : 2027;
      const t = total(ALL, dayOf(year, m, 1), dayOf(year, m + 1, 0));
      return t.revenue / t.spend;
    });
    const dayList = Array.from({ length: days }, (_, i) => first + i);
    const paid = dayList.map((d) => total(ALL, d, d).clicks);
    const { organic, referral } = unpaid(period, days);
    const earlier = unpaid(
      { year: period.month === 0 ? period.year - 1 : period.year, month: (period.month + 11) % 12 },
      days,
    );
    const visitorsBefore = before.clicks + sum(earlier.organic) + sum(earlier.referral);
    return { now, before, byChannel, campaigns, roas, paid, organic, referral, dayList, visitorsBefore };
  }, [period, first, last, days]);

  const { now, before } = data;
  const visitors = sum(data.paid) + sum(data.organic) + sum(data.referral);
  const roasIndex = ROAS_MONTHS.indexOf(period.month);
  const roasNow = data.roas[roasIndex];
  const roasBefore = roasIndex > 0 ? data.roas[roasIndex - 1] : roasNow;

  const rows: Row[] = useMemo(() => {
    const live = data.campaigns
      .filter(({ c }) => (c.start <= end && c.end >= first) || c.start > TODAY)
      .map(({ c, m }) => {
        const own = statusOf(c);
        const status: Status = paused[c.id] != null ? (paused[c.id] ? "Paused" : "Active") : own;
        return {
          id: c.id,
          name: c.name,
          channel: c.channel,
          status,
          budget: c.budget,
          spend: Math.round(m.spend),
          installs: Math.round(m.installs),
          roas: m.spend > 0 ? m.revenue / m.spend : 0,
          pace: m.spend / c.budget,
        };
      });
    return [...drafts, ...live];
  }, [data, first, end, drafts, paused]);

  const crumbs = [
    <Breadcrumb key="org" href="#">
      Shirakaba
    </Breadcrumb>,
    <Breadcrumb key="page">Acquisition</Breadcrumb>,
  ];

  const actions = (
    <>
      <PeriodStepper
        previousLabel="Previous month"
        nextLabel="Next month"
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={() => setIndex((i) => Math.min(PERIODS.length - 1, i + 1))}
        isPreviousDisabled={index === 0}
        isNextDisabled={index === PERIODS.length - 1}
        labelClassName="min-w-[7.5rem]"
      >
        {MONTHS[period.month]} {period.year}
      </PeriodStepper>
      <Button
        size="sm"
        iconStart={<Plus />}
        onPress={() => setCreating(true)}
        aria-label="New campaign"
        className="max-sm:px-2.5"
      >
        <span className="max-sm:sr-only">New campaign</span>
      </Button>
    </>
  );

  const since = partial
    ? `vs 1–${dateNum(last)} ${MONTH_NAMES[(period.month + 11) % 12]}`
    : `vs ${MONTH_NAMES[(period.month + 11) % 12]}`;

  return (
    <Frame
      {...props}
      teams={teams}
      items={navItems}
      groups={navGroups}
      current="acquisition"
      user={user}
      crumbs={crumbs}
      actions={actions}
    >
      <Toaster position="bottom-right" />
      <div className="mt-3 mb-6">
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground">Acquisition</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">Paid campaigns for the Shirakaba app, {range}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 @min-[560px]/main:grid-cols-2 @min-[720px]/main:grid-cols-12">
        <FigureCard
          className="@min-[720px]/main:col-span-6 @min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Wallet />}
          label="Ad spend"
          value={yen(now.spend)}
          delta={now.spend / before.spend - 1}
          invertDelta
          comparison={since}
        />
        <FigureCard
          className="@min-[720px]/main:col-span-6 @min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Eye />}
          label="Impressions"
          value={count(now.impressions)}
          delta={now.impressions / before.impressions - 1}
          comparison={since}
        />
        <FigureCard
          className="@min-[720px]/main:col-span-6 @min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Smartphone />}
          label="Conversions"
          value={count(now.installs)}
          delta={now.installs / before.installs - 1}
          comparison={since}
          info="App installs attributed to a paid campaign."
        />
        <FigureCard
          className="@min-[720px]/main:col-span-6 @min-[1040px]/main:col-span-3"
          variant="band"
          icon={<MousePointerClick />}
          label="Cost per click"
          value={`¥${(now.spend / now.clicks).toFixed(2)}`}
          delta={now.spend / now.clicks / (before.spend / before.clicks) - 1}
          invertDelta
          comparison={since}
        />

        <FunnelChart
          className="@min-[560px]/main:col-span-2 @min-[720px]/main:col-span-7 @min-[1040px]/main:col-span-5"
          label="From click to subscriber"
          value={count(now.subscribed)}
          caption="subscribed"
          stages={[
            { name: "Clicks", value: Math.round(now.clicks) },
            { name: "Installs", value: Math.round(now.installs) },
            { name: "Sign-ups", value: Math.round(now.signups) },
            { name: "Subscribed", value: Math.round(now.subscribed) },
          ]}
          height={200}
        />

        <RadialChart
          className="@min-[720px]/main:col-span-5 @min-[1040px]/main:col-span-4"
          label="Spend by channel"
          variant="stacked"
          name="Spend"
          data={data.byChannel.map((c, i) => ({
            name: c.channel,
            value: Math.round(c.spend),
            color: CHANNEL_COLORS[i],
          }))}
          format={yen}
          centerValue={`¥${formatCompact(now.spend)}`}
          centerLabel="Spent"
        />

        <RankedBars
          className="@min-[720px]/main:col-span-5 @min-[1040px]/main:col-span-3"
          label="Conversions"
          value={count(now.installs)}
          caption="installs"
          format={count}
          limit={5}
          groups={[
            {
              id: "channels",
              name: "Channels",
              data: data.byChannel
                .map((c) => ({ name: c.channel, value: Math.round(c.installs) }))
                .filter((c) => c.value > 0)
                .sort((a, b) => b.value - a.value),
            },
            {
              id: "campaigns",
              name: "Campaigns",
              data: data.campaigns
                .map(({ c, m }) => ({ name: c.name, value: Math.round(m.installs) }))
                .filter((c) => c.value > 0)
                .sort((a, b) => b.value - a.value),
            },
          ]}
        />

        <GhostBars
          className="@min-[560px]/main:col-span-2 @min-[720px]/main:col-span-7 @min-[1040px]/main:col-span-5"
          label="Return on ad spend"
          value={times(roasNow)}
          delta={roasNow / roasBefore - 1}
          caption={`in ${month}`}
          labels={ROAS_MONTHS.map((m) => MONTHS[m])}
          titles={ROAS_MONTHS.map((m) => `${MONTH_NAMES[m]} ${m >= 8 ? 2026 : 2027}${m === 1 ? ", to the 25th" : ""}`)}
          data={data.roas}
          previous={LAST_SEASON}
          currentIndex={roasIndex}
          currentName="This winter"
          previousName="Last winter"
          format={times}
          formatAxis={(v) => `${formatNumber(v)}×`}
          height={216}
        />

        <AreaChart
          className="@min-[560px]/main:col-span-2 @min-[720px]/main:col-span-12 @min-[1040px]/main:col-span-7"
          label="Visitors"
          value={count(visitors)}
          delta={visitors / data.visitorsBefore - 1}
          caption={range}
          labels={data.dayList.map((d) => String(dateNum(d)))}
          titles={data.dayList.map((d) => `${WEEKDAY_NAMES[(d + 4) % 7]} ${shortDate(d)}`)}
          series={[
            { name: "Organic", data: data.organic },
            { name: "Paid", data: data.paid.map(Math.round) },
            { name: "Referral", data: data.referral },
          ]}
          format={count}
          height={216}
        />

        <div className="pt-4 @min-[560px]/main:col-span-2 @min-[720px]/main:col-span-12">
          <DataTable
            key={index}
            columns={columns}
            rows={rows}
            searchKeys={["name", "channel"]}
            filters={statusFilter}
            noun={["campaign", "campaigns"]}
            description={`Budgets are monthly. Spend and installs for ${range}.`}
            pageSize={10}
            rowActions={[
              { id: "edit", label: "Edit campaign", icon: <Pencil /> },
              { id: "pause", label: "Pause or resume", icon: <Pause /> },
              { id: "report", label: "Open report", icon: <ChartLine /> },
            ]}
            bulkActions={[
              { id: "pause", label: "Pause", icon: <Pause /> },
              { id: "resume", label: "Resume", icon: <Play /> },
            ]}
            onAction={(action, list) => {
              const live = list.filter((r) => r.status === "Active" || r.status === "Paused");
              if (action === "pause" || action === "resume") {
                const next = list.length === 1 && action === "pause" ? list[0].status !== "Paused" : action === "pause";
                setPaused((p) => ({ ...p, ...Object.fromEntries(live.map((r) => [r.id, next])) }));
                if (live.length === 0) toast("Only running campaigns can be paused");
                else
                  toast.success(
                    `${live.length === 1 ? live[0].name : `${live.length} campaigns`} ${next ? "paused" : "resumed"}`,
                  );
              }
              if (action === "edit")
                toast(list[0]?.name, { description: `${list[0]?.channel}, ${yen(list[0]?.budget ?? 0)} a month` });
              if (action === "report")
                toast(`${list[0]?.name}`, { description: `${times(list[0]?.roas ?? 0)} return in ${month}` });
            }}
          />
        </div>
      </div>

      <CampaignDrawer
        isOpen={creating}
        onOpenChange={setCreating}
        onCreate={(name, channel, budget) => {
          setDrafts((d) => [
            {
              id: `draft-${d.length}`,
              name,
              channel,
              status: "Scheduled",
              budget,
              spend: 0,
              installs: 0,
              roas: 0,
              pace: 0,
            },
            ...d,
          ]);
          setCreating(false);
          toast.success("Campaign scheduled", { description: `${name} starts on 1 March` });
        }}
      />
    </Frame>
  );
}

function CampaignDrawer({
  isOpen,
  onOpenChange,
  onCreate,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, channel: Channel, budget: number) => void;
}) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("Social");
  const [budget, setBudget] = useState("200000");
  const amount = Number(budget.replace(/[^\d]/g, ""));
  const ready = name.trim() !== "" && amount > 0;

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} aria-label="New campaign">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          onCreate(name.trim(), channel, amount);
          setName("");
        }}
      >
        <DrawerHeader>
          <DrawerTitle>New campaign</DrawerTitle>
          <p className="text-[13px] text-muted-foreground">It starts on 1 March and spends evenly through the month.</p>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 py-3">
          <TextField label="Name" placeholder="Cherry blossom forecast" value={name} onChange={setName} isRequired />
          <Select label="Channel" value={channel} onChange={(key) => key && setChannel(key as Channel)}>
            {CHANNELS.map((c) => (
              <SelectItem key={c} id={c}>
                {c}
              </SelectItem>
            ))}
          </Select>
          <TextField
            label="Monthly budget"
            prefix="¥"
            inputMode="numeric"
            value={budget}
            onChange={setBudget}
            description={amount > 0 ? `About ${yen(amount / 31)} a day` : "Enter an amount in yen"}
            isRequired
          />
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!ready}>
            Schedule campaign
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
