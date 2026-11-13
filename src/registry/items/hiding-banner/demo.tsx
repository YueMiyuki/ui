"use client";

import { HidingBanner } from "@/components/miyuki-ui/hiding-banner";
import { landscape } from "@/registry/lib/art";

const paragraphs = [
  "The canal freezes from the edges in. By the second week of January the warehouses on the far bank stand in a white margin, and the gas lamps along the path come on at a quarter past four.",
  "Most visitors arrive on the 9:12 from Sapporo and walk the length of the water before lunch. If you stay the night, walk it again after ten, when the glass workshops have closed and the only sound is snow sliding off the roofs.",
  "Kitaichi Hall still lights its 167 oil lamps by hand every morning. The staff start at the door and work toward the back, and the room warms by a degree or two as they go.",
  "The fish market opens at five. Arrive by six for the crab and the sea urchin, and bring cash: four of the eleven stalls do not take cards.",
  "For the return, the coastal line runs every 20 minutes until 22:40. Sit on the right side of the train. Between Zenibako and Asari the track runs a few metres from the sea, and on a clear evening you can see the lights of Ishikari across the bay.",
  "Snow is forecast for most of the week, between 8 and 14 centimetres a day. The path along the canal is cleared by eight each morning; the steps up to Funami-zaka are not, so wear boots with a proper grip.",
];

export default function HidingBannerDemo() {
  return (
    <div className="min-h-full">
      <HidingBanner dismissible>
        Winter timetable: trains to Otaru run every 20 minutes from 1 December.{" "}
        <a
          href="#timetable"
          className="font-medium text-brand-strong underline decoration-brand-strong/30 underline-offset-4 outline-none hover:decoration-brand-strong focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          See the times
        </a>
      </HidingBanner>

      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6 text-sm">
          <span className="font-semibold">Hokkaido Rail Notes</span>
          <span className="text-muted-foreground">Issue 42</span>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-6 pt-12 pb-24">
        <p className="text-[13px] text-muted-foreground">Field notes, January</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-5xl">
          A winter week on the Otaru canal
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Scroll down and the banner steps aside. Scroll up and it returns.
        </p>
        <img
          src={landscape("otaru-canal", { width: 1200, height: 640, mood: "snow" })}
          alt="Snow falling over mountains and still water"
          className="mt-8 aspect-[15/8] w-full rounded-2xl object-cover"
        />
        <div className="mt-8 space-y-5 text-base leading-relaxed text-foreground/90">
          {paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          <h2 id="timetable" className="pt-4 font-display text-2xl font-semibold">
            Timetable
          </h2>
          {paragraphs.slice(0, 3).map((text, i) => (
            <p key={`again-${i}`}>{text}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
