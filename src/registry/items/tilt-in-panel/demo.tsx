"use client";

import { TiltInPanel } from "@/components/miyuki-ui/tilt-in-panel";
import { landscape } from "@/registry/lib/art";

const days = [
  ["First lifts", "The gondola at Happo opens at 08:00; the upper chairs follow once patrol has checked the ridge."],
  ["Wind holds", "Gusts over 18 m/s close the summit quad. The bulletin flags it the evening before."],
  ["Last run", "Lifts stop at 16:30. In January the light goes flat around three, so plan the long runs early."],
];

export default function TiltInPanelDemo() {
  return (
    <div>
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-sm">
          <span className="font-semibold">Kitakaze Outfitters</span>
          <span className="text-muted-foreground">Day planner</span>
        </div>
      </header>

      <TiltInPanel
        title={
          <>
            <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-6xl">
              Plan the day before the lifts open
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Snow, wind and queues for every lift in Hakuba, ready by six in the morning.
            </p>
          </>
        }
      >
        <div className="relative">
          <img
            src={landscape("lifts-dawn", { mood: "dawn", width: 1600, height: 1000 })}
            alt="Dawn light on the ridges above the Hakuba valley"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="absolute bottom-3 left-3 rounded-xl border border-foreground/10 bg-card/70 px-3.5 py-2.5 shadow-md backdrop-blur-xl sm:bottom-5 sm:left-5">
            <p className="text-[13px] text-muted-foreground">Happo-one, 06:10</p>
            <p className="text-sm font-medium tabular-nums">−9° at the top, 14 cm overnight</p>
          </div>
        </div>
      </TiltInPanel>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-24 sm:grid-cols-3">
        {days.map(([title, text]) => (
          <div key={title}>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm/6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
