"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, useId } from "react";
import { cn } from "@/lib/utils";

export interface TypeLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: number;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

export interface TypeLoaderTextProps extends TypeLoaderProps {
  text?: string;
}

const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";
const BREATHE = "cubic-bezier(0.45, 0.05, 0.25, 1)";

const pct = (t: number, total: number) => `${+((t / total) * 100).toFixed(3)}%`;
const shift = (i: number, count: number) => `translateY(-${+((i / count) * 100).toFixed(4)}%)`;

function strip(name: string, count: number, step: number, hold: number) {
  const total = count * step;
  let frames = `0% { transform: translateY(0%); }`;
  for (let i = 0; i < count; i++) {
    frames += ` ${pct(i * step + hold, total)} { transform: ${shift(i, count + 1)}; }`;
    frames += ` ${pct((i + 1) * step, total)} { transform: ${shift(i + 1, count + 1)}; }`;
  }
  return `@keyframes ${name} { ${frames} }`;
}

const keyframes = `
@keyframes miyuki-type-loaders-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes miyuki-type-loaders-hop { 0%, 66%, 100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-1.5px); opacity: 1; } }
@keyframes miyuki-type-loaders-run { from { transform: translateX(-5px); } to { transform: translateX(21px); } }
@keyframes miyuki-type-loaders-grow { 0% { transform: scaleX(0); } 36%, 54% { transform: scaleX(1); } 82%, 100% { transform: scaleX(0); } }
@keyframes miyuki-type-loaders-ride { 0% { transform: translateX(0); } 36%, 54% { transform: translateX(100%); } 82%, 100% { transform: translateX(0); } }
${strip("miyuki-type-loaders-ones", 10, 1, 0.68)}
${strip("miyuki-type-loaders-tens", 6, 10, 9.68)}
`;

function Keyframes() {
  return (
    <style href="miyuki-type-loaders" precedence="miyuki">
      {keyframes}
    </style>
  );
}

function Frame({
  size = 24,
  label = "Loading",
  square = false,
  className,
  style,
  children,
  ...props
}: TypeLoaderProps & { square?: boolean; children: ReactNode }) {
  return (
    <span
      role="status"
      {...props}
      className={cn(
        "relative inline-flex shrink-0 items-center text-brand",
        "motion-reduce:animate-[miyuki-type-loaders-breathe_1.8s_cubic-bezier(0.45,0.05,0.25,1)_infinite]",
        className,
      )}
      style={
        square
          ? { width: size, height: size, ...style }
          : { height: size, fontSize: size * 0.6, lineHeight: `${size}px`, ...style }
      }
    >
      <Keyframes />
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const TYPE_STEP = 0.11;
const DELETE_STEP = 0.045;
const TYPE_HOLD = 0.7;
const TYPE_REST = 0.25;

function typing(n: number) {
  const typed = n * TYPE_STEP;
  const held = typed + TYPE_HOLD;
  const gone = held + n * DELETE_STEP;
  const total = gone + TYPE_REST;
  const p = (t: number) => pct(t, total);
  const css = `
@keyframes miyuki-type-loaders-type-${n} { 0% { clip-path: inset(0 ${n}ch 0 0); animation-timing-function: steps(${n}, end); } ${p(typed)} { clip-path: inset(0 0ch 0 0); } ${p(held)} { clip-path: inset(0 0ch 0 0); animation-timing-function: steps(${n}, end); } ${p(gone)}, 100% { clip-path: inset(0 ${n}ch 0 0); } }
@keyframes miyuki-type-loaders-caret-${n} { 0% { transform: translateX(0ch); animation-timing-function: steps(${n}, end); } ${p(typed)} { transform: translateX(${n}ch); } ${p(held)} { transform: translateX(${n}ch); animation-timing-function: steps(${n}, end); } ${p(gone)}, 100% { transform: translateX(0ch); } }
@keyframes miyuki-type-loaders-blink-${n} { 0%, ${p(typed + 0.16)}, ${p(typed + 0.58)}, 100% { opacity: 1; } ${p(typed + 0.22)}, ${p(typed + 0.52)} { opacity: 0; } }
`;
  return { css, total, delay: -(typed + 0.1) };
}

export function TypingLoader({ text = "Loading", label, size = 24, className, ...props }: TypeLoaderTextProps) {
  const n = Math.max(1, Array.from(text).length);
  const { css, total, delay } = typing(n);
  const timing = `${total.toFixed(3)}s linear ${delay.toFixed(3)}s infinite`;
  const caret = Math.max(1.5, Math.round(size / 16) / 2 + 0.5);
  return (
    <Frame size={size} label={label ?? text} className={cn("pr-0.5 font-mono font-medium", className)} {...props}>
      <style href={`miyuki-type-loaders-type-${n}`} precedence="miyuki">
        {css}
      </style>
      <span aria-hidden="true" className="relative block whitespace-pre">
        <span
          className="block motion-safe:[animation:var(--miyuki-type-loaders-type)]"
          style={{ "--miyuki-type-loaders-type": `miyuki-type-loaders-type-${n} ${timing}` } as CSSProperties}
        >
          {text}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex items-center motion-safe:[animation:var(--miyuki-type-loaders-caret)] motion-reduce:[transform:translateX(var(--miyuki-type-loaders-end))]"
          style={
            {
              "--miyuki-type-loaders-caret": `miyuki-type-loaders-caret-${n} ${timing}`,
              "--miyuki-type-loaders-end": `${n}ch`,
            } as CSSProperties
          }
        >
          <span
            className="block h-[1.05em] rounded-full bg-current motion-safe:[animation:var(--miyuki-type-loaders-blink)]"
            style={
              {
                width: caret,
                "--miyuki-type-loaders-blink": `miyuki-type-loaders-blink-${n} ${timing}`,
              } as CSSProperties
            }
          />
        </span>
      </span>
    </Frame>
  );
}

const BUBBLE = "M7 4H17A4 4 0 0 1 21 8V12.5A4 4 0 0 1 17 16.5H11L7 20V16.5A4 4 0 0 1 3 12.5V8A4 4 0 0 1 7 4Z";

export function BubbleLoader(props: TypeLoaderProps) {
  return (
    <Frame square {...props}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full overflow-visible">
        <path d={BUBBLE} stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        {[8, 12, 16].map((cx, i) => (
          <circle
            key={cx}
            cx={cx}
            cy={10.25}
            r={1.45}
            fill="currentColor"
            className="motion-safe:animate-[miyuki-type-loaders-hop_1.2s_cubic-bezier(0.45,0.05,0.25,1)_infinite] motion-reduce:opacity-(--miyuki-type-loaders-still)"
            style={
              {
                animationDelay: `${(-0.32 + i * 0.15).toFixed(2)}s`,
                "--miyuki-type-loaders-still": 1 - i * 0.3,
              } as CSSProperties
            }
          />
        ))}
      </svg>
    </Frame>
  );
}

const ROLL_TRAVEL = 0.46;
const ROLL_REST = 0.35;

function Strip({
  items,
  size,
  animation,
  still,
}: {
  items: string[];
  size: number;
  animation: string;
  still?: string;
}) {
  const pitch = size * 0.78;
  return (
    <span
      aria-hidden="true"
      className="relative block h-full overflow-y-clip [mask-image:linear-gradient(to_bottom,transparent_4%,#000_24%,#000_78%,transparent)]"
    >
      <span
        className={cn(
          "flex flex-col text-center motion-safe:[animation:var(--miyuki-type-loaders-strip)]",
          still && "motion-reduce:[animation:var(--miyuki-type-loaders-tick)]",
        )}
        style={
          {
            marginTop: (size - pitch) / 2,
            lineHeight: `${pitch}px`,
            "--miyuki-type-loaders-strip": animation,
            "--miyuki-type-loaders-tick": still,
          } as CSSProperties
        }
      >
        {items.map((item, i) => (
          <span key={i} className="block">
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}

export function LetterRollLoader({ text = "Loading", label, size = 24, className, ...props }: TypeLoaderTextProps) {
  const letters = Array.from(text).filter((c) => c.trim() !== "");
  if (letters.length === 0) letters.push("·");
  const n = letters.length;
  const name = `miyuki-type-loaders-roll-${n}`;
  const total = n * (ROLL_TRAVEL + ROLL_REST);
  return (
    <Frame size={size} label={label ?? text} className={cn("font-semibold", className)} {...props}>
      <style href={name} precedence="miyuki">
        {strip(name, n, ROLL_TRAVEL + ROLL_REST, ROLL_REST)}
      </style>
      <Strip
        items={[...letters, letters[0]]}
        size={size}
        animation={`${name} ${total.toFixed(3)}s ${SETTLE} -0.12s infinite`}
      />
    </Frame>
  );
}

export function SelectionLoader({ text = "Text", size = 24, className, ...props }: TypeLoaderTextProps) {
  const caret = Math.max(1.5, Math.round(size / 16) / 2 + 0.5);
  const timing = `2.6s ${BREATHE} -1.75s infinite`;
  return (
    <Frame size={size} className={cn("font-medium", className)} {...props}>
      <span aria-hidden="true" className="relative block px-[0.1em] whitespace-pre">
        <span className="absolute inset-x-0 top-1/2 h-[1.3em] -translate-y-1/2">
          <span
            className="block size-full origin-left rounded-[0.12em] bg-current/25 motion-safe:[animation:var(--miyuki-type-loaders-grow)]"
            style={{ "--miyuki-type-loaders-grow": `miyuki-type-loaders-grow ${timing}` } as CSSProperties}
          />
        </span>
        <span className="relative block">{text}</span>
        <span
          className="absolute inset-0 motion-safe:[animation:var(--miyuki-type-loaders-ride)] motion-reduce:[transform:translateX(100%)]"
          style={{ "--miyuki-type-loaders-ride": `miyuki-type-loaders-ride ${timing}` } as CSSProperties}
        >
          <span
            className="absolute top-1/2 left-0 h-[1.15em] -translate-y-1/2 rounded-full bg-current"
            style={{ width: caret, marginLeft: -caret / 2 }}
          />
        </span>
      </span>
    </Frame>
  );
}

const LINES = [
  { y: 7, width: 18 },
  { y: 12, width: 18 },
  { y: 17, width: 10.8 },
];

export function ParagraphLoader(props: TypeLoaderProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Frame square {...props}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-light`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.5" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-lines`}>
            {LINES.map(({ y, width }) => (
              <rect key={y} x={3} y={y - 1.25} width={width} height={2.5} rx={1.25} />
            ))}
          </clipPath>
        </defs>
        <g opacity={0.3}>
          {LINES.map(({ y, width }) => (
            <rect key={y} x={3} y={y - 1.25} width={width} height={2.5} rx={1.25} />
          ))}
        </g>
        <g clipPath={`url(#${id}-lines)`}>
          {LINES.map(({ y }, i) => (
            <rect
              key={y}
              x={0}
              y={y - 2}
              width={8}
              height={4}
              fill={`url(#${id}-light)`}
              className="motion-safe:animate-[miyuki-type-loaders-run_1.6s_linear_infinite] motion-reduce:[transform:translateX(var(--miyuki-type-loaders-still))]"
              style={
                {
                  animationDelay: `${(-1.2 + i * 0.12).toFixed(2)}s`,
                  "--miyuki-type-loaders-still": `${8 - i * 3}px`,
                } as CSSProperties
              }
            />
          ))}
        </g>
      </svg>
    </Frame>
  );
}

const TENS = ["0", "1", "2", "3", "4", "5", "0"];
const ONES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function SecondsLoader({ size = 24, className, ...props }: TypeLoaderProps) {
  return (
    <Frame size={size} className={cn("font-semibold tabular-nums", className)} {...props}>
      <Strip
        items={TENS}
        size={size}
        animation={`miyuki-type-loaders-tens 60s ${SETTLE} infinite`}
        still="miyuki-type-loaders-tens 60s steps(1, end) infinite"
      />
      <Strip
        items={ONES}
        size={size}
        animation={`miyuki-type-loaders-ones 10s ${SETTLE} infinite`}
        still="miyuki-type-loaders-ones 10s steps(1, end) infinite"
      />
    </Frame>
  );
}
