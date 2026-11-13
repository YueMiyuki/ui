"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId, useState } from "react";
import { Tab, TabList, TabPanel, Tabs, type TabsProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface CardTab {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

export interface CardTabsProps
  extends Omit<TabsProps, "children" | "selectedKey" | "defaultSelectedKey" | "onSelectionChange" | "className"> {
  tabs: CardTab[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const PEEK = 16;
const SHRINK = 0.05;
const DEPTH = 3;
const VEIL = [0, 0.22, 0.4, 0.55];

export function CardTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  "aria-label": ariaLabel = "Panels",
  className,
  ...props
}: CardTabsProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [own, setOwn] = useState(() => defaultValue ?? tabs[0]?.value);
  const [order, setOrder] = useState<string[]>([]);
  const selected = value ?? own;

  const known = tabs.map((t) => t.value);
  let stack = order.filter((v) => known.includes(v));
  for (const v of known) if (!stack.includes(v)) stack.push(v);
  if (selected != null && stack[0] !== selected) stack = [selected, ...stack.filter((v) => v !== selected)];

  const move = reduce ? { duration: 0.15 } : SETTLE;

  return (
    <Tabs
      {...props}
      selectedKey={selected}
      onSelectionChange={(key) => {
        const next = String(key);
        setOrder([next, ...stack.filter((v) => v !== next)]);
        if (value === undefined) setOwn(next);
        onValueChange?.(next);
      }}
      className={cn("flex w-full flex-col items-center gap-6", className)}
    >
      <LayoutGroup id={id}>
        <TabList
          aria-label={ariaLabel}
          className="flex max-w-full shrink-0 overflow-x-auto rounded-full bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              id={tab.value}
              className={cn(
                "relative flex h-8 shrink-0 cursor-default items-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none select-none",
                "text-muted-foreground transition-[color,box-shadow] duration-150 ease-settle",
                "data-[hovered]:text-foreground data-[selected]:text-foreground",
                "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                "data-[disabled]:opacity-50",
              )}
            >
              {({ isSelected }) => (
                <>
                  {isSelected && (
                    <motion.span
                      layoutId="pill"
                      aria-hidden="true"
                      className="absolute inset-0 bg-card shadow-sm dark:bg-accent"
                      style={{ borderRadius: 999 }}
                      transition={reduce ? { duration: 0 } : SETTLE}
                    />
                  )}
                  <span className="relative z-10">{tab.title}</span>
                </>
              )}
            </Tab>
          ))}
        </TabList>
      </LayoutGroup>

      <div className="grid w-full" style={{ paddingTop: PEEK * Math.min(DEPTH, tabs.length - 1) }}>
        {tabs.map((tab) => {
          const depth = stack.indexOf(tab.value);
          const shown = Math.min(depth, DEPTH);
          return (
            <TabPanel
              key={tab.value}
              id={tab.value}
              shouldForceMount
              className="group/panel relative min-w-0 rounded-2xl outline-none [grid-area:1/1]"
              style={{ zIndex: tabs.length - depth }}
            >
              <motion.div
                initial={false}
                animate={{
                  y: -shown * PEEK,
                  scale: 1 - shown * SHRINK,
                  opacity: depth > DEPTH ? 0 : 1,
                }}
                transition={move}
                className={cn(
                  "relative h-full origin-top overflow-clip rounded-2xl bg-card shadow-lg will-change-transform",
                  "transition-shadow duration-150 group-data-[focus-visible]/panel:ring-[3px] group-data-[focus-visible]/panel:ring-ring",
                )}
              >
                {tab.content}
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{ opacity: VEIL[shown] }}
                  transition={move}
                  className="pointer-events-none absolute inset-0 bg-background"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-foreground/[0.07] ring-inset"
                />
              </motion.div>
            </TabPanel>
          );
        })}
      </div>
    </Tabs>
  );
}
