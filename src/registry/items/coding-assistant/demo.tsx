"use client";

import { CodingAssistant } from "@/components/miyuki-ui/coding-assistant";
import { people } from "@/registry/lib/data";

const yuna = people[2];

export default function CodingAssistantDemo() {
  return <CodingAssistant user={{ name: yuna.name, email: yuna.email, avatar: yuna.avatar }} />;
}
