"use client";

import {
  type AnimationPlaybackControls,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type CSSProperties, type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type PressEvent,
} from "react-aria-components";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export type ProgressButtonStatus = "idle" | "loading" | "success" | "error";

export interface ProgressButtonLabels {
  loading?: string;
  success?: string;
  error?: string;
}

export interface ProgressButtonProps extends Omit<AriaButtonProps, "children" | "onPress" | "onClick"> {
  onClick?: (event: PressEvent) => unknown;
  children?: ReactNode;
  labels?: ProgressButtonLabels;
  successDuration?: number;
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLButtonElement>;
}

const sizes = { sm: "h-8 px-3", md: "h-9 px-3.5", lg: "h-11 px-5" };

const P = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
const at = (deg: number): [number, number] => [
  12 + 7.5 * Math.cos((deg * Math.PI) / 180),
  12 + 7.5 * Math.sin((deg * Math.PI) / 180),
];
const arcPiece = (a0: number, a1: number) => {
  const k = (4 / 3) * Math.tan(((a1 - a0) * Math.PI) / 180 / 4) * 7.5;
  const [x0, y0] = at(a0);
  const [x1, y1] = at(a1);
  const t0 = (a0 * Math.PI) / 180;
  const t1 = (a1 * Math.PI) / 180;
  return `C${P(x0 - k * Math.sin(t0), y0 + k * Math.cos(t0))} ${P(x1 + k * Math.sin(t1), y1 - k * Math.cos(t1))} ${P(x1, y1)}`;
};
const line = (a: [number, number], b: [number, number]) =>
  `C${P(a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3)} ${P(a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3)} ${P(b[0], b[1])}`;

const ARC = `M${P(...at(150))}${arcPiece(150, 90)}${arcPiece(90, 30)}`;
const TICK: [number, number][] = [
  [6, 12.5],
  [10, 16.5],
  [18, 8],
];
const CHECK = `M${P(...TICK[0])}${line(TICK[0], TICK[1])}${line(TICK[1], TICK[2])}`;

const WAVE = (fill: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='6' viewBox='0 0 24 6'><path fill='${fill}' d='M0 3Q6 0.4 12 3T24 3V6H0Z'/></svg>`,
  )}")`;

const keyframes = `
@keyframes miyuki-progress-button-surf { to { transform: translateX(-24px); } }
`;

function Wave({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("absolute bottom-[calc(100%-1px)] left-0 h-1.5 w-[calc(100%+24px)] bg-brand", className)}
      style={{
        maskImage: WAVE("#000"),
        WebkitMaskImage: WAVE("#000"),
        maskSize: "24px 6px",
        WebkitMaskSize: "24px 6px",
        maskRepeat: "repeat-x",
        WebkitMaskRepeat: "repeat-x",
        ...style,
      }}
    />
  );
}

export function ProgressButton({
  onClick,
  children,
  labels,
  successDuration = 1600,
  size = "md",
  className,
  render,
  ref,
  ...props
}: ProgressButtonProps) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<ProgressButtonStatus>("idle");
  const [flash, setFlash] = useState(false);
  const [glyph, setGlyph] = useState<"arc" | "check">("arc");
  const node = useRef<HTMLButtonElement | null>(null);
  const run = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const motions = useRef<AnimationPlaybackControls[]>([]);

  const level = useMotionValue(0);
  const spin = useMotionValue(0);
  const y = useTransform(
    level,
    (l) => `calc(${((1 - l) * 100).toFixed(3)}% + ${((1 - Math.min(1, l)) * 8).toFixed(3)}px)`,
  );
  const turn = useRef<SVGGElement>(null);
  useMotionValueEvent(spin, "change", (v) => turn.current?.setAttribute("transform", `rotate(${v.toFixed(2)} 12 12)`));

  const text = {
    loading: labels?.loading ?? "Working",
    success: labels?.success ?? "Done",
    error: labels?.error ?? "Try again",
  };

  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const stopAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    motions.current.forEach((m) => m.stop());
    motions.current = [];
  }, []);

  useEffect(
    () => () => {
      run.current++;
      stopAll();
    },
    [stopAll],
  );

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const play = (m: AnimationPlaybackControls) => {
    motions.current.push(m);
    return m;
  };

  const start = () => {
    stopAll();
    setStatus("loading");
    setFlash(false);
    setGlyph("arc");
    spin.jump(0);
    play(animate(spin, 360, { duration: reduce ? 2.4 : 0.8, ease: "linear", repeat: Infinity }));
    if (reduce) {
      play(animate(level, 0.55, { duration: 0.12 }));
    } else {
      play(
        animate(level, [level.get(), 0.55, 0.84], { duration: 7, times: [0, 0.2, 1], ease: ["easeOut", "easeOut"] }),
      );
    }
  };

  const succeed = (id: number) => {
    stopAll();
    setStatus("success");
    if (reduce) {
      level.jump(1);
      spin.jump(0);
      setGlyph("check");
    } else {
      play(animate(level, 1, { type: "spring", stiffness: 260, damping: 22 }));
      const from = spin.get() % 360;
      spin.jump(from);
      const target = from > 300 ? 720 : 360;
      play(animate(spin, target, { type: "spring", stiffness: 170, damping: 22, velocity: 450 }));
      const unsub = spin.on("change", (v) => {
        if (target - v < 70) {
          setGlyph("check");
          unsub();
        }
      });
      later(600, () => {
        unsub();
        setGlyph("check");
      });
    }
    later(Math.max(400, successDuration), () => {
      if (run.current !== id) return;
      play(animate(level, 0, { duration: reduce ? 0.12 : 0.5, ease: [0.45, 0.05, 0.25, 1] }));
      setStatus("idle");
      later(reduce ? 120 : 260, () => {
        if (run.current === id) setGlyph("arc");
      });
    });
  };

  const fail = (id: number) => {
    stopAll();
    setStatus("error");
    setFlash(true);
    setGlyph("arc");
    play(animate(level, 0, { duration: reduce ? 0.08 : 0.2, ease: "easeIn" }));
    if (!reduce && node.current) {
      play(animate(node.current, { x: [0, -5, 5, -3.5, 3, -1.5, 0] }, { duration: 0.42, ease: "easeOut" }));
    }
    later(1000, () => {
      if (run.current === id) setFlash(false);
    });
  };

  const busy = status === "loading" || status === "success";

  const press = (event: PressEvent) => {
    if (busy) return;
    const result = onClick?.(event);
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    const id = ++run.current;
    start();
    (result as Promise<unknown>).then(
      () => {
        if (run.current === id) succeed(id);
      },
      () => {
        if (run.current === id) fail(id);
      },
    );
  };

  const message =
    status === "loading" ? text.loading : status === "success" ? text.success : status === "error" ? text.error : "";

  return (
    <>
      <AriaButton
        {...props}
        ref={setRef}
        onPress={press}
        data-status={status}
        render={(domProps, renderProps) => {
          const withBusy = { ...domProps, "aria-busy": busy || undefined };
          return render ? render(withBusy, renderProps) : <button {...withBusy} />;
        }}
        className={composeRenderProps(className, (cls) =>
          cn(
            "group/stateful relative isolate inline-flex shrink-0 cursor-default items-center justify-center overflow-hidden rounded-lg text-sm font-medium whitespace-nowrap select-none outline-none",
            "bg-primary text-primary-foreground shadow-xs",
            "transition-[scale,background-color,box-shadow,color] duration-150 ease-settle",
            "data-[hovered]:bg-primary/90 data-[pressed]:scale-[0.98]",
            "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0",
            busy && "cursor-wait data-[pressed]:scale-100",
            flash &&
              "bg-destructive text-destructive-foreground duration-200 data-[hovered]:bg-destructive data-[focus-visible]:ring-destructive/40",
            !flash && status === "error" && "duration-700",
            sizes[size],
            cls,
          ),
        )}
      >
        <style href="miyuki-progress-button" precedence="miyuki">
          {keyframes}
        </style>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
        >
          <motion.div className="absolute inset-0" style={{ y }}>
            <div className="absolute inset-0 bg-brand" />
            <Wave
              className="opacity-55 motion-safe:animate-[miyuki-progress-button-surf_2.3s_linear_infinite_reverse]"
              style={{ translate: "-9px -2px" }}
            />
            <Wave className="motion-safe:animate-[miyuki-progress-button-surf_1.5s_linear_infinite]" />
          </motion.div>
        </span>
        <span className="grid place-items-center">
          <span
            aria-hidden={status === "error" || undefined}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2 transition-[opacity,translate] duration-200 ease-settle [&_svg]:size-4",
              status === "idle" ? "opacity-100" : "translate-y-1 opacity-0 duration-120",
            )}
          >
            {children}
          </span>
          <span
            aria-hidden={status !== "error"}
            className={cn(
              "col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-settle",
              status === "error" ? "opacity-100" : "translate-y-1 opacity-0 duration-120",
            )}
          >
            {text.error}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "col-start-1 row-start-1 size-[18px] transition-opacity duration-200",
              busy ? "opacity-100" : "opacity-0 duration-150",
            )}
          >
            <circle
              cx="12"
              cy="12"
              r="7.5"
              strokeOpacity={0.28}
              className={cn("transition-opacity duration-200", glyph === "arc" ? "opacity-100" : "opacity-0")}
            />
            <g ref={turn}>
              <MorphPath d={glyph === "arc" ? ARC : CHECK} transition={{ stiffness: 380, damping: 26 }} />
            </g>
          </svg>
        </span>
      </AriaButton>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
