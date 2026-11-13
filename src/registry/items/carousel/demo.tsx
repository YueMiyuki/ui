"use client";

import { Carousel, CarouselItem } from "@/components/miyuki-ui/carousel";
import { places } from "@/registry/lib/data";

export default function CarouselDemo() {
  return (
    <Carousel aria-label="Places to stay this winter" className="max-w-3xl">
      {places.slice(0, 6).map((place) => (
        <CarouselItem key={place.name}>
          <img src={place.image} alt="" draggable={false} className="aspect-[4/3] w-full rounded-xl object-cover" />
          <p className="mt-3 text-sm font-medium text-foreground">{place.name}</p>
          <p className="text-[13px] text-muted-foreground">{place.region}</p>
        </CarouselItem>
      ))}
    </Carousel>
  );
}
