"use client";

import type { CSSProperties } from "react";
import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";
import { cn } from "@/lib/utils";
import { IdleStyle, useIdleOffscreen } from "@/site/home/idle";
import { Reflection } from "@/site/home/reflection";

const wordmark = "font-pixel text-[clamp(3.4rem,15.5vw,13.5rem)] leading-none";

export function Waterline() {
  const ref = useIdleOffscreen<HTMLElement>();
  return (
    <section
      ref={ref}
      aria-hidden="true"
      className="relative isolate overflow-clip pt-16"
      style={{ "--water": "clamp(150px, 21vw, 300px)" } as CSSProperties}
    >
      <IdleStyle />
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <p className={cn(wordmark, "-mb-[0.17em] text-foreground")}>miyuki-ui</p>
      </div>
      <div className="relative h-[var(--water)]">
        <div className="absolute inset-0 -z-10">
          <LayeredWaves level={0.05} amplitude={10} waveCount={5} blur={5} speed="slow" className="size-full" />
          <div className="absolute inset-x-0 bottom-0 h-[52%] bg-linear-to-b from-transparent to-background" />
        </div>
        <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
          <p
            className={cn(
              wordmark,
              "-translate-y-[0.1em] -scale-y-100 text-foreground/25 select-none dark:text-foreground/30",
            )}
          >
            <Reflection strips={14} depth={0.85}>
              miyuki-ui
            </Reflection>
          </p>
        </div>
      </div>
    </section>
  );
}
