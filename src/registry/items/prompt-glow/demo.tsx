"use client";

import { useState } from "react";
import { PromptBox } from "@/components/miyuki-ui/prompt-box";
import { PromptGlow } from "@/components/miyuki-ui/prompt-glow";
import { Switch } from "@/components/miyuki-ui/switch";

export default function PromptGlowDemo() {
  const [working, setWorking] = useState(true);

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-7">
      <PromptGlow active={working} className="w-full">
        <PromptBox
          placeholder="Ask me anything"
          status={working ? "streaming" : "idle"}
          onSend={() => setWorking(true)}
          onStop={() => setWorking(false)}
        />
      </PromptGlow>
      <Switch isSelected={working} onChange={setWorking}>
        Working
      </Switch>
    </div>
  );
}
