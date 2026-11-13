"use client";

import { CodeBlock } from "@/components/miyuki-ui/code-block";

const forecast = `export interface Forecast {
  station: string;
  snowfallCm: number;
  windKmh: number;
  updatedAt: Date;
}

export async function getForecast(station: string): Promise<Forecast> {
  const res = await fetch(\`/api/forecast/\${encodeURIComponent(station)}\`);
  if (!res.ok) throw new Error(\`No forecast for \${station}\`);

  const data = await res.json();
  return { ...data, updatedAt: new Date(data.updatedAt) };
}
`;

const test = `import { getForecast } from "./forecast";

describe("getForecast", () => {
  it("reads the overnight snowfall for Hakuba", async () => {
    globalThis.fetch = async () =>
      Response.json({
        station: "hakuba",
        snowfallCm: 34,
        updatedAt: "2026-01-14T06:00:00Z",
      });

    const forecast = await getForecast("hakuba");
    expect(forecast.snowfallCm).toBe(34);
    expect(forecast.updatedAt.getUTCHours()).toBe(6);
  });
});
`;

export default function CodeBlockDemo() {
  return (
    <CodeBlock
      showLineNumbers
      tabs={[
        { name: "forecast.ts", code: forecast, language: "ts", highlightLines: [9, 10] },
        { name: "forecast.test.ts", code: test, language: "ts" },
      ]}
      className="w-full max-w-2xl"
    />
  );
}
