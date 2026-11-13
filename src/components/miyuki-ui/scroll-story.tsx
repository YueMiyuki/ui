"use client";

import { type MotionValue, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ComponentProps, createRef, type ReactNode, type RefObject, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScrollStorySection {
  title: ReactNode;
  description: ReactNode;
  content: ReactNode;
}

export interface ScrollStoryProps extends Omit<ComponentProps<"div">, "children"> {
  sections: ScrollStorySection[];
  height?: string;
}

type Place = "only" | "first" | "middle" | "last";
type Curve = [number[], number[]];

const toProgress = (u: number) => (u + 0.5) / 2;
const curve = (input: number[], output: number[]): Curve => [input.map(toProgress), output];

const TEXT: Record<Place, Curve> = {
  only: [
    [0, 1],
    [1, 1],
  ],
  first: curve([0.8, 1.25], [1, 0.3]),
  middle: curve([-0.25, 0.2, 0.8, 1.25], [0.3, 1, 1, 0.3]),
  last: curve([-0.25, 0.2], [0.3, 1]),
};

function placeOf(index: number, count: number): Place {
  if (count === 1) return "only";
  if (index === 0) return "first";
  return index === count - 1 ? "last" : "middle";
}

export function ScrollStory({
  sections,
  height = "30rem",
  className,
  style,
  "aria-label": ariaLabel = "Sections",
  ...props
}: ScrollStoryProps) {
  const container = useRef<HTMLDivElement>(null);
  const count = sections.length;
  const targets = useMemo(() => Array.from({ length: count }, () => createRef<HTMLElement>()), [count]);
  const { scrollYProgress, scrollY } = useScroll({ container });
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollY, "change", () => {
    const box = container.current;
    if (!box) return;
    const middle = box.getBoundingClientRect().top + box.clientHeight / 2;
    let best = 0;
    let gap = Infinity;
    targets.forEach((target, i) => {
      const rect = target.current?.getBoundingClientRect();
      if (!rect) return;
      const d = Math.abs(rect.top + rect.height / 2 - middle);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    setActive((current) => (current === best ? current : best));
  });

  return (
    <div
      {...props}
      ref={container}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      style={{ height, ...style }}
      className={cn(
        "relative overflow-y-auto overscroll-contain bg-background text-foreground outline-none [container-type:size] [scrollbar-width:thin]",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      <div className="flex flex-col bg-inherit px-5 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @2xl:gap-x-14 @2xl:px-10">
        <div className="sticky top-0 z-10 bg-inherit pt-4 pb-3 @2xl:order-last @2xl:h-[100cqh] @2xl:self-start @2xl:py-8">
          <div className="relative h-[40cqh] @2xl:h-full">
            <div
              aria-hidden="true"
              className="absolute inset-y-3 -left-3 w-0.5 overflow-clip rounded-full bg-border @2xl:-left-5"
            >
              <motion.div className="size-full origin-top bg-brand" style={{ scaleY: scrollYProgress }} />
            </div>
            <div className="relative size-full overflow-clip rounded-2xl bg-muted shadow-sm">
              {sections.map((section, i) => (
                <Panel key={i} shown={i === active} reduced={reduced}>
                  {section.content}
                </Panel>
              ))}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-foreground/10 ring-inset"
              />
            </div>
          </div>
        </div>
        <div className="pt-[6cqh] pb-[22cqh] @2xl:pt-[22cqh] @2xl:pb-[26cqh]">
          {sections.map((section, i) => (
            <Section
              key={i}
              target={targets[i]}
              container={container}
              place={placeOf(i, sections.length)}
              section={section}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function useSectionProgress(target: RefObject<HTMLElement | null>, container: RefObject<HTMLDivElement | null>) {
  return useScroll({ container, target, offset: ["-50% center", "150% center"] }).scrollYProgress;
}

function useCurve(progress: MotionValue<number>, [input, output]: Curve) {
  return useTransform(progress, input, output);
}

function Section({
  target,
  container,
  place,
  section,
}: {
  target: RefObject<HTMLElement | null>;
  container: RefObject<HTMLDivElement | null>;
  place: Place;
  section: ScrollStorySection;
}) {
  const progress = useSectionProgress(target, container);
  const opacity = useCurve(progress, TEXT[place]);

  return (
    <motion.section
      ref={target}
      style={{ opacity }}
      className="flex min-h-[46cqh] flex-col justify-center py-6 @2xl:min-h-[58cqh]"
    >
      <h3 className="font-display text-2xl leading-tight font-semibold tracking-[-0.015em] text-balance">
        {section.title}
      </h3>
      <div className="mt-3 max-w-[38ch] text-base/7 text-muted-foreground">{section.description}</div>
    </motion.section>
  );
}

function Panel({ shown, reduced, children }: { shown: boolean; reduced: boolean; children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{
        opacity: shown ? 1 : 0,
        scale: shown || reduced ? 1 : 1.035,
        visibility: shown ? "visible" : "hidden",
      }}
      transition={{
        opacity: { duration: reduced ? 0.15 : 0.55, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] },
        visibility: { duration: 0, delay: shown ? 0 : reduced ? 0.15 : 0.55 },
      }}
      style={{ zIndex: shown ? 1 : 0 }}
    >
      {children}
    </motion.div>
  );
}
