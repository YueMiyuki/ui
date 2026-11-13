"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { DotMatrixDisplay, type DotMatrixTransition } from "@/components/miyuki-ui/dot-matrix-display";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";

const trains = [
  { time: "07:05", to: "NISEKO", note: "Local · cars 1–2" },
  { time: "07:30", to: "HAKODATE", note: "Express · reserved" },
  { time: "07:52", to: "YOICHI", note: "Local · 2 cars" },
  { time: "08:15", to: "NEW CHITOSE", note: "Rapid · cars 1–6" },
];

export default function DotMatrixTransitionsDemo() {
  const [kind, setKind] = useState<DotMatrixTransition>("wipe");
  const [index, setIndex] = useState(0);
  const train = trains[index];

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <DotMatrixDisplay
        className="w-full"
        cols={104}
        transition={kind}
        text={[`${train.time} ${train.to}`, { text: train.note, tone: "dim" }]}
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SegmentedControl
          aria-label="Transition"
          selectedKeys={[kind]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) setKind(next as DotMatrixTransition);
          }}
        >
          <Segment id="wipe">Wipe</Segment>
          <Segment id="rain">Rain</Segment>
          <Segment id="blink">Blink</Segment>
        </SegmentedControl>
        <Button variant="secondary" onPress={() => setIndex((i) => (i + 1) % trains.length)}>
          Next train
        </Button>
      </div>
    </div>
  );
}
