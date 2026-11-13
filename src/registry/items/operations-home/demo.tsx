"use client";

import { OperationsHome } from "@/components/miyuki-ui/operations-home";
import { people } from "@/registry/lib/data";

const avatars = Object.fromEntries(people.map((p) => [p.name, p.avatar]));

export default function OperationsHomeDemo() {
  return <OperationsHome user={{ name: "Yuna Sato", email: "yuna@shirakaba.example" }} avatars={avatars} />;
}
