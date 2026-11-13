"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface ReadingStreamProps extends ComponentProps<"div"> {
  color?: string;
  container?: RefObject<HTMLElement | null>;
}

interface Marker {
  id: string;
  y: number;
}

interface ReadingStreamState {
  register: (id: string, el: HTMLElement) => () => void;
}

const ReadingStreamContext = createContext<ReadingStreamState | null>(null);

const FILL = { stiffness: 500, damping: 30 };
const SWELL = { stiffness: 420, damping: 22 };
const RAIL_MASK = "linear-gradient(to bottom, transparent, #000 28px, #000 calc(100% - 56px), transparent)";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function scrollerOf(container?: RefObject<HTMLElement | null>) {
  return container?.current ?? null;
}

function lineCenter(el: HTMLElement) {
  const target = (el.firstElementChild as HTMLElement | null) ?? el;
  const rect = target.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(target).lineHeight);
  return rect.top + Math.min(rect.height, Number.isFinite(lh) ? lh : rect.height) / 2;
}

export function ReadingStream({
  color = "var(--brand)",
  container,
  className,
  style,
  children,
  ...props
}: ReadingStreamProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  const placed = useRef<Marker[]>([]);
  const reduce = useReducedMotion() ?? false;
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [passed, setPassed] = useState(0);

  const { scrollY } = useScroll({ container });
  const fill = useMotionValue(0);
  const height = useMotionValue(1);
  const scaleY = useTransform(() => (height.get() > 0 ? fill.get() / height.get() : 0));

  const speed = useVelocity(scrollY);
  const swellTarget = useTransform(speed, (v) => (reduce ? 0 : Math.min(1, Math.abs(v) / 1600)));
  const swell = useSpring(swellTarget, SWELL);
  const dropX = useTransform(swell, (s) => 1 + 0.3 * s);
  const dropY = useTransform(swell, (s) => 1 + 0.85 * s);

  const count = useCallback(() => {
    const at = fill.get();
    const n = placed.current.filter((m) => at >= m.y - 1).length;
    setPassed((prev) => (prev === n ? prev : n));
  }, [fill]);

  const update = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const box = scrollerOf(container);
    const viewTop = box ? box.getBoundingClientRect().top : 0;
    const viewHeight = box ? box.clientHeight : window.innerHeight;
    const scroller = box ?? document.scrollingElement ?? document.documentElement;
    const range = scroller.scrollHeight - viewHeight;
    const progress = range > 0 ? clamp(scroller.scrollTop / range, 0, 1) : 1;
    const line = viewTop + viewHeight * (0.4 + 0.6 * progress ** 4);
    height.set(rect.height);
    fill.set(clamp(line - rect.top, 0, rect.height));
  }, [container, height, fill]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top;
    const next = [...sections.current]
      .map(([id, el]) => ({ id, y: Math.round(lineCenter(el) - top) }))
      .sort((a, b) => a.y - b.y);
    const prev = placed.current;
    if (prev.length === next.length && prev.every((m, i) => m.id === next[i].id && m.y === next[i].y)) return;
    placed.current = next;
    setMarkers(next);
    count();
  }, [count]);

  useMotionValueEvent(scrollY, "change", update);
  useMotionValueEvent(fill, "change", count);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => {
      measure();
      update();
    };
    const ro = new ResizeObserver(sync);
    ro.observe(root);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [measure, update]);

  const state = useMemo<ReadingStreamState>(
    () => ({
      register: (id, el) => {
        sections.current.set(id, el);
        measure();
        return () => {
          sections.current.delete(id);
          measure();
        };
      },
    }),
    [measure],
  );

  return (
    <div
      {...props}
      ref={rootRef}
      className={cn(
        "relative pl-10 [--miyuki-reading-stream-x:12px] sm:pl-16 sm:[--miyuki-reading-stream-x:20px]",
        className,
      )}
      style={{ "--miyuki-reading-stream-color": color, ...style } as CSSProperties}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-(--miyuki-reading-stream-x)">
        <div
          className="absolute inset-y-0 w-8 -translate-x-1/2"
          style={{ maskImage: RAIL_MASK, WebkitMaskImage: RAIL_MASK }}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
          <motion.div
            className="absolute inset-y-0 left-1/2 w-0.5 origin-top -translate-x-1/2 rounded-full bg-(--miyuki-reading-stream-color) dark:shadow-[0_0_10px_color-mix(in_oklab,var(--miyuki-reading-stream-color)_60%,transparent)]"
            style={{ scaleY }}
          />
        </div>
        {markers.map((marker, i) => {
          const on = i < passed;
          return (
            <span
              key={marker.id}
              className={cn(
                "absolute left-0 size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-background transition-[border-color,box-shadow] duration-200 ease-settle",
                on
                  ? "border-(--miyuki-reading-stream-color) dark:shadow-[0_0_8px_color-mix(in_oklab,var(--miyuki-reading-stream-color)_55%,transparent)]"
                  : "border-border-strong",
              )}
              style={{ top: marker.y }}
            >
              <motion.span
                className="absolute inset-[1.5px] rounded-full bg-(--miyuki-reading-stream-color)"
                initial={false}
                animate={{ scale: on ? 1 : 0 }}
                transition={reduce ? { duration: 0.12 } : on ? { type: "spring", ...FILL } : { duration: 0.12 }}
              />
            </span>
          );
        })}
        <motion.div className="absolute top-0 left-0" style={{ y: fill }}>
          <motion.span
            className={cn(
              "absolute block size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full",
              "bg-(--miyuki-reading-stream-color) ring-[3px] ring-background",
              "dark:bg-[color-mix(in_oklab,var(--miyuki-reading-stream-color)_55%,white)] dark:shadow-[0_0_12px_3px_color-mix(in_oklab,var(--miyuki-reading-stream-color)_55%,transparent)]",
            )}
            style={{ scaleX: dropX, scaleY: dropY }}
          />
        </motion.div>
      </div>
      <ReadingStreamContext value={state}>{children}</ReadingStreamContext>
    </div>
  );
}

export interface ReadingStreamSectionProps extends ComponentProps<"section"> {
  ref?: Ref<HTMLElement>;
}

export function ReadingStreamSection({ ref, ...props }: ReadingStreamSectionProps) {
  const beam = useContext(ReadingStreamContext);
  const id = useId();
  const local = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = local.current;
    if (!beam || !el) return;
    return beam.register(id, el);
  }, [beam, id]);

  return (
    <section
      {...props}
      ref={(el) => {
        local.current = el;
        if (typeof ref === "function") return ref(el);
        if (ref) ref.current = el;
      }}
    />
  );
}
