"use client";

import { useState } from "react";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Switch } from "@/components/miyuki-ui/switch";
import { VoiceOrb, type VoiceOrbState } from "@/components/miyuki-ui/voice-orb";

const captions: Record<VoiceOrbState, string> = {
  idle: "Ask about snow, trains or huts",
  listening: "Listening",
  thinking: "Reading the Hakuba bulletin",
  speaking: "Danger is considerable above 1,800 metres",
};

export default function VoiceOrbDemo() {
  const [state, setState] = useState<VoiceOrbState>("listening");
  const [mic, setMic] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8">
      <VoiceOrb state={state} useMic={mic} size={176} label="Weather assistant" />
      <p className="h-5 text-sm text-muted-foreground">{captions[state]}</p>
      <div className="flex flex-col items-center gap-4">
        <SegmentedControl
          aria-label="Assistant state"
          selectedKeys={[state]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) setState(next as VoiceOrbState);
          }}
        >
          <Segment id="idle">Idle</Segment>
          <Segment id="listening">Listen</Segment>
          <Segment id="thinking">Think</Segment>
          <Segment id="speaking">Speak</Segment>
        </SegmentedControl>
        <Switch size="sm" isSelected={mic} onChange={setMic}>
          Use microphone
        </Switch>
      </div>
    </div>
  );
}
