"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { HaikuReveal } from "@/components/miyuki-ui/haiku-reveal";

export default function HaikuRevealDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="flex flex-col items-center gap-8">
      <HaikuReveal
        key={run}
        seal="初雪"
        lines={["First snow on the pass", "the bus driver turns the heat", "up without a word"]}
        className="font-display text-[22px] leading-[1.55] font-semibold tracking-[-0.015em] sm:text-[36px]"
      />
      <Button variant="ghost" size="sm" iconStart={<RotateCcw />} onPress={() => setRun((n) => n + 1)}>
        Read again
      </Button>
    </div>
  );
}
