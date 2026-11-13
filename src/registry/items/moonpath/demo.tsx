"use client";

import { Moonpath } from "@/components/miyuki-ui/moonpath";

export default function MoonpathDemo() {
  return (
    <Moonpath className="dark flex size-full flex-col items-start px-7 pt-9 text-foreground sm:px-12 sm:pt-12">
      <h2 className="max-w-[9ch] font-display text-4xl leading-[1.05] font-semibold tracking-[-0.025em] sm:max-w-none sm:text-5xl">
        Moonrise <span className="tabular-nums">18:42</span>
      </h2>
      <p className="mt-3 text-base text-muted-foreground">Full moon over Lake Tōya.</p>
    </Moonpath>
  );
}
