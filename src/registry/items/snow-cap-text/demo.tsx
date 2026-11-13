"use client";

import { useRef } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SnowCapText, type SnowCapTextHandle } from "@/components/miyuki-ui/snow-cap-text";

export default function SnowCapTextDemo() {
  const snow = useRef<SnowCapTextHandle>(null);

  return (
    <div className="flex flex-col items-center gap-8 pt-16 text-center">
      <h2 className="font-display text-[64px] leading-none font-bold tracking-[-0.02em] text-foreground sm:text-[120px] dark:text-brand">
        <SnowCapText ref={snow}>JANUARY</SnowCapText>
      </h2>
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">Hover a letter to knock its snow off.</p>
        <Button variant="secondary" size="sm" onPress={() => snow.current?.shake()}>
          Shake
        </Button>
      </div>
    </div>
  );
}
