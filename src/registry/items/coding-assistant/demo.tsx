"use client";

import { CodingAssistant } from "@/components/miyuki-ui/coding-assistant";
import { people } from "@/registry/lib/data";

const yuna = people[2];
const members = [people[2], people[8], people[1], people[4]].map(({ name, role, avatar }) => ({ name, role, avatar }));

export default function CodingAssistantDemo() {
  return <CodingAssistant user={{ name: yuna.name, email: yuna.email, avatar: yuna.avatar }} members={members} />;
}
