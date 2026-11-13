"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StationClockProps extends Omit<ComponentProps<"figure">, "children"> {
  timeZone?: string;
  size?: number;
  label?: ReactNode;
  seconds?: boolean;
  ref?: Ref<HTMLElement>;
}

const FIXED = (10 * 3600 + 9 * 60 + 36) * 1000;
const SET_MS = 900;

const ZETA = 0.42;
const OMEGA = 30;
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);
function jump(t: number) {
  if (t <= 0) return 0;
  if (t > 0.6) return 1;
  return 1 - Math.exp(-ZETA * OMEGA * t) * (Math.cos(OMEGA_D * t) + ((ZETA * OMEGA) / OMEGA_D) * Math.sin(OMEGA_D * t));
}

function angles(local: number, still = false) {
  const day = ((local % 86_400_000) + 86_400_000) % 86_400_000;
  const total = Math.floor(day / 60_000);
  const into = (day % 60_000) / 1000;
  const minute = still ? total : total - 1 + jump(into);
  return {
    second: ((still ? Math.floor(day / 1000) : day / 1000) % 60) * 6,
    minute: (minute % 60) * 6,
    hour: ((minute / 60) % 12) * 30,
  };
}

function zoneOffset(epoch: number, timeZone: string | undefined) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(epoch);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return wall - Math.floor(epoch / 1000) * 1000;
  } catch {
    return -new Date(epoch).getTimezoneOffset() * 60_000;
  }
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const FIXED_ANGLES = angles(FIXED);
const rotation = (a: number, c: number) => `rotate(${r2(a)} ${r2(c)} ${r2(c)})`;

function hand(r: number, tail: number, tip: number, base: number, end: number) {
  const c = r;
  return `M${r2(c - base / 2)} ${r2(c + tail)}L${r2(c - end / 2)} ${r2(c - tip)}L${r2(c + end / 2)} ${r2(c - tip)}L${r2(c + base / 2)} ${r2(c + tail)}Z`;
}

export function StationClock({
  timeZone,
  size = 180,
  label,
  seconds = true,
  className,
  ref,
  ...props
}: StationClockProps) {
  const reduce = useReducedMotion() === true;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);
  const [spoken, setSpoken] = useState<string | null>(null);

  const S = size;
  const r = S / 2;
  const bezel = Math.max(1.5, S * 0.018);
  const face = r - bezel / 2 - 0.5;
  const outer = face - bezel / 2 - Math.max(2, S * 0.026);
  const tick = Math.max(1, S * 0.0075);
  const bar = Math.max(2, S * 0.024);
  const fixed = FIXED_ANGLES;
  const rot = (a: number) => rotation(a, r);

  useEffect(() => {
    const els = { hour: hourRef.current, minute: minuteRef.current, second: secondRef.current };
    const root = els.hour?.ownerSVGElement;
    if (!root || !els.hour || !els.minute) return;
    const epoch0 = Date.now();
    const perf0 = performance.now();
    let offset = zoneOffset(epoch0, timeZone);
    let lastMinute = -1;
    let frame = 0;
    let timer = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== "hidden";
    const speak = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
    const from = { ...FIXED_ANGLES };
    const c = size / 2;
    const wrapForward = (a: number, b: number) => b + Math.ceil((a - b) / 360) * 360;

    const paint = (now: number) => {
      const epoch = epoch0 + (now - perf0);
      const minuteIndex = Math.floor(epoch / 60_000);
      if (minuteIndex !== lastMinute) {
        lastMinute = minuteIndex;
        offset = zoneOffset(epoch, timeZone);
        setSpoken(speak.format(epoch));
      }
      const a = angles(epoch + offset, reduce);
      const k = reduce ? 1 : Math.min(1, (now - perf0) / SET_MS);
      if (k < 1) {
        const e = 1 - (1 - k) ** 3;
        a.hour = from.hour + (wrapForward(a.hour, from.hour) - from.hour) * e;
        a.minute = from.minute + (wrapForward(a.minute, from.minute) - from.minute) * e;
        a.second = from.second + (wrapForward(a.second, from.second) - from.second) * e;
      }
      els.hour?.setAttribute("transform", rotation(a.hour, c));
      els.minute?.setAttribute("transform", rotation(a.minute, c));
      els.second?.setAttribute("transform", rotation(a.second, c));
      return { epoch, settling: k < 1 };
    };

    const schedule = () => {
      if (frame || timer || !visible || !pageVisible) return;
      if (seconds && reduce) {
        const epoch = epoch0 + (performance.now() - perf0);
        timer = window.setTimeout(
          () => {
            timer = 0;
            frame = requestAnimationFrame(loop);
          },
          1000 - (epoch % 1000) + 5,
        );
        return;
      }
      if (seconds) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const epoch = epoch0 + (performance.now() - perf0);
      const into = epoch % 60_000;
      if (into < 700) frame = requestAnimationFrame(loop);
      else
        timer = window.setTimeout(() => {
          timer = 0;
          frame = requestAnimationFrame(loop);
        }, 60_000 - into);
    };
    const loop = (now: number) => {
      frame = 0;
      const { settling } = paint(now);
      if (settling && !seconds) {
        frame = requestAnimationFrame(loop);
        return;
      }
      schedule();
    };

    if (paint(performance.now()).settling) frame = requestAnimationFrame(loop);
    else schedule();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    io.observe(root);
    const onVisibility = () => {
      pageVisible = document.visibilityState !== "hidden";
      if (pageVisible) schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timeZone, seconds, reduce, size]);

  const name = typeof label === "string" ? label : "Clock";

  return (
    <figure ref={ref} {...props} className={cn("inline-flex flex-col items-center gap-3", className)}>
      <svg
        width={S}
        height={S}
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-label={spoken ? `${name}, ${spoken}` : name}
        className="block max-w-full overflow-visible"
        style={{ height: "auto" }}
      >
        <defs>
          <radialGradient id={`${uid}-dish`} cx="50%" cy="46%" r="52%">
            <stop offset="72%" stopColor="var(--brand)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--brand)" className="[stop-opacity:0.07] dark:[stop-opacity:0.1]" />
          </radialGradient>
          <filter id={`${uid}-lift`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy={r2(S * 0.008)}
              stdDeviation={r2(Math.max(0.6, S * 0.007))}
              className="[flood-color:color-mix(in_oklab,var(--foreground)_70%,var(--brand))] [flood-opacity:0.2] dark:[flood-color:color-mix(in_oklab,var(--background)_50%,black)] dark:[flood-opacity:0.6]"
            />
          </filter>
        </defs>
        <circle cx={r} cy={r} r={face} className="fill-card" />
        <circle cx={r} cy={r} r={face} fill={`url(#${uid}-dish)`} />
        <circle
          cx={r}
          cy={r}
          r={face}
          fill="none"
          strokeWidth={bezel}
          className="stroke-foreground/85 dark:stroke-foreground/30"
        />
        <g className="fill-foreground">
          {Array.from({ length: 60 }, (_, i) => {
            const major = i % 5 === 0;
            const len = major ? r * 0.2 : r * 0.065;
            const w = major ? bar : tick;
            if (!major && S < 72) return null;
            return (
              <rect
                key={i}
                x={r2(r - w / 2)}
                y={r2(r - outer)}
                width={r2(w)}
                height={r2(len)}
                transform={i ? rot(i * 6) : undefined}
                className={major ? undefined : "opacity-70"}
              />
            );
          })}
        </g>
        <g filter={`url(#${uid}-lift)`}>
          <g ref={hourRef} transform={rot(fixed.hour)}>
            <path d={hand(r, r * 0.13, r * 0.54, r * 0.085, r * 0.062)} className="fill-foreground" />
          </g>
          <g ref={minuteRef} transform={rot(fixed.minute)}>
            <path d={hand(r, r * 0.16, r * 0.84, r * 0.066, r * 0.044)} className="fill-foreground" />
          </g>
          <circle cx={r} cy={r} r={r2(r * 0.06)} className="fill-foreground" />
          {seconds && (
            <g ref={secondRef} transform={rot(fixed.second)} className="fill-brand">
              <rect
                x={r2(r - Math.max(0.6, S * 0.0045))}
                y={r2(r - r * 0.86)}
                width={r2(Math.max(1.2, S * 0.009))}
                height={r2(r * 0.86 + r * 0.26)}
              />
              <rect
                x={r2(r - r * 0.026)}
                y={r2(r + r * 0.1)}
                width={r2(r * 0.052)}
                height={r2(r * 0.17)}
                rx={r2(r * 0.012)}
              />
              <circle cx={r} cy={r} r={r2(r * 0.042)} />
            </g>
          )}
          <circle cx={r} cy={r} r={r2(Math.max(1, r * 0.017))} className="fill-card" />
        </g>
      </svg>
      {label != null && <figcaption className="text-sm font-medium text-foreground">{label}</figcaption>}
    </figure>
  );
}
