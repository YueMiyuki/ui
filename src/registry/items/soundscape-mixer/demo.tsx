"use client";

import { SoundscapeMixer } from "@/components/miyuki-ui/soundscape-mixer";

export default function SoundscapeMixerDemo() {
  return (
    <SoundscapeMixer
      title="Hut at night"
      defaultLevels={{ rain: 0.55, wind: 0.3, stream: 0.4, fire: 0.65 }}
      className="max-w-2xl"
    />
  );
}
