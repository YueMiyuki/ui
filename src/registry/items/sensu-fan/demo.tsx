"use client";

import { SensuFan } from "@/components/miyuki-ui/sensu-fan";
import { landscape } from "@/registry/lib/art";

export default function SensuFanDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <SensuFan label="Fan painted with dusk over the Hakuba valley">
        <img
          src={landscape("hakuba-fan", { width: 960, height: 552, mood: "dusk" })}
          alt=""
          className="size-full object-cover"
        />
      </SensuFan>
      <p className="text-[13px] text-muted-foreground">Press the fan to open it.</p>
    </div>
  );
}
