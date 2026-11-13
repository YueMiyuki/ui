"use client";

import { type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ComponentProps, PointerEvent } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ScatteredPhoto {
  src: string;
  alt?: string;
  x?: number;
  y?: number;
  depth?: number;
  width?: number;
}

export interface ScatteredPhotosProps extends ComponentProps<"div"> {
  images: readonly (string | ScatteredPhoto)[];
  strength?: number;
  variant?: "center-near" | "edge-near";
}

interface Placed {
  src: string;
  alt: string;
  x: number;
  y: number;
  depth: number;
  width: number;
}

const POINTER = { stiffness: 110, damping: 20, mass: 0.9 };
const REF_W = 960;
const REF_H = 560;
const CLEAR = { w: 610, h: 280 };
const ASPECT = 0.72;

const RING: [number, number][] = [
  [13, 19],
  [37, 11],
  [64, 12],
  [87, 23],
  [90, 68],
  [67, 88],
  [34, 88],
  [10, 70],
];
const EXTRA: [number, number][] = [
  [50, 5],
  [96, 45],
  [50, 96],
  [4, 44],
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function arrange(images: ScatteredPhotosProps["images"], variant: ScatteredPhotosProps["variant"]): Placed[] {
  const n = images.length;
  const rng = createRng(`scattered-photos:${n}:${variant}`);
  const slots =
    n <= RING.length
      ? Array.from({ length: n }, (_, i) => RING[Math.floor(((i + 0.5) * RING.length) / n)])
      : [...RING, ...EXTRA].slice(0, n);
  const levels = Array.from({ length: n }, (_, i) => (n > 1 ? i / (n - 1) : 0.7));
  const low = levels.slice(0, Math.ceil(n / 2));
  const high = levels.slice(Math.ceil(n / 2)).reverse();
  const depths: number[] = [];
  for (let i = 0; depths.length < n; i++) {
    if (low[i] !== undefined) depths.push(low[i]);
    if (high[i] !== undefined) depths.push(high[i]);
  }

  return images.map((item, i) => {
    const given = typeof item === "string" ? { src: item } : item;
    const depth = clamp(given.depth ?? depths[i % depths.length] + rng.range(-0.05, 0.05), 0, 1);
    const width = given.width ?? Math.round(lerp(100, 198, depth) * rng.range(0.95, 1.05));
    const slot = slots[i] ?? [rng.range(5, 95), rng.pick([6, 94])];
    const near = variant === "edge-near" ? 1 - depth : depth;
    const dx = ((slot[0] + rng.range(-1.5, 1.5) - 50) / 100) * REF_W;
    const dy = ((slot[1] + rng.range(-1.5, 1.5) - 50) / 100) * REF_H;
    let reach = lerp(1.07, 0.9, near);
    for (let step = 0; step < 30; step++) {
      if (Math.abs(dx * reach) > CLEAR.w / 2 + width / 2 || Math.abs(dy * reach) > CLEAR.h / 2 + (width * ASPECT) / 2)
        break;
      reach += 0.02;
    }
    return {
      src: given.src,
      alt: given.alt ?? "",
      x: given.x ?? 50 + ((dx * reach) / REF_W) * 100,
      y: given.y ?? 50 + ((dy * reach) / REF_H) * 100,
      depth,
      width,
    };
  });
}

function Layer({
  image,
  order,
  px,
  py,
  strength,
  reduce,
}: {
  image: Placed;
  order: number;
  px: MotionValue<number>;
  py: MotionValue<number>;
  strength: number;
  reduce: boolean;
}) {
  const { depth } = image;
  const x = useTransform(px, (v) => -v * strength * depth);
  const y = useTransform(py, (v) => -v * strength * depth * 0.75);
  const blur = (1 - depth) * 2.4;
  const radius = image.width >= 170 ? 18 : image.width >= 130 ? 14 : 10;
  const shadow = depth > 0.66 ? "shadow-lg" : depth > 0.33 ? "shadow-md" : "shadow-sm";

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${image.x}%`,
        top: `${image.y}%`,
        width: `min(${image.width}px, ${((image.width / REF_W) * 100).toFixed(2)}cqw)`,
        zIndex: Math.round(depth * 10),
        x,
        y,
      }}
    >
      <motion.img
        src={image.src}
        alt={image.alt}
        draggable={false}
        className={cn("block h-auto w-full select-none", shadow)}
        style={{ borderRadius: `min(${radius}px, ${((radius / REF_W) * 100).toFixed(2)}cqw)` }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: `blur(${(blur + 10).toFixed(1)}px)` }}
        animate={{
          opacity: lerp(0.5, 1, depth),
          scale: 1,
          filter: `blur(${blur.toFixed(1)}px) saturate(${lerp(0.85, 1, depth).toFixed(2)})`,
        }}
        transition={
          reduce
            ? { duration: 0.3, delay: 0.04 * order }
            : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 + 0.07 * order }
        }
      />
    </motion.div>
  );
}

export function ScatteredPhotos({
  images,
  strength = 40,
  variant = "center-near",
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: ScatteredPhotosProps) {
  const reduce = useReducedMotion() ?? false;
  const px = useSpring(0, POINTER);
  const py = useSpring(0, POINTER);
  const placed = arrange(images, variant);
  const order = placed
    .map((image, i) => ({ depth: image.depth, i }))
    .sort((a, b) => a.depth - b.depth)
    .map(({ i }) => i);

  return (
    <div
      {...props}
      className={cn("@container relative isolate overflow-hidden", className)}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(e);
        if (reduce || e.pointerType === "touch") return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        px.set(clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1));
        py.set(clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1));
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(e);
        px.set(0);
        py.set(0);
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {placed.map((image, i) => (
          <Layer
            key={i}
            image={image}
            order={order.indexOf(i)}
            px={px}
            py={py}
            strength={reduce ? 0 : strength}
            reduce={reduce}
          />
        ))}
      </div>
      <div className="relative z-10 flex size-full flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
