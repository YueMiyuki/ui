"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { DiamondDust } from "@/components/miyuki-ui/diamond-dust";
import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/site/copy-button";
import { sectionHref } from "@/site/docs/urls";
import { IdleStyle, useIdleOffscreen } from "@/site/home/idle";
import { Reflection } from "@/site/home/reflection";
import { useDictionary, useLocale } from "@/site/i18n/context";
import { format } from "@/site/i18n/format";
import { inkLinkClass } from "@/site/link-button";

const headline = "font-pixel text-[clamp(2.2rem,6.2vw,5.5rem)] leading-[1.04]";
const settle = [0.22, 1, 0.36, 1] as const;

export function Hero({ total, command }: { total: number; command: string }) {
  const still = useReducedMotion() ?? false;
  const ref = useIdleOffscreen<HTMLElement>();
  const locale = useLocale();
  const t = useDictionary();

  return (
    <section
      ref={ref}
      className="relative isolate overflow-clip"
      style={{ "--water": "clamp(190px, 31svh, 310px)" } as CSSProperties}
    >
      <IdleStyle />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 bottom-[var(--water)] -z-10 bg-[linear-gradient(to_bottom,transparent_30%,color-mix(in_oklab,var(--brand-soft)_55%,transparent))] dark:bg-[linear-gradient(to_bottom,transparent_30%,color-mix(in_oklab,var(--brand-soft)_45%,transparent))]"
      >
        <DiamondDust direction="down" density={52} speed={0.5} minSize={0.6} maxSize={2.4} className="size-full" />
      </div>

      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[var(--water)]">
        <LayeredWaves level={0.04} amplitude={9} waveCount={5} blur={5} speed="slow" className="size-full" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-linear-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto grid min-h-[min(calc(100svh-3.5rem),56rem)] max-w-[1240px] grid-rows-[1fr_var(--water)] px-6 lg:px-10">
        <div className="flex flex-col-reverse justify-start gap-10 pt-16 sm:pt-24 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
          <h1 className={cn(headline, "-mb-[0.14em] shrink-0 text-foreground")}>
            <motion.span
              className="block"
              initial={still ? false : { opacity: 0, filter: "blur(14px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, ease: settle }}
            >
              {t.pixel.still}
            </motion.span>
            <span className="block overflow-clip pt-[0.08em]">
              <motion.span
                className="block"
                initial={still ? false : { y: "108%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.45 }}
              >
                {t.pixel.moves}
              </motion.span>
            </span>
          </h1>

          <motion.div
            className="max-w-[25rem] lg:pb-4"
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: settle, delay: 0.95 }}
          >
            <p className="text-[1.0625rem] leading-relaxed text-muted-foreground zh:text-balance">
              {format(t.hero.body, { total: <span className="text-foreground tabular-nums">{total}</span> })}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={sectionHref("components", locale)} className={inkLinkClass()}>
                {t.hero.browse}
              </Link>
              <div className="flex h-11 min-w-0 items-center gap-1 rounded-lg border border-border-strong bg-card/90 pr-1 pl-3.5 shadow-xs">
                <code className="truncate font-mono text-[13px] text-foreground">{command}</code>
                <CopyButton text={command} label={t.hero.copyCommand} />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative">
          <motion.div
            aria-hidden="true"
            className={cn(
              headline,
              "pointer-events-none absolute top-0 left-0 hidden -translate-y-[0.06em] -scale-y-100 text-foreground/25 select-none sm:block dark:text-foreground/30",
            )}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 1.1 }}
          >
            <Reflection strips={10}>{t.pixel.moves}</Reflection>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
