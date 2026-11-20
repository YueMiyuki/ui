"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type PressEvent,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type IceButtonTone = "ice" | "deep";
export type IceButtonSize = "sm" | "md" | "lg";

export interface IceButtonProps extends AriaButtonProps {
  tone?: IceButtonTone;
  size?: IceButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

interface Crack {
  d: string;
  delay: number;
  duration: number;
  width: number;
}

interface Fracture {
  id: number;
  x: number;
  y: number;
  cracks: Crack[];
  grownAt: number;
  healing: boolean;
}

const sizes: Record<IceButtonSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-11 px-5",
};

const tones: Record<IceButtonTone, string> = {
  ice: cn(
    "text-[color-mix(in_oklab,var(--brand-strong)_58%,var(--foreground))] dark:text-foreground",
    "[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_9%,rgb(255_255_255/0.78))]",
    "[--miyuki-ice-button-bottom:color-mix(in_oklab,var(--brand)_30%,rgb(255_255_255/0.3))]",
    "[--miyuki-ice-button-rim:color-mix(in_oklab,var(--brand)_55%,transparent)]",
    "[--miyuki-ice-button-edge:color-mix(in_oklab,var(--brand)_26%,transparent)]",
    "[--miyuki-ice-button-shade:color-mix(in_oklab,var(--brand-strong)_62%,transparent)]",
    "[--miyuki-ice-button-sheen:rgb(255_255_255/0.5)]",
    "[--miyuki-ice-button-crack:rgb(255_255_255/0.98)] [--miyuki-ice-button-glint:rgb(255_255_255/0.45)]",
    "dark:[--miyuki-ice-button-crack:rgb(235_246_255/0.82)] ink:[--miyuki-ice-button-crack:oklch(0.968_0_0/0.82)] dark:[--miyuki-ice-button-glint:rgb(200_230_255/0.14)] ink:[--miyuki-ice-button-glint:oklch(0.911_0_0/0.14)]",
    "dark:[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_52%,rgb(190_230_255/0.14))] ink:[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_52%,oklch(0.905_0_0/0.14))]",
    "dark:[--miyuki-ice-button-bottom:color-mix(in_oklab,var(--brand)_30%,transparent)]",
    "dark:[--miyuki-ice-button-rim:color-mix(in_oklab,var(--brand)_40%,transparent)]",
    "dark:[--miyuki-ice-button-edge:rgb(255_255_255/0.12)]",
    "dark:[--miyuki-ice-button-shade:color-mix(in_oklab,var(--background)_70%,transparent)]",
    "dark:[--miyuki-ice-button-sheen:rgb(255_255_255/0.2)]",
  ),
  deep: cn(
    "text-brand-foreground dark:text-foreground",
    "[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_88%,rgb(255_255_255/0.5))]",
    "[--miyuki-ice-button-bottom:color-mix(in_oklab,var(--brand-strong)_80%,rgb(4_32_84/0.75))]",
    "[--miyuki-ice-button-rim:color-mix(in_oklab,var(--brand-strong)_70%,rgb(4_24_64))]",
    "[--miyuki-ice-button-edge:color-mix(in_oklab,var(--brand-strong)_50%,transparent)]",
    "[--miyuki-ice-button-shade:rgb(6_26_70/0.55)]",
    "[--miyuki-ice-button-sheen:rgb(255_255_255/0.3)]",
    "[--miyuki-ice-button-crack:rgb(240_248_255/0.92)] [--miyuki-ice-button-glint:rgb(255_255_255/0.2)]",
    "dark:[--miyuki-ice-button-crack:rgb(235_246_255/0.82)] ink:[--miyuki-ice-button-crack:oklch(0.968_0_0/0.82)] dark:[--miyuki-ice-button-glint:rgb(200_230_255/0.14)] ink:[--miyuki-ice-button-glint:oklch(0.911_0_0/0.14)]",
    "dark:[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_52%,rgb(16_44_96/0.7))] ink:[--miyuki-ice-button-top:color-mix(in_oklab,var(--brand)_52%,oklch(0.306_0_0/0.7))]",
    "dark:[--miyuki-ice-button-bottom:color-mix(in_oklab,var(--brand)_26%,rgb(8_24_60/0.82))] ink:[--miyuki-ice-button-bottom:color-mix(in_oklab,var(--brand)_26%,oklch(0.221_0_0/0.82))]",
    "dark:[--miyuki-ice-button-rim:color-mix(in_oklab,var(--brand)_45%,transparent)]",
    "dark:[--miyuki-ice-button-edge:rgb(255_255_255/0.1)]",
    "dark:[--miyuki-ice-button-shade:rgb(2_10_30/0.6)] ink:[--miyuki-ice-button-shade:oklch(0.149_0_0/0.6)]",
    "dark:[--miyuki-ice-button-sheen:rgb(255_255_255/0.2)]",
  ),
};

const round = (v: number) => Math.round(v * 10) / 10;

function walk(x: number, y: number, heading: number, reach: number, w: number, h: number, step: number) {
  const pts: [number, number][] = [[x, y]];
  let angle = heading;
  let length = 0;
  while (length < reach) {
    const s = step * (0.7 + Math.random() * 0.9);
    angle += Math.random() < 0.3 ? (Math.random() - 0.5) * 1.1 : (Math.random() - 0.5) * 0.22;
    angle += (heading - angle) * 0.2;
    x += Math.cos(angle) * s;
    y += Math.sin(angle) * s;
    pts.push([x, y]);
    length += s;
    if (x < -3 || x > w + 3 || y < -3 || y > h + 3) break;
  }
  return { pts, length };
}

const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${round(x)} ${round(y)}`).join("");

function fracture(x: number, y: number, w: number, h: number): Crack[] {
  const cracks: Crack[] = [];
  const count = Math.random() < 0.45 ? 2 : 3;
  const base = Math.random() * Math.PI * 2;
  const span = Math.max(w, h);
  for (let i = 0; i < count; i++) {
    const heading = base + (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.7;
    const main = walk(x, y, heading, span * (0.32 + Math.random() * 0.34), w, h, 7);
    const duration = Math.min(230, 80 + main.length * 1.5);
    const delay = i * 22;
    cracks.push({ d: toPath(main.pts), delay, duration, width: 1 });
    if (main.pts.length > 3 && Math.random() < 0.75) {
      const k = Math.floor((main.pts.length - 1) * (0.3 + Math.random() * 0.35));
      const [bx, by] = main.pts[k];
      const turn = (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.5);
      const branch = walk(bx, by, heading + turn, span * (0.08 + Math.random() * 0.1), w, h, 4.5);
      cracks.push({
        d: toPath(branch.pts),
        delay: delay + duration * (k / (main.pts.length - 1)) * 0.7,
        duration: Math.min(150, 50 + branch.length * 1.6),
        width: 0.7,
      });
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 2.5;
    cracks.push({
      d: toPath([
        [x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2],
        [x + Math.cos(a) * r, y + Math.sin(a) * r],
      ]),
      delay: 0,
      duration: 60,
      width: 0.6,
    });
  }
  return cracks;
}

const HEAL = 0.46;

function FractureMark({
  fracture: f,
  reduce,
  bruise,
  onDone,
}: {
  fracture: Fracture;
  reduce: boolean;
  bruise: string;
  onDone: () => void;
}) {
  const heal = { duration: reduce ? 0.16 : HEAL, ease: [0.45, 0, 0.25, 1] as const };
  return (
    <g>
      <motion.circle
        cx={f.x}
        cy={f.y}
        r={5}
        fill={`url(#${bruise})`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.3 }}
        animate={f.healing ? { opacity: 0, scale: reduce ? 1 : 0.5 } : { opacity: 1, scale: 1 }}
        transition={f.healing ? { ...heal, delay: reduce ? 0 : 0.12 } : { duration: reduce ? 0.08 : 0.12 }}
        style={{ transformOrigin: `${f.x}px ${f.y}px` }}
        onAnimationComplete={() => {
          if (f.healing) onDone();
        }}
      />
      {f.cracks.map((c, i) => {
        const grow = reduce
          ? { duration: 0.08 }
          : { duration: c.duration / 1000, delay: c.delay / 1000, ease: [0.15, 0.7, 0.3, 1] as const };
        const shown = reduce ? { opacity: 1 } : { pathLength: 1, opacity: 1 };
        const gone = reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 };
        const start = reduce ? { opacity: 0 } : { pathLength: 0, opacity: 1 };
        const layers = [
          { stroke: "var(--miyuki-ice-button-glint)", width: c.width * 2.2, dx: 0 },
          { stroke: "var(--miyuki-ice-button-shade)", width: c.width * 0.7, dx: 0.65 },
          { stroke: "var(--miyuki-ice-button-crack)", width: c.width * 0.85, dx: 0 },
        ];
        return layers.map((layer, j) => (
          <motion.path
            key={`${i}-${j}`}
            d={c.d}
            fill="none"
            stroke={layer.stroke}
            strokeWidth={layer.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={layer.dx ? `translate(${layer.dx} ${layer.dx})` : undefined}
            initial={start}
            animate={f.healing ? gone : shown}
            transition={f.healing ? heal : grow}
          />
        ));
      })}
    </g>
  );
}

export function IceButton({
  tone = "ice",
  size = "md",
  iconStart,
  iconEnd,
  className,
  children,
  onPressStart,
  onPressEnd,
  ...props
}: IceButtonProps) {
  const reduce = useReducedMotion() ?? false;
  const [fractures, setFractures] = useState<Fracture[]>([]);
  const counter = useRef(0);
  const open = useRef<{ id: number; grownAt: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bruise = `miyuki-ice-button-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const crack = (event: PressEvent) => {
    const el = event.target as HTMLElement;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const keyboard = event.pointerType === "keyboard" || event.pointerType === "virtual";
    const x = keyboard ? w * (0.38 + Math.random() * 0.24) : Math.min(Math.max(event.x, 4), w - 4);
    const y = keyboard ? h * (0.4 + Math.random() * 0.2) : Math.min(Math.max(event.y, 4), h - 4);
    const cracks = fracture(x, y, w, h);
    const grownAt = performance.now() + Math.max(...cracks.map((c) => c.delay + c.duration));
    const id = ++counter.current;
    open.current.push({ id, grownAt });
    setFractures((all) => [...all.slice(-3), { id, x, y, cracks, grownAt, healing: false }]);
  };

  const heal = () => {
    const closing = open.current;
    open.current = [];
    if (closing.length === 0) return;
    const wait = Math.max(0, ...closing.map((f) => f.grownAt - performance.now())) + 90;
    timers.current.push(
      setTimeout(() => {
        setFractures((all) => all.map((f) => (closing.some((o) => o.id === f.id) ? { ...f, healing: true } : f)));
      }, wait),
    );
  };

  return (
    <AriaButton
      {...props}
      onPressStart={(event) => {
        crack(event);
        onPressStart?.(event);
      }}
      onPressEnd={(event) => {
        heal();
        onPressEnd?.(event);
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/ice relative isolate inline-flex shrink-0 cursor-default items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none outline-none",
          "transition-[scale,box-shadow] duration-150 ease-settle data-[pressed]:scale-[0.98]",
          "shadow-[0_1px_2px_color-mix(in_oklab,var(--brand)_16%,transparent),0_6px_16px_-8px_color-mix(in_oklab,var(--brand)_45%,transparent)]",
          "dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_8px_20px_-10px_color-mix(in_oklab,var(--brand)_40%,transparent)]",
          "data-[hovered]:shadow-[0_1px_2px_color-mix(in_oklab,var(--brand)_18%,transparent),0_8px_20px_-8px_color-mix(in_oklab,var(--brand)_55%,transparent)]",
          "dark:data-[hovered]:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_10px_24px_-10px_color-mix(in_oklab,var(--brand)_55%,transparent)]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg:not([data-ice])]:pointer-events-none [&_svg:not([data-ice])]:size-4 [&_svg:not([data-ice])]:shrink-0",
          tones[tone],
          sizes[size],
          cls,
        ),
      )}
    >
      {composeRenderProps(children, (label) => (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
          >
            <span className="absolute inset-0 bg-linear-to-b from-(--miyuki-ice-button-top) to-(--miyuki-ice-button-bottom) backdrop-blur-[3px]" />
            <span className="absolute inset-x-0 top-0 h-[52%] bg-linear-to-b from-white/45 to-white/0 dark:from-white/12" />
            <span className="absolute inset-0 shadow-[inset_0_-7px_10px_-8px_rgb(255_255_255/0.85),inset_0_0_7px_rgb(255_255_255/0.55)] dark:shadow-[inset_0_-7px_10px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent),inset_0_0_8px_color-mix(in_oklab,var(--brand)_28%,transparent)]" />
            <span className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(120%_90%_at_50%_120%,rgb(255_255_255/0.4),transparent_60%)] opacity-0 transition-opacity duration-500 ease-settle group-data-[hovered]/ice:opacity-100 dark:bg-[radial-gradient(120%_90%_at_50%_120%,color-mix(in_oklab,var(--brand)_30%,transparent),transparent_60%)]" />
            <span
              className={cn(
                "absolute -inset-y-2 left-[10%] w-[40%] skew-x-[-24deg] opacity-45 transition-[opacity,translate] duration-500 ease-settle",
                "bg-[linear-gradient(90deg,transparent,var(--miyuki-ice-button-sheen)_38%,transparent_46%,transparent_62%,var(--miyuki-ice-button-sheen)_70%,transparent)]",
                "group-data-[hovered]/ice:translate-x-[22%] group-data-[hovered]/ice:opacity-100 group-data-[hovered]/ice:brightness-125",
              )}
            />
            <svg data-ice="" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <radialGradient id={bruise}>
                  <stop offset="0" stopColor="white" stopOpacity="0.9" />
                  <stop offset="0.45" stopColor="white" stopOpacity="0.45" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </radialGradient>
              </defs>
              {fractures.map((f) => (
                <FractureMark
                  key={f.id}
                  fracture={f}
                  reduce={reduce}
                  bruise={bruise}
                  onDone={() => setFractures((all) => all.filter((x) => x.id !== f.id))}
                />
              ))}
            </svg>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] p-[1.5px]",
              "bg-[linear-gradient(165deg,rgb(255_255_255/0.98),rgb(255_255_255/0.55)_30%,var(--miyuki-ice-button-edge)_62%,var(--miyuki-ice-button-rim))]",
              "dark:bg-[linear-gradient(165deg,rgb(255_255_255/0.6),rgb(255_255_255/0.18)_30%,var(--miyuki-ice-button-edge)_62%,var(--miyuki-ice-button-rim))]",
              "[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]",
            )}
          />
          {iconStart}
          {label != null && label !== false ? (
            <span
              className={cn(
                "relative truncate",
                tone === "deep"
                  ? "[text-shadow:0_0_2px_rgb(8_60_130/0.9),0_0_7px_rgb(8_60_130/0.7)] dark:[text-shadow:0_0_2px_rgb(10_34_74/0.95),0_0_7px_rgb(10_34_74/0.75)] ink:[text-shadow:0_0_2px_oklch(0.26_0_0/0.95),0_0_7px_oklch(0.26_0_0/0.75)]"
                  : "[text-shadow:0_0_2px_rgb(236_245_255/0.95),0_0_7px_rgb(236_245_255/0.8)] dark:[text-shadow:0_0_2px_rgb(18_42_62/0.95),0_0_7px_rgb(18_42_62/0.75)] ink:[text-shadow:0_0_2px_oklch(0.276_0_0/0.95),0_0_7px_oklch(0.276_0_0/0.75)]",
              )}
            >
              {label}
            </span>
          ) : null}
          {iconEnd}
        </>
      ))}
    </AriaButton>
  );
}
