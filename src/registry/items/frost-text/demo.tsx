"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { FrostText } from "@/components/miyuki-ui/frost-text";

export default function FrostTextDemo() {
  const [thaw, setThaw] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const replay = () => {
    window.clearTimeout(timer.current);
    setThaw(true);
    timer.current = window.setTimeout(() => setThaw(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">Lake Tōya, 05:10</p>
        <h2 className="font-display text-[56px] leading-none font-semibold tracking-[-0.03em] sm:text-[96px]">
          <FrostText text="minus eleven" thaw={thaw} />
        </h2>
      </div>
      <Button variant="secondary" size="sm" iconStart={<RotateCcw />} onPress={replay}>
        Replay
      </Button>
    </div>
  );
}
