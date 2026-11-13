"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

export type SlidesPerView = number | Partial<Record<Breakpoint, number>>;

const breakpoints: Breakpoint[] = ["base", "sm", "md", "lg", "xl"];

const perViewClasses = cn(
  "[--miyuki-carousel-n:var(--miyuki-carousel-base)]",
  "sm:[--miyuki-carousel-n:var(--miyuki-carousel-sm)]",
  "md:[--miyuki-carousel-n:var(--miyuki-carousel-md)]",
  "lg:[--miyuki-carousel-n:var(--miyuki-carousel-lg)]",
  "xl:[--miyuki-carousel-n:var(--miyuki-carousel-xl)]",
);

function perViewVars(value: SlidesPerView): Record<string, number> {
  const spec = typeof value === "number" ? { base: value } : value;
  const vars: Record<string, number> = {};
  let last = 1;
  for (const bp of breakpoints) {
    last = Math.max(1, Math.round(spec[bp] ?? last));
    vars[`--miyuki-carousel-${bp}`] = last;
  }
  return vars;
}

const ItemContext = createContext<{ index: number; count: number; label: (index: number, count: number) => string }>({
  index: 0,
  count: 1,
  label: (i, n) => `${i + 1} of ${n}`,
});

interface ScrollState {
  progress: number;
  stops: number | null;
  atStart: boolean;
  atEnd: boolean;
}

export interface CarouselProps extends Omit<ComponentProps<"section">, "children"> {
  children: ReactNode;
  slidesPerView?: SlidesPerView;
  gap?: number;
  showArrows?: boolean;
  showDots?: boolean;
  "aria-label"?: string;
  labels?: {
    previous?: string;
    next?: string;
    goTo?: (index: number) => string;
    slide?: (index: number, count: number) => string;
  };
}

export function Carousel({
  children,
  slidesPerView = { base: 1, sm: 2, lg: 3 },
  gap = 16,
  showArrows = true,
  showDots = true,
  labels,
  className,
  style,
  onKeyDown,
  "aria-label": ariaLabel = "Carousel",
  ...props
}: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [state, setState] = useState<ScrollState>({ progress: 0, stops: null, atStart: true, atEnd: false });
  const [announce, setAnnounce] = useState("");
  const slides = Children.toArray(children).filter(isValidElement);
  const count = slides.length;

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.querySelector<HTMLElement>("[data-carousel-item]");
    return first ? first.getBoundingClientRect().width + gap : 0;
  }, [gap]);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const s = step();
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    const perView = s > 0 ? Math.max(1, Math.round((el.clientWidth + gap) / s)) : 1;
    setState({
      progress: s > 0 ? x / s : 0,
      stops: Math.max(1, count - perView + 1),
      atStart: x <= 1,
      atEnd: x >= max - 1,
    });
  }, [count, gap, step]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
      clearTimeout(settle);
      settle = setTimeout(() => {
        const s = step();
        if (s > 0) setAnnounce(`${Math.round(Math.abs(el.scrollLeft) / s) + 1} of ${count}`);
      }, 180);
    };
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [count, measure, step]);

  const scrollToIndex = (index: number) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const target = Math.min(Math.max(index, 0), (state.stops ?? count) - 1);
    el.scrollTo({ left: target * step() * (rtl ? -1 : 1), behavior: reduce ? "auto" : "smooth" });
  };

  const current = Math.round(state.progress);
  const previous = () => scrollToIndex(current - 1);
  const next = () => scrollToIndex(current + 1);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const keys: Record<string, () => void> = {
      ArrowLeft: rtl ? next : previous,
      ArrowRight: rtl ? previous : next,
      Home: () => scrollToIndex(0),
      End: () => scrollToIndex(count),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const slideLabel = labels?.slide ?? ((i: number, n: number) => `${i + 1} of ${n}`);
  const stops = state.stops ?? 0;

  return (
    <section
      {...props}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      style={{ ...perViewVars(slidesPerView), "--miyuki-carousel-gap": `${gap}px`, ...style } as CSSProperties}
    >
      <div
        ref={track}
        tabIndex={0}
        className={cn(
          "-m-1 flex snap-x snap-mandatory scroll-p-1 overflow-x-auto overscroll-x-contain p-1",
          "rounded-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          perViewClasses,
        )}
        style={{ gap }}
      >
        {slides.map((slide, index) => (
          <ItemContext key={slide.key ?? index} value={{ index, count, label: slideLabel }}>
            {slide}
          </ItemContext>
        ))}
      </div>

      {(showDots || showArrows) && (
        <div className={cn("flex min-h-9 items-center gap-4", showDots ? "justify-between" : "justify-end")}>
          {showDots && (
            <div
              className={cn(
                "-ms-[3px] flex items-center transition-opacity duration-200",
                state.stops == null ? "opacity-0" : "opacity-100",
                !showArrows && "mx-auto",
              )}
            >
              {Array.from({ length: stops }, (_, i) => {
                const t = Math.min(Math.max(1 - Math.abs(state.progress - i), 0), 1);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={labels?.goTo?.(i) ?? `Go to slide ${i + 1}`}
                    aria-current={i === current ? "true" : undefined}
                    onClick={() => scrollToIndex(i)}
                    className="group/dot flex h-6 cursor-default items-center px-[3px] outline-none"
                  >
                    <span
                      className={cn(
                        "relative block h-1.5 overflow-hidden rounded-full bg-foreground/15",
                        "transition-[box-shadow,background-color] duration-150 group-hover/dot:bg-foreground/30",
                        "group-focus-visible/dot:ring-[3px] group-focus-visible/dot:ring-ring",
                      )}
                      style={{ width: 6 + 14 * t }}
                    >
                      <span className="absolute inset-0 rounded-full bg-brand" style={{ opacity: t }} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {showArrows && (
            <div className="flex items-center gap-2">
              <IconButton
                aria-label={labels?.previous ?? "Previous slide"}
                variant="secondary"
                isDisabled={state.atStart}
                onPress={previous}
                className="rounded-full"
              >
                <ChevronLeft className="rtl:-scale-x-100" />
              </IconButton>
              <IconButton
                aria-label={labels?.next ?? "Next slide"}
                variant="secondary"
                isDisabled={state.atEnd}
                onPress={next}
                className="rounded-full"
              >
                <ChevronRight className="rtl:-scale-x-100" />
              </IconButton>
            </div>
          )}
        </div>
      )}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>
    </section>
  );
}

export interface CarouselItemProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export function CarouselItem({ className, style, children, ...props }: CarouselItemProps) {
  const { index, count, label } = useContext(ItemContext);
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label(index, count)}
      data-carousel-item=""
      {...props}
      className={cn("min-w-0 shrink-0 snap-start", className)}
      style={{
        width: "calc((100% - (var(--miyuki-carousel-n) - 1) * var(--miyuki-carousel-gap)) / var(--miyuki-carousel-n))",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
