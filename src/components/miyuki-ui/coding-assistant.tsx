"use client";

import {
  ChartSpline,
  ChevronRight,
  FileCode,
  FilePlus,
  Folder,
  Gauge,
  GitBranch,
  Mail,
  MountainSnow,
  Palette,
  PanelLeft,
  PanelRight,
  Share,
  SquarePen,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  WavesHorizontal,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Key } from "react-aria-components";
import { type ActionItem, ActionLog } from "@/components/miyuki-ui/action-log";
import { ArrivingText } from "@/components/miyuki-ui/arriving-text";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { CodeBlock } from "@/components/miyuki-ui/code-block";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import type { PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";
import { PromptConsole } from "@/components/miyuki-ui/prompt-console";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { ThinkingGlyph } from "@/components/miyuki-ui/thinking-glyph";
import { cn } from "@/lib/utils";

function useMedia(query: string) {
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
    () => false,
  );
}

const teams = [
  { id: "hoshizora", name: "Hoshizora Weather", plan: "Forecast app, 14 people", logo: <MountainSnow /> },
  { id: "hoshizora-labs", name: "Hoshizora Labs", plan: "Research, 5 people" },
];

const threads = [
  { id: "feels-like", label: "Feels-like column", icon: <Thermometer />, day: "Today" },
  { id: "snow-axis", label: "Snow depth chart axis", icon: <ChartSpline />, day: "Today" },
  { id: "slow-list", label: "Station list loads slowly", icon: <Gauge />, day: "Yesterday" },
  { id: "bulletin", label: "Bulletin email at night", icon: <Mail />, day: "Yesterday" },
  { id: "tides", label: "Otaru port tide table", icon: <WavesHorizontal />, day: "Earlier in February" },
  { id: "legend", label: "Avalanche legend colours", icon: <Palette />, day: "Earlier in February" },
];

const navGroups: FloatingSidebarGroup[] = ["Today", "Yesterday", "Earlier in February"].map((day) => ({
  label: day,
  items: threads.filter((t) => t.day === day).map(({ id, label, icon }) => ({ id, label, icon })),
}));

const defaultUser: FloatingSidebarUser = { name: "Yuna Sato", email: "yuna@hoshizora.example" };

const models = [
  { id: "standard", name: "Standard", description: "Quick edits and answers." },
  { id: "fine", name: "Fine mesh", description: "Slower. Reads the whole project first." },
];

const context = [
  { id: "branch", icon: <GitBranch />, label: "feels-like-column" },
  { id: "folder", icon: <Folder />, label: "src/stations" },
];

function windChill(tempC: number, windKmh: number) {
  if (tempC > 10 || windKmh < 4.8) return tempC;
  const v = windKmh ** 0.16;
  return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v;
}

const stations = [
  { name: "Hakuba Happō-one", tempC: -6.2, windKmh: 28, snowCm: 34.4 },
  { name: "Niseko Annupuri", tempC: -9.1, windKmh: 36, snowCm: 41.2 },
  { name: "Nozawa Onsen", tempC: -3.8, windKmh: 14, snowCm: 21.7 },
  { name: "Otaru port", tempC: -1.4, windKmh: 22, snowCm: 6.3 },
  { name: "Matsumoto", tempC: 1.6, windKmh: 9, snowCm: 0.4 },
  { name: "Lake Tōya", tempC: 2.4, windKmh: 3, snowCm: 0 },
];

const tableCode = `import { windChill } from "./wind-chill";
import type { Station } from "./types";

export function StationTable({ stations }: { stations: Station[] }) {
  return (
    <table className="stations">
      <thead>
        <tr>
          <th>Station</th>
          <th>Air</th>
          <th>Wind</th>
          <th>Feels like</th>
          <th>Snow, 24 h</th>
        </tr>
      </thead>
      <tbody>
        {stations.map((s) => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{s.tempC.toFixed(1)} °C</td>
            <td>{s.windKmh} km/h</td>
            <td>{Math.round(windChill(s.tempC, s.windKmh))} °C</td>
            <td>{Math.round(s.snowfallCm)} cm</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}`;

const chillCode = `const CALM_KMH = 4.8;
const MILD_C = 10;

export function windChill(tempC: number, windKmh: number) {
  if (tempC > MILD_C || windKmh < CALM_KMH) return tempC;
  const v = windKmh ** 0.16;
  return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v;
}`;

const testCode = `import { windChill } from "./wind-chill";

describe("windChill", () => {
  it("reads Hakuba Happō-one at dawn", () => {
    expect(Math.round(windChill(-6.2, 28))).toBe(-14);
  });

  it("leaves calm air alone", () => {
    expect(windChill(-3, 2)).toBe(-3);
  });

  it("leaves mild air alone", () => {
    expect(windChill(12, 30)).toBe(12);
  });
});`;

const allLines = (code: string) => code.split("\n").map((_, i) => i + 1);

const files = [
  {
    dir: "src/stations/",
    name: "station-table.tsx",
    code: tableCode,
    lang: "tsx",
    added: [1, 12, 22, 23],
    removed: 1,
    created: false,
  },
  {
    dir: "src/stations/",
    name: "wind-chill.ts",
    code: chillCode,
    lang: "ts",
    added: allLines(chillCode),
    removed: 0,
    created: true,
  },
  {
    dir: "src/stations/",
    name: "wind-chill.test.ts",
    code: testCode,
    lang: "ts",
    added: allLines(testCode),
    removed: 0,
    created: true,
  },
];

const totalAdded = files.reduce((n, f) => n + f.added.length, 0);
const totalRemoved = files.reduce((n, f) => n + f.removed, 0);

const tasks: ActionItem[] = [
  { id: "find", kind: "search", label: "Searched for", detail: "StationTable", status: "done" },
  { id: "read", kind: "read", label: "Read", detail: "station-table.tsx", status: "done" },
  { id: "chill", kind: "write", label: "Created", detail: "wind-chill.ts", status: "done" },
  { id: "table", kind: "write", label: "Edited", detail: "station-table.tsx", status: "done" },
  { id: "test", kind: "write", label: "Created", detail: "wind-chill.test.ts", status: "done" },
  { id: "run", kind: "run", label: "Ran", detail: "pnpm test stations", status: "done" },
];

type Message =
  | { id: string; from: "user"; text: string }
  | { id: string; from: "assistant"; text?: string; rich?: boolean; pending?: boolean; fresh?: boolean };

const history: Record<string, Message[]> = {
  "feels-like": [
    {
      id: "fl-1",
      from: "user",
      text: "Add a feels-like column to the station table on the forecast page. Work it out from air temperature and wind, and round the snowfall to whole centimetres while you're there.",
    },
    { id: "fl-2", from: "assistant", rich: true },
  ],
  "snow-axis": [
    {
      id: "sa-1",
      from: "user",
      text: "The snow depth chart for Nozawa starts its axis at 140 cm. Can it start at zero?",
    },
    {
      id: "sa-2",
      from: "assistant",
      text: "Yes. The axis took its lowest value from the data, so a 212 cm base looked like a small change. It now starts at zero and tops out at the season's deepest reading plus a tenth.",
    },
  ],
  "slow-list": [
    { id: "sl-1", from: "user", text: "The station list takes about four seconds to open on the train wifi." },
    {
      id: "sl-2",
      from: "assistant",
      text: "It fetched the hourly history of all 1,284 stations before showing anything. It now asks for the latest reading only and loads a station's history when its row opens. On a throttled connection the list appears in 0.9 seconds instead of 4.1.",
    },
  ],
  bulletin: [
    { id: "bu-1", from: "user", text: "The morning bulletin email is hard to read when a phone is in dark mode." },
    {
      id: "bu-2",
      from: "assistant",
      text: "The template set white backgrounds on every table cell. I moved the colours into one palette with a night variant, and the avalanche warning keeps its contrast in both.",
    },
  ],
  tides: [
    { id: "ti-1", from: "user", text: "Show the next high tide on the Otaru port page." },
    {
      id: "ti-2",
      from: "assistant",
      text: "Done. The page reads the harbour office feed every 30 minutes and shows the next high tide with its height, for example 06:42 at 0.31 m.",
    },
  ],
  legend: [
    { id: "le-1", from: "user", text: "Can people with red-green colour blindness read the avalanche legend?" },
    {
      id: "le-2",
      from: "assistant",
      text: "Not reliably. Levels 2 and 3 differed only in hue. Each level now has its number inside the swatch and its own hatching, so the legend no longer depends on colour.",
    },
  ],
  new: [],
};

const suggestions = [
  "Why does the radar map flicker when it refreshes?",
  "Add a sunrise time to each station card",
  "Review the bulletin email before Friday",
];

function cannedReply(thread: string) {
  if (thread === "feels-like") {
    return "I'll pick that up once you've looked over these three files, so the change stays easy to review. Nothing else on feels-like-column has changed yet.";
  }
  return "I'll start by reading the forecast page and the station components, then come back with a short plan before changing anything.";
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.84em] text-foreground">{children}</code>;
}

function Diff({ added, removed, className }: { added: number; removed: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1.5 text-[13px] tabular-nums", className)}>
      <span className="text-success-strong">+{added}</span>
      {removed > 0 && <span className="text-destructive-strong">−{removed}</span>}
    </span>
  );
}

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  const ghost = "size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground";
  return (
    <div className="-ms-1.5 flex items-center gap-0.5">
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={copied ? "Copied" : "Copy reply"}
        onPress={copy}
        className={ghost}
      >
        <MorphIcon shapes={morphIcons.copyCheck} shape={copied ? "check" : "copy"} size={16} />
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label="Good reply"
        aria-pressed={vote === "up"}
        onPress={() => setVote(vote === "up" ? null : "up")}
        className={cn(ghost, vote === "up" && "text-brand-strong data-[hovered]:text-brand-strong")}
      >
        <ThumbsUp className={cn(vote === "up" && "fill-brand-soft")} />
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label="Poor reply"
        aria-pressed={vote === "down"}
        onPress={() => setVote(vote === "down" ? null : "down")}
        className={cn(ghost, vote === "down" && "text-brand-strong data-[hovered]:text-brand-strong")}
      >
        <ThumbsDown className={cn(vote === "down" && "fill-brand-soft")} />
      </IconButton>
    </div>
  );
}

function ChangedFiles({ onOpen }: { onOpen: (name: string) => void }) {
  return (
    <div className="overflow-clip rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 py-1.5 ps-4 pe-1.5">
        <p className="text-sm font-medium">{files.length} files changed</p>
        <Diff added={totalAdded} removed={totalRemoved} />
        <Button variant="ghost" size="sm" className="ms-auto text-[13px]" onPress={() => onOpen(files[0].name)}>
          Review
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {files.map((f) => (
          <li key={f.name}>
            <button
              type="button"
              onClick={() => onOpen(f.name)}
              className="group/file flex w-full cursor-default items-center gap-3 px-4 py-2.5 text-start outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
            >
              {f.created ? (
                <FilePlus aria-hidden="true" className="size-4 shrink-0 text-success-strong" />
              ) : (
                <FileCode aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                <span className="text-muted-foreground max-sm:hidden">{f.dir}</span>
                {f.name}
              </span>
              <Diff added={f.added.length} removed={f.removed} />
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/file:translate-x-0.5 rtl:-scale-x-100"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const summary =
  "All 12 station tests pass. At 06:00 Hakuba Happō-one read −6.2 °C in a 28 km/h wind, so the table now shows it feels like −14 °C.";

function FeelsLikeReply({ onOpen }: { onOpen: (name: string) => void }) {
  return (
    <>
      <p>I&apos;ll add a small wind chill helper, use it in the station table and cover it with tests.</p>
      <div className="flex flex-col gap-2.5">
        <p className="text-[13px] leading-5 text-muted-foreground">Worked for 1m 06s</p>
        <ActionLog items={tasks} />
      </div>
      <p>
        Wind chill only means something in cold, moving air, so <Code>windChill</Code> returns the air temperature above
        10 °C or below 4.8 km/h.
      </p>
      <CodeBlock filename="wind-chill.ts" language="ts" code={chillCode} className="not-fumadocs-codeblock" />
      <ChangedFiles onOpen={onOpen} />
      <p>{summary}</p>
    </>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end ps-10 sm:ps-20">
      <p className="rounded-2xl rounded-ee-md bg-secondary px-4 py-2.5 text-base leading-7 text-secondary-foreground ring-1 ring-foreground/5 ring-inset [overflow-wrap:anywhere]">
        {text}
      </p>
    </div>
  );
}

function AssistantTurn({
  message,
  onOpen,
}: {
  message: Extract<Message, { from: "assistant" }>;
  onOpen: (name: string) => void;
}) {
  if (message.pending) {
    return <ThinkingGlyph variant="reading" label="Reading the forecast page" showElapsed />;
  }
  const text = message.rich ? summary : (message.text ?? "");
  return (
    <div className="flex flex-col gap-5 text-base leading-7">
      {message.rich ? (
        <FeelsLikeReply onOpen={onOpen} />
      ) : message.fresh ? (
        <ArrivingText text={text} startOnView={false} stagger={0.035} duration={0.4} />
      ) : (
        <p>{text}</p>
      )}
      <MessageActions text={text} />
    </div>
  );
}

function StationPreview() {
  return (
    <div className="overflow-clip rounded-xl border border-border bg-background">
      <div className="flex h-9 items-center gap-2 border-b border-border bg-muted/60 px-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
        </span>
        <span className="mx-auto truncate rounded-md bg-card px-3 py-0.5 text-xs text-muted-foreground ring-1 ring-border">
          forecast.hoshizora.example/stations
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="text-base leading-6 font-semibold tracking-[-0.01em]">Stations</h3>
        <p className="text-[13px] text-muted-foreground">06:00 readings, Tuesday 16 February</p>
        <div className="-mx-3.5 mt-3 overflow-x-auto px-3.5 [scrollbar-width:thin]">
          <table className="w-full min-w-[372px] text-[13px] whitespace-nowrap tabular-nums">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="py-2 pe-2 text-start font-medium">Station</th>
                <th className="px-1.5 py-2 text-end font-medium">Air</th>
                <th className="px-1.5 py-2 text-end font-medium">Wind</th>
                <th className="rounded-t-md bg-brand-soft px-2 py-2 text-end font-medium text-brand-strong">
                  Feels like
                </th>
                <th className="py-2 ps-1.5 text-end font-medium">Snow, 24 h</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => (
                <tr key={s.name} className="border-b border-border last:border-0">
                  <td className="py-2 pe-2 font-medium">{s.name}</td>
                  <td className="px-1.5 py-2 text-end text-muted-foreground">
                    {s.tempC.toFixed(1).replace("-", "−")} °C
                  </td>
                  <td className="px-1.5 py-2 text-end text-muted-foreground">{s.windKmh} km/h</td>
                  <td
                    className={cn(
                      "bg-brand-soft/60 px-2 py-2 text-end font-semibold",
                      i === stations.length - 1 && "rounded-b-md",
                    )}
                  >
                    {String(Math.round(windChill(s.tempC, s.windKmh))).replace("-", "−")} °C
                  </td>
                  <td className="py-2 ps-1.5 text-end text-muted-foreground">{Math.round(s.snowCm)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChangesPanel({
  file,
  onFile,
  tab,
  onTab,
  onClose,
}: {
  file: string;
  onFile: (name: string) => void;
  tab: Key;
  onTab: (key: Key) => void;
  onClose: () => void;
}) {
  const current = files.find((f) => f.name === file) ?? files[0];
  return (
    <Tabs selectedKey={tab} onSelectionChange={onTab} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex shrink-0 items-end gap-2 border-b border-border ps-4 pe-2">
        <TabList aria-label="Panel" className="mx-0 bg-none px-0">
          <Tab id="changes" count={files.length}>
            Changes
          </Tab>
          <Tab id="preview">Preview</Tab>
        </TabList>
        <CloseButton size="lg" aria-label="Close panel" onPress={onClose} className="ms-auto mb-1 self-center" />
      </div>
      <TabPanel id="changes" className="min-h-0 flex-1 overflow-y-auto rounded-none [scrollbar-width:thin]">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
              <GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate font-mono">feels-like-column</span>
            </p>
            <Diff added={totalAdded} removed={totalRemoved} />
          </div>
          <ul aria-label="Changed files" className="flex flex-col gap-0.5">
            {files.map((f) => {
              const on = f.name === current.name;
              return (
                <li key={f.name}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    onClick={() => onFile(f.name)}
                    className={cn(
                      "flex h-9 w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 text-start outline-none",
                      "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
                      on ? "bg-brand-soft text-foreground" : "hover:bg-accent/60",
                    )}
                  >
                    {f.created ? (
                      <FilePlus aria-hidden="true" className="size-4 shrink-0 text-success-strong" />
                    ) : (
                      <FileCode
                        aria-hidden="true"
                        className={cn("size-4 shrink-0", on ? "text-brand-strong" : "text-muted-foreground")}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{f.name}</span>
                    {f.created && <span className="text-xs text-muted-foreground">New</span>}
                    <Diff added={f.added.length} removed={f.removed} className="w-14 justify-end" />
                  </button>
                </li>
              );
            })}
          </ul>
          <CodeBlock
            key={current.name}
            filename={current.dir + current.name}
            language={current.lang}
            code={current.code}
            highlightLines={current.added}
            showLineNumbers
            className="not-fumadocs-codeblock"
          />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brand" />
            {current.created
              ? "New file, every line added"
              : `${current.added.length} lines added, ${current.removed} removed`}
          </p>
        </div>
      </TabPanel>
      <TabPanel id="preview" className="min-h-0 flex-1 overflow-y-auto rounded-none p-4 [scrollbar-width:thin]">
        <StationPreview />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Rendered from feels-like-column with this morning&apos;s readings.
        </p>
        <dl className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-[13px] leading-5">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-medium">Feels like</dt>
            <dd className="text-muted-foreground">
              New column, from air temperature and wind. Equal to the air below 4.8 km/h or above 10 °C.
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-medium">Snow, 24 h</dt>
            <dd className="text-muted-foreground">Whole centimetres. Hakuba read 34.4 cm and now shows 34 cm.</dd>
          </div>
        </dl>
      </TabPanel>
    </Tabs>
  );
}

function EmptyChat({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <SquarePen className="size-5" />
      </span>
      <h2 className="mt-4 text-2xl leading-8 font-semibold tracking-[-0.02em]">What should we change today?</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Ask about the forecast app, paste an error, or describe a change you&apos;d like to review.
      </p>
      <ul className="mt-6 flex w-full max-w-md flex-col gap-1.5">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="flex w-full cursor-default items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-start text-sm shadow-xs outline-none transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">{s}</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface CodingAssistantProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
}

export function CodingAssistant({ user = defaultUser, className, ...props }: CodingAssistantProps) {
  const lg = useMedia("(min-width: 1024px)");
  const xl = useMedia("(min-width: 1280px)");
  const [menu, setMenu] = useState(false);
  const [thread, setThread] = useState("feels-like");
  const [log, setLog] = useState(history);
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const [railChoice, setRailChoice] = useState<boolean | null>(null);
  const [file, setFile] = useState(files[0].name);
  const [tab, setTab] = useState<Key>("changes");
  const [status, setStatus] = useState<PromptBoxStatus>("idle");
  const timers = useRef<number[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const follow = useRef(false);

  const hasChanges = thread === "feels-like";
  const panelOpen = hasChanges && (panelChoice ?? lg);
  const rail = railChoice ?? (panelOpen && !xl);
  const messages = log[thread] ?? [];
  const title = thread === "new" ? "New chat" : (threads.find((t) => t.id === thread)?.label ?? "");

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !follow.current) return;
    follow.current = false;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [log]);

  function openFile(name: string) {
    setFile(name);
    setTab("changes");
    setPanelChoice(true);
    setRailChoice(null);
  }

  function togglePanel() {
    setPanelChoice(!panelOpen);
    setRailChoice(null);
  }

  function navigate(id: string) {
    setMenu(false);
    if (id === thread) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setStatus("idle");
    setLog((l) => ({ ...l, [thread]: (l[thread] ?? []).filter((m) => !(m.from === "assistant" && m.pending)) }));
    setThread(id);
    scroller.current?.scrollTo({ top: 0 });
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || status === "streaming") return;
    const at = thread;
    const stamp = Date.now();
    const reply = cannedReply(at);
    follow.current = true;
    setStatus("streaming");
    setLog((l) => ({
      ...l,
      [at]: [
        ...(l[at] ?? []),
        { id: `u-${stamp}`, from: "user", text: clean },
        { id: `a-${stamp}`, from: "assistant", pending: true },
      ],
    }));
    const write = window.setTimeout(() => {
      follow.current = true;
      setLog((l) => ({
        ...l,
        [at]: (l[at] ?? []).map((m) =>
          m.id === `a-${stamp}` ? { id: m.id, from: "assistant", text: reply, fresh: true } : m,
        ),
      }));
    }, 1800);
    const done = window.setTimeout(() => setStatus("idle"), 1800 + reply.split(" ").length * 35 + 400);
    timers.current.push(write, done);
  }

  function stop() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setStatus("idle");
    setLog((l) => ({ ...l, [thread]: (l[thread] ?? []).filter((m) => !(m.from === "assistant" && m.pending)) }));
  }

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={[]}
      groups={navGroups}
      user={user}
      current={thread}
      onNavigate={navigate}
      collapsed={drawer ? false : rail}
      onCollapsedChange={drawer ? undefined : setRailChoice}
      collapsible={!drawer}
      action={({ collapsed }) =>
        collapsed ? (
          <IconButton
            variant="secondary"
            size="sm"
            aria-label="New chat"
            onPress={() => navigate("new")}
            className="w-full"
          >
            <SquarePen />
          </IconButton>
        ) : (
          <Button variant="secondary" size="sm" iconStart={<SquarePen />} onPress={() => navigate("new")}>
            New chat
          </Button>
        )
      }
      className={drawer ? "min-h-0 flex-1" : "hidden lg:flex"}
    />
  );

  const panel = (
    <ChangesPanel
      file={file}
      onFile={setFile}
      tab={tab}
      onTab={setTab}
      onClose={() => {
        setPanelChoice(false);
        setRailChoice(null);
      }}
    />
  );

  return (
    <div {...props} className={cn("flex h-dvh gap-3 bg-background p-3 text-foreground", className)}>
      <style href="miyuki-coding-assistant" precedence="miyuki">{`
        @keyframes miyuki-coding-assistant-panel { from { opacity: 0; transform: translateX(12px); } }
      `}</style>
      {sidebar(false)}
      <Drawer
        side="left"
        isOpen={menu && !lg}
        onOpenChange={setMenu}
        closeButton={false}
        aria-label="Sidebar"
        className="w-[264px] border-0 bg-transparent shadow-none"
      >
        {sidebar(true)}
      </Drawer>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center gap-2 ps-0.5 lg:ps-2">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open sidebar"
            onPress={() => setMenu(true)}
            className="text-muted-foreground data-[hovered]:text-foreground lg:hidden"
          >
            <PanelLeft />
          </IconButton>
          <Breadcrumbs className="flex-nowrap">
            <Breadcrumb href="#" className="max-sm:hidden" linkProps={{ onPress: () => navigate("new") }}>
              Chats
            </Breadcrumb>
            <Breadcrumb>{title}</Breadcrumb>
          </Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <Button variant="secondary" size="sm" iconStart={<Share />} className="max-sm:hidden">
              Share
            </Button>
            {hasChanges && (
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={panelOpen ? "Hide changes" : "Show changes"}
                aria-expanded={panelOpen}
                onPress={togglePanel}
                className={cn(
                  "text-muted-foreground data-[hovered]:text-foreground",
                  panelOpen && "bg-accent text-foreground",
                )}
              >
                <PanelRight />
              </IconButton>
            )}
          </div>
        </header>

        <div
          ref={scroller}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] [scrollbar-gutter:stable] [scrollbar-width:thin]"
        >
          <div className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col px-1 pt-6 pb-8 sm:px-6">
            {messages.length === 0 ? (
              <EmptyChat onPick={send} />
            ) : (
              <>
                <p className="mb-6 text-center text-xs text-muted-foreground">
                  {thread === "feels-like" || thread === "snow-axis"
                    ? "Tuesday 16 February, 09:12"
                    : thread === "slow-list" || thread === "bulletin"
                      ? "Monday 15 February, 17:40"
                      : "Wednesday 10 February, 11:05"}
                </p>
                <ol aria-label="Messages" className="flex flex-col gap-8">
                  {messages.map((m) => (
                    <li key={m.id}>
                      {m.from === "user" ? (
                        <UserBubble text={m.text} />
                      ) : (
                        <AssistantTurn message={m} onOpen={openFile} />
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
          <div className="sticky bottom-0 z-10 mx-auto w-full max-w-[46rem] px-0 sm:px-6">
            <div aria-hidden="true" className="h-6 bg-gradient-to-t from-background to-transparent" />
            <div className="bg-background pb-1">
              <PromptConsole
                placeholder="Ask for a change or a review"
                models={models}
                defaultModel="standard"
                defaultMode="ask"
                context={hasChanges ? context : undefined}
                status={status}
                onSend={send}
                onStop={stop}
                maxRows={6}
              />
            </div>
          </div>
        </div>
      </main>

      {panelOpen && (
        <aside
          aria-label="Changes"
          className="hidden w-[400px] shrink-0 flex-col overflow-clip rounded-2xl border border-border bg-card shadow-md motion-safe:animate-[miyuki-coding-assistant-panel_240ms_cubic-bezier(0.22,1,0.36,1)] lg:flex xl:w-[460px]"
        >
          {panel}
        </aside>
      )}
      <Drawer
        side="bottom"
        isOpen={panelOpen && !lg}
        onOpenChange={(open) => {
          if (!open) setPanelChoice(false);
        }}
        aria-label="Changes"
        className="h-[85%]"
      >
        <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
      </Drawer>
    </div>
  );
}
