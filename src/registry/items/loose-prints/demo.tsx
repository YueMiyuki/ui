"use client";

import { LoosePrint, LoosePrints } from "@/components/miyuki-ui/loose-prints";
import { landscape, type Mood } from "@/registry/lib/art";

const prints: { seed: string; caption: string; mood: Mood; tall: boolean; x: number; y: number; rotate: number }[] = [
  { seed: "otaru-canal", caption: "Otaru canal, January", mood: "dusk", tall: false, x: -150, y: -150, rotate: -5 },
  { seed: "niseko-first", caption: "First tracks, Niseko", mood: "day", tall: true, x: -350, y: 6, rotate: -6 },
  { seed: "toya-noon", caption: "Lake Tōya at noon", mood: "snow", tall: false, x: 140, y: -150, rotate: 4 },
  { seed: "aomori-night", caption: "Night train to Aomori", mood: "night", tall: true, x: 350, y: -4, rotate: 6 },
  { seed: "hakuba-hut", caption: "Hakuba from the hut", mood: "dawn", tall: false, x: -140, y: 150, rotate: 4 },
  { seed: "nozawa-steam", caption: "Steam at Nozawa", mood: "aurora", tall: false, x: 150, y: 150, rotate: -4 },
];

export default function LoosePrintDemo() {
  return (
    <LoosePrints className="size-full overflow-hidden">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center font-display text-3xl font-semibold tracking-[-0.03em] text-foreground/10 select-none sm:text-5xl"
      >
        Drag the prints
      </p>
      {prints.map((p) => (
        <LoosePrint
          key={p.seed}
          initial={{ x: p.x, y: p.y, rotate: p.rotate }}
          caption={p.caption}
          aria-label={p.caption}
        >
          <img
            src={landscape(p.seed, { mood: p.mood, width: p.tall ? 360 : 480, height: p.tall ? 450 : 360 })}
            alt=""
            draggable={false}
            className={
              p.tall
                ? "block aspect-[4/5] w-36 rounded-[2px] object-cover sm:w-40"
                : "block aspect-[4/3] w-44 rounded-[2px] object-cover sm:w-52"
            }
          />
        </LoosePrint>
      ))}
    </LoosePrints>
  );
}
