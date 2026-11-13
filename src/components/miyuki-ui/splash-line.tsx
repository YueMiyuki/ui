"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { createRng, type Rng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SplashLineProps extends ComponentProps<"div"> {
  count?: number;
  color?: string;
  splash?: boolean;
}

const SURFACE = "14%";
const DROPLETS = 12;

interface Drop {
  x: number;
  length: number;
  at: number;
}

function buildDrops(count: number): Drop[] {
  const rng = createRng(`splash-line:${count}`);
  const n = Math.max(0, Math.round(count));
  return Array.from({ length: n }, (_, i) => ({
    x: ((i + rng.range(0.15, 0.85)) / n) * 92 + 4,
    length: rng.range(40, 120),
    at: rng.range(18, 92),
  }));
}

function dropletFrames(rng: Rng, index: number, total: number) {
  const spread = (index / Math.max(1, total - 1)) * 2 - 1;
  const angle = (spread * 68 + rng.range(-9, 9)) * (Math.PI / 180);
  const power = rng.range(0.65, 1.15);
  const rise = 4 + 30 * power * Math.cos(angle) ** 2;
  const reach = 46 * power * Math.sin(angle);
  const size = rng.range(0.75, 1.2) * (1 - Math.abs(spread) * 0.3);
  const steps = 10;
  const frames: Keyframe[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = reach * (1 - (1 - t) ** 1.7);
    const y = -4 * rise * t * (1 - t) - 1;
    frames.push({
      transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(size * (1 - t * 0.35)).toFixed(3)})`,
      opacity: t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45),
    });
  }
  return { frames, duration: rng.range(460, 720) };
}

export function SplashLine({
  count = 7,
  color = "var(--brand)",
  splash = true,
  className,
  style,
  children,
  ...props
}: SplashLineProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const drops = buildDrops(count);

  useEffect(() => {
    const field = fieldRef.current;
    if (reduce || !field || typeof field.animate !== "function") return;
    const streaks = Array.from(field.querySelectorAll<HTMLElement>("[data-streak]"));
    const splashes = Array.from(field.querySelectorAll<HTMLElement>("[data-splash]"));
    const rng = createRng(`splash-line:run:${streaks.length}`);
    const running = new Set<Animation>();
    let stopped = false;

    const play = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = el.animate(frames, options);
      running.add(animation);
      animation.finished.then(
        () => running.delete(animation),
        () => running.delete(animation),
      );
      return animation;
    };

    const fall = (index: number, first: boolean) => {
      if (stopped) return;
      const streak = streaks[index];
      const burst = splashes[index];
      const height = streak.parentElement?.clientHeight ?? 0;
      if (height <= 0) {
        window.setTimeout(() => fall(index, first), 400);
        return;
      }
      const length = first ? drops[index].length : rng.range(40, 120);
      const speed = rng.range(190, 300) * (0.85 + length / 400);
      const distance = height + length;
      const duration = (distance / speed) * 1000;
      const delay = first ? -(((drops[index].at / 100) * height) / speed) * 1000 : rng.range(150, 1300);
      if (!first) {
        const x = Math.min(96, Math.max(4, drops[index].x + rng.range(-7, 7)));
        streak.style.left = `${x}%`;
        burst.style.left = `${x}%`;
      }
      streak.style.height = `${length}px`;
      const drop = play(streak, [{ transform: `translateY(${-length}px)` }, { transform: `translateY(${height}px)` }], {
        duration,
        delay,
        easing: "linear",
        fill: "backwards",
      });
      drop.onfinish = () => fall(index, false);

      if (!splash) return;
      const impact = delay + (height / speed) * 1000;
      if (impact < -200) return;
      const ripples = burst.querySelectorAll<HTMLElement>("[data-ripple]");
      ripples.forEach((ripple, r) => {
        play(
          ripple,
          [
            { transform: "scale(0.06, 0.15)", opacity: r === 0 ? 1 : 0.75 },
            { transform: r === 0 ? "scale(1)" : "scale(0.58)", opacity: 0 },
          ],
          { duration: r === 0 ? 1100 : 900, delay: impact + r * 150, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      });
      const droplets = burst.querySelectorAll<HTMLElement>("[data-droplet]");
      const live = rng.int(8, DROPLETS);
      droplets.forEach((droplet, d) => {
        if (d >= live) return;
        const { frames, duration: flight } = dropletFrames(rng, d, live);
        play(droplet, frames, { duration: flight, delay: impact + rng.range(0, 40), easing: "linear" });
      });
    };

    streaks.forEach((streak) => {
      streak.style.top = "0px";
      streak.style.transform = "translateY(-100%)";
    });
    streaks.forEach((_, i) => fall(i, true));

    return () => {
      stopped = true;
      running.forEach((animation) => animation.cancel());
      running.clear();
      streaks.forEach((streak, i) => {
        streak.style.left = `${drops[i].x}%`;
        streak.style.top = `${drops[i].at}%`;
        streak.style.height = `${drops[i].length}px`;
        splashes[i].style.left = `${drops[i].x}%`;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, splash, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-splash-line-head:var(--miyuki-splash-line-color)]",
        "dark:[--miyuki-splash-line-head:color-mix(in_oklab,var(--miyuki-splash-line-color)_45%,white)]",
        className,
      )}
      style={{ ...style, "--miyuki-splash-line-color": color } as CSSProperties}
      {...props}
    >
      <div ref={fieldRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--miyuki-splash-line-color)_7%,transparent),transparent)] dark:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--miyuki-splash-line-color)_11%,transparent),transparent)]"
          style={{ height: SURFACE }}
        />
        <div
          className="absolute inset-x-0 h-px translate-y-1/2 bg-[linear-gradient(to_right,transparent,color-mix(in_oklab,var(--miyuki-splash-line-color)_42%,transparent)_18%,color-mix(in_oklab,var(--miyuki-splash-line-color)_42%,transparent)_82%,transparent)] dark:bg-[linear-gradient(to_right,transparent,color-mix(in_oklab,var(--miyuki-splash-line-color)_55%,transparent)_18%,color-mix(in_oklab,var(--miyuki-splash-line-color)_55%,transparent)_82%,transparent)]"
          style={{ bottom: SURFACE }}
        />
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ bottom: SURFACE }}>
          {drops.map((drop, i) => (
            <span
              key={i}
              data-streak=""
              className="absolute w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--miyuki-splash-line-color)_70%,transparent)_78%,var(--miyuki-splash-line-head))] will-change-transform dark:drop-shadow-[0_0_3px_var(--miyuki-splash-line-color)]"
              style={{
                left: `${drop.x}%`,
                top: `${drop.at}%`,
                height: drop.length,
                transform: "translateY(-100%)",
              }}
            />
          ))}
        </div>
        {splash ? (
          <div className="absolute inset-x-0 h-0" style={{ bottom: SURFACE }}>
            {drops.map((drop, i) => (
              <div key={i} data-splash="" className="absolute top-0 size-0" style={{ left: `${drop.x}%` }}>
                {[0, 1].map((r) => (
                  <span
                    key={r}
                    data-ripple=""
                    className="absolute top-0 left-0 h-3.5 w-24 -translate-1/2 rounded-[50%] border-[1.5px] border-(--miyuki-splash-line-color) opacity-0"
                  />
                ))}
                {Array.from({ length: DROPLETS }, (_, d) => (
                  <span
                    key={d}
                    data-droplet=""
                    className="absolute top-0 left-0 size-[3.5px] -translate-1/2 rounded-full bg-(--miyuki-splash-line-color) opacity-0 dark:bg-(--miyuki-splash-line-head) dark:shadow-[0_0_5px_var(--miyuki-splash-line-color)]"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
