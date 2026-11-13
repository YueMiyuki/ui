"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { DiamondDust } from "@/components/miyuki-ui/diamond-dust";
import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";
import { WaveringText } from "@/components/miyuki-ui/wavering-text";
import { cn } from "@/lib/utils";

export interface HeroSnowWaterProps extends Omit<ComponentProps<"section">, "title"> {
  title: string[];
  children?: ReactNode;
  waterHeight?: number | string;
  snow?: number;
  as?: "h1" | "h2";
}

const RISE: Transition = { type: "spring", stiffness: 70, damping: 17, mass: 1.1, delay: 0.35 };
const SETTLE = [0.22, 1, 0.36, 1] as const;
const DROP = "--miyuki-hero-snow-water-drop";
const WATER = "--miyuki-hero-snow-water-water";
const REFLECTION_MASK = `linear-gradient(to top, #000 var(${DROP}), rgb(0 0 0 / 0.5) calc(var(${DROP}) + 0.5em), transparent calc(var(${DROP}) + 1.45em))`;

function Lines({
  lines,
  still,
  probe,
}: {
  lines: string[];
  still: boolean;
  probe?: (el: HTMLSpanElement | null) => void;
}) {
  const last = lines.length - 1;
  return lines.map((line, i) =>
    i < last ? (
      <motion.span
        key={i}
        className="block"
        initial={still ? false : { opacity: 0, filter: "blur(12px)", y: "-0.12em" }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 1.1, ease: SETTLE, delay: i * 0.12 }}
      >
        {line}
      </motion.span>
    ) : (
      <motion.span
        key={i}
        className="block"
        initial={still ? false : { y: "102%" }}
        animate={{ y: 0 }}
        transition={RISE}
      >
        {line}
        {probe ? <span ref={probe} aria-hidden="true" className="inline-block h-0 w-0 align-baseline" /> : null}
      </motion.span>
    ),
  );
}

export function HeroSnowWater({
  title,
  children,
  waterHeight = "clamp(7rem, 22cqi, 15rem)",
  snow = 46,
  as: Heading = "h1",
  className,
  style,
  ...props
}: HeroSnowWaterProps) {
  const still = useReducedMotion() ?? false;
  const heading = useRef<HTMLHeadingElement>(null);
  const probe = useRef<HTMLSpanElement | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const [risen, setRisen] = useState(false);

  useLayoutEffect(() => {
    const h = heading.current;
    if (!h) return;
    let frame = 0;
    const measure = () => {
      const p = probe.current;
      if (!p) return;
      let top = 0;
      let node: HTMLElement | null = p;
      while (node && node !== h) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      if (node !== h) return;
      const next = Math.round((h.offsetHeight - top) * 100) / 100;
      setDrop((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(h);
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (still) return;
    const id = window.setTimeout(() => setRisen(true), 950);
    return () => window.clearTimeout(id);
  }, [still]);

  const water = typeof waterHeight === "number" ? `${waterHeight}px` : waterHeight;
  const open = still || risen;

  return (
    <section
      {...props}
      className={cn("@container relative isolate flex min-h-[36rem] flex-col overflow-clip", className)}
      style={style}
    >
      <div
        className={cn(
          "grid flex-1",
          "[grid-template-columns:[full-start]_1.5rem_[main-start]_minmax(0,1fr)_[main-end]_1.5rem_[full-end]]",
          "@3xl:[grid-template-columns:[full-start]_minmax(2rem,1fr)_[main-start]_minmax(0,46rem)_3.5rem_minmax(0,19rem)_[main-end]_minmax(2rem,1fr)_[full-end]]",
          "[grid-template-rows:1fr_var(--miyuki-hero-snow-water-water)_auto]",
        )}
        style={{ [WATER]: water, [DROP]: drop == null ? "0.15em" : `${drop}px` } as CSSProperties}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none relative -z-10 [grid-column:full] [grid-row:1] bg-[linear-gradient(to_bottom,transparent_25%,color-mix(in_oklab,var(--brand-soft)_60%,transparent))] [mask-image:linear-gradient(to_bottom,#000_calc(100%-10px),transparent)]"
        >
          {snow > 0 ? (
            <DiamondDust
              direction="down"
              density={snow}
              speed={0.5}
              minSize={0.6}
              maxSize={2.1}
              twinkle={false}
              glints={false}
              className="absolute inset-0"
            />
          ) : null}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none relative -z-10 [grid-column:full] [grid-row:2/4] @3xl:[grid-row:2/4]"
        >
          <div className="absolute inset-x-0 top-0 h-[var(--miyuki-hero-snow-water-water)] [mask-image:linear-gradient(to_bottom,#000_30%,transparent)] @3xl:h-full">
            <LayeredWaves level={0.05} amplitude={9} waveCount={5} blur={5} speed={0.8} className="size-full" />
          </div>
          <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/15 to-transparent dark:via-foreground/20" />
        </div>

        <div
          className={cn(
            "relative self-end pt-20 [grid-column:main] [grid-row:1] @3xl:[grid-column:2] @3xl:pt-24",
            "font-display text-[clamp(2.25rem,6.2cqi,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance",
          )}
          style={{ marginBottom: `calc(var(${DROP}) * -1)` }}
        >
          <div className="relative">
            <Heading
              ref={heading}
              className="relative text-foreground transition-[clip-path] duration-300 ease-out"
              style={{ clipPath: open ? "inset(-50% -10% -0.32em -10%)" : `inset(-50% -10% var(${DROP}) -10%)` }}
            >
              <Lines lines={title} still={still} probe={(el) => void (probe.current = el)} />
            </Heading>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 text-[color-mix(in_oklab,var(--foreground)_72%,var(--brand))] opacity-30 select-none dark:opacity-[0.34]"
              style={{
                transform: "scaleY(-1)",
                transformOrigin: `50% calc(100% - var(${DROP}))`,
                clipPath: `inset(0 0 var(${DROP}) 0)`,
                maskImage: REFLECTION_MASK,
                WebkitMaskImage: REFLECTION_MASK,
              }}
            >
              <WaveringText mode="ripple" scale={8} baseFrequency={0.012} numOctaves={1} className="block">
                <Lines lines={title} still={still} />
              </WaveringText>
            </div>
          </div>
        </div>

        {children ? (
          <motion.div
            className={cn(
              "relative pt-8 pb-14 [grid-column:main] [grid-row:3]",
              "@3xl:self-end @3xl:pt-24 @3xl:pb-2 @3xl:[grid-column:4] @3xl:[grid-row:1]",
            )}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: SETTLE, delay: still ? 0 : 0.9 }}
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
