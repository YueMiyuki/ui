"use client";

import { DepthOfField } from "@/components/miyuki-ui/depth-of-field";
import { places } from "@/registry/lib/data";

const cards = ["Otaru", "Hakuba", "Shirakawa", "Aomori", "Niseko", "Matsumoto"].map((name) => {
  const place = places.find((p) => p.name === name)!;
  return { title: place.name, subtitle: place.region, src: place.image };
});

export default function DepthOfFieldDemo() {
  return <DepthOfField cards={cards} className="w-full max-w-4xl" />;
}
