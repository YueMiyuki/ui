"use client";

import { GoalRings } from "@/components/miyuki-ui/goal-rings";
import { formatNumber } from "@/components/miyuki-ui/lib/chart";

export default function GoalRingsDemo() {
  return (
    <GoalRings
      className="w-full max-w-[440px]"
      label="Activity"
      note="Saturday 11 July, Hakuba"
      rings={[
        { name: "Move", value: 1592, goal: 1800, format: (v) => `${formatNumber(v)} kcal` },
        { name: "Exercise", value: 105, goal: 90, format: (v) => `${Math.floor(v / 60)} h ${v % 60} m` },
        { name: "Distance", value: 5.2, goal: 8, format: (v) => `${formatNumber(v, 1)} km` },
      ]}
    />
  );
}
