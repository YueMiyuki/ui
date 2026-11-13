"use client";

import { Clock, Snowflake } from "lucide-react";
import { useState } from "react";
import { Chip } from "@/components/miyuki-ui/chip";
import { LinkButton } from "@/components/miyuki-ui/link-button";

const filters = [
  { id: "powder", label: "Powder", icon: <Snowflake /> },
  { id: "budget", label: "Under ¥10,000" },
  { id: "onsen", label: "Onsen nearby" },
  { id: "open", label: "Open tonight", icon: <Clock /> },
];

export default function ChipDemo() {
  const [active, setActive] = useState(filters.map((f) => f.id));
  const shown = filters.filter((f) => active.includes(f.id));

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-foreground">
          Inns in Nozawa{" "}
          <span className="font-normal text-muted-foreground tabular-nums">· {148 - shown.length * 23} results</span>
        </p>
        <LinkButton
          tone="brand"
          size="sm"
          isDisabled={shown.length === filters.length}
          onPress={() => setActive(filters.map((f) => f.id))}
        >
          Reset
        </LinkButton>
      </div>
      <div className="flex min-h-7 flex-wrap gap-2">
        {shown.map((f) => (
          <Chip key={f.id} icon={f.icon} onRemove={() => setActive((ids) => ids.filter((id) => id !== f.id))}>
            {f.label}
          </Chip>
        ))}
        {shown.length === 0 && (
          <p className="text-[13px] leading-7 text-muted-foreground">No filters. Showing every inn.</p>
        )}
      </div>
    </div>
  );
}
