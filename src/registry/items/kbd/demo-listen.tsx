"use client";

import { KbdCombo } from "@/components/miyuki-ui/kbd";

const combos = [
  { keys: "mod+enter", name: "Add a stop" },
  { keys: "alt+shift+n", name: "Start a new day" },
  { keys: "mod+/", name: "Show all shortcuts" },
];

export default function KbdListenDemo() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      <p className="text-center text-sm text-pretty text-muted-foreground">
        Press one of these shortcuts. Each key goes down while you hold it.
      </p>
      <ul className="flex flex-wrap justify-center gap-x-12 gap-y-6">
        {combos.map((combo) => (
          <li key={combo.keys} className="flex flex-col items-center gap-2.5">
            <KbdCombo keys={combo.keys} listen />
            <span className="text-sm text-foreground">{combo.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
