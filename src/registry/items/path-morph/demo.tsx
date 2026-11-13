"use client";

import { useState } from "react";
import { ToggleButton } from "react-aria-components";
import { MorphIcon, type MorphShapes, morphIcons, PlayPauseButton } from "@/components/miyuki-ui/path-morph";

function Toggle({ label, shapes, off, on }: { label: string; shapes: MorphShapes; off: string; on: string }) {
  return (
    <ToggleButton
      aria-label={label}
      className="inline-grid size-10 cursor-default place-items-center rounded-full text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-settle data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:scale-[0.94] data-[selected]:text-brand-strong"
    >
      {({ isSelected }) => <MorphIcon shapes={shapes} shape={isSelected ? on : off} size={20} />}
    </ToggleButton>
  );
}

export default function PathMorphDemo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex flex-col items-center gap-5">
      <PlayPauseButton size={64} playing={playing} onChange={setPlaying} />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Harbour at first light, Otaru</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
          {playing ? "Playing" : "Paused"} · 2:14 of 6:40
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Toggle label="Mute" shapes={morphIcons.soundOnOff} off="on" on="off" />
        <Toggle label="Like" shapes={morphIcons.heartFilled} off="outline" on="filled" />
        <Toggle label="Save" shapes={morphIcons.bookmark} off="off" on="on" />
      </div>
    </div>
  );
}
