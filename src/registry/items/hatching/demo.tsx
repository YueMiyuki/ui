"use client";

import { HatchingContainer } from "@/components/miyuki-ui/hatching";
import { landscape } from "@/registry/lib/art";

export default function HatchingDemo() {
  return (
    <div className="grid size-full grid-cols-1 divide-y divide-border overflow-y-auto sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:overflow-hidden">
      <HatchingContainer
        fade="radial"
        className="flex min-h-64 flex-col items-center justify-center px-8 py-10 text-center"
      >
        <h3 className="max-w-56 font-display text-3xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance">
          Shade, drawn by hand
        </h3>
        <p className="mt-3 text-[13px] text-muted-foreground">Diagonal hatch, 10 px apart</p>
      </HatchingContainer>
      <HatchingContainer
        pattern="waves"
        size={9}
        color="color-mix(in oklab, var(--brand) 50%, transparent)"
        fade="radial"
        animate
        className="flex min-h-64 items-center justify-center px-8 py-10"
      >
        <figure className="w-full max-w-56 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <img
            src={landscape("otaru", { width: 448, height: 280, mood: "dawn" })}
            alt="Snow on the hills above Otaru harbour at dawn"
            className="aspect-[8/5] w-full object-cover"
          />
          <figcaption className="px-4 py-3">
            <p className="text-sm font-medium">Otaru, from the breakwater</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">Sea 4 °C, swell 1.2 m</p>
          </figcaption>
        </figure>
      </HatchingContainer>
      <div className="flex min-h-64 items-center justify-center px-8 py-10">
        <HatchingContainer pattern="cross" size={6} frame={20} className="w-full max-w-60">
          <p className="px-5 py-4 text-sm leading-relaxed text-pretty">
            Plate 14. The harbour at Otaru in the winter of 1911, engraved on steel from a sketch made on the
            breakwater.
          </p>
        </HatchingContainer>
      </div>
    </div>
  );
}
