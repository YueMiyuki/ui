"use client";

import { TripPlanner } from "@/components/miyuki-ui/trip-planner";
import { topo } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const party = ["Aiko Tanaka", "Lars Eriksen", "Mei Watanabe"].map((name) => {
  const p = people.find((x) => x.name === name) ?? people[0];
  return { name: p.name, role: p.role, avatar: p.avatar };
});

export default function TripPlannerDemo() {
  return <TripPlanner map={topo("kamoshika-traverse", { width: 1200, height: 760 })} party={party} />;
}
