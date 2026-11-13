"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { ShojiReveal } from "@/components/miyuki-ui/shoji-reveal";
import { landscape } from "@/registry/lib/art";

const view = landscape("kiso-room-12", { width: 1280, height: 720, mood: "snow" });

export default function ShojiRevealDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-5">
      <ShojiReveal open={open} onOpenChange={setOpen} className="aspect-[16/9] w-full">
        <img src={view} alt="Snow on the ridges above the Kiso valley" className="size-full object-cover" />
      </ShojiReveal>
      <Button variant="secondary" onPress={() => setOpen(!open)}>
        {open ? "Close the screens" : "Open the screens"}
      </Button>
    </div>
  );
}
