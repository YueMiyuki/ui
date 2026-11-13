"use client";

import {
  CalendarDays,
  ChartGantt,
  Check,
  Columns3,
  FolderKanban,
  House,
  Inbox,
  List,
  MessageSquare,
  MountainSnow,
  PanelLeft,
  Plus,
  Radar,
  RadioTower,
  Snowflake,
} from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Key } from "react-aria-components";
import { Avatar, AvatarGroup } from "@/components/miyuki-ui/avatar";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { ProgressBar } from "@/components/miyuki-ui/progress";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
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

export interface KanbanBoardMember {
  name: string;
  avatar?: string;
}

type ColumnId = "backlog" | "progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  tags: string[];
  start: number;
  due: number | null;
  comments: number;
  assignee: number;
  subtasks?: [number, number];
}

const columns: { id: ColumnId; name: string; dot: string; bar: string }[] = [
  { id: "backlog", name: "Backlog", dot: "bg-muted-foreground", bar: "bg-muted-foreground/45" },
  { id: "progress", name: "In progress", dot: "bg-brand", bar: "bg-brand" },
  { id: "review", name: "In review", dot: "bg-warning", bar: "bg-warning" },
  { id: "done", name: "Done", dot: "bg-success", bar: "bg-success" },
];

const columnIds = columns.map((c) => c.id);
const columnName = Object.fromEntries(columns.map((c) => [c.id, c.name])) as Record<ColumnId, string>;

const TODAY = 16;

const startingTasks: Task[] = [
  {
    id: "b1",
    title: "Add the Kiso valley stations to the map",
    tags: ["Map", "Stations"],
    start: 22,
    due: 26,
    comments: 2,
    assignee: 3,
    subtasks: [0, 4],
  },
  {
    id: "b2",
    title: "Draft the thaw flood bulletin",
    tags: ["Bulletins", "Rivers"],
    start: 23,
    due: 27,
    comments: 1,
    assignee: 1,
  },
  {
    id: "b3",
    title: "Price a second radar feed for Hokkaido",
    tags: ["Radar", "Budget"],
    start: 19,
    due: 24,
    comments: 5,
    assignee: 4,
  },
  {
    id: "b4",
    title: "Write the avalanche scale page in English",
    tags: ["Content", "Avalanche"],
    start: 20,
    due: 25,
    comments: 0,
    assignee: 0,
  },
  {
    id: "p1",
    title: "Calibrate snow depth sensors at Hakuba",
    tags: ["Stations", "Field"],
    start: 10,
    due: 18,
    comments: 4,
    assignee: 2,
    subtasks: [3, 5],
  },
  {
    id: "p2",
    title: "Load test the radar map for storm days",
    tags: ["Radar", "Performance"],
    start: 11,
    due: 19,
    comments: 7,
    assignee: 4,
    subtasks: [2, 4],
  },
  {
    id: "p3",
    title: "Move the avalanche bulletin to 06:00",
    tags: ["Avalanche", "Bulletins"],
    start: 8,
    due: 17,
    comments: 3,
    assignee: 0,
    subtasks: [4, 6],
  },
  {
    id: "r1",
    title: "Feels-like column on station pages",
    tags: ["Stations", "Web"],
    start: 12,
    due: 17,
    comments: 6,
    assignee: 3,
    subtasks: [5, 5],
  },
  {
    id: "r2",
    title: "Renew the Nozawa webcam contract",
    tags: ["Contracts", "Cameras"],
    start: 9,
    due: 20,
    comments: 2,
    assignee: 2,
  },
  {
    id: "d1",
    title: "Replace the Niseko summit anemometer",
    tags: ["Field", "Stations"],
    start: 2,
    due: 9,
    comments: 8,
    assignee: 2,
    subtasks: [6, 6],
  },
  {
    id: "d2",
    title: "February storm-day on-call rota",
    tags: ["Team", "Rota"],
    start: 1,
    due: 5,
    comments: 4,
    assignee: 1,
  },
  {
    id: "d3",
    title: "Start the snow depth chart at zero",
    tags: ["Web", "Charts"],
    start: 10,
    due: 12,
    comments: 1,
    assignee: 3,
  },
];

const startingOrder: Record<ColumnId, string[]> = {
  backlog: ["b1", "b2", "b3", "b4"],
  progress: ["p1", "p2", "p3"],
  review: ["r1", "r2"],
  done: ["d1", "d2", "d3"],
};

const defaultMembers: KanbanBoardMember[] = [
  { name: "Yuna Sato" },
  { name: "Amara Okafor" },
  { name: "Lars Eriksen" },
  { name: "Ingrid Solberg" },
  { name: "Chen Wei" },
];

const defaultUser: FloatingSidebarUser = { name: "Yuna Sato", email: "yuna@hoshizora.example" };

const teams = [{ id: "hoshizora", name: "Hoshizora Weather", plan: "Operations, 14 people", logo: <MountainSnow /> }];

const navItems: FloatingSidebarItem[] = [
  { id: "home", label: "Home", icon: <House /> },
  { id: "inbox", label: "Inbox", icon: <Inbox />, count: 4, countTone: "solid" },
  { id: "projects", label: "Projects", icon: <FolderKanban /> },
];

function projectGroups(total: number): FloatingSidebarGroup[] {
  return [
    {
      label: "Projects",
      items: [
        { id: "winter", label: "Winter season 2027", icon: <Snowflake />, count: total },
        { id: "radar", label: "Radar upgrade", icon: <Radar />, count: 8 },
        { id: "stations", label: "Station network", icon: <RadioTower />, count: 21 },
      ],
    },
  ];
}

const hues = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-6"];

function tagStyle(tag: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  const hue = `var(${hues[h % hues.length]})`;
  return {
    backgroundColor: `color-mix(in oklab, ${hue} 16%, transparent)`,
    color: `color-mix(in oklab, ${hue} 50%, var(--foreground))`,
  };
}

const day = (d: number) => `${d} Feb`;

function locate(order: Record<ColumnId, string[]>, id: string) {
  for (const col of columnIds) {
    const index = order[col].indexOf(id);
    if (index >= 0) return { col, index };
  }
  return null;
}

function moveTo(order: Record<ColumnId, string[]>, id: string, to: { col: ColumnId; index: number }) {
  const next = Object.fromEntries(columnIds.map((c) => [c, order[c].filter((x) => x !== id)])) as Record<
    ColumnId,
    string[]
  >;
  next[to.col].splice(Math.min(to.index, next[to.col].length), 0, id);
  return next;
}

function DueChip({ due, done }: { due: number | null; done: boolean }) {
  if (due == null) return <span className="text-muted-foreground">No date</span>;
  const soon = !done && due - TODAY <= 2;
  const late = !done && due < TODAY;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        late ? "text-destructive" : soon ? "text-warning-strong" : "text-muted-foreground",
      )}
    >
      {done ? (
        <Check aria-hidden="true" className="size-3.5 text-success-strong" />
      ) : (
        <CalendarDays aria-hidden="true" className="size-3.5" />
      )}
      {day(due)}
    </span>
  );
}

function CardBody({ task, member, done }: { task: Task; member?: KanbanBoardMember; done: boolean }) {
  return (
    <>
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span
              key={t}
              className="inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium"
              style={tagStyle(t)}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <p className={cn("text-sm leading-5 font-medium text-pretty", done && "text-muted-foreground")}>{task.title}</p>
      {task.subtasks && (
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar
            aria-label="Subtasks done"
            value={task.subtasks[0]}
            maxValue={task.subtasks[1]}
            showValue={false}
            size="sm"
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {task.subtasks[0]}/{task.subtasks[1]}
          </span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <DueChip due={task.due} done={done} />
        {task.comments > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
            <MessageSquare aria-hidden="true" className="size-3.5" />
            {task.comments}
          </span>
        )}
        {member && <Avatar src={member.avatar} name={member.name} size="xs" className="ms-auto" aria-hidden="true" />}
      </div>
    </>
  );
}

function describe(task: Task, member: KanbanBoardMember | undefined, done: boolean) {
  const parts = [task.title];
  if (task.tags.length) parts.push(task.tags.join(", "));
  if (task.subtasks) parts.push(`${task.subtasks[0]} of ${task.subtasks[1]} subtasks done`);
  if (task.due != null) parts.push(done ? `Finished ${day(task.due)}` : `Due ${day(task.due)}`);
  if (task.comments) parts.push(`${task.comments} ${task.comments === 1 ? "comment" : "comments"}`);
  if (member) parts.push(`Assigned to ${member.name}`);
  return parts.join(". ");
}

interface Gesture {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
  touch: boolean;
  started: boolean;
  timer: number;
}

export interface KanbanBoardProps extends ComponentProps<"div"> {
  members?: KanbanBoardMember[];
  user?: FloatingSidebarUser;
}

export function KanbanBoard({ members = defaultMembers, user = defaultUser, className, ...props }: KanbanBoardProps) {
  const lg = useMedia("(min-width: 1024px)");
  const hint = useId();
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState<Key>("board");
  const [tasks, setTasks] = useState(
    () => Object.fromEntries(startingTasks.map((t) => [t.id, t])) as Record<string, Task>,
  );
  const [order, setOrder] = useState(startingOrder);
  const [lifted, setLifted] = useState<{ id: string; snapshot: Record<ColumnId, string[]> } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; width: number; height: number; x: number; y: number } | null>(
    null,
  );
  const [slot, setSlot] = useState<{ col: ColumnId; index: number } | null>(null);
  const [adding, setAdding] = useState<ColumnId | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const gesture = useRef<Gesture | null>(null);
  const slotRef = useRef<{ col: ColumnId; index: number } | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<ColumnId, HTMLElement>());
  const lists = useRef(new Map<ColumnId, HTMLElement>());
  const cards = useRef(new Map<string, HTMLElement>());
  const flip = useRef(false);

  const total = Object.values(order).reduce((n, ids) => n + ids.length, 0);

  const say = useCallback((text: string) => {
    flip.current = !flip.current;
    setMessage(text + (flip.current ? " " : ""));
  }, []);

  const where = (o: Record<ColumnId, string[]>, id: string) => {
    const at = locate(o, id);
    if (!at) return "";
    return `${columnName[at.col]}, position ${at.index + 1} of ${o[at.col].length}`;
  };

  useLayoutEffect(() => {
    if (!lifted) return;
    const el = cards.current.get(lifted.id);
    if (el && document.activeElement !== el) el.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [order, lifted]);

  useEffect(() => {
    if (!lifted) return;
    const drop = (event: PointerEvent) => {
      const el = cards.current.get(lifted.id);
      if (el?.contains(event.target as Node)) return;
      setLifted(null);
      say(`Dropped ${tasks[lifted.id]?.title}. ${where(order, lifted.id)}.`);
    };
    window.addEventListener("pointerdown", drop);
    return () => window.removeEventListener("pointerdown", drop);
  });

  function lift(id: string) {
    setLifted({ id, snapshot: order });
    say(
      `Picked up ${tasks[id].title}. ${where(order, id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    );
  }

  function drop() {
    if (!lifted) return;
    say(`Dropped ${tasks[lifted.id].title}. ${where(order, lifted.id)}.`);
    setLifted(null);
  }

  function cancel() {
    if (!lifted) return;
    const back = lifted.snapshot;
    setOrder(back);
    say(`Cancelled. ${tasks[lifted.id].title} is back in ${where(back, lifted.id)}.`);
    setLifted(null);
  }

  function onCardKey(event: ReactKeyboardEvent<HTMLElement>, id: string) {
    if (gesture.current?.started) return;
    const on = lifted?.id === id;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (on) drop();
      else lift(id);
      return;
    }
    if (!on) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === "Tab") {
      drop();
      return;
    }
    const at = locate(order, id);
    if (!at) return;
    let to: { col: ColumnId; index: number } | null = null;
    if (event.key === "ArrowUp") to = { col: at.col, index: at.index - 1 };
    if (event.key === "ArrowDown") to = { col: at.col, index: at.index + 1 };
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const c = columnIds.indexOf(at.col) + (event.key === "ArrowLeft" ? -1 : 1);
      if (c >= 0 && c < columnIds.length) {
        const target = columnIds[c];
        to = { col: target, index: Math.min(at.index, order[target].length) };
      } else {
        to = at;
      }
    }
    if (!to) return;
    event.preventDefault();
    const last = to.col === at.col ? order[at.col].length - 1 : order[to.col].length;
    if (to.index < 0 || to.index > last || (to.col === at.col && to.index === at.index)) {
      say(`${tasks[id].title} is already at ${where(order, id)}.`);
      return;
    }
    const next = moveTo(order, id, to);
    setOrder(next);
    say(`Moved to ${where(next, id)}.`);
  }

  const computeSlot = useCallback((x: number, y: number, id: string) => {
    let best: ColumnId | null = null;
    let bestGap = Infinity;
    for (const [col, el] of sections.current) {
      const r = el.getBoundingClientRect();
      const gap = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (gap < bestGap) {
        bestGap = gap;
        best = col;
      }
    }
    if (!best) return null;
    const list = lists.current.get(best);
    if (!list) return null;
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-card]")).filter((el) => el.dataset.card !== id);
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    return { col: best, index };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const edge = 56;
    const tick = () => {
      const g = gesture.current;
      if (!g?.started) return;
      const area = board.current;
      if (area) {
        const r = area.getBoundingClientRect();
        if (g.x < r.left + edge) area.scrollLeft -= Math.ceil((r.left + edge - g.x) / 5);
        else if (g.x > r.right - edge) area.scrollLeft += Math.ceil((g.x - (r.right - edge)) / 5);
      }
      const list = slotRef.current ? lists.current.get(slotRef.current.col) : undefined;
      if (list) {
        const r = list.getBoundingClientRect();
        if (g.y < r.top + edge && g.y > r.top - edge) list.scrollTop -= Math.ceil((r.top + edge - g.y) / 5);
        else if (g.y > r.bottom - edge && g.y < r.bottom + edge)
          list.scrollTop += Math.ceil((g.y - (r.bottom - edge)) / 5);
      }
      const next = computeSlot(g.x, g.y, g.id);
      const prev = slotRef.current;
      if (next && (!prev || prev.col !== next.col || prev.index !== next.index)) {
        slotRef.current = next;
        setSlot(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stopScroll = (event: TouchEvent) => event.preventDefault();
    window.addEventListener("touchmove", stopScroll, { passive: false });
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("touchmove", stopScroll);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging, computeSlot]);

  function endGesture() {
    const g = gesture.current;
    if (g) window.clearTimeout(g.timer);
    gesture.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onEscape);
  }

  function begin(g: Gesture) {
    g.started = true;
    const from = locate(order, g.id);
    slotRef.current = from;
    setSlot(from);
    setLifted(null);
    setDragging({ id: g.id, width: g.width, height: g.height, x: g.x - g.offsetX, y: g.y - g.offsetY });
    say(`Picked up ${tasks[g.id].title}.`);
  }

  function onMove(event: PointerEvent) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    g.x = event.clientX;
    g.y = event.clientY;
    const moved = Math.hypot(g.x - g.startX, g.y - g.startY);
    if (!g.started) {
      if (g.touch) {
        if (moved > 8) endGesture();
        return;
      }
      if (moved < 4) return;
      begin(g);
    }
    const el = overlay.current;
    if (el) el.style.transform = `translate3d(${g.x - g.offsetX}px, ${g.y - g.offsetY}px, 0) rotate(1.5deg)`;
  }

  function finishDrag(commit: boolean) {
    const g = gesture.current;
    const target = slotRef.current;
    if (g?.started) {
      if (commit && target) {
        const next = moveTo(order, g.id, target);
        setOrder(next);
        say(`Dropped ${tasks[g.id].title}. ${where(next, g.id)}.`);
      } else {
        say(`Cancelled. ${tasks[g.id].title} is back in ${where(order, g.id)}.`);
      }
    }
    slotRef.current = null;
    setSlot(null);
    setDragging(null);
    endGesture();
  }

  function onUp(event: PointerEvent) {
    if (gesture.current && event.pointerId !== gesture.current.pointerId) return;
    finishDrag(true);
  }

  function onCancel(event: PointerEvent) {
    if (gesture.current && event.pointerId !== gesture.current.pointerId) return;
    finishDrag(false);
  }

  function onEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    finishDrag(false);
  }

  function onCardPointerDown(event: ReactPointerEvent<HTMLElement>, id: string) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const touch = event.pointerType !== "mouse";
    const g: Gesture = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: event.clientX,
      y: event.clientY,
      touch,
      started: false,
      timer: 0,
    };
    if (touch) {
      g.timer = window.setTimeout(() => {
        if (gesture.current === g && !g.started) begin(g);
      }, 260);
    }
    gesture.current = g;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onEscape);
  }

  function startAdding(col: ColumnId) {
    setAdding(col);
    setDraft("");
    if (col === "backlog") board.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || !adding) {
      setAdding(null);
      return;
    }
    const id = `t-${Date.now()}`;
    setTasks((all) => ({ ...all, [id]: { id, title, tags: [], start: TODAY, due: null, comments: 0, assignee: 0 } }));
    setOrder((o) => ({ ...o, [adding]: [...o[adding], id] }));
    say(`Added ${title} to ${columnName[adding]}.`);
    setDraft("");
  }

  const doneCount = order.done.length;
  const dragTask = dragging ? tasks[dragging.id] : null;

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={navItems}
      groups={projectGroups(total)}
      user={user}
      defaultCurrent="winter"
      onNavigate={() => setMenu(false)}
      collapsed={drawer ? false : undefined}
      collapsible={!drawer}
      className={drawer ? "min-h-0 flex-1" : "hidden lg:flex"}
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

      <main className="relative flex min-w-0 flex-1 flex-col">
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
              Projects
            </Breadcrumb>
            <Breadcrumb>Winter season 2027</Breadcrumb>
          </Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-3">
            <AvatarGroup size="sm" max={4} aria-label={`${members.length} members`} className="max-sm:hidden">
              {members.map((m) => (
                <Avatar key={m.name} src={m.avatar} name={m.name} />
              ))}
            </AvatarGroup>
            <Button size="sm" iconStart={<Plus />} onPress={() => startAdding("backlog")}>
              New task
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 px-0.5 pt-3 pb-4 lg:px-2">
          <div className="min-w-0">
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">Winter season 2027</h1>
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
              {total} tasks · {doneCount} done · storm-day readiness by 28 February
            </p>
          </div>
          <SegmentedControl
            aria-label="View"
            selectedKeys={[view]}
            onSelectionChange={(keys) => {
              const [next] = [...keys];
              if (next != null) setView(next);
            }}
          >
            <Segment id="board">
              <Columns3 aria-hidden="true" />
              Board
            </Segment>
            <Segment id="list">
              <List aria-hidden="true" />
              List
            </Segment>
            <Segment id="timeline">
              <ChartGantt aria-hidden="true" />
              Timeline
            </Segment>
          </SegmentedControl>
        </div>

        <p id={hint} className="sr-only">
          Press Space to pick up a task. Use the arrow keys to move it within and between columns, Space to drop it, and
          Escape to cancel.
        </p>
        <p aria-live="assertive" className="sr-only">
          {message}
        </p>

        {view === "board" && (
          <div
            ref={board}
            className="-mx-3 flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto overscroll-x-contain px-3 pb-1 [scrollbar-width:thin] max-sm:snap-mandatory sm:mx-0 sm:px-0 lg:ps-2"
          >
            {columns.map((col) => {
              const ids = order[col.id].filter((id) => id !== dragging?.id);
              const items = ids.map((id) => {
                const task = tasks[id];
                const on = lifted?.id === id;
                const done = col.id === "done";
                return (
                  <li key={id}>
                    <div
                      ref={(el) => {
                        if (el) cards.current.set(id, el);
                        else cards.current.delete(id);
                      }}
                      data-card={id}
                      role="button"
                      tabIndex={0}
                      aria-roledescription="task"
                      aria-label={describe(task, members[task.assignee], done)}
                      aria-describedby={hint}
                      aria-pressed={on || undefined}
                      onKeyDown={(e) => onCardKey(e, id)}
                      onPointerDown={(e) => onCardPointerDown(e, id)}
                      className={cn(
                        "relative cursor-grab touch-manipulation rounded-xl border bg-card p-3 outline-none select-none",
                        "transition-[box-shadow,border-color,translate] duration-200 ease-settle",
                        "focus-visible:ring-[3px] focus-visible:ring-ring",
                        on
                          ? "-translate-y-0.5 border-brand shadow-lg ring-[3px] ring-ring"
                          : "border-border shadow-xs hover:border-border-strong hover:shadow-sm",
                      )}
                    >
                      <CardBody task={task} member={members[task.assignee]} done={done} />
                    </div>
                  </li>
                );
              });
              if (dragging && slot?.col === col.id) {
                items.splice(
                  slot.index,
                  0,
                  <li key="slot" aria-hidden="true">
                    <div
                      className="rounded-xl border-2 border-dashed border-brand/60 bg-brand-soft/50"
                      style={{ height: dragging.height }}
                    />
                  </li>,
                );
              }
              return (
                <section
                  key={col.id}
                  ref={(el) => {
                    if (el) sections.current.set(col.id, el);
                    else sections.current.delete(col.id);
                  }}
                  aria-labelledby={`${hint}-${col.id}`}
                  className="relative flex max-h-full min-w-[264px] flex-1 basis-0 snap-start flex-col rounded-2xl bg-muted/70 ring-1 ring-foreground/[0.03] ring-inset max-sm:min-w-[84%]"
                >
                  <header className="flex h-11 shrink-0 items-center gap-2 ps-3.5 pe-1.5">
                    <span aria-hidden="true" className={cn("size-2 rounded-full", col.dot)} />
                    <h2 id={`${hint}-${col.id}`} className="text-sm font-semibold">
                      {col.name}
                    </h2>
                    <span className="rounded-full bg-foreground/[0.06] px-1.5 text-xs leading-5 font-medium text-muted-foreground tabular-nums">
                      {order[col.id].length}
                      <span className="sr-only"> tasks</span>
                    </span>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      aria-label={`Add a task to ${col.name}`}
                      onPress={() => startAdding(col.id)}
                      className="ms-auto size-7 text-muted-foreground data-[hovered]:bg-card data-[hovered]:text-foreground"
                    >
                      <Plus />
                    </IconButton>
                  </header>
                  <ol
                    ref={(el) => {
                      if (el) lists.current.set(col.id, el);
                      else lists.current.delete(col.id);
                    }}
                    aria-labelledby={`${hint}-${col.id}`}
                    className="flex min-h-20 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 pb-2 [scrollbar-width:thin]"
                  >
                    {items}
                    {adding === col.id && (
                      <li>
                        <form onSubmit={addTask} className="rounded-xl border border-border bg-card p-2 shadow-sm">
                          <TextField
                            aria-label={`New task in ${col.name}`}
                            placeholder="What needs doing?"
                            autoFocus
                            value={draft}
                            onChange={setDraft}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setAdding(null);
                            }}
                            size="sm"
                          />
                          <div className="mt-2 flex justify-end gap-1.5">
                            <Button variant="ghost" size="sm" onPress={() => setAdding(null)}>
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" isDisabled={!draft.trim()}>
                              Add task
                            </Button>
                          </div>
                        </form>
                      </li>
                    )}
                    {items.length === 0 && adding !== col.id && (
                      <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted-foreground">
                        Drop a task here
                      </li>
                    )}
                  </ol>
                </section>
              );
            })}
          </div>
        )}

        {view === "list" && <ListView order={order} tasks={tasks} members={members} />}
        {view === "timeline" && <TimelineView order={order} tasks={tasks} members={members} />}

        {lifted && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-4 py-2 text-[13px] whitespace-nowrap text-primary-foreground shadow-lg"
          >
            <span className="max-w-48 truncate font-medium">{tasks[lifted.id].title}</span>
            <span className="flex items-center gap-1.5 opacity-80 max-md:hidden">
              <kbd className="rounded-sm bg-primary-foreground/15 px-1 font-sans">↑↓</kbd> position
              <kbd className="ms-1.5 rounded-sm bg-primary-foreground/15 px-1 font-sans">←→</kbd> column
              <kbd className="ms-1.5 rounded-sm bg-primary-foreground/15 px-1 font-sans">Space</kbd> drop
              <kbd className="ms-1.5 rounded-sm bg-primary-foreground/15 px-1 font-sans">Esc</kbd> cancel
            </span>
          </div>
        )}
      </main>

      {dragging && dragTask && (
        <div
          ref={overlay}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-50 rounded-xl border border-border-strong bg-card p-3 shadow-xl"
          style={{
            width: dragging.width,
            transform: `translate3d(${dragging.x}px, ${dragging.y}px, 0) rotate(1.5deg)`,
          }}
        >
          <CardBody task={dragTask} member={members[dragTask.assignee]} done={false} />
        </div>
      )}
    </div>
  );
}

function ListView({
  order,
  tasks,
  members,
}: {
  order: Record<ColumnId, string[]>;
  tasks: Record<string, Task>;
  members: KanbanBoardMember[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card shadow-sm [scrollbar-width:thin] lg:ms-2">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-2.5 ps-5 pe-3 text-start font-medium">Task</th>
            <th className="px-3 py-2.5 text-start font-medium">Tags</th>
            <th className="px-3 py-2.5 text-start font-medium">Due</th>
            <th className="px-3 py-2.5 text-start font-medium">Subtasks</th>
            <th className="py-2.5 ps-3 pe-5 text-start font-medium">Owner</th>
          </tr>
        </thead>
        {columns.map((col) => (
          <tbody key={col.id}>
            <tr className="bg-muted/50">
              <th colSpan={5} scope="colgroup" className="py-2 ps-5 text-start text-[13px] font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", col.dot)} />
                  {col.name}
                  <span className="font-normal text-muted-foreground tabular-nums">{order[col.id].length}</span>
                </span>
              </th>
            </tr>
            {order[col.id].map((id) => {
              const t = tasks[id];
              const m = members[t.assignee];
              return (
                <tr key={id} className="border-b border-border last:border-0">
                  <td className="py-2.5 ps-5 pe-3 font-medium">{t.title}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex gap-1">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium"
                          style={tagStyle(tag)}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap">
                    <DueChip due={t.due} done={col.id === "done"} />
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-muted-foreground tabular-nums">
                    {t.subtasks ? `${t.subtasks[0]} of ${t.subtasks[1]}` : "None"}
                  </td>
                  <td className="py-2.5 ps-3 pe-5">
                    {m && (
                      <span className="flex items-center gap-2 text-[13px] whitespace-nowrap">
                        <Avatar src={m.avatar} name={m.name} size="xs" aria-hidden="true" />
                        {m.name}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function TimelineView({
  order,
  tasks,
  members,
}: {
  order: Record<ColumnId, string[]>;
  tasks: Record<string, Task>;
  members: KanbanBoardMember[];
}) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const rows = columns.flatMap((col) => order[col.id].map((id) => ({ task: tasks[id], col })));
  const pct = (d: number) => `${((d - 1) / 28) * 100}%`;
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card shadow-sm [scrollbar-width:thin] lg:ms-2">
      <div className="min-w-[860px]">
        <div className="sticky top-0 z-10 grid grid-cols-[264px_1fr] border-b border-border bg-card">
          <p className="sticky start-0 z-[1] bg-card py-2.5 ps-5 text-xs font-medium text-muted-foreground">Task</p>
          <div className="relative h-9">
            {days.map((d) => (
              <span
                key={d}
                className={cn(
                  "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] tabular-nums",
                  d === TODAY ? "font-semibold text-brand-strong" : "text-muted-foreground",
                  d !== TODAY && (d % 7 !== 1 || Math.abs(d - TODAY) <= 1) && "max-xl:hidden",
                )}
                style={{ left: `calc(${pct(d)} + ${100 / 56}%)` }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-[264px] end-0">
            {[8, 15, 22].map((d) => (
              <span key={d} className="absolute inset-y-0 w-px bg-border" style={{ left: pct(d) }} />
            ))}
            <span
              className="absolute inset-y-0 w-0.5 bg-brand/60"
              style={{ left: `calc(${pct(TODAY)} + ${100 / 56}%)` }}
            />
          </div>
          <ul aria-label="Tasks by date">
            {rows.map(({ task, col }) => (
              <li
                key={task.id}
                className="grid grid-cols-[264px_1fr] items-center border-b border-border last:border-0"
              >
                <p className="sticky start-0 z-[1] flex min-w-0 items-center gap-2 bg-card py-2.5 ps-5 pe-3 text-[13px]">
                  <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", col.dot)} />
                  <span className="truncate font-medium">{task.title}</span>
                </p>
                <div className="relative h-10">
                  <span
                    className={cn(
                      "absolute top-1/2 flex h-6 -translate-y-1/2 items-center rounded-md px-2 text-xs font-medium",
                      col.bar,
                      col.id === "backlog"
                        ? "text-foreground"
                        : col.id === "review"
                          ? "text-warning-foreground"
                          : col.id === "done"
                            ? "text-success-foreground"
                            : "text-brand-foreground",
                    )}
                    style={{
                      left: pct(task.start),
                      width: `calc(${(((task.due ?? task.start) - task.start + 1) / 28) * 100}% - 2px)`,
                    }}
                  >
                    <span className="truncate">{members[task.assignee]?.name.split(" ")[0]}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
