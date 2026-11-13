"use client";

import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ImageWallProps extends ComponentProps<"div"> {
  images: (string | { src: string; alt?: string })[];
  columns?: number;
  duration?: number;
}

const PACE = [1, 0.86, 1.13, 0.94, 1.06, 0.9];
const COPIES = 3;
const FADE =
  "linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent), linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)";

export function ImageWall({ images, columns = 4, duration = 40, className, style, ...props }: ImageWallProps) {
  const count = Math.max(1, Math.min(8, Math.round(columns)));
  const loop = Math.max(4, duration);
  const stacks = Array.from({ length: count }, (_, c) => images.filter((_, i) => i % count === c));

  return (
    <div
      {...props}
      className={cn(
        "@container relative isolate overflow-hidden [perspective:1700px]",
        "[--miyuki-image-wall-col:clamp(6.5rem,15cqw,10.5rem)] [--miyuki-image-wall-gap:clamp(0.625rem,1.6cqw,1rem)]",
        "[--miyuki-image-wall-pitch:calc(var(--miyuki-image-wall-col)*0.75+var(--miyuki-image-wall-gap))]",
        "[--miyuki-image-wall-line:color-mix(in_oklab,var(--foreground)_11%,transparent)] dark:[--miyuki-image-wall-line:color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        className,
      )}
      style={{
        maskImage: FADE,
        WebkitMaskImage: FADE,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
        ...style,
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]"
        style={{ transform: "translate(-50%, -50%) rotateX(46deg) rotateZ(-30deg)" }}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-x-[calc(var(--miyuki-image-wall-col)*2)] inset-y-0"
          style={
            {
              backgroundImage:
                "linear-gradient(to right, var(--miyuki-image-wall-line) 1px, transparent 1px), linear-gradient(to right, var(--miyuki-image-wall-line) 1px, transparent 1px), linear-gradient(to bottom, var(--miyuki-image-wall-line) 1px, transparent 1px)",
              backgroundSize:
                "calc(var(--miyuki-image-wall-col) + var(--miyuki-image-wall-gap)) 100%, calc(var(--miyuki-image-wall-col) + var(--miyuki-image-wall-gap)) 100%, 100% var(--miyuki-image-wall-pitch)",
              backgroundPosition:
                "calc(var(--miyuki-image-wall-col) * 2) 0, calc(var(--miyuki-image-wall-col) * 3 - 1px) 0, 0 calc(var(--miyuki-image-wall-gap) / -2)",
            } as CSSProperties
          }
        />
        <div
          className="relative grid [transform-style:preserve-3d]"
          style={{
            gridTemplateColumns: `repeat(${count}, var(--miyuki-image-wall-col))`,
            columnGap: "var(--miyuki-image-wall-gap)",
          }}
        >
          {stacks.map((stack, c) => {
            const pace = loop * PACE[c % PACE.length];
            return (
              <div key={c} className="group/column [transform-style:preserve-3d]">
                <div
                  className={cn(
                    "flex flex-col [transform-style:preserve-3d] motion-reduce:animate-none",
                    c % 2 === 0
                      ? "animate-[miyuki-image-wall-up_linear_infinite]"
                      : "animate-[miyuki-image-wall-down_linear_infinite]",
                    "group-hover/column:[animation-play-state:paused]",
                  )}
                  style={{
                    animationDuration: `${pace.toFixed(2)}s`,
                    animationDelay: `${(-pace * ((c * 0.37) % 1)).toFixed(2)}s`,
                  }}
                >
                  {Array.from({ length: COPIES }, (_, copy) => (
                    <ul
                      key={copy}
                      aria-hidden={copy > 0 || undefined}
                      className="flex flex-col [transform-style:preserve-3d]"
                      style={{ gap: "var(--miyuki-image-wall-gap)", paddingBottom: "var(--miyuki-image-wall-gap)" }}
                    >
                      {stack.map((src, i) => (
                        <li
                          key={i}
                          className={cn(
                            "aspect-[4/3] overflow-clip rounded-lg bg-muted shadow-sm ring-1 ring-foreground/10",
                            "transition-[transform,box-shadow] duration-200 ease-settle",
                            "hover:[transform:translateZ(22px)] hover:shadow-xl motion-reduce:hover:[transform:none]",
                          )}
                        >
                          <img
                            src={typeof src === "string" ? src : src.src}
                            alt={typeof src === "string" ? "" : (src.alt ?? "")}
                            draggable={false}
                            decoding="async"
                            className="block size-full object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style href="miyuki-image-wall" precedence="miyuki">{`
        @keyframes miyuki-image-wall-up {
          from { transform: translateY(0); }
          to { transform: translateY(calc(-100% / ${COPIES})); }
        }
        @keyframes miyuki-image-wall-down {
          from { transform: translateY(calc(-100% / ${COPIES})); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
