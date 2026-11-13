"use client";

import { Download, Flag, MapPin, Ruler, Share2 } from "lucide-react";
import { useState } from "react";
import { RippleMenu, type RippleMenuItem } from "@/components/miyuki-ui/ripple-menu";
import { topo } from "@/registry/lib/art";

const items: RippleMenuItem[] = [
  { id: "waypoint", label: "Add waypoint", icon: <MapPin /> },
  { id: "measure", label: "Measure", icon: <Ruler /> },
  { id: "share", label: "Share", icon: <Share2 /> },
  { id: "download", label: "Download", icon: <Download /> },
  { id: "report", label: "Report", icon: <Flag /> },
];

const W = 640;
const H = 360;

function elevation(y: number) {
  return Math.round(1620 + (1 - y / H) * 1180);
}

export default function RippleMenuDemo() {
  const [pins, setPins] = useState<{ x: number; y: number }[]>([{ x: 452, y: 118 }]);
  const [status, setStatus] = useState("Press and hold the map, right-click it, or use the button in the corner.");

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3">
      <RippleMenu
        items={items}
        aria-label="Map actions"
        className="h-[360px] w-full overflow-clip rounded-2xl border border-border bg-[color-mix(in_oklab,var(--brand-soft)_45%,var(--card))] shadow-sm dark:bg-card"
        onAction={(id, point) => {
          const metres = elevation(point.y).toLocaleString("en");
          if (id === "waypoint") {
            setPins((old) => [...old, point]);
            setStatus(`Waypoint ${pins.length + 1} added at ${metres} m.`);
          } else if (id === "measure") setStatus(`Measuring from ${metres} m. Hold again where you want to end.`);
          else if (id === "share") setStatus(`A link to this spot, ${metres} m, is ready to share.`);
          else if (id === "download") setStatus("This part of the map is saved for offline use.");
          else setStatus("Thanks. A ranger will look at this spot.");
        }}
      >
        <img
          src={topo("hakuba-ridge", { width: W * 2, height: H * 2, color: "#7f9ab4" })}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-80 dark:hidden"
        />
        <img
          src={topo("hakuba-ridge", { width: W * 2, height: H * 2, color: "#58779a" })}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 hidden size-full object-cover opacity-80 dark:block"
        />
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <path
            d="M48 318C112 296 150 262 196 248S286 236 318 198 372 150 418 136 470 116 512 84 572 58 604 40"
            fill="none"
            className="stroke-brand"
            strokeWidth={2.5}
            strokeDasharray="7 6"
            strokeLinecap="round"
          />
          <path d="M512 84l-9 15h18z" className="fill-foreground" />
        </svg>
        <span className="pointer-events-none absolute top-[54px] left-[78%] rounded-md bg-card/85 px-2 py-0.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-sm">
          Summit 2,932 m
        </span>
        <span className="pointer-events-none absolute top-4 left-4 rounded-lg bg-card/85 px-2.5 py-1.5 text-[13px] leading-4 shadow-xs backdrop-blur-sm">
          <span className="block font-medium text-foreground">Hakuba, east ridge</span>
          <span className="text-xs text-muted-foreground">1 : 25,000</span>
        </span>
        {pins.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute flex size-6 -translate-x-1/2 -translate-y-full items-center justify-center text-brand drop-shadow-sm"
            style={{ left: p.x, top: p.y }}
          >
            <MapPin className="size-6 fill-card" strokeWidth={2} />
          </span>
        ))}
      </RippleMenu>
      <p aria-live="polite" className="text-[13px] text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
