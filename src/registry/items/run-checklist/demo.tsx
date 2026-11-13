"use client";

import { useEffect, useState } from "react";
import { RunChecklist, type RunStep } from "@/components/miyuki-ui/run-checklist";

const labels = [
  "Read the avalanche bulletin",
  "Compare three forecasts",
  "Check hut availability",
  "Match train times",
  "Draw the route",
  "Write the packing list",
];

function stepsAt(current: number): RunStep[] {
  return labels.map((label, i) => ({
    id: String(i),
    label,
    status: i < current ? "done" : i === current ? "running" : "pending",
  }));
}

export default function RunChecklistDemo() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(
      () => setCurrent((c) => (c >= labels.length ? 0 : c + 1)),
      current >= labels.length ? 3200 : 1900,
    );
    return () => window.clearTimeout(id);
  }, [current]);

  return <RunChecklist className="max-w-[440px]" title="Saturday on Happo-one" steps={stepsAt(current)} />;
}
