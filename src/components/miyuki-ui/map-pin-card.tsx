"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MapPinCardProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  href: string;
  containerClassName?: string;
}

const ENGAGED = "group-hover/map-pin-card:pointer-events-auto group-focus-within/map-pin-card:pointer-events-auto";

export function MapPinCard({ title, href, children, className, containerClassName, ...props }: MapPinCardProps) {
  return (
    <div {...props} className={cn("group/map-pin-card relative isolate [perspective:1100px]", containerClassName)}>
      <div
        className={cn(
          "relative rounded-2xl border border-border bg-card p-2.5 text-card-foreground shadow-sm [transform-style:preserve-3d]",
          "transition-[transform,box-shadow] duration-200 ease-settle will-change-transform",
          "group-hover/map-pin-card:shadow-lg group-hover/map-pin-card:duration-300 group-focus-within/map-pin-card:shadow-lg group-focus-within/map-pin-card:duration-300",
          "group-hover/map-pin-card:[transform:rotateX(40deg)_scale(0.86)] group-focus-within/map-pin-card:[transform:rotateX(40deg)_scale(0.86)]",
          "motion-reduce:transition-shadow motion-reduce:group-hover/map-pin-card:[transform:none] motion-reduce:group-focus-within/map-pin-card:[transform:none]",
          className,
        )}
      >
        {children}
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "absolute -top-24 -left-24 size-48 scale-[0.12] rounded-full border border-brand/70 bg-brand/[0.06] opacity-0",
                "dark:border-brand/80 dark:bg-brand/10 dark:shadow-[0_0_24px_0_color-mix(in_oklab,var(--brand)_35%,transparent)]",
                "group-hover/map-pin-card:animate-[miyuki-map-pin-card-ring_2.7s_cubic-bezier(0.22,1,0.36,1)_infinite] group-focus-within/map-pin-card:animate-[miyuki-map-pin-card-ring_2.7s_cubic-bezier(0.22,1,0.36,1)_infinite]",
                "motion-reduce:group-hover/map-pin-card:animate-none motion-reduce:group-focus-within/map-pin-card:animate-none",
                "motion-reduce:group-hover/map-pin-card:[scale:var(--miyuki-map-pin-card-rest)] motion-reduce:group-hover/map-pin-card:opacity-60 motion-reduce:group-focus-within/map-pin-card:[scale:var(--miyuki-map-pin-card-rest)] motion-reduce:group-focus-within/map-pin-card:opacity-60",
              )}
              style={{ animationDelay: `${i * 0.9}s`, "--miyuki-map-pin-card-rest": 0.28 + i * 0.17 } as CSSProperties}
            />
          ))}
          <span className="absolute -top-1.5 -left-1.5 size-3 scale-0 rounded-full bg-brand opacity-0 ring-[3px] ring-brand/25 transition-[scale,opacity] duration-150 ease-settle group-hover/map-pin-card:scale-100 group-hover/map-pin-card:opacity-100 group-hover/map-pin-card:delay-150 group-focus-within/map-pin-card:scale-100 group-focus-within/map-pin-card:opacity-100 group-focus-within/map-pin-card:delay-150" />
        </div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute bottom-1/2 left-1/2 z-10 flex h-[calc(50%+3.25rem)] w-12 -translate-x-1/2 flex-col items-center",
          ENGAGED,
        )}
      >
        <a
          href={href}
          className={cn(
            "relative inline-flex h-8 shrink-0 translate-y-2 items-center rounded-full bg-primary px-3.5 text-[13px] font-medium whitespace-nowrap text-primary-foreground opacity-0 shadow-md outline-none",
            "transition-[opacity,translate] duration-150 ease-settle focus-visible:ring-[3px] focus-visible:ring-ring",
            "group-hover/map-pin-card:translate-y-0 group-hover/map-pin-card:opacity-100 group-hover/map-pin-card:delay-150 group-hover/map-pin-card:duration-[170ms]",
            "group-focus-within/map-pin-card:translate-y-0 group-focus-within/map-pin-card:opacity-100 group-focus-within/map-pin-card:delay-150 group-focus-within/map-pin-card:duration-[170ms]",
            "motion-reduce:translate-y-0 motion-reduce:delay-0",
          )}
        >
          {title}
        </a>
        <span
          aria-hidden="true"
          className={cn(
            "w-px flex-1 origin-bottom scale-y-0 bg-linear-to-t from-brand/35 to-brand",
            "transition-[scale] duration-150 ease-settle",
            "group-hover/map-pin-card:scale-y-100 group-hover/map-pin-card:delay-100 group-hover/map-pin-card:duration-[220ms]",
            "group-focus-within/map-pin-card:scale-y-100 group-focus-within/map-pin-card:delay-100 group-focus-within/map-pin-card:duration-[220ms]",
            "dark:shadow-[0_0_8px_0_var(--brand)] motion-reduce:scale-y-100 motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:group-hover/map-pin-card:opacity-100 motion-reduce:group-focus-within/map-pin-card:opacity-100",
          )}
        />
      </div>
      <style href="miyuki-map-pin-card" precedence="miyuki">{`
        @keyframes miyuki-map-pin-card-ring {
          0% { scale: 0.12; opacity: 0; }
          12% { opacity: 1; }
          100% { scale: 1; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
