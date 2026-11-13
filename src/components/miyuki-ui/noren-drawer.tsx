"use client";

import {
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
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
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

const STRIPS = 12;
const GAP = 3;

const keyframes = `
@keyframes miyuki-noren-drawer-drop { from { transform: translate3d(0, calc(-100% - 16px), 0); } }
@keyframes miyuki-noren-drawer-fade-in { from { opacity: 0; } }
`;

export function NorenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={className}>
      <circle cx={50} cy={50} r={42} stroke="currentColor" strokeWidth={4.5} />
      <path
        d="M21 37q7.25-7 14.5 0t14.5 0 14.5 0 14.5 0M17.5 51q8.1-7 16.2 0t16.2 0 16.2 0 16.2 0M21 65q7.25-7 14.5 0t14.5 0 14.5 0 14.5 0"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PanelState {
  ax: number[];
  vx: number[];
  az: number[];
  vz: number[];
  s: number;
  vs: number;
  tx: number;
  tz: number;
  ts: number;
  at: number;
  next: { tx: number; tz: number; ts: number } | null;
}

interface Drive {
  k: number;
  c: number;
  kb: number;
  cb: number;
}

const OPEN_DRIVE: Drive = { k: 150, c: 17, kb: 520, cb: 13 };
const CLOSE_DRIVE: Drive = { k: 150, c: 11, kb: 520, cb: 9 };
const SIDES = [-1, 0, 1];
const DELAYS = [45, 0, 80];
const SPREAD = [0.94, 1, 1.06];

function freshPanel(): PanelState {
  return {
    ax: Array(STRIPS).fill(0),
    vx: Array(STRIPS).fill(0),
    az: Array(STRIPS).fill(0),
    vz: Array(STRIPS).fill(0),
    s: 0,
    vs: 0,
    tx: 0,
    tz: 0,
    ts: 0,
    at: 0,
    next: null,
  };
}

interface Cloth {
  set: (open: boolean, options?: { near?: boolean; at?: number }) => Promise<void>;
  paint: () => void;
  stop: () => void;
}

type Grid = () => (HTMLDivElement | null)[][];

function createCloth(strips: Grid, shades: Grid): Cloth {
  const panels: PanelState[] = [freshPanel(), freshPanel(), freshPanel()];
  let drive: Drive = OPEN_DRIVE;
  let frame = 0;
  let last: number | null = null;
  let waiters: { near: boolean; since: number; resolve: () => void }[] = [];

  const paint = () => {
    panels.forEach((p, pi) => {
      const row = strips()[pi];
      const shadeRow = shades()[pi];
      for (let k = 0; k < STRIPS; k++) {
        const el = row?.[k];
        if (!el) continue;
        const rx = k === 0 ? p.ax[0] : p.ax[k] - p.ax[k - 1];
        const rz = k === 0 ? p.az[0] : p.az[k] - p.az[k - 1];
        el.style.transform =
          k === 0
            ? `translate3d(${p.s.toFixed(2)}px,0,0) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`
            : `rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
        const shade = shadeRow?.[k];
        if (shade) {
          const a = (p.ax[k] * Math.PI) / 180;
          const dark = a < 0 ? 0.62 * (1 - Math.cos(a)) : 0.18 * (1 - Math.cos(a));
          shade.style.opacity = Math.min(0.7, dark).toFixed(3);
        }
      }
    });
  };

  const tick = (now: number) => {
    const dt = Math.min(0.034, last == null ? 0.016 : (now - last) / 1000);
    last = now;
    const { k, c, kb, cb } = drive;
    const sub = 6;
    const h = dt / sub;
    let energy = 0;
    let hang = 0;
    for (const p of panels) {
      if (p.next && now >= p.at) {
        p.tx = p.next.tx;
        p.tz = p.next.tz;
        p.ts = p.next.ts;
        p.next = null;
      }
      for (let n = 0; n < sub; n++) {
        for (let i = 0; i < STRIPS; i++) {
          const up = i === 0 ? p.tx : p.ax[i - 1];
          let acc = (i === 0 ? k : kb) * (up - p.ax[i]) - (i === 0 ? c : cb) * p.vx[i];
          if (i < STRIPS - 1) acc += kb * 0.3 * (p.ax[i + 1] - p.ax[i]);
          p.vx[i] += acc * h;
          if (i === 0) {
            p.vz[0] += (k * 0.55 * (p.tz - p.az[0]) - c * 0.6 * p.vz[0]) * h;
          }
        }
        p.az[0] += p.vz[0] * h;
        for (let i = 0; i < STRIPS; i++) {
          p.ax[i] += p.vx[i] * h;
          if (i > 0) {
            p.az[i] = p.az[0];
            p.vz[i] = p.vz[0];
          }
        }
        p.vs += (120 * (p.ts - p.s) - 16 * p.vs) * h;
        p.s += p.vs * h;
      }
      for (let i = 0; i < STRIPS; i++) {
        energy = Math.max(
          energy,
          Math.abs(p.vx[i]),
          Math.abs(p.vz[i]),
          Math.abs(p.ax[i] - p.tx) * 4,
          Math.abs(p.az[i] - p.tz) * 4,
        );
        hang = Math.max(hang, Math.abs(p.ax[i]));
      }
      energy = Math.max(energy, Math.abs(p.vs), p.next ? 999 : 0);
    }
    paint();
    waiters = waiters.filter((w) => {
      const done = w.near ? hang < 16 || now - w.since > 520 : energy < 0.4;
      if (done) w.resolve();
      return !done;
    });
    if (energy < 0.4) {
      frame = 0;
      last = null;
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  const set = (open: boolean, options: { near?: boolean; at?: number } = {}) => {
    drive = open ? OPEN_DRIVE : CLOSE_DRIVE;
    const base = options.at ?? performance.now();
    panels.forEach((p, i) => {
      p.next = open
        ? { tx: -72 * SPREAD[i], tz: -SIDES[i] * 20 * SPREAD[i], ts: SIDES[i] * 10 }
        : { tx: 0, tz: 0, ts: 0 };
      p.at = base + (open ? DELAYS[i] : DELAYS[2 - i] * 0.6);
    });
    if (!frame) frame = requestAnimationFrame(tick);
    return new Promise<void>((resolve) => {
      waiters.push({ near: options.near ?? false, since: base, resolve });
    });
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    for (const w of waiters) w.resolve();
    waiters = [];
  };

  return { set, paint, stop };
}

function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type NorenDrawerTriggerProps = DialogTriggerProps;

export function NorenDrawerTrigger(props: NorenDrawerTriggerProps) {
  return <DialogTrigger {...props} />;
}

export interface NorenDrawerProps
  extends Omit<ModalOverlayProps, "children" | "className" | "style" | "render" | "isOpen" | "defaultOpen"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mark?: ReactNode;
  closeButton?: boolean;
  "aria-label"?: string;
  className?: string;
  clothClassName?: string;
  backdropBlur?: boolean;
  children?: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  ref?: Ref<HTMLDivElement>;
}

export function NorenDrawer({
  open,
  defaultOpen,
  onOpenChange,
  mark,
  closeButton = true,
  isDismissable = true,
  "aria-label": ariaLabel,
  className,
  clothClassName,
  backdropBlur = false,
  children,
  ref,
  ...props
}: NorenDrawerProps) {
  return (
    <>
      <style href="miyuki-noren-drawer" precedence="miyuki">
        {keyframes}
      </style>
      <ModalOverlay
        {...props}
        isOpen={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        isDismissable={isDismissable}
        className="group/noren fixed top-0 left-0 z-50 h-(--visual-viewport-height) w-full"
      >
        <NorenPanel
          mark={mark}
          closeButton={closeButton}
          ariaLabel={ariaLabel}
          className={className}
          clothClassName={clothClassName}
          backdropBlur={backdropBlur}
          panelRef={ref}
        >
          {children}
        </NorenPanel>
      </ModalOverlay>
    </>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as RefObject<T | null>).current = value;
}

interface NorenPanelProps {
  mark?: ReactNode;
  closeButton: boolean;
  ariaLabel?: string;
  className?: string;
  clothClassName?: string;
  backdropBlur: boolean;
  panelRef?: Ref<HTMLDivElement>;
  children?: NorenDrawerProps["children"];
}

function NorenPanel({
  mark,
  closeButton,
  ariaLabel,
  className,
  clothClassName,
  backdropBlur,
  panelRef,
  children,
}: NorenPanelProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const scrim = useRef<HTMLDivElement | null>(null);
  const curtain = useRef<HTMLDivElement | null>(null);
  const strips = useRef<(HTMLDivElement | null)[][]>([[], [], []]);
  const shades = useRef<(HTMLDivElement | null)[][]>([[], [], []]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const cloth = useRef<Cloth | null>(null);

  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panel.current = el;
      assignRef(panelRef, el);
    },
    [panelRef],
  );

  useLayoutEffect(() => {
    const el = curtain.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((old) => (old && old.w === w && old.h === h ? old : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const engine = createCloth(
      () => strips.current,
      () => shades.current,
    );
    cloth.current = engine;
    return () => {
      engine.stop();
      cloth.current = null;
    };
  }, []);

  useEffect(() => {
    if (size) cloth.current?.paint();
  }, [size]);

  useEffect(() => {
    if (prefersReduced()) {
      const anim = curtain.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 180,
        delay: 60,
        easing: "ease-out",
        fill: "forwards",
      });
      return () => anim?.cancel();
    }
    const start = performance.now() + 170;
    void cloth.current?.set(true, { at: start });
    const fade = curtain.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      delay: 360,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    });
    return () => fade?.cancel();
  }, []);

  const onExit = useCallback(async () => {
    const el = panel.current;
    const shade = scrim.current;
    if (prefersReduced()) {
      curtain.current?.getAnimations().forEach((a) => a.cancel());
      shade?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in", fill: "forwards" });
      await el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in", fill: "forwards" })
        .finished;
      return;
    }
    const veil = curtain.current;
    veil?.getAnimations().forEach((a) => a.cancel());
    veil?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 110, easing: "ease-out" });
    await cloth.current?.set(false, { near: true });
    shade?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-in", fill: "forwards" });
    await el?.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0, calc(-100% - 16px), 0)" }], {
      duration: 220,
      easing: "cubic-bezier(0.5, 0, 0.75, 0)",
      fill: "forwards",
    }).finished;
  }, []);

  const panelWidth = size ? (size.w - GAP * 2) / 3 : 0;
  const stripHeight = size ? size.h / STRIPS : 0;

  const renderStrip = (pi: number, k: number): ReactNode => {
    if (!size || k >= STRIPS) return null;
    const left = pi * (panelWidth + GAP);
    return (
      <div
        ref={(el) => {
          strips.current[pi][k] = el;
        }}
        className="absolute inset-x-0 origin-top [transform-style:preserve-3d] [will-change:transform]"
        style={{ top: k === 0 ? 0 : stripHeight, height: stripHeight }}
      >
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: stripHeight + 4 }}>
          <div
            className={cn(
              "absolute bg-(--miyuki-noren-cloth) text-(--miyuki-noren-ink)",
              "[--miyuki-noren-cloth:var(--primary)] [--miyuki-noren-ink:var(--primary-foreground)]",
              "dark:[--miyuki-noren-cloth:var(--brand-soft)] dark:[--miyuki-noren-ink:var(--brand-strong)]",
              clothClassName,
            )}
            style={{ width: size.w, height: size.h, left: -left, top: -k * stripHeight }}
          >
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,color-mix(in_oklab,currentColor_3%,transparent)_0_1px,transparent_1px_3px)]" />
            <div className="absolute inset-x-0 top-0 h-[22px] bg-[linear-gradient(to_bottom,rgb(0_0_0/0.3),rgb(0_0_0/0.12))]" />
            <div className="absolute inset-x-0 top-[22px] border-t border-dashed border-current/25" />
            <div className="absolute inset-x-0 bottom-2.5 border-t border-dashed border-current/20" />
            <div className="absolute top-[47%] left-1/2 aspect-square w-[min(36%,52cqh)] -translate-1/2 [&>svg]:size-full">
              {mark ?? <NorenMark />}
            </div>
          </div>
          <div
            ref={(el) => {
              shades.current[pi][k] = el;
            }}
            className="absolute inset-0 bg-[rgb(8_14_28)] opacity-0"
          />
        </div>
        {renderStrip(pi, k + 1)}
      </div>
    );
  };

  return (
    <>
      <div
        ref={scrim}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-foreground/25 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
          "animate-[miyuki-noren-drawer-fade-in_240ms_ease-out]",
        )}
      />
      <AriaModal
        ref={setPanel}
        onExit={onExit}
        className={cn(
          "absolute top-0 right-0 left-0 mx-auto flex max-h-[calc(100%-24px)] w-[min(560px,calc(100%-16px))] flex-col",
          "overflow-clip rounded-b-2xl border border-t-0 border-border bg-popover text-popover-foreground shadow-xl outline-none",
          "data-[entering]:animate-[miyuki-noren-drawer-drop_380ms_cubic-bezier(0.22,1,0.36,1)]",
          "motion-reduce:data-[entering]:animate-[miyuki-noren-drawer-fade-in_160ms_ease-out]",
          className,
        )}
      >
        <div aria-hidden="true" className="relative z-20 mx-1.5 mt-1.5 h-3 shrink-0">
          <div className="absolute inset-0 rounded-full bg-primary shadow-sm dark:bg-border-strong" />
          <div className="absolute inset-x-2 top-[2px] h-[3px] rounded-full bg-primary-foreground/25 dark:bg-foreground/20" />
          <div className="absolute top-1/2 -left-px size-3.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-popover dark:bg-border-strong" />
          <div className="absolute top-1/2 -right-px size-3.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-popover dark:bg-border-strong" />
        </div>
        <div className="relative flex min-h-0 flex-auto flex-col">
          <Dialog
            aria-label={ariaLabel}
            render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
            className="relative flex min-h-0 flex-auto flex-col pt-4 outline-none"
          >
            {(renderProps) => (
              <>
                {typeof children === "function" ? children(renderProps) : children}
                {closeButton && <CloseButton slot="close" size="lg" className="absolute top-4 right-3" />}
              </>
            )}
          </Dialog>
          <div
            ref={curtain}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-1.5 bottom-0 z-10 [container-type:size] [perspective-origin:50%_0] [perspective:1100px]"
          >
            {size &&
              [0, 1, 2].map((pi) => (
                <div
                  key={pi}
                  className="absolute top-0 h-full [transform-style:preserve-3d]"
                  style={{ left: pi * (panelWidth + GAP), width: panelWidth }}
                >
                  {renderStrip(pi, 0)}
                </div>
              ))}
          </div>
        </div>
      </AriaModal>
    </>
  );
}
