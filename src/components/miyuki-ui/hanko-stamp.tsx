"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type Ref,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button as AriaButton } from "react-aria-components";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type HankoShape = "square" | "round";

export interface HankoStampHandle {
  reset: () => void;
}

export interface HankoStampProps extends Omit<ComponentProps<"div">, "children" | "ref"> {
  mark?: string;
  shape?: HankoShape;
  holdMs?: number;
  label?: string;
  doneLabel?: string;
  onStamp?: () => void;
  sealSize?: number;
  sealClassName?: string;
  isDisabled?: boolean;
  ref?: Ref<HankoStampHandle>;
}

type Pt = [number, number];

interface Press {
  seed: number;
  turn: number;
}

const INK = "var(--miyuki-hanko-stamp-ink, var(--destructive))";
const fmt = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;

function roundedRect(inset: number, radius: number, steps: number): Pt[] {
  const a = inset;
  const b = 100 - inset;
  const r = radius;
  const pts: Pt[] = [];
  const corners: [number, number, number][] = [
    [b - r, a + r, -90],
    [b - r, b - r, 0],
    [a + r, b - r, 90],
    [a + r, a + r, 180],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= 3; i++) {
      const t = ((start + (i * 90) / 3) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.round((Math.hypot(x1 - x0, y1 - y0) / (400 - inset * 8)) * steps));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

function circle(r: number, steps: number): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    return [50 + r * Math.cos(t), 50 + r * Math.sin(t)] as Pt;
  });
}

function wobble(pts: Pt[], rng: Rng, amount: number): Pt[] {
  const knots = Array.from({ length: 9 }, () => rng.range(-1, 1));
  return pts.map(([x, y], i) => {
    const f = (i / pts.length) * knots.length;
    const k = Math.floor(f);
    const t = f - k;
    const e = t * t * (3 - 2 * t);
    const slow = knots[k % knots.length] * (1 - e) + knots[(k + 1) % knots.length] * e;
    const d = (slow * 0.7 + rng.range(-0.3, 0.3)) * amount;
    const dx = x - 50;
    const dy = y - 50;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * d, y + (dy / len) * d];
  });
}

function crest(radius: number) {
  let d = "";
  for (let k = 0; k < 6; k++) {
    const a = ((k * 60 - 90) * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    d += `M50 50L${(50 + ux * radius).toFixed(2)} ${(50 + uy * radius).toFixed(2)}`;
    const bx = 50 + ux * radius * 0.52;
    const by = 50 + uy * radius * 0.52;
    for (const s of [-1, 1]) {
      const b = a + (s * Math.PI) / 3;
      d += `M${bx.toFixed(2)} ${by.toFixed(2)}L${(bx + Math.cos(b) * radius * 0.36).toFixed(2)} ${(by + Math.sin(b) * radius * 0.36).toFixed(2)}`;
    }
  }
  return d;
}

function glyphs(mark: string) {
  const words = mark.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((w) => Array.from(w)[0].toUpperCase());
  return Array.from(words[0] ?? "").slice(0, 2);
}

function Seal({ mark, shape, press, id }: { mark?: string; shape: HankoShape; press: Press; id: string }) {
  const rng = createRng(`hanko:${press.seed}`);
  const round = shape === "round";
  const outer = wobble(round ? circle(45, 72) : roundedRect(5, 8, 72), rng, 0.9);
  const inner = wobble(round ? circle(38.5, 72) : roundedRect(11.5, 3.5, 72), rng, 0.7);
  const chars = mark ? glyphs(mark) : [];
  const tall = chars.length === 2 && chars.some((c) => c.charCodeAt(0) > 0x2e7f);
  return (
    <svg viewBox="0 0 100 100" className="block size-full overflow-visible" aria-hidden="true">
      <defs>
        <filter id={`${id}-ink`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves={2}
            seed={press.seed % 997}
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="1.8"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves={3}
            seed={(press.seed % 991) + 5}
            result="blotch"
          />
          <feColorMatrix
            in="blotch"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -0.36"
            result="density"
          />
          <feComposite in="rough" in2="density" operator="in" result="patchy" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.3"
            numOctaves={1}
            seed={(press.seed % 983) + 11}
            result="fleck"
          />
          <feColorMatrix
            in="fleck"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 18 0 0 0 -13.4"
            result="holes"
          />
          <feComposite in="patchy" in2="holes" operator="out" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill={INK} stroke={INK}>
        <path d={fmt(outer) + fmt(inner)} fillRule="evenodd" stroke="none" />
        {chars.length === 0 ? (
          <path d={crest(round ? 25 : 27)} fill="none" strokeWidth={7} strokeLinecap="butt" strokeLinejoin="miter" />
        ) : tall ? (
          chars.map((c, i) => (
            <text
              key={i}
              x="50"
              y={i ? 70 : 32}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="38"
              fontWeight="700"
              stroke="none"
            >
              {c}
            </text>
          ))
        ) : (
          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={chars.length === 1 ? 54 : 40}
            fontWeight="700"
            letterSpacing={chars.length === 1 ? 0 : -1.5}
            stroke="none"
          >
            {chars.join("")}
          </text>
        )}
      </g>
    </svg>
  );
}

function ringPath(w: number, h: number, r: number) {
  const m = w / 2;
  return `M${m} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}

export function HankoStamp({
  mark,
  shape = "square",
  holdMs = 900,
  label = "Hold to approve",
  doneLabel = "Approved",
  onStamp,
  sealSize = 72,
  sealClassName,
  isDisabled,
  className,
  ref,
  ...props
}: HankoStampProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reduce = useReducedMotion() === true;
  const [press, setPress] = useState<Press | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGPathElement>(null);
  const stamp = useRef<SVGGElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  const seal = useRef<HTMLSpanElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const charge = useRef({ p: 0, raf: 0, held: false, last: 0 });
  const done = press !== null;
  const stamped = useRef(done);

  const paint = (p: number) => {
    ring.current?.style.setProperty("stroke-dashoffset", String(1 - p));
    if (ring.current) ring.current.style.opacity = p > 0.001 ? "1" : "0";
    stamp.current?.setAttribute("transform", `translate(0 ${(p * 2.6).toFixed(2)})`);
  };

  const stop = () => {
    cancelAnimationFrame(charge.current.raf);
    charge.current.raf = 0;
  };

  const finish = () => {
    stop();
    charge.current.held = false;
    const seed = Math.floor(Math.random() * 1e9);
    const rng = createRng(seed);
    stamped.current = true;
    setPress({ seed, turn: (rng() < 0.5 ? -1 : 1) * rng.range(1.5, 6.5) });
    onStamp?.();
  };

  const run = (direction: 1 | -1) => {
    stop();
    charge.current.last = performance.now();
    const tick = (now: number) => {
      const c = charge.current;
      const dt = now - c.last;
      c.last = now;
      c.p = direction > 0 ? Math.min(1, c.p + dt / Math.max(100, holdMs)) : Math.max(0, c.p - dt / 320);
      paint(c.p);
      if (direction > 0 && c.p >= 1) return finish();
      if (direction < 0 && c.p <= 0) {
        paint(0);
        c.raf = 0;
        return;
      }
      c.raf = requestAnimationFrame(tick);
    };
    charge.current.raf = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      stop();
      charge.current.p = 0;
      charge.current.held = false;
      paint(0);
      stamped.current = false;
      setPress(null);
    },
  }));

  useEffect(() => {
    stamped.current = done;
  }, [done]);

  useEffect(() => {
    const c = charge.current;
    return () => cancelAnimationFrame(c.raf);
  }, []);

  useLayoutEffect(() => {
    const el = button.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!press) return;
    const el = seal.current;
    const shade = shadow.current;
    const body = content.current;
    const handle = stamp.current;
    const turn = `rotate(${press.turn}deg)`;
    if (reduce) {
      el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out", fill: "both" });
      paint(0);
      return;
    }
    const fall = 110;
    shade?.animate(
      [
        { opacity: 0, transform: `${turn} translate(6%, 10%) scale(1.3)` },
        { opacity: 0.8, transform: `${turn} translate(1%, 2%) scale(1.02)`, offset: fall / 260 },
        { opacity: 0, transform: `${turn} scale(1)` },
      ],
      { duration: 260, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    );
    el?.animate(
      [
        { opacity: 0, transform: `${turn} scale(1.05)` },
        { opacity: 1, transform: `${turn} scale(0.975)`, offset: 0.4 },
        { opacity: 1, transform: `${turn} scale(1)` },
      ],
      { duration: 240, delay: fall, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
    );
    body?.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(1.5px)", offset: 0.3 },
        { transform: "translateY(-0.5px)", offset: 0.65 },
        { transform: "translateY(0)" },
      ],
      { duration: 260, delay: fall - 20, easing: "ease-out" },
    );
    handle?.animate(
      [
        { transform: "translate(0px, 2.6px)" },
        { transform: "translate(0px, 3.6px) scale(1, 0.9)", offset: 0.25 },
        { transform: "translate(0px, 0px)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    paint(0);
  }, [press, reduce]);

  const r = box.h / 2 + 3;

  return (
    <div {...props} className={cn("inline-flex items-center gap-4", className)}>
      <AriaButton
        ref={button}
        isDisabled={isDisabled}
        onPressStart={() => {
          if (stamped.current) return;
          charge.current.held = true;
          run(1);
        }}
        onPressEnd={() => {
          if (stamped.current || !charge.current.held) return;
          charge.current.held = false;
          run(-1);
        }}
        className={cn(
          "relative inline-flex h-11 shrink-0 cursor-default items-center gap-2.5 rounded-full border border-border-strong bg-card pr-5 pl-3.5 text-sm font-medium whitespace-nowrap text-foreground shadow-xs outline-none select-none [-webkit-touch-callout:none]",
          "transition-[background-color,box-shadow] duration-150 ease-settle data-[hovered]:bg-accent",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          done && "data-[hovered]:bg-card",
        )}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] overflow-visible"
          width={box.w + 6}
          height={box.h + 6}
        >
          {box.w > 0 ? (
            <path
              ref={ring}
              d={ringPath(box.w + 6, box.h + 6, r)}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={2}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              style={{ strokeDashoffset: 1, opacity: 0 }}
            />
          ) : null}
        </svg>
        <span ref={content} className="inline-flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="size-6 shrink-0 overflow-visible" fill="none" aria-hidden="true">
            <path
              d="M4.5 21.25H19.5"
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <g ref={stamp}>
              <circle cx="12" cy="4.75" r="2.5" stroke="currentColor" strokeWidth={1.5} />
              <path
                d="M10.6 7L9.9 11.75H14.1L13.4 7M7.5 11.75H16.5C17.05 11.75 17.5 12.2 17.5 12.75V15.75H6.5V12.75C6.5 12.2 6.95 11.75 7.5 11.75Z"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              <rect x="7" y="16.5" width="10" height="2" rx="0.5" fill={INK} />
            </g>
          </svg>
          <span>{done ? doneLabel : label}</span>
        </span>
      </AriaButton>
      <span
        aria-hidden="true"
        className={cn("pointer-events-none shrink-0", sealClassName ?? "relative")}
        style={{ width: sealSize, height: sealSize }}
      >
        {press ? (
          <>
            <span
              ref={shadow}
              className={cn(
                "absolute inset-[6%] bg-black/40 opacity-0 blur-[5px]",
                shape === "round" ? "rounded-full" : "rounded-[14%]",
              )}
            />
            <span ref={seal} className="absolute inset-0 opacity-0" style={{ transform: `rotate(${press.turn}deg)` }}>
              <Seal mark={mark} shape={shape} press={press} id={uid} />
            </span>
          </>
        ) : null}
      </span>
      <span className="sr-only" aria-live="polite">
        {done ? doneLabel : ""}
      </span>
    </div>
  );
}
