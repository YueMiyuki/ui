"use client";

import { PondButton } from "@/components/miyuki-ui/pond-button";

export default function PondButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <PondButton size="lg">Cast off</PondButton>
      <PondButton size="lg" variant="brand">
        Take a reading
      </PondButton>
      <PondButton size="lg" variant="secondary">
        Cancel
      </PondButton>
    </div>
  );
}
