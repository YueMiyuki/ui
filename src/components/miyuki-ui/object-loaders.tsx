"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useId } from "react";
import { cn } from "@/lib/utils";

export interface ObjectLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";
const BREATHE = "cubic-bezier(0.45, 0.05, 0.25, 1)";
const DROP = "cubic-bezier(0.55, 0, 0.9, 0.45)";

const keyframes = `
@keyframes miyuki-object-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes miyuki-object-loaders-steam { 0% { translate: 0 1.5px; opacity: 0; } 30% { opacity: 1; } 100% { translate: 0 -1.5px; opacity: 0; } }
@keyframes miyuki-object-loaders-sway { 0%, 100% { transform: translateX(-0.5px); } 50% { transform: translateX(0.5px); } }
@keyframes miyuki-object-loaders-bob { 0%, 100% { transform: translateX(-0.4px); } 50% { transform: translateX(0.4px); } }
@keyframes miyuki-object-loaders-streak { 0% { transform: translateX(-6px); opacity: 0; } 30% { opacity: 0.8; } 100% { transform: translateX(-12.5px); opacity: 0; } }
@keyframes miyuki-object-loaders-swing {
  0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.3, 0.6, 0.4, 1); }
  6% { transform: rotate(14deg); animation-timing-function: ${BREATHE}; }
  19% { transform: rotate(-11deg); animation-timing-function: ${BREATHE}; }
  32% { transform: rotate(8deg); animation-timing-function: ${BREATHE}; }
  44% { transform: rotate(-5deg); animation-timing-function: ${BREATHE}; }
  55% { transform: rotate(2deg); animation-timing-function: ${BREATHE}; }
  65%, 100% { transform: rotate(0deg); }
}
@keyframes miyuki-object-loaders-chime {
  0%, 4% { transform: translateX(0); opacity: 0; }
  7% { transform: translateX(0.4px); opacity: 1; }
  16% { transform: translateX(1.8px); opacity: 0; }
  17% { transform: translateX(0); opacity: 0; }
  20% { transform: translateX(0.4px); opacity: 0.8; }
  29%, 100% { transform: translateX(1.8px); opacity: 0; }
}
@keyframes miyuki-object-loaders-turn { 0%, 22.22% { transform: rotate(0deg); } 50%, 72.22% { transform: rotate(30deg); } 100% { transform: rotate(0deg); } }
@keyframes miyuki-object-loaders-ray { 0%, 22.22% { transform: scaleY(1); } 34.72%, 87.5% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
@keyframes miyuki-object-loaders-rays { 0%, 27.85% { opacity: 1; } 34.72%, 87.5% { opacity: 0; } 94.37%, 100% { opacity: 1; } }
@keyframes miyuki-object-loaders-shade { 0%, 31.94% { transform: translate(0, 0); } 50%, 72.22% { transform: translate(var(--miyuki-object-loaders-shade)); } 90.28%, 100% { transform: translate(0, 0); } }
@keyframes miyuki-object-loaders-swell { 0%, 31.94% { transform: scale(1); } 50%, 72.22% { transform: scale(1.3); } 90.28%, 100% { transform: scale(1); } }
@keyframes miyuki-object-loaders-trace { from { stroke-dashoffset: 0.22; } to { stroke-dashoffset: -1.03; } }
@keyframes miyuki-object-loaders-shackle {
  0%, 8% { transform: translateY(0) rotate(0deg); animation-timing-function: ${SETTLE}; }
  19% { transform: translateY(-2.5px) rotate(0deg); animation-timing-function: ${SETTLE}; }
  31%, 54% { transform: translateY(-2.5px) rotate(-18deg); animation-timing-function: ${BREATHE}; }
  64% { transform: translateY(-2.5px) rotate(0deg); animation-timing-function: ${DROP}; }
  70% { transform: translateY(0) rotate(0deg); animation-timing-function: ease-out; }
  73% { transform: translateY(1px) rotate(0deg); animation-timing-function: ${SETTLE}; }
  82%, 100% { transform: translateY(0) rotate(0deg); }
}
@keyframes miyuki-object-loaders-click {
  0%, 70% { transform: translateY(0); animation-timing-function: ease-out; }
  73% { transform: translateY(1px); animation-timing-function: ${SETTLE}; }
  82%, 100% { transform: translateY(0); }
}
`;

function Frame({
  size = 24,
  label = "Loading",
  className,
  style,
  children,
  ...props
}: ObjectLoaderProps & { children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 text-brand",
        "motion-reduce:animate-[miyuki-object-loaders-breathe_1.8s_ease-in-out_infinite]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <style href="miyuki-object-loaders" precedence="miyuki">
        {keyframes}
      </style>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-full overflow-visible"
      >
        {children}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

const MOVE = "motion-safe:[animation:var(--miyuki-object-loaders-run)]";
const STILL = "motion-reduce:[transform:var(--miyuki-object-loaders-still)]";
const FADE = "motion-reduce:opacity-(--miyuki-object-loaders-fade)";

const run = (animation: string, extra?: Record<string, string | number>) =>
  ({ "--miyuki-object-loaders-run": animation, ...extra }) as CSSProperties;

const CUP = "M6.5 10.25H17.5L16.9 15.35C16.65 17.45 14.6 19 12 19S7.35 17.45 7.1 15.35Z";
const WISP = "M0 0C-1.5 -1.2 1.5 -2.6 0 -3.8";
const WISPS = [
  { x: 8.5, still: "translate(0, 0.5px)", fade: 0.45 },
  { x: 12, still: "translate(0, -1px)", fade: 1 },
  { x: 15.5, still: "translate(0, 0)", fade: 0.7 },
];

export function CupLoader(props: ObjectLoaderProps) {
  return (
    <Frame {...props}>
      {WISPS.map(({ x, still, fade }, i) => (
        <g key={x} transform={`translate(${x} 8.25)`}>
          <path
            d={WISP}
            className={cn(MOVE, STILL, FADE)}
            style={run(
              `miyuki-object-loaders-steam 2s cubic-bezier(0.3, 0.3, 0.6, 1) ${-0.3 - i * 0.667}s infinite, miyuki-object-loaders-sway 2s ${BREATHE} ${-0.3 - i * 0.667}s infinite`,
              { "--miyuki-object-loaders-still": still, "--miyuki-object-loaders-fade": fade },
            )}
          />
        </g>
      ))}
      <path d={CUP} />
      <path d="M5 20.75H19" />
    </Frame>
  );
}

const PLANE = "M7.5 0L-6 -5.5L-3 0L-5 3.5ZM-3 0H7.5";
const STREAKS = [
  { y: -2.75, len: 1.75, still: "translateX(-8px)", fade: 0.5 },
  { y: 0.75, len: 2.25, still: "translateX(-10.5px)", fade: 0.3 },
  { y: 3.75, len: 1.5, still: "translateX(-7.5px)", fade: 0.7 },
];

export function PlaneLoader(props: ObjectLoaderProps) {
  return (
    <Frame {...props}>
      <g transform="translate(14.5 9.5) rotate(-45)">
        {STREAKS.map(({ y, len, still, fade }, i) => (
          <path
            key={y}
            d={`M${-len} ${y}H${len}`}
            className={cn(MOVE, STILL, FADE)}
            style={run(`miyuki-object-loaders-streak 1.1s linear ${-0.15 - i * 0.367}s infinite`, {
              "--miyuki-object-loaders-still": still,
              "--miyuki-object-loaders-fade": fade,
            })}
          />
        ))}
        <path d={PLANE} className={MOVE} style={run(`miyuki-object-loaders-bob 1.1s ${BREATHE} -0.3s infinite`)} />
      </g>
    </Frame>
  );
}

const BELL =
  "M5.5 17.25C7 16.4 7.25 14.8 7.25 12C7.25 8.8 9.3 6.2 12 6.2S16.75 8.8 16.75 12C16.75 14.8 17 16.4 18.5 17.25Z";
const CHIME = "M19.75 7.75C20.75 8.9 20.75 10.85 19.75 12";
const SWING = 2.2;

export function BellLoader(props: ObjectLoaderProps) {
  const swing = (lag: number) => run(`miyuki-object-loaders-swing ${SWING}s linear ${-0.13 + lag}s infinite`);
  return (
    <Frame {...props}>
      {[0, 1].map((side) => (
        <g key={side} transform={side ? "matrix(-1 0 0 1 24 0)" : undefined}>
          <path
            d={CHIME}
            className={cn(MOVE, FADE)}
            style={run(`miyuki-object-loaders-chime ${SWING}s linear -0.13s infinite`, {
              "--miyuki-object-loaders-fade": 0.55,
            })}
          />
        </g>
      ))}
      <g className={cn(MOVE, "origin-[12px_4.6px]")} style={swing(0)}>
        <path d="M10.6 6.2a1.4 1.4 0 0 1 2.8 0" />
        <path d={BELL} />
      </g>
      <circle
        cx={12}
        cy={19.5}
        r={1.5}
        fill="currentColor"
        stroke="none"
        className={cn(MOVE, "origin-[12px_4.6px]")}
        style={swing(0.07)}
      />
    </Frame>
  );
}

const RAYS = [0, 1, 2, 3, 4, 5, 6, 7];
const SHADE_ANGLE = (-75 * Math.PI) / 180;
const SHADE_FROM = 9.6;
const SHADE_TO = 3.3;
const SKY = "3.6s cubic-bezier(0.37, 0, 0.63, 1) -1.5s infinite";

export function SkyLoader(props: ObjectLoaderProps) {
  const id = `miyuki-sky-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cx = +(Math.cos(SHADE_ANGLE) * SHADE_FROM).toFixed(2);
  const cy = +(Math.sin(SHADE_ANGLE) * SHADE_FROM).toFixed(2);
  const dx = +(Math.cos(SHADE_ANGLE) * (SHADE_TO - SHADE_FROM)).toFixed(2);
  const dy = +(Math.sin(SHADE_ANGLE) * (SHADE_TO - SHADE_FROM)).toFixed(2);
  return (
    <Frame {...props}>
      <g transform="translate(12 12)">
        <g className={MOVE} style={run(`miyuki-object-loaders-turn ${SKY}`)}>
          <mask id={id} maskUnits="userSpaceOnUse" x={-12} y={-12} width={24} height={24} stroke="none">
            <rect x={-12} y={-12} width={24} height={24} fill="#fff" />
            <circle
              cx={cx}
              cy={cy}
              r={4.5}
              fill="#000"
              className={MOVE}
              style={run(`miyuki-object-loaders-shade ${SKY}`, {
                "--miyuki-object-loaders-shade": `${dx}px, ${dy}px`,
              })}
            />
          </mask>
          <g className={cn(MOVE, "origin-[0px_0px]")} style={run(`miyuki-object-loaders-swell ${SKY}`)}>
            <circle r={5} fill="currentColor" stroke="none" mask={`url(#${id})`} />
          </g>
          <g className={MOVE} style={run("miyuki-object-loaders-rays 3.6s linear -1.5s infinite")}>
            {RAYS.map((i) => (
              <g key={i} transform={`rotate(${i * 45})`}>
                <path
                  d="M0 -7.25V-9.5"
                  className={cn(MOVE, "origin-[0px_-5px]")}
                  style={run("miyuki-object-loaders-ray 3.6s linear -1.5s infinite")}
                />
              </g>
            ))}
          </g>
        </g>
      </g>
    </Frame>
  );
}

const TRACE = "M1.5 13H6.5C7.25 13 7.5 10.5 8.5 10.5S9.75 13 10.5 13H11.25L13 4.5L15 20L16.5 13H22.5";

export function PulseLoader(props: ObjectLoaderProps) {
  return (
    <Frame {...props}>
      <path d={TRACE} opacity={0.25} />
      <path
        d={TRACE}
        pathLength={1}
        strokeDasharray="0.2 2"
        className={cn(MOVE, "motion-reduce:[stroke-dashoffset:-0.3]")}
        style={run("miyuki-object-loaders-trace 1.6s linear -1.25s infinite")}
      />
    </Frame>
  );
}

const SHACKLE = "M8.5 14.5V7.75A3.5 3.5 0 0 1 15.5 7.75V12.25";
const LOCK =
  "M7.5 10.75H16.5A2 2 0 0 1 18.5 12.75V18.75A2 2 0 0 1 16.5 20.75H7.5A2 2 0 0 1 5.5 18.75V12.75A2 2 0 0 1 7.5 10.75ZM12 13.5A1.5 1.5 0 0 1 12.75 16.3V17.5A0.75 0.75 0 0 1 11.25 17.5V16.3A1.5 1.5 0 0 1 12 13.5Z";

export function LockLoader(props: ObjectLoaderProps) {
  return (
    <Frame {...props}>
      <path
        d={SHACKLE}
        className={cn(MOVE, "origin-[8.5px_13.25px]")}
        style={run("miyuki-object-loaders-shackle 2.8s linear -1s infinite")}
      />
      <path
        d={LOCK}
        fill="currentColor"
        fillRule="evenodd"
        stroke="none"
        className={MOVE}
        style={run("miyuki-object-loaders-click 2.8s linear -1s infinite")}
      />
    </Frame>
  );
}
