"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  memo,
  type Ref,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface SplitFlapBoardProps extends Omit<ComponentProps<"div">, "children"> {
  text: string;
  rows?: number;
  cols?: number;
  duration?: number;
  sound?: boolean;
  accent?: RegExp | string;
  charset?: string;
  ref?: Ref<HTMLDivElement>;
}

interface Glyph {
  ch: string;
  accent: boolean;
}

const DEFAULT_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/'&";

const FALL: Keyframe[] = [
  { transform: "perspective(6em) rotateX(0deg)", filter: "brightness(1)" },
  { transform: "perspective(6em) rotateX(-90deg)", filter: "brightness(0.7)" },
];

const LAND: Keyframe[] = [
  {
    transform: "perspective(6em) rotateX(90deg)",
    filter: "brightness(0.78)",
    easing: "cubic-bezier(0.5, 0, 0.9, 0.5)",
  },
  {
    offset: 0.62,
    transform: "perspective(6em) rotateX(0deg)",
    filter: "brightness(1)",
    easing: "cubic-bezier(0.2, 0.6, 0.4, 1)",
  },
  {
    offset: 0.8,
    transform: "perspective(6em) rotateX(9deg)",
    filter: "brightness(1)",
    easing: "cubic-bezier(0.5, 0, 0.5, 1)",
  },
  { transform: "perspective(6em) rotateX(0deg)", filter: "brightness(1)" },
];

interface Job {
  at: number;
  run: () => void;
}

const jobs: Job[] = [];
let pump = 0;

function runDue(now: number) {
  pump = 0;
  const due: Job[] = [];
  for (let i = 0; i < jobs.length; ) {
    if (jobs[i].at <= now) due.push(...jobs.splice(i, 1));
    else i++;
  }
  for (const job of due) job.run();
  if (jobs.length && !pump) pump = requestAnimationFrame(runDue);
}

function later(run: () => void, ms: number) {
  const job: Job = { at: performance.now() + ms, run };
  jobs.push(job);
  if (!pump) pump = requestAnimationFrame(runDue);
  return () => {
    const i = jobs.indexOf(job);
    if (i >= 0) jobs.splice(i, 1);
  };
}

function hash(a: number, b: number, c: number) {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b) ^ Math.imul(c + 13, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

function wrap(text: string, rows: number, cols: number): string[] {
  const out: string[] = [];
  for (const raw of text.toUpperCase().split("\n")) {
    const line = raw.replace(/\t/g, " ");
    if (Array.from(line).length <= cols) {
      out.push(line);
      continue;
    }
    let current: string[] = [];
    for (const word of line.split(/ +/).filter(Boolean)) {
      let chars = Array.from(word);
      while (chars.length > cols) {
        if (current.length) out.push(current.join(""));
        current = [];
        out.push(chars.slice(0, cols).join(""));
        chars = chars.slice(cols);
      }
      if (!chars.length) continue;
      if (!current.length) current = chars;
      else if (current.length + 1 + chars.length <= cols) current = [...current, " ", ...chars];
      else {
        out.push(current.join(""));
        current = chars;
      }
    }
    if (current.length) out.push(current.join(""));
  }
  return Array.from({ length: rows }, (_, r) => {
    const chars = Array.from(out[r] ?? "").slice(0, cols);
    while (chars.length < cols) chars.push(" ");
    return chars.join("");
  });
}

function accents(line: string, accent: RegExp | string | undefined): boolean[] {
  const chars = Array.from(line);
  const marks = chars.map(() => false);
  if (accent === undefined || accent === "") return marks;
  const pattern =
    typeof accent === "string"
      ? new RegExp(accent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
      : new RegExp(accent.source, accent.flags.includes("g") ? accent.flags : `${accent.flags}g`);
  for (const match of line.matchAll(pattern)) {
    if (!match[0]) continue;
    let start = Array.from(line.slice(0, match.index)).length;
    let end = start + Array.from(match[0]).length;
    while (start > 0 && chars[start - 1] !== " ") start--;
    while (end < chars.length && chars[end] !== " ") end++;
    for (let i = start; i < end; i++) if (chars[i] !== " ") marks[i] = true;
  }
  return marks;
}

interface Voice {
  ctx: AudioContext;
  noise: AudioBuffer;
  out: GainNode;
  next: number;
}

let voice: Voice | null = null;

function clack() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  if (!voice) {
    const ctx = new AudioContext();
    const length = Math.floor(ctx.sampleRate * 0.05);
    const noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const out = ctx.createGain();
    out.gain.value = 0.35;
    out.connect(ctx.destination);
    voice = { ctx, noise, out, next: 0 };
  }
  const { ctx, noise, out } = voice;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
    return;
  }
  const now = ctx.currentTime;
  const t = Math.max(now, voice.next);
  if (t - now > 0.06) return;
  voice.next = t + 0.011;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.8 + Math.random() * 0.4;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1500 + Math.random() * 1100;
  band.Q.value = 1.1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  source.connect(band).connect(gain).connect(out);
  source.start(t);
  source.stop(t + 0.05);
}

function write(half: Element, glyph: Glyph) {
  const face = half.firstElementChild;
  if (!face?.firstElementChild) return;
  face.toggleAttribute("data-accent", glyph.accent);
  face.firstElementChild.textContent = glyph.ch === " " ? "\u00a0" : glyph.ch;
}

function Half({ glyph, side }: { glyph: Glyph; side: "top" | "bottom" }) {
  const top = side === "top";
  return (
    <span
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden bg-[color-mix(in_oklab,var(--primary)_86%,var(--brand))] dark:bg-secondary",
        top
          ? "top-0 origin-bottom rounded-t-[0.12em] bg-linear-to-b from-white/7 to-transparent dark:from-white/4"
          : "bottom-0 origin-top rounded-b-[0.12em]",
      )}
    >
      <span
        data-accent={glyph.accent ? "" : undefined}
        className={cn(
          "absolute inset-x-0 flex h-[200%] items-center justify-center text-primary-foreground data-[accent]:text-chart-5 dark:text-foreground dark:data-[accent]:text-chart-5",
          top ? "top-0" : "bottom-0",
        )}
      >
        <span className="[text-box:trim-both_cap_alphabetic]">{glyph.ch === " " ? "\u00a0" : glyph.ch}</span>
      </span>
      {top ? null : (
        <span className="absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-black/30 to-transparent dark:from-black/35" />
      )}
    </span>
  );
}

interface FlapProps {
  ch: string;
  accent: boolean;
  delay: number;
  step: number;
  extra: number;
  charset: string;
  sound: boolean;
  reduced: boolean;
  live: RefObject<boolean>;
}

const Flap = memo(function Flap({ ch, accent, delay, step, extra, charset, sound, reduced, live }: FlapProps) {
  const [first] = useState<Glyph>({ ch, accent });
  const root = useRef<HTMLSpanElement>(null);
  const latest = useRef<Glyph>(first);
  const soundRef = useRef(sound);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    const el = root.current;
    const from = latest.current;
    if (!el || (from.ch === ch && from.accent === accent)) return;
    const [top, bottom] = el.children;
    const target: Glyph = { ch, accent };
    const settle = (glyph: Glyph) => {
      write(top, glyph);
      write(bottom, glyph);
      latest.current = glyph;
    };
    if (reduced || !live.current || typeof top.animate !== "function") {
      settle(target);
      return;
    }

    const set = Array.from(charset);
    const path: Glyph[] = [];
    if (from.ch !== ch) {
      const at = set.indexOf(ch);
      for (let k = extra; k >= 1; k--) {
        const c =
          at >= 0 ? set[(at - k + set.length * 4) % set.length] : set[hash(k, ch.charCodeAt(0), extra) % set.length];
        if (c !== from.ch && c !== ch && (path.length === 0 || path[path.length - 1].ch !== c))
          path.push({ ch: c, accent: false });
      }
    }
    path.push(target);

    const fall = top.cloneNode(true) as HTMLElement;
    const land = bottom.cloneNode(true) as HTMLElement;
    fall.style.zIndex = "10";
    land.style.zIndex = "10";
    const half = step / 2;
    let falling: Animation | null = null;
    let landing: Animation | null = null;
    let cancel = () => {};
    let i = 0;
    let current = from;
    const advance = () => {
      if (i >= path.length) {
        fall.remove();
        land.remove();
        settle(current);
        return;
      }
      const to = path[i++];
      write(top, to);
      write(bottom, current);
      write(fall, current);
      write(land, to);
      if (!fall.isConnected) el.append(fall, land);
      falling?.cancel();
      landing?.cancel();
      falling = fall.animate(FALL, { duration: half, easing: "cubic-bezier(0.55, 0, 0.9, 0.45)", fill: "both" });
      landing = land.animate(LAND, { duration: half * 1.15, delay: half, fill: "both" });
      if (soundRef.current) clack();
      cancel = later(() => {
        current = to;
        latest.current = to;
        advance();
      }, step);
    };
    cancel = later(advance, delay);
    return () => {
      cancel();
      fall.remove();
      land.remove();
      settle(latest.current);
    };
  }, [ch, accent, delay, step, extra, charset, reduced, live]);

  return (
    <span
      ref={root}
      className="relative block h-[calc(var(--miyuki-split-flap-board-cell)*1.42)] [contain:size_layout_style]"
    >
      <Half glyph={first} side="top" />
      <Half glyph={first} side="bottom" />
      <span className="absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-black/55 dark:bg-background/90" />
    </span>
  );
});

export function SplitFlapBoard({
  text,
  rows = 4,
  cols = 22,
  duration = 1200,
  sound = false,
  accent,
  charset = DEFAULT_CHARSET,
  className,
  style,
  ref,
  ...props
}: SplitFlapBoardProps) {
  const reduced = useReducedMotion() === true;
  const rowCount = Math.max(1, Math.floor(rows));
  const colCount = Math.max(1, Math.floor(cols));
  const lines = wrap(text, rowCount, colCount);
  const set = Array.from(new Set(Array.from(` ${charset.toUpperCase()}`))).join("");
  const step = Math.max(80, Math.min(420, duration / 6));
  const grid = useRef<HTMLDivElement>(null);
  const live = useRef(true);

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      live.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "@container w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4 dark:bg-card/60",
        className,
      )}
      style={style}
    >
      <div className="sr-only">
        {text.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <div
        ref={grid}
        aria-hidden="true"
        className="grid font-mono leading-none font-medium select-none"
        style={
          {
            "--miyuki-split-flap-board-gap": "max(2px, 0.45cqi)",
            "--miyuki-split-flap-board-cell": `calc((100cqi - ${colCount - 1} * var(--miyuki-split-flap-board-gap)) / ${colCount})`,
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            columnGap: "var(--miyuki-split-flap-board-gap)",
            rowGap: "calc(var(--miyuki-split-flap-board-gap) * 1.8)",
            fontSize: "calc(var(--miyuki-split-flap-board-cell) * 1.12)",
          } as CSSProperties
        }
      >
        {lines.map((line, r) => {
          const marks = accents(line, accent);
          return Array.from(line).map((ch, c) => (
            <Flap
              key={`${r}-${c}`}
              ch={ch}
              accent={marks[c]}
              delay={c * 26 + r * 9}
              step={step}
              extra={2 + (hash(r, c, ch.codePointAt(0) ?? 0) % 4)}
              charset={set}
              sound={sound}
              reduced={reduced}
              live={live}
            />
          ));
        })}
      </div>
    </div>
  );
}
