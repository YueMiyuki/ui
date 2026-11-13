"use client";

import { type CSSProperties, type ReactNode, type Ref, type SVGProps, useId } from "react";
import { cn } from "@/lib/utils";

export type WeatherKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "rain"
  | "sleet"
  | "snow"
  | "heavy-snow"
  | "wind"
  | "thunder"
  | "clear-night";

export type WeatherIconAnimate = "always" | "hover" | "never";

export interface WeatherIconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  kind: WeatherKind;
  size?: number;
  animate?: WeatherIconAnimate;
  label?: string;
  ref?: Ref<SVGSVGElement>;
}

type Circle = [cx: number, cy: number, r: number];

const keyframes = `
@keyframes miyuki-weather-icon-ray {
  0%, 24%, 100% { transform: scale(1); opacity: 1; }
  10% { transform: scale(1.14); opacity: 0.55; }
}
@keyframes miyuki-weather-icon-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025, 1.045); }
}
@keyframes miyuki-weather-icon-fall {
  0% { transform: translate(0, 0); opacity: 1; }
  50% { transform: translate(-1px, 3px); opacity: 0; }
  50.01% { transform: translate(1px, -3px); opacity: 0; }
  100% { transform: translate(0, 0); opacity: 1; }
}
@keyframes miyuki-weather-icon-flake {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  50% { transform: translate(0.9px, 2.6px) rotate(70deg); opacity: 0; }
  50.01% { transform: translate(-0.9px, -2.6px) rotate(-70deg); opacity: 0; }
  100% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
}
@keyframes miyuki-weather-icon-gust {
  0%, 20% { stroke-dashoffset: 0; }
  80%, 100% { stroke-dashoffset: -1.3; }
}
@keyframes miyuki-weather-icon-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(var(--miyuki-weather-icon-shift, 1px)); }
}
@keyframes miyuki-weather-icon-flash {
  0%, 80%, 86%, 100% { opacity: 1; }
  82%, 88% { opacity: 0.25; }
}
@keyframes miyuki-weather-icon-twinkle {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.55); opacity: 0.45; }
}
@keyframes miyuki-weather-icon-sway {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-6deg); }
}
`;

const MOTION = {
  ray: [
    "motion-safe:animate-[miyuki-weather-icon-ray_4s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-ray_4s_ease-in-out_infinite_both]",
  ],
  breathe: [
    "motion-safe:animate-[miyuki-weather-icon-breathe_5.5s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-breathe_5.5s_ease-in-out_infinite_both]",
  ],
  fall: [
    "motion-safe:animate-[miyuki-weather-icon-fall_1.5s_linear_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-fall_1.5s_linear_infinite_both]",
  ],
  flake: [
    "motion-safe:animate-[miyuki-weather-icon-flake_3.6s_linear_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-flake_3.6s_linear_infinite_both]",
  ],
  gust: [
    "motion-safe:animate-[miyuki-weather-icon-gust_3.6s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-gust_3.6s_ease-in-out_infinite_both]",
  ],
  drift: [
    "motion-safe:animate-[miyuki-weather-icon-drift_6s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-drift_6s_ease-in-out_infinite_both]",
  ],
  flash: [
    "motion-safe:animate-[miyuki-weather-icon-flash_4.5s_linear_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-flash_4.5s_linear_infinite_both]",
  ],
  twinkle: [
    "motion-safe:animate-[miyuki-weather-icon-twinkle_3.2s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-twinkle_3.2s_ease-in-out_infinite_both]",
  ],
  sway: [
    "motion-safe:animate-[miyuki-weather-icon-sway_7s_ease-in-out_infinite_both]",
    "motion-safe:group-hover/weather:animate-[miyuki-weather-icon-sway_7s_ease-in-out_infinite_both]",
  ],
} as const;

type Motion = keyof typeof MOTION;

const n = (v: number) => String(Math.round(v * 100) / 100);
const deg = (a: number) => (a * 180) / Math.PI;

function meet(a: Circle, b: Circle): [number, number] {
  const [x0, y0, r0] = a;
  const [x1, y1, r1] = b;
  const d = Math.hypot(x1 - x0, y1 - y0);
  const l = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - l * l));
  const mx = x0 + ((x1 - x0) * l) / d;
  const my = y0 + ((y1 - y0) * l) / d;
  const p: [number, number] = [mx + ((y1 - y0) * h) / d, my - ((x1 - x0) * h) / d];
  const q: [number, number] = [mx - ((y1 - y0) * h) / d, my + ((x1 - x0) * h) / d];
  return p[1] < q[1] ? p : q;
}

function arcTo([cx, cy, r]: Circle, from: [number, number], to: [number, number]) {
  const a0 = deg(Math.atan2(from[1] - cy, from[0] - cx));
  const a1 = deg(Math.atan2(to[1] - cy, to[0] - cx));
  const span = (((a1 - a0) % 360) + 360) % 360;
  return `A${n(r)} ${n(r)} 0 ${span > 180 ? 1 : 0} 1 ${n(to[0])} ${n(to[1])}`;
}

function cloud(left: Circle, top: Circle, right: Circle) {
  const base = left[1] + left[2];
  const start: [number, number] = [left[0], base];
  const end: [number, number] = [right[0], base];
  const lt = meet(left, top);
  const tr = meet(top, right);
  return `M${n(start[0])} ${n(base)}${arcTo(left, start, lt)}${arcTo(top, lt, tr)}${arcTo(right, tr, end)}Z`;
}

function crescent(outer: Circle, bite: Circle) {
  const [x0, y0, r0] = outer;
  const [x1, y1, r1] = bite;
  const d = Math.hypot(x1 - x0, y1 - y0);
  const l = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - l * l));
  const mx = x0 + ((x1 - x0) * l) / d;
  const my = y0 + ((y1 - y0) * l) / d;
  const p: [number, number] = [mx - ((y1 - y0) * h) / d, my + ((x1 - x0) * h) / d];
  const q: [number, number] = [mx + ((y1 - y0) * h) / d, my - ((x1 - x0) * h) / d];
  return `M${n(p[0])} ${n(p[1])}A${n(r0)} ${n(r0)} 0 1 1 ${n(q[0])} ${n(q[1])}A${n(r1)} ${n(r1)} 0 0 0 ${n(p[0])} ${n(p[1])}Z`;
}

const BIG = cloud([7.25, 14.75, 3.25], [12.25, 10.75, 4.75], [17, 14, 4]);
const BACK = cloud([14.5, 8.5, 2.5], [17.5, 6.75, 3], [20.25, 8.75, 2.25]);
const HIGH = cloud([7.5, 11, 3], [12, 7.5, 4.5], [16.75, 10.5, 3.5]);
const FOG = cloud([7.5, 10, 3], [12, 6.5, 4.5], [16.75, 9.5, 3.5]);
const LOW = cloud([11, 16.25, 2.75], [14.75, 13, 4.25], [18.75, 15.75, 3.25]);
const MOON = crescent([11.25, 12.75, 7.75], [16.75, 7.75, 6]);
const BOLT = "M13.25 14L10 18.75L12.75 18.75L11.25 22.75L15.25 17L12.5 17L14.25 14Z";

function rays(cx: number, cy: number, r0: number, r1: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M${n(cx + c * r0)} ${n(cy + s * r0)}L${n(cx + c * r1)} ${n(cy + s * r1)}`;
  });
}

function flake(cx: number, cy: number, r: number) {
  return [90, 30, -30]
    .map((a) => {
      const c = Math.cos((a * Math.PI) / 180) * r;
      const s = Math.sin((a * Math.PI) / 180) * r;
      return `M${n(cx - c)} ${n(cy - s)}L${n(cx + c)} ${n(cy + s)}`;
    })
    .join("");
}

const SUN_RAYS = rays(12, 12, 6.5, 8.75);
const SMALL_RAYS = rays(8.75, 8.75, 5.25, 7);

function streak(x: number, y: number) {
  return `M${n(x)} ${n(y)}L${n(x - 1)} ${n(y + 3)}`;
}

const SUN = "var(--miyuki-weather-icon-sun, var(--warning))";
const WATER = "var(--miyuki-weather-icon-water, var(--brand))";

export function WeatherIcon({ kind, size = 24, animate = "always", label, className, ...props }: WeatherIconProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const mode = animate === "always" ? 0 : animate === "hover" ? 1 : null;
  const run = (motion: Motion) => (mode === null ? undefined : MOTION[motion][mode]);
  const at = (motion: Motion, delay: number, style?: CSSProperties) => ({
    className: run(motion),
    style: mode === null ? style : { ...style, animationDelay: `${delay}s` },
  });
  const fillBox: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
  const cloudBox: CSSProperties = { transformBox: "fill-box", transformOrigin: "50% 100%" };
  const around = (x: number, y: number): CSSProperties => ({
    transformBox: "view-box",
    transformOrigin: `${x}px ${y}px`,
  });

  const hide = (id: string, shape: string) => (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
      <rect width="24" height="24" fill="#fff" />
      <path d={shape} fill="#000" stroke="#000" strokeWidth={3.5} strokeLinejoin="round" />
    </mask>
  );

  const sunRays = (paths: string[], cx: number, cy: number) =>
    paths.map((d, i) => <path key={i} d={d} {...at("ray", i * 0.5, around(cx, cy))} />);

  const body = (d: string) => <path d={d} {...at("breathe", 0, cloudBox)} />;

  const drops = (list: [number, number][]) =>
    list.map(([x, y], i) => <path key={i} d={streak(x, y)} stroke={WATER} {...at("fall", i * 0.5)} />);

  const flakes = (list: [number, number, number][], step: number) =>
    list.map(([x, y, r], i) => (
      <path key={i} d={flake(x, y, r)} stroke={WATER} strokeWidth={1.25} {...at("flake", i * step, fillBox)} />
    ));

  let art: ReactNode;
  switch (kind) {
    case "clear":
      art = (
        <>
          <circle cx="12" cy="12" r="4" fill={SUN} />
          {sunRays(SUN_RAYS, 12, 12)}
        </>
      );
      break;
    case "partly-cloudy":
      art = (
        <>
          <defs>{hide(`${uid}-cloud`, LOW)}</defs>
          <g mask={`url(#${uid}-cloud)`}>
            <circle cx="8.75" cy="8.75" r="3.25" fill={SUN} />
            {sunRays(SMALL_RAYS, 8.75, 8.75)}
          </g>
          {body(LOW)}
        </>
      );
      break;
    case "cloudy":
      art = (
        <>
          <defs>{hide(`${uid}-front`, BIG)}</defs>
          <g mask={`url(#${uid}-front)`}>
            <path d={BACK} {...at("drift", 0, { "--miyuki-weather-icon-shift": "-0.9px" } as CSSProperties)} />
          </g>
          {body(BIG)}
        </>
      );
      break;
    case "fog":
      art = (
        <>
          {body(FOG)}
          <path d="M4.5 16.5L14 16.5M16.75 16.5L19.5 16.5" {...at("drift", 0)} />
          <path
            d="M6.5 19.5L9 19.5M11.5 19.5L20 19.5"
            {...at("drift", 1.4, { "--miyuki-weather-icon-shift": "-1.25px" } as CSSProperties)}
          />
          <path d="M5.5 22.5L15.5 22.5" {...at("drift", 2.6)} />
        </>
      );
      break;
    case "rain":
      art = (
        <>
          {body(HIGH)}
          {drops([
            [9, 16.5],
            [13, 17.75],
            [17, 16.5],
          ])}
        </>
      );
      break;
    case "sleet":
      art = (
        <>
          {body(HIGH)}
          {drops([
            [8.75, 16.5],
            [16.75, 16.5],
          ])}
          {flakes([[12.5, 19.75, 2]], 0)}
        </>
      );
      break;
    case "snow":
      art = (
        <>
          {body(HIGH)}
          {flakes(
            [
              [7.75, 18, 2.1],
              [12.25, 20.5, 2.1],
              [16.75, 18, 2.1],
            ],
            1.2,
          )}
        </>
      );
      break;
    case "heavy-snow":
      art = (
        <>
          {body(HIGH)}
          {flakes(
            [
              [6.5, 17.25, 1.75],
              [12, 17.25, 1.75],
              [17.5, 17.25, 1.75],
              [9.25, 21.5, 1.75],
              [14.75, 21.5, 1.75],
            ],
            0.72,
          )}
        </>
      );
      break;
    case "wind":
      art = [
        "M3 9L12.5 9A2.5 2.5 0 1 0 10 6.5",
        "M3 13L18 13A2.5 2.5 0 1 0 15.5 10.5",
        "M3 17L13.5 17A2.5 2.5 0 1 1 11 19.5",
      ].map((d, i) => <path key={i} d={d} pathLength={1} strokeDasharray="1 0.3" {...at("gust", [0, 0.5, 1.1][i])} />);
      break;
    case "thunder":
      art = (
        <>
          {body(HIGH)}
          <path d={BOLT} fill={SUN} {...at("flash", 0)} />
        </>
      );
      break;
    case "clear-night":
      art = (
        <>
          <path d={MOON} fill={SUN} {...at("sway", 0, around(11.25, 12.75))} />
          <path d="M18.5 2.75L18.5 6.25M16.75 4.5L20.25 4.5" {...at("twinkle", 0, fillBox)} />
          <path d="M21 9.75L21 12.25M19.75 11L22.25 11" {...at("twinkle", 1.6, fillBox)} />
        </>
      );
      break;
  }

  return (
    <>
      <style href="miyuki-weather-icon" precedence="miyuki">
        {keyframes}
      </style>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        className={cn("group/weather shrink-0 overflow-visible", className)}
        {...props}
      >
        {art}
      </svg>
    </>
  );
}
