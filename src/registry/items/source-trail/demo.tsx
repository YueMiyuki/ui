"use client";

import { useEffect, useState } from "react";
import { SourceTrail, type TrailSource } from "@/components/miyuki-ui/source-trail";

const found = [
  { title: "Avalanche bulletin for Hakuba, 14 February", domain: "hakuba-avalanche.example" },
  { title: "Northern Alps snowpack report, week 7", domain: "snowpack-japan.example" },
  { title: "Happo-one hourly mountain forecast", domain: "mountain-forecast.example" },
  { title: "Wind slabs on east-facing slopes and what to watch for", domain: "backcountry-notes.example" },
  { title: "Hut and refuge status in the Hakuba valley", domain: "hakuba-huts.example" },
  { title: "Field observations from Tsugaike, 13 February", domain: "field-obs.example" },
];

const ARRIVE = 900;
const READ = 1500;

export default function SourceTrailDemo() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const end = (found.length - 1) * ARRIVE + READ + 4000;
    const id = window.setTimeout(() => setElapsed((t) => (t >= end ? 0 : t + 100)), 100);
    return () => window.clearTimeout(id);
  }, [elapsed]);

  const sources: TrailSource[] = found
    .filter((_, i) => elapsed >= i * ARRIVE)
    .map((s, i) => ({ ...s, status: elapsed >= i * ARRIVE + READ ? "done" : "reading" }));

  return (
    <div className="h-[372px] w-full max-w-[520px]">
      <SourceTrail query="avalanche risk Hakuba 14 February" sources={sources} />
    </div>
  );
}
