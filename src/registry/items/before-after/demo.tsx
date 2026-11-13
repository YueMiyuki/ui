"use client";

import { BeforeAfter } from "@/components/miyuki-ui/before-after";
import { landscape } from "@/registry/lib/art";

export default function BeforeAfterDemo() {
  return (
    <BeforeAfter
      first={landscape("yotei-ridge", { mood: "day", width: 1280, height: 800 })}
      second={landscape("yotei-ridge", { mood: "night", width: 1280, height: 800 })}
      labels={["Noon", "Midnight"]}
      className="max-w-[640px] shadow-md"
    />
  );
}
