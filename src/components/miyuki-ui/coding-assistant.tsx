"use client";

import {
  Archive,
  BookOpen,
  Camera,
  ChartSpline,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Ellipsis,
  FileCode,
  FilePlus,
  Folder,
  FolderOpen,
  Frame,
  Gauge,
  GitBranch,
  GitBranchPlus,
  GitCommitHorizontal,
  Layers,
  LifeBuoy,
  ListChecks,
  Mail,
  MessageCircle,
  MountainSnow,
  Palette,
  PanelLeft,
  PanelRight,
  Pencil,
  Pin,
  Plus,
  Puzzle,
  Radar,
  RotateCw,
  Search,
  Settings,
  Share,
  Sheet,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  Target,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Trash,
  UserPlus,
  WavesHorizontal,
  Workflow,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  Activity,
  type ComponentProps,
  memo,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Button as AriaButton,
  SearchField as AriaSearchField,
  Autocomplete,
  Input,
  type Key,
  ListBox,
  useFilter,
} from "react-aria-components";
import { type ActionItem, ActionLog } from "@/components/miyuki-ui/action-log";
import { ArrivingText } from "@/components/miyuki-ui/arriving-text";
import { AttachmentTray, type AttachmentTrayItem } from "@/components/miyuki-ui/attachment-tray";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { CodeBlock } from "@/components/miyuki-ui/code-block";
import {
  AutomationDetail,
  type AutomationDraft,
  AutomationSheet,
  AutomationsList,
  useAutomations,
} from "@/components/miyuki-ui/coding-assistant-automations";
import {
  type Reasoning,
  ReasoningBlock,
  type ReasoningLive,
  type ReasoningStep,
} from "@/components/miyuki-ui/coding-assistant-reasoning";
import { SettingsPage, type SettingsSectionId, sectionName } from "@/components/miyuki-ui/coding-assistant-settings";
import {
  type AssistantSettings,
  applyTheme,
  defaultSettings,
  EASE_OUT,
  ghostPill,
  type LayerMotion,
  ModelPicker,
  modes,
  PageBody,
  type ProjectId,
  readTheme,
  SettingsContext,
  SlideTitle,
  subscribeTheme,
  type Theme,
  themeIcon,
  themeNames,
  themeOrder,
  useSettings,
  ViewLayer,
} from "@/components/miyuki-ui/coding-assistant-shared";
import { SkillDetail, SkillSheet, SkillsList, useSkills } from "@/components/miyuki-ui/coding-assistant-skills";
import { ContextMeter, type ContextSegment } from "@/components/miyuki-ui/context-meter";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownSeparator,
} from "@/components/miyuki-ui/dropdown";
import { EmptyState } from "@/components/miyuki-ui/empty-state";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import {
  AlertDialog,
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/miyuki-ui/modal";
import { MorphIcon, type MorphShapes, morphIcons } from "@/components/miyuki-ui/path-morph";
import { Popover, PopoverTrigger } from "@/components/miyuki-ui/popover";
import { ProgressBar, ProgressRing } from "@/components/miyuki-ui/progress";
import { focusPromptBoxOnBlankClick, PromptBoxSendButton, PromptBoxTextArea } from "@/components/miyuki-ui/prompt-box";
import { Radio, RadioGroup } from "@/components/miyuki-ui/radio";
import { RunChecklist, type RunStep } from "@/components/miyuki-ui/run-checklist";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { SelectItem } from "@/components/miyuki-ui/select";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { TerminalReplay, type TerminalReplayLine } from "@/components/miyuki-ui/terminal-replay";
import { Toaster, toast } from "@/components/miyuki-ui/toast";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

const WINDOW = 200_000;

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

const micShapes: MorphShapes = {
  mic: [
    {
      d: "M12 3.5C13.66 3.5 15 4.84 15 6.5L15 11.5C15 13.16 13.66 14.5 12 14.5C10.34 14.5 9 13.16 9 11.5L9 6.5C9 4.84 10.34 3.5 12 3.5Z",
      fill: true,
    },
    "M5.5 11C5.5 14.59 8.41 17.5 12 17.5C15.59 17.5 18.5 14.59 18.5 11M12 17.5L12 20.5",
  ],
  stop: [
    { d: "M12 7C15.6 7 17 7 17 9.5L17 14.5C17 17 15.6 17 12 17C8.4 17 7 17 7 14.5L7 9.5C7 7 8.4 7 12 7Z", fill: true },
    "",
  ],
};

const panelShapes: MorphShapes = {
  normal: [
    "M5.5 4.5L18.5 4.5C19.6 4.5 20.5 5.4 20.5 6.5L20.5 17.5C20.5 18.6 19.6 19.5 18.5 19.5L5.5 19.5C4.4 19.5 3.5 18.6 3.5 17.5L3.5 6.5C3.5 5.4 4.4 4.5 5.5 4.5Z",
    "M14.5 4.5L14.5 19.5",
  ],
  wide: [
    "M5.5 4.5L18.5 4.5C19.6 4.5 20.5 5.4 20.5 6.5L20.5 17.5C20.5 18.6 19.6 19.5 18.5 19.5L5.5 19.5C4.4 19.5 3.5 18.6 3.5 17.5L3.5 6.5C3.5 5.4 4.4 4.5 5.5 4.5Z",
    "M9 4.5L9 19.5",
  ],
};

export interface CodingAssistantMember {
  name: string;
  role: string;
  avatar?: string;
}

const defaultUser: FloatingSidebarUser = { name: "Yuna Sato", email: "yuna@hoshizora.example" };

const defaultMembers: CodingAssistantMember[] = [
  { name: "Yuna Sato", role: "Weather forecaster" },
  { name: "Amara Okafor", role: "Hydrologist" },
  { name: "Kenji Mori", role: "Station master, Otaru" },
  { name: "Mei Watanabe", role: "Product designer" },
];

const teams = [
  { id: "hoshizora", name: "Hoshizora Weather", plan: "Forecast app, 14 people", logo: <MountainSnow /> },
  { id: "hoshizora-labs", name: "Hoshizora Labs", plan: "Research, 5 people" },
];

interface ChangedFile {
  dir: string;
  name: string;
  lang: string;
  code: string;
  added: number;
  removed: number;
  lines: number[];
  created?: boolean;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  when: string;
}

interface Project {
  id: ProjectId;
  branch: string;
  branches: string[];
  folders: string[];
  commit: Commit;
  files: ChangedFile[];
  terminal: TerminalReplayLine[];
  preview: "stations" | "bulletin" | "tides" | "radar";
  url: string;
}

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

const chillReviewed = `const CALM_KMH = 4.8;
const MILD_C = 10;

export function windChill(tempC: number, windKmh: number) {
  const wind = Math.round(windKmh * 10) / 10;
  if (tempC > MILD_C || wind < CALM_KMH) return tempC;
  const v = wind ** 0.16;
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

function diffOf(file: ChangedFile): ChangedFile {
  if (file.created) {
    const lines = allLines(file.code);
    return { ...file, added: lines.length, removed: 0, lines };
  }
  return { ...file, added: file.lines.length };
}

const forecastFiles: ChangedFile[] = [
  {
    dir: "src/stations/",
    name: "station-table.tsx",
    lang: "tsx",
    code: tableCode,
    added: 4,
    removed: 1,
    lines: [1, 12, 22, 23],
  },
  {
    dir: "src/stations/",
    name: "wind-chill.ts",
    lang: "ts",
    code: chillCode,
    added: 8,
    removed: 0,
    lines: allLines(chillCode),
    created: true,
  },
  {
    dir: "src/stations/",
    name: "wind-chill.test.ts",
    lang: "ts",
    code: testCode,
    added: 15,
    removed: 0,
    lines: allLines(testCode),
    created: true,
  },
].map(diffOf);

const testRun: TerminalReplayLine[] = [
  { type: "command", text: "pnpm test stations" },
  { type: "output", text: " ✓ wind-chill.test.ts (3)", tone: "success" },
  { type: "output", text: " ✓ station-table.test.tsx (9)", tone: "success" },
  { type: "output", text: "" },
  { type: "output", text: " Tests  12 passed (12)", tone: "success" },
  { type: "output", text: " Time   1.84s", tone: "muted" },
];

const projects: Project[] = [
  {
    id: "forecast-web",
    branch: "feels-like-column",
    branches: ["feels-like-column", "main", "snow-depth-axis", "station-list-speed", "legend-contrast"],
    folders: ["src/stations", "src/charts", "src/forecast", "src/legend", "tests"],
    commit: {
      hash: "a3f09c4",
      message: "Round snowfall in the bulletin table",
      author: "Amara Okafor",
      when: "Tuesday 09:02",
    },
    files: forecastFiles,
    terminal: testRun,
    preview: "stations",
    url: "forecast.hoshizora.example/stations",
  },
  {
    id: "bulletin-mailer",
    branch: "main",
    branches: ["main", "night-palette", "plain-text-part"],
    folders: ["templates", "src/render", "src/send"],
    commit: {
      hash: "4e1c9a2",
      message: "Night palette for the morning bulletin",
      author: "Yuna Sato",
      when: "Monday 17:52",
    },
    files: [],
    terminal: [
      { type: "command", text: "pnpm preview morning" },
      { type: "output", text: " Rendered morning.html in light and night", tone: "muted" },
      { type: "output", text: " ✓ Avalanche warning contrast 7.2 : 1", tone: "success" },
    ],
    preview: "bulletin",
    url: "mail.hoshizora.example/preview/morning",
  },
  {
    id: "harbour-feed",
    branch: "main",
    branches: ["main", "tide-cache"],
    folders: ["src/feed", "src/tides", "src/pages"],
    commit: {
      hash: "b07d3f1",
      message: "Read the harbour office feed every 30 minutes",
      author: "Kenji Mori",
      when: "Wednesday 11:40",
    },
    files: [],
    terminal: [
      { type: "command", text: "pnpm feed:check otaru" },
      { type: "output", text: " Next high tide 06:42, 0.31 m", tone: "muted" },
      { type: "output", text: " ✓ Feed fresh, last reading 4 min ago", tone: "success" },
    ],
    preview: "tides",
    url: "harbour.hoshizora.example/otaru",
  },
  {
    id: "radar-tiles",
    branch: "tile-cache",
    branches: ["tile-cache", "main"],
    folders: ["src/tiles", "src/frames", "scripts"],
    commit: { hash: "9c2e771", message: "Draw frames at 2× on retina screens", author: "Mei Watanabe", when: "2 Feb" },
    files: [
      {
        dir: "src/tiles/",
        name: "cache.ts",
        lang: "ts",
        code: `export const TILE_TTL_MS = 10 * 60 * 1000;
export const MAX_TILES = 2048;

export function tileKey(z: number, x: number, y: number, frame: string) {
  return [frame, z, x, y].join("/");
}`,
        added: 3,
        removed: 1,
        lines: [1, 2, 5],
      },
    ].map(diffOf),
    terminal: [
      { type: "command", text: "pnpm tiles:build --frames 12" },
      { type: "output", text: " Built 1,284 tiles in 6.1s", tone: "muted" },
    ],
    preview: "radar",
    url: "radar.hoshizora.example/hokkaido",
  },
];

interface Chat {
  id: string;
  project: ProjectId;
  title: string;
  age: string;
  icon: ReactNode;
  date: string;
  pinned?: boolean;
  draft?: boolean;
}

const initialChats: Chat[] = [
  {
    id: "feels-like",
    project: "forecast-web",
    title: "Feels-like column",
    age: "now",
    icon: <Thermometer />,
    date: "Tuesday 16 February, 09:12",
  },
  {
    id: "snow-axis",
    project: "forecast-web",
    title: "Snow depth chart axis",
    age: "2h",
    icon: <ChartSpline />,
    date: "Tuesday 16 February, 07:40",
  },
  {
    id: "slow-list",
    project: "forecast-web",
    title: "Station list loads slowly",
    age: "1d",
    icon: <Gauge />,
    date: "Monday 15 February, 17:40",
  },
  {
    id: "legend",
    project: "forecast-web",
    title: "Avalanche legend colours",
    age: "1w",
    icon: <Palette />,
    date: "Tuesday 9 February, 11:05",
  },
  {
    id: "bulletin",
    project: "bulletin-mailer",
    title: "Bulletin email at night",
    age: "1d",
    icon: <Mail />,
    date: "Monday 15 February, 16:20",
  },
  {
    id: "tides",
    project: "harbour-feed",
    title: "Otaru port tide table",
    age: "6d",
    icon: <WavesHorizontal />,
    date: "Wednesday 10 February, 11:05",
  },
  {
    id: "radar-flicker",
    project: "radar-tiles",
    title: "Radar frames flicker",
    age: "2w",
    icon: <Radar />,
    date: "Monday 1 February, 14:30",
  },
  {
    id: "offline-tiles",
    project: "radar-tiles",
    title: "Tiles for offline huts",
    age: "3w",
    icon: <Layers />,
    date: "Tuesday 26 January, 10:15",
  },
];

type Message =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "reply"; text: string; fresh?: boolean; reasoning?: Reasoning; live?: ReasoningLive }
  | { id: string; kind: "rich"; reasoning?: Reasoning }
  | { id: string; kind: "plan"; steps: RunStep[]; outcome: "running" | "done" | "stopped"; open: boolean }
  | { id: string; kind: "marker"; text: string };

interface ChatLog {
  messages: Message[];
  usage: number;
}

const pastReasoning: Record<string, Reasoning> = {
  "feels-like": {
    durationMs: 6400,
    steps: [
      {
        title: "Find where the table is built",
        text: "The station table lives in station-table.tsx and reads air temperature, wind and 24 hour snowfall from each station.",
      },
      {
        title: "Choose a wind chill formula",
        text: "The standard formula only holds below 10 °C and above 4.8 km/h, so the helper has to return the air temperature outside that range.",
      },
      {
        title: "Plan the tests",
        text: "Hakuba Happō-one at dawn is a good fixture: −6.2 °C in a 28 km/h wind should round to −14 °C. Calm and mild air need a case each.",
      },
      {
        title: "Round the snowfall",
        text: "Snowfall is stored in tenths of a centimetre. Rounding belongs in the table cell, not the data, so the chart keeps its precision.",
      },
    ],
  },
  "snow-axis": {
    durationMs: 2300,
    steps: [
      {
        title: "Read the chart's scale",
        text: "The y scale takes its domain from the smallest and largest readings in view.",
      },
      {
        title: "Pick a fixed floor",
        text: "Snow depth is a quantity from zero, so the axis should start there for every station.",
      },
    ],
  },
  "slow-list": {
    durationMs: 3100,
    steps: [
      {
        title: "Profile the request",
        text: "The list waits for one 4.6 MB response with every station's hourly history.",
      },
      { title: "Split the data", text: "The list only needs the latest reading. History can load when a row opens." },
      { title: "Check the cache", text: "The latest readings change every ten minutes, so a short cache is safe." },
    ],
  },
  legend: {
    durationMs: 2600,
    steps: [
      {
        title: "Simulate colour blindness",
        text: "Under deuteranopia, levels 2 and 3 fall within a few percent of each other in lightness.",
      },
      {
        title: "Add a second cue",
        text: "A number and a hatching pattern per level work in print and on every screen.",
      },
    ],
  },
  bulletin: {
    durationMs: 2400,
    steps: [
      {
        title: "Read the email template",
        text: "Every table cell sets a white background inline, which mail apps keep in dark mode.",
      },
      {
        title: "Move colours into a palette",
        text: "One palette with a night variant lets the warning keep its contrast in both.",
      },
    ],
  },
  tides: {
    durationMs: 1900,
    steps: [
      {
        title: "Find the feed",
        text: "The harbour office publishes tide times as a small JSON file every 30 minutes.",
      },
      { title: "Pick the next high tide", text: "Filter to high tides after now and take the earliest one." },
    ],
  },
  "radar-flicker": {
    durationMs: 2800,
    steps: [
      {
        title: "Watch a frame change",
        text: "The tile layer is replaced before the next frame's images have decoded.",
      },
      { title: "Swap when ready", text: "Decode every tile off screen, then swap the whole frame at once." },
    ],
  },
  "offline-tiles": {
    durationMs: 2200,
    steps: [
      { title: "Size the cache", text: "Six frames for one hut's area come to about 18 MB on a phone." },
      { title: "Mark saved frames", text: "Saved frames need a label so nobody mistakes them for live data." },
    ],
  },
};

const firstLogs: Record<string, ChatLog> = {
  "feels-like": {
    usage: 57,
    messages: [
      {
        id: "fl-1",
        kind: "user",
        text: "Add a feels-like column to the station table on the forecast page. Work it out from air temperature and wind, and round the snowfall to whole centimetres while you're there.",
      },
      { id: "fl-2", kind: "rich" },
    ],
  },
  "snow-axis": {
    usage: 18,
    messages: [
      {
        id: "sa-1",
        kind: "user",
        text: "The snow depth chart for Nozawa starts its axis at 140 cm. Can it start at zero?",
      },
      {
        id: "sa-2",
        kind: "reply",
        text: "Yes. The axis took its lowest value from the data, so a 212 cm base looked like a small change. It now starts at zero and tops out at the season's deepest reading plus a tenth.",
      },
    ],
  },
  "slow-list": {
    usage: 34,
    messages: [
      { id: "sl-1", kind: "user", text: "The station list takes about four seconds to open on the train wifi." },
      {
        id: "sl-2",
        kind: "reply",
        text: "It fetched the hourly history of all 1,284 stations before showing anything. It now asks for the latest reading only and loads a station's history when its row opens. On a throttled connection the list appears in 0.9 seconds instead of 4.1.",
      },
    ],
  },
  legend: {
    usage: 41,
    messages: [
      { id: "le-1", kind: "user", text: "Can people with red-green colour blindness read the avalanche legend?" },
      {
        id: "le-2",
        kind: "reply",
        text: "Not reliably. Levels 2 and 3 differed only in hue. Each level now has its number inside the swatch and its own hatching, so the legend no longer depends on colour.",
      },
    ],
  },
  bulletin: {
    usage: 22,
    messages: [
      { id: "bu-1", kind: "user", text: "The morning bulletin email is hard to read when a phone is in dark mode." },
      {
        id: "bu-2",
        kind: "reply",
        text: "The template set white backgrounds on every table cell. I moved the colours into one palette with a night variant, and the avalanche warning keeps its contrast in both.",
      },
    ],
  },
  tides: {
    usage: 9,
    messages: [
      { id: "ti-1", kind: "user", text: "Show the next high tide on the Otaru port page." },
      {
        id: "ti-2",
        kind: "reply",
        text: "Done. The page reads the harbour office feed every 30 minutes and shows the next high tide with its height, for example 06:42 at 0.31 m.",
      },
    ],
  },
  "radar-flicker": {
    usage: 27,
    messages: [
      { id: "rf-1", kind: "user", text: "The radar map flickers every time a new frame arrives." },
      {
        id: "rf-2",
        kind: "reply",
        text: "Each frame replaced the tile layer before its images had loaded, so the map showed an empty grid for a moment. Frames now load off screen and swap in once every tile is ready.",
      },
    ],
  },
  "offline-tiles": {
    usage: 15,
    messages: [
      { id: "ot-1", kind: "user", text: "Can mountain huts keep the last six radar frames when they lose signal?" },
      {
        id: "ot-2",
        kind: "reply",
        text: "Yes. The last six frames for a hut's area are kept for an hour, about 18 MB on a phone. The map marks them as saved, so nobody mistakes them for live data.",
      },
    ],
  },
};

for (const [id, log] of Object.entries(firstLogs)) {
  log.messages = log.messages.map((m) =>
    (m.kind === "reply" || m.kind === "rich") && pastReasoning[id] ? { ...m, reasoning: pastReasoning[id] } : m,
  );
}

const NEW_CHAT_USAGE = 8;

const emptyLog: ChatLog = { messages: [], usage: NEW_CHAT_USAGE };

interface ScriptStep {
  label: string;
  ms: number;
  usage: number;
  edit?: ChangedFile;
  command?: TerminalReplayLine[];
}

interface ThoughtStep extends ReasoningStep {
  ms: number;
}

interface Script {
  steps: ScriptStep[];
  reply: string;
  reasoning: ThoughtStep[];
}

const snowCode = `export function snowDomain(readings: number[]) {
  const deepest = Math.max(0, ...readings);
  return [0, Math.ceil(deepest * 1.1)] as const;
}`;

const listCode = `export async function loadStations() {
  const res = await fetch("/api/stations?fields=latest");
  return (await res.json()) as StationSummary[];
}

export function loadHistory(id: string) {
  return fetch("/api/stations/" + id + "/history").then((r) => r.json());
}`;

const legendCode = `export const levels = [
  { level: 1, label: "Low", hatch: "none" },
  { level: 2, label: "Moderate", hatch: "dots" },
  { level: 3, label: "Considerable", hatch: "lines" },
  { level: 4, label: "High", hatch: "cross" },
] as const;`;

const paletteCode = `export const palette = {
  light: { page: "#f6f8fb", text: "#14202e", warning: "#b4232c" },
  night: { page: "#101820", text: "#e8eef5", warning: "#ff8a8f" },
};`;

const tideCode = `export function nextHighTide(readings: TideReading[], now: number) {
  const ahead = readings.filter((r) => r.kind === "high" && r.at > now);
  return ahead.sort((a, b) => a.at - b.at)[0] ?? null;
}`;

const swapCode = `export async function showFrame(layer: TileLayer, frame: Frame) {
  await Promise.all(frame.tiles.map((tile) => tile.decode()));
  layer.swap(frame);
}`;

const edits: Record<ProjectId, ChangedFile> = {
  "forecast-web": {
    dir: "src/charts/",
    name: "snow-depth-chart.ts",
    lang: "ts",
    code: snowCode,
    added: 2,
    removed: 1,
    lines: [2, 3],
  },
  "bulletin-mailer": {
    dir: "src/render/",
    name: "palette.ts",
    lang: "ts",
    code: paletteCode,
    added: 2,
    removed: 2,
    lines: [2, 3],
  },
  "harbour-feed": {
    dir: "src/tides/",
    name: "next-high.ts",
    lang: "ts",
    code: tideCode,
    added: 2,
    removed: 1,
    lines: [2, 3],
  },
  "radar-tiles": {
    dir: "src/frames/",
    name: "swap.ts",
    lang: "ts",
    code: swapCode,
    added: 2,
    removed: 1,
    lines: [2, 3],
  },
};

const commands: Record<ProjectId, TerminalReplayLine[]> = {
  "forecast-web": testRun,
  "bulletin-mailer": [
    { type: "command", text: "pnpm preview morning" },
    { type: "output", text: " Rendered morning.html in light and night", tone: "muted" },
    { type: "output", text: " ✓ Every table cell follows the palette", tone: "success" },
  ],
  "harbour-feed": [
    { type: "command", text: "pnpm feed:check otaru" },
    { type: "output", text: " ✓ Next high tide 06:42, 0.31 m", tone: "success" },
  ],
  "radar-tiles": [
    { type: "command", text: "pnpm test frames" },
    { type: "output", text: " ✓ swap.test.ts (4)", tone: "success" },
    { type: "output", text: " Tests  4 passed (4)", tone: "success" },
  ],
};

type PlanScript = Omit<Script, "reasoning">;

const thoughts: Record<string, ThoughtStep[]> = {
  "feels-like": [
    {
      title: "Read the review comments",
      text: "Amara asks for the wind to be rounded to a tenth before it is compared with the calm threshold, so 4.79 km/h counts as calm.",
      ms: 1100,
    },
    {
      title: "Check where the wind is compared",
      text: "windChill compares windKmh with CALM_KMH directly. Rounding there keeps the formula itself untouched.",
      ms: 1200,
    },
    {
      title: "Decide what to test",
      text: "The existing Hakuba case still holds. A wind of 4.75 km/h should now count as calm and return the air temperature.",
      ms: 1000,
    },
  ],
  "snow-axis": [
    { title: "Find the scale", text: "snow-depth-chart.ts builds the y domain from the readings in view.", ms: 900 },
    {
      title: "Weigh a fixed floor",
      text: "A zero floor makes small bases look small and deep ones deep, which is the point of the chart.",
      ms: 1200,
    },
    {
      title: "Leave headroom",
      text: "A tenth above the season's deepest reading keeps the top label clear of the line.",
      ms: 1000,
    },
  ],
  "slow-list": [
    { title: "Look at the request", text: "The list asks for every station's hourly history up front.", ms: 1000 },
    { title: "Find what the list shows", text: "Rows only show the latest reading, so history can wait.", ms: 900 },
    {
      title: "Plan the second request",
      text: "Load a station's history when its row opens, and keep it for ten minutes.",
      ms: 1300,
    },
    { title: "Check older phones", text: "Two small requests beat one large one on the train wifi.", ms: 1000 },
  ],
  legend: [
    {
      title: "Compare the swatches",
      text: "Levels 2 and 3 differ only in hue, which fails for red-green colour blindness.",
      ms: 1100,
    },
    {
      title: "Pick a second cue",
      text: "Numbers inside the swatch, plus hatching that gets denser with the level.",
      ms: 1200,
    },
    { title: "Check print", text: "Hatching survives a black and white printout of the bulletin too.", ms: 900 },
  ],
  bulletin: [
    {
      title: "Open the morning template",
      text: "The summary table still sets its own background on every cell.",
      ms: 1000,
    },
    { title: "Trace the palette", text: "Only the header uses the night palette; the table never got it.", ms: 1100 },
    { title: "Check contrast", text: "The warning row needs at least 4.5 : 1 against the night background.", ms: 1300 },
  ],
  tides: [
    { title: "Read next-high.ts", text: "It filters by kind but not by time, so an earlier tide can win.", ms: 900 },
    { title: "Fix the filter", text: "Compare with the current time before sorting.", ms: 1000 },
    { title: "Check midnight", text: "Tides just after midnight belong to the next day's list.", ms: 1200 },
  ],
  radar: [
    {
      title: "Watch a frame change",
      text: "The tile layer swaps before its images have decoded, so the grid shows empty.",
      ms: 1100,
    },
    { title: "Find the swap", text: "swap.ts replaces the layer as soon as the frame arrives.", ms: 900 },
    {
      title: "Wait for decoding",
      text: "Decode every tile off screen and swap once, so the map never blinks.",
      ms: 1300,
    },
  ],
  other: [
    { title: "Read the request", text: "Work out which part of the project the request touches.", ms: 900 },
    { title: "Find the relevant files", text: "Search for the components and data the change depends on.", ms: 1100 },
    { title: "Plan a small change", text: "Keep the first draft small enough to review in one sitting.", ms: 1000 },
  ],
};

function scriptFor(chat: Chat): Script {
  const base = planFor(chat);
  const key = chat.project === "radar-tiles" ? "radar" : chat.id in thoughts ? chat.id : "other";
  return { ...base, reasoning: thoughts[key] };
}

function planFor(chat: Chat): PlanScript {
  const plan = (
    read: string,
    reply: string,
    options: { edit?: ChangedFile; draft?: string; run?: boolean } = {},
  ): PlanScript => {
    const command = commands[chat.project];
    const steps: ScriptStep[] = [
      { label: read, ms: 1200, usage: 3 },
      { label: "Find the cause", ms: 1500, usage: 2 },
      { label: options.draft ?? "Draft a change", ms: 1400, usage: 3, edit: options.edit ?? edits[chat.project] },
    ];
    if (options.run !== false) steps.push({ label: `Run ${command[0].text}`, ms: 1300, usage: 2, command });
    return { steps, reply };
  };
  switch (chat.id) {
    case "feels-like":
      return {
        steps: [
          { label: "Read the review comments", ms: 1300, usage: 2 },
          {
            label: "Update wind-chill.ts",
            ms: 1500,
            usage: 3,
            edit: { ...forecastFiles[1], code: chillReviewed },
          },
          { label: "Run pnpm test stations", ms: 1400, usage: 2, command: testRun },
        ],
        reply:
          "Done. windChill now rounds the wind to a tenth before it compares it with the calm threshold, as the review asked, and all 12 station tests still pass.",
      };
    case "snow-axis":
      return plan(
        "Read snow-depth-chart.ts",
        "The axis now starts at zero for every station and tops out at the season's deepest reading plus a tenth. Nozawa's 212 cm base no longer looks like a small change.",
      );
    case "slow-list":
      return plan(
        "Read station-list.ts and the stations API",
        "The list now asks for the latest reading only, so it opens in under a second on a slow connection. A station's history loads when its row opens.",
        {
          edit: {
            dir: "src/stations/",
            name: "station-list.ts",
            lang: "ts",
            code: listCode,
            added: 3,
            removed: 3,
            lines: [2, 6, 7],
          },
        },
      );
    case "legend":
      return plan(
        "Read avalanche-legend.ts",
        "Each level now carries its number and its own hatching, so levels 2 and 3 read apart without colour. The draft is in the Changes tab.",
        {
          draft: "Draft a change to the swatches",
          run: false,
          edit: {
            dir: "src/legend/",
            name: "avalanche-legend.ts",
            lang: "ts",
            code: legendCode,
            added: 4,
            removed: 3,
            lines: [2, 3, 4, 5],
          },
        },
      );
    case "bulletin":
      return plan(
        "Read the morning template",
        "The night palette now reaches the summary table too. Every cell takes its colours from the palette, and the warning row keeps a contrast of 7.2 : 1.",
      );
    case "tides":
      return plan(
        "Read next-high.ts",
        "The next high tide now skips readings from earlier in the day, so the page never shows a tide that has already passed.",
      );
    case "radar-flicker":
    case "offline-tiles":
      return plan(
        "Read swap.ts and the tile layer",
        "Frames now wait until every tile has decoded before they swap in, so the map never shows an empty grid.",
      );
    default:
      return plan(
        "Read the relevant files",
        "I've drafted a first change. It's in the Changes tab, and nothing has been committed.",
      );
  }
}

const voiceText: Record<ProjectId, string> = {
  "forecast-web": "Show the feels-like value on the hourly view as well",
  "bulletin-mailer": "Add a plain text part to the morning bulletin",
  "harbour-feed": "Show the low tide next to the high tide",
  "radar-tiles": "Keep the radar frames for two hours instead of one",
};

const suggestions: Record<ProjectId, string[]> = {
  "forecast-web": [
    "Why does the radar map flicker when it refreshes?",
    "Add a sunrise time to each station card",
    "Review the feels-like column before Friday",
  ],
  "bulletin-mailer": ["Add a plain text part to the morning bulletin", "Send a test bulletin to the Otaru office"],
  "harbour-feed": ["Show the low tide next to the high tide", "Warn when the harbour feed is late"],
  "radar-tiles": ["Keep radar frames for two hours", "Draw tiles at 2× for retina screens"],
};

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 240, damping: 30 });
  const text = useTransform(spring, (v) => String(Math.round(v)));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return <motion.span>{text}</motion.span>;
}

function Diff({ added, removed, className }: { added: number; removed: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1.5 text-[13px] tabular-nums", className)}>
      <span className="text-success-strong">
        +<Count value={added} />
      </span>
      {removed > 0 && (
        <span className="text-destructive-strong">
          −<Count value={removed} />
        </span>
      )}
    </span>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.84em] text-foreground">{children}</code>;
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

const tasks: ActionItem[] = [
  { id: "find", kind: "search", label: "Searched for", detail: "StationTable", status: "done" },
  { id: "read", kind: "read", label: "Read", detail: "station-table.tsx", status: "done" },
  { id: "chill", kind: "write", label: "Created", detail: "wind-chill.ts", status: "done" },
  { id: "table", kind: "write", label: "Edited", detail: "station-table.tsx", status: "done" },
  { id: "test", kind: "write", label: "Created", detail: "wind-chill.test.ts", status: "done" },
  { id: "run", kind: "run", label: "Ran", detail: "pnpm test stations", status: "done" },
];

const summary =
  "All 12 station tests pass. At 06:00 Hakuba Happō-one read −6.2 °C in a 28 km/h wind, so the table now shows it feels like −14 °C.";

function ChangedFiles({ onOpen }: { onOpen: (name: string) => void }) {
  const added = forecastFiles.reduce((n, f) => n + f.added, 0);
  const removed = forecastFiles.reduce((n, f) => n + f.removed, 0);
  return (
    <div className="overflow-clip rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 py-1.5 ps-4 pe-1.5">
        <p className="text-sm font-medium">{forecastFiles.length} files changed</p>
        <Diff added={added} removed={removed} />
        <Button variant="ghost" size="sm" className="ms-auto text-[13px]" onPress={() => onOpen(forecastFiles[0].name)}>
          Review
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {forecastFiles.map((f) => (
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
              <Diff added={f.added} removed={f.removed} />
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
        10 °C or below 4.8 km/h.
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

function PlanCard({
  plan,
  onOpenChange,
}: {
  plan: Extract<Message, { kind: "plan" }>;
  onOpenChange: (open: boolean) => void;
}) {
  const total = plan.steps.length;
  const done = plan.steps.filter((s) => s.status === "done").length;
  const left = total - done;
  const current = plan.steps.find((s) => s.status === "running");
  const count = `${left} ${left === 1 ? "step" : "steps"} left`;
  const text =
    plan.outcome === "stopped"
      ? `Stopped after ${done} of ${total} steps`
      : plan.outcome === "done"
        ? `All ${total} steps done`
        : !plan.open && current
          ? `${count} · ${current.label}`
          : count;
  return (
    <RunChecklist
      steps={plan.steps}
      summary={text}
      strikeDone
      outcome={plan.outcome}
      expanded={plan.open}
      onExpandedChange={onOpenChange}
      aria-label="Plan"
    />
  );
}

function Marker({ text }: { text: string }) {
  return (
    <div role="note" className="flex items-center gap-3 text-xs leading-4 text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="tabular-nums">{text}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

function EmptyChat({ project, onPick }: { project: ProjectId; onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <SquarePen className="size-5" />
      </span>
      <h2 className="mt-4 text-2xl leading-8 font-semibold tracking-[-0.02em] text-balance">
        What should we change today?
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Ask about <span className="font-mono text-[13px] text-foreground">{project}</span>, paste an error, or describe
        a change you&apos;d like to review.
      </p>
      <ul className="mt-6 flex w-full max-w-md flex-col gap-1.5">
        {suggestions[project].map((s) => (
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

interface TranscriptActions {
  openFile: (name: string) => void;
  togglePlan: (chat: string, id: string, open: boolean) => void;
  send: (text: string) => void;
  memory: Map<string, number>;
}

const Transcript = memo(function Transcript({
  chat,
  messages,
  actions,
  active,
  onHidden,
}: {
  chat: Chat;
  messages: Message[];
  actions: TranscriptActions;
  active: boolean;
  onHidden: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !active) return;
    el.style.setProperty("--miyuki-coding-assistant-enter", "70ms");
    el.style.setProperty("--miyuki-coding-assistant-step", "30ms");
    const timer = window.setTimeout(() => {
      el.style.setProperty("--miyuki-coding-assistant-enter", "0ms");
      el.style.setProperty("--miyuki-coding-assistant-step", "0ms");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const saved = actions.memory.get(chat.id);
    el.scrollTop = saved ?? el.scrollHeight;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }, [chat.id]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const onScroll = () => {
      if (el.clientHeight === 0) return;
      actions.memory.set(chat.id, el.scrollTop);
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };
    const observer = new ResizeObserver(() => {
      if (!stick.current) return;
      el.scrollTop = el.scrollHeight;
      actions.memory.set(chat.id, el.scrollTop);
    });
    observer.observe(inner);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [chat.id]);

  return (
    <motion.div
      ref={scroller}
      inert={!active}
      initial={{ opacity: 0 }}
      animate={
        active
          ? { opacity: 1, y: 0, transition: { duration: 0.12, delay: 0.07, ease: "easeOut" } }
          : { opacity: 0, y: reduce ? 0 : 4, transition: { duration: 0.08, ease: "easeOut" } }
      }
      onAnimationComplete={() => {
        if (!active) onHidden(`chat:${chat.id}`);
      }}
      data-view-layer={`chat:${chat.id}`}
      className="absolute inset-x-0 top-0 bottom-(--miyuki-coding-assistant-composer) overflow-y-auto overscroll-contain [overflow-anchor:none] [mask-image:linear-gradient(to_bottom,transparent,#000_20px,#000_calc(100%-20px),transparent)] [scrollbar-gutter:stable] [scrollbar-width:thin]"
    >
      <div ref={content} className="mx-auto flex min-h-full w-full max-w-[46rem] flex-col px-1 pt-6 pb-8 sm:px-6">
        {messages.length === 0 ? (
          <EmptyChat project={chat.project} onPick={actions.send} />
        ) : (
          <>
            <p className="mb-6 text-center text-xs text-muted-foreground">{chat.date}</p>
            <ol aria-label="Messages" className="flex flex-col gap-8">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => {
                  const order = Math.max(0, i - (messages.length - 4));
                  const folds = m.kind === "plan";
                  return (
                    <motion.li
                      key={m.id}
                      exit={
                        folds
                          ? {
                              opacity: 0,
                              height: 0,
                              marginTop: m.kind === "plan" ? -32 : 0,
                              transition: reduce
                                ? { duration: 0.12 }
                                : { height: { duration: 0.24, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.14 } },
                            }
                          : undefined
                      }
                      className={cn(
                        folds && "overflow-clip",
                        "motion-safe:animate-[miyuki-coding-assistant-rise_140ms_cubic-bezier(0.22,1,0.36,1)_both]",
                      )}
                      style={{
                        animationDelay: `calc(var(--miyuki-coding-assistant-enter, 0ms) + var(--miyuki-coding-assistant-step, 0ms) * ${order})`,
                      }}
                    >
                      <MessageView chat={chat.id} message={m} actions={actions} />
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </>
        )}
      </div>
    </motion.div>
  );
});

function MessageView({ chat, message, actions }: { chat: string; message: Message; actions: TranscriptActions }) {
  switch (message.kind) {
    case "user":
      return <UserBubble text={message.text} />;
    case "plan":
      return <PlanCard plan={message} onOpenChange={(open) => actions.togglePlan(chat, message.id, open)} />;
    case "marker":
      return <Marker text={message.text} />;
    case "rich":
      return (
        <div className="flex flex-col gap-4 text-base leading-7">
          {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}
          <div className="flex flex-col gap-5">
            <FeelsLikeReply onOpen={actions.openFile} />
            <MessageActions text={summary} />
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-4 text-base leading-7">
          {message.reasoning && <ReasoningBlock reasoning={message.reasoning} live={message.live} />}
          {message.text !== "" && (
            <div className="flex flex-col gap-5">
              {message.fresh ? (
                <ArrivingText text={message.text} startOnView={false} stagger={0.035} duration={0.4} />
              ) : (
                <p>{message.text}</p>
              )}
              <MessageActions text={message.text} />
            </div>
          )}
        </div>
      );
  }
}

const ThemeSwitch = memo(function ThemeSwitch({ collapsed }: { collapsed: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);
  const current = theme ?? "light";
  const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
  const label = `Theme: ${themeNames[current]}. Switch to ${themeNames[next]}`;
  return (
    <div className="grid shrink-0 grid-cols-1">
      <SegmentedControl
        aria-label="Theme"
        size="sm"
        fullWidth
        selectedKeys={theme ? [theme] : []}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key != null) applyTheme(String(key) as Theme);
        }}
        className={cn(
          "col-start-1 row-start-1 min-w-0 transition-[opacity,visibility] ease-settle motion-reduce:transition-none",
          collapsed ? "invisible opacity-0 duration-100" : "visible opacity-100 delay-100 duration-200",
        )}
      >
        {themeOrder.map((id) => (
          <TooltipTrigger key={id} delay={500}>
            <Segment id={id} aria-label={themeNames[id]}>
              <MorphIcon shapes={morphIcons.sunMoonDisc} shape={themeIcon[id]} size={16} strokeWidth={1.75} />
            </Segment>
            <Tooltip>{themeNames[id]}</Tooltip>
          </TooltipTrigger>
        ))}
      </SegmentedControl>
      <TooltipTrigger isDisabled={!collapsed} delay={300}>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={label}
          onPress={() => applyTheme(next)}
          className={cn(
            "col-start-1 row-start-1 w-full text-muted-foreground data-[hovered]:text-foreground",
            "transition-[opacity,visibility,background-color,color] ease-settle motion-reduce:transition-none",
            collapsed ? "visible opacity-100 delay-100 duration-200" : "invisible opacity-0 duration-100",
          )}
        >
          <MorphIcon shapes={morphIcons.sunMoonDisc} shape={themeIcon[current]} size={16} strokeWidth={1.75} />
        </IconButton>
        <Tooltip placement="right" offset={12}>
          {label}
        </Tooltip>
      </TooltipTrigger>
    </div>
  );
});

const WEEK_USAGE = 62;

const UsageCard = memo(function UsageCard({ collapsed, onUpgrade }: { collapsed: boolean; onUpgrade: () => void }) {
  return (
    <div className="grid shrink-0 grid-cols-1">
      <div
        className={cn(
          "col-start-1 row-start-1 min-w-0 rounded-xl bg-muted/70 p-3 ring-1 ring-border/60 ring-inset",
          "transition-[opacity,visibility] ease-settle motion-reduce:transition-none",
          collapsed ? "invisible opacity-0 duration-100" : "visible opacity-100 delay-100 duration-200",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-5 font-medium text-foreground">Team plan</p>
            <p className="text-xs leading-4 text-muted-foreground tabular-nums">
              {WEEK_USAGE}% of this week&apos;s usage
            </p>
          </div>
          <Button variant="secondary" size="sm" onPress={onUpgrade} className="-me-1 h-7 rounded-md px-2.5 text-xs">
            Upgrade
          </Button>
        </div>
        <ProgressBar size="sm" value={WEEK_USAGE} showValue={false} aria-label="This week's usage" className="mt-2.5" />
      </div>
      <TooltipTrigger isDisabled={!collapsed} delay={300}>
        <AriaButton
          aria-label={`Team plan, ${WEEK_USAGE}% of this week's usage`}
          onPress={onUpgrade}
          className={({ isHovered, isFocusVisible }) =>
            cn(
              "col-start-1 row-start-1 flex h-8 w-full cursor-default items-center justify-center rounded-lg text-brand outline-none",
              "transition-[opacity,visibility,background-color] ease-settle motion-reduce:transition-none",
              isHovered && "bg-accent/60",
              isFocusVisible && "ring-[3px] ring-ring",
              collapsed ? "visible opacity-100 delay-100 duration-200" : "invisible opacity-0 duration-100",
            )
          }
        >
          <ProgressRing size="sm" value={WEEK_USAGE} aria-hidden="true" />
        </AriaButton>
        <Tooltip placement="right" offset={12}>
          Team plan · {WEEK_USAGE}% of this week&apos;s usage
        </Tooltip>
      </TooltipTrigger>
    </div>
  );
});

function UsageLine({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-muted/70 ps-2 pe-1 ring-1 ring-border/60 ring-inset">
      <ProgressRing size="sm" value={WEEK_USAGE} aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums">{WEEK_USAGE}% used this week</p>
      <Button variant="ghost" size="sm" onPress={onUpgrade} className="h-6 rounded-md px-2 text-xs">
        Upgrade
      </Button>
    </div>
  );
}

const compactLinks: FloatingSidebarItem[] = [
  { id: "support", label: "Support", icon: <LifeBuoy /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

function TinyRailMenu({ onPick }: { onPick: (id: string) => void }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);
  return (
    <Dropdown>
      <TooltipTrigger delay={300}>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Theme and support"
          className="w-full text-muted-foreground data-[hovered]:text-foreground aria-expanded:bg-accent"
        >
          <Ellipsis />
        </IconButton>
        <Tooltip placement="right" offset={12}>
          Theme and support
        </Tooltip>
      </TooltipTrigger>
      <DropdownMenu placement="end bottom" offset={14} onAction={(key) => key === "support" && onPick("support")}>
        <DropdownSection
          title="Theme"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={theme ? [theme] : []}
          onSelectionChange={(keys) => {
            const [key] = keys === "all" ? [] : [...keys];
            if (key != null) applyTheme(String(key) as Theme);
          }}
        >
          {themeOrder.map((id) => (
            <DropdownItem
              key={id}
              id={id}
              textValue={themeNames[id]}
              icon={<MorphIcon shapes={morphIcons.sunMoonDisc} shape={themeIcon[id]} size={16} strokeWidth={1.75} />}
            >
              {themeNames[id]}
            </DropdownItem>
          ))}
        </DropdownSection>
        <DropdownSeparator />
        <DropdownItem id="support" icon={<LifeBuoy />}>
          Support
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

function CompactFooter({
  collapsed,
  tiny,
  onPick,
  renderItem,
}: {
  collapsed: boolean;
  tiny: boolean;
  onPick: (id: string) => void;
  renderItem: (item: FloatingSidebarItem) => ReactNode;
}) {
  if (collapsed) {
    return (
      <div className="flex shrink-0 flex-col gap-1">
        {tiny ? (
          <TinyRailMenu onPick={onPick} />
        ) : (
          <>
            <ThemeSwitch collapsed />
            {renderItem(compactLinks[0])}
          </>
        )}
        {renderItem(compactLinks[1])}
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="min-w-0 flex-1">
        <ThemeSwitch collapsed={false} />
      </div>
      {renderItem(compactLinks[0])}
      {renderItem(compactLinks[1])}
    </div>
  );
}

const connectors = [
  { id: "issues", name: "Issue tracker", description: "Link an issue to this chat", icon: <CircleDot /> },
  { id: "design", name: "Design files", description: "Bring in a frame from the designs", icon: <Frame /> },
  { id: "docs", name: "Docs", description: "Search the team's written guides", icon: <BookOpen /> },
  { id: "sheets", name: "Spreadsheets", description: "Read station data from a sheet", icon: <Sheet /> },
];

function Listening() {
  const bars = [0.62, 0.84, 0.53, 0.77, 0.69];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18 }}
      className="pointer-events-none absolute inset-0 flex items-center gap-3 px-4"
    >
      <span aria-hidden="true" className="flex h-5 items-center gap-[3px] text-brand">
        {bars.map((d, i) => (
          <span
            key={i}
            className="h-full w-[3px] origin-center rounded-full bg-current motion-safe:animate-[miyuki-coding-assistant-level_0.7s_ease-in-out_infinite_alternate] motion-reduce:scale-y-50"
            style={{ animationDuration: `${d}s`, animationDelay: `${-i * 0.13}s` }}
          />
        ))}
      </span>
      <span role="status" className="text-base text-muted-foreground">
        Listening
      </span>
    </motion.div>
  );
}

function Chip({ icon, children, onRemove }: { icon: ReactNode; children: string; onRemove: () => void }) {
  return (
    <li className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-soft ps-2.5 pe-1 text-[13px] text-brand-strong [&>svg]:size-3.5">
      {icon}
      {children}
      <CloseButton
        size="sm"
        aria-label={`Remove ${children}`}
        onPress={onRemove}
        className="size-5 text-brand-strong/80 [&_svg]:size-3"
      />
    </li>
  );
}

function Picker({
  label,
  value,
  icon,
  items,
  onChange,
  search,
  footer,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  items: string[];
  onChange: (value: string) => void;
  search?: string;
  footer?: (close: () => void) => ReactNode;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  const list = (close: () => void) => (
    <ListBox
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [key] = keys === "all" ? [] : [...keys];
        if (key == null) return;
        onChange(String(key));
        close();
      }}
      renderEmptyState={() => <p className="px-3 py-5 text-center text-[13px] text-muted-foreground">No matches</p>}
      className="max-h-56 min-h-0 overflow-y-auto p-1 outline-none"
    >
      {items.map((item) => (
        <SelectItem key={item} id={item} textValue={item} icon={icon}>
          <span className="font-mono text-[13px]">{item}</span>
        </SelectItem>
      ))}
    </ListBox>
  );
  return (
    <PopoverTrigger>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${label}: ${value}`}
        iconStart={icon}
        className={cn(ghostPill, "min-w-0 shrink")}
      >
        <span className="font-mono text-xs @max-[30rem]:sr-only">{value}</span>
      </Button>
      <Popover placement="top start" offset={8} aria-label={label} className="flex w-64 flex-col overflow-hidden p-0">
        {({ close }) => (
          <>
            {search ? (
              <Autocomplete filter={contains}>
                <AriaSearchField
                  aria-label={search}
                  autoFocus
                  className="flex shrink-0 items-center gap-2 border-b border-border ps-3 pe-2"
                >
                  <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder={search}
                    className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                  />
                </AriaSearchField>
                {list(close)}
              </Autocomplete>
            ) : (
              list(close)
            )}
            {footer && <div className="border-t border-border p-1">{footer(close)}</div>}
          </>
        )}
      </Popover>
    </PopoverTrigger>
  );
}

function segmentsFor(usage: number): ContextSegment[] {
  const rest = Math.max(0, (usage / 100) * WINDOW - 16_000);
  return [
    { label: "System prompt", value: 6_000 },
    { label: "Tools", value: 10_000 },
    { label: "Files read", value: Math.round(rest * 0.55) },
    { label: "Conversation", value: Math.round(rest * 0.45) },
  ];
}

const limits = [
  { label: "This session", resetsIn: "in 3 h 12 min", value: 34 },
  { label: "This week", resetsIn: "on Monday at 09:00", value: WEEK_USAGE },
];

function ContextRing({ usage, canCompact, onCompact }: { usage: number; canCompact: boolean; onCompact: () => void }) {
  const reduce = useReducedMotion();
  const tone = usage >= 90 ? "text-destructive" : usage >= 75 ? "text-warning-strong" : "text-muted-foreground";
  return (
    <PopoverTrigger>
      <AriaButton
        aria-label={`Context window, ${usage}% used`}
        className={({ isHovered, isFocusVisible, isPressed }) =>
          cn(
            "flex h-7 shrink-0 cursor-default items-center gap-1.5 rounded-md px-1.5 text-xs outline-none select-none",
            "transition-[background-color,color,scale] duration-150 ease-settle",
            tone,
            (isHovered || isPressed) && "bg-accent",
            isPressed && "scale-[0.97]",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4 -rotate-90">
          <circle cx="10" cy="10" r="7.25" strokeWidth="2.5" className="stroke-current opacity-20" />
          <motion.circle
            cx="10"
            cy="10"
            r="7.25"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-current"
            initial={false}
            animate={{ pathLength: usage / 100 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
          />
        </svg>
        <span className="tabular-nums">
          <Count value={usage} />%
        </span>
      </AriaButton>
      <Popover
        placement="top end"
        offset={8}
        aria-label="Context window"
        className="w-[22rem] max-w-[calc(100vw-24px)] overflow-y-auto p-0"
      >
        <ContextMeter
          context={{ used: (usage / 100) * WINDOW, total: WINDOW, segments: segmentsFor(usage) }}
          limits={limits}
          className="rounded-none border-0 bg-transparent shadow-none"
        />
        <div className="border-t border-border px-5 pt-3.5 pb-4">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            isDisabled={!canCompact}
            onPress={(event) => {
              const dialog = event.target.closest<HTMLElement>("[role=dialog]");
              onCompact();
              requestAnimationFrame(() => dialog?.focus());
            }}
          >
            Compact conversation
          </Button>
          <p className="mt-2 text-[13px] leading-[18px] text-muted-foreground">
            Summarises older turns to free space. The last few messages stay as they are.
          </p>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}

let attachmentSeq = 0;

const Composer = memo(function Composer({
  chatId,
  draft,
  project,
  branch,
  branches,
  onBranch,
  onNewBranch,
  running,
  usage,
  canCompact,
  onCompact,
  onSend,
  onStop,
}: {
  chatId: string;
  draft: boolean;
  project: Project;
  branch: string;
  branches: string[];
  onBranch: (branch: string) => void;
  onNewBranch: () => void;
  running: boolean;
  usage: number;
  canCompact: boolean;
  onCompact: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const reduce = useReducedMotion();
  const { settings } = useSettings();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<AttachmentTrayItem[]>([]);
  const [planFirst, setPlanFirst] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  const [model, setModel] = useState("standard");
  const [effort, setEffort] = useState(1);
  const [mode, setMode] = useState("agent");
  const [folders, setFolders] = useState<Record<string, string>>({});
  const [listening, setListening] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useRef<number[]>([]);
  const folder = folders[project.id] ?? project.folders[0];
  const currentMode = modes.find((m) => m.id === mode) ?? modes[0];

  function clearVoice() {
    voice.current.forEach((t) => window.clearTimeout(t));
    voice.current = [];
  }

  useEffect(() => {
    clearVoice();
    setListening(false);
    if (!draft) return;
    setMode(settings.defaultMode);
    setModel(settings.defaultModel);
    setEffort(settings.defaultEffort);
  }, [chatId]);

  useEffect(() => clearVoice, []);

  function listen() {
    if (listening) {
      clearVoice();
      setListening(false);
      return;
    }
    clearVoice();
    setListening(true);
    const said = voiceText[project.id];
    const base = text.trim() ? `${text.trimEnd()} ` : "";
    voice.current.push(
      window.setTimeout(() => {
        setListening(false);
        for (let i = 1; i <= said.length; i++) {
          voice.current.push(window.setTimeout(() => setText(base + said.slice(0, i)), reduce ? 0 : i * 18));
        }
        voice.current.push(window.setTimeout(() => area.current?.focus(), reduce ? 0 : said.length * 18 + 40));
      }, 3000),
    );
  }

  function send() {
    if (running || !text.trim()) return;
    clearVoice();
    setListening(false);
    onSend(text);
    setText("");
    setFiles([]);
    area.current?.focus();
  }

  function addFiles(list: File[]) {
    setFiles((all) => [...all, ...list.map((f) => ({ id: `file-${++attachmentSeq}`, name: f.name, type: f.type }))]);
  }

  function onAdd(key: Key) {
    if (key === "files") picker.current?.click();
    else if (key === "screenshot") {
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
      setFiles((all) => [...all, { id: `file-${++attachmentSeq}`, name: `Preview ${stamp}.png`, type: "image/png" }]);
    } else if (key === "goal") {
      if (!text.startsWith("Done when ")) setText(`Done when ${text}`);
      requestAnimationFrame(() => area.current?.focus());
    } else if (key === "plan") setPlanFirst((on) => !on);
    else {
      const id = String(key);
      setLinked((all) => (all.includes(id) ? all.filter((c) => c !== id) : [...all, id]));
    }
  }

  const chips = planFirst || linked.length > 0;

  return (
    <div className="@container mx-auto w-full max-w-[46rem] shrink-0 px-0 pb-1 sm:px-6">
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const list = event.currentTarget.files;
          if (list && list.length > 0) addFiles(Array.from(list));
          event.currentTarget.value = "";
        }}
      />
      <div
        onMouseDown={focusPromptBoxOnBlankClick}
        className={cn(
          "relative flex flex-col rounded-2xl border border-border bg-card shadow-sm",
          "transition-[border-color,box-shadow] duration-200 ease-settle",
          "has-[textarea:focus]:border-brand/60 has-[textarea:focus]:shadow-md",
        )}
      >
        {files.length > 0 && (
          <AttachmentTray
            files={files}
            onRemove={(id) => setFiles((all) => all.filter((f) => f.id !== id))}
            className="pt-1.5"
          />
        )}
        {chips && (
          <ul aria-label="Added to this message" className="flex flex-wrap gap-1.5 px-3 pt-3">
            {planFirst && (
              <Chip icon={<ListChecks aria-hidden="true" />} onRemove={() => setPlanFirst(false)}>
                Plan first
              </Chip>
            )}
            {connectors
              .filter((c) => linked.includes(c.id))
              .map((c) => (
                <Chip key={c.id} icon={c.icon} onRemove={() => setLinked((all) => all.filter((id) => id !== c.id))}>
                  {c.name}
                </Chip>
              ))}
          </ul>
        )}
        <div
          className="relative"
          onKeyDownCapture={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.altKey) return;
            if (event.nativeEvent.isComposing) return;
            const mod = event.metaKey || event.ctrlKey;
            if (settings.sendWith === "mod-enter") {
              event.stopPropagation();
              if (mod) {
                event.preventDefault();
                send();
              }
            } else if (mod) {
              event.stopPropagation();
              event.preventDefault();
              send();
            }
          }}
        >
          <PromptBoxTextArea
            ref={area}
            value={text}
            onChange={setText}
            onSubmit={send}
            placeholder={
              planFirst
                ? "Describe the change, and we'll agree a plan first"
                : settings.sendWith === "mod-enter"
                  ? "Ask for a change or a review. ⌘ Enter sends"
                  : "Ask for a change or a review"
            }
            minRows={2}
            maxRows={6}
            isDisabled={listening}
            textAreaClassName={cn("pt-3.5", listening && "invisible")}
          />
          <AnimatePresence>{listening && <Listening />}</AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5 px-3 pt-1 pb-3">
          <Dropdown>
            <TooltipTrigger delay={700}>
              <IconButton
                variant="secondary"
                size="sm"
                aria-label="Add files, context and connectors"
                className="rounded-full text-muted-foreground shadow-none data-[hovered]:text-foreground [&_svg]:size-[18px]"
              >
                <Plus strokeWidth={1.75} />
              </IconButton>
              <Tooltip>Add files, context and connectors</Tooltip>
            </TooltipTrigger>
            <DropdownMenu placement="top start" popoverClassName="w-72" onAction={onAdd}>
              <DropdownSection title="Add">
                <DropdownItem id="files" icon={<FolderOpen />} description="Pick files or a folder from your computer">
                  Files and folders
                </DropdownItem>
                <DropdownItem id="screenshot" icon={<Camera />} description="Capture the preview as it looks now">
                  Screenshot
                </DropdownItem>
                <DropdownItem id="goal" icon={<Target />} description="Set what done looks like">
                  Goal
                </DropdownItem>
                <DropdownItem id="plan" icon={<ListChecks />} description="Agree a plan before any edit">
                  {planFirst ? "Stop planning first" : "Plan first"}
                </DropdownItem>
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Connectors">
                {connectors.map((c) => (
                  <DropdownItem key={c.id} id={c.id} icon={c.icon} description={c.description} textValue={c.name}>
                    {c.name}
                  </DropdownItem>
                ))}
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
          <span className="flex-1" />
          <ModelPicker model={model} onModel={setModel} effort={effort} onEffort={setEffort} />
          <TooltipTrigger delay={700}>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={listening ? "Stop listening" : "Voice input"}
              aria-pressed={listening}
              onPress={listen}
              className={cn(
                "rounded-full text-muted-foreground data-[hovered]:text-foreground",
                listening && "bg-brand-soft text-brand-strong data-[hovered]:text-brand-strong",
              )}
            >
              <MorphIcon shapes={micShapes} shape={listening ? "stop" : "mic"} size={18} strokeWidth={1.75} />
            </IconButton>
            <Tooltip>{listening ? "Stop listening" : "Voice input"}</Tooltip>
          </TooltipTrigger>
          <PromptBoxSendButton
            status={running ? "streaming" : "idle"}
            isDisabled={!text.trim() || listening}
            onSend={send}
            onStop={onStop}
          />
        </div>
      </div>
      <div className="mt-1.5 flex h-8 min-w-0 items-center gap-0.5 ps-1.5">
        <Picker
          label="Branch"
          value={branch}
          icon={<GitBranch />}
          items={branches}
          onChange={onBranch}
          search="Search branches"
          footer={(close) => (
            <Button
              variant="ghost"
              size="sm"
              iconStart={<GitBranchPlus />}
              className="w-full justify-start px-2.5 font-normal"
              onPress={() => {
                onNewBranch();
                close();
              }}
            >
              New branch…
            </Button>
          )}
        />
        <Picker
          label="Folder"
          value={folder}
          icon={<Folder />}
          items={project.folders}
          onChange={(value) => setFolders((all) => ({ ...all, [project.id]: value }))}
        />
        <Dropdown>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Mode: ${currentMode.name}`}
            iconStart={<SlidersHorizontal />}
            className={ghostPill}
          >
            <span className="@max-[30rem]:sr-only">{currentMode.name}</span>
          </Button>
          <DropdownMenu
            aria-label="Mode"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[mode]}
            indicator="check"
            onSelectionChange={(keys) => {
              const [key] = keys === "all" ? [] : [...keys];
              if (key != null) setMode(String(key));
            }}
            placement="top start"
            popoverClassName="w-72"
          >
            {modes.map((m) => (
              <DropdownItem key={m.id} id={m.id} icon={m.icon} description={m.description} textValue={m.name}>
                {m.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
        <span className="min-w-2 flex-1" />
        <ContextRing usage={usage} canCompact={canCompact} onCompact={onCompact} />
      </div>
    </div>
  );
});

function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("grid grid-cols-1 grid-rows-1", className)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={id}
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.16, delay: 0.07, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: reduce ? 0 : 4, transition: { duration: 0.08, ease: "easeOut" } }}
          data-swap=""
          className="col-start-1 row-start-1 min-h-0 min-w-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FileSwitcher({
  files,
  current,
  onFile,
}: {
  files: ChangedFile[];
  current: ChangedFile;
  onFile: (name: string) => void;
}) {
  return (
    <Dropdown>
      <AriaButton
        aria-label={`File: ${current.dir}${current.name}`}
        className={({ isHovered, isFocusVisible, isPressed }) =>
          cn(
            "flex h-9 w-full min-w-0 cursor-default items-center gap-2.5 rounded-lg border bg-card ps-3 pe-2.5 text-start shadow-xs outline-none select-none",
            "transition-[border-color,background-color,box-shadow] duration-150 ease-settle",
            isHovered || isPressed ? "border-border-strong" : "border-input",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        {current.created ? (
          <FilePlus aria-hidden="true" className="size-4 shrink-0 text-success-strong" />
        ) : (
          <FileCode aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
          <span className="text-muted-foreground">{current.dir}</span>
          {current.name}
        </span>
        <Diff added={current.added} removed={current.removed} />
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </AriaButton>
      <DropdownMenu
        aria-label="Changed files"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[current.name]}
        indicator="check"
        onSelectionChange={(keys) => {
          const [key] = keys === "all" ? [] : [...keys];
          if (key != null) onFile(String(key));
        }}
        placement="bottom start"
        popoverClassName="max-w-[calc(100vw-24px)]"
      >
        {files.map((f) => (
          <DropdownItem
            key={f.name}
            id={f.name}
            textValue={f.name}
            icon={f.created ? <FilePlus className="text-success-strong" /> : <FileCode />}
            description={
              <span className="tabular-nums">
                {f.dir} · <span className="text-success-strong">+{f.added}</span>
                {f.removed > 0 && <span className="text-destructive-strong"> −{f.removed}</span>}
              </span>
            }
          >
            <span className="font-mono text-[13px]">{f.name}</span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

function UndoAll({ count, branch, onConfirm }: { count: number; branch: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="-me-1.5 shrink-0 text-[13px] text-muted-foreground data-[hovered]:text-foreground"
      >
        Undo all
      </Button>
      <Popover placement="bottom end" offset={6} aria-label="Undo all changes" className="w-72 overflow-y-auto">
        <p className="text-sm font-medium text-foreground">Undo all changes?</p>
        <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground">
          This puts back the last commit on <span className="font-mono text-xs text-foreground">{branch}</span> and
          discards {count} uncommitted {count === 1 ? "change" : "changes"}.
        </p>
        <div className="mt-3.5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onPress={() => setOpen(false)}>
            Keep changes
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onPress={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Undo all
          </Button>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}

function ChangesView({
  project,
  files,
  branch,
  file,
  onFile,
  onUndoAll,
}: {
  project: Project;
  files: ChangedFile[];
  branch: string;
  file: string;
  onFile: (name: string) => void;
  onUndoAll: () => void;
}) {
  const reduce = useReducedMotion();
  const current = files.find((f) => f.name === file) ?? files[0];
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {current ? (
        <motion.div
          key="dirty"
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
          exit={{
            opacity: 0,
            y: reduce ? 0 : -4,
            scale: reduce ? 1 : 0.99,
            transition: { duration: 0.16, ease: "easeIn" },
          }}
          className="flex flex-col gap-3 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium text-foreground tabular-nums">
                {files.length} uncommitted {files.length === 1 ? "change" : "changes"}
              </p>
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                <GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate font-mono text-xs">{branch}</span>
                <Diff added={added} removed={removed} className="ms-1" />
              </p>
            </div>
            <UndoAll count={files.length} branch={branch} onConfirm={onUndoAll} />
          </div>
          <FileSwitcher files={files} current={current} onFile={onFile} />
          <CodeBlock
            key={current.dir + current.name + current.code.length}
            filename={current.dir + current.name}
            language={current.lang}
            code={current.code}
            highlightLines={current.lines}
            showLineNumbers
            className="not-fumadocs-codeblock"
          />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-brand" />
            {current.created
              ? "New file, every line added"
              : `${current.added} lines added, ${current.removed} removed`}
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="clean"
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          className="flex flex-col items-center px-6 pt-14 pb-10 text-center"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-success-soft text-success-strong"
          >
            <GitCommitHorizontal className="size-5" />
          </span>
          <p className="mt-3 text-sm leading-5 font-medium text-foreground">Working tree clean</p>
          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            Nothing to review on <span className="font-mono text-xs text-foreground">{branch}</span>.
          </p>
          <div className="mt-6 w-full rounded-xl border border-border p-3.5 text-start">
            <p className="text-xs leading-4 text-muted-foreground">Last commit</p>
            <p className="mt-1.5 text-sm leading-5 font-medium text-foreground">{project.commit.message}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              <span className="font-mono text-xs">{project.commit.hash}</span> · {project.commit.author} ·{" "}
              {project.commit.when}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

const minus = (n: number) => String(n).replace("-", "−");

function StationsPage() {
  return (
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
                <td className="px-1.5 py-2 text-end text-muted-foreground">{minus(Number(s.tempC.toFixed(1)))} °C</td>
                <td className="px-1.5 py-2 text-end text-muted-foreground">{s.windKmh} km/h</td>
                <td
                  className={cn(
                    "bg-brand-soft/60 px-2 py-2 text-end font-medium text-brand-strong",
                    i === stations.length - 1 && "rounded-b-md",
                  )}
                >
                  {minus(Math.round(windChill(s.tempC, s.windKmh)))} °C
                </td>
                <td className="py-2 ps-1.5 text-end text-muted-foreground">{Math.round(s.snowCm)} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulletinPage() {
  return (
    <div className="p-3.5">
      <p className="text-xs text-muted-foreground">From Hoshizora Weather · 05:30</p>
      <h3 className="mt-1 text-base leading-6 font-semibold tracking-[-0.01em]">
        Morning bulletin, Tuesday 16 February
      </h3>
      <div className="mt-3 rounded-lg bg-destructive-soft px-3 py-2 text-[13px] leading-5 text-destructive-strong">
        Avalanche danger 3 of 5 above 1,800 m in the Hakuba valley.
      </div>
      <dl className="mt-3 divide-y divide-border text-[13px] leading-5">
        {[
          ["Hakuba", "−6 °C, 34 cm new snow"],
          ["Niseko", "−9 °C, 41 cm new snow"],
          ["Otaru", "−1 °C, light snow by noon"],
        ].map(([place, text]) => (
          <div key={place} className="py-2">
            <dt className="font-medium">{place}</dt>
            <dd className="text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TidesPage() {
  const tides = [
    { time: "06:42", kind: "High", height: 0.31 },
    { time: "13:05", kind: "Low", height: 0.08 },
    { time: "19:20", kind: "High", height: 0.27 },
  ];
  return (
    <div className="p-3.5">
      <h3 className="text-base leading-6 font-semibold tracking-[-0.01em]">Otaru port</h3>
      <p className="text-[13px] text-muted-foreground">Harbour office feed, read 4 minutes ago</p>
      <ul className="mt-3 flex flex-col gap-2">
        {tides.map((t, i) => (
          <li
            key={t.time}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2", i === 0 ? "bg-brand-soft" : "bg-muted/60")}
          >
            <span className={cn("w-12 text-sm font-medium tabular-nums", i === 0 && "text-brand-strong")}>
              {t.time}
            </span>
            <span className="flex-1 text-[13px] text-muted-foreground">{t.kind} tide</span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-background">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(t.height / 0.35) * 100}%` }} />
            </span>
            <span className="w-12 text-end text-[13px] tabular-nums">{t.height.toFixed(2)} m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const radarCells = [
  0.1, 0.25, 0.4, 0.2, 0.05, 0.3, 0.65, 0.8, 0.45, 0.15, 0.2, 0.55, 0.9, 0.6, 0.25, 0.05, 0.2, 0.4, 0.3, 0.1,
];

function RadarPage() {
  return (
    <div className="p-3.5">
      <h3 className="text-base leading-6 font-semibold tracking-[-0.01em]">Hokkaido radar</h3>
      <p className="text-[13px] text-muted-foreground">Frame 12 of 12 · 09:40</p>
      <div className="mt-3 grid grid-cols-5 gap-0.5 overflow-hidden rounded-lg">
        {radarCells.map((v, i) => (
          <span key={i} className="aspect-square bg-muted">
            <span className="block size-full bg-brand" style={{ opacity: v }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function PreviewView({ project }: { project: Project }) {
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function reload() {
    window.clearTimeout(timer.current);
    setLoading(true);
    setRound((n) => n + 1);
    timer.current = window.setTimeout(() => setLoading(false), 900);
  }

  return (
    <div className="p-4">
      <div className="overflow-clip rounded-xl border border-border bg-background">
        <div className="relative flex h-9 items-center gap-2 border-b border-border bg-muted/60 ps-3 pe-1">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-border-strong" />
            <span className="size-2 rounded-full bg-border-strong" />
            <span className="size-2 rounded-full bg-border-strong" />
          </span>
          <span className="mx-auto min-w-0 truncate rounded-md bg-card px-3 py-0.5 text-xs text-muted-foreground ring-1 ring-border">
            {project.url}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Reload preview"
            onPress={reload}
            className="size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground"
          >
            <RotateCw
              key={round}
              className={cn(
                round > 0 && "motion-safe:animate-[miyuki-coding-assistant-turn_700ms_cubic-bezier(0.22,1,0.36,1)]",
              )}
            />
          </IconButton>
          {loading && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-brand motion-safe:animate-[miyuki-coding-assistant-load_900ms_ease-out_forwards] rtl:origin-right"
            />
          )}
        </div>
        <div
          aria-busy={loading || undefined}
          className={cn(
            "transition-opacity ease-settle",
            loading ? "opacity-25 duration-150" : "opacity-100 duration-300",
          )}
        >
          {project.preview === "stations" ? (
            <StationsPage />
          ) : project.preview === "bulletin" ? (
            <BulletinPage />
          ) : project.preview === "tides" ? (
            <TidesPage />
          ) : (
            <RadarPage />
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Rendered from <span className="font-mono">{project.branch}</span> with this morning&apos;s data.
      </p>
    </div>
  );
}

function ProjectTerminal({ project, lines }: { project: ProjectId; lines: TerminalReplayLine[] }) {
  const [start] = useState(lines.length);
  return (
    <TerminalReplay
      lines={lines}
      startFrom={start}
      startOnView={false}
      title={`~/hoshizora/${project}`}
      typingSpeed={32}
      lineDelay={260}
      className="h-full rounded-none border-0 bg-transparent shadow-none"
    />
  );
}

interface ProjectView {
  files: ChangedFile[];
  terminal: TerminalReplayLine[];
}

const ProjectPanel = memo(function ProjectPanel({
  project,
  view,
  branch,
  file,
  onFile,
  tab,
  onTab,
  wide,
  onWide,
  onClose,
  onUndoAll,
  sheet = false,
}: {
  project: Project;
  view: ProjectView;
  branch: string;
  file: string;
  onFile: (name: string) => void;
  tab: Key;
  onTab: (key: Key) => void;
  wide: boolean;
  onWide: () => void;
  onClose: () => void;
  onUndoAll: () => void;
  sheet?: boolean;
}) {
  return (
    <Tabs selectedKey={tab} onSelectionChange={onTab} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex shrink-0 items-end gap-2 border-b border-border ps-4 pe-2">
        <TabList aria-label="Panel" className="bg-none">
          <Tab id="changes" count={view.files.length > 0 ? view.files.length : undefined}>
            Changes
          </Tab>
          <Tab id="preview">Preview</Tab>
          <Tab id="terminal">Terminal</Tab>
        </TabList>
        <div className="ms-auto mb-1 flex shrink-0 items-center gap-0.5 self-center">
          {!sheet && (
            <TooltipTrigger delay={500}>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={wide ? "Restore panel width" : "Expand panel"}
                aria-pressed={wide}
                onPress={onWide}
                className="text-muted-foreground data-[hovered]:text-foreground"
              >
                <MorphIcon shapes={panelShapes} shape={wide ? "wide" : "normal"} size={16} strokeWidth={1.75} />
              </IconButton>
              <Tooltip>{wide ? "Restore panel width" : "Expand panel"}</Tooltip>
            </TooltipTrigger>
          )}
          <CloseButton size="lg" aria-label="Close panel" onPress={onClose} />
        </div>
      </div>
      <TabPanel id="changes" className="min-h-0 flex-1 overflow-y-auto rounded-none [scrollbar-width:thin]">
        <Swap id={project.id}>
          <ChangesView
            project={project}
            files={view.files}
            branch={branch}
            file={file}
            onFile={onFile}
            onUndoAll={onUndoAll}
          />
        </Swap>
      </TabPanel>
      <TabPanel id="preview" className="min-h-0 flex-1 overflow-y-auto rounded-none [scrollbar-width:thin]">
        <Swap id={project.id}>
          <PreviewView project={project} />
        </Swap>
      </TabPanel>
      <TabPanel id="terminal" shouldForceMount className="min-h-0 flex-1 rounded-none data-[inert]:hidden">
        <Swap id={project.id} className="h-full">
          <ProjectTerminal project={project.id} lines={view.terminal} />
        </Swap>
      </TabPanel>
    </Tabs>
  );
});

function SharePopover({ chat, team }: { chat: Chat; team: string }) {
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState("team");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const link = `https://hoshizora.example/share/${chat.id}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <PopoverTrigger>
      <Button
        variant="secondary"
        size="sm"
        iconStart={<Share />}
        aria-label="Share"
        className="max-sm:w-8 max-sm:gap-0 max-sm:px-0 max-sm:[&>span]:sr-only"
      >
        Share
      </Button>
      <Popover placement="bottom end" offset={8} aria-label="Share this chat" className="w-80 overflow-y-auto">
        <p className="text-sm leading-5 font-medium text-foreground">Share this chat</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
          People with the link can read the conversation and its changes. They can&apos;t send messages.
        </p>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-input bg-card ps-3 pe-1 shadow-xs">
          <input
            readOnly
            aria-label="Share link"
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-muted-foreground outline-none"
          />
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={copied ? "Link copied" : "Copy link"}
            onPress={copy}
            className="size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground"
          >
            <MorphIcon shapes={morphIcons.copyCheck} shape={copied ? "check" : "copy"} size={16} />
          </IconButton>
        </div>
        <RadioGroup label="Who can open it" size="sm" value={access} onChange={setAccess} className="mt-4">
          <Radio value="team" description={`Everyone at ${team}`}>
            People in the team
          </Radio>
          <Radio value="invited" description="Only people you add by email">
            Invited people
          </Radio>
          <Radio value="link" description="Anyone with the link, no sign-in">
            Public link
          </Radio>
        </RadioGroup>
      </Popover>
    </PopoverTrigger>
  );
}

const topItems: FloatingSidebarItem[] = [
  { id: "new", label: "New chat", icon: <SquarePen /> },
  { id: "automations", label: "Automations", icon: <Workflow /> },
  { id: "skills", label: "Skills", icon: <Puzzle /> },
];

type Calls = Omit<Api, "memory">;

interface Api extends TranscriptActions {
  stop: () => void;
  compact: () => void;
  showFile: (name: string) => void;
  toggleWide: () => void;
  closePanel: () => void;
  undoAll: () => void;
  setBranch: (name: string) => void;
  newBranch: () => void;
  pick: (id: string) => void;
  collapse: (next: boolean) => void;
  toggleProject: (id: string, expanded: boolean) => void;
  search: (query: string) => void;
  upgrade: () => void;
  access: () => void;
  hidden: (id: string) => void;
  go: (view: View) => void;
  back: () => void;
  sheet: (next: SheetState) => void;
  flash: (id: string) => void;
  openChat: (id: string) => void;
  duplicateAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  deleteSkill: (id: string) => void;
  section: (id: SettingsSectionId) => void;
}

type SheetState = { kind: "automation" | "skill"; id?: string; open: boolean } | null;

const ChatSidebar = memo(function ChatSidebar({
  drawer,
  chats,
  open,
  query,
  current,
  rail,
  ready,
  members,
  user,
  api,
  short,
  tiny,
}: {
  short: boolean;
  tiny: boolean;
  drawer: boolean;
  chats: Chat[];
  open: Record<string, boolean>;
  query: string;
  current: string;
  rail: boolean;
  ready: boolean;
  members: CodingAssistantMember[];
  user: FloatingSidebarUser;
  api: Api;
}) {
  const groups = useMemo<FloatingSidebarGroup[]>(
    () =>
      projects.map((p) => ({
        id: p.id,
        label: p.id,
        icon: <Folder />,
        collapsible: true,
        expanded: open[p.id] ?? true,
        items: chats
          .filter((c) => c.project === p.id && !c.draft)
          .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
          .map((c) => ({
            id: c.id,
            label: c.title,
            icon: c.icon,
            meta: c.pinned ? <Pin aria-label="Pinned" className="size-3" /> : c.age,
          })),
      })),
    [chats, open],
  );

  const teamMenu = (
    <>
      <DropdownSeparator />
      <DropdownSection title="People with access">
        {members.map((m) => (
          <DropdownItem
            key={m.name}
            id={`member-${m.name}`}
            textValue={m.name}
            description={m.role}
            icon={<Avatar src={m.avatar} name={m.name} size="sm" aria-hidden="true" />}
            onAction={api.access}
          >
            {m.name}
          </DropdownItem>
        ))}
      </DropdownSection>
      <DropdownSeparator />
      <DropdownItem id="invite" icon={<UserPlus />} onAction={api.access}>
        Invite people
      </DropdownItem>
      <DropdownItem id="manage-access" icon={<ShieldCheck />} onAction={api.access}>
        Manage access
      </DropdownItem>
    </>
  );

  return (
    <FloatingSidebar
      teams={teams}
      items={topItems}
      groups={groups}
      user={user}
      current={current}
      onNavigate={api.pick}
      collapsed={drawer ? false : rail}
      onCollapsedChange={drawer ? undefined : api.collapse}
      collapsible={!drawer}
      filter
      searchValue={query}
      onSearchChange={api.search}
      searchPlaceholder="Search chats"
      onGroupExpandedChange={api.toggleProject}
      teamMenu={teamMenu}
      pinItems
      footerItems={short ? [] : undefined}
      footer={({ collapsed, renderItem }) =>
        short ? (
          <>
            {!tiny && !collapsed && <UsageLine onUpgrade={api.upgrade} />}
            <CompactFooter collapsed={collapsed} tiny={tiny} onPick={api.pick} renderItem={renderItem} />
          </>
        ) : (
          <>
            <UsageCard collapsed={collapsed} onUpgrade={api.upgrade} />
            <ThemeSwitch collapsed={collapsed} />
          </>
        )
      }
      className={cn(drawer ? "min-h-0 flex-1" : "me-3 hidden lg:flex", !ready && "transition-none")}
    />
  );
});

function titleFrom(text: string) {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?]+$/, "")
    .split(" ");
  const kept: string[] = [];
  for (const word of words) {
    if ([...kept, word].join(" ").length > 40) break;
    kept.push(word);
  }
  while (kept.length > 2 && /^(a|an|and|at|for|in|of|on|or|the|to|with)$/i.test(kept[kept.length - 1])) kept.pop();
  const title = kept.join(" ") || text.slice(0, 40);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

type Dialog = "rename" | "delete" | "access" | null;

type Area = "chat" | "automations" | "skills" | "settings";

interface View {
  area: Area;
  id?: string;
}

function stageKeyOf(view: View, thread: string, narrow: boolean) {
  if (view.area === "chat") return `chat:${thread}`;
  if (view.area === "settings") return narrow && view.id ? `settings:${view.id}` : "settings";
  return view.id ? `${view.area}:${view.id}` : view.area;
}

const areaLabels: Record<Exclude<Area, "chat">, string> = {
  automations: "Automations",
  skills: "Skills",
  settings: "Settings",
};

function compacted(log: ChatLog, automatic: boolean): ChatLog {
  const after = Math.max(NEW_CHAT_USAGE, Math.round(log.usage * 0.37));
  if (after >= log.usage) return log;
  const freed = Math.round(((log.usage - after) / 100) * (WINDOW / 1000));
  return {
    usage: after,
    messages: [
      ...log.messages,
      {
        id: `mark-${log.messages.length}-${log.usage}`,
        kind: "marker",
        text: automatic
          ? `Context compacted automatically at ${log.usage}% · ${freed}k tokens freed`
          : `Context compacted · ${freed}k tokens freed`,
      },
    ],
  };
}

export interface CodingAssistantProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
  members?: CodingAssistantMember[];
}

export function CodingAssistant({
  user = defaultUser,
  members = defaultMembers,
  className,
  ...props
}: CodingAssistantProps) {
  const lg = useMedia("(min-width: 1024px)", true);
  const xl = useMedia("(min-width: 1280px)", true);
  const short = useMedia("(max-height: 759px)", false);
  const tiny = useMedia("(max-height: 639px)", false);
  const [ready, setReady] = useState(false);
  const [chats, setChats] = useState(initialChats);
  const [logs, setLogs] = useState<Record<string, ChatLog>>(firstLogs);
  const [thread, setThread] = useState("feels-like");
  const [view, setView] = useState<View>({ area: "chat" });
  const [layerMotion, setLayerMotion] = useState<LayerMotion>("up");
  const [visited, setVisited] = useState<string[]>(["chat:feels-like", "automations", "skills", "settings"]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("general");
  const [narrowColumn, setNarrowColumn] = useState(false);
  const [settings, setSettings] = useState<AssistantSettings>(defaultSettings);
  const automations = useAutomations();
  const skills = useSkills();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const highlightTimer = useRef(0);
  const settingsRef = useRef(settings);
  const stageRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [views, setViews] = useState<Record<ProjectId, ProjectView>>(
    () =>
      Object.fromEntries(projects.map((p) => [p.id, { files: p.files, terminal: p.terminal }])) as Record<
        ProjectId,
        ProjectView
      >,
  );
  const [branches, setBranches] = useState<Record<ProjectId, { current: string; list: string[] }>>(
    () =>
      Object.fromEntries(projects.map((p) => [p.id, { current: p.branch, list: p.branches }])) as Record<
        ProjectId,
        { current: string; list: string[] }
      >,
  );
  const [shown, setShown] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({ "radar-tiles": false });
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const [railChoice, setRailChoice] = useState<boolean | null>(null);
  const [wide, setWide] = useState(false);
  const [tab, setTab] = useState<Key>("changes");
  const [running, setRunning] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [invite, setInvite] = useState("");
  const run = useRef<{ chat: string; token: number; timers: number[] } | null>(null);
  const tokens = useRef(0);

  const chat = chats.find((c) => c.id === thread) ?? chats[0];
  const project = projects.find((p) => p.id === chat.project) ?? projects[0];
  const panelId = useDeferredValue(project.id);
  const panelProject = projects.find((p) => p.id === panelId) ?? project;
  const shellId = useDeferredValue(chat.id);
  const shell = chats.find((c) => c.id === shellId) ?? chat;
  const shellProject = projects.find((p) => p.id === shell.project) ?? project;
  const shellBranch = branches[shellProject.id];
  const shellUsage = (logs[shell.id] ?? emptyLog).usage;
  const onChat = view.area === "chat";
  const stageKey = stageKeyOf(view, thread, narrowColumn);
  const shownView = useDeferredValue(view);
  const panelOpen = panelChoice ?? lg;
  const panelShown = onChat && panelOpen;
  const rail = (wide && panelShown) || (railChoice ?? !xl);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      run.current?.timers.forEach((t) => window.clearTimeout(t));
      run.current = null;
    },
    [],
  );

  function updateLog(id: string, change: (log: ChatLog) => ChatLog) {
    setLogs((all) => ({ ...all, [id]: change(all[id] ?? { messages: [], usage: NEW_CHAT_USAGE }) }));
  }

  function stop() {
    const current = run.current;
    if (!current) return;
    current.timers.forEach((t) => window.clearTimeout(t));
    run.current = null;
    setRunning(null);
    const at = Date.now();
    updateLog(current.chat, (l) => ({
      ...l,
      messages: l.messages.map((m) => {
        if (m.kind === "plan" && m.outcome === "running") {
          return {
            ...m,
            outcome: "stopped" as const,
            steps: m.steps.map((s) => (s.status === "running" ? { ...s, status: "pending" as const } : s)),
          };
        }
        if (m.kind === "reply" && m.live && m.reasoning && m.reasoning.durationMs === undefined) {
          return {
            ...m,
            reasoning: { ...m.reasoning, durationMs: at - m.live.startedAt },
            live: { ...m.live, stopped: true },
          };
        }
        return m;
      }),
    }));
  }

  function goTo(next: View, nextThread = thread) {
    setMenu(false);
    const from = stageKeyOf(view, thread, narrowColumn);
    const to = stageKeyOf(next, nextThread, narrowColumn);
    setView(next);
    if (from === to) return;
    const sameArea = next.area === view.area && next.area !== "chat";
    setLayerMotion(sameArea ? ((next.id ? 1 : 0) >= (view.id ? 1 : 0) ? "forward" : "back") : "up");
    setLeaving(from);
    setVisited((all) => (all.includes(to) ? all : [...all, to]));
  }

  function back() {
    if (view.area === "chat" || !view.id) return;
    goTo({ area: view.area });
  }

  function navigate(id: string) {
    setMenu(false);
    if (onChat && id === thread) return;
    if (run.current && run.current.chat !== id) stop();
    const target = chats.find((c) => c.id === id);
    if (target && open[target.project] === false) setOpen((all) => ({ ...all, [target.project]: true }));
    setThread(id);
    goTo({ area: "chat" }, id);
  }

  function newChat() {
    const existing = chats.find((c) => c.draft && c.project === project.id && !logs[c.id]?.messages.length);
    if (existing) {
      navigate(existing.id);
      return;
    }
    const now = new Date();
    const id = `draft-${now.getTime()}`;
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setChats((all) => [
      ...all,
      {
        id,
        project: project.id,
        title: "New chat",
        age: "now",
        icon: <MessageCircle />,
        date: `Today, ${time}`,
        draft: true,
      },
    ]);
    setLogs((all) => ({ ...all, [id]: { messages: [], usage: NEW_CHAT_USAGE } }));
    navigate(id);
  }

  function applyEdit(pid: ProjectId, edit: ChangedFile) {
    setViews((all) => {
      const files = all[pid].files;
      const found = files.find((f) => f.dir === edit.dir && f.name === edit.name);
      const changed = diffOf({ ...edit, created: found?.created ?? edit.created });
      const next = found ? files.map((f) => (f === found ? changed : f)) : [...files, changed];
      return { ...all, [pid]: { ...all[pid], files: next } };
    });
    setShown((all) => ({ ...all, [pid]: edit.name }));
  }

  function appendTerminal(pid: ProjectId, lines: TerminalReplayLine[]) {
    setViews((all) => ({ ...all, [pid]: { ...all[pid], terminal: [...all[pid].terminal, ...lines] } }));
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || run.current) return;
    const target = chat;
    const id = target.id;
    const script = scriptFor(target);
    const token = ++tokens.current;
    const timers: number[] = [];
    run.current = { chat: id, token, timers };
    const later = (ms: number, task: () => void) => {
      timers.push(
        window.setTimeout(() => {
          if (run.current?.token === token) task();
        }, ms),
      );
    };
    const stamp = Date.now();
    const planId = `plan-${stamp}`;
    const replyId = `reply-${stamp}`;
    const thoughtsTotal = script.reasoning.reduce((n, s) => n + s.ms, 0);
    const planAt = script.reasoning.length >= 4 ? 1 : script.reasoning.length;
    const reasoning: Reasoning = { steps: script.reasoning.map(({ title, text }) => ({ title, text })) };
    if (target.draft) {
      setChats((all) =>
        all.map((c) => (c.id === id ? { ...c, draft: false, title: titleFrom(clean), age: "now" } : c)),
      );
    }
    setRunning(id);
    const patchReply = (change: (m: Extract<Message, { kind: "reply" }>) => Message) =>
      updateLog(id, (l) => ({
        ...l,
        messages: l.messages.map((m) => (m.id === replyId && m.kind === "reply" ? change(m) : m)),
      }));
    updateLog(id, (l) => ({
      usage: Math.min(99, l.usage + 1),
      messages: [
        ...l.messages,
        { id: `user-${stamp}`, kind: "user", text: clean },
        {
          id: replyId,
          kind: "reply",
          text: "",
          reasoning,
          live: {
            startedAt: stamp,
            done: 0,
            stepStartedAt: stamp,
            stepMs: script.reasoning[0]?.ms ?? 1000,
            planAt,
          },
        },
      ],
    }));
    let thought = 0;
    let planStart = 0;
    script.reasoning.forEach((step, i) => {
      thought += step.ms;
      const end = thought;
      const next = script.reasoning[i + 1];
      if (i + 1 === planAt) planStart = end + 200;
      later(end, () => {
        patchReply((m) =>
          m.live
            ? {
                ...m,
                reasoning:
                  i + 1 === script.reasoning.length ? { ...reasoning, durationMs: thoughtsTotal } : m.reasoning,
                live: { ...m.live, done: i + 1, stepStartedAt: stamp + end, stepMs: next?.ms ?? 1000 },
              }
            : m,
        );
        updateLog(id, (l) => ({ ...l, usage: Math.min(99, l.usage + 1) }));
      });
    });
    let time = Math.max(planStart, 200);
    later(time, () =>
      updateLog(id, (l) => ({
        ...l,
        messages: [
          ...l.messages,
          {
            id: planId,
            kind: "plan",
            outcome: "running",
            open: true,
            steps: script.steps.map((s, i) => ({
              id: `${planId}-${i}`,
              label: s.label,
              status: i === 0 ? ("running" as const) : ("pending" as const),
            })),
          },
        ],
      })),
    );
    script.steps.forEach((step, i) => {
      if (step.command) {
        const lines = step.command;
        later(time + 150, () => appendTerminal(target.project, lines));
      }
      time += step.ms;
      later(time, () => {
        updateLog(id, (l) => ({
          usage: Math.min(99, l.usage + step.usage),
          messages: l.messages.map((m) =>
            m.id === planId && m.kind === "plan"
              ? {
                  ...m,
                  outcome: i === script.steps.length - 1 ? ("done" as const) : m.outcome,
                  steps: m.steps.map((s, k) => ({
                    ...s,
                    status: k <= i ? ("done" as const) : k === i + 1 ? ("running" as const) : ("pending" as const),
                  })),
                }
              : m,
          ),
        }));
        if (step.edit) applyEdit(target.project, step.edit);
      });
    });
    time = Math.max(time, thoughtsTotal) + 1100;
    later(time, () => updateLog(id, (l) => ({ ...l, messages: l.messages.filter((m) => m.id !== planId) })));
    time += 300;
    later(time, () => patchReply((m) => ({ ...m, text: script.reply, fresh: true })));
    time += script.reply.split(" ").length * 35 + 500;
    later(time, () => {
      run.current = null;
      setRunning(null);
      const { autoCompact, compactAt } = settingsRef.current;
      if (autoCompact) updateLog(id, (l) => (l.usage >= compactAt ? compacted(l, true) : l));
    });
  }

  function compact() {
    updateLog(chat.id, (l) => compacted(l, false));
  }

  function openFile(name: string) {
    setShown((all) => ({ ...all, [project.id]: name }));
    setTab("changes");
    setPanelChoice(true);
  }

  function togglePlan(id: string, planId: string, expanded: boolean) {
    updateLog(id, (l) => ({
      ...l,
      messages: l.messages.map((m) => (m.id === planId && m.kind === "plan" ? { ...m, open: expanded } : m)),
    }));
  }

  function undoAll(pid: ProjectId) {
    const before = views[pid].files;
    if (before.length === 0) return;
    setViews((all) => ({ ...all, [pid]: { ...all[pid], files: [] } }));
    toast(`Undid ${before.length} ${before.length === 1 ? "change" : "changes"}`, {
      description: `${pid} is back at its last commit.`,
      duration: 6000,
      action: {
        label: "Undo",
        onPress: () => setViews((all) => ({ ...all, [pid]: { ...all[pid], files: before } })),
      },
    });
  }

  function removeChat(kind: "archive" | "delete") {
    const target = chat;
    if (run.current?.chat === target.id) stop();
    const index = chats.findIndex((c) => c.id === target.id);
    const rest = chats.filter((c) => c.id !== target.id && !c.draft);
    const next = rest.find((c) => c.project === target.project) ?? rest[0];
    if (next) navigate(next.id);
    setChats((all) => all.filter((c) => c.id !== target.id));
    if (kind === "delete") {
      toast(`Deleted “${target.title}”`, { duration: 4000 });
      return;
    }
    toast(`Archived “${target.title}”`, {
      duration: 6000,
      action: {
        label: "Undo",
        onPress: () =>
          setChats((all) =>
            all.some((c) => c.id === target.id) ? all : [...all.slice(0, index), target, ...all.slice(index)],
          ),
      },
    });
  }

  function onChatAction(key: Key) {
    if (key === "rename") setDialog("rename");
    else if (key === "delete") setDialog("delete");
    else if (key === "archive") removeChat("archive");
    else if (key === "pin") setChats((all) => all.map((c) => (c.id === chat.id ? { ...c, pinned: !c.pinned } : c)));
  }

  function onSidebar(id: string) {
    if (id === "new") newChat();
    else if (id === "support") {
      setMenu(false);
      toast("Write to help@hoshizora.example", {
        description: "Someone on the team replies within one working day.",
        duration: 4000,
      });
    } else if (id === "settings" || id === "automations" || id === "skills") {
      goTo({ area: id });
    } else navigate(id);
  }

  function togglePanel() {
    if (panelOpen) setWide(false);
    setPanelChoice(!panelOpen);
  }

  const [memory] = useState(() => new Map<string, number>());
  const latest = useRef<Calls | null>(null);
  useLayoutEffect(() => {
    settingsRef.current = settings;
    latest.current = {
      openFile,
      togglePlan,
      send,
      stop,
      compact,
      showFile: (name) => setShown((all) => ({ ...all, [project.id]: name })),
      toggleWide: () => setWide((w) => !w),
      closePanel: () => {
        setWide(false);
        setPanelChoice(false);
      },
      undoAll: () => undoAll(project.id),
      setBranch: (next) => setBranches((all) => ({ ...all, [project.id]: { ...all[project.id], current: next } })),
      newBranch: () => {
        const name = `yuna/${chat.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`;
        setBranches((all) => ({
          ...all,
          [project.id]: {
            current: name,
            list: all[project.id].list.includes(name) ? all[project.id].list : [name, ...all[project.id].list],
          },
        }));
        toast(`Created branch ${name}`, { duration: 3000 });
      },
      pick: onSidebar,
      collapse: (next) => {
        setRailChoice(next);
        if (!next) setWide(false);
      },
      toggleProject: (id, expanded) => setOpen((all) => ({ ...all, [id]: expanded })),
      search: setQuery,
      upgrade: () => {
        setSettingsSection("usage");
        goTo({ area: "settings", id: "usage" });
      },
      access: () => {
        setMenu(false);
        setDialog("access");
      },
      hidden: (id) => setLeaving((current) => (current === id ? null : current)),
      go: (next) => goTo(next),
      back,
      sheet: (next) => setSheet(next),
      flash: flashRow,
      openChat: navigate,
      duplicateAutomation: (id) => {
        const item = automations.items.find((a) => a.id === id);
        const copy = automations.duplicate(id);
        if (item) {
          toast(`Duplicated “${item.name}”`, {
            description: "The copy is paused until you turn it on.",
            duration: 3000,
          });
        }
        goTo({ area: "automations", id: copy });
      },
      deleteAutomation: (id) => {
        const item = automations.items.find((a) => a.id === id);
        automations.remove(id);
        if (item) toast(`Deleted “${item.name}”`, { duration: 3000 });
        goTo({ area: "automations" });
      },
      deleteSkill: (id) => {
        const item = skills.items.find((s) => s.id === id);
        skills.remove(id);
        if (item) toast(`Deleted “${item.name}”`, { duration: 3000 });
        goTo({ area: "skills" });
      },
      section: (next) => {
        setSettingsSection(next);
        if (narrowColumn) goTo({ area: "settings", id: next });
        else setView({ area: "settings", id: next });
      },
    };
  });
  const [api] = useState<Api>(() => {
    const call =
      <K extends keyof Calls>(key: K) =>
      (...args: Parameters<Calls[K]>) =>
        (latest.current?.[key] as ((...a: Parameters<Calls[K]>) => void) | undefined)?.(...args);
    return {
      openFile: call("openFile"),
      togglePlan: call("togglePlan"),
      send: call("send"),
      stop: call("stop"),
      compact: call("compact"),
      showFile: call("showFile"),
      toggleWide: call("toggleWide"),
      closePanel: call("closePanel"),
      undoAll: call("undoAll"),
      setBranch: call("setBranch"),
      newBranch: call("newBranch"),
      pick: call("pick"),
      collapse: call("collapse"),
      toggleProject: call("toggleProject"),
      search: call("search"),
      upgrade: call("upgrade"),
      access: call("access"),
      hidden: call("hidden"),
      go: call("go"),
      back: call("back"),
      sheet: call("sheet"),
      flash: call("flash"),
      openChat: call("openChat"),
      duplicateAutomation: call("duplicateAutomation"),
      deleteAutomation: call("deleteAutomation"),
      deleteSkill: call("deleteSkill"),
      section: call("section"),
      memory,
    };
  });

  const [pageActions] = useState(() => ({
    openAutomation: (id: string) => api.go({ area: "automations", id }),
    newAutomation: () => api.sheet({ kind: "automation", open: true }),
    editAutomation: (id: string) => api.sheet({ kind: "automation", id, open: true }),
    duplicateAutomation: (id: string) => api.duplicateAutomation(id),
    deleteAutomation: (id: string) => api.deleteAutomation(id),
    openSkill: (id: string) => api.go({ area: "skills", id }),
    newSkill: () => api.sheet({ kind: "skill", open: true }),
    editSkill: (id: string) => api.sheet({ kind: "skill", id, open: true }),
    deleteSkill: (id: string) => api.deleteSkill(id),
    flash: (id: string) => api.flash(id),
    openChat: (id: string) => api.openChat(id),
    section: (id: SettingsSectionId) => api.section(id),
  }));
  const chatLookup = useMemo(
    () => (id: string) => {
      const found = chats.find((c) => c.id === id);
      return found ? { title: found.title, project: found.project } : null;
    },
    [chats],
  );

  const sidebarProps = {
    short,
    tiny,
    chats,
    open,
    query,
    current: shownView.area === "chat" ? (shell.draft ? "new" : shell.id) : shownView.area,
    rail,
    ready,
    members,
    user,
    api,
  };

  const detail = view.area !== "chat" && Boolean(view.id) && !(view.area === "settings" && !narrowColumn);
  const crumbs = {
    root: onChat ? project.id : teams[0].name,
    parent: detail && view.area !== "chat" ? areaLabels[view.area] : undefined,
    title: onChat ? chat.title : detail && view.id ? pageTitle(view) : areaLabels[view.area as Exclude<Area, "chat">],
  };
  const [lastParent, setLastParent] = useState("Automations");
  if (crumbs.parent && crumbs.parent !== lastParent) setLastParent(crumbs.parent);

  function pageTitle(target: View) {
    if (target.area === "automations")
      return automations.items.find((a) => a.id === target.id)?.name ?? "Deleted automation";
    if (target.area === "skills") return skills.items.find((s) => s.id === target.id)?.name ?? "Deleted skill";
    if (target.area === "settings") return sectionName(target.id ?? "general");
    return target.id ?? "";
  }

  function flashRow(id: string) {
    setHighlight(id);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 1400);
  }

  function saveAutomation(draft: AutomationDraft) {
    const id = automations.save(draft, sheet?.id);
    setSheet((s) => (s ? { ...s, open: false } : s));
    flashRow(id);
    toast(sheet?.id ? "Saved your changes" : `Created “${draft.name}”`, { duration: 3000 });
  }

  function renderLayer(key: string) {
    if (key.startsWith("chat:")) {
      const id = key.slice(5);
      const target = chats.find((c) => c.id === id);
      if (!target) return null;
      return (
        <Transcript
          chat={target}
          messages={(logs[id] ?? emptyLog).messages}
          actions={api}
          active={key === stageKey}
          onHidden={api.hidden}
        />
      );
    }
    const [area, id] = key.split(":") as [Exclude<Area, "chat">, string | undefined];
    const label = id ? pageTitle({ area, id }) : areaLabels[area];
    return (
      <ViewLayer
        id={key}
        label={label}
        active={key === stageKey}
        motion={layerMotion}
        memory={memory}
        onHidden={api.hidden}
      >
        {pageContent(area, id)}
      </ViewLayer>
    );
  }

  function missing(title: string, description: string, backLabel: string) {
    return (
      <PageBody>
        <EmptyState
          bordered
          illustration="search"
          title={title}
          description={description}
          actions={
            <Button variant="secondary" size="sm" onPress={api.back}>
              {backLabel}
            </Button>
          }
        />
      </PageBody>
    );
  }

  function pageContent(area: Exclude<Area, "chat">, id?: string): ReactNode {
    if (area === "automations" && !id) {
      return (
        <AutomationsList
          store={automations}
          highlight={highlight}
          onOpen={pageActions.openAutomation}
          onNew={pageActions.newAutomation}
        />
      );
    }
    if (area === "automations" && id) {
      const item = automations.items.find((a) => a.id === id);
      if (!item)
        return missing(
          "This automation is gone",
          "It was deleted. Its chats are still in the sidebar.",
          "Back to automations",
        );
      return (
        <AutomationDetail
          automation={item}
          store={automations}
          onBack={api.back}
          onEdit={pageActions.editAutomation}
          onDuplicate={pageActions.duplicateAutomation}
          onDelete={pageActions.deleteAutomation}
          onOpenChat={pageActions.openChat}
        />
      );
    }
    if (area === "skills" && !id) {
      return (
        <SkillsList
          store={skills}
          highlight={highlight}
          onOpen={pageActions.openSkill}
          onNew={pageActions.newSkill}
          onAdded={pageActions.flash}
        />
      );
    }
    if (area === "skills" && id) {
      const item = skills.items.find((s) => s.id === id);
      if (!item)
        return missing(
          "This skill is gone",
          "It was deleted. Chats that used it keep their replies.",
          "Back to skills",
        );
      return (
        <SkillDetail
          skill={item}
          store={skills}
          chatTitle={chatLookup}
          onBack={api.back}
          onEdit={pageActions.editSkill}
          onDelete={pageActions.deleteSkill}
          onOpenChat={pageActions.openChat}
        />
      );
    }
    const section = (id ?? settingsSection) as SettingsSectionId;
    return (
      <SettingsPage
        mode={id ? "section" : narrowColumn ? "list" : "both"}
        section={section}
        onSection={pageActions.section}
        onBack={api.back}
      />
    );
  }

  const settingsApi = useMemo(
    () => ({
      settings,
      update: <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) =>
        setSettings((all) => ({ ...all, [key]: value })),
    }),
    [settings],
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const box = composerRef.current;
    if (!stage || !box) return;
    const observer = new ResizeObserver(() => {
      stage.style.setProperty("--miyuki-coding-assistant-composer", `${box.offsetHeight}px`);
      setNarrowColumn(stage.clientWidth < 720);
    });
    observer.observe(box);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const main = mainRef.current;
      if (!main || !target) return;
      if (target !== document.body && !main.contains(target)) return;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (document.querySelector("[role=dialog], [role=menu], [role=listbox][data-rac]:not([data-rac-inline])")) return;
      api.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  const panel = (sheet: boolean) => (
    <ProjectPanel
      project={panelProject}
      view={views[panelProject.id]}
      branch={branches[panelProject.id].current}
      file={shown[panelProject.id] ?? views[panelProject.id].files[0]?.name ?? ""}
      onFile={api.showFile}
      tab={tab}
      onTab={setTab}
      wide={wide}
      onWide={api.toggleWide}
      onClose={api.closePanel}
      onUndoAll={api.undoAll}
      sheet={sheet}
    />
  );

  const panelWidth = !panelShown
    ? "0px"
    : wide
      ? "calc((100% - 76px) * 0.6)"
      : "calc(var(--miyuki-coding-assistant-panel) + 12px)";
  const panelDefault = panelChoice === null && !wide && onChat;

  return (
    <SettingsContext value={settingsApi}>
      <div
        {...props}
        className={cn(
          "flex h-dvh bg-background p-3 text-foreground",
          "[--miyuki-coding-assistant-panel:380px] xl:[--miyuki-coding-assistant-panel:420px] 2xl:[--miyuki-coding-assistant-panel:460px]",
          className,
        )}
      >
        <style href="miyuki-coding-assistant" precedence="miyuki">{`
        @keyframes miyuki-coding-assistant-rise { from { opacity: 0; transform: translateY(8px); } }
        @keyframes miyuki-coding-assistant-load { from { transform: scaleX(0); } 70% { transform: scaleX(0.85); opacity: 1; } to { transform: scaleX(1); opacity: 0; } }
        @keyframes miyuki-coding-assistant-turn { to { transform: rotate(360deg); } }
        @keyframes miyuki-coding-assistant-level { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }
      `}</style>
        <ChatSidebar {...sidebarProps} drawer={false} />
        <Drawer
          side="left"
          isOpen={menu && !lg}
          onOpenChange={setMenu}
          closeButton={false}
          aria-label="Sidebar"
          className="w-[264px] border-0 bg-transparent shadow-none"
        >
          <ChatSidebar {...sidebarProps} drawer />
        </Drawer>

        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
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
            <div
              inert={!crumbs.parent}
              className={cn(
                "-ms-2 flex shrink-0 overflow-clip transition-[width,opacity,margin] duration-200 ease-settle sm:hidden",
                crumbs.parent ? "ms-0 w-8 opacity-100" : "w-0 opacity-0",
              )}
            >
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={`Back to ${lastParent}`}
                onPress={back}
                className="shrink-0 text-muted-foreground data-[hovered]:text-foreground"
              >
                <ChevronLeft className="rtl:-scale-x-100" />
              </IconButton>
            </div>
            <Breadcrumbs className="min-w-0 flex-nowrap">
              <Breadcrumb
                className="shrink-0 max-sm:hidden"
                linkProps={{
                  isDisabled: !onChat,
                  onPress: () => {
                    setOpen((all) => ({ ...all, [project.id]: true }));
                    if (!lg) setMenu(true);
                  },
                }}
              >
                <SlideTitle title={crumbs.root} className={onChat ? "font-mono text-[13px]" : undefined} />
              </Breadcrumb>
              <Breadcrumb
                className={cn(
                  "min-w-0 overflow-clip [overflow-clip-margin:4px] transition-[max-width,opacity,margin] duration-200 ease-settle max-sm:hidden",
                  crumbs.parent ? "max-w-48 opacity-100" : "-ms-1.5 max-w-0 opacity-0",
                )}
                linkProps={{ isDisabled: !crumbs.parent, onPress: back }}
              >
                <span aria-hidden={!crumbs.parent || undefined} className="truncate">
                  {lastParent}
                </span>
              </Breadcrumb>
              <Breadcrumb className="min-w-0">
                <SlideTitle title={crumbs.title} />
              </Breadcrumb>
            </Breadcrumbs>
            <div
              inert={!onChat}
              data-chat-actions=""
              className={cn(
                "ms-auto flex shrink-0 items-center gap-1 transition-[opacity,visibility] ease-settle",
                onChat ? "visible opacity-100 delay-75 duration-200" : "invisible opacity-0 duration-100",
              )}
            >
              <SharePopover chat={chat} team={teams[0].name} />
              <Dropdown>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label="More actions"
                  className="text-muted-foreground data-[hovered]:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground"
                >
                  <Ellipsis />
                </IconButton>
                <DropdownMenu
                  placement="bottom end"
                  onAction={onChatAction}
                  disabledKeys={chat.draft ? ["rename", "pin", "archive", "delete"] : []}
                >
                  <DropdownItem id="rename" icon={<Pencil />}>
                    Rename
                  </DropdownItem>
                  <DropdownItem id="pin" icon={<Pin />}>
                    {chat.pinned ? "Unpin" : "Pin"}
                  </DropdownItem>
                  <DropdownItem id="archive" icon={<Archive />}>
                    Archive
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem id="delete" icon={<Trash />} tone="destructive">
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
              <TooltipTrigger delay={500}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={panelOpen ? "Hide project panel" : "Show project panel"}
                  aria-expanded={panelOpen}
                  onPress={togglePanel}
                  className={cn(
                    "text-muted-foreground data-[hovered]:text-foreground",
                    panelOpen && "bg-accent text-foreground",
                  )}
                >
                  <PanelRight />
                </IconButton>
                <Tooltip>{panelOpen ? "Hide panel" : "Show panel"}</Tooltip>
              </TooltipTrigger>
            </div>
          </header>

          <div
            ref={stageRef}
            className="relative min-h-0 flex-1 overflow-clip [--miyuki-coding-assistant-composer:9.5rem]"
          >
            {(visited.includes(stageKey) ? visited : [...visited, stageKey]).map((key) => {
              const shown = key === stageKey || key === leaving;
              return (
                <Activity key={key} mode={shown ? "visible" : "hidden"}>
                  {renderLayer(key)}
                </Activity>
              );
            })}
            <motion.div
              ref={composerRef}
              inert={!onChat}
              data-composer=""
              initial={false}
              animate={
                onChat
                  ? {
                      opacity: 1,
                      y: 0,
                      transition: {
                        opacity: { duration: 0.14, delay: 0.07 },
                        y: { duration: 0.24, delay: 0.07, ease: EASE_OUT },
                      },
                    }
                  : { opacity: 0, y: 12, transition: { duration: 0.1, ease: "easeIn" } }
              }
              className="absolute inset-x-0 bottom-0"
            >
              <Composer
                chatId={shell.id}
                draft={Boolean(shell.draft)}
                project={shellProject}
                branch={shellBranch.current}
                branches={shellBranch.list}
                onBranch={api.setBranch}
                onNewBranch={api.newBranch}
                running={running === shell.id}
                usage={shellUsage}
                canCompact={!running && shellUsage > NEW_CHAT_USAGE + 4}
                onCompact={api.compact}
                onSend={api.send}
                onStop={api.stop}
              />
            </motion.div>
          </div>
        </main>

        <div
          inert={!panelShown}
          data-panel-column=""
          className={cn(
            "hidden shrink-0 overflow-hidden lg:block",
            "transition-[width,opacity] ease-settle motion-reduce:transition-[opacity]",
            panelShown ? "opacity-100 duration-300" : "opacity-0 duration-200",
            panelDefault && "w-[calc(var(--miyuki-coding-assistant-panel)+12px)]",
            !ready && "transition-none",
          )}
          style={panelDefault ? undefined : { width: panelWidth }}
        >
          <aside
            aria-label="Project panel"
            className="ms-3 flex h-full min-w-[var(--miyuki-coding-assistant-panel)] flex-col overflow-clip rounded-2xl border border-border bg-card shadow-md"
          >
            {panel(false)}
          </aside>
        </div>
        <Drawer
          side="bottom"
          isOpen={panelShown && !lg}
          onOpenChange={(next) => {
            if (!next) setPanelChoice(false);
          }}
          aria-label="Project panel"
          className="h-[85%]"
        >
          <div className="flex min-h-0 flex-1 flex-col">{panel(true)}</div>
        </Drawer>

        <Modal isOpen={dialog === "rename"} onOpenChange={(next) => !next && setDialog(null)} size="sm">
          {({ close }) => (
            <form
              className="contents"
              onSubmit={(event) => {
                event.preventDefault();
                const value = String(new FormData(event.currentTarget).get("title") ?? "").trim();
                if (value) setChats((all) => all.map((c) => (c.id === chat.id ? { ...c, title: value } : c)));
                close();
              }}
            >
              <ModalHeader>
                <ModalTitle>Rename this chat</ModalTitle>
                <ModalDescription>The new name shows in the sidebar and in shared links.</ModalDescription>
              </ModalHeader>
              <ModalBody>
                <TextField name="title" label="Chat name" defaultValue={chat.title} autoFocus isRequired />
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" slot="close">
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </ModalFooter>
            </form>
          )}
        </Modal>
        <AlertDialog
          isOpen={dialog === "delete"}
          onOpenChange={(next) => !next && setDialog(null)}
          title={`Delete “${chat.title}”?`}
          actionLabel="Delete chat"
          tone="destructive"
          icon={<Trash />}
          onAction={() => removeChat("delete")}
        >
          The conversation and its plan are deleted for everyone. Changes already in the working tree stay where they
          are.
        </AlertDialog>
        <Modal isOpen={dialog === "access"} onOpenChange={(next) => !next && setDialog(null)} size="md" closeButton>
          {({ close }) => (
            <>
              <ModalHeader>
                <ModalTitle>People with access</ModalTitle>
                <ModalDescription>Everyone here can open Hoshizora Weather&apos;s projects and chats.</ModalDescription>
              </ModalHeader>
              <ModalBody>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!invite.trim()) return;
                    toast(`Invite sent to ${invite.trim()}`, { duration: 3000 });
                    setInvite("");
                    close();
                  }}
                >
                  <TextField
                    label="Invite by email"
                    type="email"
                    value={invite}
                    onChange={setInvite}
                    placeholder="name@hoshizora.example"
                    className="min-w-0 flex-1"
                  />
                  <Button type="submit" iconStart={<UserPlus />}>
                    Send invite
                  </Button>
                </form>
                <ul className="mt-5 flex flex-col divide-y divide-border">
                  {members.map((m) => (
                    <li key={m.name} className="flex items-center gap-3 py-2.5">
                      <Avatar src={m.avatar} name={m.name} size="md" aria-hidden="true" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm leading-5 font-medium text-foreground">{m.name}</span>
                        <span className="text-[13px] leading-[18px] text-muted-foreground">{m.role}</span>
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {m.name === user.name ? "Owner" : "Can edit"}
                      </span>
                    </li>
                  ))}
                </ul>
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" slot="close">
                  Done
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
        <AutomationSheet
          open={sheet?.kind === "automation" && sheet.open}
          automation={
            sheet?.kind === "automation" && sheet.id ? automations.items.find((a) => a.id === sheet.id) : undefined
          }
          onClose={() => setSheet((s) => (s ? { ...s, open: false } : s))}
          onSave={saveAutomation}
        />
        <SkillSheet
          open={sheet?.kind === "skill" && sheet.open}
          skill={sheet?.kind === "skill" && sheet.id ? skills.items.find((s) => s.id === sheet.id) : undefined}
          onClose={() => setSheet((s) => (s ? { ...s, open: false } : s))}
          onSave={(draft) => {
            const id = skills.save(draft, sheet?.id);
            setSheet((s) => (s ? { ...s, open: false } : s));
            flashRow(id);
            toast(sheet?.id ? "Saved your changes" : `Created “${draft.name}”`, { duration: 3000 });
          }}
        />
        <Toaster position="bottom-right" />
      </div>
    </SettingsContext>
  );
}
