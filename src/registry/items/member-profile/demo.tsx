"use client";

import { MemberProfile } from "@/components/miyuki-ui/member-profile";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const avatars = Object.fromEntries(people.map((p) => [p.name, p.avatar]));
const cover = landscape("otaru-winter", { width: 1600, height: 400, mood: "dawn" });

export default function MemberProfileDemo() {
  return <MemberProfile cover={cover} avatars={avatars} />;
}
