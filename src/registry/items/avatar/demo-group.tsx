"use client";

import { Avatar, AvatarGroup } from "@/components/miyuki-ui/avatar";
import { people } from "@/registry/lib/data";

const crew = people.slice(0, 5);

export default function AvatarGroupDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <AvatarGroup max={4} size="lg" aria-label="Hakuba ridge crew">
          {crew.map((p) => (
            <Avatar key={p.handle} src={p.avatar} name={p.name} />
          ))}
        </AvatarGroup>
        <p className="text-[13px] text-muted-foreground">5 going on Saturday</p>
      </div>
      <AvatarGroup max={4} size="sm" aria-label="Hakuba ridge crew">
        {crew.map((p) => (
          <Avatar key={p.handle} src={p.avatar} name={p.name} />
        ))}
      </AvatarGroup>
    </div>
  );
}
