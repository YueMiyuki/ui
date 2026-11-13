"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { BrushAnnotation } from "@/components/miyuki-ui/brush-annotation";
import { Button } from "@/components/miyuki-ui/button";

export default function BrushAnnotationDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="w-full max-w-xl">
      <p className="text-sm text-muted-foreground">Field notes · Hakuba, 14 February</p>
      <p key={run} className="mt-3 text-lg leading-9 text-foreground text-pretty">
        Snow began at four and fell{" "}
        <BrushAnnotation kind="underline" delay={150}>
          steadily until noon
        </BrushAnnotation>
        . The north bowl held{" "}
        <BrushAnnotation kind="highlight" color="var(--chart-2)" delay={800}>
          38 cm of new powder
        </BrushAnnotation>
        , dry and light at −9 °C. Patrol kept the{" "}
        <BrushAnnotation kind="circle" delay={1450}>
          Happo ridge
        </BrushAnnotation>{" "}
        closed until half past ten. The forecast promised{" "}
        <BrushAnnotation kind="strike" color="var(--destructive)" delay={2250}>
          clearing by afternoon
        </BrushAnnotation>
        ; it never cleared.{" "}
        <BrushAnnotation kind="bracket" delay={2850}>
          Skins on at one, back at the hut by three.
        </BrushAnnotation>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 -ml-3"
        iconStart={<RotateCcw />}
        onPress={() => setRun((r) => r + 1)}
      >
        Draw again
      </Button>
    </div>
  );
}
