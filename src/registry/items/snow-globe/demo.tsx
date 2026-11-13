"use client";

import { SnowGlobe } from "@/components/miyuki-ui/snow-globe";
import { landscape } from "@/registry/lib/art";

function Hut() {
  return (
    <svg viewBox="0 0 120 70" aria-hidden="true" className="absolute bottom-[19%] left-1/2 w-[46%] -translate-x-1/2">
      <path d="M8 66 L14 46 L20 66 Z M4 66 L14 38 L24 66 Z" fill="oklch(0.34 0.05 200)" />
      <path d="M98 66 L106 40 L114 66 Z" fill="oklch(0.32 0.05 205)" />
      <path d="M34 40 H86 V66 H34 Z" fill="oklch(0.42 0.06 45)" />
      <path d="M34 40 H86 V44 H34 Z" fill="oklch(0.3 0.04 40)" opacity="0.6" />
      <path d="M28 42 L60 16 L92 42 Z" fill="oklch(0.3 0.05 30)" />
      <path d="M25 43 L60 13 L95 43 L91 44.5 L60 19 L29 44.5 Z" fill="oklch(0.98 0.006 240)" />
      <path d="M74 22 H80 V32 L74 27 Z" fill="oklch(0.36 0.04 40)" />
      <path d="M73 21 H81 V23 H73 Z" fill="oklch(0.98 0.006 240)" />
      <rect x="40" y="48" width="12" height="10" rx="1" fill="oklch(0.86 0.13 82)" />
      <rect x="66" y="50" width="10" height="16" rx="1" fill="oklch(0.28 0.04 40)" />
      <path d="M40 53 H52 M46 48 V58" stroke="oklch(0.42 0.06 45)" strokeWidth="1" />
    </svg>
  );
}

export default function SnowGlobeDemo() {
  return (
    <figure className="flex flex-col items-center gap-5">
      <SnowGlobe aria-label="Snow globe with a mountain hut">
        <img
          src={landscape("hakuba-hut", { width: 520, height: 520, mood: "dusk" })}
          alt=""
          className="size-full object-cover dark:hidden"
        />
        <img
          src={landscape("hakuba-hut", { width: 520, height: 520, mood: "night" })}
          alt=""
          className="hidden size-full object-cover dark:block"
        />
        <Hut />
      </SnowGlobe>
      <figcaption className="text-sm text-muted-foreground">Shake to check the forecast.</figcaption>
    </figure>
  );
}
