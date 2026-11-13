"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ComponentProps, type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export interface KamishibaiSlide {
  src: string;
  caption: string;
  alt?: string;
}

export interface KamishibaiSliderProps extends Omit<ComponentProps<"section">, "children"> {
  slides: KamishibaiSlide[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
}

const PULL = 0.66;

const grain = (fx: number, fy: number, seed: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='3' seed='${seed}' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24  0 0 0 0 0.14  0 0 0 0 0.07  0 0 0 -2.2 1.35'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23w)'/%3E%3C/svg%3E")`;

const GRAIN_H = grain(0.004, 0.16, 7);
const GRAIN_V = grain(0.16, 0.004, 11);
const PAPER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

function Wood({
  className,
  style,
  vertical,
  tone,
}: {
  className?: string;
  style?: CSSProperties;
  vertical?: boolean;
  tone: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute", className)}
      style={{
        backgroundColor: "var(--miyuki-kamishibai-slider-wood)",
        backgroundImage: `${tone}, ${vertical ? GRAIN_V : GRAIN_H}`,
        backgroundSize: "100% 100%, 240px 240px",
        ...style,
      }}
    />
  );
}

function Door({ side }: { side: "left" | "right" | "top" }) {
  const horizontal = side === "top";
  const style: CSSProperties =
    side === "left"
      ? {
          right: "100%",
          top: "3%",
          bottom: "3%",
          width: "31%",
          transformOrigin: "100% 50%",
          transform: "rotateY(-56deg)",
        }
      : side === "right"
        ? {
            left: "100%",
            top: "3%",
            bottom: "3%",
            width: "31%",
            transformOrigin: "0% 50%",
            transform: "rotateY(56deg)",
          }
        : {
            bottom: "100%",
            left: "3%",
            right: "3%",
            height: "26%",
            transformOrigin: "50% 100%",
            transform: "rotateX(56deg)",
          };
  return (
    <span aria-hidden="true" className="absolute [transform-style:preserve-3d]" style={style}>
      <span
        className="absolute inset-0 rounded-[3px]"
        style={{
          backgroundColor: "var(--miyuki-kamishibai-slider-wood)",
          backgroundImage: `linear-gradient(${horizontal ? "0deg" : side === "left" ? "270deg" : "90deg"}, oklch(0.2 0.05 50 / 0.42), oklch(0.2 0.05 50 / 0.18) 55%, oklch(0.2 0.05 50 / 0.3)), ${horizontal ? GRAIN_H : GRAIN_V}`,
          backgroundSize: "100% 100%, 240px 240px",
          boxShadow: "inset 0 0 0 1px oklch(0.3 0.05 50 / 0.35)",
        }}
      />
      <span
        className="absolute rounded-[2px]"
        style={{
          inset: horizontal ? "18% 7%" : "7% 12%",
          boxShadow: "inset 0 0 0 1.5px oklch(0.25 0.05 50 / 0.3), inset 1px 1px 0 oklch(1 0 0 / 0.12)",
        }}
      />
    </span>
  );
}

export function KamishibaiSlider({
  slides,
  index,
  defaultIndex = 0,
  onIndexChange,
  className,
  onKeyDown,
  "aria-label": ariaLabel = "Picture story",
  ...props
}: KamishibaiSliderProps) {
  const reduced = useReducedMotion() ?? false;
  const [own, setOwn] = useState(defaultIndex);
  const current = Math.min(Math.max(index ?? own, 0), Math.max(0, slides.length - 1));
  const [move, setMove] = useState<{ from: number; to: number } | null>(null);
  const busy = useRef(false);
  const p = useMotionValue(0);
  const [shown, setShown] = useState(current);

  const forward = move ? move.to > move.from : true;
  const base = move ? (forward ? move.to : move.from) : shown;
  const sheet = move ? (forward ? move.from : move.to) : null;

  const bend = useTransform(p, (v) => Math.sin(Math.PI * v));
  const x = useTransform(p, (v) => `${(v * 104).toFixed(3)}%`);
  const rotateY = useTransform(bend, (b) => (reduced ? 0 : -b * 9));
  const lift = useTransform(bend, (b) => b * 0.9);
  const shadowOpacity = useTransform(p, (v) => (v < 0.02 ? 0 : 0.55 + 0.45 * Math.sin(Math.PI * v)));
  const opacity = useTransform(p, (v) => (reduced ? 1 - v : 1));

  function go(to: number, notify = true) {
    if (busy.current || to < 0 || to >= slides.length || to === shown) return;
    busy.current = true;
    const ahead = to > shown;
    setMove({ from: shown, to });
    if (index === undefined) setOwn(to);
    if (notify) onIndexChange?.(to);
    p.jump(ahead ? 0 : 1);
    animate(p, ahead ? 1 : 0, {
      duration: reduced ? 0.22 : PULL,
      ease: reduced ? "linear" : ahead ? [0.55, 0.02, 0.3, 1] : [0.3, 0.05, 0.25, 1],
      onComplete: () => {
        setShown(to);
        setMove(null);
        p.jump(0);
        busy.current = false;
      },
    });
  }

  useEffect(() => {
    if (current === shown || busy.current) return;
    const id = requestAnimationFrame(() => go(current, false));
    return () => cancelAnimationFrame(id);
  });

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(shown + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(shown - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(slides.length - 1);
    }
  }

  const caption = slides[move ? move.to : shown]?.caption;
  const target = move ? move.to : shown;

  return (
    <section
      {...props}
      aria-roledescription="slideshow"
      aria-label={ariaLabel}
      onKeyDown={handleKey}
      className={cn(
        "@container flex w-full max-w-[38rem] flex-col items-center gap-5",
        "[--miyuki-kamishibai-slider-wood:oklch(0.64_0.075_60)] dark:[--miyuki-kamishibai-slider-wood:oklch(0.45_0.06_52)]",
        className,
      )}
    >
      <div className="w-full px-[10%] pt-[8%] [perspective:220cqw]">
        <div
          tabIndex={0}
          role="group"
          aria-roledescription="sheet"
          aria-label={`${target + 1} of ${slides.length}: ${slides[target]?.alt ?? slides[target]?.caption ?? ""}`}
          className="relative aspect-[4/3] w-full rounded-[5px] shadow-[0_2px_4px_oklch(0.42_0.09_250/0.12),0_24px_48px_-16px_oklch(0.42_0.09_250/0.38)] outline-none [transform-style:preserve-3d] focus-visible:ring-[3px] focus-visible:ring-ring dark:shadow-[0_2px_4px_oklch(0.05_0.02_250/0.5),0_28px_52px_-16px_oklch(0.04_0.02_250/0.8)] [--t:clamp(12px,4cqw,22px)]"
        >
          <Door side="left" />
          <Door side="right" />
          <Door side="top" />
          <div className="absolute inset-(--t) overflow-hidden bg-[oklch(0.22_0.03_250)]">
            {slides[base] ? (
              <img
                key={`base-${base}`}
                src={slides[base].src}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-cover"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
              style={{ backgroundImage: PAPER, backgroundSize: "160px 160px" }}
            />
            {sheet !== null && slides[sheet] ? (
              <motion.div
                key={`sheet-${sheet}`}
                className="absolute inset-0 [transform-style:preserve-3d]"
                style={{
                  x: reduced ? 0 : x,
                  rotateY,
                  opacity,
                  transformOrigin: "100% 50%",
                  transformPerspective: 1400,
                }}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 right-full w-[11%] bg-linear-to-l from-[oklch(0.2_0.06_255/0.42)] via-[oklch(0.2_0.06_255/0.12)] to-transparent dark:from-[oklch(0.05_0.03_255/0.6)]"
                  style={{ opacity: shadowOpacity }}
                />
                <img
                  src={slides[sheet].src}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
                  style={{ backgroundImage: PAPER, backgroundSize: "160px 160px" }}
                />
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,oklch(1_0_0/0.3),oklch(1_0_0/0.06)_22%,transparent_45%,oklch(0.25_0.05_255/0.12)_100%)]"
                  style={{ opacity: lift }}
                />
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-[oklch(1_0_0/0.55)]" />
              </motion.div>
            ) : null}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_6px_oklch(0.18_0.05_50/0.5),inset_0_0_0_1px_oklch(0.18_0.05_50/0.4),inset_-6px_0_10px_-4px_oklch(0.18_0.05_50/0.45)]"
            />
          </div>
          <Wood
            className="inset-x-0 top-0 h-(--t) rounded-t-[5px]"
            style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - var(--t)) 100%, var(--t) 100%)" }}
            tone="linear-gradient(180deg, oklch(1 0 0 / 0.16), oklch(1 0 0 / 0.04) 60%, oklch(0.2 0.05 50 / 0.25))"
          />
          <Wood
            className="inset-x-0 bottom-0 h-(--t) rounded-b-[5px]"
            style={{ clipPath: "polygon(var(--t) 0, calc(100% - var(--t)) 0, 100% 100%, 0 100%)" }}
            tone="linear-gradient(180deg, oklch(1 0 0 / 0.2), oklch(0.2 0.05 50 / 0.08) 30%, oklch(0.2 0.05 50 / 0.3))"
          />
          <Wood
            vertical
            className="inset-y-0 left-0 w-(--t) rounded-l-[5px]"
            style={{ clipPath: "polygon(0 0, 100% var(--t), 100% calc(100% - var(--t)), 0 100%)" }}
            tone="linear-gradient(90deg, oklch(1 0 0 / 0.1), oklch(1 0 0 / 0.02) 55%, oklch(0.2 0.05 50 / 0.22))"
          />
          <Wood
            vertical
            className="inset-y-0 right-0 w-(--t) rounded-r-[5px]"
            style={{ clipPath: "polygon(0 var(--t), 100% 0, 100% 100%, 0 calc(100% - var(--t)))" }}
            tone="linear-gradient(90deg, oklch(1 0 0 / 0.14), oklch(0.2 0.05 50 / 0.1) 45%, oklch(0.2 0.05 50 / 0.32))"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[5px] shadow-[inset_0_0_0_1px_oklch(0.25_0.05_50/0.35),inset_0_1px_0_oklch(1_0_0/0.25)]"
          />
        </div>
      </div>

      <div className="flex w-full items-center gap-3 px-1">
        <IconButton
          aria-label="Previous sheet"
          variant="secondary"
          size="sm"
          className="rounded-full"
          isDisabled={target <= 0}
          onPress={() => go(shown - 1)}
        >
          <ChevronLeft />
        </IconButton>
        <div className="grid min-h-12 min-w-0 flex-1 place-items-center text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={target}
              aria-live="polite"
              className="text-[15px] leading-snug text-balance text-foreground [grid-area:1/1]"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, delay: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>
        <IconButton
          aria-label="Next sheet"
          variant="secondary"
          size="sm"
          className="rounded-full"
          isDisabled={target >= slides.length - 1}
          onPress={() => go(shown + 1)}
        >
          <ChevronRight />
        </IconButton>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground tabular-nums">
        {target + 1} of {slides.length}
      </p>
    </section>
  );
}
