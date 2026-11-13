"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PreviewLayout } from "@/registry/schema";
import { DemoSurface } from "@/site/demo-surface";
import { IdleStyle } from "@/site/home/idle";

const surface =
  "size-full min-w-0 transition-opacity duration-300 ease-out empty:opacity-0 motion-reduce:transition-none";

const waiting: (() => void)[] = [];
let pumping = false;

function pump() {
  const run = () => {
    const next = waiting.shift();
    if (next) startTransition(next);
    if (waiting.length > 0) pump();
    else pumping = false;
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 400 });
  else window.setTimeout(run, 60);
}

function whenIdle(task: () => void) {
  waiting.push(task);
  if (pumping) return;
  pumping = true;
  pump();
}

export function LiveStage({
  slug,
  demo = "default",
  layout,
  height,
  scale = 1,
  className,
}: {
  slug: string;
  demo?: string;
  layout: PreviewLayout;
  height: number;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef(false);
  const [active, setActive] = useState(false);
  const [held, setHeld] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || live.current) return;
        live.current = true;
        whenIdle(() => {
          if (live.current) setActive(true);
        });
      },
      { rootMargin: "900px 0px" },
    );
    const far = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || !live.current) return;
        live.current = false;
        setHeld(el.offsetHeight);
        setActive(false);
      },
      { rootMargin: "3200px 0px" },
    );
    const seen = new IntersectionObserver(([entry]) => el.toggleAttribute("data-idle", !entry.isIntersecting), {
      rootMargin: "160px 0px",
    });
    near.observe(el);
    far.observe(el);
    seen.observe(el);
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      setHeld(0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      near.disconnect();
      far.disconnect();
      seen.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scaled = scale !== 1;
  const exact = scaled || layout === "fill";

  return (
    <div
      ref={ref}
      className={cn("relative isolate grid overflow-clip", className)}
      style={{ contain: "layout paint", ...(exact ? { height } : { minHeight: Math.max(height, held) }) }}
    >
      <IdleStyle />
      {active ? (
        scaled ? (
          <div
            className="absolute top-0 left-0 grid"
            style={{
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            <DemoSurface slug={slug} demo={demo} layout={layout} className={surface} />
          </div>
        ) : (
          <DemoSurface slug={slug} demo={demo} layout={layout} className={surface} />
        )
      ) : null}
    </div>
  );
}
