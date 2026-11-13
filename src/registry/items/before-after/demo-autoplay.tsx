"use client";

import { BeforeAfter } from "@/components/miyuki-ui/before-after";
import { landscape } from "@/registry/lib/art";

export default function BeforeAfterAutoplayDemo() {
  return (
    <BeforeAfter
      first={landscape("hakuba-valley", { mood: "day", width: 1280, height: 800 })}
      second={landscape("hakuba-valley", { mood: "snow", width: 1280, height: 800 })}
      labels={["August", "February"]}
      mode="hover"
      autoplay
      className="max-w-[640px] shadow-md"
    />
  );
}
