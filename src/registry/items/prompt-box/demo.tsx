"use client";

import { Folder, GitBranch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PromptBox, type PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";

const models = [
  { id: "standard", name: "Standard", description: "Quick answers for everyday plans." },
  { id: "fine", name: "Fine mesh", description: "Slower. Reads every bulletin in full." },
  { id: "ensemble", name: "Ensemble", description: "Weighs several forecasts first." },
];

const context = [
  { id: "branch", icon: <GitBranch />, label: "plan/hakuba-14feb" },
  { id: "folder", icon: <Folder />, label: "routes/hakuba" },
];

export default function PromptBoxDemo() {
  const [status, setStatus] = useState<PromptBoxStatus>("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <PromptBox
      className="max-w-[560px]"
      status={status}
      models={models}
      defaultModel="fine"
      context={context}
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
