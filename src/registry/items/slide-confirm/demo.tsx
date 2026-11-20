"use client";

import { useState } from "react";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { SlideConfirm } from "@/components/miyuki-ui/slide-confirm";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SlideConfirmDemo() {
  const [round, setRound] = useState(0);

  return (
    <div className="flex w-full max-w-[360px] flex-col items-center gap-4">
      <SlideConfirm
        label="Slide to book the 06:42"
        confirmedLabel="Booked on the 06:42"
        resetKey={round}
        onConfirm={() => wait(1400)}
      />
      <LinkButton tone="muted" size="sm" onPress={() => setRound((r) => r + 1)}>
        Reset
      </LinkButton>
    </div>
  );
}
