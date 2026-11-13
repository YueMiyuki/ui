"use client";

import { Folder, GitBranch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";
import { PromptConsole } from "@/components/miyuki-ui/prompt-console";

const models = [
  { id: "standard", name: "Standard", description: "Quick answers for everyday plans." },
  { id: "fine", name: "Fine mesh", description: "Slower. Reads every bulletin in full." },
  { id: "ensemble", name: "Ensemble", description: "Weighs several forecasts first." },
];

const context = [
  { id: "branch", icon: <GitBranch />, label: "plan/hakuba-14feb" },
  { id: "folder", icon: <Folder />, label: "routes/hakuba" },
];

export default function PromptConsoleDemo() {
  const [status, setStatus] = useState<PromptBoxStatus>("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <PromptConsole
      className="max-w-[560px]"
      placeholder="What do you need today?"
      defaultMode="auto"
      models={models}
      defaultModel="standard"
      context={context}
      status={status}
      onSend={() => {
        setStatus("streaming");
        timer.current = window.setTimeout(() => setStatus("idle"), 3000);
      }}
      onStop={() => {
        window.clearTimeout(timer.current);
        setStatus("idle");
      }}
    />
  );
}
