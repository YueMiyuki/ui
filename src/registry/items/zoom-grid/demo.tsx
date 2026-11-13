"use client";

import { ZoomGrid } from "@/components/miyuki-ui/zoom-grid";
import { landscape } from "@/registry/lib/art";

const cards = [
  {
    id: "shirakawa",
    title: "Shirakawa",
    description: "Steep thatched farmhouses in a narrow valley, lit up on six evenings each January and February.",
    src: landscape("grid-shirakawa", { mood: "night", width: 1280, height: 800 }),
    alt: "Moonlight over a snowy valley at night",
    className: "@2xl:col-span-2",
  },
  {
    id: "nozawa",
    title: "Nozawa",
    description: "A hot spring village with thirteen free public baths and a ski hill at the end of the lane.",
    src: landscape("grid-nozawa", { mood: "snow", width: 1280, height: 800 }),
    alt: "Snow falling over soft mountain ridges",
  },
  {
    id: "lake-toya",
    title: "Lake Tōya",
    description: "A round caldera lake that never freezes, with an island in the middle and a volcano on the shore.",
    src: landscape("grid-toya", { mood: "dawn", width: 1280, height: 800 }),
    alt: "Dawn light over a still lake and distant peaks",
  },
  {
    id: "niseko",
    title: "Niseko",
    description: "Light, dry snow off the Sea of Japan, and Yōtei's near-perfect cone across the valley.",
    src: landscape("grid-niseko", { mood: "aurora", width: 1280, height: 800 }),
    alt: "Green light in the night sky above a mountain",
    className: "@2xl:col-span-2",
  },
];

export default function ZoomGridDemo() {
  return <ZoomGrid cards={cards} className="size-full p-4 sm:p-6" />;
}
