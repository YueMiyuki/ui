"use client";

import { ElevationProfile } from "@/components/miyuki-ui/elevation-profile";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const anchors: [km: number, m: number][] = [
  [0, 1850],
  [2.6, 2456],
  [3.5, 2380],
  [5.4, 2520],
  [7.0, 2932],
  [7.8, 2730],
  [9.0, 2812],
  [10.4, 2903],
  [11.8, 2560],
  [13.0, 2812],
  [14.0, 2700],
  [14.6, 2737],
  [18.4, 1250],
];

function build() {
  const rng = createRng("hakuba-ridge");
  const points = [{ km: 0, m: anchors[0][1] }];
  for (let s = 0; s < anchors.length - 1; s++) {
    const [k0, m0] = anchors[s];
    const [k1, m1] = anchors[s + 1];
    const steps = Math.round((k1 - k0) * 10);
    const phase = rng.range(0, Math.PI * 2);
    const waves = rng.range(0.6, 1.8);
    const lean = rng.range(-0.6, 0.6);
    const weights = Array.from({ length: steps }, (_, i) => {
      const u = (i + 0.5) / steps;
      return Math.max(0.08, 1 + 0.75 * Math.sin(phase + u * waves * Math.PI * 2) + lean * (u - 0.5) * 2);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < steps; i++) {
      acc += weights[i];
      points.push({ km: Math.round((k0 + (i + 1) / 10) * 10) / 10, m: Math.round(m0 + ((m1 - m0) * acc) / sum) });
    }
  }
  return points;
}

const points = build();

const waypoints = [
  { km: 0, name: "Tsugaike" },
  { km: 2.6, name: "Norikura" },
  { km: 3.5, name: "Oike hut" },
  { km: 7.0, name: "Hakuba-dake" },
  { km: 10.4, name: "Yari" },
  { km: 13.0, name: "Tengu" },
  { km: 18.4, name: "Sarukura" },
];

export default function ElevationProfileDemo() {
  return (
    <ElevationProfile
      className="w-full max-w-[600px]"
      label="Hakuba ridge traverse"
      points={points}
      waypoints={waypoints}
    />
  );
}
