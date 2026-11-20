"use client";

import { PebbleFrame } from "@/components/miyuki-ui/pebble-frame";
import { people } from "@/registry/lib/data";

export default function PebbleFrameAvatarsDemo() {
  return (
    <ul aria-label="Speakers at the winter fair" className="flex flex-wrap justify-center gap-x-2 gap-y-6 sm:gap-x-5">
      {people.slice(0, 5).map((person) => (
        <li key={person.handle} className="flex w-[96px] flex-col items-center sm:w-[124px]">
          <PebbleFrame seed={person.handle} ring className="w-[72px] sm:w-24">
            <a href={`#${person.handle}`}>
              <img src={person.avatar} alt={person.name} draggable={false} className="size-full object-cover" />
            </a>
          </PebbleFrame>
          <div className="mt-3 text-center text-sm leading-tight font-medium text-foreground">{person.name}</div>
          <div className="mt-1 text-center text-xs leading-snug text-muted-foreground">{person.role}</div>
        </li>
      ))}
    </ul>
  );
}
