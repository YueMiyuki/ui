"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SteppingStones } from "@/components/miyuki-ui/stepping-stones";

const steps = [
  { id: "dates", label: "Dates" },
  { id: "guests", label: "Guests" },
  { id: "room", label: "Room" },
  { id: "dinner", label: "Dinner" },
  { id: "confirm", label: "Confirm" },
];

const notes = [
  "Two nights, Friday 14 to Sunday 16 February.",
  "Two adults. Yukata in medium and large.",
  "Choose a room. The garden rooms look over the river; the upper rooms have their own bath.",
  "Kaiseki at 18:30 in the dining hall, or a lighter supper in your room.",
  "Check the details and send the request. The inn replies within a day.",
];

export default function SteppingStonesDemo() {
  const [step, setStep] = useState(2);
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <SteppingStones aria-label="Booking" steps={steps} current={step} onStepChange={setStep} />
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-10 text-sm text-muted-foreground sm:max-w-xs">{notes[step]}</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" isDisabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button
            isDisabled={step === steps.length - 1}
            onPress={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
