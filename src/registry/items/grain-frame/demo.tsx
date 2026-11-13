"use client";

import { Snowflake } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { GrainFrame } from "@/components/miyuki-ui/grain-frame";

export default function GrainFrameDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-10">
      <GrainFrame containerClassName="rounded-full p-1 shadow-sm">
        <Button
          variant="secondary"
          iconStart={<Snowflake />}
          className="rounded-full border-transparent px-5 shadow-none"
        >
          Start a free season
        </Button>
      </GrainFrame>
      <GrainFrame containerClassName="rounded-2xl p-1.5 shadow-md" noiseIntensity={0.28}>
        <div className="w-64 rounded-[12px] bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">Hakuba season pass</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            131 days on eleven resorts, from 14 December to late April.
          </p>
        </div>
      </GrainFrame>
    </div>
  );
}
