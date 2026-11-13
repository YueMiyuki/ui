"use client";

import { type HTMLAttributes, type ReactNode, type Ref, type RefObject, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-skeleton-sweep {
  0% { transform: translateX(-100%); }
  62%, 100% { transform: translateX(100%); }
}
`;

const SWEEP = "miyuki-skeleton-sweep";

function useInPhase(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getAnimations !== "function") return;
    for (const animation of el.getAnimations({ subtree: true })) {
      if (animation instanceof CSSAnimation && animation.animationName === SWEEP) {
        animation.startTime = 0;
      }
    }
  }, [ref]);
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export function Skeleton({ className, children, ref, ...props }: SkeletonProps) {
  const own = useRef<HTMLDivElement>(null);
  useInPhase(own);
  return (
    <div
      aria-hidden="true"
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn("relative isolate overflow-hidden rounded-md bg-muted", className)}
    >
      <style href="miyuki-skeleton" precedence="miyuki">
        {keyframes}
      </style>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full",
          "bg-linear-to-r from-transparent via-card/75 to-transparent dark:via-foreground/8",
          "animate-[miyuki-skeleton-sweep_1.8s_ease-in-out_infinite] motion-reduce:hidden",
        )}
      />
      {children}
    </div>
  );
}

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SkeletonText({ lines = 3, className, lineClassName, ...props }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" {...props} className={cn("flex flex-col gap-2 py-1", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 rounded-sm", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full", lineClassName)}
        />
      ))}
    </div>
  );
}

export interface SkeletonCircleProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  ref?: Ref<HTMLDivElement>;
}

export function SkeletonCircle({ size = 40, className, style, ...props }: SkeletonCircleProps) {
  return (
    <Skeleton
      {...props}
      className={cn("shrink-0 rounded-full", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

export interface SkeletonRevealProps extends HTMLAttributes<HTMLDivElement> {
  loading: boolean;
  skeleton: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function SkeletonReveal({ loading, skeleton, children, className, ...props }: SkeletonRevealProps) {
  const layer =
    "col-start-1 row-start-1 min-w-0 transition-[opacity,filter,visibility] ease-settle motion-reduce:transition-opacity";
  return (
    <div {...props} aria-busy={loading || undefined} className={cn("grid", className)}>
      <div
        aria-hidden="true"
        className={cn(
          layer,
          "pointer-events-none",
          loading ? "visible opacity-100 duration-200" : "invisible opacity-0 duration-320 motion-safe:blur-[8px]",
        )}
      >
        {skeleton}
      </div>
      <div
        inert={loading}
        className={cn(layer, loading ? "opacity-0 duration-200 motion-safe:blur-[8px]" : "opacity-100 duration-320")}
      >
        {children}
      </div>
    </div>
  );
}
