"use client";

import { useId } from "react";
import { SnowdriftInput } from "@/components/miyuki-ui/snowdrift-input";

export default function SnowdriftInputDemo() {
  const id = useId();
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <p id={id} className="ps-5 text-sm text-muted-foreground">
        Where do you want to wake up?
      </p>
      <SnowdriftInput
        aria-labelledby={id}
        placeholders={["A hut above the clouds", "Somewhere with an onsen", "Within two hours of Sapporo"]}
      />
    </div>
  );
}
