"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type Ref, useState } from "react";
import { composeRenderProps, ToggleButton, type ToggleButtonProps } from "react-aria-components";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type SnowflakeLikeSize = "sm" | "md" | "lg";

export interface SnowflakeLikeProps extends Omit<ToggleButtonProps, "children" | "onChange"> {
  onChange?: (selected: boolean) => void;
  count?: number;
  size?: SnowflakeLikeSize;
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

const sizes: Record<SnowflakeLikeSize, { icon: number; square: string; pill: string; text: string }> = {
  sm: { icon: 16, square: "size-8", pill: "h-8 gap-1 pr-2.5 pl-2", text: "text-[13px]" },
  md: { icon: 20, square: "size-9", pill: "h-9 gap-1.5 pr-3 pl-2", text: "text-sm" },
  lg: { icon: 24, square: "size-11", pill: "h-11 gap-2 pr-3.5 pl-2.5", text: "text-sm" },
};

const W = 1.2;
const TIP = 10.3;
const TIP_RUN = 1.6;
const BARB = 5.4;
const BARB_W = 1;
const BARB_LEN = 3.7;
const LINE_TIP = 9.5;
const LINE_BARB = 3.1;

function armPoints(): [number, number][] {
  const c = Math.cos(Math.PI / 6);
  const t1 = (W - 0.5 * BARB_W) / c;
  const t2 = (W + 0.5 * BARB_W) / c;
  const ex = BARB + 0.5 * BARB_LEN;
  const ey = -c * BARB_LEN;
  const nx = c * BARB_W;
  const ny = 0.5 * BARB_W;
  const side: [number, number][] = [
    [Math.sqrt(3) * W, -W],
    [BARB - nx + 0.5 * t1, -W],
    [ex - nx, ey - ny],
    [ex + nx, ey + ny],
    [BARB + nx + 0.5 * t2, -W],
    [TIP - TIP_RUN, -W],
  ];
  const mirror = side
    .slice(1)
    .reverse()
    .map(([x, y]) => [x, -y] as [number, number]);
  return [...side, [TIP, 0], ...mirror];
}

const squeeze = (r: number) => (1.656 * r) / (1 + 0.455 * r);
const turn = (k: number) => ((-90 + k * 60) * Math.PI) / 180;

function crystal(radial: (r: number) => number) {
  const arm = armPoints();
  let d = "";
  for (let k = 0; k < 6; k++) {
    const ca = Math.cos(turn(k));
    const sa = Math.sin(turn(k));
    for (const [x, y] of arm) {
      const r = Math.hypot(x, y);
      const s = r > 0 ? radial(r) / r : 0;
      d += `${d ? "L" : "M"}${(12 + (x * ca - y * sa) * s).toFixed(2)} ${(12 + (x * sa + y * ca) * s).toFixed(2)}`;
    }
  }
  return `${d}Z`;
}

function lines() {
  let d = "";
  const at = (k: number, x: number, y: number) => {
    const ca = Math.cos(turn(k));
    const sa = Math.sin(turn(k));
    return `${(12 + x * ca - y * sa).toFixed(2)} ${(12 + x * sa + y * ca).toFixed(2)}`;
  };
  for (let k = 0; k < 6; k++) {
    d += `M12 12L${at(k, LINE_TIP, 0)}`;
    for (const side of [-1, 1]) {
      d += `M${at(k, BARB, 0)}L${at(k, BARB + 0.5 * LINE_BARB, side * Math.cos(Math.PI / 6) * LINE_BARB)}`;
    }
  }
  return d;
}

const FULL = crystal((r) => r);
const SEED = crystal(squeeze);
const LINES = lines();

const FLAKE = "M0 -1.4L0 1.4M-1.21 -0.7L1.21 0.7M-1.21 0.7L1.21 -0.7";

const BLOOM = { stiffness: 520, damping: 24 };
const QUIET = { stiffness: 360, damping: 40 };

function Ticker({ value, reduce }: { value: number; reduce: boolean }) {
  const [shown, setShown] = useState(value);
  const [direction, setDirection] = useState(1);
  if (shown !== value) {
    setDirection(value > shown ? 1 : -1);
    setShown(value);
  }
  const text = new Intl.NumberFormat("en-GB").format(value);
  const chars = text.split("");
  return (
    <span className="relative inline-flex tabular-nums">
      {chars.map((ch, i) => {
        const place = chars.length - i;
        return (
          <span
            key={place}
            className="relative inline-flex h-[1.2em] overflow-hidden leading-[1.2em] [mask-image:linear-gradient(transparent,#000_22%,#000_78%,transparent)]"
          >
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.span
                key={ch}
                custom={direction}
                className="inline-block"
                variants={{
                  enter: (dir: number) => ({ y: reduce ? 0 : `${dir * 100}%`, opacity: 0 }),
                  center: { y: 0, opacity: 1 },
                  exit: (dir: number) => ({ y: reduce ? 0 : `${dir * -100}%`, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

export function SnowflakeLike({
  isSelected,
  defaultSelected = false,
  onChange,
  count,
  size = "md",
  label = "Favourite",
  className,
  ...props
}: SnowflakeLikeProps) {
  const reduce = useReducedMotion() ?? false;
  const [own, setOwn] = useState(defaultSelected);
  const [burst, setBurst] = useState(0);
  const selected = isSelected ?? own;
  const s = sizes[size];
  const total = count == null ? null : count + (selected ? 1 : 0);

  return (
    <ToggleButton
      aria-label={total == null ? label : `${label}, ${new Intl.NumberFormat("en-GB").format(total)}`}
      {...props}
      isSelected={selected}
      onChange={(next) => {
        if (isSelected === undefined) setOwn(next);
        if (next && !reduce) setBurst((b) => b + 1);
        onChange?.(next);
      }}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/like relative inline-flex shrink-0 cursor-default items-center justify-center rounded-lg font-medium whitespace-nowrap select-none outline-none",
          "text-muted-foreground transition-[scale,background-color,color] duration-200 ease-settle",
          "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:scale-[0.96]",
          "data-[selected]:text-brand data-[selected]:data-[hovered]:text-brand",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          count == null ? s.square : s.pill,
          s.text,
          cls,
        ),
      )}
    >
      <span className="relative grid shrink-0 place-items-center" style={{ width: s.icon, height: s.icon }}>
        <motion.svg
          viewBox="0 0 24 24"
          width={s.icon}
          height={s.icon}
          aria-hidden="true"
          className="overflow-visible"
          animate={selected && !reduce ? { scale: [1, 1.16, 0.97, 1] } : { scale: 1 }}
          transition={
            selected && !reduce ? { duration: 0.46, times: [0, 0.32, 0.68, 1], ease: "easeOut" } : { duration: 0.2 }
          }
        >
          <MorphPath
            d={selected ? FULL : SEED}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0.5}
            strokeLinejoin="round"
            transition={selected ? BLOOM : QUIET}
          />
          <path d={LINES} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          {burst > 0 && !reduce && (
            <g key={burst} stroke="currentColor" strokeWidth={0.9} strokeLinecap="round" fill="none">
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const a = ((-90 + k * 60) * Math.PI) / 180;
                return (
                  <motion.path
                    key={k}
                    d={FLAKE}
                    initial={{ x: 12 + Math.cos(a) * 9, y: 12 + Math.sin(a) * 9, opacity: 0, scale: 0.4, rotate: 0 }}
                    animate={{
                      x: 12 + Math.cos(a) * 16,
                      y: 12 + Math.sin(a) * 16,
                      opacity: [0, 1, 0],
                      scale: [0.4, 1, 0.6],
                      rotate: 60,
                    }}
                    transition={{
                      duration: 0.56,
                      delay: 0.06,
                      ease: [0.2, 0.7, 0.3, 1],
                      opacity: { duration: 0.56, delay: 0.06, times: [0, 0.25, 1] },
                    }}
                  />
                );
              })}
            </g>
          )}
        </motion.svg>
      </span>
      {total != null && (
        <span
          aria-hidden="true"
          className="text-muted-foreground transition-colors duration-200 group-data-[hovered]/like:text-foreground group-data-[selected]/like:text-brand-strong"
        >
          <Ticker value={total} reduce={reduce} />
        </span>
      )}
    </ToggleButton>
  );
}
