"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Slider } from "@/components/miyuki-ui/slider";
import { TrainWindow, type TrainWindowScene } from "@/components/miyuki-ui/train-window";

const scenes: TrainWindowScene[] = [
  { mood: "snow", seed: "kutchan" },
  { mood: "dusk", seed: "ginzan" },
  { mood: "night", seed: "niki" },
];

export default function TrainWindowDemo() {
  const [index, setIndex] = useState(0);
  const [kmh, setKmh] = useState(90);

  return (
    <div className="w-full max-w-[640px]">
      <TrainWindow
        scenes={scenes}
        index={index}
        onIndexChange={setIndex}
        speed={kmh / 90}
        caption="Hakodate line, km 212"
      />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <Slider
          label="Speed"
          value={kmh}
          onChange={(v) => setKmh(v as number)}
          minValue={0}
          maxValue={180}
          step={5}
          formatOptions={{ style: "unit", unit: "kilometer-per-hour" }}
          className="w-full max-w-64"
        />
        <Button variant="secondary" onPress={() => setIndex((i) => (i + 1) % scenes.length)}>
          Next view
        </Button>
      </div>
    </div>
  );
}
