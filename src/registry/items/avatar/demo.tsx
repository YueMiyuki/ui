"use client";

import { Avatar } from "@/components/miyuki-ui/avatar";
import { people } from "@/registry/lib/data";

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

export default function AvatarDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-end gap-4">
        {sizes.map((size, i) => (
          <Avatar key={size} size={size} src={people[i].avatar} name={people[i].name} />
        ))}
      </div>
      <div className="flex items-end gap-4">
        {sizes.map((size, i) => (
          <Avatar key={size} size={size} shape="rounded" src={people[i + 5].avatar} name={people[i + 5].name} />
        ))}
      </div>
    </div>
  );
}
