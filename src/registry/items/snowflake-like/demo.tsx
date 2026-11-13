"use client";

import { SnowflakeLike } from "@/components/miyuki-ui/snowflake-like";

const places = [
  { name: "Otaru canal walk", detail: "2.4 km, flat, lit until 22:00", size: "sm", count: 46 },
  { name: "Hakuba first lift", detail: "Happo gondola, 08:00", size: "md", count: 128, selected: true },
  { name: "Lake Tōya at dusk", detail: "North shore lookout", size: "lg", count: 312 },
] as const;

export default function SnowflakeLikeDemo() {
  return (
    <ul className="w-full max-w-sm divide-y divide-border rounded-2xl border border-border bg-card shadow-xs">
      {places.map((place) => (
        <li key={place.name} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{place.name}</p>
            <p className="truncate text-[13px] leading-5 text-muted-foreground">{place.detail}</p>
          </div>
          <SnowflakeLike
            size={place.size}
            count={place.count}
            label={`Save ${place.name}`}
            defaultSelected={"selected" in place}
          />
        </li>
      ))}
    </ul>
  );
}
