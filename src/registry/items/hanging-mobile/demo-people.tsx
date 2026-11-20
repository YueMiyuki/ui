"use client";

import { Avatar } from "@/components/miyuki-ui/avatar";
import { HangingMobile, type HangingMobileItem } from "@/components/miyuki-ui/hanging-mobile";
import { type Person, people } from "@/registry/lib/data";

function Face({ person, weight }: { person: Person; weight: number }) {
  const size = Math.round(52 * Math.sqrt(weight));
  return (
    <span
      title={`${person.name}, ${person.role}`}
      className="block rounded-full bg-card p-[3px] shadow-sm ring-1 ring-border"
    >
      <Avatar src={person.avatar} name={person.name} size="xl" style={{ width: size, height: size }} />
    </span>
  );
}

const hang = (person: Person, weight: number) => ({ node: <Face person={person} weight={weight} />, weight });

const mobile: HangingMobileItem = {
  left: { left: hang(people[1], 1), right: hang(people[2], 0.7) },
  right: {
    left: hang(people[0], 1.8),
    right: { left: hang(people[5], 1.3), right: hang(people[4], 0.8) },
  },
};

export default function HangingMobilePeopleDemo() {
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-3">
      <div className="text-center">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">Who is on the hill today</h3>
        <p className="mt-1 text-sm text-muted-foreground">Five out on the north ridge, back at the hut by 15:30.</p>
      </div>
      <HangingMobile items={mobile} height={380} seed="ridge" />
    </div>
  );
}
