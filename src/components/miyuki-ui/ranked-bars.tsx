"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import {
  ChartCard,
  type ChartCardProps,
  chartColors,
  chartMotion,
  formatNumber,
  formatPercent,
  staggerDelay,
  textWidth,
  useChartSize,
  useInViewOnce,
} from "@/components/miyuki-ui/lib/chart";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { cn } from "@/lib/utils";

export interface RankedBarsItem {
  name: string;
  value: number;
  icon?: ReactNode;
}

export interface RankedBarsGroup {
  id: string;
  name: string;
  data: RankedBarsItem[];
}

export interface RankedBarsProps extends Omit<ChartCardProps, "children"> {
  data?: RankedBarsItem[];
  groups?: RankedBarsGroup[];
  selectedGroup?: string;
  defaultSelectedGroup?: string;
  onGroupChange?: (id: string) => void;
  limit?: number;
  color?: string;
  format?: (value: number) => string;
  formatShare?: (share: number) => string;
  showAllLabel?: string;
  showLessLabel?: string;
}

const ROW = 32;
const GAP = 6;
const FADE = 26;
const BUTTON = 40;

const TINT = "color-mix(in oklab, var(--miyuki-ranked-bars-color) var(--miyuki-ranked-bars-mix), var(--card))";

const listHeight = (rows: number) => Math.max(0, rows * ROW + (rows - 1) * GAP);

interface RowsProps {
  items: RankedBarsItem[];
  name: string;
  limit: number;
  color: string;
  format: (value: number) => string;
  formatShare: (share: number) => string;
  showAllLabel: string;
  showLessLabel: string;
}

function BarRows({ items, name, limit, color, format, formatShare, showAllLabel, showLessLabel }: RowsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInViewOnce(ref, { threshold: 0.2 });
  const reduce = useReducedMotion();
  const listId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const { width: trackW } = useChartSize(trackRef);
  const [expanded, setExpanded] = useState(false);

  const n = items.length;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const largest = Math.max(0, ...items.map((item) => item.value));
  const folds = n > limit;
  const open = expanded || !folds;
  const height = listHeight(open ? n : limit);
  const shown = (play || reduce) && n > 0;
  const fold = reduce ? { duration: 0.12 } : chartMotion.settle;

  return (
    <div ref={ref}>
      <motion.div
        className="overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%-var(--miyuki-ranked-bars-fade)),rgb(0_0_0/0.12))]"
        initial={false}
        animate={{ height, "--miyuki-ranked-bars-fade": `${open ? 0 : FADE}px` } as Record<string, string | number>}
        transition={fold}
        style={{ height, "--miyuki-ranked-bars-fade": `${open ? 0 : FADE}px` } as CSSProperties}
      >
        <ol
          id={listId}
          aria-label={name}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3"
          style={{ rowGap: GAP, "--miyuki-ranked-bars-color": color } as CSSProperties}
        >
          {items.map((item, i) => {
            const share = total > 0 ? item.value / total : 0;
            const length = largest > 0 ? (item.value / largest) * 100 : 0;
            const labelEnd = 10 + (item.icon != null ? 22 : 0) + textWidth(item.name, 13);
            const edge = trackW > 0 && (length / 100) * trackW >= labelEnd + 10;
            return (
              <li
                key={`${item.name}-${i}`}
                inert={!open && i >= limit}
                className="col-span-3 grid grid-cols-subgrid items-center text-[13px] leading-5 [--miyuki-ranked-bars-mix:20%] hover:[--miyuki-ranked-bars-mix:32%]"
                style={{ height: ROW }}
              >
                <div ref={i === 0 ? trackRef : undefined} className="relative h-full min-w-0">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 overflow-hidden rounded-md transition-[background-color] duration-150 ease-settle"
                    style={{ width: `${length}%`, minWidth: item.value > 0 ? 8 : 0, backgroundColor: TINT }}
                    initial={reduce ? false : { clipPath: "inset(0 100% 0 0 round 8px)" }}
                    animate={{ clipPath: shown ? "inset(0 0% 0 0 round 8px)" : "inset(0 100% 0 0 round 8px)" }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { ...chartMotion.reveal, duration: 0.7, delay: staggerDelay(i, Math.min(n, limit)) }
                    }
                  >
                    {edge && <span className="absolute inset-y-0 right-0 w-0.5 bg-(--miyuki-ranked-bars-color)" />}
                  </motion.div>
                  <div className="relative flex h-full min-w-0 items-center gap-2 px-2.5 text-foreground">
                    {item.icon != null && (
                      <span aria-hidden="true" className="flex shrink-0 text-muted-foreground [&_svg]:size-3.5">
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>
                </div>
                <span className="text-right text-muted-foreground tabular-nums">{format(item.value)}</span>
                <span className="min-w-9 text-right font-medium text-foreground tabular-nums">
                  {formatShare(share)}
                </span>
              </li>
            );
          })}
        </ol>
      </motion.div>
      {folds && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={listId}
            onPress={() => setExpanded((value) => !value)}
            className="h-7 px-2.5 text-[13px] text-muted-foreground data-[hovered]:text-foreground"
            iconEnd={
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-200 ease-settle motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            }
          >
            {expanded ? showLessLabel : showAllLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function RankedBars({
  data,
  groups,
  selectedGroup,
  defaultSelectedGroup,
  onGroupChange,
  limit = 5,
  color = chartColors[0],
  format = (v) => formatNumber(v),
  formatShare = (v) => formatPercent(v, { digits: 0 }),
  showAllLabel = "Show all",
  showLessLabel = "Show less",
  label,
  ...props
}: RankedBarsProps) {
  const name = typeof label === "string" ? label : "Breakdown";
  const rows = {
    limit: Math.max(1, limit),
    color,
    format,
    formatShare,
    showAllLabel,
    showLessLabel,
  };

  if (!groups || groups.length === 0) {
    return (
      <ChartCard label={label} {...props}>
        <BarRows items={data ?? []} name={name} {...rows} />
      </ChartCard>
    );
  }

  const tallest = Math.max(
    ...groups.map((g) => listHeight(Math.min(g.data.length, rows.limit)) + (g.data.length > rows.limit ? BUTTON : 0)),
  );

  return (
    <ChartCard label={label} {...props}>
      <Tabs
        selectedKey={selectedGroup}
        defaultSelectedKey={defaultSelectedGroup ?? groups[0].id}
        onSelectionChange={(key) => onGroupChange?.(String(key))}
      >
        <TabList aria-label={`${name} breakdown`}>
          {groups.map((g) => (
            <Tab key={g.id} id={g.id}>
              {g.name}
            </Tab>
          ))}
        </TabList>
        {groups.map((g) => (
          <TabPanel
            key={g.id}
            id={g.id}
            className="data-[focus-visible]:ring-offset-4 data-[focus-visible]:ring-offset-card"
            style={{ minHeight: tallest }}
          >
            <BarRows items={g.data} name={`${name} by ${g.name.toLowerCase()}`} {...rows} />
          </TabPanel>
        ))}
      </Tabs>
    </ChartCard>
  );
}
