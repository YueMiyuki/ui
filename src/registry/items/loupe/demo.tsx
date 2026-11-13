"use client";

import { Loupe } from "@/components/miyuki-ui/loupe";
import { landscape, topo } from "@/registry/lib/art";

export default function LoupeDemo() {
  return (
    <article className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      <Loupe className="rounded-xl">
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={landscape("kiso-ridge", { mood: "dawn", width: 840, height: 630 })}
            alt="Dawn over the Kiso ridge with contour lines drawn across it"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
          <img
            src={topo("kiso-ridge", { width: 840, height: 630, color: "#f3f7fb" })}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover opacity-75 mix-blend-screen"
          />
        </div>
      </Loupe>
      <div className="px-2 pt-4 pb-2">
        <h3 className="text-base font-semibold tracking-[-0.01em]">Zoom in on the ridge</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Contours every 20 metres from Kiso-Komagatake to the Hōken saddle.
        </p>
      </div>
    </article>
  );
}
