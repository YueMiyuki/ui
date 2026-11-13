"use client";

import { Snowflake } from "lucide-react";
import { buttonStyles } from "@/components/miyuki-ui/button";
import { GlidingMenu, GlidingMenuFeature, GlidingMenuItem, GlidingMenuLink } from "@/components/miyuki-ui/gliding-menu";
import { cn } from "@/lib/utils";
import { landscape, type Mood } from "@/registry/lib/art";

const forecasts = ["Today", "Next seven days", "Mountain summits", "Avalanche bulletin", "Snow history"];

const maps: { title: string; description: string; mood: Mood }[] = [
  { title: "Snow depth", description: "Measured at 214 stations, every hour.", mood: "snow" },
  { title: "Wind", description: "Ridge-top gusts for the next 48 hours.", mood: "day" },
  { title: "Cloud cover", description: "Satellite cloud, sunrise and sunset.", mood: "dawn" },
  { title: "Trail conditions", description: "Grooming and closures from patrol.", mood: "dusk" },
];

const company = ["About Hoshizora", "Our stations", "Careers", "Contact"];

export default function GlidingMenuDemo() {
  return (
    <div className="flex size-full flex-col">
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
        <a
          href="#home"
          className="flex items-center gap-2 rounded-lg text-[15px] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Snowflake className="size-4" aria-hidden="true" />
          </span>
          <span className="max-sm:sr-only">Hoshizora</span>
        </a>
        <GlidingMenu>
          <GlidingMenuItem label="Forecasts">
            <div className="grid w-52 gap-0.5">
              {forecasts.map((name, i) => (
                <GlidingMenuLink key={name} href={`#forecast-${i}`}>
                  {name}
                </GlidingMenuLink>
              ))}
            </div>
          </GlidingMenuItem>
          <GlidingMenuItem label="Maps">
            <div className="grid w-[600px] max-w-full gap-1 sm:grid-cols-2">
              {maps.map((map) => (
                <GlidingMenuFeature
                  key={map.title}
                  href={`#map-${map.title.toLowerCase().replace(" ", "-")}`}
                  image={landscape(`menu-${map.title}`, { width: 192, height: 128, mood: map.mood })}
                  title={map.title}
                  description={map.description}
                />
              ))}
            </div>
          </GlidingMenuItem>
          <GlidingMenuItem label="Company">
            <div className="grid w-48 gap-0.5">
              {company.map((name, i) => (
                <GlidingMenuLink key={name} href={`#company-${i}`}>
                  {name}
                </GlidingMenuLink>
              ))}
            </div>
          </GlidingMenuItem>
        </GlidingMenu>
        <a href="#sign-in" className={cn(buttonStyles({ variant: "secondary", size: "sm" }), "max-sm:hidden")}>
          Sign in
        </a>
      </header>
      <main className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-3 gap-4 p-6">
        <div className="col-span-3 h-32 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </main>
    </div>
  );
}
