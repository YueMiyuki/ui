"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type PressEvent,
} from "react-aria-components";
import { MorphIcon, type MorphShapes } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type PaperPlaneSendVariant = "primary" | "brand" | "secondary";
export type PaperPlaneSendSize = "sm" | "md" | "lg";

export interface PaperPlaneSendLabels {
  idle?: ReactNode;
  sending?: string;
  sent?: string;
  failed?: string;
}

export interface PaperPlaneSendProps extends Omit<AriaButtonProps, "children" | "onPress"> {
  onPress?: (event: PressEvent) => unknown;
  children?: ReactNode;
  labels?: PaperPlaneSendLabels;
  variant?: PaperPlaneSendVariant;
  size?: PaperPlaneSendSize;
  ref?: Ref<HTMLButtonElement>;
}

type Phase = "idle" | "sending" | "sent" | "failed";

const sizes: Record<PaperPlaneSendSize, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-3.5",
  lg: "h-11 px-5",
};

const variants: Record<PaperPlaneSendVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs data-[hovered]:bg-primary/90",
  brand: "bg-brand text-brand-foreground shadow-xs data-[hovered]:bg-brand/90",
  secondary: "border border-border-strong bg-card text-foreground shadow-xs data-[hovered]:bg-accent",
};

const glyphs: MorphShapes = {
  send: ["M4.5 5L20 12L4.5 19L8.5 12Z", "M8.5 12L13.5 12", "M8.5 12L8.5 12L8.5 12"],
  plane: ["M3 10.5L21 3.5L14.5 20.5L10.5 13.5Z", "M10.5 13.5L21 3.5", "M10.5 13.5L10.5 18.25L11.9 15.95"],
};

const NOSE = (Math.atan2(3.5 - 12, 21 - 12) * 180) / Math.PI;
const ORBIT_TURN = 0.95;
const TRAIL_AGE = 0.24;

interface Point {
  x: number;
  y: number;
  t: number;
  s: number;
}

const ease = {
  inOut: (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  takeoff: (u: number) => u * u * (1.6 - 0.6 * u),
  out: (u: number) => 1 - (1 - u) ** 3,
};

function bezier(p: number[], u: number) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  const x = a * p[0] + b * p[2] + c * p[4] + d * p[6];
  const y = a * p[1] + b * p[3] + c * p[5] + d * p[7];
  const dx = 3 * v * v * (p[2] - p[0]) + 6 * v * u * (p[4] - p[2]) + 3 * u * u * (p[6] - p[4]);
  const dy = 3 * v * v * (p[3] - p[1]) + 6 * v * u * (p[5] - p[3]) + 3 * u * u * (p[7] - p[5]);
  return { x, y, heading: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const isPromise = (value: unknown): value is Promise<unknown> =>
  value != null && typeof (value as Promise<unknown>).then === "function";

export function PaperPlaneSend({
  onPress,
  children,
  labels,
  variant = "primary",
  size = "md",
  className,
  ref,
  ...props
}: PaperPlaneSendProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("idle");
  const [shape, setShape] = useState<"send" | "plane">("send");
  const [checked, setChecked] = useState(false);
  const node = useRef<HTMLButtonElement | null>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const flyer = useRef<HTMLSpanElement>(null);
  const trails = useRef<(SVGPolylineElement | null)[]>([]);
  const engine = useRef<{ press: (result: unknown) => void; busy: () => boolean } | null>(null);

  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const plane = flyer.current;
    const home = slot.current;
    if (!plane || !home) return;
    let frame = 0;
    let busy = false;
    let run = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const pose = { x: 0, y: 0, rot: 0, scale: 1, opacity: 1, heading: NOSE };
    let trail: Point[] = [];
    let travelled = 0;
    type Mode =
      | { kind: "rest" }
      | {
          kind: "fly";
          start: number;
          duration: number;
          path: number[];
          from: { rot: number; scale: number };
          to: number;
          done: () => void;
        }
      | { kind: "orbit"; start: number; radius: number; settle: null | (() => void) }
      | { kind: "home"; start: number; duration: number; from: typeof pose; done: () => void }
      | { kind: "return"; start: number };
    let mode: Mode = { kind: "rest" };

    const write = () => {
      plane.style.transform = `translate(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px) rotate(${pose.rot.toFixed(2)}deg) scale(${pose.scale.toFixed(3)})`;
      plane.style.opacity = pose.opacity.toFixed(3);
    };

    const drawTrail = (now: number) => {
      const t = now / 1000;
      trail = trail.filter((p) => t - p.t < TRAIL_AGE);
      const bands = [
        [0, 0.08, 0.75],
        [0.08, 0.16, 0.45],
        [0.16, TRAIL_AGE, 0.2],
      ];
      bands.forEach(([a, b, alpha], i) => {
        const el = trails.current[i];
        if (!el) return;
        const pts = trail.filter((p) => t - p.t >= a - 0.012 && t - p.t <= b + 0.012);
        if (pts.length < 2) {
          el.setAttribute("points", "");
          return;
        }
        el.setAttribute("points", pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
        el.style.strokeDashoffset = String(pts[0].s.toFixed(2));
        el.style.opacity = String(alpha);
      });
    };

    const track = (now: number) => {
      const r = (pose.heading * Math.PI) / 180;
      const back = 6.5 * pose.scale;
      const x = pose.x - Math.cos(r) * back;
      const y = pose.y - Math.sin(r) * back;
      const last = trail[trail.length - 1];
      const step = last ? Math.hypot(x - last.x, y - last.y) : 0;
      if (last && step < 0.6) return;
      travelled += step;
      trail.push({ x, y, t: now / 1000, s: travelled });
    };

    const tick = (now: number) => {
      const t = now / 1000;
      if (mode.kind === "fly") {
        const u = Math.min(1, (t - mode.start) / mode.duration);
        const p = bezier(mode.path, ease.takeoff(u));
        const blend = Math.min(1, u / 0.18);
        pose.x = p.x;
        pose.y = p.y;
        pose.heading = p.heading;
        pose.rot = mode.from.rot + (p.heading - NOSE - mode.from.rot) * ease.inOut(blend);
        pose.scale = mode.from.scale + (mode.to - mode.from.scale) * ease.inOut(u);
        pose.opacity = u < 0.72 ? 1 : 1 - (u - 0.72) / 0.28;
        track(now);
        if (u >= 1) {
          const done = mode.done;
          mode = { kind: "rest" };
          pose.opacity = 0;
          done();
        }
      } else if (mode.kind === "orbit") {
        const age = t - mode.start;
        const grow = Math.min(1, age / 0.34);
        const angle = Math.PI + (age / ORBIT_TURN) * Math.PI * 2;
        const radius = mode.radius * ease.out(grow);
        pose.x = Math.cos(angle) * radius;
        pose.y = Math.sin(angle) * radius;
        const heading = ((angle + Math.PI / 2) * 180) / Math.PI;
        const lean = 1 - ease.out(grow);
        pose.heading = heading - 18 * lean;
        pose.rot = (heading - NOSE) * ease.inOut(grow);
        pose.scale = 1 - 0.22 * ease.inOut(grow);
        pose.opacity = 1;
        if (grow > 0.2) track(now);
        const norm = ((((heading + 180) % 360) + 360) % 360) - 180;
        if (mode.settle && grow >= 1 && norm > -48 && norm < 8) {
          const settle = mode.settle;
          mode = { kind: "rest" };
          settle();
        }
      } else if (mode.kind === "home") {
        const u = Math.min(1, (t - mode.start) / mode.duration);
        const e = ease.inOut(u);
        const f = mode.from;
        pose.x = f.x * (1 - e);
        pose.y = f.y * (1 - e);
        let spin = 0 - f.rot;
        spin = ((((spin + 180) % 360) + 360) % 360) - 180;
        pose.rot = f.rot + spin * e;
        pose.scale = f.scale + (1 - f.scale) * e;
        pose.heading = f.heading;
        pose.opacity = 1;
        if (u >= 1) {
          const done = mode.done;
          mode = { kind: "rest" };
          done();
        }
      } else if (mode.kind === "return") {
        const u = Math.min(1, (t - mode.start) / 0.34);
        const e = ease.out(u);
        pose.x = 0;
        pose.y = 5 * (1 - e);
        pose.rot = 0;
        pose.scale = 0.7 + 0.3 * e;
        pose.opacity = e;
        pose.heading = NOSE;
        if (u >= 1) mode = { kind: "rest" };
      }
      write();
      drawTrail(now);
      frame = mode.kind !== "rest" || trail.length > 0 ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const exitPath = (fromX: number, fromY: number, heading: number | null) => {
      const button = node.current;
      const b = button?.getBoundingClientRect();
      const s = home.getBoundingClientRect();
      const cx = s.left + s.width / 2;
      const cy = s.top + s.height / 2;
      const right = b ? b.right - cx : 120;
      const top = b ? b.top - cy : -18;
      const ex = right + 18;
      const ey = top - 8;
      const r = heading == null ? 0 : (heading * Math.PI) / 180;
      const lead = heading == null ? right * 0.2 : 16;
      const p1 = heading == null ? [lead, 1.5] : [fromX + Math.cos(r) * lead, fromY + Math.sin(r) * lead];
      return [fromX, fromY, p1[0], p1[1], right * 0.5, top * 0.95, ex, ey];
    };

    const fly = (
      duration: number,
      from: { rot: number; scale: number },
      path: number[],
      to: number,
      done: () => void,
    ) => {
      trail = [];
      travelled = 0;
      mode = { kind: "fly", start: performance.now() / 1000, duration, path, from, to, done };
      wake();
    };

    const finish = (id: number) => {
      setChecked(true);
      setPhase("sent");
      if (reduce) {
        pose.opacity = 0;
        write();
      }
      later(1500, () => {
        if (run !== id) return;
        setChecked(false);
        setPhase("idle");
        if (reduce) {
          setShape("send");
          pose.opacity = 1;
          write();
          busy = false;
          return;
        }
        pose.x = 0;
        pose.y = 5;
        pose.opacity = 0;
        mode = { kind: "return", start: performance.now() / 1000 };
        wake();
        later(340, () => {
          if (run === id) busy = false;
        });
      });
    };

    const fail = (id: number) => {
      setPhase("failed");
      setShape("send");
      const button = node.current;
      if (button && !reduce) {
        animate(button, { x: [0, -5, 5, -3.5, 3, -1.5, 0] }, { duration: 0.42, ease: "easeOut" });
      }
      busy = false;
      later(2200, () => {
        if (run === id) setPhase("idle");
      });
    };

    const takeOff = (id: number) => {
      later(reduce ? 140 : 120, () => {
        if (run === id) finish(id);
      });
      if (reduce) return;
      fly(0.56, { rot: pose.rot, scale: pose.scale }, exitPath(0, 0, null), 0.42, () => setShape("send"));
    };

    engine.current = {
      busy: () => busy,
      press: (result) => {
        if (busy) return;
        busy = true;
        const id = ++run;
        timers.forEach(clearTimeout);
        timers.length = 0;
        setChecked(false);
        setShape("plane");
        if (!isPromise(result)) {
          setPhase("idle");
          later(reduce ? 0 : 150, () => {
            if (run === id) takeOff(id);
          });
          return;
        }
        setPhase("sending");
        if (!reduce) {
          later(150, () => {
            if (run !== id || mode.kind !== "rest") return;
            mode = {
              kind: "orbit",
              start: performance.now() / 1000,
              radius: size === "sm" ? 6 : size === "lg" ? 8 : 7,
              settle: null,
            };
            trail = [];
            travelled = 0;
            wake();
          });
        }
        result.then(
          () => {
            if (run !== id) return;
            if (reduce) {
              finish(id);
              return;
            }
            const depart = () => {
              const from = { rot: pose.rot, scale: pose.scale };
              const path = exitPath(pose.x, pose.y, pose.heading);
              mode = {
                kind: "fly",
                start: performance.now() / 1000,
                duration: 0.52,
                path,
                from,
                to: 0.4,
                done: () => setShape("send"),
              };
              wake();
              finish(id);
            };
            if (mode.kind === "orbit") mode.settle = depart;
            else later(200, () => run === id && (mode.kind === "orbit" ? (mode.settle = depart) : depart()));
          },
          () => {
            if (run !== id) return;
            if (reduce || mode.kind !== "orbit") {
              mode = { kind: "rest" };
              pose.x = pose.y = pose.rot = 0;
              pose.scale = pose.opacity = 1;
              write();
              fail(id);
              return;
            }
            mode = {
              kind: "home",
              start: performance.now() / 1000,
              duration: 0.34,
              from: { ...pose },
              done: () => fail(id),
            };
            wake();
          },
        );
      },
    };

    return () => {
      run++;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      engine.current = null;
    };
  }, [reduce, size]);

  const idleLabel = labels?.idle ?? children;
  const text = {
    sending: labels?.sending ?? "Sending",
    sent: labels?.sent ?? "Sent",
    failed: labels?.failed ?? "Try again",
  };
  const busy = phase === "sending" || phase === "sent";
  const announce = phase === "idle" ? "" : text[phase];

  return (
    <>
      <AriaButton
        {...props}
        ref={setRef}
        onPress={(event) => {
          if (engine.current?.busy()) return;
          engine.current?.press(onPress?.(event));
        }}
        render={(domProps, renderProps) => {
          const withBusy = { ...domProps, "aria-busy": busy || undefined };
          return props.render ? props.render(withBusy, renderProps) : <button {...withBusy} />;
        }}
        className={composeRenderProps(className, (cls) =>
          cn(
            "group/plane relative isolate inline-flex shrink-0 cursor-default items-center justify-center gap-2 overflow-clip rounded-lg text-sm font-medium whitespace-nowrap select-none outline-none",
            "transition-[scale,background-color,box-shadow,border-color,color] duration-150 ease-settle data-[pressed]:scale-[0.98]",
            "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            busy && "cursor-wait",
            variants[variant],
            sizes[size],
            cls,
          ),
        )}
      >
        <span ref={slot} aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center">
          <svg className="pointer-events-none absolute top-1/2 left-1/2 size-px overflow-visible" fill="none">
            {[0, 1, 2].map((i) => (
              <polyline
                key={i}
                ref={(el) => {
                  trails.current[i] = el;
                }}
                points=""
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="2.4 3.2"
              />
            ))}
          </svg>
          <span
            ref={flyer}
            className="absolute inset-0 grid place-items-center will-change-transform motion-reduce:transition-opacity motion-reduce:duration-150"
          >
            <MorphIcon
              shapes={glyphs}
              shape={shape}
              size={16}
              strokeWidth={1.7}
              transition={{ stiffness: 380, damping: 30 }}
              className="overflow-visible [&>path:first-child]:fill-current [&>path:first-child]:[fill-opacity:0.2]"
            />
          </span>
          <svg viewBox="0 0 16 16" className="pointer-events-none absolute inset-0 size-4 overflow-visible" fill="none">
            <motion.path
              d="M3.25 8.6L6.5 11.75L12.75 4.5"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={checked ? { pathLength: 1, opacity: 1 } : { pathLength: reduce ? 1 : 0, opacity: 0 }}
              transition={
                checked
                  ? {
                      pathLength: { duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.16, ease: [0.3, 0.6, 0.3, 1] },
                      opacity: { duration: reduce ? 0.12 : 0.05, delay: reduce ? 0 : 0.16 },
                    }
                  : { opacity: { duration: 0.14 }, pathLength: { duration: 0, delay: 0.14 } }
              }
            />
          </svg>
        </span>
        <span className="grid justify-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2 transition-[opacity,translate] duration-200 ease-settle",
              phase === "idle" && shape === "send" ? "opacity-100" : "-translate-y-1.5 opacity-0 duration-120",
            )}
          >
            {idleLabel}
          </span>
          {(["sending", "sent", "failed"] as const).map((key) => (
            <span
              key={key}
              aria-hidden="true"
              className={cn(
                "col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-settle",
                phase === key
                  ? key === "sent"
                    ? "opacity-100 delay-200"
                    : "opacity-100 delay-75"
                  : "translate-y-1.5 opacity-0 duration-120",
              )}
            >
              {text[key]}
            </span>
          ))}
        </span>
      </AriaButton>
      <span role="status" className="sr-only">
        {announce}
      </span>
    </>
  );
}
