"use client";

import {
  Backpack,
  Bot,
  Compass,
  House,
  MessagesSquare,
  PanelLeft,
  Plus,
  Route,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Key } from "react-aria-components";
import {
  AgentAvatar,
  type AgentColor,
  type AgentConfig,
  type AgentMood,
  AgentPersona,
} from "@/components/miyuki-ui/agent-persona";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer, DrawerBody, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { PromptBox, type PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";
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

interface Agent extends AgentConfig {
  id: string;
  unread: number;
}

const roles = ["Route planner", "Weather reader", "Logistics clerk", "Safety reviewer"];

const startingAgents: Agent[] = [
  {
    id: "yuki",
    name: "Yuki",
    role: "Route planner",
    description: "Plans routes, timings and turn-back points from the trailhead to the hut.",
    language: "English",
    notifications: true,
    mood: "calm",
    color: "water",
    unread: 0,
  },
  {
    id: "sora",
    name: "Sora",
    role: "Weather reader",
    description: "Reads the mountain bulletins and wind forecasts, and says when they change.",
    language: "English",
    notifications: true,
    mood: "focused",
    color: "seafoam",
    unread: 0,
  },
  {
    id: "tsumugi",
    name: "Tsumugi",
    role: "Logistics clerk",
    description: "Books huts, buses and rental gear, and holds places while the plan settles.",
    language: "日本語",
    notifications: true,
    mood: "happy",
    color: "yuzu",
    unread: 2,
  },
  {
    id: "mamoru",
    name: "Mamoru",
    role: "Safety reviewer",
    description: "Checks every plan against avalanche danger and wind limits before it is final.",
    language: "English",
    notifications: false,
    mood: "calm",
    color: "wisteria",
    unread: 1,
  },
];

type Line =
  | { id: string; by: string; time: string; text: string; shown?: number }
  | { id: string; by: string; time: string; text: string; card: "route" | "hold" };

interface Group {
  id: string;
  title: string;
  dates: string;
  members: string[];
  last: string;
  when: string;
  lines: Line[];
}

const groupsStart: Group[] = [
  {
    id: "hakuba",
    title: "Hakuba hut trip",
    dates: "Sat 20 – Sun 21 February",
    members: ["yuki", "sora", "tsumugi", "mamoru"],
    last: "Sora is replying",
    when: "09:14",
    lines: [
      {
        id: "h1",
        by: "me",
        time: "09:02",
        text: "Four of us want to ski from Happō-one to the Karamatsu hut on Saturday and come down on Sunday morning. Can you put the plan together?",
      },
      {
        id: "h2",
        by: "yuki",
        time: "09:05",
        text: "Here is a first route. We'd come down the same way on Sunday, before the wind picks up.",
        card: "route",
      },
      {
        id: "h3",
        by: "tsumugi",
        time: "09:09",
        text: "The hut has four beds on the 20th at ¥14,200 each with dinner and breakfast. The 07:12 bus from Hakuba station reaches the gondola at 07:31.",
        card: "hold",
      },
      {
        id: "h4",
        by: "mamoru",
        time: "09:12",
        text: "Before I sign off I need Sora's read on the ridge wind for Saturday afternoon. Above 50 km/h the ridge isn't safe with skis on packs.",
      },
    ],
  },
  {
    id: "niseko",
    title: "Niseko powder day",
    dates: "Mon 15 February",
    members: ["yuki", "sora", "mamoru"],
    last: "Yuki: Back at the car park by 15:00.",
    when: "Mon",
    lines: [
      { id: "n1", by: "me", time: "07:40", text: "Is the Annupuri gate open this morning?" },
      {
        id: "n2",
        by: "sora",
        time: "07:42",
        text: "Yes. 41 cm overnight, wind 20 km/h on the summit, avalanche danger 2 above 1,000 m.",
      },
      { id: "n3", by: "yuki", time: "07:44", text: "Then gate 3 to the north bowl and back at the car park by 15:00." },
    ],
  },
  {
    id: "otaru",
    title: "Otaru canal walk",
    dates: "Fri 12 February",
    members: ["tsumugi", "yuki"],
    last: "Tsumugi: A table for four at 19:30 is held.",
    when: "12 Feb",
    lines: [
      { id: "o1", by: "me", time: "16:20", text: "Somewhere warm for dinner after the snow light festival?" },
      {
        id: "o2",
        by: "tsumugi",
        time: "16:23",
        text: "A table for four at 19:30 is held at the glassworks café on Sakaimachi, a six-minute walk from the canal.",
      },
    ],
  },
];

const directStart: Record<string, Line[]> = {
  yuki: [
    {
      id: "dy1",
      by: "me",
      time: "08:31",
      text: "How long is the climb from Happō-ike to the hut with full packs?",
    },
    {
      id: "dy2",
      by: "yuki",
      time: "08:33",
      text: "About two hours forty-five on skins. I've planned a ten-minute stop at the Maruyama cairn, where the ridge narrows.",
    },
  ],
  sora: [
    { id: "ds1", by: "me", time: "08:50", text: "Send me the mountain bulletin as soon as it's out." },
    {
      id: "ds2",
      by: "sora",
      time: "08:51",
      text: "It comes out at 06:00 and 16:00. I'll post it in the trip chat and flag anything over 40 km/h on the ridge.",
    },
  ],
  tsumugi: [
    { id: "dt1", by: "me", time: "08:58", text: "Can we rent avalanche transceivers for four in Hakuba?" },
    {
      id: "dt2",
      by: "tsumugi",
      time: "09:06",
      text: "Yes. The shop by the gondola rents them at ¥1,500 a day and opens at 07:00.",
    },
    {
      id: "dt3",
      by: "tsumugi",
      time: "09:10",
      text: "I've held four until tonight. Do you want shovels and probes with them?",
    },
  ],
  mamoru: [
    {
      id: "dm1",
      by: "mamoru",
      time: "09:13",
      text: "One thing before Saturday: has everyone in the party used a transceiver this winter? If not, I'd add a 20-minute practice at Usagidaira.",
    },
  ],
};

const directReplies: Record<string, string> = {
  yuki: "I'll check that against the map and send you the timings in a moment.",
  sora: "I'll read the next bulletin with that in mind and tell you if it changes anything.",
  tsumugi: "Leave it with me. I'll hold it and send you the confirmation here.",
  mamoru: "Understood. I'll add that to the checklist before I sign off the plan.",
};
const fallbackReply = "Got it. I'll look into that and come back to you here.";

interface Chat {
  type: "group" | "direct";
  id: string;
}

const chatKey = (chat: Chat) => `${chat.type}:${chat.id}`;

const soraReply =
  "Saturday: ridge wind 25 to 35 km/h until 15:00, rising to 55 km/h after dark, and −9 °C at 2,600 m with light snow from 16:00. Sunday clears by 08:00 with 30 km/h until noon.";
const mamoruReply =
  "That works if everyone is at the hut by 14:30. Approved, with a turn-back time of 12:30 at Happō-ike.";
const laterReply = "Noted. I'll fold that into the plan and post the new timings here.";

const navItems: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House /> },
  { id: "chats", label: "Chats", icon: <MessagesSquare />, count: 3, countTone: "solid" },
  { id: "agents", label: "Agents", icon: <Bot /> },
  { id: "trips", label: "Trips", icon: <Route /> },
  { id: "gear", label: "Gear", icon: <Backpack /> },
];

const teams = [{ id: "kitakaze", name: "Kitakaze Outfitters", plan: "Guides desk, 12 people", logo: <Compass /> }];

const defaultUser: FloatingSidebarUser = { name: "Aiko Tanaka", email: "aiko@kitakaze.example" };

const route = [
  { time: "08:30", place: "Gondola to Usagidaira", height: "1,400 m" },
  { time: "10:45", place: "Happō-ike", height: "2,060 m" },
  { time: "13:30", place: "Karamatsu hut", height: "2,620 m" },
];

const words = (text: string) => text.split(" ");

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      <span aria-hidden="true" className="size-2.5 rounded-full bg-brand ring-4 ring-brand/15" />
      <span className="sr-only">{count} unread</span>
    </span>
  );
}

function AgentRow({
  agent,
  current,
  replying,
  onOpen,
}: {
  agent: Agent;
  current: boolean;
  replying?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={current || undefined}
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-start outline-none",
        "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
        current ? "bg-brand-soft" : "hover:bg-accent/60",
      )}
    >
      <AgentAvatar size={40} mood={agent.mood} color={agent.color} followPointer={false} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-sm leading-5 font-semibold", !agent.name && "text-muted-foreground")}>
            {agent.name || "Unnamed agent"}
          </span>
          <span className="truncate text-xs text-muted-foreground">{agent.role}</span>
        </span>
        {replying ? (
          <span className="truncate text-[13px] leading-[18px] text-brand-strong">{replying}</span>
        ) : (
          <span className="truncate text-[13px] leading-[18px] text-muted-foreground">
            {agent.description || "No description yet."}
          </span>
        )}
      </span>
      <UnreadDot count={agent.unread} />
    </button>
  );
}

function GroupRow({
  group,
  agents,
  current,
  replying,
  onOpen,
}: {
  group: Group;
  agents: Agent[];
  current: boolean;
  replying?: Agent;
  onOpen: () => void;
}) {
  const members = group.members.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => a != null);
  return (
    <button
      type="button"
      aria-current={current || undefined}
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-start outline-none",
        "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
        current ? "bg-brand-soft" : "hover:bg-accent/60",
      )}
    >
      <span
        aria-hidden="true"
        className="relative grid size-10 shrink-0 grid-cols-2 place-items-center rounded-xl bg-muted p-0.5"
      >
        {members.slice(0, 4).map((a) => (
          <AgentAvatar key={a.id} size={17} mood={a.mood} color={a.color} followPointer={false} />
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm leading-5 font-semibold">{group.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{group.when}</span>
        </span>
        <span
          className={cn(
            "truncate text-[13px] leading-[18px]",
            replying ? "text-brand-strong" : "text-muted-foreground",
          )}
        >
          {replying ? `${replying.name || "An agent"} is replying` : group.last}
        </span>
      </span>
    </button>
  );
}

function RouteCard() {
  return (
    <ol className="mt-2.5 flex max-w-sm flex-col rounded-xl bg-muted/70 p-1.5 text-[13px]">
      {route.map((r, i) => (
        <li key={r.time} className="relative flex items-center gap-3 rounded-lg px-2.5 py-1.5">
          <span className="w-10 shrink-0 font-medium tabular-nums">{r.time}</span>
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full ring-2 ring-muted",
              i === route.length - 1 ? "bg-brand" : "bg-border-strong",
            )}
          />
          <span className="min-w-0 flex-1">{r.place}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums">{r.height}</span>
        </li>
      ))}
    </ol>
  );
}

function Mentions({ text, agents }: { text: string; agents: Agent[] }) {
  const names = agents.map((a) => a.name).filter(Boolean);
  if (names.length === 0) return <>{text}</>;
  const pattern = new RegExp(
    `\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})('s)?\\b`,
    "g",
  );
  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > at) parts.push(text.slice(at, m.index));
    parts.push(
      <span key={m.index} className="font-medium text-brand-strong">
        {m[0]}
      </span>,
    );
    at = m.index + m[0].length;
  }
  parts.push(text.slice(at));
  return <>{parts}</>;
}

function AgentLine({
  agent,
  time,
  onOpen,
  children,
}: {
  agent: Agent;
  time?: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const face = <AgentAvatar size={36} mood={agent.mood} color={agent.color} followPointer={false} />;
  return (
    <div className="flex gap-3">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Message ${agent.name || "unnamed agent"}`}
          className="h-fit shrink-0 cursor-default rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {face}
        </button>
      ) : (
        <span className="h-fit shrink-0">{face}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm leading-5">
          <span className="font-semibold">{agent.name || "Unnamed agent"}</span>
          <span className="text-xs text-muted-foreground">{agent.role}</span>
          {time && <span className="text-xs text-muted-foreground tabular-nums">{time}</span>}
        </p>
        <div className="mt-1 text-[15px] leading-6">{children}</div>
      </div>
    </div>
  );
}

export interface AgentTeamChatProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
}

export function AgentTeamChat({ user = defaultUser, className, ...props }: AgentTeamChatProps) {
  const md = useMedia("(min-width: 768px)");
  const lg = useMedia("(min-width: 1024px)");
  const xl = useMedia("(min-width: 1280px)");
  const wide = useMedia("(min-width: 1600px)");
  const [menu, setMenu] = useState(false);
  const [listSheet, setListSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);
  const [railChoice, setRailChoice] = useState<boolean | null>(null);
  const [agents, setAgents] = useState(startingAgents);
  const [groups, setGroups] = useState(groupsStart);
  const [selected, setSelected] = useState("sora");
  const [chat, setChat] = useState<Chat>({ type: "group", id: "hakuba" });
  const [direct, setDirect] = useState(directStart);
  const [tab, setTab] = useState<Key>("direct");
  const [typing, setTyping] = useState<{ chat: Chat; by: string }[]>([
    { chat: { type: "group", id: "hakuba" }, by: "sora" },
  ]);
  const [busy, setBusy] = useState<string[]>([]);
  const [stage, setStage] = useState(0);
  const timers = useRef<Record<string, number[]>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const follow = useRef(false);
  const openKey = useRef("");

  const rail = railChoice ?? !wide;
  const key = chatKey(chat);
  const partner = chat.type === "direct" ? agents.find((a) => a.id === chat.id) : undefined;
  const group = groups.find((g) => g.id === chat.id) ?? groups[0];
  const agent = agents.find((a) => a.id === selected) ?? agents[0];
  const lines = partner ? (direct[partner.id] ?? []) : group.lines;
  const title = partner ? partner.name || "Unnamed agent" : group.title;
  const typingBy = typing.find((t) => chatKey(t.chat) === key)?.by;
  const typingAgent = typingBy ? agents.find((a) => a.id === typingBy) : undefined;
  const members = group.members.map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => a != null);
  const status: PromptBoxStatus = busy.includes(key) ? "streaming" : "idle";

  useEffect(() => {
    openKey.current = key;
  }, [key]);

  useEffect(
    () => () => {
      for (const list of Object.values(timers.current)) for (const t of list) window.clearTimeout(t);
    },
    [],
  );

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [key]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !follow.current) return;
    follow.current = false;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [groups, direct, typing]);

  function later(target: Chat, fn: () => void, ms: number) {
    const k = chatKey(target);
    timers.current[k] = [...(timers.current[k] ?? []), window.setTimeout(fn, ms)];
  }

  function setTypingIn(target: Chat, by: string | null) {
    const k = chatKey(target);
    if (k === openKey.current) follow.current = true;
    setTyping((list) => [...list.filter((t) => chatKey(t.chat) !== k), ...(by ? [{ chat: target, by }] : [])]);
  }

  function setBusyIn(target: Chat, on: boolean) {
    const k = chatKey(target);
    setBusy((list) => [...list.filter((v) => v !== k), ...(on ? [k] : [])]);
  }

  function patch(target: Chat, change: (lines: Line[]) => Line[]) {
    if (chatKey(target) === openKey.current) follow.current = true;
    if (target.type === "group")
      setGroups((list) => list.map((g) => (g.id === target.id ? { ...g, lines: change(g.lines) } : g)));
    else setDirect((map) => ({ ...map, [target.id]: change(map[target.id] ?? []) }));
  }

  function openDirect(id: string) {
    setChat({ type: "direct", id });
    setSelected(id);
    setTab("direct");
    setAgents((list) => list.map((a) => (a.id === id ? { ...a, unread: 0 } : a)));
    setListSheet(false);
  }

  function openGroup(id: string) {
    setChat({ type: "group", id });
    setListSheet(false);
  }

  function update(config: AgentConfig) {
    setAgents((list) => list.map((a) => (a.id === selected ? { ...a, ...config } : a)));
  }

  function addAgent() {
    const id = `agent-${Date.now()}`;
    setAgents((list) => [
      ...list,
      {
        id,
        name: "",
        role: roles[0],
        description: "",
        language: "English",
        notifications: true,
        mood: "sleepy" as AgentMood,
        color: "plum" as AgentColor,
        unread: 0,
      },
    ]);
    setChat({ type: "direct", id });
    setSelected(id);
    setTab("direct");
    if (!xl) setEditSheet(true);
  }

  function streamLine(target: Chat, by: string, text: string, time: string, onDone?: () => void) {
    const id = `${by}-${Date.now()}`;
    const total = words(text).length;
    setTypingIn(target, null);
    patch(target, (list) => [...list, { id, by, time, text, shown: 0 }]);
    let shown = 0;
    const step = () => {
      shown += 1;
      patch(target, (list) => list.map((l) => (l.id === id ? { ...l, shown } : l)));
      if (shown < total) later(target, step, 50);
      else onDone?.();
    };
    later(target, step, 50);
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy.includes(key)) return;
    const target = chat;
    patch(target, (list) => [...list, { id: `me-${Date.now()}`, by: "me", time: "09:16", text: clean }]);
    if (target.type === "direct") {
      const by = target.id;
      setBusyIn(target, true);
      later(target, () => setTypingIn(target, by), 400);
      later(
        target,
        () => streamLine(target, by, directReplies[by] ?? fallbackReply, "09:17", () => setBusyIn(target, false)),
        1900,
      );
      return;
    }
    if (target.id !== "hakuba") return;
    setBusyIn(target, true);
    if (stage === 0) {
      setStage(1);
      later(
        target,
        () =>
          streamLine(target, "sora", soraReply, "09:16", () => {
            later(target, () => setTypingIn(target, "mamoru"), 500);
            later(
              target,
              () =>
                streamLine(target, "mamoru", mamoruReply, "09:17", () => {
                  setBusyIn(target, false);
                  setGroups((list) =>
                    list.map((g) => (g.id === "hakuba" ? { ...g, last: `Mamoru: ${mamoruReply}`, when: "09:17" } : g)),
                  );
                }),
              2300,
            );
          }),
        1400,
      );
    } else {
      later(target, () => setTypingIn(target, "yuki"), 400);
      later(target, () => streamLine(target, "yuki", laterReply, "09:18", () => setBusyIn(target, false)), 1800);
    }
  }

  function stop() {
    for (const t of timers.current[key] ?? []) window.clearTimeout(t);
    timers.current[key] = [];
    setTypingIn(chat, null);
    setBusyIn(chat, false);
    patch(chat, (list) =>
      list.map((l) =>
        "shown" in l && l.shown != null && l.shown < words(l.text).length
          ? { ...l, text: words(l.text).slice(0, l.shown).join(" "), shown: undefined }
          : l,
      ),
    );
  }

  const replyNote = (id: string) => {
    const entry = typing.find((t) => t.by === id);
    if (!entry) return undefined;
    if (entry.chat.type === "direct") return "Writing a reply";
    return `Replying in ${groups.find((g) => g.id === entry.chat.id)?.title ?? "a group chat"}`;
  };
  const replyingIn = (id: string) => {
    const by = typing.find((t) => t.chat.type === "group" && t.chat.id === id)?.by;
    return by ? agents.find((a) => a.id === by) : undefined;
  };

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={navItems}
      user={user}
      defaultCurrent="chats"
      onNavigate={() => setMenu(false)}
      collapsed={drawer ? false : rail}
      onCollapsedChange={drawer ? undefined : setRailChoice}
      collapsible={!drawer}
      className={drawer ? "min-h-0 flex-1" : "hidden lg:flex"}
    />
  );

  const list = (
    <Tabs selectedKey={tab} onSelectionChange={setTab} variant="pill" className="flex min-h-0 flex-1 flex-col gap-3">
      <TabList aria-label="Chats" className="grid w-full shrink-0 grid-cols-2">
        <Tab id="direct" count={agents.reduce((n, a) => n + a.unread, 0) || undefined}>
          Direct
        </Tab>
        <Tab id="group">Group</Tab>
      </TabList>
      <TabPanel id="direct" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin]">
        <ul aria-label="Agents" className="flex flex-col gap-0.5">
          {agents.map((a) => (
            <li key={a.id}>
              <AgentRow
                agent={a}
                current={partner?.id === a.id}
                replying={replyNote(a.id)}
                onOpen={() => openDirect(a.id)}
              />
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          iconStart={<Plus />}
          onPress={addAgent}
          className="mt-2 w-full justify-start text-muted-foreground data-[hovered]:text-foreground"
        >
          New agent
        </Button>
      </TabPanel>
      <TabPanel id="group" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin]">
        <ul aria-label="Group chats" className="flex flex-col gap-0.5">
          {groups.map((g) => (
            <li key={g.id}>
              <GroupRow
                group={g}
                agents={agents}
                current={!partner && g.id === group.id}
                replying={replyingIn(g.id)}
                onOpen={() => openGroup(g.id)}
              />
            </li>
          ))}
        </ul>
      </TabPanel>
    </Tabs>
  );

  const creator = (
    <AgentPersona
      key={agent.id}
      roles={roles}
      defaultValue={agent}
      onChange={update}
      className="rounded-none border-0 shadow-none"
    />
  );

  return (
    <div {...props} className={cn("flex h-dvh gap-3 bg-background p-3 text-foreground", className)}>
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

      <div className="flex min-w-0 flex-1 flex-col gap-2">
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
            <Breadcrumb href="#" className="max-sm:hidden">
              Chats
            </Breadcrumb>
            <Breadcrumb>{title}</Breadcrumb>
          </Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              iconStart={<UsersRound />}
              onPress={() => setListSheet(true)}
              className="md:hidden"
            >
              Agents
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<SlidersHorizontal />}
              onPress={() => setEditSheet(true)}
              className="xl:hidden"
            >
              <span className="max-sm:sr-only">Edit </span>
              {agent.name || "agent"}
            </Button>
            <Button size="sm" iconStart={<Plus />} onPress={addAgent} className="max-sm:hidden">
              New agent
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-3">
          <section
            aria-label="Conversation"
            className="flex min-w-0 flex-1 overflow-clip rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="hidden w-[288px] shrink-0 flex-col border-e border-border p-3 md:flex">{list}</div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
                {partner ? (
                  <AgentAvatar size={36} mood={partner.mood} color={partner.color} className="shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base leading-6 font-semibold tracking-[-0.01em]">{title}</h1>
                  <p className="truncate text-[13px] leading-5 text-muted-foreground">
                    {partner ? (
                      <>
                        {partner.role}
                        <span className="max-sm:hidden"> · {partner.description || "No description yet."}</span>
                      </>
                    ) : (
                      <>
                        {group.dates}
                        <span className="max-sm:hidden"> · you and {members.length} agents</span>
                      </>
                    )}
                  </p>
                </div>
                {partner ? null : (
                  <ul aria-label="Members" className="flex shrink-0 items-center -space-x-1.5">
                    {members.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => openDirect(a.id)}
                          aria-label={`Message ${a.name || "unnamed agent"}`}
                          className="grid size-9 cursor-default place-items-center rounded-full bg-card outline-none ring-2 ring-card transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring"
                        >
                          <AgentAvatar size={26} mood={a.mood} color={a.color} />
                        </button>
                      </li>
                    ))}
                    {user.avatar != null && (
                      <li className="ps-1">
                        <Avatar src={user.avatar} name={user.name} size="sm" className="ring-2 ring-card" />
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div
                ref={scroller}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_16px)] [scrollbar-width:thin]"
              >
                <div className="flex flex-1 flex-col px-4 pt-5 pb-6 sm:px-5">
                  {partner && lines.length === 0 && !typingAgent ? (
                    <div className="m-auto flex max-w-64 flex-col items-center gap-3 py-6 text-center">
                      <AgentAvatar size={56} mood={partner.mood} color={partner.color} />
                      <p className="text-sm text-pretty text-muted-foreground">
                        No messages yet. Ask {partner.name || "this agent"} something to start.
                      </p>
                    </div>
                  ) : (
                    <p className="mb-5 text-center text-xs text-muted-foreground">
                      {partner || group.id === "hakuba"
                        ? "Tuesday 16 February"
                        : group.id === "niseko"
                          ? "Monday 15 February"
                          : "Friday 12 February"}
                    </p>
                  )}
                  <ol aria-label="Messages" className="flex flex-col gap-6">
                    {lines.map((line) => {
                      if (line.by === "me") {
                        return (
                          <li key={line.id} className="flex justify-end ps-10 sm:ps-16">
                            <div className="flex flex-col items-end gap-1">
                              <p className="rounded-2xl rounded-ee-md bg-secondary px-4 py-2.5 text-[15px] leading-6 text-secondary-foreground ring-1 ring-foreground/5 ring-inset [overflow-wrap:anywhere]">
                                <Mentions text={line.text} agents={agents} />
                              </p>
                              <span className="text-xs text-muted-foreground tabular-nums">{line.time}</span>
                            </div>
                          </li>
                        );
                      }
                      const by = agents.find((a) => a.id === line.by);
                      if (!by) return null;
                      const all = words(line.text);
                      const shown = "shown" in line && line.shown != null ? line.shown : all.length;
                      return (
                        <li key={line.id}>
                          <AgentLine agent={by} time={line.time} onOpen={partner ? undefined : () => openDirect(by.id)}>
                            <p>
                              {shown < all.length ? (
                                <>
                                  {all.slice(0, shown).join(" ")}
                                  <span className="ms-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px] rounded-full bg-brand motion-safe:animate-pulse" />
                                </>
                              ) : (
                                <Mentions text={line.text} agents={agents.filter((a) => a.id !== by.id)} />
                              )}
                            </p>
                            {"card" in line && line.card === "route" && <RouteCard />}
                            {"card" in line && line.card === "hold" && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge tone="brand" dot>
                                  4 beds held until 18:00
                                </Badge>
                                <Badge>Bus 07:12</Badge>
                              </div>
                            )}
                          </AgentLine>
                        </li>
                      );
                    })}
                    {typingAgent && (
                      <li>
                        <AgentLine agent={typingAgent} onOpen={partner ? undefined : () => openDirect(typingAgent.id)}>
                          <ThinkingGlyph
                            variant={!partner && typingAgent.id === "sora" ? "reading" : "thinking"}
                            label={
                              partner
                                ? "Writing a reply"
                                : typingAgent.id === "sora"
                                  ? "Reading the 06:00 mountain bulletin"
                                  : "Checking the plan"
                            }
                            showElapsed
                            className="mt-0.5"
                          />
                        </AgentLine>
                      </li>
                    )}
                  </ol>
                </div>
                <div className="sticky bottom-0 z-10 px-3 sm:px-4">
                  <div aria-hidden="true" className="h-5 bg-gradient-to-t from-card to-transparent" />
                  <div className="bg-card pb-3">
                    <PromptBox
                      placeholder={`Message ${title}`}
                      showAttach={false}
                      status={status}
                      onSend={send}
                      onStop={stop}
                      maxRows={5}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside
            aria-label={`Edit ${agent.name || "unnamed agent"}`}
            className="hidden w-[372px] shrink-0 flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-sm [scrollbar-width:thin] xl:flex"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
              <p className="text-sm font-semibold">Edit agent</p>
              <span className="text-xs text-muted-foreground">Changes save as you go</span>
            </div>
            {xl ? creator : null}
          </aside>
        </div>
      </div>

      <Drawer
        side="bottom"
        isOpen={listSheet && !md}
        onOpenChange={setListSheet}
        aria-label="Agents and chats"
        className="h-[80%]"
      >
        <DrawerHeader>
          <DrawerTitle>Agents and chats</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{list}</div>
      </Drawer>
      <Drawer
        side={md ? "right" : "bottom"}
        isOpen={editSheet && !xl}
        onOpenChange={setEditSheet}
        aria-label={`Edit ${agent.name || "unnamed agent"}`}
        className={md ? "w-[400px]" : "h-[90%]"}
      >
        <DrawerHeader>
          <DrawerTitle>Edit agent</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="px-0 py-0">{creator}</DrawerBody>
      </Drawer>
    </div>
  );
}
