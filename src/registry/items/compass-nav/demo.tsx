"use client";

import { useRef, useState } from "react";
import { CompassNav } from "@/components/miyuki-ui/compass-nav";

const routes = [
  {
    id: "route-north-face",
    label: "North face",
    bearing: 0,
    detail: "Grade III · 6 h",
    text: "Steep snow to the shoulder, then a rock band at 1,700 m with fixed ropes. Start before dawn; the face loses its shade by ten.",
  },
  {
    id: "route-summit-hut",
    label: "Summit hut",
    bearing: 45,
    detail: "Open June to October",
    text: "Eighteen bunks under the north-east rim. In winter the shell is left open as a refuge, with a stove and two days of fuel.",
  },
  {
    id: "route-east-ridge",
    label: "East ridge",
    bearing: 90,
    detail: "Grade II · 4 h 30",
    text: "The long, airy way up. Corniced on the left all winter; keep to the windward side and the snow stays firm.",
  },
  {
    id: "route-south-col",
    label: "South col",
    bearing: 180,
    detail: "Grade I · 3 h",
    text: "The gentlest line, through birch and then open snowfields to the col at 1,540 m. Good for skis down.",
  },
  {
    id: "route-west-bowl",
    label: "West bowl",
    bearing: 270,
    detail: "Avalanche risk: moderate",
    text: "A wide bowl that holds the deepest powder on the mountain and loads quickly in a west wind. Check the bulletin first.",
  },
];

export default function CompassNavDemo() {
  const notes = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState("route-north-face");
  const chosen = routes.find((r) => r.id === route)!;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <CompassNav
          items={routes.map(({ id, label, bearing }) => ({ id, label, bearing }))}
          value={route}
          onChange={setRoute}
          container={notes}
          size={320}
        />
        <p className="text-sm text-muted-foreground">
          Heading for <span className="font-medium text-foreground">{chosen.label}</span>{" "}
          <span className="tabular-nums">{String(chosen.bearing).padStart(3, "0")}°</span>
        </p>
      </div>
      <div
        ref={notes}
        className="h-72 w-full min-w-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="space-y-6 px-5 pt-5 pb-40">
          {routes.map((r) => (
            <section key={r.id} id={r.id} className="scroll-mt-5">
              <h3 className="font-display text-lg leading-tight font-semibold tracking-[-0.01em]">{r.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.text}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
