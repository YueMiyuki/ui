"use client";

import { LanternButton } from "@/components/miyuki-ui/lantern-button";

export default function LanternButtonDemo() {
  return (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
      {(["dark", "light"] as const).map((scope) => (
        <div
          key={scope}
          className={`${scope} flex flex-col items-center gap-4 rounded-2xl border border-border bg-background px-6 py-10 text-foreground`}
        >
          <LanternButton size="lg">Open tonight</LanternButton>
          <p className="text-[13px] text-muted-foreground">Otaru canal stalls, from five</p>
        </div>
      ))}
    </div>
  );
}
