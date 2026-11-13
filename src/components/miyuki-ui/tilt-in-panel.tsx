"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TiltInPanelProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
}

export function TiltInPanel({ title, children, className, ...props }: TiltInPanelProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.32], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.32], [1.05, 1]);
  const y = useTransform(scrollYProgress, [0, 0.45], [0, -80]);

  return (
    <div
      {...props}
      ref={root}
      className={cn("relative flex flex-col items-center overflow-x-clip px-4 pt-14 pb-16 sm:px-6 sm:pt-20", className)}
    >
      {title ? (
        <motion.div style={reduced ? undefined : { y }} className="relative z-10 w-full max-w-3xl text-center">
          {title}
        </motion.div>
      ) : null}
      <div className="mt-10 w-full max-w-5xl [perspective:1200px] sm:mt-12">
        <motion.div
          style={reduced ? undefined : { rotateX, scale, transformOrigin: "50% 40%" }}
          className="rounded-3xl border-4 border-border-strong bg-card p-2 shadow-2xl will-change-transform"
        >
          <div className="overflow-clip rounded-xl">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
