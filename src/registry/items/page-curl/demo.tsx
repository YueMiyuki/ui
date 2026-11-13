"use client";

import { PageCurl } from "@/components/miyuki-ui/page-curl";
import { landscape } from "@/registry/lib/art";

const ruled =
  "bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,color-mix(in_oklab,var(--brand)_16%,transparent)_27px,color-mix(in_oklab,var(--brand)_16%,transparent)_28px)]";

const pages = [
  <div key="cover" className="flex size-full flex-col p-7">
    <p className="text-[13px] text-muted-foreground">Haruto Ishikawa</p>
    <h2 className="mt-2 font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
      Notes from the Kiso road
    </h2>
    <p className="mt-2 text-sm text-muted-foreground">Magome to Narai, on foot, in February.</p>
    <img
      src={landscape("kiso-road", { mood: "snow", width: 640, height: 420 })}
      alt="Snow on the ridges above the old post road"
      draggable={false}
      className="mt-auto aspect-[16/10] w-full rounded-md object-cover"
    />
  </div>,
  <div key="day-one" className="flex size-full flex-col p-7">
    <p className="text-[13px] text-muted-foreground tabular-nums">Day one · 7.8 km</p>
    <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Magome to Tsumago</h3>
    <div className={`mt-4 flex-1 text-sm leading-7 text-foreground/85 ${ruled}`}>
      <p>
        Left the inn at eight with the stone path still frozen. The pass at Magome-tōge was quiet except for a
        woodpecker and the bells people tie to their packs for bears.
      </p>
      <p>Tea at the old teahouse below the falls. The keeper said the snow came early this year and has not left.</p>
    </div>
  </div>,
  <div key="day-three" className="flex size-full flex-col p-7">
    <p className="text-[13px] text-muted-foreground tabular-nums">Day three · 9.2 km</p>
    <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Over Torii pass to Narai</h3>
    <div className={`mt-4 flex-1 text-sm leading-7 text-foreground/85 ${ruled}`}>
      <p>
        Knee-deep on the north side of the pass and bright sun on the south. Lunch at the top: rice balls, a flask of
        hōjicha.
      </p>
      <p>
        Narai at dusk, eight hundred metres of lanterns and lacquer shops, and a bath hot enough to make the walk worth
        it.
      </p>
    </div>
  </div>,
];

export default function PageCurlDemo() {
  return <PageCurl pages={pages} aria-label="Notes from the Kiso road" className="w-full max-w-[380px]" />;
}
