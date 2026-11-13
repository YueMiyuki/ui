"use client";

import {
  cubicBezier,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface OpeningLaptopProps extends Omit<ComponentProps<"div">, "title"> {
  src: string;
  alt?: string;
  title?: ReactNode;
  badge?: ReactNode;
}

const u = (n: number) => `calc(var(--miyuki-opening-laptop-u) * ${n})`;

const SCREEN = { left: 2.4, top: 2.8, width: 95.2, height: 57.4 };
const LID_HEIGHT = 64;
const DECK_DEPTH = 66;
const DECK_TILT = 62;
const OPEN_AT = 0.42;
const MAX_SCALE = 1.6;

const ROWS: { height: number; keys: number[] }[] = [
  { height: 0.6, keys: Array(14).fill(1) },
  { height: 1, keys: [...Array(13).fill(1), 1.55] },
  { height: 1, keys: [1.55, ...Array(13).fill(1)] },
  { height: 1, keys: [1.85, ...Array(11).fill(1), 1.85] },
  { height: 1, keys: [2.4, ...Array(10).fill(1), 2.4] },
  { height: 1, keys: [1, 1, 1, 1.3, 5.4, 1.3, 1, 1, 1] },
];

const openEase = cubicBezier(0.4, 0, 0.2, 1);
const liftEase = cubicBezier(0.45, 0.05, 0.25, 1);

export function OpeningLaptop({ src, alt = "", title, badge, className, style, ...props }: OpeningLaptopProps) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const maxScale = useMotionValue(MAX_SCALE);
  const travel = useMotionValue(0);
  const { scrollYProgress: progress } = useScroll({ target: root, offset: ["start start", "end end"] });

  const lid = useTransform(progress, [0.03, OPEN_AT], [-116, 0], { ease: openEase });
  const glow = useTransform(progress, [0.08, OPEN_AT - 0.04], [0.35, 1]);
  const lifted = useTransform(progress, (p) => (p >= OPEN_AT ? 1 : 0));
  const screenGlow = useTransform(() => glow.get() * (1 - 0.88 * lifted.get()));
  const phase = useTransform(progress, [OPEN_AT + 0.02, 0.9], [0, 1], { ease: liftEase });
  const scale = useTransform(() => 1 + (maxScale.get() - 1) * phase.get());
  const y = useTransform(() => travel.get() * phase.get());
  const shadow = useTransform(progress, [OPEN_AT, OPEN_AT + 0.16], [0, 1]);
  const keys = useTransform(progress, [OPEN_AT + 0.04, 0.8], [1, 0.08]);
  const titleOpacity = useTransform(progress, [0.01, 0.16], [1, 0]);
  const titleY = useTransform(progress, [0, 0.22], [0, -40]);

  useEffect(() => {
    const stageEl = stage.current;
    const sceneEl = scene.current;
    if (!stageEl || !sceneEl) return;
    const measure = () => {
      const unit = sceneEl.offsetWidth / 100;
      const stageW = stageEl.clientWidth;
      const stageH = stageEl.clientHeight;
      const width = SCREEN.width * unit;
      const height = SCREEN.height * unit;
      const fit = Math.min(MAX_SCALE, (stageW - 24) / width, (stageH - 24) / height);
      maxScale.set(Math.max(1, fit));
      const centre = sceneEl.offsetTop + (SCREEN.top + SCREEN.height / 2) * unit;
      const half = (height * Math.max(1, fit)) / 2;
      const target = Math.min(stageH * 0.6, stageH - 12 - half);
      travel.set(Math.max(0, target - centre));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(sceneEl);
    return () => observer.disconnect();
  }, [maxScale, travel]);

  const still = reduced;

  return (
    <div
      {...props}
      ref={root}
      className={cn(
        "relative text-foreground",
        "[--miyuki-opening-laptop-shell:color-mix(in_oklab,var(--secondary),var(--border-strong)_38%)]",
        "[--miyuki-opening-laptop-shade:color-mix(in_oklab,var(--border-strong),var(--muted-foreground)_18%)]",
        "[--miyuki-opening-laptop-key:var(--card)]",
        "[--miyuki-opening-laptop-key-edge:color-mix(in_oklab,var(--border-strong),var(--muted-foreground)_30%)]",
        "[--miyuki-opening-laptop-bezel:var(--primary)]",
        "dark:[--miyuki-opening-laptop-shell:color-mix(in_oklab,var(--accent),var(--border-strong)_55%)]",
        "dark:[--miyuki-opening-laptop-shade:color-mix(in_oklab,var(--card),var(--border)_40%)]",
        "dark:[--miyuki-opening-laptop-key:color-mix(in_oklab,var(--background),#000_18%)]",
        "dark:[--miyuki-opening-laptop-key-edge:color-mix(in_oklab,var(--background),#000_55%)]",
        "dark:[--miyuki-opening-laptop-bezel:color-mix(in_oklab,var(--background),#000_25%)]",
        className,
      )}
      style={{ height: still ? undefined : "250svh", ...style }}
    >
      <div
        ref={stage}
        className={cn(
          "flex w-full flex-col items-center justify-center overflow-clip",
          still ? "gap-10 py-16" : "sticky top-0 h-svh min-h-[30rem]",
        )}
        style={{ "--miyuki-opening-laptop-u": "calc(min(40rem, 86vw, 68svh) / 100)" } as CSSProperties}
      >
        {still && title ? <div className="w-[min(92vw,46rem)] text-center">{title}</div> : null}
        <div ref={scene} className="relative shrink-0" style={{ width: u(100), height: u(104) }}>
          {!still && title ? (
            <motion.div
              className="absolute left-1/2 w-[min(92vw,46rem)] -translate-x-1/2 text-center"
              style={{ bottom: u(58), opacity: titleOpacity, y: titleY }}
            >
              {title}
            </motion.div>
          ) : null}

          <div
            aria-hidden="true"
            className="absolute rounded-[50%] bg-[oklch(0.42_0.09_250/0.22)] blur-xl dark:bg-black/55"
            style={{ left: u(-4), right: u(-4), top: u(96), height: u(9) }}
          />

          <div className="absolute inset-0" style={{ perspective: u(560), perspectiveOrigin: `50% ${u(38)}` }}>
            <div className="absolute inset-0 [transform-style:preserve-3d]">
              <Deck keys={still ? 0.08 : keys} badge={badge} />
              <motion.div
                className="absolute top-0 left-0 [transform-style:preserve-3d]"
                style={{
                  width: u(100),
                  height: u(LID_HEIGHT),
                  transformOrigin: "50% 100%",
                  rotateX: still ? 0 : lid,
                }}
              >
                <div
                  className="absolute inset-0 overflow-clip [backface-visibility:hidden]"
                  style={{
                    borderRadius: `${u(3.2)} ${u(3.2)} ${u(1)} ${u(1)}`,
                    background: "var(--miyuki-opening-laptop-bezel)",
                    boxShadow: `inset 0 0 0 ${u(0.45)} var(--miyuki-opening-laptop-shell)`,
                  }}
                >
                  <div
                    className="absolute rounded-full bg-[oklch(0.32_0.03_250)]"
                    style={{ left: u(49.6), top: u(1.1), width: u(0.8), height: u(0.8) }}
                  />
                  <div
                    className="absolute overflow-clip bg-[oklch(0.15_0.03_252)]"
                    style={{
                      left: u(SCREEN.left),
                      top: u(SCREEN.top),
                      width: u(SCREEN.width),
                      height: u(SCREEN.height),
                      borderRadius: u(0.8),
                    }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_45%,color-mix(in_oklab,var(--brand)_28%,transparent),transparent)]" />
                    <motion.img
                      src={src}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 size-full object-cover"
                      style={{ opacity: still ? 0.12 : screenGlow }}
                    />
                  </div>
                </div>
                <div
                  className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{
                    borderRadius: `${u(3.2)} ${u(3.2)} ${u(1)} ${u(1)}`,
                    background:
                      "linear-gradient(to bottom, var(--miyuki-opening-laptop-shell), color-mix(in oklab, var(--miyuki-opening-laptop-shell), var(--miyuki-opening-laptop-shade) 45%))",
                    boxShadow: `inset 0 0 0 ${u(0.3)} color-mix(in oklab, var(--miyuki-opening-laptop-shade) 60%, transparent)`,
                  }}
                />
              </motion.div>
            </div>
          </div>

          <motion.div
            className="absolute"
            style={{
              left: u(SCREEN.left),
              top: u(SCREEN.top),
              width: u(SCREEN.width),
              height: u(SCREEN.height),
              opacity: still ? 1 : lifted,
              scale: still ? 1.3 : scale,
              y: still ? u(30) : y,
            }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] shadow-2xl"
              style={{ opacity: still ? 1 : shadow, borderRadius: u(0.8) }}
            />
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="relative size-full object-cover"
              style={{ borderRadius: u(0.8) }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Deck({ keys, badge }: { keys: number | MotionValue<number>; badge?: ReactNode }) {
  return (
    <div
      className="absolute left-0 [transform-style:preserve-3d]"
      style={{
        top: u(LID_HEIGHT),
        width: u(100),
        height: u(DECK_DEPTH),
        transformOrigin: "50% 0",
        transform: `rotateX(${DECK_TILT}deg)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          borderRadius: `${u(1)} ${u(1)} ${u(3)} ${u(3)}`,
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--miyuki-opening-laptop-shell), var(--miyuki-opening-laptop-shade) 30%), var(--miyuki-opening-laptop-shell) 30%)",
        }}
      />
      <div
        className="absolute [transform:translateZ(0.5px)]"
        style={{
          left: u(11),
          width: u(78),
          top: 0,
          height: u(2.6),
          borderRadius: `0 0 ${u(1.2)} ${u(1.2)}`,
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--miyuki-opening-laptop-bezel), var(--miyuki-opening-laptop-shade) 35%), var(--miyuki-opening-laptop-shade))",
        }}
      />
      <motion.div
        className="absolute flex flex-col"
        style={{ left: u(7.5), width: u(85), top: u(6.5), height: u(31), gap: u(0.9), opacity: keys }}
      >
        {ROWS.map((row, r) => (
          <div key={r} className="flex min-h-0" style={{ flexGrow: row.height, gap: u(0.9) }}>
            {row.keys.map((w, k) => (
              <div
                key={k}
                className="min-w-0 bg-(--miyuki-opening-laptop-key)"
                style={{
                  flexGrow: w,
                  flexBasis: 0,
                  borderRadius: u(0.7),
                  boxShadow: `0 ${u(0.35)} 0 var(--miyuki-opening-laptop-key-edge)`,
                }}
              />
            ))}
          </div>
        ))}
      </motion.div>
      <div
        className="absolute"
        style={{
          left: u(30),
          width: u(40),
          top: u(41.5),
          height: u(20),
          borderRadius: u(1.6),
          background: "color-mix(in oklab, var(--miyuki-opening-laptop-shell), var(--miyuki-opening-laptop-shade) 22%)",
          boxShadow: `inset 0 0 0 ${u(0.2)} color-mix(in oklab, var(--miyuki-opening-laptop-shade) 70%, transparent)`,
        }}
      />
      {badge ? (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
          style={{ left: u(13), top: u(52) }}
        >
          {badge}
        </div>
      ) : null}
      <div
        className="absolute left-0 w-full [transform:rotateX(-90deg)]"
        style={{
          top: "100%",
          height: u(2),
          transformOrigin: "50% 0",
          borderRadius: `0 0 ${u(3)} ${u(3)}`,
          background:
            "linear-gradient(to bottom, var(--miyuki-opening-laptop-shade), color-mix(in oklab, var(--miyuki-opening-laptop-shade), #000 12%))",
        }}
      />
    </div>
  );
}
