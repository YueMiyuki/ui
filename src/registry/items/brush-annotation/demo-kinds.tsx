"use client";

import { useState } from "react";
import { BrushAnnotation, type BrushAnnotationKind } from "@/components/miyuki-ui/brush-annotation";
import { Switch } from "@/components/miyuki-ui/switch";

const kinds: { kind: BrushAnnotationKind; text: string; color?: string }[] = [
  { kind: "underline", text: "Last lift at 16:30" },
  { kind: "double", text: "Chains required" },
  { kind: "circle", text: "Gate 4" },
  { kind: "strike", text: "Open all day", color: "var(--destructive)" },
  { kind: "bracket", text: "Hut closed Mondays" },
  { kind: "highlight", text: "Fresh tracks", color: "var(--chart-2)" },
];

export default function BrushAnnotationKindsDemo() {
  const [show, setShow] = useState(true);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="grid w-full grid-cols-1 gap-x-10 gap-y-7 text-xl text-foreground sm:grid-cols-2">
        {kinds.map((k, i) => (
          <div key={k.kind} className="flex items-baseline gap-4">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">{k.kind}</span>
            <span>
              <BrushAnnotation kind={k.kind} color={k.color} show={show} delay={i * 220}>
                {k.text}
              </BrushAnnotation>
            </span>
          </div>
        ))}
      </div>
      <Switch size="sm" isSelected={show} onChange={setShow}>
        Show marks
      </Switch>
    </div>
  );
}
