"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TypingKeysPress {
  code: string;
  key: string;
  source: "keyboard" | "pointer";
}

export interface TypingKeysProps extends Omit<ComponentProps<"div">, "children"> {
  sound?: boolean;
  showPreview?: boolean;
  onKey?: (press: TypingKeysPress) => void;
}

type Legend = "center" | "start" | "end";

interface Cap {
  code: string;
  label?: ReactNode;
  shift?: string;
  key: string;
  w?: number;
  legend?: Legend;
}

const ch = (code: string, label: string, key = label.toLowerCase(), shift?: string): Cap => ({
  code,
  label,
  key,
  shift,
});
const mod = (code: string, label: string, w: number, legend: Legend, key = code): Cap => ({
  code,
  label,
  key,
  w,
  legend,
});
const letters = (row: string) => [...row].map((l) => ch(`Key${l}`, l));

const arrow = (code: string, Icon: typeof ArrowUp): Cap => ({
  code,
  key: code,
  label: <Icon aria-hidden="true" className="size-[1.15em]" strokeWidth={2} />,
});

const ROWS: Cap[][] = [
  [
    mod("Escape", "esc", 1, "start"),
    ...Array.from({ length: 12 }, (_, i) => mod(`F${i + 1}`, `F${i + 1}`, 1, "center")),
    mod("PrintScreen", "prt", 1, "center"),
    mod("Insert", "ins", 1, "center"),
    mod("Delete", "del", 1, "center"),
  ],
  [
    ch("Backquote", "`", "`", "~"),
    ...[..."1234567890"].map((d, i) => ch(i === 9 ? "Digit0" : `Digit${d}`, d, d, "!@#$%^&*()"[i])),
    ch("Minus", "-", "-", "_"),
    ch("Equal", "=", "=", "+"),
    mod("Backspace", "backspace", 2, "end"),
    mod("Home", "home", 1, "center"),
  ],
  [
    mod("Tab", "tab", 1.5, "start", "Tab"),
    ...letters("QWERTYUIOP"),
    ch("BracketLeft", "[", "[", "{"),
    ch("BracketRight", "]", "]", "}"),
    { ...ch("Backslash", "\\", "\\", "|"), w: 1.5 },
    mod("PageUp", "pg up", 1, "center"),
  ],
  [
    mod("CapsLock", "caps", 1.75, "start"),
    ...letters("ASDFGHJKL"),
    ch("Semicolon", ";", ";", ":"),
    ch("Quote", "'", "'", '"'),
    mod("Enter", "return", 2.25, "end"),
    mod("PageDown", "pg dn", 1, "center"),
  ],
  [
    mod("ShiftLeft", "shift", 2.25, "start", "Shift"),
    ...letters("ZXCVBNM"),
    ch("Comma", ",", ",", "<"),
    ch("Period", ".", ".", ">"),
    ch("Slash", "/", "/", "?"),
    mod("ShiftRight", "shift", 1.75, "end", "Shift"),
    arrow("ArrowUp", ArrowUp),
    mod("End", "end", 1, "center"),
  ],
  [
    mod("ControlLeft", "ctrl", 1.25, "start", "Control"),
    mod("AltLeft", "opt", 1.25, "start", "Alt"),
    mod("MetaLeft", "cmd", 1.25, "start", "Meta"),
    { code: "Space", key: " ", w: 6.25 },
    mod("MetaRight", "cmd", 1, "end", "Meta"),
    mod("AltRight", "opt", 1, "end", "Alt"),
    mod("ControlRight", "ctrl", 1, "end", "Control"),
    arrow("ArrowLeft", ArrowLeft),
    arrow("ArrowDown", ArrowDown),
    arrow("ArrowRight", ArrowRight),
  ],
];

const ROW_OF = new Map<string, number>();
const KEY_OF = new Map<string, string>();
ROWS.forEach((row, r) =>
  row.forEach((cap) => {
    ROW_OF.set(cap.code, r);
    KEY_OF.set(cap.code, cap.key);
  }),
);

const MIN_PRESS = 110;
const LIFETIME = 1800;
const MAX_CHARS = 14;

interface Typed {
  id: number;
  ch: string;
}

function createClicker() {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let out: GainNode | null = null;
  return {
    play(row: number) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!ctx) {
        ctx = new Ctor();
        out = ctx.createGain();
        out.gain.value = 0.55;
        out.connect(ctx.destination);
        const length = Math.floor(ctx.sampleRate * 0.06);
        noise = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      if (ctx.state === "suspended") void ctx.resume();
      if (!noise || !out) return;
      const t = ctx.currentTime + 0.001;
      const pitch = 1 + (2.5 - row) * 0.045 + (Math.random() - 0.5) * 0.05;

      const burst = ctx.createBufferSource();
      burst.buffer = noise;
      burst.playbackRate.value = pitch;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 3400 * pitch;
      band.Q.value = 1.1;
      const click = ctx.createGain();
      click.gain.setValueAtTime(0.0001, t);
      click.gain.exponentialRampToValueAtTime(0.5, t + 0.0015);
      click.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
      burst.connect(band).connect(click).connect(out);
      burst.start(t);
      burst.stop(t + 0.06);

      const body = ctx.createOscillator();
      body.type = "triangle";
      body.frequency.setValueAtTime(170 * pitch, t);
      body.frequency.exponentialRampToValueAtTime(72 * pitch, t + 0.05);
      const thump = ctx.createGain();
      thump.gain.setValueAtTime(0.0001, t);
      thump.gain.exponentialRampToValueAtTime(0.32, t + 0.004);
      thump.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      body.connect(thump).connect(out);
      body.start(t);
      body.stop(t + 0.09);
    },
    close() {
      void ctx?.close();
      ctx = null;
    },
  };
}

export function TypingKeys({ sound = false, showPreview = true, onKey, className, ...props }: TypingKeysProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const [typed, setTyped] = useState<Typed[]>([]);
  const latest = useRef({ sound, showPreview, onKey });
  const pressRef = useRef<
    ((code: string, key: string, source: TypingKeysPress["source"], repeat?: boolean) => void) | null
  >(null);
  const releaseRef = useRef<((code: string) => void) | null>(null);

  useEffect(() => {
    latest.current = { sound, showPreview, onKey };
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const clicker = createClicker();
    const downAt = new Map<string, number>();
    const timers = new Map<string, number>();
    const expiries = new Set<number>();
    let seq = 0;
    let visible = false;

    const capFor = (code: string) => root.querySelector<HTMLElement>(`[data-code="${code}"]`);

    const echo = (key: string) => {
      if (!latest.current.showPreview) return;
      if (key === "Backspace") {
        setTyped((list) => list.slice(0, -1));
        return;
      }
      const glyph = key === "Enter" ? "↵" : key === "Tab" ? "⇥" : key.length === 1 ? key : null;
      if (!glyph) return;
      const id = ++seq;
      setTyped((list) => [...list, { id, ch: glyph }].slice(-MAX_CHARS));
      const timer = window.setTimeout(() => {
        expiries.delete(timer);
        setTyped((list) => list.filter((t) => t.id !== id));
      }, LIFETIME);
      expiries.add(timer);
    };

    const press = (code: string, key: string, source: TypingKeysPress["source"], repeat = false, chord = false) => {
      const cap = capFor(code);
      if (cap && !repeat) {
        const pending = timers.get(code);
        if (pending) window.clearTimeout(pending);
        timers.delete(code);
        cap.setAttribute("data-down", "");
        downAt.set(code, performance.now());
        if (latest.current.sound) clicker.play(ROW_OF.get(code) ?? 2);
      }
      if (!chord) echo(key);
      latest.current.onKey?.({ code, key, source });
    };

    const release = (code: string) => {
      const cap = capFor(code);
      if (!cap) return;
      const held = performance.now() - (downAt.get(code) ?? 0);
      const lift = () => {
        cap.removeAttribute("data-down");
        timers.delete(code);
        downAt.delete(code);
      };
      if (held >= MIN_PRESS) lift();
      else timers.set(code, window.setTimeout(lift, MIN_PRESS - held));
    };

    const releaseAll = () => {
      for (const code of [...downAt.keys()]) release(code);
    };

    pressRef.current = press;
    releaseRef.current = release;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      press(e.code, e.key, "keyboard", e.repeat, e.metaKey || e.ctrlKey);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      release(e.code);
      if (e.key === "Meta") releaseAll();
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (!visible) releaseAll();
    });
    io.observe(root);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);

    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      for (const t of timers.values()) window.clearTimeout(t);
      for (const t of expiries) window.clearTimeout(t);
      pressRef.current = null;
      releaseRef.current = null;
      clicker.close();
    };
  }, []);

  const pointerCap = (target: EventTarget) =>
    target instanceof Element ? target.closest<HTMLElement>("[data-code]") : null;

  return (
    <div
      role="img"
      aria-label="Keyboard"
      {...props}
      ref={rootRef}
      className={cn(
        "w-full select-none",
        "[--miyuki-typing-keys-edge:var(--border-strong)] [--miyuki-typing-keys-shade:oklch(0.42_0.09_250/0.12)]",
        "dark:[--miyuki-typing-keys-edge:oklch(0.13_0.024_250)] ink:[--miyuki-typing-keys-edge:oklch(0.13_0_0)] dark:[--miyuki-typing-keys-shade:oklch(0.05_0.02_250/0.5)] ink:[--miyuki-typing-keys-shade:oklch(0.05_0_0/0.5)]",
        className,
      )}
    >
      {showPreview ? (
        <div
          aria-hidden="true"
          className="pointer-events-none flex h-14 items-end justify-center overflow-hidden pb-3 font-mono text-[22px] leading-none whitespace-pre"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {typed.map((t, i) => (
              <motion.span
                key={t.id}
                layout={reduced ? false : "position"}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, y: -16, transition: { duration: 0.32 } }
                }
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "inline-block min-w-[0.6em] text-center transition-colors duration-500",
                  i === typed.length - 1 ? "text-brand-strong" : "text-foreground",
                )}
              >
                {t.ch}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      <div className="@container rounded-2xl bg-muted p-3 ring-1 ring-border ring-inset dark:ring-0">
        <div
          aria-hidden="true"
          className="touch-manipulation"
          onPointerDown={(e) => {
            const cap = pointerCap(e.target);
            if (!cap || e.button !== 0) return;
            const code = cap.dataset.code ?? "";
            cap.setPointerCapture?.(e.pointerId);
            pressRef.current?.(code, KEY_OF.get(code) ?? "", "pointer");
          }}
          onPointerUp={(e) => {
            const cap = pointerCap(e.target);
            if (cap?.dataset.code) releaseRef.current?.(cap.dataset.code);
          }}
          onPointerCancel={(e) => {
            const cap = pointerCap(e.target);
            if (cap?.dataset.code) releaseRef.current?.(cap.dataset.code);
          }}
        >
          {ROWS.map((row, r) => (
            <div
              key={r}
              className={cn(
                "grid grid-cols-[repeat(64,minmax(0,1fr))]",
                r === 0 ? "mb-[0.9cqw] h-[calc(100cqw/16*0.68)]" : "h-[calc(100cqw/16)]",
              )}
            >
              {row.map((cap) => (
                <div
                  key={cap.code}
                  className="min-w-0 p-[0.3cqw]"
                  style={{ gridColumn: `span ${Math.round((cap.w ?? 1) * 4)}` } as CSSProperties}
                >
                  <Keycap cap={cap} small={r === 0} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Keycap({ cap, small }: { cap: Cap; small: boolean }) {
  const legend = cap.legend ?? "center";
  const word = typeof cap.label === "string" && cap.label.length > 1;
  return (
    <div
      data-code={cap.code}
      className={cn(
        "group/key relative h-[calc(100%-2px)] cursor-default overflow-hidden rounded-[clamp(3px,0.9cqw,6px)] border border-border bg-card",
        "bg-linear-to-b from-card to-[color-mix(in_oklab,var(--card)_94%,var(--muted-foreground))]",
        "dark:from-[color-mix(in_oklab,var(--card)_88%,var(--foreground))] dark:to-card dark:border-[color-mix(in_oklab,var(--border)_70%,var(--card))]",
        "shadow-[0_2px_0_0_var(--miyuki-typing-keys-edge),0_3px_5px_-1px_var(--miyuki-typing-keys-shade)]",
        "transition-[translate,box-shadow] duration-150 ease-settle",
        "data-[down]:translate-y-[2px] data-[down]:shadow-[0_0_0_0_var(--miyuki-typing-keys-edge),0_1px_1px_0_var(--miyuki-typing-keys-shade)] data-[down]:duration-[60ms]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-brand/30 opacity-0 transition-opacity duration-500 ease-settle dark:bg-brand/35",
          "group-data-[down]/key:opacity-100 group-data-[down]/key:duration-[40ms]",
        )}
      />
      <span
        className={cn(
          "pointer-events-none relative flex size-full text-muted-foreground transition-colors duration-500 group-data-[down]/key:text-brand-strong group-data-[down]/key:duration-[40ms]",
          legend === "center" && "items-center justify-center",
          legend === "start" && "items-end justify-start px-[0.75cqw] pb-[0.55cqw]",
          legend === "end" && "items-end justify-end px-[0.75cqw] pb-[0.55cqw]",
          small || word ? "text-[clamp(5.5px,1.42cqw,10px)]" : "text-[clamp(6.5px,1.62cqw,11.5px)]",
          word ? "font-normal tracking-[-0.01em]" : "font-medium",
        )}
      >
        {cap.shift ? (
          <span className="flex flex-col items-center leading-[1.15]">
            <span className="opacity-60">{cap.shift}</span>
            <span>{cap.label}</span>
          </span>
        ) : (
          <span className="leading-none whitespace-nowrap">{cap.label}</span>
        )}
      </span>
    </div>
  );
}
