"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { ContourCard } from "@/components/miyuki-ui/contour-card";

const facts = [
  { label: "Ascent", value: "1,548 m" },
  { label: "Distance", value: "10.6 km" },
  { label: "Time", value: "7 h 10 min" },
];

export default function ContourCardDemo() {
  return (
    <ContourCard
      seed="yotei"
      interval={40}
      range={[980, 1898]}
      className="flex h-[440px] w-full max-w-[380px] flex-col"
    >
      <p className="text-sm text-muted-foreground">Makkari trail, Hokkaidō</p>
      <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Mount Yōtei</h3>
      <p className="mt-2 font-display text-5xl leading-none font-semibold tracking-[-0.03em] tabular-nums">1,898 m</p>
      <div className="mt-auto">
        <dl className="grid grid-cols-3 gap-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <Button variant="secondary" className="mt-5 w-full" iconStart={<Download aria-hidden="true" />}>
          Download GPX
        </Button>
      </div>
    </ContourCard>
  );
}
