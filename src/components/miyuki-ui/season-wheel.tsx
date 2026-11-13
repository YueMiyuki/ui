"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Label, RadioButton, RadioField, RadioGroup, useLocale, VisuallyHidden } from "react-aria-components";
import { cn } from "@/lib/utils";

const SIZE = 288;
const C = SIZE / 2;
const R0 = 86;
const R1 = 132;
const CORNER = 5;
const GAP = 3.2;
const LIFT = 7;
const SETTLE = { type: "spring", stiffness: 420, damping: 30 } as const;
const OFFSET = -Math.PI / 12;

const SEASONS = [
  { name: "Winter", fill: "var(--brand)", on: "var(--brand-foreground)" },
  { name: "Spring", fill: "var(--success)", on: "var(--success-foreground)" },
  { name: "Summer", fill: "var(--warning)", on: "var(--warning-foreground)" },
  { name: "Autumn", fill: "var(--destructive)", on: "var(--destructive-foreground)" },
];

function seasonOf(month: number) {
  return Math.floor((month % 12) / 3);
}

function tone(month: number) {
  const s = seasonOf(month);
  const place = month % 3;
  const here = SEASONS[s].fill;
  if (place === 1) return here;
  const other = SEASONS[(s + (place === 0 ? 3 : 1)) % 4].fill;
  return `color-mix(in oklch, ${other} 12%, ${here})`;
}

function point(r: number, a: number) {
  return `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
}

function sector(index: number, lift: number) {
  const r0 = R0 + lift;
  const r1 = R1 + lift;
  const half = GAP / 2;
  const a0 = (index * Math.PI) / 6 + OFFSET + half / r0;
  const a1 = ((index + 1) * Math.PI) / 6 + OFFSET - half / r0;
  const b0 = (index * Math.PI) / 6 + OFFSET + half / r1;
  const b1 = ((index + 1) * Math.PI) / 6 + OFFSET - half / r1;
  return [
    `M ${point(r1 - CORNER, b0)}`,
    `Q ${point(r1, b0)} ${point(r1, b0 + CORNER / r1)}`,
    `A ${r1} ${r1} 0 0 1 ${point(r1, b1 - CORNER / r1)}`,
    `Q ${point(r1, b1)} ${point(r1 - CORNER, b1)}`,
    `L ${point(r0 + CORNER, a1)}`,
    `Q ${point(r0, a1)} ${point(r0, a1 - CORNER / r0)}`,
    `A ${r0} ${r0} 0 0 0 ${point(r0, a0 + CORNER / r0)}`,
    `Q ${point(r0, a0)} ${point(r0 + CORNER, a0)}`,
    "Z",
  ].join(" ");
}

function crystal() {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const tip = [8 + 6.4 * Math.sin(a), 8 - 6.4 * Math.cos(a)];
    const mid = [8 + 4 * Math.sin(a), 8 - 4 * Math.cos(a)];
    d += `M8 8L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`;
    for (const s of [-1, 1]) {
      const b = a + (s * Math.PI) / 4;
      d += `M${mid[0].toFixed(2)} ${mid[1].toFixed(2)}L${(mid[0] + 2.1 * Math.sin(b)).toFixed(2)} ${(mid[1] - 2.1 * Math.cos(b)).toFixed(2)}`;
    }
  }
  return d;
}

function sun() {
  let d = "M11 8A3 3 0 1 1 5 8A3 3 0 1 1 11 8Z";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    d += `M${(8 + 5 * Math.sin(a)).toFixed(2)} ${(8 - 5 * Math.cos(a)).toFixed(2)}L${(8 + 6.8 * Math.sin(a)).toFixed(2)} ${(8 - 6.8 * Math.cos(a)).toFixed(2)}`;
  }
  return d;
}

function blossom() {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const x = 8 + 3.5 * Math.sin(a);
    const y = 8.3 - 3.5 * Math.cos(a);
    d += `M${(x + 2.3).toFixed(2)} ${y.toFixed(2)}A2.3 2.3 0 1 1 ${(x - 2.3).toFixed(2)} ${y.toFixed(2)}A2.3 2.3 0 1 1 ${(x + 2.3).toFixed(2)} ${y.toFixed(2)}Z`;
  }
  return d;
}

const GLYPHS: { d: string; dot?: [number, number, number] }[] = [
  { d: crystal() },
  { d: blossom(), dot: [8, 8.3, 1.1] },
  {
    d: "M8 14.5V8.6M8 10.2C5.6 10.2 3.4 8.6 3.2 5.6C5.8 5.6 8 7.4 8 10.2ZM8 8.6C8 5.6 10.1 3.4 12.9 3.2C12.9 6.3 10.8 8.5 8 8.6Z",
  },
  { d: "M8 14.4C4.4 12.2 3.2 8.3 4.8 4.3L6.6 2.7L8 4.6L9.4 2.7L11.2 4.3C12.8 8.3 11.6 12.2 8 14.4Z" },
  { d: "M2.8 13.2C2.6 7.4 6.6 3 13.2 2.8C13.4 9 9 13.2 2.8 13.2ZM2.8 13.2L10.4 5.6" },
  {
    d: "M5.6 2.6C5.6 2.6 2.6 6.6 2.6 8.8A3 3 0 0 0 8.6 8.8C8.6 6.6 5.6 2.6 5.6 2.6ZM11.6 7.4C11.6 7.4 9.9 9.8 9.9 11A1.7 1.7 0 0 0 13.3 11C13.3 9.8 11.6 7.4 11.6 7.4Z",
  },
  { d: sun() },
  {
    d: "M1.6 7.8C3.6 7.8 4.2 5 6.6 5C9 5 9 7.8 11.4 7.8C12.8 7.8 13.7 7 14.4 6.2M1.6 12C3.6 12 4.4 9.6 6.6 9.6C8.8 9.6 9.4 12 11.4 12C12.8 12 13.7 11.2 14.4 10.4",
  },
  { d: "M10.2 2.6A5.9 5.9 0 1 0 13.6 11A4.7 4.7 0 0 1 10.2 2.6Z" },
  {
    d: "M8 1.6L9.3 4.6L11.7 3.6L11.1 6.7L14.1 6.2L12.4 8.7L13.7 9.7L10 10.5L10.4 12.1L8 11.1L5.6 12.1L6 10.5L2.3 9.7L3.6 8.7L1.9 6.2L4.9 6.7L4.3 3.6L6.7 4.6ZM8 11.1V14.6",
  },
  {
    d: "M12.6 9.6A4.6 4.6 0 1 1 3.4 9.6A4.6 4.6 0 1 1 12.6 9.6ZM4.9 5.6C6.1 4.4 7.1 4.8 8 5.8C8.9 4.8 9.9 4.4 11.1 5.6C10 6.8 9 6.7 8 6.5C7 6.7 6 6.8 4.9 5.6ZM8 5.2V2.4",
  },
  { d: "M8 1.6L4.6 6.2H6.4L3.4 10.2H5.8L2.8 13.4H13.2L10.2 10.2H12.6L9.6 6.2H11.4ZM8 13.4V15" },
];

type Base = {
  label?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export type SeasonWheelProps =
  | (Base & {
      range?: false;
      value?: number;
      defaultValue?: number;
      onChange?: (value: number) => void;
    })
  | (Base & {
      range: true;
      value?: [number, number];
      defaultValue?: [number, number];
      onChange?: (value: [number, number]) => void;
    });

function useMonthNames() {
  const { locale } = useLocale();
  return useMemo(() => {
    const make = (month: "long" | "short") => {
      try {
        const f = new Intl.DateTimeFormat(locale, { month, timeZone: "UTC" });
        return Array.from({ length: 12 }, (_, i) => f.format(new Date(Date.UTC(2021, i, 15))));
      } catch {
        return Array.from({ length: 12 }, (_, i) => String(i + 1));
      }
    };
    return { long: make("long"), short: make("short") };
  }, [locale]);
}

interface SegmentProps {
  index: number;
  lifted: boolean;
  hovered: boolean;
  focused: boolean;
  pressed?: boolean;
}

function Segment({ index, lifted, hovered, focused, pressed }: SegmentProps) {
  const reduce = useReducedMotion() ?? false;
  const target = lifted ? LIFT : hovered ? 2.5 : 0;
  const lift = useMotionValue(target);
  useEffect(() => {
    if (reduce) lift.jump(target);
    else animate(lift, target, SETTLE);
  }, [target, reduce, lift]);
  const d = useTransform(lift, (l) => sector(index, l));
  const mid = ((index + 0.5) * Math.PI) / 6 + OFFSET;
  const gx = useTransform(lift, (l) => C + (R0 + (R1 - R0) / 2 + l) * Math.sin(mid) - 8);
  const gy = useTransform(lift, (l) => C - (R0 + (R1 - R0) / 2 + l) * Math.cos(mid) - 8);
  const month = index + 1;
  const season = SEASONS[seasonOf(month)];
  const fill = tone(month);
  const glyph = GLYPHS[index];

  return (
    <g style={{ "--miyuki-season-wheel-tone": fill } as CSSProperties}>
      {focused && <motion.path d={d} fill="none" strokeWidth={6} className="stroke-ring" />}
      <motion.path
        d={d}
        className={cn(
          "transition-[fill,filter] duration-200 ease-settle",
          lifted && "drop-shadow-[0_3px_5px_color-mix(in_oklab,var(--brand)_28%,transparent)]",
        )}
        style={{
          fill: lifted
            ? "var(--miyuki-season-wheel-tone)"
            : `color-mix(in oklab, var(--miyuki-season-wheel-tone) ${hovered || pressed ? 30 : 17}%, var(--card))`,
        }}
      />
      <motion.g style={{ x: gx, y: gy }} className="pointer-events-none">
        <path
          d={glyph.d}
          fill="none"
          strokeWidth={1.45}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-[stroke] duration-200"
          style={{
            stroke: lifted ? season.on : "color-mix(in oklab, var(--miyuki-season-wheel-tone) 72%, var(--foreground))",
          }}
        />
        {glyph.dot && (
          <circle
            cx={glyph.dot[0]}
            cy={glyph.dot[1]}
            r={glyph.dot[2]}
            style={{
              fill: lifted ? season.on : "color-mix(in oklab, var(--miyuki-season-wheel-tone) 72%, var(--foreground))",
            }}
          />
        )}
      </motion.g>
    </g>
  );
}

function Centre({ title, caption, muted }: { title: string; caption: string; muted?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center"
    >
      <span
        key={title}
        className={cn(
          "max-w-[150px] animate-[miyuki-season-wheel-in_220ms_var(--ease-settle)] font-display text-2xl leading-tight font-semibold tracking-[-0.03em] motion-reduce:animate-none",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {title}
      </span>
      <span className="text-[13px] text-muted-foreground">{caption}</span>
      <style href="miyuki-season-wheel" precedence="miyuki">{`
        @keyframes miyuki-season-wheel-in { from { opacity: 0; transform: translateY(4px); } }
      `}</style>
    </div>
  );
}

export function SeasonWheel(props: SeasonWheelProps) {
  return props.range ? <RangeWheel {...props} /> : <SingleWheel {...props} />;
}

function SingleWheel({
  label,
  value,
  defaultValue = 1,
  onChange,
  isDisabled = false,
  className,
  style,
  ref,
}: Extract<SeasonWheelProps, { range?: false }>) {
  const names = useMonthNames();
  const [internal, setInternal] = useState(defaultValue);
  const month = value ?? internal;
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? month;

  return (
    <RadioGroup
      ref={ref}
      value={String(month)}
      onChange={(v) => {
        const n = Number(v);
        if (value === undefined) setInternal(n);
        onChange?.(n);
      }}
      isDisabled={isDisabled}
      className={cn("flex w-fit flex-col items-center gap-2 data-[disabled]:opacity-50", className)}
      style={style}
    >
      {label != null && <Label className="text-sm font-medium text-foreground">{label}</Label>}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {names.long.map((name, i) => {
          const m = i + 1;
          return (
            <RadioField key={m} value={String(m)} className="contents">
              <RadioButton
                className="pointer-events-none absolute inset-0 outline-none"
                onHoverChange={(h) => setHover((cur) => (h ? m : cur === m ? null : cur))}
              >
                {({ isSelected, isHovered, isFocusVisible, isPressed, isDisabled: off }) => (
                  <>
                    <span className="sr-only">{name}</span>
                    <svg
                      viewBox={`0 0 ${SIZE} ${SIZE}`}
                      aria-hidden="true"
                      className="absolute inset-0 size-full overflow-visible"
                    >
                      <g
                        className={cn("[pointer-events:visiblePainted]", off ? "cursor-not-allowed" : "cursor-pointer")}
                      >
                        <Segment
                          index={i}
                          lifted={isSelected}
                          hovered={isHovered && !off}
                          focused={isFocusVisible}
                          pressed={isPressed}
                        />
                      </g>
                    </svg>
                  </>
                )}
              </RadioButton>
            </RadioField>
          );
        })}
        <Centre
          title={names.long[shown - 1]}
          caption={SEASONS[seasonOf(shown % 12)].name}
          muted={hover !== null && hover !== month}
        />
      </div>
    </RadioGroup>
  );
}

function wrapMonth(m: number) {
  return ((((m - 1) % 12) + 12) % 12) + 1;
}

function spanOf([a, b]: [number, number]) {
  return ((b - a + 12) % 12) + 1;
}

function contains([a, b]: [number, number], m: number) {
  return (m - a + 12) % 12 < spanOf([a, b]);
}

function RangeWheel({
  label,
  value,
  defaultValue = [12, 2],
  onChange,
  isDisabled = false,
  className,
  style,
  ref,
}: Extract<SeasonWheelProps, { range: true }>) {
  const names = useMonthNames();
  const id = useId();
  const [internal, setInternal] = useState<[number, number]>(defaultValue);
  const span = value ?? internal;
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<0 | 1 | null>(null);
  const [ring, setRing] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const sweep = useRef<{ anchor: number; last: number; progress: number; moved: boolean; id: number } | null>(null);

  const set = (next: [number, number]) => {
    const tidy: [number, number] = [wrapMonth(next[0]), wrapMonth(next[1])];
    if (tidy[0] === span[0] && tidy[1] === span[1]) return;
    if (value === undefined) setInternal(tidy);
    onChange?.(tidy);
  };

  const monthAt = (e: ReactPointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - C;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE - C;
    const a = ((Math.atan2(x, -y) * 180) / Math.PI + 375) % 360;
    return { month: Math.floor(a / 30) + 1, r: Math.hypot(x, y) };
  };

  const shortest = (from: number, to: number) => ((((to - from) % 12) + 18) % 12) - 6;

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (isDisabled || e.button !== 0) return;
    const { month, r } = monthAt(e);
    if (r < R0 - 6 || r > R1 + LIFT + 6) return;
    e.preventDefault();
    setRing(false);
    if (pending !== null) {
      const d = shortest(pending, month);
      set(d >= 0 ? [pending, month] : [month, pending]);
      setPending(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    sweep.current = { anchor: month, last: month, progress: 0, moved: false, id: e.pointerId };
    set([month, month]);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const { month, r } = monthAt(e);
    setHover(r >= R0 - 6 && r <= R1 + LIFT + 6 ? month : null);
    const s = sweep.current;
    if (!s || s.id !== e.pointerId || r < 24) return;
    const step = shortest(s.last, month);
    if (step === 0) return;
    s.last = month;
    s.progress = Math.max(-11, Math.min(11, s.progress + step));
    s.moved = true;
    set(s.progress >= 0 ? [s.anchor, s.anchor + s.progress] : [s.anchor + s.progress, s.anchor]);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = sweep.current;
    if (!s || s.id !== e.pointerId) return;
    sweep.current = null;
    setPending(s.moved ? null : s.anchor);
  };

  const onKey = (end: 0 | 1) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    let delta = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") delta = 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") delta = -1;
    else if (e.key === "PageUp") delta = 3;
    else if (e.key === "PageDown") delta = -3;
    else return;
    e.preventDefault();
    setRing(true);
    setPending(null);
    const next: [number, number] = [span[0], span[1]];
    next[end] = wrapMonth(next[end] + delta);
    set(next);
  };

  const count = spanOf(span);
  const title = count === 1 ? names.long[span[0] - 1] : `${names.short[span[0] - 1]} – ${names.short[span[1] - 1]}`;
  const caption = pending !== null ? "Now choose the last month" : count === 1 ? "1 month" : `${count} months`;
  const handle = (end: 0 | 1) => {
    const a = (end === 0 ? ((span[0] - 1) * Math.PI) / 6 : (span[1] * Math.PI) / 6) + OFFSET;
    const r = R1 + LIFT + 0.5;
    return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={label != null ? `${id}-label` : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn("flex w-fit flex-col items-center gap-2", isDisabled && "opacity-50", className)}
      style={style}
    >
      {label != null && (
        <span id={`${id}-label`} className="text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full touch-none overflow-visible select-none",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
        >
          {names.long.map((_, i) => (
            <Segment
              key={i}
              index={i}
              lifted={contains(span, i + 1)}
              hovered={hover === i + 1 && !isDisabled}
              focused={false}
            />
          ))}
          {([0, 1] as const).map((end) => {
            const p = handle(end);
            return (
              <g key={end}>
                {focus === end && ring && <circle cx={p.x} cy={p.y} r={9} className="fill-ring" />}
                <circle cx={p.x} cy={p.y} r={5.5} strokeWidth={2} className="fill-card stroke-foreground" />
              </g>
            );
          })}
        </svg>
        <Centre title={title} caption={caption} />
        <VisuallyHidden>
          {([0, 1] as const).map((end) => (
            <input
              key={end}
              ref={(el) => {
                inputs.current[end] = el;
              }}
              type="range"
              min={1}
              max={12}
              step={1}
              value={span[end]}
              disabled={isDisabled}
              aria-label={end === 0 ? "First month" : "Last month"}
              aria-valuetext={`${names.long[span[end] - 1]}, ${count === 1 ? "1 month" : `${count} months`}`}
              aria-describedby={label != null ? `${id}-label` : undefined}
              onKeyDown={onKey(end)}
              onChange={(e) => {
                const next: [number, number] = [span[0], span[1]];
                next[end] = Number(e.target.value);
                set(next);
              }}
              onFocus={() => {
                setFocus(end);
                setRing(true);
              }}
              onBlur={() => {
                setFocus((f) => (f === end ? null : f));
                setRing(false);
              }}
            />
          ))}
        </VisuallyHidden>
      </div>
    </div>
  );
}
