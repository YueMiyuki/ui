"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SteppingStones } from "@/components/miyuki-ui/stepping-stones";

const steps = [
  { id: "permit", label: "Permit" },
  { id: "kit", label: "Kit check" },
  { id: "briefing", label: "Briefing" },
  { id: "depart", label: "Depart" },
];

export default function SteppingStonesVerticalDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className="flex items-center gap-10">
      <SteppingStones
        aria-label="Before the climb"
        orientation="vertical"
        steps={steps}
        current={step}
        onStepChange={setStep}
      />
      <div className="flex flex-col gap-2">
        <Button
          onPress={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          isDisabled={step === steps.length - 1}
        >
          Next step
        </Button>
        <Button variant="ghost" onPress={() => setStep(0)} isDisabled={step === 0}>
          Start again
        </Button>
      </div>
    </div>
  );
}
