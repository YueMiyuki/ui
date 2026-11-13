"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type FormEvent, type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SnowdriftInputProps extends Omit<ComponentProps<"form">, "onChange" | "onSubmit" | "children"> {
  placeholders?: string[];
  interval?: number;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  submitLabel?: string;
  ref?: Ref<HTMLFormElement>;
}

interface Grain {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  wobble: number;
  size: number;
  free: boolean;
}

const BLEED = { top: 64, bottom: 8 };

export function SnowdriftInput({
  placeholders = ["Search"],
  interval = 3000,
  onChange,
  onSubmit,
  name,
  disabled = false,
  submitLabel = "Search",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
  ...props
}: SnowdriftInputProps) {
  const [value, setValue] = useState("");
  const [index, setIndex] = useState(0);
  const [vanishing, setVanishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const reduce = useReducedMotion();
  const count = placeholders.length;
  const idle = value === "" && !vanishing;

  useEffect(() => {
    if (!idle || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), Math.max(800, interval));
    return () => window.clearInterval(id);
  }, [idle, count, interval]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const settle = () => {
    setVanishing(false);
    setIndex((i) => i + 1);
  };

  const vanish = (text: string) => {
    const input = inputRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!input || !canvas || !ctx) return;
    setVanishing(true);

    const field = input.getBoundingClientRect();
    const k = input.offsetWidth > 0 ? field.width / input.offsetWidth : 1;
    const cs = getComputedStyle(input);
    const padStart = parseFloat(cs.paddingLeft) || 0;
    const w = input.offsetWidth;
    const h = input.offsetHeight;
    const form = input.parentElement;
    const W = Math.max(w, (form?.clientWidth ?? w) - input.offsetLeft);
    const H = h + BLEED.top + BLEED.bottom;
    const ratio = Math.min(2, (window.devicePixelRatio || 1) * k);

    canvas.width = Math.ceil(W * ratio);
    canvas.height = Math.ceil(H * ratio);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.style.left = `${input.offsetLeft}px`;
    canvas.style.top = `${input.offsetTop - BLEED.top}px`;

    const ink = document.createElement("canvas");
    ink.width = canvas.width;
    ink.height = canvas.height;
    const ictx = ink.getContext("2d", { willReadFrequently: true });
    if (!ictx) {
      setVanishing(false);
      return;
    }
    ictx.scale(ratio, ratio);
    ictx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ictx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    ictx.fillStyle = cs.color;
    ictx.textBaseline = "alphabetic";
    const m = ictx.measureText(text);
    const baseline = BLEED.top + h / 2 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
    const left = padStart - input.scrollLeft;
    const right = w - (parseFloat(cs.paddingRight) || 0);
    ictx.save();
    ictx.beginPath();
    ictx.rect(padStart - 1, 0, right - padStart + 2, H);
    ictx.clip();
    ictx.fillText(text, left, baseline);
    ictx.restore();

    const color = cs.color;
    const textEnd = Math.min(right, left + m.width);
    const span = Math.max(1, textEnd - padStart);

    if (reduce) {
      const start = performance.now();
      const fade = (now: number) => {
        const t = Math.min(1, (now - start) / 160);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(ink, 0, 0);
        if (t < 1) frame.current = requestAnimationFrame(fade);
        else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          settle();
        }
      };
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(fade);
      return;
    }

    const data = ictx.getImageData(0, 0, ink.width, ink.height).data;
    const step = Math.max(1, Math.round(ratio));
    const grains: Grain[] = [];
    for (let py = 0; py < ink.height; py += step) {
      for (let px = 0; px < ink.width; px += step) {
        const alpha = data[(py * ink.width + px) * 4 + 3];
        if (alpha < 40 || Math.random() < 0.3) continue;
        grains.push({
          x: px / ratio,
          y: py / ratio,
          a: (alpha / 255) * (Math.random() < 0.35 ? 0.55 : 1),
          vx: 110 + Math.random() * 170,
          vy: -(8 + Math.random() * 46),
          life: 0.45 + Math.random() * 0.6,
          age: 0,
          wobble: Math.random() * Math.PI * 2,
          size: Math.random() < 0.15 ? 1.5 : 1,
          free: false,
        });
      }
    }

    const sweep = Math.min(1.1, 0.42 + span / 450);
    const start = performance.now();
    let last = start;
    const grainSize = 1 / ratio;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = (now - start) / 1000;
      const front = padStart - 6 + (span + 12) * Math.min(1, elapsed / sweep);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      if (front < textEnd + 6) {
        const sx = Math.max(0, Math.floor(front * ratio));
        ctx.drawImage(ink, sx, 0, ink.width - sx, ink.height, sx, 0, ink.width - sx, ink.height);
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = color;
      let alive = 0;
      for (const g of grains) {
        if (!g.free) {
          if (g.x + (g.wobble - Math.PI) * 1.2 > front) {
            alive++;
            if (g.x < front) {
              ctx.globalAlpha = g.a;
              ctx.fillRect(g.x, g.y, 1, 1);
            }
            continue;
          }
          g.free = true;
        }
        g.age += dt;
        if (g.age >= g.life) continue;
        alive++;
        const t = g.age / g.life;
        g.vx += (160 + 320 * t) * dt;
        g.vy -= 46 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt + Math.sin(g.wobble + g.age * 11) * 0.3;
        ctx.globalAlpha = g.a * (1 - t) ** 1.7;
        const s = g.size * (1 - 0.4 * t);
        ctx.fillRect(g.x, g.y, Math.max(grainSize, s), Math.max(grainSize, s));
      }

      if (alive > 0 || front < textEnd + 6) frame.current = requestAnimationFrame(tick);
      else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        settle();
      }
    };

    cancelAnimationFrame(frame.current);
    tick(start);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.trim() === "" || disabled) return;
    onSubmit?.(value);
    vanish(value);
    setValue("");
    onChange?.("");
  };

  const shown = placeholders[index % Math.max(1, count)] ?? "";

  return (
    <form
      {...props}
      onSubmit={submit}
      className={cn(
        "group/vanish relative flex h-12 w-full items-center rounded-full border border-border bg-card shadow-sm",
        "transition-[border-color,box-shadow] duration-150 ease-settle",
        "hover:border-border-strong focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring focus-within:hover:border-brand",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        name={name}
        value={value}
        disabled={disabled}
        aria-label={ariaLabelledby ? undefined : (ariaLabel ?? shown)}
        aria-labelledby={ariaLabelledby}
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
        }}
        className="h-full min-w-0 flex-1 rounded-full bg-transparent ps-5 pe-3 text-base text-foreground outline-none"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 start-0 end-14 flex items-center overflow-hidden ps-5",
          !idle && "invisible",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${index}-${shown}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { y: { type: "spring", stiffness: 260, damping: 30 }, opacity: { duration: 0.25 } }
            }
            className="truncate text-base text-muted-foreground"
          >
            {shown}
          </motion.span>
        </AnimatePresence>
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        width={0}
        height={0}
        className="pointer-events-none absolute [mask-image:linear-gradient(to_right,#000_calc(100%-56px),transparent_calc(100%-8px))]"
      />
      <button
        type="submit"
        disabled={disabled || value.trim() === ""}
        aria-label={submitLabel}
        className={cn(
          "me-1.5 grid size-9 shrink-0 place-items-center rounded-full outline-none",
          "transition-[background-color,color,transform,box-shadow] duration-200 ease-settle",
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95",
          "focus-visible:ring-[3px] focus-visible:ring-ring",
          "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
        )}
      >
        <ArrowRight
          aria-hidden="true"
          className="size-[18px] transition-transform duration-200 ease-settle group-has-[button:enabled:hover]/vanish:translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </button>
    </form>
  );
}
