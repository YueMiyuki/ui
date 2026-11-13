"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type ElementType, Fragment, type Ref, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface InkBleedTextProps extends Omit<ComponentProps<"span">, "children" | "ref"> {
  text: string;
  stagger?: number;
  duration?: number;
  startOnView?: boolean;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

interface Word {
  span: HTMLSpanElement;
  blur: SVGFEGaussianBlurElement;
  spread: SVGFEDisplacementMapElement;
  edge: SVGFEFuncAElement;
  pool: SVGFEFuncAElement;
  noise: SVGFETurbulenceElement;
  rim: SVGFEMorphologyElement;
  done: boolean;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function paint(word: Word, t: number, em: number) {
  const wet = (1 - t) ** 1.8;
  const sharp = 7 - 4 * smooth(0.75, 1, wet);
  const centre = 0.5 - 0.3 * wet;
  const slope = 1 - wet + wet * sharp;
  const intercept = wet * (0.5 - sharp * centre);
  const soak = smooth(0.35, 0.68, t) * (1 - smooth(0.8, 1, t));
  word.span.style.opacity = String(smooth(0, 0.34, t));
  word.blur.setAttribute("stdDeviation", (em * 0.16 * wet).toFixed(2));
  word.spread.setAttribute("scale", (em * 0.34 * wet ** 0.85).toFixed(2));
  word.edge.setAttribute("slope", slope.toFixed(3));
  word.edge.setAttribute("intercept", intercept.toFixed(3));
  word.pool.setAttribute("slope", (1 - 0.3 * soak).toFixed(3));
}

export function InkBleedText({
  text,
  stagger = 0.12,
  duration = 1.1,
  startOnView = true,
  as: Tag = "span",
  className,
  ref,
  ...props
}: InkBleedTextProps) {
  const own = useRef<HTMLElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const reduce = useReducedMotion() === true;
  const seen = useInView(own, { once: true, margin: "0px 0px -10% 0px" });
  const go = !startOnView || seen;
  const words = text.split(/\s+/).filter(Boolean);
  const key = words.join(" ");

  useEffect(() => {
    const root = own.current;
    if (!root || !go) return;
    const spans = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-ink-word]"));
    if (reduce) {
      const fades = spans.map((span) => {
        span.style.filter = "none";
        return span.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out", fill: "forwards" });
      });
      return () => fades.forEach((f) => f.cancel());
    }
    const em = parseFloat(getComputedStyle(root).fontSize) || 16;
    const list: Word[] = spans.map((span, i) => {
      const f = root.querySelector<SVGFilterElement>(`#${uid}-${i}`)!;
      const funcs = f.querySelectorAll<SVGFEFuncAElement>("feFuncA");
      const word: Word = {
        span,
        blur: f.querySelector("feGaussianBlur")!,
        spread: f.querySelector("feDisplacementMap")!,
        noise: f.querySelector("feTurbulence")!,
        rim: f.querySelector("feMorphology")!,
        edge: funcs[0],
        pool: funcs[1],
        done: false,
      };
      word.noise.setAttribute("baseFrequency", (1 / (em * 0.32)).toFixed(4));
      word.rim.setAttribute("radius", Math.max(0.6, em * 0.028).toFixed(2));
      span.style.filter = `url(#${uid}-${i})`;
      paint(word, 0, em);
      return word;
    });
    const finish = (word: Word) => {
      word.done = true;
      word.span.style.opacity = "1";
      word.span.style.filter = "none";
    };
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const elapsed = (now - start) / 1000;
      let busy = false;
      list.forEach((word, i) => {
        if (word.done) return;
        const t = (elapsed - i * stagger) / Math.max(0.1, duration);
        if (t >= 1) return finish(word);
        busy = true;
        paint(word, Math.max(0, t), em);
      });
      if (busy) raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      list.forEach(finish);
    };
  }, [go, reduce, key, stagger, duration, uid]);

  return (
    <Tag {...props} ref={mergeRefs(own, ref)} className={cn("relative", className)}>
      <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
        <defs>
          {words.map((_, i) => (
            <filter
              key={i}
              id={`${uid}-${i}`}
              x="-30%"
              y="-40%"
              width="160%"
              height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={3} seed={i * 7 + 3} result="noise" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
              <feDisplacementMap
                in="blur"
                in2="noise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
                result="spread"
              />
              <feComponentTransfer in="spread" result="shape">
                <feFuncA type="linear" slope="1" intercept="0" />
              </feComponentTransfer>
              <feMorphology in="shape" operator="erode" radius="1" result="inner" />
              <feComposite in="shape" in2="inner" operator="out" result="rim" />
              <feComponentTransfer in="inner" result="pool">
                <feFuncA type="linear" slope="1" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="pool" />
                <feMergeNode in="rim" />
              </feMerge>
            </filter>
          ))}
        </defs>
      </svg>
      {words.map((word, i) => (
        <Fragment key={`${i}:${word}`}>
          {i > 0 ? " " : null}
          <span
            data-ink-word=""
            className="-mx-[0.3em] -my-[0.2em] inline-block px-[0.3em] py-[0.2em]"
            style={{ opacity: 0 }}
          >
            {word}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
