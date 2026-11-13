"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type TideSlideshowImage = string | { src: string; alt?: string };
export type TideSlideshowDirection = "up" | "left" | "right";

export interface TideSlideshowProps extends Omit<ComponentProps<"section">, "children"> {
  images: TideSlideshowImage[];
  children?: ReactNode;
  autoplay?: boolean;
  interval?: number;
  direction?: TideSlideshowDirection;
  overlay?: boolean;
  contentClassName?: string;
  "aria-label"?: string;
  labels?: {
    previous?: string;
    next?: string;
    pause?: string;
    play?: string;
    goTo?: (index: number) => string;
    slide?: (index: number, count: number) => string;
  };
}

interface Wash {
  to: number;
  quick: boolean;
}

const WASH_MS = 1150;
const QUICK_MS = 760;

const fmt = (v: number) => (Math.round(v * 10000) / 10000).toString();

function smooth(points: [number, number][]) {
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    d += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

function tide(direction: TideSlideshowDirection, t: number, phase: number) {
  const eased = -(Math.cos(Math.PI * t) - 1) / 2;
  const swell = Math.sin(Math.PI * t);
  const amp = (direction === "up" ? 0.042 : 0.03) * swell;
  const travel = -0.06 + eased * 1.12;
  const at = direction === "right" ? travel : 1 - travel;
  const roll = phase + t * 2.4;
  const points: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const s = -0.02 + (1.04 * i) / 18;
    const w = amp * (Math.sin(2 * Math.PI * 1.1 * s + roll) + 0.38 * Math.sin(2 * Math.PI * 2.7 * s - roll * 1.5));
    points.push(direction === "up" ? [s, at + w] : [at + w, s]);
  }
  const edge = smooth(points);
  const close =
    direction === "up"
      ? "L1.02 1.02L-0.02 1.02Z"
      : direction === "left"
        ? "L1.02 1.02L1.02 -0.02Z"
        : "L-0.02 1.02L-0.02 -0.02Z";
  return { area: edge + close, edge, foam: Math.min(1, swell * 2.2) };
}

export function TideSlideshow({
  images,
  children,
  autoplay = true,
  interval = 5000,
  direction = "up",
  overlay = true,
  contentClassName,
  labels,
  className,
  style,
  onKeyDown,
  onPointerDown,
  onPointerUp,
  "aria-label": ariaLabel = "Slideshow",
  ...props
}: TideSlideshowProps) {
  const reduced = useReducedMotion() ?? false;
  const clipId = `miyuki-tide-slideshow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clip = useRef<SVGPathElement>(null);
  const foam = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState(0);
  const [wash, setWash] = useState<Wash | null>(null);
  const [stopped, setStopped] = useState(false);
  const [announce, setAnnounce] = useState("");
  const count = images.length;
  const target = wash?.to ?? current;
  const running = autoplay && !reduced && !stopped && count > 1;

  const slides = images.map((image) => (typeof image === "string" ? { src: image, alt: "" } : { alt: "", ...image }));
  const slideLabel = labels?.slide ?? ((i: number, n: number) => `${i + 1} of ${n}`);

  function go(to: number, quick: boolean) {
    if (count < 2) return;
    const next = ((to % count) + count) % count;
    if (next === target) return;
    if (wash) setCurrent(wash.to);
    setWash({ to: next, quick });
    if (quick) setAnnounce(slideLabel(next, count));
  }

  useLayoutEffect(() => {
    if (!wash || reduced) return;
    const start = tide(direction, 0, 0);
    clip.current?.setAttribute("d", start.area);
    foam.current?.setAttribute("d", start.edge);
    glow.current?.setAttribute("d", start.edge);
  }, [wash, direction, reduced]);

  useEffect(() => {
    if (!wash) return;
    const settle = () => {
      setCurrent(wash.to);
      setWash(null);
    };
    if (reduced) {
      const timer = setTimeout(settle, 220);
      return () => clearTimeout(timer);
    }
    const duration = wash.quick ? QUICK_MS : WASH_MS;
    const phase = wash.to * 1.9;
    let frame = 0;
    let begin = -1;
    const tick = (now: number) => {
      if (begin < 0) begin = now;
      const t = Math.min(1, (now - begin) / duration);
      const shape = tide(direction, t, phase);
      clip.current?.setAttribute("d", shape.area);
      foam.current?.setAttribute("d", shape.edge);
      glow.current?.setAttribute("d", shape.edge);
      foam.current?.style.setProperty("opacity", String(shape.foam));
      glow.current?.style.setProperty("opacity", String(shape.foam));
      if (t < 1) frame = requestAnimationFrame(tick);
      else settle();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [wash, direction, reduced]);

  const previous = () => go(target - 1, true);
  const next = () => go(target + 1, true);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowLeft") previous();
    else if (event.key === "ArrowRight") next();
    else return;
    event.preventDefault();
  }

  const zoomMs = Math.max(interval + WASH_MS + 1500, 8000);

  return (
    <section
      {...props}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-stopped={!running || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.pointerType === "touch") swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        const start = swipe.current;
        swipe.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - start.y)) (dx < 0 ? next : previous)();
      }}
      className={cn("group/slider relative isolate min-h-72 w-full touch-pan-y overflow-clip bg-muted", className)}
      style={{ "--miyuki-tide-slideshow-zoom": `${zoomMs}ms`, ...style } as CSSProperties}
    >
      <style href="miyuki-tide-slideshow" precedence="miyuki">{`
        @keyframes miyuki-tide-slideshow-zoom { from { transform: scale(1); } to { transform: scale(1.07); } }
        @keyframes miyuki-tide-slideshow-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes miyuki-tide-slideshow-fade { from { opacity: 0; } }
      `}</style>
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path ref={clip} d="" />
          </clipPath>
        </defs>
      </svg>

      {slides.map((slide, i) => {
        const shown = i === current || i === wash?.to;
        const incoming = i === wash?.to;
        return (
          <div
            key={i}
            aria-hidden={i !== target || undefined}
            className={cn(
              "absolute inset-0 overflow-hidden",
              !shown && "invisible",
              incoming ? "z-[2]" : "z-[1]",
              incoming && reduced && "animate-[miyuki-tide-slideshow-fade_200ms_ease-out]",
            )}
            style={incoming && !reduced ? { clipPath: `url(#${clipId})` } : undefined}
          >
            <img
              src={slide.src}
              alt={i === target ? slide.alt : ""}
              draggable={false}
              className={cn(
                "size-full object-cover select-none",
                shown &&
                  !reduced &&
                  "animate-[miyuki-tide-slideshow-zoom_var(--miyuki-tide-slideshow-zoom)_linear_forwards]",
              )}
            />
          </div>
        );
      })}

      {!reduced && wash ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-[3] size-full overflow-visible"
        >
          <path
            ref={glow}
            d=""
            fill="none"
            stroke="oklch(1 0 0 / 0.16)"
            strokeWidth={9}
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0 }}
          />
          <path
            ref={foam}
            d=""
            fill="none"
            stroke="oklch(1 0 0 / 0.8)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ opacity: 0 }}
          />
        </svg>
      ) : null}

      {overlay ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[4] bg-[linear-gradient(to_top,oklch(0.16_0.03_250/0.86),oklch(0.16_0.03_250/0.5)_45%,oklch(0.16_0.03_250/0.16)_75%,oklch(0.16_0.03_250/0.06))]"
        />
      ) : null}

      <div
        className={cn(
          "relative z-[5] flex size-full min-h-[inherit] flex-col justify-end px-6 pt-6 pb-20 sm:px-10 sm:pb-24",
          overlay && "dark text-foreground",
          contentClassName,
        )}
      >
        {children}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 z-[6] flex items-center gap-4 px-6 pb-5 sm:gap-6 sm:px-10 sm:pb-7">
          <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", overlay && "dark")}>
            {slides.map((_, i) => {
              const now = i === target;
              const before = i < target;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={labels?.goTo?.(i) ?? `Go to slide ${i + 1}`}
                  aria-current={now ? "true" : undefined}
                  onClick={() => go(i, true)}
                  className="group/line flex h-6 min-w-0 flex-1 cursor-default items-center outline-none"
                >
                  <span
                    className={cn(
                      "relative block h-0.5 w-full overflow-hidden rounded-full bg-white/30 transition-[background-color,box-shadow] duration-150",
                      "group-hover/line:bg-white/50 group-focus-visible/line:ring-[3px] group-focus-visible/line:ring-ring",
                    )}
                  >
                    {before || (now && !running) ? <span className="absolute inset-0 rounded-full bg-brand" /> : null}
                    {now && running ? (
                      <span
                        key={`${target}-${current}`}
                        className={cn(
                          "absolute inset-0 origin-left rounded-full bg-brand",
                          "animate-[miyuki-tide-slideshow-fill_var(--miyuki-tide-slideshow-interval)_linear_forwards]",
                          "group-hover/slider:[animation-play-state:paused] group-focus-within/slider:[animation-play-state:paused]",
                        )}
                        style={{ "--miyuki-tide-slideshow-interval": `${interval}ms` } as CSSProperties}
                        onAnimationEnd={() => go(target + 1, false)}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {autoplay && !reduced ? (
              <IconButton
                aria-label={stopped ? (labels?.play ?? "Play slideshow") : (labels?.pause ?? "Pause slideshow")}
                variant="secondary"
                onPress={() => setStopped((s) => !s)}
                className="rounded-full"
              >
                <MorphIcon shapes={morphIcons.playPause} shape={stopped ? "play" : "pause"} />
              </IconButton>
            ) : null}
            <IconButton
              aria-label={labels?.previous ?? "Previous slide"}
              variant="secondary"
              onPress={previous}
              className="rounded-full"
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              aria-label={labels?.next ?? "Next slide"}
              variant="secondary"
              onPress={next}
              className="rounded-full"
            >
              <ChevronRight />
            </IconButton>
          </div>
        </div>
      ) : null}

      <div aria-live={running ? "off" : "polite"} aria-atomic="true" className="sr-only">
        {announce}
      </div>
    </section>
  );
}
