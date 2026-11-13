"use client";

import { type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface SensuFanItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface SensuFanProps extends Omit<ComponentProps<"div">, "children"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  angle?: number;
  ribs?: number;
  children?: ReactNode;
  items?: SensuFanItem[];
  onAction?: (id: string) => void;
  label?: string;
}

const BW = 480;
const BH = 276;
const PX = 240;
const PY = 256;
const R_OUT = 234;
const R_IN = 96;
const CLOSED = 0.045;
const SPRING = { stiffness: 190, damping: 24, mass: 0.9 };

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (r: number, deg: number) =>
  `${(PX + r * Math.sin(rad(deg))).toFixed(2)}px ${(PY - r * Math.cos(rad(deg))).toFixed(2)}px`;

function wedge(a0: number, a1: number, rIn = R_IN, rOut = R_OUT) {
  const pts: string[] = [];
  const steps = Math.max(2, Math.ceil((a1 - a0) / 2.5));
  for (let s = 0; s <= steps; s++) pts.push(at(rOut, a0 + ((a1 - a0) * s) / steps));
  pts.push(at(rIn, a1), at(rIn, a0));
  return `polygon(${pts.join(", ")})`;
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

interface Geometry {
  angle: number;
  gaps: number;
  phi: number;
}

function facetTransform(g: Geometry, o: number, j: number) {
  const spread = g.angle * Math.min(1, Math.max(CLOSED, o));
  const facet = spread / (2 * g.gaps);
  const full = -g.angle / 2 + (j + 0.5) * g.phi;
  const now = -spread / 2 + (j + 0.5) * facet;
  const k = Math.tan(rad(facet / 2)) / Math.tan(rad(g.phi / 2));
  return { transform: `rotate(${now.toFixed(3)}deg) scaleX(${k.toFixed(4)}) rotate(${(-full).toFixed(3)}deg)`, k };
}

function Facet({
  g,
  o,
  j,
  print,
  tone,
}: {
  g: Geometry;
  o: MotionValue<number>;
  j: number;
  print: ReactNode;
  tone?: string;
}) {
  const full0 = -g.angle / 2 + j * g.phi;
  const lit = j % 2 === 0;
  const transform = useTransform(o, (v) => facetTransform(g, v, j).transform);
  const fold = useTransform(o, (v) => 0.32 + 0.68 * (1 - Math.min(1, facetTransform(g, v, j).k)));
  const shade = lit
    ? `conic-gradient(from ${full0}deg at ${PX}px ${PY}px, oklch(1 0 0 / 0.04) 0deg, oklch(1 0 0 / 0.34) ${g.phi}deg, transparent ${g.phi}deg)`
    : `conic-gradient(from ${full0}deg at ${PX}px ${PY}px, var(--miyuki-sensu-fan-crease) 0deg, var(--miyuki-sensu-fan-fold) ${g.phi}deg, transparent ${g.phi}deg)`;
  return (
    <motion.div
      aria-hidden="true"
      className="absolute top-0 left-0"
      style={{
        width: BW,
        height: BH,
        clipPath: wedge(full0 - 0.08, full0 + g.phi + 0.08),
        transformOrigin: `${PX}px ${PY}px`,
        transform,
        background: tone,
      }}
    >
      {print ? <div className="absolute inset-0">{print}</div> : null}
      <motion.div className="absolute inset-0" style={{ background: shade, opacity: fold }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at ${PX}px ${PY}px, var(--miyuki-sensu-fan-edge) ${R_IN + 2.5}px, transparent ${R_IN + 6}px, transparent ${R_OUT - 5}px, var(--miyuki-sensu-fan-edge) ${R_OUT - 1}px), ${GRAIN}`,
          backgroundSize: `auto, 160px 160px`,
          mixBlendMode: "multiply",
          opacity: 0.4,
        }}
      />
    </motion.div>
  );
}

function Rib({
  g,
  o,
  i,
  count,
  guard,
}: {
  g: Geometry;
  o: MotionValue<number>;
  i: number;
  count: number;
  guard: boolean;
}) {
  const rotate = useTransform(o, (v) => {
    const spread = g.angle * Math.min(1, Math.max(CLOSED, v));
    return -spread / 2 + (i * spread) / (count - 1);
  });
  const above = guard ? R_OUT - 4 : R_IN + 16;
  const below = 14;
  const width = guard ? 14 : 11;
  return (
    <motion.div
      aria-hidden="true"
      className="absolute"
      style={{
        left: PX - width / 2,
        top: PY - above,
        width,
        height: above + below,
        rotate,
        transformOrigin: `${width / 2}px ${above}px`,
        clipPath: guard
          ? `polygon(22% 0, 78% 0, 100% 6%, 100% 100%, 0 100%, 0 6%)`
          : `polygon(8% 0, 92% 0, 78% 100%, 22% 100%)`,
        background: guard
          ? "linear-gradient(90deg, var(--miyuki-sensu-fan-wood-d) 0%, var(--miyuki-sensu-fan-wood-l) 34%, var(--miyuki-sensu-fan-wood-m) 62%, var(--miyuki-sensu-fan-wood-d) 100%)"
          : "linear-gradient(90deg, var(--miyuki-sensu-fan-wood-d) 0%, var(--miyuki-sensu-fan-wood-l) 38%, var(--miyuki-sensu-fan-wood-m) 70%, var(--miyuki-sensu-fan-wood-d) 100%)",
      }}
    >
      <span
        className="absolute inset-0 opacity-30 mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 1.5px, var(--miyuki-sensu-fan-wood-d) 1.5px 2px, transparent 2px 3.5px)",
        }}
      />
      {guard ? null : (
        <span
          className="absolute inset-x-0 h-px bg-(--miyuki-sensu-fan-wood-d) opacity-50"
          style={{ top: above * 0.38 }}
        />
      )}
    </motion.div>
  );
}

function ItemWedge({
  g,
  o,
  s,
  item,
  focusIndex,
  onPress,
  onKey,
  register,
}: {
  g: Geometry;
  o: MotionValue<number>;
  s: number;
  item: SensuFanItem;
  focusIndex: number;
  onPress: () => void;
  onKey: (e: KeyboardEvent<HTMLButtonElement>) => void;
  register: (el: HTMLButtonElement | null) => void;
}) {
  const a0 = -g.angle / 2 + s * 2 * g.phi;
  const center = a0 + g.phi;
  const transform = useTransform(o, (v) => {
    const spread = g.angle * Math.min(1, Math.max(CLOSED, v));
    const section = spread / g.gaps;
    const now = -spread / 2 + (s + 0.5) * section;
    const k = Math.tan(rad(section / 2)) / Math.tan(rad(g.phi));
    return `rotate(${now.toFixed(3)}deg) scaleX(${k.toFixed(4)}) rotate(${(-center).toFixed(3)}deg)`;
  });
  const mid = (R_IN + R_OUT) / 2 + 8;
  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{
        width: BW,
        height: BH,
        clipPath: wedge(a0, a0 + 2 * g.phi),
        transformOrigin: `${PX}px ${PY}px`,
        transform,
      }}
    >
      <button
        ref={register}
        type="button"
        tabIndex={focusIndex === s ? 0 : -1}
        aria-label={item.label}
        onClick={onPress}
        onKeyDown={onKey}
        className={cn(
          "group/item absolute inset-0 cursor-pointer outline-none",
          "transition-[background-color] duration-200 hover:bg-[oklch(0.55_0.13_240/0.1)]",
          "focus-visible:bg-[oklch(0.55_0.13_240/0.16)]",
        )}
      >
        <span
          className="absolute flex items-center gap-1.5 data-[flip]:flex-col-reverse not-data-[flip]:flex-col text-[oklch(0.3_0.04_250)] transition-[translate,color] duration-200 ease-settle group-hover/item:-translate-y-1 group-focus-visible/item:-translate-y-1 group-focus-visible/item:text-[oklch(0.42_0.13_244)] [&_svg]:size-[18px]"
          data-flip={center > 1 || undefined}
          style={{
            left: PX + mid * Math.sin(rad(center)),
            top: PY - mid * Math.cos(rad(center)),
            transform: `translate(-50%, -50%) rotate(${center > 1 ? center + 180 : center}deg)`,
            transformOrigin: "50% 50%",
          }}
        >
          <span className="rotate-90">{item.icon}</span>
          <span className="text-[13px] leading-none font-medium whitespace-nowrap [writing-mode:vertical-rl]">
            {item.label}
          </span>
        </span>
      </button>
    </motion.div>
  );
}

export function SensuFan({
  open,
  defaultOpen = false,
  onOpenChange,
  angle = 140,
  ribs = 11,
  children,
  items,
  onAction,
  label = "Folding fan",
  className,
  style,
  ...props
}: SensuFanProps) {
  const reduced = useReducedMotion() ?? false;
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const o = useSpring(isOpen ? 1 : 0, SPRING);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [scale, setScale] = useState(1);
  const [focusIndex, setFocusIndex] = useState(0);

  const itemMode = Boolean(items?.length);
  const count = itemMode ? items!.length + 1 : Math.max(3, Math.round(ribs));
  const span = Math.min(180, Math.max(40, angle));
  const g: Geometry = { angle: span, gaps: count - 1, phi: span / (2 * (count - 1)) };

  useEffect(() => {
    if (reduced) o.jump(isOpen ? 1 : 0);
    else o.set(isOpen ? 1 : 0);
  }, [isOpen, reduced, o]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / BW)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function setOpen(next: boolean) {
    if (open === undefined) setOwn(next);
    onOpenChange?.(next);
  }

  function onItemKey(e: KeyboardEvent<HTMLButtonElement>, s: number) {
    const n = items?.length ?? 0;
    const move = (to: number) => {
      e.preventDefault();
      const next = (to + n) % n;
      setFocusIndex(next);
      itemRefs.current[next]?.focus();
    };
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(s + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(s - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(n - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
    }
  }

  const facets = Array.from({ length: 2 * g.gaps }, (_, j) => j);

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative w-full max-w-[480px] select-none",
        "[--miyuki-sensu-fan-wood-l:oklch(0.86_0.055_80)] [--miyuki-sensu-fan-wood-m:oklch(0.78_0.065_72)] [--miyuki-sensu-fan-wood-d:oklch(0.6_0.07_62)]",
        "dark:[--miyuki-sensu-fan-wood-l:oklch(0.72_0.055_72)] dark:[--miyuki-sensu-fan-wood-m:oklch(0.62_0.06_66)] dark:[--miyuki-sensu-fan-wood-d:oklch(0.45_0.06_56)]",
        "[--miyuki-sensu-fan-fold:oklch(0.32_0.07_262/0.42)] [--miyuki-sensu-fan-crease:oklch(0.32_0.07_262/0.1)] [--miyuki-sensu-fan-edge:oklch(0.5_0.05_70/0.55)]",
        "dark:[--miyuki-sensu-fan-fold:oklch(0.12_0.05_262/0.55)] dark:[--miyuki-sensu-fan-crease:oklch(0.12_0.05_262/0.14)]",
        className,
      )}
      style={{ aspectRatio: `${BW} / ${BH}`, ...style }}
    >
      <div
        className="absolute top-0 left-0 drop-shadow-[0_10px_14px_oklch(0.42_0.09_250/0.24)] dark:drop-shadow-[0_12px_18px_oklch(0.04_0.02_250/0.7)]"
        style={{ width: BW, height: BH, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={isOpen}
          aria-label={label}
          onClick={() => setOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && isOpen) {
              e.preventDefault();
              setOpen(false);
            }
          }}
          className={cn(
            "absolute z-10 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            itemMode && isOpen ? "rounded-full" : "rounded-2xl",
          )}
          style={
            (itemMode && isOpen
              ? { left: PX - 36, top: PY - 70, width: 72, height: 88 }
              : isOpen
                ? { left: 0, top: 0, width: BW, height: BH }
                : { left: PX - 26, top: PY - R_OUT - 6, width: 52, height: R_OUT + 24 }) as CSSProperties
          }
        />
        <Rib g={g} o={o} i={0} count={count} guard />
        {Array.from({ length: count - 2 }, (_, k) => (
          <Rib key={k} g={g} o={o} i={k + 1} count={count} guard={false} />
        ))}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={reduced ? { opacity: isOpen ? 1 : 0.85 } : { opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {itemMode
            ? facets.map((j) => (
                <Facet
                  key={j}
                  g={g}
                  o={o}
                  j={j}
                  print={null}
                  tone={Math.floor(j / 2) % 2 ? "oklch(0.952 0.018 238)" : "oklch(0.978 0.012 84)"}
                />
              ))
            : facets.map((j) => <Facet key={j} g={g} o={o} j={j} print={children} />)}
          {itemMode && isOpen ? (
            <div role="toolbar" aria-label={label} className="absolute inset-0">
              {items!.map((item, s) => (
                <ItemWedge
                  key={item.id}
                  g={g}
                  o={o}
                  s={s}
                  item={item}
                  focusIndex={focusIndex}
                  register={(el) => {
                    itemRefs.current[s] = el;
                  }}
                  onPress={() => {
                    setFocusIndex(s);
                    onAction?.(item.id);
                  }}
                  onKey={(e) => onItemKey(e, s)}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
        <Rib g={g} o={o} i={count - 1} count={count} guard />
        <span
          aria-hidden="true"
          className="absolute size-4 rounded-full shadow-[0_1px_2px_oklch(0.3_0.05_250/0.4)]"
          style={{
            left: PX - 8,
            top: PY - 8,
            background:
              "radial-gradient(circle at 38% 34%, oklch(0.97 0.01 90), oklch(0.82 0.02 80) 45%, oklch(0.58 0.03 70) 100%)",
          }}
        />
      </div>
    </div>
  );
}
