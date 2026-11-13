"use client";

import { DripButton } from "@/components/miyuki-ui/drip-button";

export default function DripButtonDemo() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-14 pb-12">
      <DripButton size="lg">Pour</DripButton>
      <DripButton size="lg" variant="primary">
        Steep 3 minutes
      </DripButton>
    </div>
  );
}
