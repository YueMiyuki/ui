"use client";

import { Button } from "@/components/miyuki-ui/button";
import { ShowcaseCarousel } from "@/components/miyuki-ui/showcase-carousel";
import { places } from "@/registry/lib/data";

const slides = ["Otaru", "Hakuba", "Nozawa", "Shirakawa", "Niseko"].map((name) => {
  const place = places.find((p) => p.name === name)!;
  return {
    title: place.name,
    src: place.image,
    action: (
      <Button size="sm" aria-label={`Open guide to ${place.name}`}>
        Open guide
      </Button>
    ),
  };
});

export default function ShowcaseCarouselDemo() {
  return <ShowcaseCarousel slides={slides} defaultIndex={1} aria-label="Winter guides" />;
}
