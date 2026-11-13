"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { SearchField } from "@/components/miyuki-ui/search-field";
import { people } from "@/registry/lib/data";

const crew = people.slice(0, 8);

export default function SearchFieldFilterDemo() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function search(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setApplied(value), value === "" ? 0 : 420);
  }

  const needle = applied.trim().toLowerCase();
  const matches = crew.filter((p) => p.name.toLowerCase().includes(needle));

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <SearchField
        aria-label="Search the crew"
        placeholder="Search by name"
        value={query}
        onChange={search}
        isPending={query !== applied}
      />
      <ul className="flex h-72 flex-col" aria-live="polite">
        {matches.map((p) => (
          <li key={p.handle} className="flex h-9 shrink-0 items-center gap-2.5 px-1">
            <Avatar size="sm" src={p.avatar} name={p.name} />
            <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
            <span className="ms-auto truncate ps-3 text-[13px] text-muted-foreground">{p.role}</span>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-1 py-8 text-center text-sm text-muted-foreground">No one by that name.</li>
        )}
      </ul>
    </div>
  );
}
