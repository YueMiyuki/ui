"use client";

import { AvatarTags } from "@/components/miyuki-ui/avatar-tags";
import { people } from "@/registry/lib/data";

const crew = people.slice(0, 6).map((p) => ({
  id: p.handle,
  name: p.name,
  designation: p.role,
  image: p.avatar,
}));

export default function AvatarTagsDemo() {
  return <AvatarTags items={crew} aria-label="Weekend crew at the Hakuba hut" />;
}
