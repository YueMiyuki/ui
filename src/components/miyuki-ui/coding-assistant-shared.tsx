"use client";

import { Bot, Check, ChevronDown, ChevronLeft, ClipboardList, MessageCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ListBox } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Popover, PopoverTrigger } from "@/components/miyuki-ui/popover";
import { SelectItem } from "@/components/miyuki-ui/select";
import { Slider } from "@/components/miyuki-ui/slider";
import { cn } from "@/lib/utils";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export type ProjectId = "forecast-web" | "bulletin-mailer" | "harbour-feed" | "radar-tiles";

export const projectIds: ProjectId[] = ["forecast-web", "bulletin-mailer", "harbour-feed", "radar-tiles"];

export const projectBranches: Record<ProjectId, string[]> = {
  "forecast-web": ["feels-like-column", "main", "snow-depth-axis", "station-list-speed", "legend-contrast"],
  "bulletin-mailer": ["main", "night-palette", "plain-text-part"],
  "harbour-feed": ["main", "tide-cache"],
  "radar-tiles": ["tile-cache", "main"],
};

export const models = [
  { id: "flurry", name: "Flurry", description: "Fast answers and small edits" },
  { id: "standard", name: "Standard", description: "Everyday changes" },
  { id: "fine", name: "Fine mesh", description: "Reads the whole project first" },
];

export const efforts = ["Low", "Medium", "High", "Max"];

export type ModeId = "agent" | "ask" | "plan";

export const modes: { id: ModeId; name: string; description: string; icon: ReactNode }[] = [
  { id: "agent", name: "Agent", description: "Edits files and runs commands", icon: <Bot /> },
  { id: "ask", name: "Ask", description: "Answers without changing anything", icon: <MessageCircle /> },
  { id: "plan", name: "Plan", description: "Proposes a plan first", icon: <ClipboardList /> },
];

export const ghostPill =
  "h-7 gap-1.5 rounded-md px-2 text-[13px] font-normal text-muted-foreground data-[hovered]:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground [&_svg]:size-3.5";

export function modelLabel(model: string, effort: number) {
  const current = models.find((m) => m.id === model) ?? models[1];
  return `${current.name}, ${efforts[effort].toLowerCase()} effort`;
}

export function ModelPicker({
  model,
  onModel,
  effort,
  onEffort,
  placement = "top end",
  triggerClassName,
  showEffort = false,
}: {
  model: string;
  onModel: (id: string) => void;
  effort: number;
  onEffort: (value: number) => void;
  placement?: "top end" | "bottom start" | "bottom end" | "top start";
  triggerClassName?: string;
  showEffort?: boolean;
}) {
  const current = models.find((m) => m.id === model) ?? models[1];
  return (
    <PopoverTrigger>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Model: ${modelLabel(model, effort)}`}
        iconEnd={<ChevronDown aria-hidden="true" />}
        className={cn(ghostPill, "h-8 rounded-full px-2.5", triggerClassName)}
      >
        {current.name}
        {showEffort && <span className="text-muted-foreground"> · {efforts[effort]}</span>}
      </Button>
      <Popover placement={placement} offset={8} aria-label="Model" className="w-72 overflow-y-auto p-1.5">
        <ListBox
          aria-label="Model"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[current.id]}
          onSelectionChange={(keys) => {
            const [key] = keys === "all" ? [] : [...keys];
            if (key != null) onModel(String(key));
          }}
          className="flex flex-col gap-0.5 outline-none"
        >
          {models.map((m) => (
            <SelectItem key={m.id} id={m.id} description={m.description} textValue={m.name}>
              {m.name}
            </SelectItem>
          ))}
        </ListBox>
        <div aria-hidden="true" className="-mx-1.5 my-1.5 h-px bg-border" />
        <div className="px-2.5 pt-1 pb-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Effort</p>
            <p className="text-[13px] text-muted-foreground">{efforts[effort]}</p>
          </div>
          <Slider
            aria-label="Effort"
            size="sm"
            showValue={false}
            minValue={0}
            maxValue={3}
            step={1}
            marks={[0, 1, 2, 3]}
            value={effort}
            onChange={(value) => onEffort(Array.isArray(value) ? value[0] : value)}
            className="mt-2 [&_span.bottom-full]:hidden"
          />
          <div className="mt-2.5 flex justify-between text-xs text-muted-foreground">
            <span>Faster</span>
            <span>Smarter</span>
          </div>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}

export type Theme = "light" | "dark" | "ink";

export const themeNames: Record<Theme, string> = { light: "Light", dark: "Night", ink: "Dark" };
export const themeOrder: Theme[] = ["light", "dark", "ink"];
export const themeIcon: Record<Theme, "sun" | "moon" | "disc"> = { light: "sun", dark: "moon", ink: "disc" };

export function readTheme(): Theme {
  const list = document.documentElement.classList;
  if (!list.contains("dark")) return "light";
  return list.contains("ink") ? "ink" : "dark";
}

export function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function applyTheme(next: Theme) {
  const root = document.documentElement;
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);
  root.classList.toggle("dark", next !== "light");
  root.classList.toggle("ink", next === "ink");
  try {
    localStorage.setItem("miyuki-theme", next);
  } catch {}
  void getComputedStyle(root).opacity;
  requestAnimationFrame(() => freeze.remove());
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, readTheme, () => null);
}

export type ReasoningMode = "off" | "summary" | "full";

export interface AssistantSettings {
  language: string;
  sendWith: "enter" | "mod-enter";
  defaultMode: ModeId;
  askCommands: boolean;
  askOutside: boolean;
  allowedCommands: string[];
  reasoning: ReasoningMode;
  keepReasoningOpen: boolean;
  defaultModel: string;
  defaultEffort: number;
  autoCompact: boolean;
  compactAt: number;
  notes: Record<ProjectId, string>;
  runDesktop: boolean;
  runEmail: boolean;
  failDesktop: boolean;
  failEmail: boolean;
  weekly: boolean;
}

export const defaultSettings: AssistantSettings = {
  language: "en",
  sendWith: "enter",
  defaultMode: "agent",
  askCommands: true,
  askOutside: true,
  allowedCommands: ["pnpm test", "pnpm lint", "git status"],
  reasoning: "summary",
  keepReasoningOpen: false,
  defaultModel: "standard",
  defaultEffort: 1,
  autoCompact: true,
  compactAt: 85,
  notes: {
    "forecast-web":
      "Readings arrive at 05:00 and 17:00. Keep the station table sortable, and round snowfall to whole centimetres.",
    "bulletin-mailer": "The morning bulletin goes out at 05:30. Test every change in light and night.",
    "harbour-feed": "The harbour office feed can be late by up to 20 minutes after a storm.",
    "radar-tiles": "",
  },
  runDesktop: true,
  runEmail: false,
  failDesktop: true,
  failEmail: true,
  weekly: true,
};

export interface SettingsApi {
  settings: AssistantSettings;
  update: <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => void;
}

export const SettingsContext = createContext<SettingsApi>({ settings: defaultSettings, update: () => {} });

export function useSettings() {
  return useContext(SettingsContext);
}

export type LayerMotion = "up" | "forward" | "back";

export function ViewLayer({
  id,
  active,
  motion: direction,
  memory,
  onHidden,
  label,
  className,
  children,
}: {
  id: string;
  active: boolean;
  motion: LayerMotion;
  memory: Map<string, number>;
  onHidden: (id: string) => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const node = useRef<HTMLDivElement>(null);
  const near = reduce ? 0 : 1;
  const enterX = direction === "forward" ? 8 : direction === "back" ? -8 : 0;
  const enterY = direction === "up" ? 8 : 0;
  const leaveX = direction === "forward" ? -4 : direction === "back" ? 4 : 0;
  const leaveY = direction === "up" ? 4 : 0;

  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    el.scrollTop = memory.get(id) ?? 0;
    const save = () => {
      if (el.clientHeight > 0) memory.set(id, el.scrollTop);
    };
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, [id, memory]);

  return (
    <motion.section
      ref={node}
      aria-label={label}
      inert={!active}
      data-view-layer={id}
      initial={{ opacity: 0, x: enterX * near, y: enterY * near }}
      animate={
        active
          ? {
              opacity: 1,
              x: [enterX * near, 0],
              y: [enterY * near, 0],
              transition: {
                opacity: { duration: 0.12, delay: 0.07, ease: "easeOut" },
                x: { duration: 0.24, delay: 0.07, ease: EASE_OUT },
                y: { duration: 0.24, delay: 0.07, ease: EASE_OUT },
              },
            }
          : { opacity: 0, x: leaveX * near, y: leaveY * near, transition: { duration: 0.08, ease: "easeOut" } }
      }
      onAnimationComplete={() => {
        if (!active) onHidden(id);
      }}
      className={cn(
        "absolute inset-0 overflow-y-auto overscroll-contain [overflow-anchor:none] [scrollbar-gutter:stable] [scrollbar-width:thin]",
        "[mask-image:linear-gradient(to_bottom,transparent,#000_16px,#000_calc(100%-24px),transparent)]",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[52rem] flex-col px-1 pt-6 pb-12 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function BackButton({ label, onPress, className }: { label: string; onPress: () => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      iconStart={<ChevronLeft className="rtl:-scale-x-100" />}
      onPress={onPress}
      className={cn("-ms-2.5 self-start ps-1.5 text-muted-foreground data-[hovered]:text-foreground", className)}
    >
      {label}
    </Button>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { label: string; onPress: () => void };
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {back && <BackButton label={back.label} onPress={back.onPress} className="max-sm:hidden" />}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-[min(16rem,100%)] flex-1">
          <div className="flex items-center gap-3">
            <h1 className="min-w-0 text-2xl leading-8 font-semibold tracking-[-0.02em] text-balance text-foreground">
              {title}
            </h1>
            {aside}
          </div>
          {description != null && (
            <p className="mt-1 max-w-[38rem] text-sm leading-[22px] text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
        {actions != null && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function MetaDot() {
  return (
    <span aria-hidden="true" className="text-border-strong">
      ·
    </span>
  );
}

export function useFlash(ms = 1600) {
  const [key, setKey] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = useCallback(
    (next: string) => {
      setKey(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setKey(null), ms);
    },
    [ms],
  );
  return [key, flash] as const;
}

export function SavedNote({ show, className }: { show: boolean; className?: string }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1 text-xs leading-4 font-normal text-success-strong transition-opacity ease-settle",
        show ? "opacity-100 duration-150" : "opacity-0 duration-500",
        className,
      )}
    >
      {show ? (
        <>
          <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
          Saved
        </>
      ) : null}
    </span>
  );
}

export function useClock(running: boolean, every = 250) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, every);
    return () => window.clearInterval(id);
  }, [running, every]);
  return now;
}

export function Fade({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: show ? 0.16 : 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideTitle({ title, className }: { title: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-grid min-w-0 overflow-hidden align-bottom">
      <AnimatePresence initial={false}>
        <motion.span
          key={title}
          initial={{ opacity: 0, y: reduce ? 0 : "100%" }}
          animate={{
            opacity: 1,
            y: 0,
            transition: reduce ? { duration: 0.12, delay: 0.07 } : { duration: 0.24, ease: EASE_OUT },
          }}
          exit={{
            opacity: 0,
            y: reduce ? 0 : "-100%",
            transition: reduce ? { duration: 0.08 } : { duration: 0.24, ease: EASE_OUT },
          }}
          data-slide=""
          className={cn("col-start-1 row-start-1 truncate", className)}
        >
          {title}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
