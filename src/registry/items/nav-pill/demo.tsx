"use client";

import { BookOpen, CloudSun, Map } from "lucide-react";
import { buttonStyles } from "@/components/miyuki-ui/button";
import { NavPill } from "@/components/miyuki-ui/nav-pill";
import { cn } from "@/lib/utils";
import { landscape } from "@/registry/lib/art";

const items = [
  { name: "Forecast", href: "#forecast", icon: <CloudSun />, current: true },
  { name: "Maps", href: "#maps", icon: <Map /> },
  { name: "Journal", href: "#journal", icon: <BookOpen /> },
];

const paragraphs = [
  "The first heavy snow reached the Kiso valley on the night of 14 December. By morning the post road between Tsumago and Magome lay under 38 centimetres, and the inns along it had cleared only the stretch outside their own doors.",
  "Walking it takes about three hours in winter, half as long again as in summer. The climb out of Magome is the steepest part; after the pass the road follows the river down through cedar and the snow under the trees is soft and deep.",
  "There is a tea house at the top of the pass that stays open until the end of February. The owner keeps a fire going in the sunken hearth and serves roasted barley tea to anyone who walks in, without asking for payment.",
  "Weather in the valley changes quickly after noon. Forecasts for Nagiso give a good idea of the afternoon, but the pass itself can sit in cloud while the villages on either side are clear.",
  "Buses back to Nakatsugawa leave Magome at 15:10 and 16:45. If you miss the last one, the inn by the water wheel will call a taxi; it takes twenty minutes to arrive.",
];

export default function NavPillDemo() {
  return (
    <div className="min-h-full">
      <NavPill
        items={items}
        action={
          <a href="#sign-in" className={cn(buttonStyles({ size: "sm" }), "rounded-full px-4")}>
            Sign in
          </a>
        }
      />
      <article className="mx-auto max-w-2xl px-6 pt-28 pb-32">
        <p className="text-[13px] text-muted-foreground">Journal · 6 min read</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
          Three hours on the old Kiso road
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Scroll down and the bar steps out of the way. Scroll up and it comes back.
        </p>
        <img
          src={landscape("kiso-road", { width: 1200, height: 640, mood: "snow" })}
          alt="Snow on forested ridges above a valley"
          className="mt-8 aspect-[15/8] w-full rounded-2xl object-cover"
        />
        <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/90">
          {[...paragraphs, ...paragraphs].map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
