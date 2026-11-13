"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Modal as AriaModal,
  Dialog,
  type DialogRenderProps,
  DialogTrigger,
  type DialogTriggerProps,
  Heading,
  type HeadingProps,
  ModalOverlay,
  type ModalOverlayProps,
  OverlayTriggerStateContext,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type TideSnap = "peek" | "half" | "full";

const ORDER: TideSnap[] = ["peek", "half", "full"];
const NAMES: Record<TideSnap, string> = { peek: "Low", half: "Half height", full: "Full height" };
const WAVE = 34;
const BASE = 22;
const NO_DRAG = "button, a, input, textarea, select, label, [role=slider], [contenteditable], [data-tide-no-drag]";

export type TideSheetTriggerProps = DialogTriggerProps;

export function TideSheetTrigger(props: TideSheetTriggerProps) {
  return <DialogTrigger {...props} />;
}

export type TideSheetTitleProps = HeadingProps;

export function TideSheetTitle({ className, ...props }: TideSheetTitleProps) {
  return (
    <Heading
      slot="title"
      {...props}
      className={cn("text-base leading-6 font-semibold tracking-[-0.005em] text-foreground", className)}
    />
  );
}

export interface TideSheetProps
  extends Omit<ModalOverlayProps, "children" | "className" | "style" | "render" | "isOpen" | "defaultOpen"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  snap?: TideSnap;
  defaultSnap?: TideSnap;
  onSnapChange?: (snap: TideSnap) => void;
  snapPoints?: Partial<Record<TideSnap, number>>;
  "aria-label"?: string;
  className?: string;
  backdropBlur?: boolean;
  children?: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  ref?: Ref<HTMLDivElement>;
}

export function TideSheet({
  open,
  defaultOpen,
  onOpenChange,
  snap,
  defaultSnap = "half",
  onSnapChange,
  snapPoints,
  isDismissable = true,
  "aria-label": ariaLabel,
  className,
  backdropBlur = false,
  children,
  ref,
  ...props
}: TideSheetProps) {
  return (
    <ModalOverlay
      {...props}
      isOpen={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed top-0 left-0 z-50 h-(--visual-viewport-height) w-full"
    >
      <SheetBody
        snap={snap}
        defaultSnap={defaultSnap}
        onSnapChange={onSnapChange}
        snapPoints={snapPoints}
        ariaLabel={ariaLabel}
        className={className}
        backdropBlur={backdropBlur}
        panelRef={ref}
      >
        {children}
      </SheetBody>
    </ModalOverlay>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as RefObject<T | null>).current = value;
}

interface SheetBodyProps {
  snap?: TideSnap;
  defaultSnap: TideSnap;
  onSnapChange?: (snap: TideSnap) => void;
  snapPoints?: Partial<Record<TideSnap, number>>;
  ariaLabel?: string;
  className?: string;
  backdropBlur: boolean;
  panelRef?: Ref<HTMLDivElement>;
  children?: TideSheetProps["children"];
}

interface Motion {
  level: number;
  velocity: number;
  target: number;
  amp: number;
  steep: number;
  phase: number;
  dragging: boolean;
  closing: boolean;
  last: number | null;
}

function SheetBody({
  snap,
  defaultSnap,
  onSnapChange,
  snapPoints,
  ariaLabel,
  className,
  backdropBlur,
  panelRef,
  children,
}: SheetBodyProps) {
  const state = useContext(OverlayTriggerStateContext);
  const [innerSnap, setInnerSnap] = useState<TideSnap>(defaultSnap);
  const current = snap ?? innerSnap;
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [settledFull, setSettledFull] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);
  const scrim = useRef<HTMLDivElement | null>(null);
  const fillPath = useRef<SVGPathElement | null>(null);
  const linePath = useRef<SVGPathElement | null>(null);
  const foamPath = useRef<SVGPathElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const motion = useRef<Motion>({
    level: 0,
    velocity: 0,
    target: 0,
    amp: 4.2,
    steep: 0,
    phase: 0,
    dragging: false,
    closing: false,
    last: null,
  });
  const drag = useRef<{ id: number; y: number; level: number; t: number; v: number; active: boolean } | null>(null);
  const frame = useRef(0);
  const reduced = useRef(false);
  const exitResolve = useRef<(() => void) | null>(null);

  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panel.current = el;
      assignRef(panelRef, el);
    },
    [panelRef],
  );

  const levels = useCallback(
    (h: number) => {
      const full = Math.max(200, h - 40);
      return {
        peek: Math.min(full, Math.max(150, h * (snapPoints?.peek ?? 0.3))),
        half: Math.min(full, h * (snapPoints?.half ?? 0.56)),
        full: Math.min(full, h * (snapPoints?.full ?? 1)),
      } as Record<TideSnap, number>;
    },
    [snapPoints],
  );

  const fullHeight = height ? levels(height).full : 0;

  const draw = useCallback(() => {
    const m = motion.current;
    const el = panel.current;
    if (!el || !fullHeight) return;
    el.style.transform = `translate3d(0, ${(fullHeight - m.level).toFixed(2)}px, 0)`;
    if (scrim.current) {
      const half = levels(height).half;
      scrim.current.style.opacity = Math.max(0, Math.min(1, m.level / Math.max(1, half * 0.8))).toFixed(3);
    }
    const w = width || el.offsetWidth;
    if (!w) return;
    const k = (Math.PI * 2) / 230;
    const k2 = (Math.PI * 2) / 131;
    const pts: string[] = [];
    const foam: string[] = [];
    const n = Math.ceil(w / 6);
    for (let i = 0; i <= n; i++) {
      const x0 = (i / n) * w;
      const th = k * x0 - m.phase;
      const th2 = k2 * x0 + m.phase * 0.63 + 1.7;
      const x = x0 - m.steep * m.amp * Math.sin(th) * 0.9;
      const y = BASE - m.amp * (Math.cos(th) * 0.74 + Math.cos(th2) * 0.26);
      const edge = Math.min(1, x0 / 18, (w - x0) / 18);
      const yy = BASE + (y - BASE) * edge;
      const xx = Math.max(0, Math.min(w, x));
      pts.push(`${xx.toFixed(1)} ${yy.toFixed(2)}`);
      foam.push(
        `${xx.toFixed(1)} ${(yy + 4.5 + (1.2 + m.amp * 0.12) * Math.cos(th2 * 1.3 + m.phase * 0.4) * edge).toFixed(2)}`,
      );
    }
    const line = `M${pts.join("L")}`;
    fillPath.current?.setAttribute("d", `${line}L${w} ${WAVE + 2}L0 ${WAVE + 2}Z`);
    linePath.current?.setAttribute("d", line);
    foamPath.current?.setAttribute("d", `M${foam.join("L")}`);
  }, [fullHeight, height, width, levels]);

  const loopRef = useRef<(now: number) => void>(() => {});
  const start = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame((t) => loopRef.current(t));
  }, []);

  useLayoutEffect(() => {
    loopRef.current = (now: number) => {
      const m = motion.current;
      const dt = Math.min(0.033, m.last == null ? 0.016 : (now - m.last) / 1000);
      m.last = now;
      if (!m.dragging) {
        const stiff = m.closing ? 520 : 240;
        const damp = m.closing ? 46 : 27;
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          const h = dt / steps;
          m.velocity += (stiff * (m.target - m.level) - damp * m.velocity) * h;
          m.level += m.velocity * h;
        }
        if (m.closing && m.level <= 2) {
          m.level = 0;
          m.velocity = 0;
          exitResolve.current?.();
          exitResolve.current = null;
        }
      }
      const speed = Math.abs(m.velocity);
      const wantAmp = 4.2 + Math.min(15, speed * 0.011);
      const wantSteep = Math.min(1, speed / 1100);
      const rise = wantAmp > m.amp ? 1 - Math.exp(-dt / 0.06) : 1 - Math.exp(-dt / 0.55);
      m.amp += (wantAmp - m.amp) * rise;
      m.steep += (wantSteep - m.steep) * (wantSteep > m.steep ? 1 - Math.exp(-dt / 0.06) : 1 - Math.exp(-dt / 0.5));
      m.phase += dt * ((Math.PI * 2) / 7.5 + Math.min(6, speed * 0.004));
      draw();
      frame.current = requestAnimationFrame((t) => loopRef.current(t));
    };
  }, [draw]);

  useLayoutEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      setHeight(panel.current?.parentElement?.offsetHeight ?? window.innerHeight);
      setWidth(panel.current?.offsetWidth ?? 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panel.current?.parentElement) observer.observe(panel.current.parentElement);
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!height) return;
    const m = motion.current;
    m.target = m.closing ? 0 : levels(height)[current];
    if (reduced.current) {
      m.level = m.target;
      m.velocity = 0;
      draw();
      return;
    }
    start();
  }, [height, current, levels, start, draw]);

  useEffect(() => {
    if (current !== "full") return;
    const id = window.setTimeout(() => setSettledFull(true), reduced.current ? 0 : 260);
    return () => window.clearTimeout(id);
  }, [current]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      exitResolve.current?.();
    },
    [],
  );

  const choose = (next: TideSnap) => {
    if (next !== current) setSettledFull(false);
    if (snap === undefined) setInnerSnap(next);
    onSnapChange?.(next);
    motion.current.target = levels(height)[next];
    if (reduced.current) {
      motion.current.level = motion.current.target;
      draw();
    }
  };

  const onExit = useCallback(() => {
    const m = motion.current;
    if (reduced.current) {
      const el = panel.current;
      scrim.current?.animate([{ opacity: scrim.current.style.opacity || 1 }, { opacity: 0 }], {
        duration: 140,
        fill: "forwards",
      });
      return el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(() => {});
    }
    m.closing = true;
    m.dragging = false;
    m.target = 0;
    m.velocity = Math.min(m.velocity, -400);
    start();
    return new Promise<void>((resolve) => {
      exitResolve.current = resolve;
    });
  }, [start]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest(NO_DRAG)) return;
    const inScroll = scroller.current?.contains(target);
    if (inScroll && current === "full" && (scroller.current?.scrollTop ?? 0) > 0) return;
    if (inScroll && current === "full" && event.pointerType === "touch") return;
    drag.current = {
      id: event.pointerId,
      y: event.clientY,
      level: motion.current.level,
      t: event.timeStamp,
      v: 0,
      active: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId || !height) return;
    const dy = event.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) < 5) return;
      d.active = true;
      motion.current.dragging = true;
      panel.current?.setPointerCapture(event.pointerId);
      panel.current?.setAttribute("data-dragging", "");
      window.getSelection()?.removeAllRanges();
    }
    const max = levels(height).full;
    let level = d.level - dy;
    if (level > max) level = max + Math.sqrt(level - max) * 3;
    level = Math.max(0, level);
    const m = motion.current;
    const dt = Math.max(1, event.timeStamp - d.t) / 1000;
    const v = (level - m.level) / dt;
    m.velocity = m.velocity * 0.35 + v * 0.65;
    m.level = level;
    d.t = event.timeStamp;
    if (reduced.current) draw();
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    if (panel.current?.hasPointerCapture(event.pointerId)) panel.current.releasePointerCapture(event.pointerId);
    panel.current?.removeAttribute("data-dragging");
    const m = motion.current;
    m.dragging = false;
    const l = levels(height);
    const projected = m.level + m.velocity * 0.2;
    if (!cancelled && (projected < l.peek * 0.55 || (m.velocity < -1400 && m.level < l.half))) {
      state?.close();
      return;
    }
    let best: TideSnap = "peek";
    for (const s of ORDER) if (Math.abs(l[s] - projected) < Math.abs(l[best] - projected)) best = s;
    choose(best);
  };

  const onHandleKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = ORDER.indexOf(current);
    let next = i;
    if (event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "PageUp") next = Math.min(2, i + 1);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "PageDown")
      next = Math.max(0, i - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 2;
    else if (event.key === "Enter" || event.key === " ") next = (i + 1) % 3;
    else return;
    event.preventDefault();
    if (next !== i) choose(ORDER[next]);
  };

  const scrollable = current === "full" && settledFull;

  return (
    <>
      <div
        ref={scrim}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-foreground/25 opacity-0 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
        )}
      />
      <AriaModal
        ref={setPanel}
        onExit={onExit}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
        className={cn(
          "absolute right-0 bottom-0 left-0 mx-auto flex w-full max-w-[640px] flex-col text-popover-foreground outline-none",
          "[will-change:transform] data-[dragging]:select-none motion-reduce:data-[entering]:animate-[miyuki-tide-sheet-fade_160ms_ease-out]",
          className,
        )}
        style={{ height: fullHeight || "92%", transform: "translate3d(0, 110%, 0)" }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%-2px)] left-0 w-full overflow-visible"
          height={WAVE + 2}
          viewBox={`0 0 ${width || 1} ${WAVE + 2}`}
          preserveAspectRatio="none"
        >
          <path ref={fillPath} className="fill-popover" />
          <path
            ref={foamPath}
            fill="none"
            className="stroke-brand/35 dark:stroke-brand/30"
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M0.5 ${BASE}V${WAVE + 2}M${(width || 1) - 0.5} ${BASE}V${WAVE + 2}`}
            fill="none"
            className="stroke-border max-[640px]:hidden"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            ref={linePath}
            fill="none"
            className="stroke-border-strong dark:stroke-brand-strong/55"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="relative flex min-h-0 flex-1 flex-col border-x border-border bg-popover shadow-xl max-[640px]:border-x-0">
          <div className="flex shrink-0 cursor-grab touch-none justify-center pt-1 pb-2 active:cursor-grabbing">
            <div
              role="slider"
              tabIndex={0}
              aria-label="Sheet height"
              aria-orientation="vertical"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={ORDER.indexOf(current)}
              aria-valuetext={NAMES[current]}
              onKeyDown={onHandleKey}
              onClick={() => choose(ORDER[(ORDER.indexOf(current) + 1) % 3])}
              className="flex h-5 w-14 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <span className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
          </div>
          <Dialog
            aria-label={ariaLabel}
            render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
            className="relative flex min-h-0 flex-1 flex-col outline-none"
          >
            {(renderProps) => (
              <div
                ref={scroller}
                data-scrollable={scrollable || undefined}
                className={cn(
                  "min-h-0 flex-1 overscroll-contain",
                  scrollable ? "overflow-y-auto" : "touch-none overflow-hidden",
                )}
              >
                {typeof children === "function" ? children(renderProps) : children}
              </div>
            )}
          </Dialog>
        </div>
      </AriaModal>
      <style href="miyuki-tide-sheet" precedence="miyuki">{`
@keyframes miyuki-tide-sheet-fade { from { opacity: 0; } }
`}</style>
    </>
  );
}
