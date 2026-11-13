"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useState } from "react";
import {
  composeRenderProps,
  Label,
  RadioButton,
  RadioField,
  RadioGroup,
  type RadioGroupProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export interface RatingCrystalsProps
  extends Omit<RadioGroupProps, "value" | "defaultValue" | "onChange" | "children" | "orientation"> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  label?: ReactNode;
  readOnly?: boolean;
  ref?: Ref<HTMLDivElement>;
}

interface Branch {
  at: number;
  len: number;
}

interface Habit {
  reach: number;
  core: number;
  hub: number;
  branches: Branch[];
  tip: number;
}

const HABITS: Habit[] = [
  { reach: 9.6, core: 0, hub: 0, branches: [], tip: 0 },
  { reach: 10, core: 0, hub: 0, branches: [{ at: 5.8, len: 3.4 }], tip: 0 },
  {
    reach: 10.2,
    core: 0,
    hub: 0,
    branches: [
      { at: 4.4, len: 2.7 },
      { at: 7.3, len: 2.5 },
    ],
    tip: 0,
  },
  { reach: 10.2, core: 3.1, hub: 0, branches: [{ at: 6.3, len: 2.9 }], tip: 1.55 },
  {
    reach: 10.4,
    core: 3.4,
    hub: 0,
    branches: [
      { at: 5.4, len: 2.4 },
      { at: 7.5, len: 2 },
    ],
    tip: 1.8,
  },
];

const ARMS = [0, 60, 120, 180, 240, 300];
const SEED = 2.3;
const COS60 = 0.5;
const SIN60 = Math.sqrt(3) / 2;
const r2 = (v: number) => Math.round(v * 100) / 100;

function hexagon(cx: number, cy: number, r: number) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    d += `${i ? "L" : "M"}${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

function habitFor(index: number, max: number) {
  if (max <= 1) return HABITS[HABITS.length - 1];
  return HABITS[Math.round((index / (max - 1)) * (HABITS.length - 1))];
}

function Crystal({
  habit,
  grown,
  order,
  reduce,
  size,
}: {
  habit: Habit;
  grown: boolean;
  order: number;
  reduce: boolean;
  size: number;
}) {
  const start = habit.core;
  const armLen = habit.reach - start;
  const unit = 24 / size;
  const arm = (1.2 + size * 0.017) * unit;
  const twig = arm * 0.78;
  const rim = arm * 0.68;
  const tipAt = habit.reach - (habit.tip > 0 ? habit.tip * 2 : 0);
  const delay = grown && !reduce ? order * 0.05 : 0;
  const grow = (from: number, span: number): Transition =>
    reduce
      ? { duration: 0 }
      : grown
        ? { duration: span, delay: delay + from, ease: [0.22, 1, 0.36, 1] }
        : { duration: 0.12, ease: "easeOut" };
  const armTime = 0.26;

  return (
    <g>
      {habit.core > 0 && (
        <motion.path
          d={hexagon(0, 0, habit.core)}
          className="fill-current/15"
          strokeWidth={rim}
          initial={false}
          animate={{ scale: grown ? 1 : 0.4, opacity: grown ? 1 : 0 }}
          transition={grow(0, 0.22)}
        />
      )}
      {habit.hub > 0 && (
        <motion.path
          d={hexagon(0, 0, habit.hub)}
          className="fill-current/40"
          strokeWidth={rim * 0.8}
          initial={false}
          animate={{ scale: grown ? 1 : 0, opacity: grown ? 1 : 0 }}
          transition={grow(0.12, 0.2)}
        />
      )}
      {ARMS.map((deg) => (
        <g key={deg} transform={deg ? `rotate(${deg})` : undefined}>
          <motion.path
            d={`M0 ${r2(-start)}L0 ${r2(-tipAt)}`}
            pathLength={1}
            strokeWidth={arm}
            initial={false}
            animate={{
              pathLength: grown ? 1 : start > 0 ? 0 : Math.min(1, SEED / tipAt),
              opacity: grown || start === 0 ? 1 : 0,
            }}
            transition={grow(start > 0 ? 0.1 : 0, armTime)}
          />
          {habit.branches.map((b, i) => {
            const y = -b.at;
            const when = (start > 0 ? 0.1 : 0) + armTime * ((b.at - start) / armLen) * 0.85;
            return [-1, 1].map((side) => (
              <motion.path
                key={`${i}${side}`}
                d={`M0 ${r2(y)}L${r2(side * b.len * SIN60)} ${r2(y - b.len * COS60)}`}
                pathLength={1}
                strokeWidth={twig}
                initial={false}
                animate={{ pathLength: grown ? 1 : 0, opacity: grown ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : grown
                      ? {
                          pathLength: { duration: 0.16, delay: delay + when, ease: "easeOut" },
                          opacity: { duration: 0.02, delay: delay + when },
                        }
                      : { duration: 0.1 }
                }
              />
            ));
          })}
          {habit.tip > 0 && (
            <motion.path
              d={hexagon(0, -(tipAt + habit.tip), habit.tip)}
              className="fill-current/20"
              strokeWidth={rim}
              initial={false}
              animate={{ scale: grown ? 1 : 0, opacity: grown ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : grown
                    ? {
                        type: "spring",
                        stiffness: 500,
                        damping: 26,
                        delay: delay + (start > 0 ? 0.1 : 0) + armTime * 0.9,
                      }
                    : { duration: 0.1 }
              }
              style={{ originY: 1 }}
            />
          )}
        </g>
      ))}
      {start > 0 && (
        <motion.path
          d={ARMS.map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            return `M0 0L${r2(Math.cos(a) * SEED)} ${r2(Math.sin(a) * SEED)}`;
          }).join("")}
          strokeWidth={arm}
          initial={false}
          animate={{ opacity: grown ? 0 : 1 }}
          transition={grow(0, 0.12)}
        />
      )}
    </g>
  );
}

export function RatingCrystals({
  value,
  defaultValue = 0,
  onChange,
  max = 5,
  size = 28,
  label,
  readOnly = false,
  className,
  ...props
}: RatingCrystalsProps) {
  const reduce = useReducedMotion() === true;
  const [own, setOwn] = useState(defaultValue);
  const current = Math.max(0, Math.min(max, Math.round(value ?? own)));
  const [hover, setHover] = useState<number | null>(null);
  const [from, setFrom] = useState(current);
  const [shownValue, setShownValue] = useState(current);
  if (shownValue !== current) {
    setFrom(shownValue);
    setShownValue(current);
  }
  const preview = readOnly ? null : hover;
  const reach = preview ?? current;
  const count = Math.max(1, Math.floor(max));

  return (
    <RadioGroup
      {...props}
      aria-label={label == null ? (props["aria-label"] ?? "Rating") : undefined}
      orientation="horizontal"
      isReadOnly={readOnly}
      value={current ? String(current) : null}
      onChange={(v) => {
        const n = Number(v);
        if (value === undefined) setOwn(n);
        onChange?.(n);
      }}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-2 data-[disabled]:opacity-50", cls))}
    >
      {label != null && <Label className="text-sm font-medium text-foreground">{label}</Label>}
      <div className="-mx-1 flex items-center" onPointerLeave={() => setHover(null)}>
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          const grown = n <= reach;
          const chosen = n <= current;
          const order = grown && n > Math.min(from, reach) ? n - Math.min(from, reach) - 1 : 0;
          return (
            <RadioField key={n} value={String(n)} className="flex">
              <RadioButton
                aria-label={`${n} of ${count}`}
                onHoverStart={() => setHover(n)}
                onHoverEnd={() => setHover((h) => (h === n ? null : h))}
                className={({ isFocusVisible, isPressed }) =>
                  cn(
                    "relative grid place-items-center rounded-full p-1 outline-none select-none",
                    readOnly ? "cursor-default" : "cursor-pointer",
                    "transition-[transform,box-shadow] duration-150 ease-settle",
                    isPressed && "scale-[0.92]",
                    isFocusVisible && "ring-[3px] ring-ring",
                  )
                }
              >
                <svg
                  viewBox="-12 -12 24 24"
                  width={size}
                  height={size}
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "block overflow-visible transition-[color,opacity] duration-200 ease-settle",
                    grown ? "text-brand" : "text-border-strong",
                    grown && !chosen && "opacity-50",
                    !grown && chosen && "opacity-60",
                  )}
                >
                  <Crystal
                    habit={habitFor(i, count)}
                    grown={grown || (chosen && preview !== null)}
                    order={order}
                    reduce={reduce}
                    size={size}
                  />
                </svg>
              </RadioButton>
            </RadioField>
          );
        })}
      </div>
    </RadioGroup>
  );
}
