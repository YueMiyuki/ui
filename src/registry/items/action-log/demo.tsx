"use client";

import { useEffect, useState } from "react";
import { type ActionItem, type ActionKind, ActionLog } from "@/components/miyuki-ui/action-log";

const script: { kind: ActionKind; now: string; then: string; detail?: string; ms: number }[] = [
  { kind: "search", now: "Searching", then: "Searched", detail: "avalanche risk Hakuba", ms: 1400 },
  { kind: "read", now: "Reading", then: "Read", detail: "bulletin-0214.pdf", ms: 2300 },
  { kind: "read", now: "Reading", then: "Read", detail: "forecast-happo-one.json", ms: 1600 },
  { kind: "think", now: "Comparing three forecasts", then: "Compared three forecasts", ms: 2600 },
  { kind: "run", now: "Running", then: "Ran", detail: "huts --near happo --night 14", ms: 1900 },
  { kind: "write", now: "Drawing", then: "Drew", detail: "route-saturday.gpx", ms: 2100 },
  { kind: "write", now: "Writing", then: "Wrote", detail: "packing-list.md", ms: 1500 },
];

export default function ActionLogDemo() {
  const [tick, setTick] = useState(1);

  useEffect(() => {
    const delay = tick > script.length ? 3000 : tick === 0 ? 500 : script[tick - 1].ms;
    const id = window.setTimeout(() => setTick((t) => (t > script.length ? 0 : t + 1)), delay);
    return () => window.clearTimeout(id);
  }, [tick]);

  const items: ActionItem[] = script.slice(0, Math.min(tick, script.length)).map((s, i) => {
    const running = i === tick - 1;
    return {
      id: String(i),
      kind: s.kind,
      label: running ? s.now : s.then,
      detail: s.detail,
      status: running ? "running" : "done",
    };
  });

  return (
    <div className="h-[252px] w-full max-w-[460px]">
      <ActionLog items={items} aria-label="What the route planner has done" />
    </div>
  );
}
