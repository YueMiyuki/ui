"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Tab as AriaTab,
  TabList as AriaTabList,
  type TabListProps as AriaTabListProps,
  TabPanel as AriaTabPanel,
  type TabPanelProps as AriaTabPanelProps,
  type TabProps as AriaTabProps,
  Tabs as AriaTabs,
  type TabsProps as AriaTabsProps,
  composeRenderProps,
  TabListStateContext,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type TabsVariant = "underline" | "pill";
type Orientation = "horizontal" | "vertical";

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const keyframes = `
@keyframes miyuki-tabs-in { from { opacity: 0; transform: translateY(4px); } }
@keyframes miyuki-tabs-fade { from { opacity: 0; } }
@property --miyuki-tabs-fade-left { syntax: "<length>"; inherits: false; initial-value: 0px; }
@property --miyuki-tabs-fade-right { syntax: "<length>"; inherits: false; initial-value: 0px; }
`;

const Context = createContext<{ variant: TabsVariant; orientation: Orientation; indicator: string }>({
  variant: "underline",
  orientation: "horizontal",
  indicator: "tabs-indicator",
});

export interface TabsProps extends AriaTabsProps {
  variant?: TabsVariant;
  ref?: Ref<HTMLDivElement>;
}

export function Tabs({ variant = "underline", orientation = "horizontal", className, children, ...props }: TabsProps) {
  const id = useId();
  return (
    <AriaTabs
      {...props}
      orientation={orientation}
      className={composeRenderProps(className, (cls) =>
        cn("flex min-w-0", orientation === "vertical" ? "flex-row gap-6" : "flex-col gap-4", cls),
      )}
    >
      {composeRenderProps(children, (content) => (
        <LayoutGroup id={id}>
          <style href="miyuki-tabs" precedence="miyuki">
            {keyframes}
          </style>
          <Context value={{ variant, orientation, indicator: `${id}-indicator` }}>{content}</Context>
        </LayoutGroup>
      ))}
    </AriaTabs>
  );
}

export interface TabListProps<T extends object = object> extends AriaTabListProps<T> {
  ref?: Ref<HTMLDivElement>;
}

export function TabList<T extends object>({ className, ref, ...props }: TabListProps<T>) {
  const { variant, orientation } = useContext(Context);
  const vertical = orientation === "vertical";
  const scrolls = variant === "underline" && !vertical;
  const selectedKey = useContext(TabListStateContext)?.selectedKey;
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const [edges, setEdges] = useState("");
  useImperativeHandle(ref, () => listRef.current as HTMLDivElement, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !scrolls) return;
    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      const x = list.scrollLeft;
      const rtl = getComputedStyle(list).direction === "rtl";
      const left = max > 1 && (rtl ? x > 1 - max : x > 1);
      const right = max > 1 && (rtl ? x < -1 : x < max - 1);
      setEdges(`${max > 1 ? "o" : ""}${left ? "l" : ""}${right ? "r" : ""}`);
    };
    list.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(list);
    for (const child of list.children) ro.observe(child);
    return () => {
      list.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrolls]);

  useEffect(() => {
    if (!scrolls) return;
    // A frame later, so React Aria's focus-without-scrolling on press does not undo it.
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      const tab = list?.querySelector<HTMLElement>('[role="tab"][data-selected]');
      if (!list || !tab) return;
      const box = list.getBoundingClientRect();
      const rect = tab.getBoundingClientRect();
      const scale = list.offsetWidth ? box.width / list.offsetWidth : 1;
      const room = 32 * scale;
      let delta = 0;
      if (rect.left < box.left + room) delta = (rect.left - box.left - room) / scale;
      else if (rect.right > box.right - room) delta = (rect.right - box.right + room) / scale;
      if (Math.abs(delta) > 0.5)
        list.scrollBy({ left: delta, behavior: placed.current && !reduce ? "smooth" : "auto" });
      placed.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [scrolls, selectedKey, reduce]);

  return (
    <AriaTabList
      {...props}
      ref={listRef}
      data-overflow={edges.includes("o") || undefined}
      data-fade-left={edges.includes("l") || undefined}
      data-fade-right={edges.includes("r") || undefined}
      className={composeRenderProps(className, (cls) =>
        cn(
          "flex shrink-0",
          variant === "underline" &&
            (vertical
              ? "flex-col gap-0.5 border-e border-border"
              : cn(
                  "-mx-3 gap-6 overflow-x-auto scroll-px-8 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  "bg-[linear-gradient(var(--border),var(--border))] bg-[length:calc(100%-24px)_1px] bg-[position:12px_100%] bg-no-repeat",
                  "transition-[--miyuki-tabs-fade-left,--miyuki-tabs-fade-right] duration-200 ease-settle",
                  "data-[overflow]:[mask-image:linear-gradient(to_right,transparent,#000_var(--miyuki-tabs-fade-left),#000_calc(100%-var(--miyuki-tabs-fade-right)),transparent)]",
                  "data-[fade-left]:[--miyuki-tabs-fade-left:2rem] data-[fade-right]:[--miyuki-tabs-fade-right:2rem]",
                )),
          variant === "pill" &&
            (vertical
              ? "flex-col gap-0.5 self-start rounded-lg bg-muted p-0.5"
              : "max-w-full self-start rounded-lg bg-muted p-0.5"),
          cls,
        ),
      )}
    />
  );
}

export interface TabProps extends Omit<AriaTabProps, "children"> {
  children?: ReactNode;
  count?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Tab({ count, className, children, ...props }: TabProps) {
  const { variant, orientation, indicator } = useContext(Context);
  const reduce = useReducedMotion();
  const vertical = orientation === "vertical";
  const underline = variant === "underline";

  return (
    <AriaTab
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/tab relative flex shrink-0 cursor-default items-center gap-2 text-sm font-medium whitespace-nowrap outline-none select-none",
          "text-muted-foreground transition-[color,box-shadow] duration-150 ease-settle",
          "data-[hovered]:text-foreground data-[selected]:text-foreground",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          underline
            ? cn(
                "after:pointer-events-none after:absolute after:inset-y-1.5 after:rounded-md after:transition-shadow after:duration-150",
                "data-[focus-visible]:after:ring-[3px] data-[focus-visible]:after:ring-ring",
                vertical ? "h-9 ps-0 pe-5 after:-start-2 after:end-2" : "h-10 after:-inset-x-2",
              )
            : cn(
                "rounded-md data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                vertical ? "h-8 px-3" : "h-8 justify-center px-3",
              ),
          cls,
        ),
      )}
    >
      {({ isSelected }) => (
        <>
          {isSelected &&
            (underline ? (
              <motion.span
                layoutId={indicator}
                aria-hidden="true"
                className={cn("absolute bg-brand", vertical ? "inset-y-1.5 -end-px w-0.5" : "inset-x-0 bottom-0 h-0.5")}
                style={{ borderRadius: 1 }}
                transition={reduce ? { duration: 0 } : SETTLE}
              />
            ) : (
              <motion.span
                layoutId={indicator}
                aria-hidden="true"
                className="absolute inset-0 bg-card shadow-sm dark:bg-accent"
                style={{ borderRadius: 8 }}
                transition={reduce ? { duration: 0 } : SETTLE}
              />
            ))}
          <span className="relative z-10 inline-flex min-w-0 items-center gap-2">
            {children}
            {count != null && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
                  "bg-foreground/[0.06] text-muted-foreground transition-colors duration-150",
                  "group-data-[selected]/tab:text-foreground",
                )}
              >
                {count}
              </span>
            )}
          </span>
        </>
      )}
    </AriaTab>
  );
}

export interface TabPanelProps extends AriaTabPanelProps {
  ref?: Ref<HTMLDivElement>;
}

export function TabPanel({ className, ...props }: TabPanelProps) {
  return (
    <AriaTabPanel
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "min-w-0 flex-1 rounded-lg text-sm text-foreground outline-none",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[entering]:animate-[miyuki-tabs-in_240ms_cubic-bezier(0.22,1,0.36,1)]",
          "motion-reduce:data-[entering]:animate-[miyuki-tabs-fade_120ms_ease-out]",
          cls,
        ),
      )}
    />
  );
}
