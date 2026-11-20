"use client";

import { motion, type Transition, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { Button, RadioButton, RadioField, RadioGroup } from "react-aria-components";
import { TextField } from "@/components/miyuki-ui/input";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Switch } from "@/components/miyuki-ui/switch";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type AgentMood = "calm" | "happy" | "focused" | "sleepy" | "surprised";
export type AgentColor = "water" | "seafoam" | "wisteria" | "yuzu" | "camellia" | "plum";

const MOODS: AgentMood[] = ["calm", "happy", "focused", "sleepy", "surprised"];
const COLORS: AgentColor[] = ["water", "seafoam", "wisteria", "yuzu", "camellia", "plum"];

const colorVar: Record<AgentColor, string> = {
  water: "var(--chart-1)",
  seafoam: "var(--chart-2)",
  wisteria: "var(--chart-3)",
  yuzu: "var(--chart-4)",
  camellia: "var(--chart-5)",
  plum: "var(--chart-6)",
};

const moodName: Record<AgentMood, string> = {
  calm: "Calm",
  happy: "Happy",
  focused: "Focused",
  sleepy: "Sleepy",
  surprised: "Surprised",
};

const colorName: Record<AgentColor, string> = {
  water: "Water",
  seafoam: "Seafoam",
  wisteria: "Wisteria",
  yuzu: "Yuzu",
  camellia: "Camellia",
  plum: "Plum",
};

function resolveColor(color: string) {
  return color in colorVar ? colorVar[color as AgentColor] : color;
}

type P = [number, number];
const K = 0.5523;
const n2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: P) => `${n2(p[0])} ${n2(p[1])}`;

const FACE = 1.24;

function arch([a, m, b]: [P, P, P, number], flip = false) {
  const f = (p: P): P => [(flip ? -p[0] : p[0]) * FACE, p[1] * FACE];
  return `M${pt(f(a))}Q${pt(f(m))} ${pt(f(b))}`;
}

function blob([L, B, R, T]: [P, P, P, P], flip = false) {
  const f = (p: P): P => [(flip ? -p[0] : p[0]) * FACE, p[1] * FACE];
  const l = f(L);
  const b = f(B);
  const r = f(R);
  const t = f(T);
  const c = (a: P, z: P, e: P) => `C${pt(a)} ${pt(z)} ${pt(e)}`;
  return (
    `M${pt(l)}` +
    c([l[0], l[1] + K * (b[1] - l[1])], [b[0] - K * (b[0] - l[0]), b[1]], b) +
    c([b[0] + K * (r[0] - b[0]), b[1]], [r[0], r[1] + K * (b[1] - r[1])], r) +
    c([r[0], r[1] + K * (t[1] - r[1])], [t[0] + K * (r[0] - t[0]), t[1]], t) +
    c([t[0] - K * (t[0] - l[0]), t[1]], [l[0], l[1] + K * (t[1] - l[1])], l) +
    "Z"
  );
}

interface Face {
  eye: [P, P, P, P];
  brow: [P, P, P, number];
  glint: { x: number; y: number; r: number; o: number };
  mouth: [P, P, P, P];
  cheek: number;
  tongue: number;
}

const faces: Record<AgentMood, Face> = {
  calm: {
    eye: [
      [-3.9, 0],
      [0, 5.2],
      [3.9, 0],
      [0, -5.2],
    ],
    brow: [[-3.8, -8.6], [0, -10], [3.8, -8.6], 0],
    glint: { x: 1.3, y: -2.1, r: 1.35, o: 1 },
    mouth: [
      [-3.1, -0.4],
      [0, 2.3],
      [3.1, -0.4],
      [0, 1],
    ],
    cheek: 0.5,
    tongue: 0,
  },
  happy: {
    eye: [
      [-4.3, 1.5],
      [0, -1.4],
      [4.3, 1.5],
      [0, -4.5],
    ],
    brow: [[-3.8, -8.2], [0, -9.6], [3.8, -8.2], 0],
    glint: { x: 0.4, y: -2.6, r: 0.6, o: 0 },
    mouth: [
      [-4.6, -1.1],
      [0, 4.4],
      [4.6, -1.1],
      [0, -1.1],
    ],
    cheek: 0.7,
    tongue: 1,
  },
  focused: {
    eye: [
      [-4.1, -0.4],
      [0, 3.4],
      [4.1, 0.6],
      [0, -1.8],
    ],
    brow: [[-4.3, -7.1], [0, -7.6], [4, -5.3], 1],
    glint: { x: 1.1, y: 0.3, r: 1, o: 1 },
    mouth: [
      [-2.6, 0.7],
      [0, 1.15],
      [2.6, 0.7],
      [0, 0.25],
    ],
    cheek: 0,
    tongue: 0,
  },
  sleepy: {
    eye: [
      [-4.2, 0.8],
      [0, 3.4],
      [4.2, 0.8],
      [0, 1.8],
    ],
    brow: [[-3.8, -6], [0, -6.8], [3.8, -6], 0],
    glint: { x: 0.4, y: 1.6, r: 0.6, o: 0 },
    mouth: [
      [-1.5, 1.6],
      [0, 3.3],
      [1.5, 1.6],
      [0, -0.1],
    ],
    cheek: 0.38,
    tongue: 0,
  },
  surprised: {
    eye: [
      [-4.6, -0.6],
      [0, 5.6],
      [4.6, -0.6],
      [0, -6.6],
    ],
    brow: [[-3.8, -10.4], [0, -12.6], [3.8, -10.4], 1],
    glint: { x: 1.7, y: -2.9, r: 1.7, o: 1 },
    mouth: [
      [-2.3, 1.4],
      [0, 4.8],
      [2.3, 1.4],
      [0, -1.7],
    ],
    cheek: 0.3,
    tongue: 0,
  },
};

const BODY = "M50 6C52 8.6 81 36 81 61C81 78.1 67.1 92 50 92C32.9 92 19 78.1 19 61C19 36 48 8.6 50 6Z";

const WAVE = (() => {
  let d = "M-40 2Q-32.5 -2 -25 2";
  for (let x = -10; x <= 140; x += 15) d += `T${x} 2`;
  return `${d}V112H-40Z`;
})();

const EYES: [number, number][] = [
  [37.6, 60],
  [62.4, 60],
];

const OPEN: Record<AgentMood, boolean> = { calm: true, happy: false, focused: true, sleepy: false, surprised: true };

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

const keyframes = `
@keyframes miyuki-agent-persona-bob {
  0%, 100% { transform: translateY(0) scale(1.012, 0.988); }
  50% { transform: translateY(-2.6px) scale(0.994, 1.006); }
}
@keyframes miyuki-agent-persona-shadow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.84); opacity: 0.7; }
}
@keyframes miyuki-agent-persona-z {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(7px, -13px) scale(1.1); opacity: 0; }
}
`;

function phase(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return -((h % 4600) / 1000);
}

export interface AgentAvatarProps extends Omit<ComponentProps<"svg">, "color" | "children"> {
  mood?: AgentMood;
  color?: AgentColor | (string & {});
  size?: number;
  followPointer?: boolean;
  label?: string;
}

export function AgentAvatar({
  mood = "calm",
  color = "water",
  size = 48,
  followPointer = true,
  label,
  className,
  style,
  ...props
}: AgentAvatarProps) {
  const reduce = useReducedMotion();
  const raw = useId();
  const uid = `miyuki-agent-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const root = useRef<SVGSVGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const moodRef = useRef(mood);
  const c = resolveColor(color);
  const face = faces[mood];

  const [fills, setFills] = useState([{ color: c, n: 0 }]);
  const top = fills[fills.length - 1];
  if (top.color !== c) setFills([...fills.slice(-1), { color: c, n: top.n + 1 }]);

  const fx = useSpring(0, { stiffness: 150, damping: 17 });
  const fy = useSpring(0, { stiffness: 150, damping: 17 });
  const mx = useTransform(fx, (v) => v * 0.8);
  const my = useTransform(fy, (v) => v * 0.8);
  const cx = useTransform(fx, (v) => v * 0.6);
  const cy = useTransform(fy, (v) => v * 0.6);
  const tilt = useTransform(fx, (v) => v * 0.55);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const el = root.current;
    if (!followPointer || !el) return;
    function move(e: PointerEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.6);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / (r.width * 1.2 + 60));
      fx.set((dx / d) * reach * 5);
      fy.set((dy / d) * reach * 3.6);
    }
    function rest() {
      fx.set(0);
      fy.set(0);
    }
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", rest);
      rest();
    };
  }, [followPointer, fx, fy]);

  useEffect(() => {
    if (reduce) return;
    let timer = 0;
    const blink = () => {
      const el = lids.current;
      if (!el || !OPEN[moodRef.current] || typeof el.animate !== "function") return;
      el.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)", offset: 0.45 }, { transform: "scaleY(1)" }],
        { duration: 190, easing: "ease-in-out" },
      );
    };
    const next = () => {
      timer = window.setTimeout(
        () => {
          blink();
          if (Math.random() < 0.22) window.setTimeout(blink, 260);
          next();
        },
        2400 + Math.random() * 3800,
      );
    };
    next();
    return () => window.clearTimeout(timer);
  }, [reduce]);

  const ink = `color-mix(in oklab, ${c} 14%, oklch(0.23 0.045 255))`;
  const paint: CSSProperties = { fill: ink, stroke: ink };
  const delay = `${phase(raw).toFixed(2)}s`;

  const glintBoost = Math.min(1.6, Math.max(1, 64 / size));

  return (
    <svg
      ref={root}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...props}
      className={cn("shrink-0 overflow-visible select-none", className)}
      style={style}
    >
      <style href="miyuki-agent-persona" precedence="miyuki">
        {keyframes}
      </style>
      <defs>
        {fills.map((f) => (
          <radialGradient key={f.n} id={`${uid}-g${f.n}`} cx="0.38" cy="0.4" r="0.72">
            <stop offset="0" style={{ stopColor: `color-mix(in oklab, ${f.color} 50%, oklch(0.99 0.01 230))` }} />
            <stop offset="0.48" style={{ stopColor: f.color }} />
            <stop offset="1" style={{ stopColor: `color-mix(in oklab, ${f.color} 70%, oklch(0.3 0.08 255))` }} />
          </radialGradient>
        ))}
        <clipPath id={`${uid}-clip`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <ellipse
        cx="50"
        cy="96.2"
        rx="18"
        ry="2.4"
        className={cn(
          "fill-[oklch(0.42_0.09_250/0.16)] dark:fill-[oklch(0.05_0.02_250/0.55)] ink:fill-[oklch(0.05_0_0/0.55)]",
          "[transform-box:fill-box] origin-center motion-safe:animate-[miyuki-agent-persona-shadow_4.6s_ease-in-out_infinite]",
        )}
        style={{ animationDelay: delay }}
      />
      <g
        className="[transform-box:view-box] origin-[50%_92%] motion-safe:animate-[miyuki-agent-persona-bob_4.6s_ease-in-out_infinite]"
        style={{ animationDelay: delay }}
      >
        <motion.g style={{ rotate: tilt, originX: 0.5, originY: 1 }}>
          <g clipPath={`url(#${uid}-clip)`}>
            {fills.map((f, i) =>
              i === 0 ? (
                <rect key={f.n} x="0" y="0" width="100" height="100" fill={`url(#${uid}-g${f.n})`} />
              ) : (
                <motion.g
                  key={f.n}
                  initial={reduce ? { opacity: 0 } : { y: 100, x: -14 }}
                  animate={reduce ? { opacity: 1 } : { y: 0, x: 0 }}
                  transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 120, damping: 19 }}
                  onAnimationComplete={() => setFills((cur) => cur.filter((x) => x.n >= f.n))}
                >
                  <path d={WAVE} fill={`url(#${uid}-g${f.n})`} />
                </motion.g>
              ),
            )}
            <path
              d="M64.5 88.2C72.5 85.6 78.6 78.6 80 70.5"
              fill="none"
              stroke="oklch(0.99 0.01 230)"
              strokeOpacity="0.45"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <motion.g style={{ x: cx, y: cy }}>
              {[28.5, 71.5].map((x) => (
                <ellipse
                  key={x}
                  cx={x}
                  cy="70"
                  rx="5.2"
                  ry="2.9"
                  className="transition-opacity duration-300"
                  style={{
                    fill: "color-mix(in oklab, var(--chart-5) 80%, oklch(0.93 0.07 45))",
                    opacity: Math.min(1, face.cheek * 1.2),
                  }}
                />
              ))}
            </motion.g>
            <motion.g style={{ x: fx, y: fy }}>
              <g ref={lids} className="[transform-box:fill-box] origin-center">
                {EYES.map(([ex, ey], i) => (
                  <g key={i} transform={`translate(${ex} ${ey})`}>
                    <MorphPath
                      d={arch(face.brow, i === 1)}
                      fill="none"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      className="transition-[stroke,opacity] duration-300"
                      style={{ stroke: ink, opacity: face.brow[3] }}
                    />
                    <MorphPath
                      d={blob(face.eye, i === 1)}
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                      className="transition-[fill,stroke] duration-500"
                      style={paint}
                    />
                    <motion.circle
                      fill="oklch(0.99 0.01 230)"
                      initial={false}
                      animate={{
                        cx: face.glint.x * FACE,
                        cy: face.glint.y * FACE,
                        r: face.glint.r * FACE * glintBoost,
                        opacity: face.glint.o,
                      }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : {
                              ...SETTLE,
                              opacity: { duration: face.glint.o ? 0.2 : 0.08, delay: face.glint.o ? 0.12 : 0 },
                            }
                      }
                    />
                  </g>
                ))}
              </g>
            </motion.g>
            <motion.g style={{ x: mx, y: my }}>
              <g transform="translate(50 72.5)">
                <MorphPath
                  d={blob(face.mouth)}
                  strokeWidth={1.7}
                  strokeLinejoin="round"
                  className="transition-[fill,stroke] duration-500"
                  style={paint}
                />
                <motion.ellipse
                  cx="0"
                  cy="3.9"
                  rx="2.9"
                  ry="1.6"
                  style={{ fill: "color-mix(in oklab, var(--chart-5) 75%, oklch(0.99 0.01 230))" }}
                  initial={false}
                  animate={{ opacity: face.tongue, scale: face.tongue ? 1 : 0.4 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: face.tongue ? 0.22 : 0.08, delay: face.tongue ? 0.1 : 0 }
                  }
                />
              </g>
            </motion.g>
          </g>
          <path
            d={BODY}
            fill="none"
            strokeWidth="1"
            strokeOpacity="0.14"
            className="transition-[stroke] duration-500"
            style={{ stroke: ink }}
          />
          <path
            d="M29 55.5C29 46 33.5 37 41 29"
            fill="none"
            stroke="oklch(0.99 0.01 230)"
            strokeOpacity="0.8"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </motion.g>
      </g>
      {mood === "sleepy" && size >= 64 && (
        <g className="fill-none stroke-muted-foreground" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {[0, 1].map((i) => (
            <path
              key={i}
              d={i === 0 ? "M71 31h5.4L71 37.2h5.4" : "M80 20.5h3.8L80 24.9h3.8"}
              className="opacity-0 [transform-box:fill-box] origin-center motion-safe:animate-[miyuki-agent-persona-z_2.8s_ease-out_infinite] motion-reduce:opacity-100"
              style={{ animationDelay: `${i * 1.4}s` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

function Swatch({ color }: { color: AgentColor }) {
  const reduce = useReducedMotion();
  return (
    <RadioField value={color} className="flex">
      <RadioButton
        className={({ isFocusVisible }) =>
          cn(
            "group/swatch relative grid size-9 cursor-default place-items-center rounded-full outline-none",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        {({ isSelected, isHovered }) => (
          <>
            <svg viewBox="0 0 100 100" aria-hidden="true" className="size-7 overflow-visible">
              <motion.path
                d={BODY}
                fill="none"
                strokeWidth={6}
                className="stroke-foreground"
                style={{ originX: 0.5, originY: 0.62 }}
                initial={false}
                animate={{ scale: isSelected ? 1.3 : 1, opacity: isSelected ? 1 : 0 }}
                transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 500, damping: 30 }}
              />
              <path
                d={BODY}
                className="transition-transform duration-200 ease-settle [transform-box:fill-box] origin-[50%_62%]"
                style={{
                  fill: colorVar[color],
                  transform: isHovered && !isSelected ? "scale(1.08)" : undefined,
                }}
              />
              <path d={BODY} fill="none" strokeWidth={3} className="stroke-foreground/15" />
            </svg>
            <span className="sr-only">{colorName[color]}</span>
          </>
        )}
      </RadioButton>
    </RadioField>
  );
}

const ARC = [-112, -58, 58, 112];
const ARC_RADIUS = 124;
const CENTER_Y = 138;
const ORBIT = (() => {
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${n2(Math.sin(a) * ARC_RADIUS)} ${n2(-Math.cos(a) * ARC_RADIUS)}`;
  };
  return `M${at(-128)}A${ARC_RADIUS} ${ARC_RADIUS} 0 1 1 ${at(128)}`;
})();

export interface AgentConfig {
  name: string;
  role: string;
  description: string;
  language: string;
  notifications: boolean;
  mood: AgentMood;
  color: AgentColor;
}

export interface AgentPersonaProps extends Omit<ComponentProps<"section">, "onChange" | "defaultValue" | "children"> {
  defaultValue?: Partial<AgentConfig>;
  onChange?: (config: AgentConfig) => void;
  roles?: string[];
  languages?: string[];
}

const defaultRoles = ["Route planner", "Forecast reader", "Hut booker", "Packing helper", "Trip reporter"];
const defaultLanguages = ["English", "日本語", "Deutsch", "Français", "Español"];

export function AgentPersona({
  defaultValue,
  onChange,
  roles = defaultRoles,
  languages = defaultLanguages,
  className,
  ...props
}: AgentPersonaProps) {
  const [config, setConfig] = useState<AgentConfig>(() => ({
    name: "",
    role: roles[0] ?? "",
    description: "",
    language: languages[0] ?? "",
    notifications: true,
    mood: "calm",
    color: "water",
    ...defaultValue,
  }));
  const [slots, setSlots] = useState<AgentMood[]>(() => MOODS.filter((m) => m !== config.mood));
  const c = colorVar[config.color];

  function update(patch: Partial<AgentConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    onChange?.(next);
  }

  function choose(i: number) {
    const picked = slots[i];
    setSlots(slots.map((m, k) => (k === i ? config.mood : m)));
    update({ mood: picked });
  }

  const name = config.name.trim();

  return (
    <section
      {...props}
      className={cn(
        "@container w-full overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="relative h-[276px] @max-[21rem]:h-[238px] @max-[18rem]:h-[206px]">
        <div className="absolute inset-x-0 top-0 h-[276px] origin-top @max-[21rem]:scale-[0.86] @max-[18rem]:scale-[0.74]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color] duration-700 ease-settle"
            style={{
              top: CENTER_Y,
              backgroundColor: `color-mix(in oklab, ${c} 22%, transparent)`,
              maskImage: "radial-gradient(closest-side, #000 10%, transparent)",
              WebkitMaskImage: "radial-gradient(closest-side, #000 10%, transparent)",
            }}
          />
          <svg
            aria-hidden="true"
            width={ARC_RADIUS * 2 + 4}
            height={ARC_RADIUS * 2 + 4}
            viewBox={`${-ARC_RADIUS - 2} ${-ARC_RADIUS - 2} ${ARC_RADIUS * 2 + 4} ${ARC_RADIUS * 2 + 4}`}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
            style={{ top: CENTER_Y }}
          >
            <path
              d={ORBIT}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="0.5 7"
              className="stroke-border-strong"
            />
          </svg>
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: CENTER_Y }}>
            <AgentAvatar
              size={168}
              mood={config.mood}
              color={config.color}
              label={`${name || "Your agent"}, ${moodName[config.mood].toLowerCase()}`}
            />
          </div>
          <div role="group" aria-label="Mood">
            {slots.map((m, i) => {
              const a = (ARC[i] * Math.PI) / 180;
              return (
                <TooltipTrigger key={i} delay={300}>
                  <Button
                    aria-label={moodName[m]}
                    onPress={() => choose(i)}
                    className={cn(
                      "absolute grid size-14 -translate-x-1/2 -translate-y-1/2 cursor-default place-items-center rounded-full bg-card shadow-xs ring-1 ring-border outline-none",
                      "transition-[translate,box-shadow] duration-200 ease-settle",
                      "data-[hovered]:-translate-y-[calc(50%+2px)] data-[hovered]:shadow-sm",
                      "data-[pressed]:scale-[0.96] data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                    )}
                    style={{
                      left: `calc(50% + ${(Math.sin(a) * ARC_RADIUS).toFixed(1)}px)`,
                      top: CENTER_Y - Math.cos(a) * ARC_RADIUS,
                    }}
                  >
                    <AgentAvatar size={42} mood={m} color={config.color} />
                  </Button>
                  <Tooltip>{moodName[m]}</Tooltip>
                </TooltipTrigger>
              );
            })}
          </div>
        </div>
      </div>
      <div className="-mt-1 flex flex-col items-center px-6 pb-5 text-center">
        <p className={cn("max-w-full truncate text-lg leading-7 font-semibold", !name && "text-muted-foreground")}>
          {name || "Unnamed agent"}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">
          {config.role}
          <span aria-hidden="true"> · </span>
          {moodName[config.mood]}
        </p>
        <RadioGroup
          aria-label="Colour"
          orientation="horizontal"
          value={config.color}
          onChange={(v) => update({ color: v as AgentColor })}
          className="mt-4 flex flex-wrap justify-center gap-1"
        >
          {COLORS.map((col) => (
            <Swatch key={col} color={col} />
          ))}
        </RadioGroup>
      </div>
      <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 sm:p-6">
        <TextField
          label="Name"
          placeholder="Give your agent a name"
          value={config.name}
          onChange={(v) => update({ name: v })}
        />
        <Select label="Role" value={config.role} onChange={(k) => k != null && update({ role: String(k) })}>
          {roles.map((r) => (
            <SelectItem key={r} id={r}>
              {r}
            </SelectItem>
          ))}
        </Select>
        <TextArea
          className="sm:col-span-2"
          label="Description"
          placeholder="What should it help with?"
          minRows={3}
          maxRows={6}
          value={config.description}
          onChange={(v) => update({ description: v })}
        />
        <Select label="Language" value={config.language} onChange={(k) => k != null && update({ language: String(k) })}>
          {languages.map((l) => (
            <SelectItem key={l} id={l}>
              {l}
            </SelectItem>
          ))}
        </Select>
        <div className="flex items-end sm:pb-2">
          <Switch isSelected={config.notifications} onChange={(on) => update({ notifications: on })}>
            Notifications
          </Switch>
        </div>
      </div>
    </section>
  );
}
