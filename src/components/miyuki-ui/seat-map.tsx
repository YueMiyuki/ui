"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "react-aria-components";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export type SeatKind = "window" | "middle" | "aisle";

export interface SeatMapCar {
  id: string;
  rows: number;
  layout?: string;
  taken?: readonly string[];
  price?: number;
  name?: string;
}

export interface SeatMapProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  cars: readonly SeatMapCar[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  max?: number;
  car?: string;
  defaultCar?: string;
  onCarChange?: (car: string) => void;
  towards?: string;
  currency?: string;
  label?: string;
}

const SEAT = 30;
const DEPTH = 30;
const PITCH = 40;
const PAIR = 2;
const AISLE = 30;
const WALL = 7;
const INSET = 5;
const GANGWAY = 10;
const NOSE = 46;
const VEST = 58;
const PART = 3;
const RACK = 30;
const GAP = 18;
const TOP = 22;
const BELOW = 10;
const EDGE = 4;
const END = VEST + PART + RACK + GAP;
const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";

const kindName: Record<SeatKind, string> = { window: "window", middle: "middle", aisle: "aisle" };

interface Lane {
  letter: string;
  v: number;
  kind: SeatKind;
}

interface Plan {
  width: number;
  height: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cabStart: boolean;
  cabEnd: boolean;
  lanes: Lane[];
  groups: { from: number; to: number }[];
  rows: number[];
}

function buildPlan(car: SeatMapCar, index: number, count: number): Plan {
  const groups = (car.layout ?? "AB CD")
    .trim()
    .split(/\s+/)
    .map((g) => g.split(""));
  const lanes: Lane[] = [];
  const extents: { from: number; to: number }[] = [];
  let v = WALL + INSET;
  groups.forEach((group, gi) => {
    const from = v;
    group.forEach((letter, li) => {
      const outer = (gi === 0 && li === 0) || (gi === groups.length - 1 && li === group.length - 1);
      const byAisle = (li === group.length - 1 && gi < groups.length - 1) || (li === 0 && gi > 0);
      lanes.push({ letter, v, kind: outer ? "window" : byAisle ? "aisle" : "middle" });
      v += SEAT + PAIR;
    });
    extents.push({ from, to: v - PAIR });
    v += AISLE - PAIR;
  });
  const h = extents[extents.length - 1].to + INSET + WALL;
  const cabStart = index === 0;
  const cabEnd = index === count - 1;
  const w = END * 2 + car.rows * PITCH;
  const x = EDGE + (cabStart ? NOSE : GANGWAY);
  const rows = Array.from({ length: car.rows }, (_, i) => x + END + i * PITCH + (PITCH - DEPTH) / 2);
  return {
    width: x + w + (cabEnd ? NOSE : GANGWAY) + EDGE,
    height: TOP + h + BELOW,
    x,
    y: TOP,
    w,
    h,
    cabStart,
    cabEnd,
    lanes,
    groups: extents,
    rows,
  };
}

function bodyPath({ x, y, w, h, cabStart, cabEnd }: Plan) {
  const r = 12;
  const x1 = x + w;
  let d = `M${cabStart ? x : x + r} ${y}H${cabEnd ? x1 : x1 - r}`;
  d += cabEnd
    ? `C${x1 + NOSE * 0.62} ${y} ${x1 + NOSE} ${y + h * 0.22} ${x1 + NOSE} ${y + h / 2}C${x1 + NOSE} ${y + h * 0.78} ${x1 + NOSE * 0.62} ${y + h} ${x1} ${y + h}`
    : `Q${x1} ${y} ${x1} ${y + r}V${y + h - r}Q${x1} ${y + h} ${x1 - r} ${y + h}`;
  d += `H${cabStart ? x : x + r}`;
  d += cabStart
    ? `C${x - NOSE * 0.62} ${y + h} ${x - NOSE} ${y + h * 0.78} ${x - NOSE} ${y + h / 2}C${x - NOSE} ${y + h * 0.22} ${x - NOSE * 0.62} ${y} ${x} ${y}`
    : `Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}`;
  return `${d}Z`;
}

function cabPath(plan: Plan, end: boolean) {
  const { y, h } = plan;
  const base = end ? plan.x + plan.w : plan.x;
  const s = end ? 1 : -1;
  const n = NOSE - WALL;
  const top = y + WALL;
  const bottom = y + h - WALL;
  const mid = y + h / 2;
  return `M${base} ${top}C${base + s * n * 0.6} ${top} ${base + s * n} ${y + h * 0.27} ${base + s * n} ${mid}C${base + s * n} ${y + h * 0.73} ${base + s * n * 0.6} ${bottom} ${base} ${bottom}Z`;
}

function glassPath(plan: Plan, end: boolean) {
  const { y, h } = plan;
  const base = end ? plan.x + plan.w : plan.x;
  const s = end ? 1 : -1;
  const n = NOSE - 3.5;
  return `M${base + s * n * 0.72} ${y + h * 0.1}C${base + s * n * 0.93} ${y + h * 0.22} ${base + s * n} ${y + h * 0.36} ${base + s * n} ${y + h / 2}C${base + s * n} ${y + h * 0.64} ${base + s * n * 0.93} ${y + h * 0.78} ${base + s * n * 0.72} ${y + h * 0.9}`;
}

function CarBody({ plan }: { plan: Plan }) {
  const { x, y, w, h, groups, rows } = plan;
  const x1 = x + w;
  const aisles = groups.slice(1).map((g, i) => ({ from: groups[i].to, to: g.from }));
  const partitionSegments = () => {
    const out: { from: number; to: number }[] = [];
    let at = WALL;
    for (const a of aisles) {
      out.push({ from: at, to: a.from + 4 });
      at = a.to - 4;
    }
    out.push({ from: at, to: h - WALL });
    return out;
  };
  const partitions = [x + VEST, x1 - VEST - PART];
  const doors = [x + VEST / 2, x1 - VEST / 2];
  const racks = [x + VEST + PART + 3, x1 - VEST - PART - RACK + 3];

  return (
    <svg
      aria-hidden="true"
      width={plan.width}
      height={plan.height}
      viewBox={`0 0 ${plan.width} ${plan.height}`}
      className="absolute inset-0 overflow-visible"
    >
      {!plan.cabStart && (
        <g>
          <rect
            x={x - GANGWAY - 1}
            y={y + h / 2 - 19}
            width={GANGWAY + 4}
            height={38}
            rx={3}
            fill="var(--muted)"
            stroke="var(--border-strong)"
          />
          <path d={`M${x - 7} ${y + h / 2 - 15}v30M${x - 3.5} ${y + h / 2 - 15}v30`} stroke="var(--border-strong)" />
        </g>
      )}
      {!plan.cabEnd && (
        <g>
          <rect
            x={x1 - 3}
            y={y + h / 2 - 19}
            width={GANGWAY + 4}
            height={38}
            rx={3}
            fill="var(--muted)"
            stroke="var(--border-strong)"
          />
          <path d={`M${x1 + 3.5} ${y + h / 2 - 15}v30M${x1 + 7} ${y + h / 2 - 15}v30`} stroke="var(--border-strong)" />
        </g>
      )}
      {doors.map((dx) => (
        <g key={`step-${dx}`} fill="var(--border-strong)">
          <rect x={dx - 16} y={y - 5} width={32} height={4} rx={1.5} />
          <rect x={dx - 16} y={y + h + 1} width={32} height={4} rx={1.5} />
        </g>
      ))}
      <path d={bodyPath(plan)} fill="var(--card)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <rect
        x={x + WALL}
        y={y + WALL}
        width={w - WALL * 2}
        height={h - WALL * 2}
        rx={4}
        fill="var(--muted)"
        stroke="var(--border)"
      />
      {plan.cabStart && (
        <g>
          <path d={cabPath(plan, false)} fill="var(--muted)" stroke="var(--border)" />
          <path
            d={glassPath(plan, false)}
            fill="none"
            stroke="var(--brand)"
            strokeOpacity={0.5}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <rect x={x - 1.5} y={y + WALL} width={3} height={h - WALL * 2} fill="var(--border-strong)" />
        </g>
      )}
      {plan.cabEnd && (
        <g>
          <path d={cabPath(plan, true)} fill="var(--muted)" stroke="var(--border)" />
          <path
            d={glassPath(plan, true)}
            fill="none"
            stroke="var(--brand)"
            strokeOpacity={0.5}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <rect x={x1 - 1.5} y={y + WALL} width={3} height={h - WALL * 2} fill="var(--border-strong)" />
        </g>
      )}
      <g fill="var(--brand)" fillOpacity={0.42}>
        {rows.map((u) => (
          <g key={u}>
            <rect x={u + 1} y={y + 2} width={DEPTH - 2} height={WALL - 4} rx={1} />
            <rect x={u + 1} y={y + h - WALL + 2} width={DEPTH - 2} height={WALL - 4} rx={1} />
          </g>
        ))}
      </g>
      {[x + WALL, x1 - VEST].map((vx) => (
        <rect
          key={`vest-${vx}`}
          x={vx}
          y={y + WALL}
          width={VEST - WALL}
          height={h - WALL * 2}
          rx={3}
          fill="var(--border)"
          fillOpacity={0.5}
        />
      ))}
      {doors.map((dx) => (
        <g key={`door-${dx}`}>
          <rect x={dx - 18} y={y - 1} width={36} height={WALL + 1} fill="var(--muted)" />
          <rect x={dx - 18} y={y + h - WALL} width={36} height={WALL + 1} fill="var(--muted)" />
          <g fill="var(--muted-foreground)" fillOpacity={0.8}>
            <rect x={dx - 17} y={y + 1} width={16.25} height={3.5} rx={1} />
            <rect x={dx + 0.75} y={y + 1} width={16.25} height={3.5} rx={1} />
            <rect x={dx - 17} y={y + h - 4.5} width={16.25} height={3.5} rx={1} />
            <rect x={dx + 0.75} y={y + h - 4.5} width={16.25} height={3.5} rx={1} />
          </g>
          <g fill="var(--brand)" fillOpacity={0.55}>
            <rect x={dx - 12} y={y + 2} width={6} height={1.5} rx={0.75} />
            <rect x={dx + 6} y={y + 2} width={6} height={1.5} rx={0.75} />
            <rect x={dx - 12} y={y + h - 3.5} width={6} height={1.5} rx={0.75} />
            <rect x={dx + 6} y={y + h - 3.5} width={6} height={1.5} rx={0.75} />
          </g>
        </g>
      ))}
      {partitions.map((px) => (
        <g key={`partition-${px}`}>
          {partitionSegments().map((s) => (
            <rect key={s.from} x={px} y={y + s.from} width={PART} height={s.to - s.from} fill="var(--border-strong)" />
          ))}
          {aisles.map((a) => (
            <rect
              key={a.from}
              x={px === partitions[0] ? px + PART + 1 : px - 3}
              y={y + a.from + 4}
              width={2}
              height={(a.to - a.from) / 2 - 4}
              rx={1}
              fill="var(--border-strong)"
              fillOpacity={0.7}
            />
          ))}
        </g>
      ))}
      {racks.map((rx) =>
        groups.map((g) => (
          <g key={`rack-${rx}-${g.from}`}>
            <rect
              x={rx}
              y={y + g.from + 1}
              width={RACK - 6}
              height={g.to - g.from - 2}
              rx={3}
              fill="var(--card)"
              stroke="var(--border-strong)"
            />
            <path
              d={Array.from(
                { length: 4 },
                (_, i) => `M${rx + 3} ${y + g.from + 8 + i * ((g.to - g.from - 16) / 3)}h${RACK - 12}`,
              ).join("")}
              stroke="var(--border-strong)"
              strokeLinecap="round"
            />
          </g>
        )),
      )}
    </svg>
  );
}

const transposeCls = "@max-[50rem]:[transform:matrix(0,1,1,0,0,0)]";

function seatLabel(row: number, lane: Lane) {
  return `${row}${lane.letter}, ${kindName[lane.kind]}`;
}

function TrainGlyph({ first, last }: { first: boolean; last: boolean }) {
  const d = first
    ? "M14 1H42Q45 1 45 4V16Q45 19 42 19H14C6 19 1 15 1 10C1 5 6 1 14 1Z"
    : last
      ? "M4 1H32C40 1 45 5 45 10C45 15 40 19 32 19H4Q1 19 1 16V4Q1 1 4 1Z"
      : "M4 1H42Q45 1 45 4V16Q45 19 42 19H4Q1 19 1 16V4Q1 1 4 1Z";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 46 20"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <path
        d={d}
        className="fill-(--car-fill) stroke-(--car-stroke) transition-[fill,stroke] duration-200"
        strokeWidth={1.25}
      />
      {first && (
        <path
          d="M6 7.5Q8.5 4.6 12 4.4"
          className="stroke-(--car-glass)"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {last && (
        <path
          d="M40 7.5Q37.5 4.6 34 4.4"
          className="stroke-(--car-glass)"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

function SeatGlyph({ state, className }: { state: "free" | "taken" | "chosen"; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex h-4 w-4 shrink-0 gap-px", className)}>
      <span
        className={cn(
          "w-1 rounded-l-[3px]",
          state === "free" && "bg-border-strong",
          state === "taken" && "bg-border",
          state === "chosen" && "bg-brand-strong dark:bg-brand/60",
        )}
      />
      <span
        className={cn(
          "flex-1 rounded-[3px]",
          state === "free" && "bg-card ring-1 ring-border-strong ring-inset dark:bg-accent",
          state === "taken" &&
            "bg-border bg-[repeating-linear-gradient(135deg,var(--miyuki-seat-map-hatch)_0_1px,transparent_1px_3.5px)] [--miyuki-seat-map-hatch:var(--border-strong)] dark:bg-card dark:ring-1 dark:ring-border dark:ring-inset dark:[--miyuki-seat-map-hatch:var(--border-strong)]",
          state === "chosen" && "bg-brand",
        )}
      />
    </span>
  );
}

function useControlled<T>(value: T | undefined, fallback: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(fallback);
  const current = value !== undefined ? value : inner;
  const set = (next: T) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

export function SeatMap({
  cars,
  value,
  defaultValue,
  onChange,
  max = 4,
  car,
  defaultCar,
  onCarChange,
  towards,
  currency = "JPY",
  label = "Choose seats",
  className,
  ...props
}: SeatMapProps) {
  const id = useId();
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  const [selected, setSelected] = useControlled<readonly string[]>(value, defaultValue ?? [], (next) =>
    onChange?.([...next]),
  );
  const [carId, setCarId] = useControlled(car, defaultCar ?? cars[0]?.id ?? "", onCarChange);
  const index = Math.max(
    0,
    cars.findIndex((c) => c.id === carId),
  );
  const current = cars[index];
  const plan = useMemo(() => buildPlan(current, index, cars.length), [current, index, cars.length]);
  const taken = useMemo(() => new Set(current.taken ?? []), [current]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [hint, setHint] = useState<{ key: string; x: number; y: number; below: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const previousIndex = useRef(index);

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );

  const seatKey = (row: number, letter: string) => `${current.id}-${row}${letter}`;
  const firstFree = () => {
    for (let r = 1; r <= current.rows; r++)
      for (const lane of plan.lanes) if (!taken.has(`${r}${lane.letter}`)) return seatKey(r, lane.letter);
    return seatKey(1, plan.lanes[0].letter);
  };
  const inCar = (key: string | null) => key?.startsWith(`${current.id}-`);
  const tabKey = inCar(focusKey) ? focusKey! : (selected.find((k) => inCar(k)) ?? firstFree());

  useLayoutEffect(() => {
    const before = previousIndex.current;
    previousIndex.current = index;
    if (before === index || !boxRef.current) return;
    const dir = index > before ? 1 : -1;
    const anim = boxRef.current.animate(
      reduce
        ? [{ opacity: 0.4 }, { opacity: 1 }]
        : [
            { opacity: 0, translate: `${dir * 28}px 0` },
            { opacity: 1, translate: "0 0" },
          ],
      { duration: reduce ? 120 : 280, easing: SETTLE },
    );
    return () => anim.cancel();
  }, [index, reduce]);

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    layerRef.current?.querySelector<HTMLElement>(`[data-seat="${key}"]`)?.focus();
  });

  const goToCar = (next: number, keepFocus?: { row: number; letter: string }) => {
    const target = cars[Math.max(0, Math.min(cars.length - 1, next))];
    if (!target || target.id === current.id) return;
    setHint(null);
    if (keepFocus) {
      const row = Math.min(keepFocus.row, target.rows);
      const letters = (target.layout ?? "AB CD").replace(/\s+/g, "");
      const letter = letters.includes(keepFocus.letter) ? keepFocus.letter : letters[0];
      const key = `${target.id}-${row}${letter}`;
      setFocusKey(key);
      pendingFocus.current = key;
    }
    setCarId(target.id);
  };

  const toggle = (row: number, lane: Lane) => {
    const code = `${row}${lane.letter}`;
    if (taken.has(code)) return;
    const key = seatKey(row, lane.letter);
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
      setNotice(`${code} removed.`);
      return;
    }
    if (selected.length >= max) {
      setNotice(`You can choose up to ${max} seats. Remove one to choose another.`);
      return;
    }
    setSelected([...selected, key]);
    setNotice(`${code} chosen.`);
  };

  const showHint = (el: HTMLElement, key: string) => {
    const root = rootRef.current;
    if (!root) return;
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const below = a.top - b.top < 40;
    setHint({ key, x: a.left - b.left + a.width / 2, y: below ? a.bottom - b.top + 6 : a.top - b.top - 6, below });
  };

  const onSeatKey = (event: KeyboardEvent<HTMLDivElement>, row: number, li: number) => {
    const vertical = layerRef.current ? getComputedStyle(layerRef.current).transform !== "none" : false;
    const lanes = plan.lanes;
    let r = row;
    let l = li;
    switch (event.key) {
      case "ArrowRight":
        if (vertical) l += 1;
        else r += 1;
        break;
      case "ArrowLeft":
        if (vertical) l -= 1;
        else r -= 1;
        break;
      case "ArrowDown":
        if (vertical) r += 1;
        else l += 1;
        break;
      case "ArrowUp":
        if (vertical) r -= 1;
        else l -= 1;
        break;
      case "Home":
        if (event.ctrlKey || event.metaKey) r = 1;
        l = 0;
        break;
      case "End":
        if (event.ctrlKey || event.metaKey) r = current.rows;
        l = lanes.length - 1;
        break;
      case "PageDown":
      case "PageUp":
        event.preventDefault();
        goToCar(index + (event.key === "PageDown" ? 1 : -1), { row, letter: lanes[li].letter });
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        toggle(row, lanes[li]);
        return;
      default:
        return;
    }
    event.preventDefault();
    r = Math.max(1, Math.min(current.rows, r));
    l = Math.max(0, Math.min(lanes.length - 1, l));
    const key = seatKey(r, lanes[l].letter);
    setFocusKey(key);
    const el = layerRef.current?.querySelector<HTMLElement>(`[data-seat="${key}"]`);
    el?.focus();
  };

  const chosen = selected.map((key) => {
    const dash = key.lastIndexOf("-");
    const carKey = key.slice(0, dash);
    const code = key.slice(dash + 1);
    const c = cars.find((x) => x.id === carKey);
    const letter = code.replace(/^\d+/, "");
    const p = c ? buildPlan(c, cars.indexOf(c), cars.length) : null;
    const lane = p?.lanes.find((x) => x.letter === letter);
    return { key, car: c, code, kind: lane?.kind ?? "aisle", price: c?.price ?? 0 };
  });
  const total = chosen.reduce((sum, s) => sum + s.price, 0);
  const freeCount = (c: SeatMapCar) =>
    c.rows * (c.layout ?? "AB CD").replace(/\s+/g, "").length - (c.taken?.length ?? 0);
  const hinted = hint?.key.startsWith(`${current.id}-`) ? hint : null;
  const hintedCode = hinted ? hinted.key.slice(hinted.key.lastIndexOf("-") + 1) : "";
  const hintedLane = hinted ? plan.lanes.find((l) => l.letter === hintedCode.replace(/^\d+/, "")) : undefined;

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn("@container relative flex w-full max-w-[880px] flex-col gap-5 text-foreground", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={`${id}-label`} className="text-sm font-medium">
            {label}
          </span>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            Car {current.id}
            {current.name ? ` · ${current.name}` : ""} · {freeCount(current)} of {current.rows * plan.lanes.length} free
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label="Previous car"
            variant="ghost"
            size="sm"
            isDisabled={index === 0}
            onPress={() => goToCar(index - 1)}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </IconButton>
          <div role="group" aria-label="Cars" className="flex items-center gap-[3px]">
            {cars.map((c, i) => {
              const active = i === index;
              const count = selected.filter((k) => k.startsWith(`${c.id}-`)).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  aria-label={`Car ${c.id}, ${freeCount(c)} seats free${count ? `, ${count} chosen` : ""}`}
                  onClick={() => goToCar(i)}
                  className={cn(
                    "group/car relative flex h-5 w-[46px] cursor-default @max-[26rem]:w-9 items-center justify-center rounded-md outline-none",
                    "focus-visible:ring-[3px] focus-visible:ring-ring",
                    active
                      ? "[--car-fill:var(--primary)] [--car-glass:var(--primary-foreground)] [--car-stroke:var(--primary)]"
                      : "[--car-fill:var(--card)] [--car-glass:var(--brand)] [--car-stroke:var(--border-strong)] hover:[--car-fill:var(--accent)]",
                  )}
                >
                  <TrainGlyph first={i === 0} last={i === cars.length - 1} />
                  <span
                    className={cn(
                      "relative text-[11px] leading-none font-medium tabular-nums",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover/car:text-foreground",
                    )}
                  >
                    {c.id}
                  </span>
                  {count > 0 && (
                    <span className="absolute -top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand ring-2 ring-background" />
                  )}
                </button>
              );
            })}
          </div>
          <IconButton
            aria-label="Next car"
            variant="ghost"
            size="sm"
            isDisabled={index === cars.length - 1}
            onPress={() => goToCar(index + 1)}
          >
            <ChevronRight className="rtl:rotate-180" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {towards && (
          <div className="flex items-center gap-2 self-stretch text-xs text-muted-foreground @max-[50rem]:justify-center">
            <span className="h-px flex-1 bg-border @max-[50rem]:hidden" />
            <span>Towards {towards}</span>
            <ChevronRight aria-hidden="true" className="size-3.5 @max-[50rem]:rotate-90" />
          </div>
        )}
        <div
          ref={boxRef}
          className="relative h-(--plan-h) w-(--plan-w) @max-[50rem]:h-(--plan-w) @max-[50rem]:w-(--plan-h)"
          style={{ "--plan-w": `${plan.width}px`, "--plan-h": `${plan.height}px` } as CSSProperties}
        >
          <div
            ref={layerRef}
            className={cn("absolute top-0 left-0 origin-top-left", transposeCls)}
            style={{ width: plan.width, height: plan.height }}
          >
            <CarBody plan={plan} />
            {plan.rows.map((u, i) => (
              <span
                key={u}
                aria-hidden="true"
                className={cn(
                  "absolute flex h-3 w-6 -translate-x-1/2 items-center justify-center text-[11px] leading-none text-muted-foreground tabular-nums",
                  transposeCls,
                )}
                style={{ left: u + DEPTH / 2, top: TOP - 17 }}
              >
                {i + 1}
              </span>
            ))}
            {[plan.x + END - GAP / 2, plan.x + plan.w - END + GAP / 2].map((u) =>
              plan.lanes.map((lane) => (
                <span
                  key={`${u}-${lane.letter}`}
                  aria-hidden="true"
                  className={cn(
                    "absolute flex size-4 -translate-1/2 items-center justify-center text-[11px] leading-none font-medium text-muted-foreground",
                    transposeCls,
                  )}
                  style={{ left: u, top: plan.y + lane.v + SEAT / 2 }}
                >
                  {lane.letter}
                </span>
              )),
            )}
            <div
              role="grid"
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-car`}
              aria-multiselectable="true"
              aria-rowcount={current.rows}
              aria-colcount={plan.lanes.length}
            >
              {plan.rows.map((u, ri) => {
                const row = ri + 1;
                return (
                  <div key={row} role="row" aria-rowindex={row}>
                    {plan.lanes.map((lane, li) => {
                      const code = `${row}${lane.letter}`;
                      const key = seatKey(row, lane.letter);
                      const isTaken = taken.has(code);
                      const isChosen = selected.includes(key);
                      return (
                        <div
                          key={key}
                          role="gridcell"
                          data-seat={key}
                          aria-colindex={li + 1}
                          aria-selected={isChosen}
                          aria-disabled={isTaken || undefined}
                          aria-label={`${seatLabel(row, lane)}, ${isTaken ? "taken" : `${money.format(current.price ?? 0)}`}`}
                          tabIndex={key === tabKey ? 0 : -1}
                          onClick={() => {
                            setFocusKey(key);
                            toggle(row, lane);
                          }}
                          onKeyDown={(event) => onSeatKey(event, row, li)}
                          onFocus={(event) => {
                            setFocusKey(key);
                            if (event.currentTarget.matches(":focus-visible")) showHint(event.currentTarget, key);
                          }}
                          onBlur={() => setHint((h) => (h?.key === key ? null : h))}
                          onPointerEnter={(event) =>
                            event.pointerType === "mouse" && showHint(event.currentTarget, key)
                          }
                          onPointerLeave={() => setHint((h) => (h?.key === key ? null : h))}
                          className={cn(
                            "group/seat absolute flex rounded-[7px] outline-none select-none",
                            "transition-transform duration-150 ease-settle",
                            "focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring",
                            isTaken ? "cursor-not-allowed" : "cursor-default active:scale-[0.94]",
                          )}
                          style={{ left: u, top: plan.y + lane.v, width: DEPTH, height: SEAT }}
                        >
                          <span
                            className={cn(
                              "w-[7px] shrink-0 rounded-l-[6px] rounded-r-[2px] transition-colors duration-200",
                              isTaken ? "bg-border" : "bg-border-strong",
                              isChosen && "bg-brand-strong dark:bg-brand/55",
                            )}
                          />
                          <span
                            className={cn(
                              "relative ml-[2px] flex flex-1 items-center justify-center overflow-hidden rounded-[6px] transition-[background-color,box-shadow] duration-200",
                              isTaken
                                ? "bg-border bg-[repeating-linear-gradient(135deg,var(--miyuki-seat-map-hatch)_0_1.5px,transparent_1.5px_5px)] [--miyuki-seat-map-hatch:var(--border-strong)] dark:bg-card dark:[--miyuki-seat-map-hatch:var(--border)]"
                                : "bg-card shadow-xs ring-1 ring-border-strong ring-inset group-hover/seat:bg-brand-soft group-hover/seat:ring-brand/50 dark:bg-accent dark:group-hover/seat:bg-brand-soft",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute inset-0 origin-left bg-brand transition-transform duration-300 ease-settle motion-reduce:transition-none",
                                isChosen ? "scale-x-100" : "scale-x-0",
                              )}
                            />
                            {isChosen && (
                              <Check
                                aria-hidden="true"
                                strokeWidth={3}
                                className={cn("relative size-3.5 text-brand-foreground", transposeCls)}
                              />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <span id={`${id}-car`} className="sr-only">
          Car {current.id}. Arrow keys move between seats, Page Up and Page Down change car.
        </span>
      </div>

      {hinted && (
        <div
          role="presentation"
          className={cn(
            "pointer-events-none absolute z-20 -translate-x-1/2 rounded-md bg-primary px-2 py-1 text-xs leading-4 whitespace-nowrap text-primary-foreground shadow-md",
            "motion-safe:animate-[miyuki-seat-map-in_140ms_cubic-bezier(0.22,1,0.36,1)]",
            !hinted.below && "-translate-y-full",
          )}
          style={{ left: hinted.x, top: hinted.y }}
        >
          <span className="font-medium tabular-nums">
            {hintedCode}
            {hintedLane ? `, ${kindName[hintedLane.kind]}` : ""}
          </span>
          <span className="opacity-70">
            {" · "}
            {taken.has(hintedCode)
              ? "Taken"
              : selected.includes(hinted.key)
                ? "Chosen"
                : money.format(current.price ?? 0)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-4 @min-[40rem]:flex-row @min-[40rem]:items-start @min-[40rem]:justify-between">
        <ul aria-label="Key" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <SeatGlyph state="free" />
            Free
          </li>
          <li className="flex items-center gap-1.5">
            <SeatGlyph state="taken" />
            Taken
          </li>
          <li className="flex items-center gap-1.5">
            <SeatGlyph state="chosen" />
            Chosen
          </li>
        </ul>
        <div className="flex w-full flex-col gap-1 @min-[40rem]:max-w-[320px]">
          <div className="flex items-baseline justify-between text-[13px] text-muted-foreground">
            <span>Your seats</span>
            <span className="tabular-nums">
              {selected.length} of {max}
            </span>
          </div>
          {chosen.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Pick a free seat on the plan.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {chosen.map((s) => (
                <li key={s.key} className="flex h-10 items-center gap-3 text-sm">
                  <span className="w-12 font-medium tabular-nums">{s.code}</span>
                  <span className="flex-1 truncate text-muted-foreground">
                    Car {s.car?.id}, {kindName[s.kind]}
                  </span>
                  <span className="tabular-nums">{money.format(s.price)}</span>
                  <IconButton
                    aria-label={`Remove ${s.code} in car ${s.car?.id}`}
                    variant="ghost"
                    size="sm"
                    className="-me-1.5 size-7 text-muted-foreground"
                    onPress={() => {
                      setSelected(selected.filter((k) => k !== s.key));
                      setNotice(`${s.code} removed.`);
                    }}
                  >
                    <X />
                  </IconButton>
                </li>
              ))}
              <li className="flex h-10 items-center justify-between text-sm font-medium">
                <span>Total</span>
                <span className="tabular-nums">{money.format(total)}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {notice}
      </p>
      <style href="miyuki-seat-map" precedence="miyuki">{`
@keyframes miyuki-seat-map-in { from { opacity: 0; } }
`}</style>
    </div>
  );
}
