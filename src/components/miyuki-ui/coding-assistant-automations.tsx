"use client";

import {
  CalendarClock,
  Copy,
  Ellipsis,
  GitBranch,
  GitPullRequest,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Checkbox } from "@/components/miyuki-ui/checkbox";
import {
  EASE_OUT,
  MetaDot,
  ModelPicker,
  modelLabel,
  PageBody,
  PageHeader,
  type ProjectId,
  projectBranches,
  projectIds,
  useClock,
  useSettings,
} from "@/components/miyuki-ui/coding-assistant-shared";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { Dropdown, DropdownItem, DropdownMenu, DropdownSeparator } from "@/components/miyuki-ui/dropdown";
import { EmptyState } from "@/components/miyuki-ui/empty-state";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { AlertDialog } from "@/components/miyuki-ui/modal";
import { MorphIcon, type MorphShapes } from "@/components/miyuki-ui/path-morph";
import { RunChecklist, type RunStep } from "@/components/miyuki-ui/run-checklist";
import { SearchField } from "@/components/miyuki-ui/search-field";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Switch } from "@/components/miyuki-ui/switch";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { toast } from "@/components/miyuki-ui/toast";
import { cn } from "@/lib/utils";

export type Frequency = "30min" | "hourly" | "daily" | "weekdays" | "weekly";
export type EventKind = "pr-opened" | "issue-labelled" | "push-main" | "feed-changed";
export type Trigger =
  | { kind: "schedule"; frequency: Frequency; time: string; weekday: string }
  | { kind: "event"; event: EventKind };
export type RunStatus = "succeeded" | "failed" | "running";
export type ProjectScope = ProjectId | "all";

export interface AutomationRun {
  id: string;
  status: RunStatus;
  started: string;
  ago: string;
  duration: string;
  outcome: string;
  reason?: string;
  chat?: string;
  startedAt?: number;
  steps?: string[];
}

export interface Automation {
  id: string;
  name: string;
  instructions: string;
  summary: string;
  trigger: Trigger;
  project: ProjectScope;
  branch: string;
  model: string;
  effort: number;
  notifyEmail: boolean;
  notifyChat: boolean;
  active: boolean;
  next: string;
  runs: AutomationRun[];
}

export type AutomationDraft = Omit<Automation, "id" | "summary" | "active" | "next" | "runs">;

const RUN_STEP_MS = 1250;

const frequencies: { id: Frequency; name: string }[] = [
  { id: "30min", name: "Every 30 minutes" },
  { id: "hourly", name: "Hourly" },
  { id: "daily", name: "Daily" },
  { id: "weekdays", name: "Weekdays" },
  { id: "weekly", name: "Weekly" },
];

const eventKinds: { id: EventKind; name: string; description: string }[] = [
  { id: "pr-opened", name: "Pull request opened", description: "Someone opens a pull request in the project" },
  { id: "issue-labelled", name: "Issue labelled", description: "An issue gets the agent label" },
  { id: "push-main", name: "Push to main", description: "Commits land on the main branch" },
  {
    id: "feed-changed",
    name: "Upstream feed changed",
    description: "A data feed the project reads publishes new data",
  },
];

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const times = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

export function triggerLabel(trigger: Trigger) {
  if (trigger.kind === "event") {
    return {
      "pr-opened": "When a pull request opens",
      "issue-labelled": "When an issue is labelled",
      "push-main": "When someone pushes to main",
      "feed-changed": "When the upstream feed changes",
    }[trigger.event];
  }
  switch (trigger.frequency) {
    case "30min":
      return "Every 30 minutes";
    case "hourly":
      return "Hourly";
    case "daily":
      return `Every day at ${trigger.time}`;
    case "weekdays":
      return `Weekdays at ${trigger.time}`;
    default:
      return `${trigger.weekday}s at ${trigger.time}`;
  }
}

function nextLabel(trigger: Trigger) {
  if (trigger.kind === "event")
    return trigger.event === "pr-opened" ? "Waits for a pull request" : "Waits for its event";
  if (trigger.frequency === "30min") return "Next in 30m";
  if (trigger.frequency === "hourly") return "Next in 1h";
  if (trigger.frequency === "weekly") return `Next on ${trigger.weekday}`;
  return `Next at ${trigger.time}`;
}

function summarize(instructions: string) {
  const first = instructions.trim().split(/(?<=\.)\s/)[0] ?? "";
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}

const schedule = (
  frequency: Frequency,
  time = "05:45",
  weekday = "Monday",
): Extract<Trigger, { kind: "schedule" }> => ({
  kind: "schedule",
  frequency,
  time,
  weekday,
});

export const initialAutomations: Automation[] = [
  {
    id: "morning-check",
    name: "Morning forecast check",
    instructions:
      "Load the forecast page with the 05:00 readings and report stations whose feels-like value looks wrong. Compare each value with the air temperature and wind, and flag any station that differs by more than 3 °C.",
    summary: "Loads the forecast page with the 05:00 readings and reports stations whose feels-like value looks wrong.",
    trigger: schedule("daily", "05:45"),
    project: "forecast-web",
    branch: "main",
    model: "standard",
    effort: 1,
    notifyEmail: true,
    notifyChat: true,
    active: true,
    next: "Next in 21h",
    runs: [
      {
        id: "mc-3",
        status: "succeeded",
        started: "Today, 05:45",
        ago: "3h ago",
        duration: "1m 12s",
        outcome: "All 1,284 stations look right.",
        chat: "feels-like",
      },
      {
        id: "mc-2",
        status: "succeeded",
        started: "Yesterday, 05:45",
        ago: "1d ago",
        duration: "1m 08s",
        outcome: "Niseko Annupuri reported wind in m/s. Converted and flagged for review.",
        chat: "feels-like",
      },
      {
        id: "mc-1",
        status: "succeeded",
        started: "Sunday, 05:45",
        ago: "2d ago",
        duration: "1m 15s",
        outcome: "All 1,284 stations look right.",
        chat: "feels-like",
      },
    ],
  },
  {
    id: "review-prs",
    name: "Review new pull requests",
    instructions:
      "Read each new pull request, run the station tests, and leave a short review with anything that would break the forecast page.",
    summary: "Reads each new pull request, runs the station tests and leaves a short review.",
    trigger: { kind: "event", event: "pr-opened" },
    project: "forecast-web",
    branch: "main",
    model: "fine",
    effort: 2,
    notifyEmail: false,
    notifyChat: true,
    active: true,
    next: "Waits for a pull request",
    runs: [
      {
        id: "rp-2",
        status: "succeeded",
        started: "Today, 08:16",
        ago: "26m ago",
        duration: "2m 40s",
        outcome: "Reviewed “Snow depth axis starts at zero”. Two suggestions, tests pass.",
        chat: "snow-axis",
      },
      {
        id: "rp-1",
        status: "succeeded",
        started: "Yesterday, 16:02",
        ago: "1d ago",
        duration: "3m 05s",
        outcome: "Reviewed “Load station history on demand”. Approved.",
        chat: "slow-list",
      },
    ],
  },
  {
    id: "proofread",
    name: "Proofread the bulletin",
    instructions:
      "Before the Friday bulletin goes out, check spelling, units and every link, and make sure the avalanche warning reads the same in light and night.",
    summary: "Checks spelling, units and links in the Friday bulletin before it goes out.",
    trigger: schedule("weekly", "07:30", "Friday"),
    project: "bulletin-mailer",
    branch: "main",
    model: "standard",
    effort: 1,
    notifyEmail: true,
    notifyChat: false,
    active: true,
    next: "Next in 3d",
    runs: [
      {
        id: "pb-2",
        status: "failed",
        started: "Friday, 07:30",
        ago: "6d ago",
        duration: "48s",
        outcome: "Stopped before sending the report.",
        reason: "The link to the Hakuba report returned 404.",
        chat: "bulletin",
      },
      {
        id: "pb-1",
        status: "succeeded",
        started: "Friday 6 Feb, 07:30",
        ago: "2w ago",
        duration: "1m 02s",
        outcome: "Fixed two units and one broken link.",
        chat: "bulletin",
      },
    ],
  },
  {
    id: "tide-watch",
    name: "Tide feed watch",
    instructions:
      "Read the harbour office feed and tell the team in the project chat when it has been quiet for more than an hour.",
    summary: "Tells the team when the harbour office feed has been quiet for more than an hour.",
    trigger: schedule("30min"),
    project: "harbour-feed",
    branch: "main",
    model: "flurry",
    effort: 0,
    notifyEmail: false,
    notifyChat: true,
    active: true,
    next: "Next in 18m",
    runs: [
      {
        id: "tw-2",
        status: "succeeded",
        started: "Today, 08:30",
        ago: "12m ago",
        duration: "9s",
        outcome: "Feed fresh, last reading 4 minutes old.",
        chat: "tides",
      },
      {
        id: "tw-1",
        status: "succeeded",
        started: "Today, 08:00",
        ago: "42m ago",
        duration: "8s",
        outcome: "Feed fresh, last reading 7 minutes old.",
        chat: "tides",
      },
    ],
  },
  {
    id: "radar-cache",
    name: "Warm the radar tile cache",
    instructions:
      "Build the next 12 radar frames for Hokkaido ahead of the morning peak, so the map opens without a wait.",
    summary: "Builds the next 12 radar frames ahead of the morning peak.",
    trigger: schedule("hourly"),
    project: "radar-tiles",
    branch: "tile-cache",
    model: "flurry",
    effort: 0,
    notifyEmail: false,
    notifyChat: false,
    active: false,
    next: "Next in 1h",
    runs: [
      {
        id: "rc-1",
        status: "succeeded",
        started: "Tuesday, 04:00",
        ago: "5d ago",
        duration: "6m 10s",
        outcome: "Built 1,284 tiles.",
        chat: "radar-flicker",
      },
    ],
  },
  {
    id: "deps",
    name: "Dependency updates",
    instructions:
      "Check every project for outdated packages, open one pull request per project with safe updates, and list anything that needs a closer look.",
    summary: "Opens one pull request per project with safe package updates.",
    trigger: schedule("weekly", "09:00", "Monday"),
    project: "all",
    branch: "main",
    model: "standard",
    effort: 1,
    notifyEmail: true,
    notifyChat: true,
    active: true,
    next: "Next in 6d",
    runs: [
      {
        id: "dp-1",
        status: "succeeded",
        started: "Monday, 09:00",
        ago: "4d ago",
        duration: "7m 31s",
        outcome: "Opened 3 pull requests. motion needs a closer look.",
        chat: "slow-list",
      },
    ],
  },
];

function runStepsFor(automation: Automation) {
  if (automation.id === "morning-check") {
    return ["Load the forecast page", "Read the 05:00 readings", "Check feels-like values", "Write the report"];
  }
  return [`Check out ${automation.branch}`, "Follow the instructions", "Check the result", "Write a summary"];
}

function outcomeFor(automation: Automation) {
  if (automation.id === "morning-check") return "All 1,284 stations look right.";
  if (automation.id === "proofread") return "Spelling, units and links all check out.";
  if (automation.id === "tide-watch") return "Feed fresh, last reading 2 minutes old.";
  return "Finished with nothing to report.";
}

export function draftOf(automation?: Automation, defaults = { model: "standard", effort: 1 }): AutomationDraft {
  return automation
    ? {
        name: automation.name,
        instructions: automation.instructions,
        trigger: automation.trigger,
        project: automation.project,
        branch: automation.branch,
        model: automation.model,
        effort: automation.effort,
        notifyEmail: automation.notifyEmail,
        notifyChat: automation.notifyChat,
      }
    : {
        name: "",
        instructions: "",
        trigger: schedule("daily", "06:00"),
        project: "forecast-web",
        branch: "main",
        model: defaults.model,
        effort: defaults.effort,
        notifyEmail: true,
        notifyChat: false,
      };
}

export function useAutomations() {
  const [items, setItems] = useState(initialAutomations);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const patch = (id: string, change: (a: Automation) => Automation) =>
    setItems((all) => all.map((a) => (a.id === id ? change(a) : a)));

  function toggle(id: string, active: boolean) {
    const target = items.find((a) => a.id === id);
    patch(id, (a) => ({ ...a, active }));
    if (target) toast(active ? `Resumed “${target.name}”` : `Paused “${target.name}”`, { duration: 3000 });
  }

  function save(draft: AutomationDraft, id?: string) {
    if (id) {
      patch(id, (a) => ({ ...a, ...draft, summary: summarize(draft.instructions), next: nextLabel(draft.trigger) }));
      return id;
    }
    const next = `automation-${++seq.current}`;
    setItems((all) => [
      {
        ...draft,
        id: next,
        summary: summarize(draft.instructions),
        active: true,
        next: nextLabel(draft.trigger),
        runs: [],
      },
      ...all,
    ]);
    return next;
  }

  function duplicate(id: string) {
    const source = items.find((a) => a.id === id);
    if (!source) return id;
    const next = `automation-${++seq.current}`;
    setItems((all) => {
      const index = all.findIndex((a) => a.id === id);
      const copy = { ...source, id: next, name: `${source.name} (copy)`, active: false, runs: [] };
      return [...all.slice(0, index + 1), copy, ...all.slice(index + 1)];
    });
    return next;
  }

  function remove(id: string) {
    setItems((all) => all.filter((a) => a.id !== id));
  }

  function runNow(id: string) {
    const target = items.find((a) => a.id === id);
    if (!target || target.runs[0]?.status === "running") return;
    const steps = runStepsFor(target);
    const runId = `run-${++seq.current}`;
    const startedAt = Date.now();
    patch(id, (a) => ({
      ...a,
      runs: [
        {
          id: runId,
          status: "running",
          started: "Just now",
          ago: "now",
          duration: "",
          outcome: "",
          startedAt,
          steps,
          chat: a.runs[0]?.chat,
        },
        ...a.runs,
      ],
    }));
    timers.current.push(
      window.setTimeout(() => {
        const outcome = outcomeFor(target);
        patch(id, (a) => ({
          ...a,
          runs: a.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: "succeeded",
                  ago: "just now",
                  duration: `${(steps.length * RUN_STEP_MS) / 1000} s`,
                  outcome,
                }
              : r,
          ),
        }));
        toast.success(`“${target.name}” finished`, { description: outcome, duration: 4000 });
      }, steps.length * RUN_STEP_MS),
    );
  }

  return useMemo(() => ({ items, toggle, save, duplicate, remove, runNow }), [items]);
}

export type AutomationStore = ReturnType<typeof useAutomations>;

const statusShapes: MorphShapes = {
  succeeded: [
    "M12 3.5C16.69 3.5 20.5 7.31 20.5 12C20.5 16.69 16.69 20.5 12 20.5C7.31 20.5 3.5 16.69 3.5 12C3.5 7.31 7.31 3.5 12 3.5Z",
    "M8.25 12.25L10.75 14.75L15.75 9.5",
  ],
  failed: [
    "M12 3.5C16.69 3.5 20.5 7.31 20.5 12C20.5 16.69 16.69 20.5 12 20.5C7.31 20.5 3.5 16.69 3.5 12C3.5 7.31 7.31 3.5 12 3.5Z",
    "M9.25 9.25L12 12L14.75 14.75M14.75 9.25L12 12L9.25 14.75",
  ],
  running: [
    "M12 3.5C16.69 3.5 20.5 7.31 20.5 12C20.5 16.69 16.69 20.5 12 20.5C7.31 20.5 3.5 16.69 3.5 12C3.5 7.31 7.31 3.5 12 3.5Z",
    "M12 12L12 12",
  ],
  none: [
    "M12 3.5C16.69 3.5 20.5 7.31 20.5 12C20.5 16.69 16.69 20.5 12 20.5C7.31 20.5 3.5 16.69 3.5 12C3.5 7.31 7.31 3.5 12 3.5Z",
    "M8.5 12L15.5 12",
  ],
};

function StatusMark({ status, className }: { status: RunStatus | "none"; className?: string }) {
  return (
    <MorphIcon
      shapes={statusShapes}
      shape={status}
      size={14}
      strokeWidth={2}
      className={cn(
        "shrink-0 transition-colors duration-300",
        status === "succeeded" && "text-success",
        status === "failed" && "text-destructive",
        status === "running" && "text-brand motion-safe:animate-pulse",
        status === "none" && "text-muted-foreground",
        className,
      )}
    />
  );
}

function lastRunText(automation: Automation) {
  const last = automation.runs[0];
  if (!last) return { status: "none" as const, text: "No runs yet" };
  if (last.status === "running") return { status: "running" as const, text: "Running now" };
  return {
    status: last.status,
    text: `${last.status === "failed" ? "Failed" : "Succeeded"} ${last.ago}`,
  };
}

function TriggerIcon({ trigger }: { trigger: Trigger }) {
  if (trigger.kind === "event") return trigger.event === "pr-opened" ? <GitPullRequest /> : <Zap />;
  return <CalendarClock />;
}

function MetaLine({ automation, className }: { automation: Automation; className?: string }) {
  const last = lastRunText(automation);
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <TriggerIcon trigger={automation.trigger} />
        {triggerLabel(automation.trigger)}
      </span>
      <MetaDot />
      <span className="font-mono text-xs">{automation.project === "all" ? "All projects" : automation.project}</span>
      <MetaDot />
      <span className={cn("inline-flex items-center gap-1.5", last.status === "failed" && "text-destructive")}>
        <StatusMark status={last.status} />
        {last.text}
      </span>
      <MetaDot />
      <span className="tabular-nums">{automation.active ? automation.next : "Paused"}</span>
    </p>
  );
}

type Filter = "all" | "active" | "paused";

export const AutomationsList = memo(function AutomationsList({
  store,
  highlight,
  onOpen,
  onNew,
}: {
  store: AutomationStore;
  highlight: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const counts = {
    all: store.items.length,
    active: store.items.filter((a) => a.active).length,
    paused: store.items.filter((a) => !a.active).length,
  };
  const needle = query.trim().toLocaleLowerCase();
  const shown = store.items.filter(
    (a) =>
      (filter === "all" || (filter === "active" ? a.active : !a.active)) &&
      (!needle || `${a.name} ${a.summary} ${a.project}`.toLocaleLowerCase().includes(needle)),
  );

  return (
    <PageBody>
      <PageHeader
        title="Automations"
        description="Runs the agent starts on its own, on a schedule or when something happens in a project."
        actions={
          <Button iconStart={<Plus />} onPress={onNew}>
            New automation
          </Button>
        }
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="Show"
          size="sm"
          selectedKeys={[filter]}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key != null) setFilter(String(key) as Filter);
          }}
        >
          {(["all", "active", "paused"] as const).map((id) => (
            <Segment key={id} id={id}>
              {id === "all" ? "All" : id === "active" ? "Active" : "Paused"}
              <span className="text-muted-foreground tabular-nums">{counts[id]}</span>
            </Segment>
          ))}
        </SegmentedControl>
        <SearchField
          size="sm"
          aria-label="Search automations"
          placeholder="Search automations"
          value={query}
          onChange={setQuery}
          className="min-w-48 flex-1 sm:max-w-72"
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          size="sm"
          bordered
          className="mt-4"
          illustration={needle ? "search" : "inbox"}
          title={
            needle
              ? `No automations match “${query.trim()}”`
              : filter === "paused"
                ? "Nothing is paused"
                : filter === "active"
                  ? "Nothing is running on its own"
                  : "No automations yet"
          }
          description={
            needle
              ? "Try another word, or clear the search."
              : filter === "paused"
                ? "Paused automations wait here until you turn them back on."
                : "Start one to check the forecast every morning or review new pull requests."
          }
          actions={
            needle ? (
              <Button variant="secondary" size="sm" onPress={() => setQuery("")}>
                Clear search
              </Button>
            ) : filter === "all" ? (
              <Button size="sm" iconStart={<Plus />} onPress={onNew}>
                New automation
              </Button>
            ) : null
          }
        />
      ) : (
        <ul aria-label="Automations" className="mt-4 overflow-clip rounded-xl border border-border bg-card shadow-xs">
          <AnimatePresence initial={false}>
            {shown.map((a) => (
              <motion.li
                key={a.id}
                layout={reduce ? false : "position"}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.16 } }}
                transition={{ height: { duration: 0.22, ease: EASE_OUT }, opacity: { duration: 0.18 } }}
                className="border-b border-border last:border-b-0"
              >
                <div
                  data-automation-row={a.id}
                  className={cn(
                    "group/row relative flex items-start gap-4 px-4 py-3.5 transition-colors duration-700 ease-settle",
                    "has-[[data-row-link]:hover]:bg-accent/40",
                    highlight === a.id ? "bg-brand-soft duration-150" : "bg-transparent",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      data-row-link=""
                      onClick={() => onOpen(a.id)}
                      className="cursor-default text-start text-sm leading-5 font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring focus-visible:after:ring-inset"
                    >
                      {a.name}
                    </button>
                    <p className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">{a.summary}</p>
                    <MetaLine automation={a} className="mt-2" />
                  </div>
                  <Switch
                    size="sm"
                    aria-label={`${a.name}, ${a.active ? "on" : "paused"}`}
                    isSelected={a.active}
                    onChange={(on) => store.toggle(a.id, on)}
                    className="relative z-10 mt-0.5 shrink-0"
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </PageBody>
  );
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-5 text-foreground">{children}</dd>
    </div>
  );
}

function LiveRun({ run }: { run: AutomationRun }) {
  const running = run.status === "running";
  const now = useClock(running, 200);
  const steps = run.steps ?? [];
  const elapsed = running && run.startedAt && now ? now - run.startedAt : steps.length * RUN_STEP_MS;
  const done = running ? Math.min(steps.length, Math.floor(elapsed / RUN_STEP_MS)) : steps.length;
  const [open, setOpen] = useState(true);
  const [wasRunning, setWasRunning] = useState(running);
  if (wasRunning !== running) {
    setWasRunning(running);
    if (!running) setOpen(false);
  }
  const list: RunStep[] = steps.map((label, i) => ({
    id: `${run.id}-${i}`,
    label,
    status: i < done ? "done" : i === done && running ? "running" : running ? "pending" : "done",
  }));
  return (
    <RunChecklist
      steps={list}
      outcome={running ? "running" : "done"}
      summary={
        running
          ? `Running now · ${steps.length - done} of ${steps.length} steps left`
          : `Succeeded just now · ${run.duration}`
      }
      strikeDone
      expanded={open}
      onExpandedChange={setOpen}
      aria-label="Current run"
      className="shadow-none"
    />
  );
}

export const AutomationDetail = memo(function AutomationDetail({
  automation,
  onBack,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenChat,
  store,
}: {
  automation: Automation;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenChat: (id: string) => void;
  store: AutomationStore;
}) {
  const [confirm, setConfirm] = useState(false);
  const running = automation.runs[0]?.status === "running";
  const t = automation.trigger;
  return (
    <PageBody className="@container">
      <PageHeader
        back={{ label: "Automations", onPress: onBack }}
        title={automation.name}
        description={automation.summary}
        aside={
          <Switch
            aria-label={`${automation.name}, ${automation.active ? "on" : "paused"}`}
            isSelected={automation.active}
            onChange={(on) => store.toggle(automation.id, on)}
            className="mt-1 shrink-0"
          />
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Play />}
              isDisabled={running}
              onPress={() => store.runNow(automation.id)}
            >
              Run now
            </Button>
            <Button variant="secondary" size="sm" iconStart={<Pencil />} onPress={() => onEdit(automation.id)}>
              Edit
            </Button>
            <Dropdown>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="More actions"
                className="text-muted-foreground data-[hovered]:text-foreground aria-expanded:bg-accent"
              >
                <Ellipsis />
              </IconButton>
              <DropdownMenu
                placement="bottom end"
                onAction={(key) => {
                  if (key === "duplicate") onDuplicate(automation.id);
                  else if (key === "delete") setConfirm(true);
                }}
              >
                <DropdownItem id="duplicate" icon={<Copy />}>
                  Duplicate
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem id="delete" icon={<Trash />} tone="destructive">
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        }
      />
      <div className="mt-7 grid gap-x-10 gap-y-8 @3xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby={`${automation.id}-instructions`} className="flex flex-col gap-2">
            <h2 id={`${automation.id}-instructions`} className="text-sm leading-5 font-medium text-foreground">
              Instructions
            </h2>
            <p className="rounded-xl bg-muted/70 px-4 py-3.5 text-sm leading-6 text-pretty whitespace-pre-line text-foreground ring-1 ring-border/60 ring-inset">
              {automation.instructions}
            </p>
          </section>
          <section aria-labelledby={`${automation.id}-history`} className="flex flex-col gap-2">
            <h2 id={`${automation.id}-history`} className="text-sm leading-5 font-medium text-foreground">
              Run history
            </h2>
            {automation.runs.length === 0 ? (
              <EmptyState
                size="sm"
                bordered
                illustration="start"
                title="No runs yet"
                description={`It runs ${triggerLabel(t).toLowerCase()}, or you can run it now.`}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    iconStart={<Play />}
                    onPress={() => store.runNow(automation.id)}
                  >
                    Run now
                  </Button>
                }
              />
            ) : (
              <ol aria-label="Runs" className="flex flex-col">
                <AnimatePresence initial={false}>
                  {automation.runs.map((run) => (
                    <motion.li
                      key={run.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{
                        height: { duration: 0.24, ease: EASE_OUT },
                        opacity: { duration: 0.2, delay: 0.05 },
                      }}
                      className="border-b border-border last:border-b-0"
                    >
                      {run.steps ? (
                        <div className="py-3">
                          <LiveRun run={run} />
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3">
                          <StatusMark status={run.status} className="mt-[3px]" />
                          <div className="min-w-0 flex-1 basis-56">
                            <p className="text-sm leading-5 text-foreground">
                              <span className={cn("font-medium", run.status === "failed" && "text-destructive")}>
                                {run.status === "failed" ? "Failed" : "Succeeded"}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {" "}
                                · {run.started} · {run.duration}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">
                              {run.outcome}
                            </p>
                            {run.reason && (
                              <p className="mt-2 rounded-lg bg-destructive-soft px-3 py-2 text-[13px] leading-5 text-destructive-strong">
                                {run.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 ps-7 sm:ps-0">
                            {run.status === "failed" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                iconStart={<RotateCcw />}
                                isDisabled={running}
                                onPress={() => store.runNow(automation.id)}
                                className="h-7 rounded-md px-2.5 text-[13px]"
                              >
                                Retry
                              </Button>
                            )}
                            {run.chat && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onPress={() => onOpenChat(run.chat as string)}
                                className="h-7 rounded-md px-2.5 text-[13px] text-muted-foreground data-[hovered]:text-foreground"
                              >
                                Open chat
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            )}
          </section>
        </div>
        <dl className="flex flex-col gap-5 @3xl:border-s @3xl:border-border @3xl:ps-6">
          <Field label="Trigger">
            <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
              <TriggerIcon trigger={t} />
              {triggerLabel(t)}
            </span>
            <span className="block text-[13px] text-muted-foreground tabular-nums">
              {automation.active ? automation.next : "Paused"}
            </span>
          </Field>
          <Field label="Project and branch">
            <span className="font-mono text-[13px]">
              {automation.project === "all" ? "All projects" : automation.project}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <GitBranch aria-hidden="true" className="size-3" />
              {automation.branch}
            </span>
          </Field>
          <Field label="Model and effort">{modelLabel(automation.model, automation.effort)}</Field>
          <Field label="Notifications">
            {automation.notifyEmail || automation.notifyChat ? (
              <span className="flex flex-col">
                {automation.notifyEmail && <span>Email when it fails</span>}
                {automation.notifyChat && <span>Summary in the project chat</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </Field>
        </dl>
      </div>
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={`Delete “${automation.name}”?`}
        actionLabel="Delete automation"
        tone="destructive"
        icon={<Trash />}
        onAction={() => onDelete(automation.id)}
      >
        It stops running and its history is deleted. Chats it started stay where they are.
      </AlertDialog>
    </PageBody>
  );
});

function sameDraft(a: AutomationDraft, b: AutomationDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function AutomationSheet({
  open,
  automation,
  onClose,
  onSave,
}: {
  open: boolean;
  automation?: Automation;
  onClose: () => void;
  onSave: (draft: AutomationDraft) => void;
}) {
  const { settings } = useSettings();
  const defaults = { model: settings.defaultModel, effort: settings.defaultEffort };
  const [initial, setInitial] = useState(() => draftOf(automation, defaults));
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? (automation?.id ?? "new") : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      const fresh = draftOf(automation, defaults);
      setInitial(fresh);
      setDraft(fresh);
      setTried(false);
    }
  }
  const form = useRef<HTMLFormElement>(null);
  const set = <K extends keyof AutomationDraft>(k: K, v: AutomationDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const nameMissing = !draft.name.trim();
  const textMissing = !draft.instructions.trim();
  const dirty = !sameDraft(draft, initial);
  const trigger = draft.trigger;

  function requestClose() {
    if (dirty) setConfirm(true);
    else onClose();
  }

  function submit() {
    setTried(true);
    if (nameMissing || textMissing) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), instructions: draft.instructions.trim() });
  }

  const setTrigger = (next: Partial<Extract<Trigger, { kind: "schedule" }>>) => {
    const base = trigger.kind === "schedule" ? trigger : schedule("daily", "06:00");
    set("trigger", { ...base, ...next });
  };

  return (
    <>
      <Drawer
        isOpen={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        aria-label={automation ? "Edit automation" : "New automation"}
        className="w-[30rem]"
      >
        <form
          ref={form}
          className="contents"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>{automation ? "Edit automation" : "New automation"}</DrawerTitle>
            <p className="text-[13px] leading-5 text-muted-foreground">
              {automation ? "Changes apply from the next run." : "It runs on its own once you save it."}
            </p>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-5 py-3">
            <TextField
              label="Name"
              value={draft.name}
              onChange={(v) => set("name", v)}
              isRequired
              isInvalid={tried && nameMissing}
              errorMessage="Give the automation a name."
              placeholder="Morning forecast check"
              autoFocus
              validationBehavior="aria"
            />
            <TextArea
              label="Instructions"
              value={draft.instructions}
              onChange={(v) => set("instructions", v)}
              isRequired
              isInvalid={tried && textMissing}
              errorMessage="Say what the agent should do on each run."
              placeholder="Load the forecast page and report stations whose feels-like value looks wrong."
              minRows={4}
              maxRows={10}
              autoGrow
              validationBehavior="aria"
            />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1.5 text-sm font-medium text-foreground">Trigger</legend>
              <SegmentedControl
                aria-label="Trigger"
                size="sm"
                fullWidth
                selectedKeys={[trigger.kind]}
                onSelectionChange={(keys) => {
                  const [k] = [...keys];
                  if (k === "event") set("trigger", { kind: "event", event: "pr-opened" });
                  else if (k === "schedule") set("trigger", schedule("daily", "06:00"));
                }}
              >
                <Segment id="schedule">Schedule</Segment>
                <Segment id="event">Event</Segment>
              </SegmentedControl>
              {trigger.kind === "schedule" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Frequency"
                    value={trigger.frequency}
                    onChange={(k) => k != null && setTrigger({ frequency: String(k) as Frequency })}
                    className="sm:col-span-2"
                  >
                    {frequencies.map((f) => (
                      <SelectItem key={f.id} id={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </Select>
                  {trigger.frequency !== "30min" && trigger.frequency !== "hourly" && (
                    <Select
                      label="Time"
                      searchable
                      searchPlaceholder="Search times"
                      value={trigger.time}
                      onChange={(k) => k != null && setTrigger({ time: String(k) })}
                      className={trigger.frequency === "weekly" ? undefined : "sm:col-span-2"}
                    >
                      {times.map((time) => (
                        <SelectItem key={time} id={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                  {trigger.frequency === "weekly" && (
                    <Select
                      label="Day"
                      value={trigger.weekday}
                      onChange={(k) => k != null && setTrigger({ weekday: String(k) })}
                    >
                      {weekdays.map((d) => (
                        <SelectItem key={d} id={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              ) : (
                <Select
                  label="Event"
                  value={trigger.event}
                  onChange={(k) => k != null && set("trigger", { kind: "event", event: String(k) as EventKind })}
                >
                  {eventKinds.map((e) => (
                    <SelectItem key={e.id} id={e.id} description={e.description} textValue={e.name}>
                      {e.name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Project"
                value={draft.project}
                onChange={(k) => {
                  if (k == null) return;
                  const project = String(k) as ProjectScope;
                  setDraft((d) => ({
                    ...d,
                    project,
                    branch: project === "all" ? "main" : projectBranches[project][0],
                  }));
                }}
              >
                {[...projectIds, "all" as const].map((p) => (
                  <SelectItem key={p} id={p}>
                    {p === "all" ? "All projects" : p}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Branch"
                value={draft.branch}
                isDisabled={draft.project === "all"}
                onChange={(k) => k != null && set("branch", String(k))}
              >
                {(draft.project === "all" ? ["main"] : projectBranches[draft.project]).map((b) => (
                  <SelectItem key={b} id={b}>
                    {b}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Model and effort</p>
              <ModelPicker
                model={draft.model}
                onModel={(m) => set("model", m)}
                effort={draft.effort}
                onEffort={(e) => set("effort", e)}
                placement="bottom start"
                showEffort
                triggerClassName="h-9 w-full justify-between rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs data-[hovered]:border-border-strong data-[hovered]:bg-card"
              />
            </div>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1.5 text-sm font-medium text-foreground">Notifications</legend>
              <Checkbox isSelected={draft.notifyEmail} onChange={(v) => set("notifyEmail", v)}>
                Email me when it fails
              </Checkbox>
              <Checkbox isSelected={draft.notifyChat} onChange={(v) => set("notifyChat", v)}>
                Post a summary in the project chat
              </Checkbox>
            </fieldset>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onPress={requestClose}>
              Cancel
            </Button>
            <Button type="submit">{automation ? "Save changes" : "Create automation"}</Button>
          </DrawerFooter>
        </form>
      </Drawer>
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title="Discard your changes?"
        actionLabel="Discard"
        cancelLabel="Keep editing"
        tone="destructive"
        onAction={onClose}
      >
        {automation ? `Your edits to “${automation.name}” will be lost.` : "This automation has not been saved yet."}
      </AlertDialog>
    </>
  );
}
