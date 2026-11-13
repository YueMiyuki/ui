"use client";

import {
  ArrowLeftRight,
  Boxes,
  Building2,
  ChartLine,
  CreditCard,
  Download,
  Flame,
  Gem,
  Globe,
  GraduationCap,
  House,
  Landmark,
  Package,
  Palette,
  PanelLeft,
  PiggyBank,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wallet,
  Zap,
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
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/miyuki-ui/data-table";
import { Drawer } from "@/components/miyuki-ui/drawer";
import { FigureCard } from "@/components/miyuki-ui/figure-cards";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { HeatmapChart } from "@/components/miyuki-ui/heatmap-chart";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { chartRamp, formatCompact, formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { LineChart } from "@/components/miyuki-ui/line-chart";
import { RankedBars } from "@/components/miyuki-ui/ranked-bars";
import { SankeyChart, type SankeyChartLink, type SankeyChartNode } from "@/components/miyuki-ui/sankey-chart";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
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
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY = 86_400_000;

const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) / DAY;
const dateOf = (n: number) => new Date(n * DAY);
const dateNum = (n: number) => dateOf(n).getUTCDate();
const monthOf = (n: number) => dateOf(n).getUTCMonth();
const shortDate = (n: number) => `${dateNum(n)} ${MONTHS[monthOf(n)]}`;
const mondayIndex = (n: number) => (n + 3) % 7;

const TODAY = dayOf(2027, 1, 25);
const START = dayOf(2026, 10, 1);
const HISTORY = dayOf(2025, 11, 1);

type Source = "Shop sales" | "Online store" | "Workshops" | "Commissions";
type Category =
  | "Glass and colour"
  | "Furnace gas"
  | "Electricity"
  | "Rent"
  | "Insurance"
  | "Wages"
  | "Courier"
  | "Packaging"
  | "Card fees";
type Group = "Making" | "People" | "Studio" | "Selling";
type Kind = "Income" | "Expense" | "Transfer";

interface Txn {
  id: string;
  day: number;
  description: string;
  kind: Kind;
  category: Source | Category | "Savings" | "Investments";
  account: string;
  amount: number;
}

const GROUP: Record<Category, Group> = {
  "Glass and colour": "Making",
  "Furnace gas": "Making",
  Electricity: "Making",
  Wages: "People",
  Rent: "Studio",
  Insurance: "Studio",
  Courier: "Selling",
  Packaging: "Selling",
  "Card fees": "Selling",
};

const ICONS: Record<Txn["category"], ReactNode> = {
  "Shop sales": <Store />,
  "Online store": <Globe />,
  Workshops: <GraduationCap />,
  Commissions: <Gem />,
  "Glass and colour": <Palette />,
  "Furnace gas": <Flame />,
  Electricity: <Zap />,
  Rent: <Building2 />,
  Insurance: <ShieldCheck />,
  Wages: <Users />,
  Courier: <Truck />,
  Packaging: <Package />,
  "Card fees": <CreditCard />,
  Savings: <PiggyBank />,
  Investments: <ChartLine />,
};

const COMMISSIONS: [number, string, number][] = [
  [dayOf(2026, 10, 12), "Canal Ryokan, 40 lamp shades", 352_000],
  [dayOf(2026, 11, 9), "Hakuba Powder Lodge, bar glasses", 186_000],
  [dayOf(2027, 0, 20), "Lake Tōya hotel, chandelier deposit", 420_000],
  [dayOf(2027, 1, 18), "Niseko Snow Lodge, 120 tumblers", 264_000],
];

function buildTransactions(): Txn[] {
  const rng = createRng("tsurara-ledger");
  const out: Omit<Txn, "id">[] = [];
  const shopByMonth = new Map<number, number>();
  const add = (
    day: number,
    description: string,
    kind: Kind,
    category: Txn["category"],
    amount: number,
    account = "Studio account",
  ) => out.push({ day, description, kind, category, account, amount: Math.round(amount / 10) * 10 });

  for (let d = START; d <= TODAY; d++) {
    const date = dateNum(d);
    const month = monthOf(d);
    const dow = mondayIndex(d);
    const winter = month === 11 || month === 0 || month === 1;
    const festival = month === 1 && date >= 5 && date <= 14;
    const key = dateOf(d).getUTCFullYear() * 12 + month;

    if (dow !== 1) {
      const base = dow >= 5 ? 86_000 : 54_000;
      const amount = base * (festival ? 1.5 : winter ? 1.12 : 1) * rng.range(0.78, 1.24);
      add(d, "Shop card payout", "Income", "Shop sales", amount);
      shopByMonth.set(key, (shopByMonth.get(key) ?? 0) + amount);
    }
    if (dow === 0)
      add(d, "Online store payout", "Income", "Online store", rng.range(92_000, 168_000) * (month === 11 ? 1.6 : 1));
    if (dow === 4)
      add(d, "Workshop bookings", "Income", "Workshops", rng.range(58_000, 128_000) * (month === 1 ? 1.3 : 1));
    for (const [day, text, amount] of COMMISSIONS) if (day === d) add(d, text, "Income", "Commissions", amount);

    if (date === 1) add(d, "Studio rent, Canal Warehouse 3", "Expense", "Rent", -220_000);
    if (date === 2) {
      add(d, "Transfer to savings", "Transfer", "Savings", -200_000);
      add(d, "Index fund contribution", "Transfer", "Investments", -150_000);
    }
    if (date === 3) add(d, "Studio and stock insurance", "Expense", "Insurance", -18_400);
    if (date === 5) {
      const last = shopByMonth.get(key - 1) ?? 1_500_000;
      add(d, "Card terminal fees", "Expense", "Card fees", -last * 0.019);
    }
    if (date === 10) add(d, "Gas for the furnace", "Expense", "Furnace gas", -rng.range(118_000, 142_000));
    if (date === 12) add(d, "Electricity for the kilns", "Expense", "Electricity", -rng.range(58_000, 72_000));
    if (date === 25) add(d, "Payroll, three staff", "Expense", "Wages", -612_000);
    if (date % 9 === 4) add(d, "Glass batch delivery", "Expense", "Glass and colour", -rng.range(68_000, 108_000));
    if (date === 8 || date === 22)
      add(d, "Colour rods and frit", "Expense", "Glass and colour", -rng.range(18_000, 34_000));
    if (dow === 2)
      add(d, "Courier pickups", "Expense", "Courier", -rng.range(12_000, 24_000) * (month === 11 ? 1.7 : 1));
    if (date === 6 || date === 20) add(d, "Boxes and wrapping", "Expense", "Packaging", -rng.range(9_000, 19_000));
  }

  return out
    .map((t, i) => ({ ...t, id: `t${i}` }))
    .sort((a, b) => b.day - a.day || Math.abs(b.amount) - Math.abs(a.amount));
}

const TRANSACTIONS = buildTransactions();

function buildPortfolio(): number[] {
  const rng = createRng("tsurara-index-fund");
  const out: number[] = [];
  let value = 1_240_000;
  for (let d = HISTORY; d <= TODAY; d++) {
    if (dateNum(d) === 2) value += 150_000;
    const step = (rng() + rng() + rng() - 1.5) * 0.0068 + 0.0003;
    value *= 1 + step;
    out.push(Math.round(value));
  }
  return out;
}

const PORTFOLIO = buildPortfolio();
const portfolioAt = (d: number) => PORTFOLIO[Math.min(d, TODAY) - HISTORY];

const OPENING = { studio: 1_860_000, savings: 4_210_000 };

function cashAt(d: number) {
  let studio = OPENING.studio;
  let savings = OPENING.savings;
  for (const t of TRANSACTIONS) {
    if (t.day > d) continue;
    studio += t.amount;
    if (t.category === "Savings") savings -= t.amount;
  }
  return studio + savings;
}

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

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const yen = (v: number) => `¥${formatNumber(v)}`;
const yenAxis = (v: number) => `¥${formatCompact(v)}`;
const signed = (v: number) => `${v > 0 ? "+" : "−"}¥${formatNumber(Math.abs(v))}`;

function summarise(period: Period) {
  const { first, last } = bounds(period);
  const days = last - first + 1;
  const prev = bounds({ year: period.month === 0 ? period.year - 1 : period.year, month: (period.month + 11) % 12 });
  const prevLast = Math.min(prev.end, prev.first + days - 1);
  const inRange = (a: number, b: number) => TRANSACTIONS.filter((t) => t.day >= a && t.day <= b);
  const rows = inRange(first, last);
  const before = inRange(prev.first, prevLast);
  const total = (list: Txn[], kind: Kind) => Math.abs(sum(list.filter((t) => t.kind === kind).map((t) => t.amount)));
  const partial = last < bounds(period).end;
  return {
    rows,
    income: total(rows, "Income"),
    incomeBefore: total(before, "Income"),
    expenses: total(rows, "Expense"),
    expensesBefore: total(before, "Expense"),
    balance: cashAt(last),
    balanceBefore: cashAt(first - 1),
    invested: portfolioAt(last),
    investedBefore: portfolioAt(first - 1),
    since: partial
      ? `vs 1–${dateNum(prevLast)} ${MONTH_NAMES[monthOf(prevLast)]}`
      : `vs ${MONTH_NAMES[monthOf(prevLast)]}`,
    endText: `${dateNum(first - 1)} ${MONTH_NAMES[monthOf(first - 1)]}`,
    partial,
    first,
    last,
  };
}

const SOURCES: Source[] = ["Shop sales", "Online store", "Workshops", "Commissions"];
const GROUPS: Group[] = ["Making", "People", "Studio", "Selling"];

function flows(rows: Txn[]): { nodes: SankeyChartNode[]; links: SankeyChartLink[] } {
  const by = (key: string) => Math.abs(sum(rows.filter((t) => t.category === key).map((t) => t.amount)));
  const income = SOURCES.map((s): [string, number] => [s, by(s)]).filter(([, v]) => v > 0);
  const groups = GROUPS.map((g): [string, number] => [
    g,
    Math.abs(sum(rows.filter((t) => t.kind === "Expense" && GROUP[t.category as Category] === g).map((t) => t.amount))),
  ]).filter(([, v]) => v > 0);
  const saved = by("Savings");
  const invested = by("Investments");
  const totalIn = sum(income.map(([, v]) => v));
  const totalOut = sum(groups.map(([, v]) => v)) + saved + invested;
  const kept = totalIn - totalOut;
  const nodes: SankeyChartNode[] = [
    ...income.map(([id], i) => ({ id, color: `var(--chart-${[1, 2, 3, 6][i]})` })),
    ...(kept < 0 ? [{ id: "From reserves", color: "var(--muted-foreground)" }] : []),
    { id: "Studio account", color: "var(--brand-strong)" },
    ...groups.map(([id]) => ({ id })),
    { id: "Savings", color: "var(--chart-2)" },
    { id: "Investments", color: "var(--chart-3)" },
    ...(kept > 0 ? [{ id: "Kept in account", color: "var(--brand)" }] : []),
  ];
  const links: SankeyChartLink[] = [
    ...income.map(([id, value]) => ({ source: id, target: "Studio account", value })),
    ...(kept < 0 ? [{ source: "From reserves", target: "Studio account", value: -kept }] : []),
    ...groups.map(([id, value]) => ({ source: "Studio account", target: id, value })),
    { source: "Studio account", target: "Savings", value: saved },
    { source: "Studio account", target: "Investments", value: invested },
    ...(kept > 0 ? [{ source: "Studio account", target: "Kept in account", value: kept }] : []),
  ];
  return { nodes, links };
}

function calendar(period: Period) {
  const { first, end } = bounds(period);
  const start = first - mondayIndex(first);
  const weeks = Math.ceil((end - start + 1) / 7);
  const spend = new Map<number, number>();
  for (const t of TRANSACTIONS) if (t.kind === "Expense") spend.set(t.day, (spend.get(t.day) ?? 0) - t.amount);
  const rows = Array.from({ length: weeks }, (_, w) => start + w * 7);
  let busiest = first;
  for (let d = first; d <= Math.min(end, TODAY); d++) if ((spend.get(d) ?? 0) > (spend.get(busiest) ?? 0)) busiest = d;
  return {
    busiest: { day: busiest, value: spend.get(busiest) ?? 0 },
    rows: rows.map(shortDate),
    rowTitles: rows.map((d) => `Week of ${shortDate(d)}`),
    data: rows.map((d) => WEEKDAYS.map((_, i) => (d + i <= TODAY ? (spend.get(d + i) ?? 0) : 0))),
  };
}

type Span = "half" | "year";

function portfolioSeries(period: Period, span: Span) {
  const { last } = bounds(period);
  const count = span === "half" ? 7 : 13;
  const days = Array.from({ length: count }, (_, i) =>
    i === count - 1 ? last : dayOf(period.year, period.month - (count - 1 - i), 0),
  );
  let paidIn = 0;
  for (let d = days[0] + 1; d <= last; d++) if (dateNum(d) === 2) paidIn += 150_000;
  return {
    paidIn,
    data: days.map(portfolioAt),
    labels: days.map((d) => MONTHS[monthOf(d)]),
    titles: days.map((d) => `${shortDate(d)} ${dateOf(d).getUTCFullYear()}`),
  };
}

const kindTone: Record<Kind, BadgeTone> = { Income: "success", Expense: "neutral", Transfer: "brand" };

const columns: DataTableColumn<Txn>[] = [
  {
    id: "description",
    header: "Transaction",
    isRowHeader: true,
    sortable: true,
    value: (t) => t.description,
    cell: (t) => (
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground [&_svg]:size-4"
        >
          {ICONS[t.category]}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{t.description}</span>
          <span className="truncate text-[13px] font-normal text-muted-foreground">{t.account}</span>
        </span>
      </span>
    ),
  },
  { id: "date", header: "Date", sortable: true, value: (t) => t.day, cell: (t) => shortDate(t.day) },
  { id: "category", header: "Category", sortable: true, value: (t) => t.category },
  {
    id: "type",
    header: "Type",
    value: (t) => t.kind,
    cell: (t) => (
      <Badge tone={kindTone[t.kind]} size="sm" dot>
        {t.kind}
      </Badge>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    align: "end",
    sortable: true,
    value: (t) => t.amount,
    cell: (t) => (
      <span className={cn("font-medium", t.amount > 0 ? "text-success-strong" : "text-foreground")}>
        {signed(t.amount)}
      </span>
    ),
  },
];

const typeFilter: DataTableFilter<Txn>[] = [
  {
    id: "type",
    label: "Type",
    allLabel: "All types",
    value: (t) => t.kind,
    options: (Object.keys(kindTone) as Kind[]).map((k) => ({ id: k, label: k, tone: kindTone[k] })),
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

const teams = [{ id: "tsurara", name: "Tsurara Glass", plan: "Studio in Otaru, 4 people", logo: <Gem /> }];

const navItems: FloatingSidebarItem[] = [
  { id: "overview", label: "Overview", icon: <House />, href: "#" },
  { id: "finance", label: "Finance", icon: <Wallet />, href: "#" },
  { id: "orders", label: "Orders", icon: <ShoppingBag />, count: 6, countTone: "solid", href: "#" },
  { id: "workshops", label: "Workshops", icon: <GraduationCap />, href: "#" },
  { id: "stock", label: "Stock", icon: <Boxes />, href: "#" },
];

const navGroups: FloatingSidebarGroup[] = [
  {
    label: "Accounts",
    items: [
      { id: "studio", label: "Studio account", icon: <Landmark />, href: "#" },
      { id: "savings", label: "Savings", icon: <PiggyBank />, href: "#" },
      { id: "transfers", label: "Transfers", icon: <ArrowLeftRight />, href: "#" },
    ],
  },
];

export interface StudioLedgerProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
}

export function StudioLedger({
  user = { name: "Haruto Ishikawa", email: "haruto@tsurara.example" },
  ...props
}: StudioLedgerProps) {
  const [index, setIndex] = useState(PERIODS.length - 1);
  const [span, setSpan] = useState<Span>("half");
  const period = PERIODS[index];
  const month = MONTH_NAMES[period.month];
  const s = useMemo(() => summarise(period), [period]);
  const wide = useMedia("(min-width: 640px)", true);
  const cash = useMemo(() => flows(s.rows), [s]);
  const cashLists = useMemo(() => {
    const list = (side: "source" | "target") =>
      cash.links
        .filter((l) => (side === "source" ? l.target : l.source) === "Studio account" && l.value > 0)
        .map((l) => ({ name: l[side], value: l.value }))
        .sort((a, b) => b.value - a.value);
    return [
      { id: "in", name: "Money in", data: list("source") },
      { id: "out", name: "Where it went", data: list("target") },
    ];
  }, [cash]);
  const heat = useMemo(() => calendar(period), [period]);
  const portfolio = useMemo(() => portfolioSeries(period, span), [period, span]);
  const categories = useMemo(() => {
    const by = new Map<string, number>();
    for (const t of s.rows) if (t.kind === "Expense") by.set(t.category, (by.get(t.category) ?? 0) - t.amount);
    return [...by.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, icon: ICONS[name as Category] }));
  }, [s]);
  const monthDays = s.last - s.first + 1;
  const range = s.partial ? `1–${dateNum(s.last)} ${month} ${period.year}` : `${month} ${period.year}`;

  const crumbs = [
    <Breadcrumb key="org" href="#">
      Tsurara Glass
    </Breadcrumb>,
    <Breadcrumb key="page">Finance</Breadcrumb>,
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
        variant="secondary"
        size="sm"
        iconStart={<Download />}
        className="max-sm:px-2.5"
        aria-label="Export transactions"
        onPress={() => toast.success(`Exported ${s.rows.length} transactions`, { description: range })}
      >
        <span className="max-sm:sr-only">Export</span>
      </Button>
    </>
  );

  return (
    <Frame
      {...props}
      teams={teams}
      items={navItems}
      groups={navGroups}
      current="finance"
      user={user}
      crumbs={crumbs}
      actions={actions}
    >
      <Toaster position="bottom-right" />
      <div className="mt-3 mb-6">
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground">Money in and out</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {range} · Studio account and savings
          {s.partial ? `, ${monthDays} days so far` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 @min-[560px]/main:grid-cols-2 @min-[1040px]/main:grid-cols-12">
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Wallet />}
          label="Total balance"
          value={yen(s.balance)}
          delta={s.balance / s.balanceBefore - 1}
          comparison={`vs ${s.endText}`}
          info="Studio account and savings together. The index fund is counted under invested."
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Landmark />}
          label="Income"
          value={yen(s.income)}
          delta={s.income / s.incomeBefore - 1}
          comparison={s.since}
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          variant="band"
          icon={<Receipt />}
          label="Expenses"
          value={yen(s.expenses)}
          delta={s.expenses / s.expensesBefore - 1}
          invertDelta
          comparison={s.since}
          info="Money spent running the studio. Transfers to savings and the index fund are not expenses."
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          variant="band"
          icon={<ChartLine />}
          label="Invested"
          value={yen(s.invested)}
          delta={s.invested / s.investedBefore - 1}
          comparison={`vs ${s.endText}`}
        />

        {wide ? (
          <SankeyChart
            className="@min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-12"
            label="Cash flow"
            value={yen(s.income)}
            caption={`in, ${range}`}
            nodes={cash.nodes}
            links={cash.links}
            format={yen}
            height={300}
            nodePadding={14}
          />
        ) : (
          <RankedBars
            className="@min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-12"
            label="Cash flow"
            value={yen(s.income)}
            caption={`in, ${range}`}
            groups={cashLists}
            format={yen}
            limit={8}
          />
        )}

        <RankedBars
          className="@min-[560px]/main:col-span-2 @min-[800px]/main:col-span-1 @min-[1040px]/main:col-span-4"
          label="Spending by category"
          value={yen(s.expenses)}
          caption={range}
          data={categories}
          format={yen}
          limit={6}
        />

        <LineChart
          className="@min-[560px]/main:col-span-2 @min-[800px]/main:col-span-1 @min-[1040px]/main:col-span-5"
          label="Portfolio"
          value={yen(portfolio.data[portfolio.data.length - 1])}
          delta={portfolio.data[portfolio.data.length - 1] / portfolio.data[0] - 1}
          caption={`over ${span === "half" ? 6 : 12} months, ${yen(portfolio.paidIn)} paid in`}
          name="Index fund"
          data={portfolio.data}
          labels={portfolio.labels}
          titles={portfolio.titles}
          format={yen}
          formatAxis={yenAxis}
          height={196}
          action={
            <SegmentedControl
              size="sm"
              aria-label="Portfolio span"
              selectedKeys={[span]}
              onSelectionChange={(keys) => {
                const [key] = keys;
                if (key) setSpan(key as Span);
              }}
            >
              <Segment id="half">6 months</Segment>
              <Segment id="year">12 months</Segment>
            </SegmentedControl>
          }
        />

        <HeatmapChart
          className="@min-[560px]/main:col-span-2 @min-[800px]/main:col-span-1 @min-[1040px]/main:col-span-3"
          label="Daily spending"
          value={yen(Math.round(s.expenses / monthDays))}
          caption="a day on average"
          name="Spent"
          rows={heat.rows}
          rowTitles={heat.rowTitles}
          columns={WEEKDAYS}
          columnTitles={WEEKDAY_NAMES}
          data={heat.data}
          format={yen}
          formatLegend={yenAxis}
          colors={chartRamp}
          thresholds={[20_000, 60_000, 120_000, 400_000]}
          cellHeight={30}
          footer={
            <div className="flex flex-col gap-2.5 text-xs leading-4 text-muted-foreground">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="tabular-nums">¥0</span>
                <span className="flex flex-1 gap-0.5">
                  {chartRamp.map((color) => (
                    <span
                      key={color}
                      className="h-2 flex-1 rounded-[2px] first:rounded-l-full last:rounded-r-full"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="tabular-nums">¥400K+</span>
              </div>
              <p className="text-[13px] leading-5 tabular-nums">
                Most spent on {WEEKDAY_NAMES[mondayIndex(heat.busiest.day)]} {shortDate(heat.busiest.day)},{" "}
                <span className="font-medium text-foreground">{yen(heat.busiest.value)}</span>
              </p>
            </div>
          }
        />

        <div className="pt-4 @min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-12">
          <DataTable
            key={index}
            columns={columns}
            rows={s.rows}
            searchKeys={["description", "category", "account"]}
            filters={typeFilter}
            noun={["transaction", "transactions"]}
            description={`${range}, newest first.`}
            pageSize={10}
            rowActions={[
              { id: "receipt", label: "View receipt", icon: <Receipt /> },
              { id: "category", label: "Change category", icon: <Palette /> },
            ]}
            bulkActions={[{ id: "export", label: "Export", icon: <Download /> }]}
            onAction={(action, rows) => {
              if (action === "export")
                toast.success(`Exported ${rows.length} ${rows.length === 1 ? "transaction" : "transactions"}`);
              if (action === "receipt")
                toast(rows[0]?.description, {
                  description: `${shortDate(rows[0]?.day ?? TODAY)}, ${signed(rows[0]?.amount ?? 0)}`,
                });
              if (action === "category")
                toast("Categories are set by the bookkeeping rules", { description: rows[0]?.category });
            }}
          />
        </div>
      </div>
    </Frame>
  );
}
