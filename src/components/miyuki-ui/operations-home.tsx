"use client";

import {
  Bell,
  CloudSun,
  CreditCard,
  Download,
  Eye,
  House,
  Megaphone,
  MountainSnow,
  PanelLeft,
  Plus,
  RadioTower,
  Receipt,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/miyuki-ui/data-table";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownSeparator,
} from "@/components/miyuki-ui/dropdown";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { GhostBars } from "@/components/miyuki-ui/ghost-bars";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { ChartCard, formatCompact, formatNumber } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { LineChart } from "@/components/miyuki-ui/line-chart";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { Toaster, toast } from "@/components/miyuki-ui/toast";
import { YearGrid } from "@/components/miyuki-ui/year-grid";
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
const DAY = 86_400_000;

const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) / DAY;
const dateOf = (n: number) => new Date(n * DAY);
const shortDate = (n: number) => `${dateOf(n).getUTCDate()} ${MONTHS[dateOf(n).getUTCMonth()]}`;
const longDate = (n: number) => `${shortDate(n)} ${dateOf(n).getUTCFullYear()}`;

const TODAY = dayOf(2027, 1, 25);
const MONTH_NOW = 2027 * 12 + 1;

const REGIONS = ["Hokkaido", "Tōhoku", "Chūbu", "Kyūshū"] as const;
type Region = (typeof REGIONS)[number];

type Plan = "Valley" | "Ridge" | "Summit";
type Status = "Active" | "Trial" | "Past due" | "Cancelled";

interface Customer {
  id: string;
  name: string;
  town: string;
  region: Region;
  contact?: string;
  role?: string;
  plan: Plan;
  status: Status;
  seats: number;
  joined: number;
  hoursAgo?: number;
  amount: number;
}

const PER_SEAT: Record<Plan, number> = { Valley: 1_600, Ridge: 2_400, Summit: 2_100 };

const SIGNUPS: [string, string, string, string, Region, Plan, number, number][] = [
  ["Aiko Tanaka", "Mountain guide", "Kitakaze Outfitters", "Hakuba", "Chūbu", "Ridge", 12, 2],
  ["Kenji Mori", "Station master", "Northline Rail", "Otaru", "Hokkaido", "Summit", 46, 5],
  ["Élodie Martin", "Innkeeper", "Ryokan Shizuku", "Nozawa", "Chūbu", "Valley", 3, 26],
  ["Priya Raman", "Tea buyer", "Yukimi Tea", "Yakushima", "Kyūshū", "Valley", 2, 49],
  ["Lars Eriksen", "Ski patrol lead", "Niseko Ski Patrol", "Niseko", "Hokkaido", "Ridge", 18, 74],
  ["Mateo Álvarez", "Photographer", "Paper and Pine", "Aomori", "Tōhoku", "Valley", 4, 98],
  ["Haruto Ishikawa", "Glassblower", "Tsurara Glass", "Otaru", "Hokkaido", "Valley", 2, 140],
  ["Chen Wei", "Rail operations engineer", "Kiso Valley Rail", "Kiso", "Chūbu", "Summit", 31, 190],
  ["Ingrid Solberg", "Cartographer", "Fjell Maps", "Zaō", "Tōhoku", "Ridge", 6, 236],
  ["Amara Okafor", "Hydrologist", "Tōya Lake Observatory", "Tōya", "Hokkaido", "Ridge", 9, 290],
];

const BUSINESSES: [string, Region, string[]][] = [
  ["Otaru", "Hokkaido", ["Canal Ryokan", "Harbour Tours", "Ferry Co."]],
  ["Niseko", "Hokkaido", ["Backcountry Guides", "Ski School", "Cat Skiing"]],
  ["Furano", "Hokkaido", ["Ropeway", "Farm Stay"]],
  ["Kushiro", "Hokkaido", ["Fishing Co-op", "Wetland Tours"]],
  ["Rishiri", "Hokkaido", ["Kelp Co-op"]],
  ["Aomori", "Tōhoku", ["Fishing Co-op", "Snow Corridor Tours", "Apple Growers"]],
  ["Zaō", "Tōhoku", ["Ropeway", "Onsen Inn"]],
  ["Hakuba", "Chūbu", ["Ski School", "Alpine Club", "Powder Lodge"]],
  ["Nozawa", "Chūbu", ["Snow Lodge", "Ski School"]],
  ["Myōkō", "Chūbu", ["Mountain Guides"]],
  ["Matsumoto", "Chūbu", ["Castle Tours", "Rail Tours"]],
  ["Shirakawa", "Chūbu", ["Farmhouse Inn"]],
  ["Yakushima", "Kyūshū", ["Forest Guides", "Ferry Co.", "Trail Huts"]],
];

function buildCustomers(): Customer[] {
  const rng = createRng("shirakaba-customers");
  const recent: Customer[] = SIGNUPS.map(([contact, role, name, town, region, plan, seats, hours], i) => ({
    id: `s${i + 1}`,
    name,
    town,
    region,
    contact,
    role,
    plan,
    status: "Trial",
    seats,
    joined: TODAY - Math.floor((hours + 13) / 24),
    hoursAgo: hours,
    amount: PER_SEAT[plan] * seats,
  }));
  const statuses: Status[] = [
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Past due",
    "Cancelled",
  ];
  const older: Customer[] = BUSINESSES.flatMap(([town, region, kinds]) =>
    kinds.map((kind) => ({ town, region, kind })),
  ).map(({ town, region, kind }, i) => {
    const plan = rng.pick(["Valley", "Ridge", "Ridge", "Ridge", "Summit"] as const);
    const seats = plan === "Valley" ? rng.int(1, 5) : plan === "Ridge" ? rng.int(4, 22) : rng.int(24, 90);
    return {
      id: `c${i + 1}`,
      name: `${town} ${kind}`,
      town,
      region,
      plan,
      status: rng.pick(statuses),
      seats,
      joined: dayOf(2022, 0, 1) + rng.int(0, TODAY - 20 - dayOf(2022, 0, 1)),
      amount: PER_SEAT[plan] * seats,
    };
  });
  return [...recent, ...older];
}

const CUSTOMERS = buildCustomers();

const SEASON: Record<Region, number[]> = {
  Hokkaido: [1.2, 1.18, 1.02, 0.88, 0.82, 0.84, 0.9, 0.92, 0.88, 0.95, 1.04, 1.16],
  Tōhoku: [1.14, 1.12, 1.0, 0.9, 0.86, 0.88, 0.94, 0.95, 0.9, 0.96, 1.03, 1.12],
  Chūbu: [1.22, 1.2, 1.04, 0.86, 0.8, 0.84, 0.94, 0.98, 0.88, 0.92, 1.02, 1.18],
  Kyūshū: [0.86, 0.88, 0.96, 1.04, 1.1, 1.14, 1.18, 1.16, 1.06, 0.98, 0.9, 0.86],
};

const MRR: Record<Region, number> = Object.fromEntries(
  REGIONS.map((r) => [
    r,
    CUSTOMERS.filter((c) => c.region === r && (c.status === "Active" || c.status === "Past due")).reduce(
      (sum, c) => sum + c.amount,
      0,
    ),
  ]),
) as Record<Region, number>;

const FIRST_MONTH = 2020 * 12;

const MONTHLY: Record<Region, number[]> = Object.fromEntries(
  REGIONS.map((r) => {
    const rng = createRng(`revenue-${r}`);
    const out: number[] = [];
    for (let k = FIRST_MONTH; k <= MONTH_NOW; k++) {
      const m = k % 12;
      const growth = 1.021 ** (k - MONTH_NOW);
      const value = MRR[r] * growth * (SEASON[r][m] / SEASON[r][1]) * rng.range(0.95, 1.05);
      out.push(Math.round(value / 100) * 100);
    }
    return [r, out];
  }),
) as Record<Region, number[]>;

const monthIndex = (year: number, month: number) => year * 12 + month - FIRST_MONTH;
const DAILY_FROM = dayOf(2026, 9, 1);
const WEEKDAY = [0.7, 1.16, 1.1, 1.06, 1.04, 1.0, 0.76];

const DAILY: Record<Region, number[]> = Object.fromEntries(
  REGIONS.map((r) => {
    const rng = createRng(`daily-${r}`);
    const raw: number[] = [];
    for (let d = DAILY_FROM; d <= dayOf(2027, 1, 28); d++) raw.push(WEEKDAY[(d + 4) % 7] * rng.range(0.82, 1.18));
    const out = raw.slice();
    for (let k = monthIndex(2026, 9); k <= monthIndex(2027, 1); k++) {
      const year = Math.floor((k + FIRST_MONTH) / 12);
      const month = (k + FIRST_MONTH) % 12;
      const start = dayOf(year, month, 1) - DAILY_FROM;
      const end = dayOf(year, month + 1, 1) - DAILY_FROM;
      const sum = raw.slice(start, end).reduce((a, b) => a + b, 0);
      for (let i = start; i < end; i++) out[i] = Math.round((MONTHLY[r][k] * raw[i]) / sum);
    }
    return [r, out];
  }),
) as Record<Region, number[]>;

const YEAR_START = dayOf(2027, 0, 1);

const BULLETINS: Record<Region, number[]> = Object.fromEntries(
  REGIONS.map((r) => {
    const rng = createRng(`bulletins-${r}`);
    const base = { Hokkaido: 4.2, Tōhoku: 1.6, Chūbu: 3.4, Kyūshū: 0.5 }[r];
    const out: number[] = [];
    let storm = 0;
    for (let d = YEAR_START; d <= TODAY; d++) {
      if (storm <= 0 && rng() < 0.07) storm = rng.int(2, 4);
      const surge = storm > 0 ? rng.range(2.2, 3.4) : 1;
      storm--;
      out.push(Math.max(0, Math.round(base * surge * rng.range(0.4, 1.5) - (rng() < 0.18 ? base : 0))));
    }
    out[out.length - 1] = { Hokkaido: 6, Tōhoku: 2, Chūbu: 5, Kyūshū: 1 }[r];
    return [r, out];
  }),
) as Record<Region, number[]>;

const yen = (v: number) => `¥${formatNumber(v)}`;
const yenAxis = (v: number) => `¥${formatCompact(v)}`;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function pick(regions: Region[], source: Record<Region, number[]>) {
  const length = source[REGIONS[0]].length;
  const out = new Array<number>(length).fill(0);
  for (const r of regions) source[r].forEach((v, i) => (out[i] += v));
  return out;
}

const tones: Record<Status, BadgeTone> = {
  Active: "success",
  Trial: "brand",
  "Past due": "warning",
  Cancelled: "neutral",
};

function ago(hours: number) {
  if (hours < 24) return `${hours} hr ago`;
  if (hours < 48) return "Yesterday";
  if (hours < 24 * 7) return `${Math.round(hours / 24)} days ago`;
  const weeks = Math.round(hours / (24 * 7));
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

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
  { id: "shirakaba", name: "Shirakaba Weather", plan: "Operations, 18 members", logo: <MountainSnow /> },
  { id: "stations", name: "Field stations", plan: "Ridge plan, 6 members" },
];

const navItems: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House />, href: "#" },
  { id: "bulletins", label: "Bulletins", icon: <Megaphone />, href: "#" },
  { id: "forecasts", label: "Forecasts", icon: <CloudSun />, href: "#" },
  { id: "stations", label: "Stations", icon: <RadioTower />, href: "#" },
  { id: "alerts", label: "Alerts", icon: <Bell />, count: 2, countTone: "solid", href: "#" },
];

const navGroups: FloatingSidebarGroup[] = [
  {
    label: "Business",
    items: [
      { id: "customers", label: "Customers", icon: <Users />, count: CUSTOMERS.length, href: "#" },
      { id: "billing", label: "Billing", icon: <CreditCard />, href: "#" },
    ],
  },
];

type Range = "weekly" | "monthly" | "yearly";

const WEEKS_END = dayOf(2027, 1, 21);
const WEEK_STARTS = Array.from({ length: 12 }, (_, i) => WEEKS_END - 6 - (11 - i) * 7);

function revenueSeries(regions: Region[], range: Range) {
  if (range === "weekly") {
    const daily = pick(regions, DAILY);
    const data = WEEK_STARTS.map((s) => sum(daily.slice(s - DAILY_FROM, s - DAILY_FROM + 7)));
    return {
      data,
      labels: WEEK_STARTS.map(shortDate),
      titles: WEEK_STARTS.map((s) => `Week of ${shortDate(s)}`),
      caption: `week of ${shortDate(WEEK_STARTS[11])}`,
    };
  }
  const monthly = pick(regions, MONTHLY);
  if (range === "monthly") {
    const from = monthIndex(2026, 1);
    const data = monthly.slice(from, from + 12);
    const keys = Array.from({ length: 12 }, (_, i) => from + FIRST_MONTH + i);
    return {
      data,
      labels: keys.map((k) => MONTHS[k % 12]),
      titles: keys.map((k) => `${MONTH_NAMES[k % 12]} ${Math.floor(k / 12)}`),
      caption: "in January",
    };
  }
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const data = years.map((y) => sum(monthly.slice(monthIndex(y, 0), monthIndex(y, 0) + 12)));
  return { data, labels: years.map(String), titles: years.map((y) => `${y}`), caption: "in 2026" };
}

const SEASON_MONTHS = [7, 8, 9, 10, 11, 0, 1];

function earnings(regions: Region[]) {
  const monthly = pick(regions, MONTHLY);
  const daily = pick(regions, DAILY);
  const feb = sum(daily.slice(dayOf(2027, 1, 1) - DAILY_FROM, TODAY - DAILY_FROM + 1));
  const data = SEASON_MONTHS.map((m, i) => (i === 6 ? feb : monthly[monthIndex(m >= 7 ? 2026 : 2027, m)]));
  const previous = SEASON_MONTHS.map((m) => monthly[monthIndex(m >= 7 ? 2025 : 2026, m)]);
  const lastSeasonSoFar = sum(previous.slice(0, 6)) + Math.round(previous[6] * (25 / 28));
  return {
    data,
    previous,
    total: sum(data),
    delta: sum(data) / lastSeasonSoFar - 1,
    labels: SEASON_MONTHS.map((m) => MONTHS[m]),
    titles: SEASON_MONTHS.map((m, i) =>
      i === 6 ? "February 2027, to the 25th" : `${MONTH_NAMES[m]} ${m >= 7 ? 2026 : 2027}`,
    ),
  };
}

const columns: DataTableColumn<Customer>[] = [
  {
    id: "name",
    header: "Customer",
    isRowHeader: true,
    sortable: true,
    value: (c) => c.name,
    cell: (c) => (
      <span className="flex items-center gap-3">
        <Avatar name={c.name} shape="rounded" aria-hidden="true" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="truncate text-[13px] font-normal text-muted-foreground">
            {c.town}, {c.region}
          </span>
        </span>
      </span>
    ),
  },
  { id: "plan", header: "Plan", sortable: true, value: (c) => c.plan },
  {
    id: "status",
    header: "Status",
    value: (c) => c.status,
    cell: (c) => (
      <Badge tone={tones[c.status]} size="sm" dot>
        {c.status}
      </Badge>
    ),
  },
  { id: "seats", header: "Seats", align: "end", sortable: true, value: (c) => c.seats },
  {
    id: "joined",
    header: "Joined",
    sortable: true,
    value: (c) => c.joined,
    cell: (c) => (
      <span className="text-muted-foreground">{c.hoursAgo != null ? ago(c.hoursAgo) : longDate(c.joined)}</span>
    ),
  },
  { id: "amount", header: "Monthly", align: "end", sortable: true, value: (c) => c.amount, cell: (c) => yen(c.amount) },
];

const statusFilter: DataTableFilter<Customer>[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    value: (c) => c.status,
    options: (Object.keys(tones) as Status[]).map((s) => ({ id: s, label: s, tone: tones[s] })),
  },
];

export interface OperationsHomeProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
  avatars?: Record<string, string>;
}

export function OperationsHome({
  user = { name: "Yuna Sato", email: "yuna@shirakaba.example" },
  avatars = {},
  ...props
}: OperationsHomeProps) {
  const [regions, setRegions] = useState<Region[]>([...REGIONS]);
  const [range, setRange] = useState<Range>("monthly");
  const [published, setPublished] = useState<Record<Region, number>>({ Hokkaido: 0, Tōhoku: 0, Chūbu: 0, Kyūshū: 0 });
  const [composing, setComposing] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = regions.length < REGIONS.length;
  const customers = useMemo(() => CUSTOMERS.filter((c) => regions.includes(c.region)), [regions]);
  const signups = customers.filter((c) => c.hoursAgo != null).slice(0, 4);
  const thisWeek = customers.filter((c) => c.hoursAgo != null && c.hoursAgo < 24 * 7).length;
  const season = useMemo(() => earnings(regions), [regions]);
  const revenue = useMemo(() => revenueSeries(regions, range), [regions, range]);
  const last = revenue.data[revenue.data.length - 1];
  const before = revenue.data[revenue.data.length - 2];
  const bulletins = useMemo(() => {
    const out = pick(regions, BULLETINS);
    out[out.length - 1] += sum(regions.map((r) => published[r]));
    return out;
  }, [regions, published]);
  const today = bulletins[bulletins.length - 1];
  const regionText = filtered ? regions.join(", ") : "all regions";

  const crumbs = [
    <Breadcrumb key="org" href="#">
      Shirakaba
    </Breadcrumb>,
    <Breadcrumb key="page">Home</Breadcrumb>,
  ];

  const actions = (
    <>
      <Dropdown>
        <Button
          variant="secondary"
          size="sm"
          iconStart={<SlidersHorizontal />}
          aria-label={filtered ? `Filters, ${regions.length} of ${REGIONS.length} regions` : "Filters"}
          className="max-sm:px-2.5"
        >
          <span className="max-sm:sr-only">Filters</span>
          {filtered && (
            <span className="-me-1 ms-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs text-brand-foreground tabular-nums">
              {regions.length}
            </span>
          )}
        </Button>
        <DropdownMenu
          placement="bottom end"
          popoverClassName="w-56"
          indicator="check"
          onAction={(key) => key === "all" && setRegions([...REGIONS])}
        >
          <DropdownSection
            title="Regions"
            selectionMode="multiple"
            disallowEmptySelection
            selectedKeys={regions}
            onSelectionChange={(keys) => {
              if (keys === "all") return setRegions([...REGIONS]);
              setRegions(REGIONS.filter((r) => keys.has(r)));
            }}
          >
            {REGIONS.map((r) => (
              <DropdownItem key={r} id={r}>
                {r}
              </DropdownItem>
            ))}
          </DropdownSection>
          <DropdownSeparator />
          <DropdownItem id="all" isDisabled={!filtered}>
            Show all regions
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <Button size="sm" iconStart={<Plus />} onPress={() => setComposing(true)}>
        New bulletin
      </Button>
    </>
  );

  return (
    <Frame
      {...props}
      teams={teams}
      items={navItems}
      groups={navGroups}
      current="home"
      user={{ ...user, avatar: user.avatar ?? avatars[user.name] }}
      crumbs={crumbs}
      actions={actions}
    >
      <Toaster position="bottom-right" />
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-balance text-foreground">
            Good morning, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            Thursday 25 February 2027 · {today} {today === 1 ? "bulletin" : "bulletins"} issued today across{" "}
            {regionText}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @min-[720px]/main:grid-cols-12">
        <GhostBars
          className="@min-[720px]/main:col-span-7 @min-[1040px]/main:col-span-8"
          label="Earned this season"
          value={yen(season.total)}
          delta={season.delta}
          caption="since 1 August"
          labels={season.labels}
          titles={season.titles}
          data={season.data}
          previous={season.previous}
          currentName="This season"
          previousName="Last season"
          format={yen}
          formatAxis={yenAxis}
          height={208}
        />

        <ChartCard
          className="@min-[720px]/main:col-span-5 @min-[1040px]/main:col-span-4"
          label="Recent sign-ups"
          value={thisWeek}
          caption="this week"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="-me-2 text-muted-foreground data-[hovered]:text-foreground"
              onPress={() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              View all
            </Button>
          }
        >
          {signups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sign-ups in these regions yet.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {signups.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                  <Avatar src={avatars[c.contact ?? ""]} name={c.contact} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-5 font-medium text-foreground">{c.contact}</p>
                    <p className="truncate text-[13px] leading-5 text-muted-foreground">
                      {c.role}, {c.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs leading-4 text-muted-foreground tabular-nums">{ago(c.hoursAgo ?? 0)}</span>
                    <Badge size="sm" tone="neutral">
                      {c.plan}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <LineChart
          className="@min-[720px]/main:col-span-12 @min-[1040px]/main:col-span-5"
          label="Revenue"
          value={yen(last)}
          delta={last / before - 1}
          caption={revenue.caption}
          data={revenue.data}
          labels={revenue.labels}
          titles={revenue.titles}
          name="Revenue"
          format={yen}
          formatAxis={yenAxis}
          height={168}
          action={
            <SegmentedControl
              size="sm"
              aria-label="Revenue period"
              selectedKeys={[range]}
              onSelectionChange={(keys) => {
                const [key] = keys;
                if (key) setRange(key as Range);
              }}
            >
              <Segment id="weekly">Weekly</Segment>
              <Segment id="monthly">Monthly</Segment>
              <Segment id="yearly">Yearly</Segment>
            </SegmentedControl>
          }
        />

        <YearGrid
          className="@min-[720px]/main:col-span-12 @min-[1040px]/main:col-span-7"
          label="Bulletins this year"
          name="Bulletins"
          value={formatNumber(sum(bulletins))}
          caption={`to ${shortDate(TODAY)}`}
          year={2027}
          data={bulletins}
        />

        <div ref={tableRef} className="scroll-mt-4 pt-4 @min-[720px]/main:col-span-12">
          <DataTable
            columns={columns}
            rows={customers}
            searchKeys={["name", "town", "region"]}
            filters={statusFilter}
            noun={["customer", "customers"]}
            description={`Forecast subscriptions in ${regionText}, billed monthly.`}
            pageSize={8}
            pageSizes={[8, 16, 32]}
            rowActions={[
              { id: "view", label: "View account", icon: <Eye /> },
              { id: "invoice", label: "Send invoice", icon: <Receipt /> },
            ]}
            bulkActions={[{ id: "export", label: "Export", icon: <Download /> }]}
            onAction={(action, rows) => {
              if (action === "invoice") toast.success(`Invoice sent to ${rows[0]?.name}`);
              if (action === "export")
                toast.success(`Exported ${rows.length} ${rows.length === 1 ? "customer" : "customers"}`);
              if (action === "view")
                toast(`${rows[0]?.name}`, { description: `${rows[0]?.plan} plan, ${rows[0]?.seats} seats` });
            }}
          />
        </div>
      </div>

      <BulletinDrawer
        isOpen={composing}
        onOpenChange={setComposing}
        onPublish={(region, title) => {
          setPublished((p) => ({ ...p, [region]: p[region] + 1 }));
          setComposing(false);
          toast.success("Bulletin published", { description: `${title}, ${region}` });
        }}
      />
    </Frame>
  );
}

function BulletinDrawer({
  isOpen,
  onOpenChange,
  onPublish,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (region: Region, title: string) => void;
}) {
  const [region, setRegion] = useState<Region>("Hokkaido");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const ready = title.trim() !== "" && body.trim() !== "";

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} aria-label="New bulletin">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          onPublish(region, title.trim());
          setTitle("");
          setBody("");
        }}
      >
        <DrawerHeader>
          <DrawerTitle>New bulletin</DrawerTitle>
          <p className="text-[13px] text-muted-foreground">Sent to every subscriber in the region within a minute.</p>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-4 py-3">
          <Select label="Region" value={region} onChange={(key) => key && setRegion(key as Region)}>
            {REGIONS.map((r) => (
              <SelectItem key={r} id={r}>
                {r}
              </SelectItem>
            ))}
          </Select>
          <TextField
            label="Headline"
            placeholder="Heavy snow on the Sea of Japan coast"
            value={title}
            onChange={setTitle}
            isRequired
          />
          <TextArea
            label="Message"
            placeholder="What to expect, where, and until when."
            value={body}
            onChange={setBody}
            minRows={5}
            maxLength={280}
            isRequired
          />
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!ready}>
            Publish bulletin
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
