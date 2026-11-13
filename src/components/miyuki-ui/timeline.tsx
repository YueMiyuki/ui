"use client";

import { type MotionValue, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: ReactNode;
  content: ReactNode;
}

export interface TimelineProps extends Omit<ComponentProps<"div">, "children"> {
  items: TimelineItem[];
  heading?: ReactNode;
}

export function Timeline({ items, heading, className, ...props }: TimelineProps) {
  const list = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 55%", "end 55%"] });
  const { scrollYProgress: page } = useScroll();
  const line = useTransform([scrollYProgress, page], ([own, whole]: number[]) => (whole > 0.995 ? 1 : own));

  return (
    <div {...props} className={cn("@container [--miyuki-timeline-top:5rem]", className)}>
      {heading ? <div className="mb-14 @3xl:mb-20">{heading}</div> : null}
      <div ref={list} className="relative">
        <div
          aria-hidden="true"
          className="absolute top-3 bottom-0 left-3 w-0.5 -translate-x-1/2 overflow-clip rounded-full bg-border"
        >
          <motion.div
            className="size-full origin-top bg-linear-to-b from-brand/35 via-brand/80 to-brand"
            style={{ scaleY: reduced ? 1 : line }}
          />
        </div>
        <ol className="relative">
          {items.map((item, i) => (
            <Entry key={i} item={item} reduced={reduced} last={i === items.length - 1} page={page} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function Entry({
  item,
  reduced,
  last,
  page,
}: {
  item: TimelineItem;
  reduced: boolean;
  last: boolean;
  page: MotionValue<number>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 55%", "start 50%"] });
  const reached = useTransform<number, number>([scrollYProgress, page], ([own, whole]) =>
    own > 0.5 || whole > 0.995 ? 1 : 0,
  );
  const fill = useSpring(reached, { stiffness: 500, damping: 30 });

  return (
    <li
      ref={ref}
      className={cn(
        "relative flex flex-col gap-5 @3xl:grid @3xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @3xl:gap-12",
        last ? "pb-4" : "pb-20 @3xl:pb-28",
      )}
    >
      <div className="sticky top-(--miyuki-timeline-top) z-10 -mx-1 flex items-start gap-4 bg-background/90 px-1 py-1 backdrop-blur-sm @3xl:mx-0 @3xl:self-start @3xl:bg-transparent @3xl:px-0 @3xl:backdrop-blur-none">
        <span className="relative mt-1 size-6 shrink-0 overflow-clip rounded-full bg-background ring-2 ring-border-strong ring-inset">
          <motion.span className="absolute inset-0 origin-bottom bg-brand" style={{ scaleY: reduced ? 1 : fill }} />
        </span>
        <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em] text-balance @3xl:text-2xl">
          {item.title}
        </h3>
      </div>
      <div className="min-w-0 pl-10 @3xl:pl-0">{item.content}</div>
    </li>
  );
}
