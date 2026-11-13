"use client";

import { Barometer } from "@/components/miyuki-ui/barometer";

export default function BarometerDemo() {
  return (
    <Barometer
      className="w-full max-w-[380px]"
      label="Otaru harbour"
      note="Sea-level pressure at 12:00"
      value={1008}
      previous={1012}
    />
  );
}
