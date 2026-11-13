"use client";

import { CodeBlock } from "@/components/miyuki-ui/code-block";

const station = `station: hakuba-happo
elevation_m: 1831
refresh: 10m
alerts:
  - kind: wind
    above_m: 2000
    gust_kmh: 70
  - kind: snowfall
    cm_per_hour: 4
`;

export default function CodeBlockFileDemo() {
  return (
    <CodeBlock
      code={station}
      language="yaml"
      filename="station.yaml"
      highlightLines={[7]}
      className="w-full max-w-md"
    />
  );
}
