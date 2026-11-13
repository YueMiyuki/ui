"use client";

import { RippleCursor } from "@/components/miyuki-ui/ripple-cursor";

export default function RippleCursorDemo() {
  return (
    <RippleCursor className="grid h-[360px] w-full max-w-3xl place-items-center overflow-clip rounded-3xl bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--brand-soft)_55%,var(--background)),var(--brand-soft))] px-6 ring-1 ring-border ring-inset">
      <div className="text-center">
        <p className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
          Still water. Touch it.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Lake Tōya, a windless morning in February.</p>
      </div>
    </RippleCursor>
  );
}
