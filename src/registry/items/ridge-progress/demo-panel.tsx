"use client";

import { useRef } from "react";
import { RidgeProgress } from "@/components/miyuki-ui/ridge-progress";

const days = [
  {
    title: "Magome, 08:30",
    text: "The post town sits on a slope, so the walk begins by climbing its one stone street past the water wheel and the last of the inns. Fill your bottle at the trough by the noticeboard.",
  },
  {
    title: "Magome Pass, 801 metres",
    text: "Forty minutes of cedar and old paving bring you to the pass and a tea house where the keeper still lights the hearth for walkers. From here the path drops gently all the way to Tsumago.",
  },
  {
    title: "The Odaki and Medaki falls",
    text: "Two falls a few minutes apart, the larger one loud enough to hear from the bridge. In February the spray freezes on the rocks and the steps beside them need care.",
  },
  {
    title: "Tsumago, 12:10",
    text: "The street has no wires and no cars, and the shutters are the same dark wood as two hundred years ago. Send your bag ahead from Magome and you can walk this with nothing but a camera.",
  },
];

export default function RidgeProgressPanelDemo() {
  const panel = useRef<HTMLDivElement>(null);
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
      <div
        ref={panel}
        className="h-[440px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background shadow-sm"
      >
        <RidgeProgress container={panel} seed="kiso" />
        <article className="px-5 pt-6 pb-10 sm:px-7">
          <p className="text-[13px] text-muted-foreground">Route notes · Kiso valley</p>
          <h2 className="mt-1.5 font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">
            Magome to Tsumago on the old road
          </h2>
          <div className="mt-6 space-y-7">
            {days.map((day) => (
              <section key={day.title}>
                <h3 className="text-base font-semibold">{day.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">{day.text}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
