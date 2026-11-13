"use client";

import { Avatar, AvatarGroup } from "@/components/miyuki-ui/avatar";
import { Button } from "@/components/miyuki-ui/button";
import { HeroSplit } from "@/components/miyuki-ui/hero-sections";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const forecasters = ["Yuna Sato", "Aiko Tanaka", "Lars Eriksen", "Amara Okafor"].map(
  (name) => people.find((p) => p.name === name)!,
);

export default function HeroSectionsSplitDemo() {
  return (
    <HeroSplit
      title="Know the mountain before you leave the valley"
      description="Hour-by-hour forecasts for 214 peaks, written by people who climb them."
      actions={
        <>
          <Button size="lg">Start free</Button>
          <Button size="lg" variant="secondary">
            See a sample forecast
          </Button>
        </>
      }
      footnote={
        <div className="flex items-center gap-3">
          <AvatarGroup size="sm">
            {forecasters.map((p) => (
              <Avatar key={p.name} src={p.avatar} name={p.name} />
            ))}
          </AvatarGroup>
          <span>Written each morning by Yuna Sato and eleven other forecasters</span>
        </div>
      }
      images={[
        {
          src: landscape("split-karamatsu", { mood: "dusk", width: 640, height: 800 }),
          alt: "Karamatsu ridge at dusk",
        },
        { src: landscape("split-tsurugi", { mood: "snow", width: 640, height: 800 }), alt: "Snow falling on Tsurugi" },
        {
          src: landscape("split-shirouma", { mood: "dawn", width: 640, height: 800 }),
          alt: "Shirouma at first light",
          label: (
            <>
              <span className="block font-medium">Tomorrow, 07:00</span>
              <span className="block text-muted-foreground">Clear, −11 °C</span>
            </>
          ),
        },
      ]}
    />
  );
}
