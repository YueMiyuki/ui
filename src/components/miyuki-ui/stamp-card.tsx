"use client";

import { motion, stagger, useAnimate, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useId, useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type StampMotif = "peak" | "wave" | "pine" | "lantern" | "train" | "bridge" | "teacup" | "wheel";

export interface StampSlot {
  id: string;
  label: string;
  motif: StampMotif;
}

export interface StampCardProps extends Omit<ComponentProps<"div">, "title"> {
  slots: StampSlot[];
  stamped?: string[];
  defaultStamped?: string[];
  onStamp?: (id: string) => void;
  title?: ReactNode;
  description?: ReactNode;
  ink?: string;
}

const PAPER = "var(--miyuki-stamp-card-paper)";
const DURATION = 0.52;
const CONTACT = 0.34;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";
const FIBRE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.006 0.16' numOctaves='3' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E\")";

function Motif({ motif }: { motif: StampMotif }) {
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const knock = { fill: "none", stroke: PAPER, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (motif) {
    case "peak":
      return (
        <>
          <path d="M14.5 43L26.5 23L31 28.5L35.5 23.8L49.5 43Z" fill="currentColor" />
          <path d="M26.5 23L23.8 27.5L25.6 26.4L27.4 28.6L29.2 26.6L31 28.5Z" fill={PAPER} />
          <path d="M35.5 23.8L32.4 27L34 26.2L35.6 28L37 26.4L38.2 27.5Z" fill={PAPER} />
          <path d="M20 39.5L24 37.4L27 39M33 38L37 35.6L41 38.4" {...knock} strokeWidth="1.1" />
          <circle cx="43" cy="19.5" r="3.2" {...line} strokeWidth="1.7" />
          <path d="M18 47H46" {...line} strokeWidth="1.8" />
        </>
      );
    case "wave":
      return (
        <>
          <path
            d="M14 40C16 30 24 22 34 22C42 22 48 27 47 32C46 36 41 37 39 34C37.5 31.5 40 29 42.5 30C41 26.5 36 25.5 32 27C26 29.5 24 36 26 42Z"
            fill="currentColor"
          />
          <path d="M21 37C22.5 31.5 27 27 33 25.6M24.6 39.5C25 35 27.5 31.4 31 29.6" {...knock} strokeWidth="1.1" />
          <path d="M16 45.5q4 -3 8 0t8 0t8 0t8 0" {...line} strokeWidth="1.8" />
          <path d="M21 50q3.5 -2.6 7 0t7 0t7 0" {...line} strokeWidth="1.5" />
        </>
      );
    case "pine":
      return (
        <>
          <path d="M31 47C30 42 33.5 39 31.5 34C30.2 30.5 31.2 27.5 33 25" {...line} strokeWidth="2.4" />
          <path d="M31.6 35C35 34 37 33 40 32.6M31 39C27.5 38.5 25 38 22.5 37.4" {...line} strokeWidth="1.7" />
          <path
            d="M21.5 26C22 21.5 27 19.5 30.5 21.5C32.5 18.5 38.5 18.5 40.5 22C43.5 21.5 46 24 44.5 26Z"
            fill="currentColor"
          />
          <path
            d="M14.5 37.4C15 33.9 19 32.4 22 33.9C24 31.9 28 32.4 28.5 34.9C30 35.4 30 37.4 28.5 37.4Z"
            fill="currentColor"
          />
          <path
            d="M35 33C35.5 29.5 39.5 28.5 42 30C44 28.5 48 29.5 48.5 32C50 32.5 50 34 48.5 34Z"
            fill="currentColor"
          />
          <path d="M25 24.4H40.5M18 35.9H26.5M38.6 32.3H46.4" {...knock} strokeWidth="0.9" />
          <path d="M19 47.5C24 46 28 45.6 32 45.6C37 45.6 41 46.2 45 47.5" {...line} strokeWidth="1.8" />
        </>
      );
    case "lantern":
      return (
        <>
          <path d="M32 13.5V17" {...line} strokeWidth="1.8" />
          <rect x="26" y="17" width="12" height="3.4" rx="0.8" fill="currentColor" />
          <ellipse cx="32" cy="31.5" rx="10.5" ry="11.2" {...line} strokeWidth="2.2" />
          <path d="M23.4 25H40.6M21.7 29.3H42.3M21.7 33.7H42.3M23.4 38H40.6" {...line} strokeWidth="0.9" />
          <circle cx="32" cy="31.5" r="4.6" fill="currentColor" />
          <path d="M32 28.6V34.4M29.5 30L34.5 33M29.5 33L34.5 30" {...knock} strokeWidth="0.9" />
          <rect x="27" y="42.4" width="10" height="3" rx="0.8" fill="currentColor" />
          <path d="M32 45.4V49.5" {...line} strokeWidth="1.6" />
        </>
      );
    case "train":
      return (
        <>
          <path d="M27.5 17.5L32 13.5L36.5 17.5M29.5 13.5H34.5" {...line} strokeWidth="1.5" />
          <rect x="21" y="17.5" width="22" height="25" rx="5" {...line} strokeWidth="2.2" />
          <rect x="24.5" y="21.5" width="15" height="8" rx="1.5" fill="currentColor" />
          <path d="M30.4 27.6L33.6 23.6" {...knock} strokeWidth="1" />
          <path d="M23.4 33.5H40.6" {...line} strokeWidth="1.2" />
          <circle cx="26.6" cy="37.6" r="1.7" fill="currentColor" />
          <circle cx="37.4" cy="37.6" r="1.7" fill="currentColor" />
          <path d="M22.6 42.5L21.2 45.5H42.8L41.4 42.5" {...line} strokeWidth="1.8" />
          <path d="M27 45.5L22 50.5M37 45.5L42 50.5M24.6 48H39.4" {...line} strokeWidth="1.5" />
        </>
      );
    case "bridge":
      return (
        <>
          <path d="M13 37Q32 18 51 37" {...line} strokeWidth="2.4" />
          <path d="M15.5 40.5Q32 25 48.5 40.5" {...line} strokeWidth="2" />
          <path d="M19 32V37.6M25.5 28.6V34M32 27.5V32.8M38.5 28.6V34M45 32V37.6" {...line} strokeWidth="1.4" />
          <path d="M17 39.6V44M47 39.6V44" {...line} strokeWidth="2" />
          <path d="M17 47.5q2.5 -2.2 5 0t5 0t5 0t5 0t5 0t5 0" {...line} strokeWidth="1.5" />
          <path d="M20 23L25 17.5L28.5 21L33 15.5L38 21L41.5 18.5L46 23" {...line} strokeWidth="1.4" />
        </>
      );
    case "teacup":
      return (
        <>
          <path
            d="M28.5 24.5c-2.2 -2 -2.2 -3.5 0 -5c2.2 -1.5 2.2 -3 0 -5M35.5 24.5c-2.2 -2 -2.2 -3.5 0 -5c2.2 -1.5 2.2 -3 0 -5"
            {...line}
            strokeWidth="1.6"
          />
          <path d="M20.5 28H43.5L41.5 42Q41 45 38 45H26Q23 45 22.5 42Z" {...line} strokeWidth="2.2" />
          <path d="M21.5 35H42.5L42.07 38H21.93Z" fill="currentColor" />
          <path d="M19 48.5H45" {...line} strokeWidth="2" />
        </>
      );
    case "wheel": {
      const cx = 29.5;
      const cy = 33;
      const spokes = Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4 + 0.2;
        return `M${(cx + Math.cos(a) * 2.6).toFixed(2)} ${(cy + Math.sin(a) * 2.6).toFixed(2)}L${(cx + Math.cos(a) * 12.5).toFixed(2)} ${(cy + Math.sin(a) * 12.5).toFixed(2)}`;
      }).join("");
      const paddles = Array.from({ length: 12 }, (_, k) => {
        const a = (k * Math.PI) / 6;
        return `M${(cx + Math.cos(a) * 12.5).toFixed(2)} ${(cy + Math.sin(a) * 12.5).toFixed(2)}L${(cx + Math.cos(a) * 15.6).toFixed(2)} ${(cy + Math.sin(a) * 15.6).toFixed(2)}`;
      }).join("");
      return (
        <>
          <circle cx={cx} cy={cy} r="12.5" {...line} strokeWidth="2.2" />
          <circle cx={cx} cy={cy} r="8.6" {...line} strokeWidth="0.9" />
          <path d={spokes} {...line} strokeWidth="1.3" />
          <path d={paddles} {...line} strokeWidth="2.2" />
          <circle cx={cx} cy={cy} r="2.6" fill="currentColor" />
          <path d="M36 15.5H46.5" {...line} strokeWidth="2" />
          <path d="M40.5 15.5q0.8 3.4 2.4 6M43.6 15.5q0.8 3.8 2.4 6.6" {...line} strokeWidth="1.1" />
        </>
      );
    }
  }
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Pose {
  rot: number;
  dx: number;
  dy: number;
}

function restingPose(id: string): Pose {
  const rng = createRng(`${id}:stamp`);
  return { rot: rng.range(-9, 9), dx: rng.range(-1.8, 1.8), dy: rng.range(-1.8, 1.8) };
}

function Impression({
  slot,
  pose,
  uid,
  fresh,
  reduced,
}: {
  slot: StampSlot;
  pose: Pose;
  uid: string;
  fresh: boolean;
  reduced: boolean;
}) {
  const h = hash(slot.id);
  const fid = `${uid}-ink-${h}`;
  const angle = (h % 360) * (Math.PI / 180);
  return (
    <motion.svg
      data-impression=""
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full overflow-visible text-(--miyuki-stamp-card-ink)"
      initial={fresh ? { opacity: 0, scale: reduced ? 1 : 0.985 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        reduced
          ? { duration: 0.18 }
          : {
              opacity: { duration: 0.01, delay: DURATION * CONTACT },
              scale: { duration: 0.3, delay: DURATION * CONTACT },
            }
      }
    >
      <defs>
        <filter id={fid} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={h % 997} result="warp" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="1.6"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed={(h >> 3) % 997} result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -6 0 0 0 4.3"
            result="speck"
          />
          <feComposite in="rough" in2="speck" operator="in" result="specked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={(h >> 6) % 997} result="blot" />
          <feColorMatrix
            in="blot"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 0.12"
            result="press"
          />
          <feComposite in="specked" in2="press" operator="in" />
        </filter>
        <linearGradient
          id={`${fid}-p`}
          gradientUnits="userSpaceOnUse"
          x1={32 - Math.cos(angle) * 30}
          y1={32 - Math.sin(angle) * 30}
          x2={32 + Math.cos(angle) * 30}
          y2={32 + Math.sin(angle) * 30}
        >
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.62" />
        </linearGradient>
        <mask id={`${fid}-m`} maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">
          <rect x="-8" y="-8" width="80" height="80" fill={`url(#${fid}-p)`} />
        </mask>
      </defs>
      <g mask={`url(#${fid}-m)`}>
        <g
          filter={`url(#${fid})`}
          transform={`translate(${pose.dx.toFixed(2)} ${pose.dy.toFixed(2)}) rotate(${pose.rot.toFixed(2)} 32 32)`}
        >
          <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <circle cx="32" cy="32" r="25.2" fill="none" stroke="currentColor" strokeWidth="0.9" />
          <Motif motif={slot.motif} />
        </g>
      </g>
    </motion.svg>
  );
}

function Seal({ onDone }: { onDone: () => void }) {
  const times = [0, CONTACT, 0.42, 0.52, 0.6, 1];
  return (
    <>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-full bg-[oklch(0.36_0.07_255/0.42)] blur-[6px] dark:bg-[oklch(0.12_0.04_255/0.6)] ink:bg-[oklch(0.12_0_0/0.6)]"
        initial={{ opacity: 0, scale: 1.4, x: 12, y: 18 }}
        animate={{
          opacity: [0, 0.6, 0.65, 0.6, 0.55, 0],
          scale: [1.45, 1, 1, 1, 1, 1.35],
          x: [12, 1, 1, 1, 1, 10],
          y: [18, 2, 2, 2, 2, 14],
        }}
        transition={{ duration: DURATION, times, ease: ["easeIn", "easeOut", "easeInOut", "easeOut", "easeIn"] }}
      />
      <motion.span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-1.5 rounded-full",
          "[--wood-a:oklch(0.76_0.068_68)] [--wood-b:oklch(0.715_0.074_62)] [--wood-c:oklch(0.55_0.08_52)]",
          "dark:[--wood-a:oklch(0.64_0.066_64)] dark:[--wood-b:oklch(0.6_0.07_58)] dark:[--wood-c:oklch(0.44_0.07_50)]",
        )}
        style={{
          background:
            "radial-gradient(circle at 34% 28%, oklch(1 0 0 / 0.42), transparent 46%), radial-gradient(circle at 70% 78%, oklch(0.3 0.06 50 / 0.22), transparent 50%), repeating-radial-gradient(ellipse 105% 92% at 58% 52%, var(--wood-a) 0 1.6px, var(--wood-b) 2.4px 3.2px, var(--wood-a) 4.4px 5.6px)",
          boxShadow:
            "inset 0 0 0 2px var(--wood-c), inset 0 -3px 5px oklch(0.3 0.06 50 / 0.35), 0 1px 2px oklch(0.3 0.06 250 / 0.3)",
        }}
        initial={{ opacity: 0, scale: 1.5, y: -14 }}
        animate={{ opacity: [0, 1, 1, 1, 1, 0], scale: [1.5, 1, 0.95, 1.025, 1, 1.4], y: [-14, 0, 0, 0, 0, -10] }}
        transition={{
          duration: DURATION,
          times,
          ease: ["easeIn", "easeOut", "easeInOut", "easeOut", "easeIn"],
          opacity: { duration: DURATION, times: [0, 0.14, 0.4, 0.5, 0.66, 1] },
        }}
        onAnimationComplete={onDone}
      />
    </>
  );
}

export function StampCard({
  slots,
  stamped,
  defaultStamped = [],
  onStamp,
  title,
  description,
  ink = "var(--brand-strong)",
  className,
  style,
  children,
  ...props
}: StampCardProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [own, setOwn] = useState<string[]>(defaultStamped);
  const [poses, setPoses] = useState<Record<string, Pose>>({});
  const [falling, setFalling] = useState<string[]>([]);
  const [landing, setLanding] = useState<string[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const done = new Set(stamped ?? own);
  const count = slots.filter((s) => done.has(s.id)).length;
  const shown = count - landing.filter((id) => done.has(id)).length;
  const shownComplete = slots.length > 0 && shown === slots.length;

  function stamp(id: string) {
    if (done.has(id)) return;
    setPoses((p) => ({
      ...p,
      [id]: { rot: (Math.random() - 0.5) * 18, dx: (Math.random() - 0.5) * 3.6, dy: (Math.random() - 0.5) * 3.6 },
    }));
    if (!reduced) {
      setFalling((f) => [...f, id]);
      setLanding((l) => [...l, id]);
      window.setTimeout(() => setLanding((l) => l.filter((x) => x !== id)), DURATION * CONTACT * 1000);
    }
    if (stamped === undefined) setOwn((o) => [...o, id]);
    onStamp?.(id);
    if (reduced || !scope.current) return;
    animate(scope.current, { y: [0, 1.4, 0] }, { duration: 0.2, delay: DURATION * CONTACT, ease: "easeOut" });
    const last = slots.every((s) => s.id === id || done.has(s.id));
    if (last) {
      animate(
        "[data-impression]",
        { scale: [1, 1.07, 1], rotate: [0, 2.5, 0] },
        { duration: 0.5, delay: stagger(0.06, { startDelay: DURATION + 0.18 }), ease: "easeInOut" },
      );
    }
  }

  return (
    <div
      {...props}
      ref={scope}
      className={cn(
        "relative isolate overflow-clip rounded-xl bg-(--miyuki-stamp-card-paper) p-5 shadow-md sm:p-7",
        "[--miyuki-stamp-card-paper:oklch(0.986_0.008_86)] dark:[--miyuki-stamp-card-paper:oklch(0.86_0.014_82)]",
        "ring-1 ring-[oklch(0.42_0.05_70/0.1)] dark:ring-[oklch(1_0_0/0.08)]",
        className,
      )}
      style={style}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-multiply dark:opacity-[0.1]"
        style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: FIBRE, backgroundSize: "300px 300px" }}
      />
      <div className="light relative text-foreground" style={{ "--miyuki-stamp-card-ink": ink } as CSSProperties}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 rounded-md border border-(--miyuki-stamp-card-ink) opacity-25 sm:-inset-4"
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em] text-balance">
                {title}
              </h3>
            ) : null}
            {description ? <p className="mt-1 text-[13px] text-foreground/80">{description}</p> : null}
          </div>
          <p
            aria-live="polite"
            className={cn(
              "mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap tabular-nums transition-colors duration-300",
              shownComplete
                ? "border-transparent bg-(--miyuki-stamp-card-ink) text-brand-foreground"
                : "border-[color-mix(in_oklab,var(--miyuki-stamp-card-ink)_35%,transparent)] text-(--miyuki-stamp-card-ink)",
            )}
          >
            {shown} of {slots.length}
          </p>
        </div>
        <ul className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4">
          {slots.map((slot) => {
            const isDone = done.has(slot.id);
            const pose = poses[slot.id] ?? restingPose(slot.id);
            const isFalling = falling.includes(slot.id);
            return (
              <li key={slot.id} className="flex min-w-0 flex-col items-center gap-2">
                <button
                  type="button"
                  aria-label={isDone ? `${slot.label}, stamped` : `Stamp ${slot.label}`}
                  aria-disabled={isDone || undefined}
                  onClick={() => stamp(slot.id)}
                  className={cn(
                    "group/slot relative size-14 shrink-0 rounded-full outline-none sm:size-16",
                    "focus-visible:ring-[3px] focus-visible:ring-ring",
                    !isDone && "cursor-pointer",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-[3px] rounded-full border-[1.5px] border-dashed transition-[opacity,background-color,border-color] duration-200",
                      "border-[color-mix(in_oklab,var(--miyuki-stamp-card-ink)_32%,transparent)]",
                      "group-hover/slot:border-[color-mix(in_oklab,var(--miyuki-stamp-card-ink)_60%,transparent)] group-hover/slot:bg-[color-mix(in_oklab,var(--miyuki-stamp-card-ink)_5%,transparent)]",
                      isDone && "opacity-0",
                    )}
                  />
                  {isDone ? (
                    <Impression slot={slot} pose={pose} uid={uid} fresh={slot.id in poses} reduced={reduced} />
                  ) : null}
                  {isFalling ? <Seal onDone={() => setFalling((f) => f.filter((x) => x !== slot.id))} /> : null}
                </button>
                <span className="max-w-[calc(100%+0.75rem)] truncate text-[11px] tracking-[-0.01em] text-foreground/80 sm:text-xs sm:tracking-normal">
                  {slot.label}
                </span>
              </li>
            );
          })}
        </ul>
        {children}
      </div>
    </div>
  );
}
