"use client";

import { type ComponentProps, type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { LayeredWaves } from "@/components/miyuki-ui/layered-waves";
import { WaveringText } from "@/components/miyuki-ui/wavering-text";
import { cn } from "@/lib/utils";

export interface FooterWaterlineLink {
  label: string;
  href: string;
}

export interface FooterWaterlineProps extends ComponentProps<"footer"> {
  word: string;
  links?: FooterWaterlineLink[];
  children?: ReactNode;
  waterHeight?: number | string;
  maxSize?: number;
}

const FS = "--miyuki-footer-waterline-size";
const DROP = "--miyuki-footer-waterline-drop";
const MASK = `linear-gradient(to top, #000 var(${DROP}), rgb(0 0 0 / 0.45) calc(var(${DROP}) + 0.3em), transparent calc(var(${DROP}) + 0.8em))`;

export function FooterWaterline({
  word,
  links = [],
  children,
  waterHeight,
  maxSize = 320,
  className,
  style,
  ...props
}: FooterWaterlineProps) {
  const text = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ width: number; drop: number } | null>(null);

  useLayoutEffect(() => {
    const el = text.current;
    const p = probe.current;
    if (!el || !p) return;
    const measure = () => {
      const size = parseFloat(getComputedStyle(el).fontSize) || 1;
      const width = Math.round((el.offsetWidth / size) * 10000) / 10000;
      const line = el.parentElement as HTMLElement;
      let top = 0;
      let node: HTMLElement | null = p;
      while (node && node !== line) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const drop = node === line ? Math.round(((line.offsetHeight - top) / size) * 10000) / 10000 : 0.14;
      setFit((prev) => (prev && prev.width === width && prev.drop === drop ? prev : { width, drop }));
    };
    measure();
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
    };
  }, [word]);

  const em = fit?.width ?? Math.max(1, Array.from(word).length * 0.56);
  const water =
    waterHeight == null
      ? `max(5.5rem, calc(var(${FS}) * 0.62))`
      : typeof waterHeight === "number"
        ? `${waterHeight}px`
        : waterHeight;

  return (
    <footer
      {...props}
      className={cn("@container relative isolate overflow-clip text-foreground", className)}
      style={
        {
          [DROP]: `${fit?.drop ?? 0.14}em`,
          ...style,
        } as CSSProperties
      }
    >
      <div
        className="[--miyuki-footer-waterline-pad:1.5rem] @3xl:[--miyuki-footer-waterline-pad:2.5rem]"
        style={
          {
            [FS]: `min(${maxSize}px, calc((min(100cqi, 72rem) - 2 * var(--miyuki-footer-waterline-pad)) / ${em}))`,
          } as CSSProperties
        }
      >
        <div className="mx-auto max-w-6xl px-(--miyuki-footer-waterline-pad) pt-16 @3xl:pt-20">
          <div
            className="relative font-display leading-none font-semibold tracking-[-0.045em] whitespace-nowrap"
            style={{
              fontSize: `var(${FS})`,
              marginBottom: `calc(var(${DROP}) * -1)`,
            }}
          >
            <p className="relative">
              <span ref={text} className="inline-block">
                {word}
              </span>
              <span ref={probe} aria-hidden="true" className="inline-block h-0 w-0 align-baseline" />
            </p>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 text-[color-mix(in_oklab,var(--foreground)_72%,var(--brand))] opacity-30 select-none dark:opacity-[0.34]"
              style={{
                transform: "scaleY(-1)",
                transformOrigin: `50% calc(100% - var(${DROP}))`,
                clipPath: `inset(0 0 var(${DROP}) 0)`,
                maskImage: MASK,
                WebkitMaskImage: MASK,
              }}
            >
              <div
                className="h-full animate-[miyuki-footer-waterline-swell_9s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
                style={{ transformOrigin: `50% calc(100% - var(${DROP}))` }}
              >
                <WaveringText mode="ripple" scale={12} baseFrequency={0.008} numOctaves={1} className="inline-block">
                  {word}
                </WaveringText>
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="pointer-events-none relative" style={{ height: water }}>
          <div className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_25%,transparent)]">
            <LayeredWaves level={0.05} amplitude={10} waveCount={4} blur={6} speed={0.55} className="size-full" />
          </div>
          <span className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-foreground/15 to-transparent dark:via-foreground/20" />
        </div>

        {links.length > 0 || children ? (
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-(--miyuki-footer-waterline-pad) pt-2 pb-10 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-10">
            {links.length > 0 ? (
              <nav aria-label="Footer">
                <ul className="-mx-2 flex flex-wrap gap-x-1 gap-y-1">
                  {links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="inline-flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {children ? (
              <div className="max-w-md text-xs/5 text-pretty text-muted-foreground @2xl:text-right">{children}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      <style href="miyuki-footer-waterline" precedence="miyuki">{`
@keyframes miyuki-footer-waterline-swell {
  0% { transform: scaleY(0.95) skewX(0.8deg); }
  100% { transform: scaleY(1.06) skewX(-0.8deg); }
}
`}</style>
    </footer>
  );
}
