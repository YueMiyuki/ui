"use client";

import { CloudSnow } from "lucide-react";
import { RimLightButton } from "@/components/miyuki-ui/rim-light-button";

export default function RimLightButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <RimLightButton>
        <CloudSnow className="text-brand-strong" />
        Open the avalanche bulletin
      </RimLightButton>
      <RimLightButton containerClassName="rounded-lg" className="px-3.5" duration={3} clockwise={false}>
        Subscribe
      </RimLightButton>
    </div>
  );
}
