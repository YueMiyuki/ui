"use client";

import { WindRose } from "@/components/miyuki-ui/wind-rose";

const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const totals = [6.2, 2.8, 1.9, 1.4, 1.2, 1.0, 1.1, 1.4, 2.2, 2.9, 4.1, 6.3, 11.8, 18.7, 21.4, 13.2];
const bands = ["0–4", "4–8", "8–12", "12–16", "16+"];

const data = directions.map((direction, i) => {
  const strength = totals[i] / 21.4;
  const centre = 0.5 + 2.7 * strength;
  const weights = bands.map((_, k) => Math.exp(-((k - centre) ** 2) / 1.6));
  const sum = weights.reduce((a, b) => a + b, 0);
  return { direction, bands: weights.map((w) => Math.round((w / sum) * totals[i] * 10) / 10) };
});

export default function WindRoseDemo() {
  return <WindRose className="w-full max-w-[440px]" label="Summit wind, January" data={data} bands={bands} />;
}
