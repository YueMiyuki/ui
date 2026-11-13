"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Menu, MenuItem, type Selection } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface CompassNavItem {
  id: string;
  label: string;
  bearing?: number;
}

export interface CompassNavProps extends Omit<ComponentProps<"div">, "children" | "onChange" | "defaultValue"> {
  items: CompassNavItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  size?: number;
  container?: RefObject<HTMLElement | null>;
  needleColor?: string;
}

const INSET = 46;
const DIAL = { k: 95, c: 15.5 };
const NEEDLE = { k: 165, c: 9.5 };
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const CARDINALS = [
  { at: 0, text: "N" },
  { at: 90, text: "E" },
  { at: 180, text: "S" },
  { at: 270, text: "W" },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const near = (from: number, to: number) => from + wrap(to - from);

function scrollerOf(container?: RefObject<HTMLElement | null>) {
  return container?.current ?? null;
}

function findSection(id: string, scroller: HTMLElement | null) {
  if (scroller) return scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  return document.getElementById(id);
}

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [100 + r * Math.sin(a), 100 - r * Math.cos(a)];
}

class Instrument {
  root: HTMLElement | null = null;
  labels: { el: HTMLElement; at: number }[] = [];
  dial = 0;
  dialV = 0;
  dialTarget = 0;
  needle = 0;
  needleV = 0;
  needleBearing = 0;
  raf = 0;
  last = 0;
  reduce = false;

  constructor(dial: number) {
    this.dial = this.dialTarget = dial;
    this.needle = 0;
    this.needleBearing = -dial;
  }

  attach(root: HTMLElement | null) {
    this.root = root;
    this.collect();
  }

  collect() {
    const root = this.root;
    if (!root) return;
    this.labels = [...root.querySelectorAll<HTMLElement>("[data-compass-at]")].map((el) => ({
      el,
      at: Number(el.dataset.compassAt) || 0,
    }));
    this.write();
  }

  setReduce(reduce: boolean) {
    this.reduce = reduce;
  }

  write() {
    this.root?.style.setProperty("--miyuki-compass-nav-dial", `${this.dial.toFixed(3)}deg`);
    this.root?.style.setProperty("--miyuki-compass-nav-needle", `${this.needle.toFixed(3)}deg`);
    const rim = ((this.root?.offsetWidth ?? 0) - INSET * 2) / 2 + 6;
    for (const { el, at } of this.labels) {
      const a = ((at + this.dial) * Math.PI) / 180;
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      const r = rim + (Math.abs(sin) * el.offsetWidth) / 2 + (Math.abs(cos) * el.offsetHeight) / 2;
      el.style.transform = `translate(-50%, -50%) translate(${(r * sin).toFixed(2)}px, ${(-r * cos).toFixed(2)}px)`;
    }
  }

  aim(bearing: number, dial: number) {
    this.needleBearing = bearing;
    this.dialTarget = near(this.dial, dial);
    if (this.reduce) {
      this.dial = this.dialTarget;
      this.dialV = 0;
      this.needle = near(this.needle, this.needleBearing + this.dial);
      this.needleV = 0;
      this.write();
      return;
    }
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame = (now: number) => {
    const dt = this.last ? clamp((now - this.last) / 1000, 0, 1 / 30) : 1 / 60;
    this.last = now;
    let left = dt;
    while (left > 0) {
      const h = Math.min(left, 1 / 240);
      left -= h;
      this.dialV += (DIAL.k * (this.dialTarget - this.dial) - DIAL.c * this.dialV) * h;
      this.dial += this.dialV * h;
      const goal = near(this.needle, this.needleBearing + this.dial);
      this.needleV += (NEEDLE.k * (goal - this.needle) - NEEDLE.c * this.needleV) * h;
      this.needle += this.needleV * h;
    }
    this.write();
    const goal = near(this.needle, this.needleBearing + this.dial);
    const still =
      Math.abs(this.dialTarget - this.dial) < 0.02 &&
      Math.abs(this.dialV) < 0.05 &&
      Math.abs(goal - this.needle) < 0.02 &&
      Math.abs(this.needleV) < 0.05;
    if (still) {
      this.dial = this.dialTarget;
      this.needle = goal;
      this.write();
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

export function CompassNav({
  items,
  value,
  defaultValue,
  onChange,
  size = 300,
  container,
  needleColor = "var(--chart-5)",
  className,
  style,
  "aria-label": ariaLabel = "Destinations",
  ...props
}: CompassNavProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^\w-]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const placed = items.map((item, i) => ({ ...item, at: item.bearing ?? (360 / items.length) * i }));
  const ordered = [...placed].sort((a, b) => (((a.at % 360) + 360) % 360) - (((b.at % 360) + 360) % 360));
  const [own, setOwn] = useState(() => defaultValue ?? items[0]?.id);
  const selected = value ?? own;
  const [aimed, setAimedState] = useState<string | null>(null);
  const hold = useRef<{ x: number; y: number } | null>(null);
  const [still, setStill] = useState(false);
  const setAimed = (id: string | null) => setAimedState(hold.current && id ? null : id);
  const [section, setSection] = useState<string | null>(null);
  const bearingOf = (id: string | null | undefined) => placed.find((p) => p.id === id)?.at;
  const [instrument] = useState(() => new Instrument(-(bearingOf(selected) ?? 0)));
  const [initialDial] = useState(() => -(bearingOf(selected) ?? 0));

  const pointTo = aimed ?? section ?? selected;
  const needleAt = bearingOf(pointTo) ?? 0;
  const dialAt = -(bearingOf(selected) ?? 0);

  useLayoutEffect(() => {
    instrument.setReduce(reduce);
  }, [instrument, reduce]);

  useLayoutEffect(() => {
    instrument.attach(rootRef.current);
    const ro = new ResizeObserver(() => instrument.write());
    if (rootRef.current) ro.observe(rootRef.current);
    return () => {
      ro.disconnect();
      instrument.dispose();
    };
  }, [instrument]);

  useLayoutEffect(() => {
    instrument.aim(needleAt, dialAt);
  }, [instrument, needleAt, dialAt]);

  const ids = items.map((item) => item.id).join("\n");
  const layout = placed.map((p) => `${p.id}:${p.at}:${p.label}`).join("|");

  useLayoutEffect(() => {
    instrument.collect();
  }, [instrument, layout]);

  useEffect(() => {
    const scroller = scrollerOf(container);
    const list = ids.split("\n");
    if (!list.some((id) => findSection(id, scroller))) return;
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = scroller ?? document.scrollingElement ?? document.documentElement;
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const height = scroller ? scroller.clientHeight : window.innerHeight;
      const range = el.scrollHeight - height;
      const progress = range > 0 ? clamp(el.scrollTop / range, 0, 1) : 0;
      const line = top + height * (0.3 + 0.7 * progress ** 5);
      let found: string | null = null;
      for (const id of list) {
        const node = findSection(id, scroller);
        if (node && node.getBoundingClientRect().top <= line) found = id;
      }
      setSection(found ?? list.find((id) => findSection(id, scroller)) ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    schedule();
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [container, ids]);

  const choose = (id: string, pointer?: { x: number; y: number }) => {
    if (pointer) {
      hold.current = pointer;
      setStill(true);
      setAimedState(null);
    }
    if (value === undefined) setOwn(id);
    if (id !== selected) onChange?.(id);
    const root = rootRef.current;
    const chosen = root?.querySelector<HTMLElement>(`[data-key="${CSS.escape(id)}"]`);
    if (chosen && root?.contains(document.activeElement) && document.activeElement !== chosen)
      chosen.focus({ preventScroll: true });
    const scroller = scrollerOf(container);
    const node = findSection(id, scroller);
    if (!node) return;
    const el = scroller ?? document.scrollingElement ?? document.documentElement;
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const height = scroller ? scroller.clientHeight : window.innerHeight;
    const margin = parseFloat(getComputedStyle(node).scrollMarginTop) || 0;
    const y = clamp(el.scrollTop + node.getBoundingClientRect().top - top - margin, 0, el.scrollHeight - height);
    (scroller ?? window).scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

  const aimFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.08) return null;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    let best: string | null = null;
    let gap = Infinity;
    for (const p of placed) {
      const d = Math.abs(wrap(p.at + instrument.dial - angle));
      if (d < gap) {
        gap = d;
        best = p.id;
      }
    }
    return best;
  };

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn("@container relative aspect-square max-w-full touch-manipulation select-none", className)}
      style={
        {
          width: size,
          "--miyuki-compass-nav-dial": `${initialDial}deg`,
          "--miyuki-compass-nav-needle": "0deg",
          "--miyuki-compass-nav-tip": needleColor,
          ...style,
        } as CSSProperties
      }
      onPointerMove={(event) => {
        const held = hold.current;
        if (held && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 4) {
          hold.current = null;
          setStill(false);
        }
        setAimed(aimFromPointer(event));
      }}
      onPointerLeave={() => {
        hold.current = null;
        setStill(false);
        setAimedState(null);
      }}
      onKeyDownCapture={() => {
        hold.current = null;
        setStill(false);
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") return;
        const item = (event.target as HTMLElement).closest<HTMLElement>("[data-compass-at]");
        const id = item ? null : aimed;
        if (item) {
          hold.current = { x: event.clientX, y: event.clientY };
          setStill(true);
        }
        if (id) choose(id, { x: event.clientX, y: event.clientY });
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute overflow-visible" style={{ inset: INSET }}>
        <defs>
          <radialGradient id={`${uid}-face`} cx="0.5" cy="0.4" r="0.62">
            <stop offset="0" style={{ stopColor: "var(--card)" }} />
            <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--muted) 75%, var(--card))" }} />
          </radialGradient>
          <linearGradient id={`${uid}-glass`} x1="0.15" y1="0" x2="0.55" y2="0.75">
            <stop offset="0" stopColor="white" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="white" stopOpacity="0.05" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="100"
          className="fill-[color-mix(in_oklab,var(--muted)_70%,var(--border-strong))] drop-shadow-[0_8px_14px_oklch(0.42_0.09_250/0.2)] dark:fill-[color-mix(in_oklab,var(--muted)_80%,var(--border-strong))] dark:drop-shadow-[0_8px_18px_oklch(0.05_0.02_250/0.65)]"
        />
        <g
          className="origin-center [transform-box:view-box]"
          style={{ transform: "rotate(var(--miyuki-compass-nav-dial))" }}
        >
          <circle cx="100" cy="100" r="96.5" className="fill-card" />
          <circle cx="100" cy="100" r="80" fill={`url(#${uid}-face)`} />
          <circle cx="100" cy="100" r="80" fill="none" strokeWidth="0.5" className="stroke-border-strong" />
          {TICKS.map((deg) => {
            if (CARDINALS.some((c) => c.at === deg)) return null;
            const long = deg % 45 === 0;
            const mid = deg % 15 === 0;
            const [x1, y1] = polar(91.5, deg);
            const [x2, y2] = polar(long ? 83.5 : mid ? 85.5 : 87.5, deg);
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={long ? 1.1 : 0.7}
                strokeLinecap="round"
                className={long || mid ? "stroke-foreground/70" : "stroke-muted-foreground/55"}
              />
            );
          })}
          {CARDINALS.map((c) => {
            const [x, y] = polar(87.5, c.at);
            return (
              <text
                key={c.text}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${c.at} ${x} ${y})`}
                className={cn(
                  "font-sans text-[8.5px] font-semibold",
                  c.at === 0 ? "fill-(--miyuki-compass-nav-tip)" : "fill-foreground/75",
                )}
              >
                {c.text}
              </text>
            );
          })}
          {placed.map((p) => (
            <path
              key={p.id}
              d="M100 6.2 L97.6 2.6 L102.4 2.6 Z"
              transform={`rotate(${p.at} 100 100)`}
              className={cn(
                "transition-[fill] duration-200",
                p.id === selected ? "fill-brand" : p.id === aimed ? "fill-foreground/70" : "fill-muted-foreground/45",
              )}
            />
          ))}
        </g>
        <circle cx="100" cy="100" r="99.5" fill="none" strokeWidth="1" className="stroke-border-strong/80" />
        <path d="M100 10 L96.6 4.5 L103.4 4.5 Z" className="fill-brand stroke-card" strokeWidth="0.8" />
        <g
          className="origin-center drop-shadow-[0_2.5px_1.5px_oklch(0.42_0.09_250/0.28)] [transform-box:view-box] dark:drop-shadow-[0_2.5px_2px_oklch(0.05_0.02_250/0.7)]"
          style={{ transform: "rotate(var(--miyuki-compass-nav-needle))" }}
        >
          <path
            d="M100 37 L94.6 100 L100 100 Z"
            className="fill-[color-mix(in_oklab,var(--miyuki-compass-nav-tip)_78%,white)]"
          />
          <path d="M100 37 L105.4 100 L100 100 Z" className="fill-(--miyuki-compass-nav-tip)" />
          <path
            d="M100 150 L94.6 100 L100 100 Z"
            className="fill-[color-mix(in_oklab,var(--foreground)_38%,var(--card))]"
          />
          <path
            d="M100 150 L105.4 100 L100 100 Z"
            className="fill-[color-mix(in_oklab,var(--foreground)_68%,var(--card))]"
          />
        </g>
        <circle cx="100" cy="100" r="6.5" className="fill-card stroke-border-strong" strokeWidth="1" />
        <circle cx="100" cy="100" r="2.4" className="fill-foreground/65" />
        <circle cx="100" cy="100" r="96.5" fill={`url(#${uid}-glass)`} className="opacity-70 dark:opacity-[0.16]" />
      </svg>
      <Menu
        aria-label={ariaLabel}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={selected ? [selected] : []}
        onSelectionChange={(keys: Selection) => {
          if (keys === "all") return;
          const [first] = [...keys];
          if (first != null) choose(String(first));
        }}
        className="absolute inset-0 outline-none"
      >
        {ordered.map((p) => (
          <MenuItem
            key={p.id}
            id={p.id}
            data-compass-at={p.at}
            textValue={p.label}
            onHoverStart={() => setAimed(p.id)}
            onFocus={() => setAimed(p.id)}
            onBlur={() => setAimedState(null)}
            className={({ isFocusVisible }) =>
              cn(
                "absolute top-1/2 left-1/2 cursor-pointer rounded-md px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap outline-none",
                "transition-[color,background-color,box-shadow] duration-150",
                p.id === selected ? "text-brand-strong" : "text-muted-foreground",
                p.id === aimed && p.id !== selected && "bg-accent text-foreground",
                still && "pointer-events-none",
                isFocusVisible && "ring-[3px] ring-ring",
              )
            }
            style={
              {
                "--miyuki-compass-nav-at": `${p.at}deg`,
                transform: `translate(-50%, -50%) rotate(calc(var(--miyuki-compass-nav-at) + var(--miyuki-compass-nav-dial))) translateY(calc(${INSET - 22}px - 50cqw)) rotate(calc(-1 * (var(--miyuki-compass-nav-at) + var(--miyuki-compass-nav-dial))))`,
              } as CSSProperties
            }
          >
            {p.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
