"use client";

import { OutlineLettering } from "@/components/miyuki-ui/outline-lettering";

export default function OutlineLetteringDemo() {
  return (
    <div className="relative size-full min-h-60">
      <OutlineLettering
        text="yuki"
        className="absolute inset-x-6 inset-y-6 w-auto font-display font-extrabold tracking-[-0.01em] sm:inset-x-12"
      />
    </div>
  );
}
