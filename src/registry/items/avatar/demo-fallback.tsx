"use client";

import { Avatar } from "@/components/miyuki-ui/avatar";
import { people } from "@/registry/lib/data";

export default function AvatarFallbackDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {people.slice(0, 6).map((p) => (
          <Avatar key={p.handle} size="lg" name={p.name} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {people.slice(6, 12).map((p) => (
          <Avatar key={p.handle} size="md" shape="rounded" name={p.name} />
        ))}
        <Avatar size="md" shape="rounded" />
      </div>
    </div>
  );
}
