"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SnowCrystal } from "@/components/miyuki-ui/snow-crystal";
import { people } from "@/registry/lib/data";

const SEEDS = [913, 2768, 86, 4410, 42, 17, 1001, 307];

export default function SnowCrystalDemo() {
  const [index, setIndex] = useState(0);
  const seed = SEEDS[index % SEEDS.length] + Math.floor(index / SEEDS.length);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-5">
        <SnowCrystal seed={seed} size={200} complexity={4} animate label="Snow crystal" className="text-brand" />
        <Button variant="secondary" onPress={() => setIndex((i) => i + 1)}>
          Grow another
        </Button>
      </div>
      <ul className="grid w-full grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-8">
        {people.slice(0, 8).map((person) => (
          <li key={person.handle} className="flex flex-col items-center gap-2.5 text-center">
            <SnowCrystal seed={person.name} size={48} className="text-foreground" />
            <span className="text-xs text-balance text-muted-foreground">{person.name}</span>
          </li>
        ))}
      </ul>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <SnowCrystal seed="loading" size={18} complexity={2} spin className="text-brand" />
        Loading
      </p>
    </div>
  );
}
