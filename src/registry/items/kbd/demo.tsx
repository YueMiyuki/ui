"use client";

import { KbdCombo } from "@/components/miyuki-ui/kbd";

const shortcuts = [
  { name: "Search stations", keys: "mod+k" },
  { name: "Add a stop", keys: "mod+enter" },
  { name: "Move stop up", keys: "alt+arrowup" },
  { name: "Move stop down", keys: "alt+arrowdown" },
  { name: "Save the itinerary", keys: "mod+s" },
  { name: "Share the trip", keys: "mod+shift+s" },
  { name: "Show the map", keys: "m" },
  { name: "Close the panel", keys: "esc" },
];

export default function KbdDemo() {
  return (
    <section className="w-full max-w-sm rounded-xl border border-border bg-card px-5 pt-4 pb-2 shadow-sm">
      <h3 className="text-sm font-medium text-foreground">Keyboard shortcuts</h3>
      <ul className="mt-2 divide-y divide-border">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4 py-2">
            <span className="min-w-0 text-sm text-foreground">{shortcut.name}</span>
            <KbdCombo keys={shortcut.keys} />
          </li>
        ))}
      </ul>
    </section>
  );
}
