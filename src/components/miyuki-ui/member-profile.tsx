"use client";

import {
  AtSign,
  Bot,
  Clock,
  Coins,
  CreditCard,
  Flame,
  House,
  Link,
  ListChecks,
  PanelLeft,
  Pencil,
  Share2,
  Sparkles,
  Trees,
  TrendingUp,
  Users,
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
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { Dropdown, DropdownItem, DropdownMenu } from "@/components/miyuki-ui/dropdown";
import { FigureCard } from "@/components/miyuki-ui/figure-cards";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { formatCompact, formatNumber, PeriodStepper } from "@/components/miyuki-ui/lib/chart";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { RankedBars } from "@/components/miyuki-ui/ranked-bars";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/miyuki-ui/table";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { Toaster, toast } from "@/components/miyuki-ui/toast";
import { YearGrid, type YearGridGrouping } from "@/components/miyuki-ui/year-grid";
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
const dateNum = (n: number) => dateOf(n).getUTCDate();
const monthOf = (n: number) => dateOf(n).getUTCMonth();
const yearOf = (n: number) => dateOf(n).getUTCFullYear();
const shortDate = (n: number) => `${dateNum(n)} ${MONTHS[monthOf(n)]}`;

const TODAY = dayOf(2027, 1, 25);
const JOINED = dayOf(2025, 2, 3);
const YEARS = [2025, 2026, 2027];

const AGENTS = [
  { name: "Spec writer", tokens: 41_800, weight: 1.3 },
  { name: "Design critic", tokens: 17_600, weight: 1.6 },
  { name: "Research assistant", tokens: 63_200, weight: 0.8 },
  { name: "Copy editor", tokens: 8_900, weight: 1.1 },
  { name: "Asset exporter", tokens: 2_700, weight: 0.9 },
  { name: "Changelog writer", tokens: 11_400, weight: 0.5 },
];

const RUNS: number[][] = (() => {
  const rng = createRng("mei-runs");
  const out: number[][] = [];
  let lull = 0;
  for (let d = JOINED; d <= TODAY; d++) {
    const dow = (d + 4) % 7;
    const weekend = dow === 0 || dow === 6;
    const age = (d - JOINED) / (TODAY - JOINED);
    if (lull <= 0 && rng() < 0.012) lull = rng.int(3, 9);
    const quiet = lull-- > 0;
    const streak = d >= TODAY - 22;
    const gap = d === TODAY - 23;
    let total = weekend ? (rng() < 0.55 ? 0 : rng.int(1, 6)) : Math.round(rng.range(6, 30) * (0.55 + age * 0.75));
    if (quiet) total = rng() < 0.7 ? 0 : 1;
    if (streak) total = Math.max(total, rng.int(2, 5));
    if (gap) total = 0;
    if (d === dayOf(2027, 0, 12)) total = 64;
    const drift = AGENTS.map((a, i) => a.weight * (1 + 0.5 * Math.sin(age * 6 + i * 1.7)) * rng.range(0.6, 1.4));
    const sum = drift.reduce((a, b) => a + b, 0);
    const split = drift.map((w) => Math.floor((w / sum) * total));
    let left = total - split.reduce((a, b) => a + b, 0);
    for (let i = 0; left > 0; i = (i + 1) % split.length, left--) split[(i + d) % split.length]++;
    out.push(split);
  }
  return out;
})();

const daily = (d: number) => (d < JOINED || d > TODAY ? 0 : RUNS[d - JOINED].reduce((a, b) => a + b, 0));
const lifetimeTokens = RUNS.reduce((sum, day) => sum + day.reduce((s, runs, i) => s + runs * AGENTS[i].tokens, 0), 0);

function yearData(year: number) {
  const first = dayOf(year, 0, 1);
  const last = Math.min(dayOf(year, 11, 31), TODAY);
  return Array.from({ length: last - first + 1 }, (_, i) => daily(first + i));
}

const PEAK = (() => {
  let best = JOINED;
  for (let d = JOINED; d <= TODAY; d++) if (daily(d) > daily(best)) best = d;
  return best;
})();

const STREAK = (() => {
  let n = 0;
  for (let d = TODAY; d >= JOINED && daily(d) > 0; d--) n++;
  return n;
})();

interface Task {
  id: string;
  title: string;
  agent: string;
  started: string;
  minutes: number;
  tokens: number;
  status: "Running" | "Needs review" | "Done" | "Stopped";
}

const TASKS: Task[] = [
  {
    id: "t1",
    title: "Compare snow-depth widgets for the lock screen",
    agent: "Design critic",
    started: "Today, 10:42",
    minutes: 18,
    tokens: 21_300,
    status: "Running",
  },
  {
    id: "t2",
    title: "Draft the spec for offline trail maps",
    agent: "Spec writer",
    started: "Today, 09:15",
    minutes: 74,
    tokens: 88_400,
    status: "Needs review",
  },
  {
    id: "t3",
    title: "Export icons for the avalanche bulletin",
    agent: "Asset exporter",
    started: "Today, 08:50",
    minutes: 6,
    tokens: 2_900,
    status: "Done",
  },
  {
    id: "t4",
    title: "Summarise ten interviews with ski patrol",
    agent: "Research assistant",
    started: "Yesterday, 16:30",
    minutes: 96,
    tokens: 141_200,
    status: "Done",
  },
  {
    id: "t5",
    title: "Tighten onboarding copy to two lines",
    agent: "Copy editor",
    started: "Yesterday, 14:05",
    minutes: 11,
    tokens: 7_600,
    status: "Done",
  },
  {
    id: "t6",
    title: "Write the 4.12 release notes",
    agent: "Changelog writer",
    started: "Yesterday, 11:20",
    minutes: 9,
    tokens: 10_800,
    status: "Stopped",
  },
];

const taskTone: Record<Task["status"], BadgeTone> = {
  Running: "brand",
  "Needs review": "warning",
  Done: "success",
  Stopped: "neutral",
};

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => ({ year: i < 10 ? 2026 : 2027, month: (i + 2) % 12 }));

function agentMonth({ year, month }: { year: number; month: number }) {
  const first = dayOf(year, month, 1);
  const last = Math.min(dayOf(year, month + 1, 0), TODAY);
  const totals = AGENTS.map(() => 0);
  for (let d = first; d <= last; d++) RUNS[d - JOINED]?.forEach((runs, i) => (totals[i] += runs));
  return { totals, partial: last < dayOf(year, month + 1, 0), last };
}

const duration = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} m` : `${minutes} m`;

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

const teams = [{ id: "pine", name: "Paper and Pine", plan: "Studio plan, 12 members", logo: <Trees /> }];

const navItems: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House />, href: "#" },
  { id: "agents", label: "Agents", icon: <Bot />, count: AGENTS.length, href: "#" },
  { id: "tasks", label: "Tasks", icon: <ListChecks />, count: 2, countTone: "solid", href: "#" },
];

const navGroups: FloatingSidebarGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "members", label: "Members", icon: <Users />, href: "#" },
      { id: "usage", label: "Usage", icon: <TrendingUp />, href: "#" },
      { id: "billing", label: "Billing", icon: <CreditCard />, href: "#" },
    ],
  },
];

export interface MemberProfileProps extends ComponentProps<"div"> {
  cover?: string;
  avatars?: Record<string, string>;
}

export function MemberProfile({ cover, avatars = {}, ...props }: MemberProfileProps) {
  const [profile, setProfile] = useState({
    name: "Mei Watanabe",
    role: "Product designer",
    bio: "Designs the field apps. Writes specs with agents and reviews everything they make.",
  });
  const [year, setYear] = useState(2027);
  const [grouping, setGrouping] = useState<YearGridGrouping>("weekly");
  const [monthIndex, setMonthIndex] = useState(MONTH_KEYS.length - 1);
  const [editing, setEditing] = useState(false);

  const avatar = avatars["Mei Watanabe"];
  const runs = useMemo(() => yearData(year), [year]);
  const yearRuns = runs.reduce((a, b) => a + b, 0);
  const key = MONTH_KEYS[monthIndex];
  const agents = useMemo(() => agentMonth(key), [key]);
  const monthRuns = agents.totals.reduce((a, b) => a + b, 0);
  const monthLabel = agents.partial
    ? `1–${dateNum(agents.last)} ${MONTH_NAMES[key.month]}`
    : `${MONTH_NAMES[key.month]} ${key.year}`;

  const crumbs = [
    <Breadcrumb key="org" href="#">
      Paper and Pine
    </Breadcrumb>,
    <Breadcrumb key="list" href="#" className="max-sm:hidden">
      Members
    </Breadcrumb>,
    <Breadcrumb key="page">{profile.name}</Breadcrumb>,
  ];

  const copy = (text: string, done: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success(done, { description: text });
  };

  const actions = (
    <>
      <Dropdown>
        <Button variant="secondary" size="sm" iconStart={<Share2 />} aria-label="Share" className="max-sm:px-2.5">
          <span className="max-sm:sr-only">Share</span>
        </Button>
        <DropdownMenu
          placement="bottom end"
          popoverClassName="w-56"
          onAction={(action) => {
            if (action === "link") copy("https://paperandpine.example/members/meiwatanabe", "Profile link copied");
            if (action === "handle") copy("@meiwatanabe", "Handle copied");
          }}
        >
          <DropdownItem id="link" icon={<Link />}>
            Copy profile link
          </DropdownItem>
          <DropdownItem id="handle" icon={<AtSign />}>
            Copy handle
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <Button size="sm" iconStart={<Pencil />} onPress={() => setEditing(true)}>
        Edit profile
      </Button>
    </>
  );

  return (
    <Frame
      {...props}
      teams={teams}
      items={navItems}
      groups={navGroups}
      current="members"
      user={{ name: profile.name, email: "mei@paperandpine.example", avatar }}
      crumbs={crumbs}
      actions={actions}
    >
      <Toaster position="bottom-right" />

      <section className="mt-3">
        <div className="relative h-36 overflow-hidden rounded-2xl bg-muted @min-[720px]/main:h-48">
          {cover && <img src={cover} alt="" className="size-full object-cover" />}
          <div aria-hidden="true" className="absolute inset-0 rounded-2xl ring-1 ring-foreground/8 ring-inset" />
        </div>
        <div className="flex flex-col gap-4 px-1 @min-[720px]/main:flex-row @min-[720px]/main:items-start @min-[720px]/main:px-6">
          <Avatar
            src={avatar}
            name={profile.name}
            size="xl"
            className="-mt-12 shadow-md ring-4 ring-background"
            style={{ width: 96, height: 96 }}
          />
          <div className="min-w-0 flex-1 @min-[720px]/main:pt-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground">{profile.name}</h1>
              <Badge tone="brand" icon={<Sparkles aria-hidden="true" />}>
                Pro plan
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">@meiwatanabe · {profile.role} · Otaru</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pretty text-foreground">{profile.bio}</p>
          </div>
          <dl className="flex shrink-0 gap-6 text-sm @min-[720px]/main:pt-4">
            <div>
              <dt className="text-xs leading-4 text-muted-foreground">Joined</dt>
              <dd className="mt-1 font-medium text-foreground">3 Mar 2025</dd>
            </div>
            <div>
              <dt className="text-xs leading-4 text-muted-foreground">Agents used</dt>
              <dd className="mt-1 font-medium text-foreground tabular-nums">{AGENTS.length} of 9</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 @min-[560px]/main:grid-cols-2 @min-[1040px]/main:grid-cols-12">
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          icon={<Coins />}
          label="Lifetime tokens"
          value={
            <>
              {formatCompact(lifetimeTokens)}
              <span className="ms-2 text-sm font-normal tracking-normal text-muted-foreground">since March 2025</span>
            </>
          }
          info={`${formatNumber(lifetimeTokens)} tokens across ${formatNumber(RUNS.flat().reduce((a, b) => a + b, 0))} runs.`}
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          icon={<TrendingUp />}
          label="Peak day"
          value={
            <>
              {daily(PEAK)} runs
              <span className="ms-2 text-sm font-normal tracking-normal text-muted-foreground">
                {shortDate(PEAK)} {yearOf(PEAK)}
              </span>
            </>
          }
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          icon={<Clock />}
          label="Longest task"
          value={
            <>
              3 h 42 m<span className="ms-2 text-sm font-normal tracking-normal text-muted-foreground">on 12 Jan</span>
            </>
          }
          info="Rewrite of the field kit spec by the spec writer, on the peak day."
        />
        <FigureCard
          className="@min-[1040px]/main:col-span-3"
          icon={<Flame />}
          label="Current streak"
          value={
            <>
              {STREAK} days
              <span className="ms-2 text-sm font-normal tracking-normal text-muted-foreground">
                since {shortDate(TODAY - STREAK + 1)}
              </span>
            </>
          }
        />

        <YearGrid
          className="@min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-12"
          label={`Runs in ${year}`}
          name="Runs"
          value={formatNumber(yearRuns)}
          caption={year === 2027 ? `to ${shortDate(TODAY)}` : year === 2025 ? `since ${shortDate(JOINED)}` : "in all"}
          year={year}
          data={runs}
          stats={false}
          grouping={grouping}
          onGroupingChange={setGrouping}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <PeriodStepper
                previousLabel="Previous year"
                nextLabel="Next year"
                onPrevious={() => setYear((y) => Math.max(YEARS[0], y - 1))}
                onNext={() => setYear((y) => Math.min(YEARS[YEARS.length - 1], y + 1))}
                isPreviousDisabled={year === YEARS[0]}
                isNextDisabled={year === YEARS[YEARS.length - 1]}
                labelClassName="min-w-10"
              >
                {year}
              </PeriodStepper>
              <SegmentedControl
                size="sm"
                aria-label="Group days"
                selectedKeys={[grouping]}
                onSelectionChange={(keys) => {
                  const [next] = keys;
                  if (next) setGrouping(next as YearGridGrouping);
                }}
              >
                <Segment id="weekly">Weekly</Segment>
                <Segment id="monthly">Monthly</Segment>
                <Segment id="yearly">Yearly</Segment>
              </SegmentedControl>
            </div>
          }
        />

        <RankedBars
          className="@min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-5 @min-[1040px]/main:self-start"
          label="Agents"
          value={formatNumber(monthRuns)}
          caption={`runs, ${monthLabel}`}
          data={AGENTS.map((a, i) => ({ name: a.name, value: agents.totals[i] })).sort((a, b) => b.value - a.value)}
          format={formatNumber}
          limit={6}
          action={
            <PeriodStepper
              previousLabel="Previous month"
              nextLabel="Next month"
              onPrevious={() => setMonthIndex((i) => Math.max(0, i - 1))}
              onNext={() => setMonthIndex((i) => Math.min(MONTH_KEYS.length - 1, i + 1))}
              isPreviousDisabled={monthIndex === 0}
              isNextDisabled={monthIndex === MONTH_KEYS.length - 1}
              labelClassName="min-w-[4.75rem]"
            >
              {MONTHS[key.month]} {key.year}
            </PeriodStepper>
          }
        />

        <section
          aria-label="Recent tasks"
          className="min-w-0 @min-[560px]/main:col-span-2 @min-[1040px]/main:col-span-7"
        >
          <div className="flex items-baseline justify-between gap-3 px-1 pb-3">
            <h2 className="text-[15px] leading-6 font-semibold text-foreground">Recent tasks</h2>
            <span className="text-[13px] text-muted-foreground">Today and yesterday</span>
          </div>
          <Table aria-label="Recent tasks" className="shadow-sm" density="compact">
            <TableHeader>
              <Column isRowHeader>Task</Column>
              <Column className="text-end">Time</Column>
              <Column className="text-end">Tokens</Column>
              <Column>Status</Column>
            </TableHeader>
            <TableBody items={TASKS}>
              {(t) => (
                <Row id={t.id}>
                  <Cell className="min-w-64">
                    <span className="flex flex-col py-0.5">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {t.agent} · {t.started}
                      </span>
                    </span>
                  </Cell>
                  <Cell className="text-end whitespace-nowrap">{duration(t.minutes)}</Cell>
                  <Cell className="text-end whitespace-nowrap">{formatNumber(t.tokens)}</Cell>
                  <Cell className="whitespace-nowrap">
                    <Badge tone={taskTone[t.status]} size="sm" dot>
                      {t.status}
                    </Badge>
                  </Cell>
                </Row>
              )}
            </TableBody>
          </Table>
        </section>
      </div>

      <EditDrawer
        isOpen={editing}
        onOpenChange={setEditing}
        profile={profile}
        onSave={(next) => {
          setProfile(next);
          setEditing(false);
          toast.success("Profile saved");
        }}
      />
    </Frame>
  );
}

interface Profile {
  name: string;
  role: string;
  bio: string;
}

function EditDrawer({
  isOpen,
  onOpenChange,
  profile,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSave: (profile: Profile) => void;
}) {
  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} aria-label="Edit profile">
      {isOpen && <EditForm profile={profile} onSave={onSave} onCancel={() => onOpenChange(false)} />}
    </Drawer>
  );
}

function EditForm({
  profile,
  onSave,
  onCancel,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const ready = draft.name.trim() !== "";
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSave({ name: draft.name.trim(), role: draft.role.trim(), bio: draft.bio.trim() });
      }}
    >
      <DrawerHeader>
        <DrawerTitle>Edit profile</DrawerTitle>
        <p className="text-[13px] text-muted-foreground">Everyone in Paper and Pine can see this.</p>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4 py-3">
        <TextField label="Name" value={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} isRequired />
        <TextField label="Role" value={draft.role} onChange={(role) => setDraft((d) => ({ ...d, role }))} />
        <TextArea
          label="About"
          value={draft.bio}
          onChange={(bio) => setDraft((d) => ({ ...d, bio }))}
          minRows={4}
          maxLength={160}
        />
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isDisabled={!ready}>
          Save profile
        </Button>
      </DrawerFooter>
    </form>
  );
}
