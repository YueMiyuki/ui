"use client";

import { RidgeProgress } from "@/components/miyuki-ui/ridge-progress";
import { landscape } from "@/registry/lib/art";

const sections = [
  {
    title: "The trailhead at 05:10",
    text: [
      "The Makkari trail starts beside a shrine at 380 metres, in birch forest that is still dark when the first cars pull in. Sign the register in the box by the gate and write the time you expect to be back.",
      "The first hour climbs steadily through the trees. Keep your layers thin; you will be warm long before you are high.",
    ],
    image: landscape("yotei-trailhead", { width: 1200, height: 560, mood: "dawn" }),
  },
  {
    title: "Fifth station",
    text: [
      "Above the fifth station the birches thin out and the path turns into a staircase of roots and loose stone. This is where most people stop for breakfast, and where the view of the Shiribetsu valley first opens behind you.",
      "In early summer there is still snow in the gullies here. Stay on the ridge rather than cutting across it.",
    ],
  },
  {
    title: "The crater rim",
    text: [
      "At 1,600 metres you step out onto the rim. The crater is 700 metres across and drops 200 metres to a floor that keeps its snow into July. The wind arrives all at once.",
      "Turn left and follow the rim clockwise. The path is marked with yellow paint on the rocks, and in cloud you will be glad of it.",
    ],
    image: landscape("yotei-rim", { width: 1200, height: 560, mood: "snow" }),
  },
  {
    title: "Summit, 1,898 metres",
    text: [
      "The true summit is a heap of dark rock on the south-west side of the rim, with a small marker and room for about six people. On a clear day you can see the sea on both sides of Hokkaidō.",
      "Allow three hours back down. The descent is harder on the knees than the climb was on the lungs.",
    ],
  },
];

export default function RidgeProgressDemo() {
  return (
    <>
      <RidgeProgress seed="yotei" />
      <article className="mx-auto w-full max-w-2xl px-5 pt-16 pb-24 sm:px-8">
        <p className="text-[13px] text-muted-foreground">Route notes · Mount Yōtei</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Yōtei in a day, by the Makkari trail
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          1,520 metres of ascent, nine hours on foot, and the best view in Hokkaidō if the cloud lifts.
        </p>
        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">{section.title}</h2>
              {section.text.map((text) => (
                <p key={text.slice(0, 24)} className="mt-3 text-base leading-relaxed text-foreground/85">
                  {text}
                </p>
              ))}
              {section.image && (
                <img src={section.image} alt="" className="mt-6 aspect-[15/7] w-full rounded-xl object-cover" />
              )}
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
