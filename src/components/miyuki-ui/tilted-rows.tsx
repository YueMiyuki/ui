"use client";

import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TiltedRowsItem {
  title: string;
  src: string;
  href?: string;
}

export interface TiltedRowsProps extends Omit<ComponentProps<"div">, "children"> {
  items: TiltedRowsItem[];
  header?: ReactNode;
}

const SLIDE = 320;

export function TiltedRows({ items, header, className, ...props }: TiltedRowsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });

  const rotateX = useTransform(scrollYProgress, [0, 0.22], [32, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.22], [-12, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.22], [0.3, 1]);
  const y = useTransform(scrollYProgress, [0, 0.22], [-260, 0]);
  const forward = useTransform(scrollYProgress, [0, 1], [0, SLIDE]);
  const back = useTransform(scrollYProgress, [0, 1], [0, -SLIDE]);

  const rows = [items.slice(0, 5), items.slice(5, 10), items.slice(10, 15)].filter((row) => row.length);

  return (
    <div
      {...props}
      ref={root}
      className={cn("relative overflow-clip pb-[28svh] [--miyuki-tilted-rows-card:clamp(11rem,26vw,19rem)]", className)}
    >
      {header ? (
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-[14svh] pb-[24svh] sm:px-10">{header}</div>
      ) : null}
      <div className="[perspective:1100px]">
        <motion.div
          className="flex flex-col gap-4 will-change-transform sm:gap-6"
          style={reduced ? undefined : { rotateX, rotateZ, opacity, y, transformOrigin: "50% 0%" }}
        >
          {rows.map((row, r) => {
            const even = r % 2 === 0;
            const x = reduced ? (even ? SLIDE : -SLIDE) : even ? forward : back;
            return <Row key={r} items={row} x={x} shift={!even} />;
          })}
        </motion.div>
      </div>
    </div>
  );
}

function Row({ items, x, shift }: { items: TiltedRowsItem[]; x: MotionValue<number> | number; shift: boolean }) {
  return (
    <motion.ul
      className={cn("flex justify-center gap-4 sm:gap-6", shift && "pl-[calc(var(--miyuki-tilted-rows-card)+1.5rem)]")}
      style={{ x }}
    >
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className="group/card w-(--miyuki-tilted-rows-card) shrink-0">
          <Card item={item} />
        </li>
      ))}
    </motion.ul>
  );
}

function Card({ item }: { item: TiltedRowsItem }) {
  const Tag = item.href ? "a" : "figure";
  const Label = item.href ? "span" : "figcaption";
  return (
    <Tag
      {...(item.href ? { href: item.href } : { tabIndex: 0 })}
      className={cn(
        "relative block aspect-[4/3] overflow-clip rounded-2xl bg-muted shadow-md outline-none",
        "transition-[translate,box-shadow] duration-200 ease-settle group-hover/card:-translate-y-3 group-hover/card:shadow-xl",
        "focus-visible:-translate-y-3 focus-visible:shadow-xl focus-visible:ring-[3px] focus-visible:ring-ring",
        "motion-reduce:transition-[box-shadow] motion-reduce:group-hover/card:translate-y-0 motion-reduce:focus-visible:translate-y-0",
      )}
    >
      <img src={item.src} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
      <Label
        className={cn(
          "absolute bottom-3 left-3 rounded-full border border-foreground/10 bg-popover/95 px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-sm",
          "translate-y-1 opacity-0 transition-[translate,opacity] duration-200 ease-settle",
          "group-hover/card:translate-y-0 group-hover/card:opacity-100 group-has-[:focus-visible]/card:translate-y-0 group-has-[:focus-visible]/card:opacity-100",
          "[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
        )}
      >
        {item.title}
      </Label>
    </Tag>
  );
}
