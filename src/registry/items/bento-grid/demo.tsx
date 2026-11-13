"use client";

import { Camera, CloudSnow, MapIcon, Thermometer, Users } from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/miyuki-ui/bento-grid";
import { avatar, landscape, topo } from "@/registry/lib/art";

const snowfall: [string, number][] = [
  ["Mon", 4],
  ["Tue", 11],
  ["Wed", 2],
  ["Thu", 0],
  ["Fri", 7],
  ["Sat", 9],
  ["Sun", 5],
];

function SnowChart() {
  return (
    <div className="flex h-full items-stretch gap-2 px-4 pt-3 pb-2.5">
      {snowfall.map(([day, cm]) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative w-full flex-1">
            <div
              className="absolute inset-x-0 bottom-0 flex min-h-0.5 flex-col items-center rounded-t-[5px] bg-brand/40 data-[peak]:bg-brand"
              data-peak={cm === 11 || undefined}
              style={{ height: `${(cm / 11) * 78}%` }}
            >
              <span className="absolute -top-5 text-xs text-muted-foreground tabular-nums">{cm}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{day}</span>
        </div>
      ))}
    </div>
  );
}

function OnShift() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex -space-x-3">
        {["Yuna Sato", "Amara Okafor", "Lars Eriksen"].map((name) => (
          <img
            key={name}
            src={avatar(name, 96)}
            alt={name}
            className="size-12 rounded-full bg-card ring-[3px] ring-muted"
          />
        ))}
      </div>
      <span className="rounded-full bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-xs">
        On shift until 18:00
      </span>
    </div>
  );
}

function Terrain() {
  const lines = topo("hakuba-terrain", { width: 480, height: 300 });
  return (
    <div className="relative size-full">
      <div
        className="absolute inset-0 bg-brand-strong/60"
        style={{ maskImage: `url("${lines}")`, maskSize: "cover", maskPosition: "center" }}
      />
      <span className="absolute top-[42%] left-[56%] size-2.5 rounded-full bg-destructive ring-4 ring-destructive/20" />
    </div>
  );
}

export default function BentoGridDemo() {
  return (
    <BentoGrid className="w-full max-w-4xl">
      <BentoGridItem
        className="@xl:col-span-2"
        header={<SnowChart />}
        icon={<CloudSnow />}
        title="Snowfall this week"
        description="38 cm at the summit station since Monday, most of it on Tuesday night."
      />
      <BentoGridItem
        tone="water"
        header={
          <div className="flex h-full flex-col justify-end p-4">
            <span className="font-display text-6xl leading-none font-semibold tracking-[-0.04em] tabular-nums">
              −14°
            </span>
            <span className="mt-2 text-xs text-brand-foreground/80">Summit station, 06:00</span>
          </div>
        }
        icon={<Thermometer />}
        title="Summit at dawn"
        description="Feels like −22° on the north ridge once the wind picks up."
      />
      <BentoGridItem
        header={
          <img
            src={landscape("lift-camera", { mood: "snow", width: 640, height: 400 })}
            alt="Lift camera view of snow on the upper slopes"
            className="size-full object-cover"
          />
        }
        icon={<Camera />}
        title="Lift cameras"
        description="Twelve webcams along the lifts, refreshed every five minutes."
      />
      <BentoGridItem
        header={<OnShift />}
        icon={<Users />}
        title="Forecasters on shift"
        description="Yuna, Amara and Lars read every bulletin before it goes out."
      />
      <BentoGridItem
        header={<Terrain />}
        icon={<MapIcon />}
        title="Avalanche terrain"
        description="Slopes steeper than 30° are shaded on every route map."
      />
    </BentoGrid>
  );
}
