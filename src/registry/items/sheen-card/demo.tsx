"use client";

import { SheenCard } from "@/components/miyuki-ui/sheen-card";
import { landscape, type Mood } from "@/registry/lib/art";

const passes: { id: string; title: string; place: string; detail: string; mood: Mood }[] = [
  { id: "niseko-season", title: "Season pass 2026–⁠27", place: "Niseko", detail: "4 resorts, 61 runs", mood: "day" },
  { id: "hakuba-night", title: "Night pass", place: "Hakuba", detail: "Lifts until 21:00", mood: "night" },
  { id: "nozawa-spring", title: "Spring pass", place: "Nozawa", detail: "1 March to 6 May", mood: "dawn" },
];

export default function SheenCardDemo() {
  return (
    <div className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 justify-items-center gap-6 @2xl:grid-cols-3">
        {passes.map((pass) => (
          <SheenCard key={pass.id} className="w-full max-w-[17rem]">
            <img
              src={landscape(pass.id, { mood: pass.mood, width: 600, height: 800 })}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="dark absolute inset-0 flex flex-col justify-end text-foreground">
              <div className="bg-linear-to-t from-[oklch(0.17_0.03_250/0.9)] via-[oklch(0.17_0.03_250/0.72)] via-55% to-transparent px-5 pt-24 pb-5">
                <p className="text-[13px] text-foreground/85">{pass.place}</p>
                <h3 className="mt-0.5 font-display text-2xl leading-tight font-semibold tracking-[-0.01em] text-balance">
                  <a href={`#${pass.id}`} className="outline-none after:absolute after:inset-0">
                    {pass.title}
                  </a>
                </h3>
                <p className="mt-2 text-[13px] text-foreground/85 tabular-nums">{pass.detail}</p>
              </div>
            </div>
          </SheenCard>
        ))}
      </div>
    </div>
  );
}
