"use client";

import { Route } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { TickingSteps } from "@/components/miyuki-ui/ticking-steps";

const steps = [
  "Reading the avalanche bulletin",
  "Checking hut availability",
  "Matching train times",
  "Packing for minus fourteen",
  "Drawing the route",
];

export default function TickingStepsDemo() {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-3 overflow-hidden">
      <Button
        iconStart={<Route />}
        onPress={() => {
          setReady(false);
          setLoading(true);
        }}
      >
        Plan my route
      </Button>
      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        {ready ? "Hakuba to Tsugaike hut, 4 h 10 min, leaving on the 07:12." : "Five checks, about nine seconds."}
      </p>
      <TickingSteps
        contained
        steps={steps}
        loading={loading}
        onComplete={() => {
          timer.current = setTimeout(() => {
            setLoading(false);
            setReady(true);
          }, 1000);
        }}
        onClose={() => {
          clearTimeout(timer.current);
          setLoading(false);
        }}
      />
    </div>
  );
}
