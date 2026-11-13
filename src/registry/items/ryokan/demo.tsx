"use client";

import { Ryokan } from "@/components/miyuki-ui/ryokan";
import { landscape } from "@/registry/lib/art";

const images = {
  hero: landscape("kiritani-valley", { width: 1920, height: 1080, mood: "dusk" }),
  rooms: [
    landscape("shizuku-river-room", { width: 720, height: 900, mood: "snow" }),
    landscape("shizuku-garden-room", { width: 720, height: 900, mood: "dawn" }),
    landscape("shizuku-yukimi-room", { width: 720, height: 900, mood: "night" }),
  ],
  bath: landscape("kawa-no-yu", { width: 1600, height: 640, mood: "night" }),
};

export default function RyokanDemo() {
  return <Ryokan images={images} />;
}
