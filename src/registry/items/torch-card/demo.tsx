"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { TorchCard } from "@/components/miyuki-ui/torch-card";

const included = [
  "A bunk and blankets",
  "Dinner and breakfast",
  "Drying room for boots and skins",
  "Weather briefing at 05:30",
];

export default function TorchCardDemo() {
  return (
    <TorchCard className="w-full max-w-sm">
      <h3 className="text-lg font-semibold tracking-[-0.01em]">What a hut booking includes</h3>
      <p className="mt-1 text-sm text-muted-foreground">Every hut on the Hakuba ridge, December to April.</p>
      <ul className="mt-6 space-y-3.5 text-sm">
        {included.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
              <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
            </span>
            {item}
          </li>
        ))}
      </ul>
      <Button className="mt-7 w-full">Check availability</Button>
    </TorchCard>
  );
}
