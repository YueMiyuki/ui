"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { EmptyState } from "@/components/miyuki-ui/empty-state";
import { SearchField } from "@/components/miyuki-ui/search-field";

const trails = [
  { name: "Kiso valley post road", detail: "Nagiso to Magome · 7.8 km · Easy" },
  { name: "Happō pond and ridge", detail: "Hakuba · 6.2 km · Moderate" },
  { name: "Lake Tōya rim walk", detail: "Tōyako · 11.4 km · Easy" },
  { name: "Nozawa beech woods", detail: "Nozawa Onsen · 4.9 km · Easy" },
  { name: "Shiratani cedar gorge", detail: "Yakushima · 9.6 km · Hard" },
];

export default function EmptyStateDemo() {
  const [query, setQuery] = useState("kiso ridge");
  const field = useRef<HTMLDivElement>(null);
  const words = query.trim().toLowerCase();
  const shown = trails.filter((trail) => trail.name.toLowerCase().includes(words));

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-3">
        <SearchField
          ref={field}
          aria-label="Filter trails"
          placeholder="Filter trails"
          value={query}
          onChange={setQuery}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          illustration="search"
          title={<>No trails match “{query.trim()}”</>}
          description="Try a shorter name, or clear the filters to see all five trails."
          actions={
            <>
              <Button
                size="sm"
                onPress={() => {
                  setQuery("");
                  field.current?.querySelector("input")?.focus();
                }}
              >
                Clear filters
              </Button>
              <Button size="sm" variant="secondary">
                Suggest a trail
              </Button>
            </>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((trail) => (
            <li key={trail.name} className="px-4 py-3">
              <p className="text-sm font-medium text-foreground">{trail.name}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{trail.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
