"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ReceiptLine {
  label: ReactNode;
  value?: ReactNode;
  bold?: boolean;
  rule?: boolean;
}

export interface ReceiptCardHandle {
  print: () => void;
}

export interface ReceiptCardProps extends Omit<ComponentProps<"div">, "title" | "ref"> {
  lines: ReceiptLine[];
  title?: ReactNode;
  footer?: ReactNode;
  speed?: number;
  code?: string;
  ref?: Ref<ReceiptCardHandle>;
}

const STEP = 20;
const TOOTH = 7;

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.03 .55' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.5 -.98'/></filter><rect width='220' height='220' filter='url(#a)'/><rect width='220' height='220' filter='url(#b)'/></svg>",
)}")`;

const SERRATION: CSSProperties = {
  maskImage: `linear-gradient(#000 0 0), conic-gradient(from -42deg at 50% 100%, #000 84deg, #0000 0)`,
  maskSize: `100% calc(100% - ${TOOTH}px), 11px ${TOOTH}px`,
  maskPosition: "top, bottom",
  maskRepeat: "no-repeat, repeat-x",
};

const L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const R = L.map((c) => [...c].map((b) => (b === "0" ? "1" : "0")).join(""));
const G = R.map((c) => [...c].reverse().join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function ean13(code: string): { bits: string; digits: string } | null {
  const raw = code.replace(/\D/g, "");
  if (raw.length !== 12 && raw.length !== 13) return null;
  const d = [...raw.slice(0, 12)].map(Number);
  const sum = d.reduce((s, v, i) => s + v * (i % 2 ? 3 : 1), 0);
  d.push((10 - (sum % 10)) % 10);
  const parity = PARITY[d[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L : G)[d[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  bits += "101";
  return {
    bits,
    digits: `${d[0]} ${d.slice(1, 7).join("")} ${d.slice(7).join("")}`,
  };
}

function fallbackBits(code: string) {
  const rng = createRng(`receipt-${code}`);
  let bits = "101";
  while (bits.length < 92) bits += rng() < 0.5 ? "1".repeat(rng.int(1, 3)) + "0".repeat(rng.int(1, 3)) : "0";
  return `${bits.slice(0, 92)}101`;
}

function Barcode({ code }: { code: string }) {
  const { bits, digits } = useMemo(() => ean13(code) ?? { bits: fallbackBits(code), digits: code }, [code]);
  const bars: { x: number; w: number; guard: boolean }[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    let w = 1;
    while (bits[i + w] === "1") w++;
    const guard = i < 3 || (i >= 45 && i < 50) || i >= bits.length - 3;
    bars.push({ x: i, w, guard });
    i += w - 1;
  }
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <svg viewBox={`0 0 ${bits.length} 44`} className="h-11 w-[190px]" preserveAspectRatio="none" aria-hidden="true">
        {bars.map((b) => (
          <rect key={b.x} x={b.x} y={0} width={b.w} height={b.guard ? 44 : 38} fill="currentColor" />
        ))}
      </svg>
      <span className="font-mono text-[11px] leading-none tracking-[0.18em] tabular-nums">{digits}</span>
    </div>
  );
}

interface Feed {
  segs: { t0: number; t1: number; y0: number; y1: number }[];
  end: number;
}

function planFeed(height: number, speed: number, seed: number): Feed {
  const rng = createRng(seed);
  const segs: Feed["segs"] = [];
  let t = 0;
  let y = -height;
  const k = 1 / Math.max(0.1, speed);
  while (y < 0) {
    const line = Math.min(STEP, -y);
    const parts = line > 12 ? rng.int(2, 3) : 1;
    let left = line;
    for (let p = 0; p < parts; p++) {
      const d = p === parts - 1 ? left : left * rng.range(0.38, 0.62);
      left -= d;
      const dur = (d / 0.62 + rng.range(4, 10)) * k;
      segs.push({ t0: t, t1: t + dur, y0: y, y1: y + d });
      y += d;
      t += dur + (p < parts - 1 ? rng.range(10, 26) * k : 0);
    }
    const long = rng() < 0.12;
    t += (long ? rng.range(150, 240) : rng.range(26, 70)) * k;
  }
  return { segs, end: t };
}

function feedAt(feed: Feed, t: number, from: number) {
  let y = from;
  for (const s of feed.segs) {
    if (t <= s.t0) return { y, moving: false };
    if (t < s.t1) {
      const u = (t - s.t0) / (s.t1 - s.t0);
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      return { y: s.y0 + (s.y1 - s.y0) * e, moving: true };
    }
    y = s.y1;
  }
  return { y, moving: false };
}

export function ReceiptCard({
  lines,
  title,
  footer,
  speed = 1,
  code = "490123456789",
  className,
  style,
  ref,
  ...props
}: ReceiptCardProps) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const hangRef = useRef<HTMLDivElement>(null);
  const ledRef = useRef<HTMLSpanElement>(null);
  const engine = useRef<{ print: () => void } | null>(null);
  const opts = useRef({ reduced, speed });

  useEffect(() => {
    opts.current = { reduced, speed };
  });

  useImperativeHandle(ref, () => ({ print: () => engine.current?.print() }), []);

  useEffect(() => {
    const root = rootRef.current;
    const paper = paperRef.current;
    const hang = hangRef.current;
    if (!root || !paper || !hang) return;
    let raf = 0;
    let printed = false;
    let out = false;
    let count = 0;

    const place = (y: number, sway = 0, opacity = 1) => {
      paper.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      hang.style.transform = Math.abs(sway) > 0.002 ? `rotate(${sway.toFixed(3)}deg)` : "";
      hang.style.opacity = String(opacity);
    };
    const led = (on: boolean) => ledRef.current?.toggleAttribute("data-on", on);

    const print = () => {
      cancelAnimationFrame(raf);
      const height = paper.offsetHeight;
      const wasOut = out;
      printed = true;
      out = true;
      if (opts.current.reduced) {
        place(0);
        hang.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 220,
          easing: "ease-out",
        });
        return;
      }
      const feed = planFeed(height, opts.current.speed, ++count * 7919);
      let start = 0;
      let last = 0;
      let swing = 0;
      let swingV = 0;
      let lastY = -height;
      let tear = wasOut ? 0 : 1;
      const frame = (now: number) => {
        if (!last) last = now;
        const dt = Math.min(0.034, (now - last) / 1000);
        last = now;
        if (tear < 1) {
          tear = Math.min(1, tear + dt / 0.24);
          const e = tear * tear;
          place(e * 120, e * 2.5, 1 - e);
          raf = requestAnimationFrame(frame);
          return;
        }
        if (!start) {
          start = now;
          place(-height);
        }
        const t = now - start;
        const { y, moving } = feedAt(feed, t, -height);
        swingV += (-240 * swing - 6 * swingV) * dt + (y - lastY) * 0.8;
        swing += swingV * dt;
        lastY = y;
        place(y, Math.abs(swingV) < 0.05 && t > feed.end ? 0 : swing * 0.05);
        led(moving || t < feed.end);
        if (t < feed.end || Math.abs(swingV) > 0.05 || Math.abs(swing) > 0.04) raf = requestAnimationFrame(frame);
        else {
          place(0);
          led(false);
        }
      };
      raf = requestAnimationFrame(frame);
    };

    engine.current = { print };
    const io = new IntersectionObserver(
      (entries) => {
        if (!printed && entries.some((e) => e.isIntersecting)) print();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      engine.current = null;
    };
  }, []);

  return (
    <div
      role="figure"
      {...props}
      ref={rootRef}
      className={cn(
        "relative isolate w-[300px] max-w-full",
        "[--miyuki-receipt-card-paper:color-mix(in_oklab,var(--card)_97%,var(--warning))] [--miyuki-receipt-card-ink:color-mix(in_oklab,var(--foreground)_92%,var(--chart-3))]",
        "dark:[--miyuki-receipt-card-paper:color-mix(in_oklab,var(--foreground)_88%,var(--warning))] dark:[--miyuki-receipt-card-ink:color-mix(in_oklab,var(--primary-foreground)_90%,var(--chart-3))]",
        "[--miyuki-receipt-card-shade:oklch(0.42_0.09_250/0.16)] dark:[--miyuki-receipt-card-shade:oklch(0.05_0.02_250/0.55)] ink:[--miyuki-receipt-card-shade:oklch(0.05_0_0/0.55)]",
        className,
      )}
      style={style}
    >
      <div className="relative z-10 mx-auto h-10 w-full rounded-2xl border border-border bg-card shadow-md">
        <span
          ref={ledRef}
          aria-hidden="true"
          className="absolute top-3 right-4 size-1.5 rounded-full bg-border-strong transition-[background-color,box-shadow] duration-150 data-[on]:bg-brand data-[on]:shadow-[0_0_6px_var(--brand)]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-3 bottom-2.5 h-[5px] rounded-full bg-foreground/80 shadow-[inset_0_1.5px_2px_oklch(0_0_0/0.5),0_1px_0_oklch(1_0_0/0.9)] dark:bg-[oklch(0.08_0.02_250)] ink:bg-[oklch(0.08_0_0)] dark:shadow-[inset_0_1.5px_2px_oklch(0_0_0/0.6),0_1px_0_oklch(1_0_0/0.08)]"
        />
      </div>
      <div className="relative -mt-[7.5px] px-[18px] pb-8" style={{ clipPath: "inset(0 -48px -96px -48px)" }}>
        <div ref={hangRef} className="origin-top will-change-transform">
          <div
            ref={paperRef}
            className="relative will-change-transform"
            style={{ transform: "translate3d(0, -100%, 0)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-6 -bottom-3 h-10 rounded-[50%] bg-(--miyuki-receipt-card-shade) blur-md"
            />
            <div
              style={{
                filter:
                  "drop-shadow(0 1px 1px var(--miyuki-receipt-card-shade)) drop-shadow(0 8px 12px var(--miyuki-receipt-card-shade))",
              }}
            >
              <div
                className="relative bg-(--miyuki-receipt-card-paper) px-5 pt-5 pb-[calc(20px+7px)] text-[13px] leading-5 text-(--miyuki-receipt-card-ink)"
                style={SERRATION}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-multiply"
                  style={{
                    backgroundImage: GRAIN,
                    backgroundSize: "220px 220px",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.42 0.09 250 / 0.06), transparent 8%, transparent 92%, oklch(0.42 0.09 250 / 0.06)), linear-gradient(180deg, oklch(0.42 0.09 250 / 0.14), transparent 16px), linear-gradient(0deg, oklch(0.42 0.09 250 / 0.08), oklch(1 0 0 / 0.5) 22px, transparent 64px)",
                  }}
                />
                <div className="relative">
                  {title != null ? (
                    <div className="pb-5 text-center text-[15px] leading-5 font-semibold">{title}</div>
                  ) : null}
                  {lines.map((line, i) => (
                    <div key={i}>
                      {line.rule ? (
                        <div aria-hidden="true" className="flex h-5 items-center">
                          <span className="h-px w-full bg-[repeating-linear-gradient(90deg,currentColor_0_5px,transparent_5px_8px)] opacity-70" />
                        </div>
                      ) : null}
                      <div className={cn("flex items-baseline gap-1.5", line.bold && "font-semibold text-[14px]")}>
                        <span className="min-w-0 shrink">{line.label}</span>
                        {line.value != null ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-[3px] min-w-4 flex-1 translate-y-[-3px] self-end opacity-55"
                              style={{
                                backgroundImage: "radial-gradient(circle, currentColor 0.7px, transparent 1px)",
                                backgroundSize: "4px 3px",
                                backgroundRepeat: "repeat-x",
                              }}
                            />
                            <span className="shrink-0 font-mono tabular-nums">{line.value}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <div className="pt-5">
                    <Barcode code={code} />
                  </div>
                  {footer != null ? <div className="pt-3 text-center text-[13px] leading-5">{footer}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
