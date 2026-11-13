"use client";

import { DepthGauge } from "@/components/miyuki-ui/depth-gauge";
import { landscape } from "@/registry/lib/art";

const layers = [
  {
    depth: "0 m",
    title: "The surface",
    text: "Lake Tōya never freezes. Even in February, when the shore is under a metre of snow, the water stays open and steams on cold mornings, and the swans from Siberia sit out on it in rows.",
  },
  {
    depth: "15 m",
    title: "Where the summer stops",
    text: "In August the top fifteen metres warm to twenty degrees. Below them the temperature falls away in a few metres to a steady five, and divers feel the change as a line across the chest.",
  },
  {
    depth: "40 m",
    title: "The end of the light",
    text: "By forty metres there is too little light for plants to grow. The water is so clear that a white disc lowered on a rope stays visible to nearly twenty metres, one of the clearest lakes in Japan.",
  },
  {
    depth: "100 m",
    title: "The cold layer",
    text: "Below a hundred metres the lake is four degrees all year round, the temperature at which fresh water is heaviest. Nothing stirs it. Water that sinks here may stay for years.",
  },
  {
    depth: "180 m",
    title: "The floor of the caldera",
    text: "The deepest sounding is 179.7 metres, near the middle of the lake, on the floor of a crater that collapsed 110,000 years ago. Nakajima, the island in the centre, is the top of a younger volcano.",
  },
];

export default function DepthGaugeDemo() {
  return (
    <>
      <DepthGauge max={180} />
      <article className="mx-auto w-full max-w-2xl px-5 pt-14 pb-20 pr-20 sm:px-10 sm:pr-24">
        <p className="text-[13px] text-muted-foreground">Field guide · Lake Tōya</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Down through Lake Tōya
        </h1>
        <img
          src={landscape("toya-lake", { width: 1200, height: 520, mood: "day" })}
          alt=""
          className="mt-8 aspect-[30/13] w-full rounded-xl object-cover"
        />
        <div className="mt-12 space-y-24">
          {layers.map((layer) => (
            <section key={layer.title} className="min-h-[18rem]">
              <p className="text-sm font-medium text-brand-strong tabular-nums">{layer.depth}</p>
              <h2 className="mt-1 font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">
                {layer.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-foreground/85">{layer.text}</p>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
