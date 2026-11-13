"use client";

import { Button } from "@/components/miyuki-ui/button";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";

const placements = [
  { placement: "top", label: "Top", hint: "Shows above", cell: "col-start-2 row-start-1" },
  { placement: "left", label: "Left", hint: "Shows to the left", cell: "col-start-1 row-start-2" },
  { placement: "right", label: "Right", hint: "Shows to the right", cell: "col-start-3 row-start-2" },
  { placement: "bottom", label: "Bottom", hint: "Shows below", cell: "col-start-2 row-start-3" },
] as const;

export default function TooltipDemo() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2">
      {placements.map(({ placement, label, hint, cell }) => (
        <TooltipTrigger key={placement}>
          <Button variant="secondary" className={`w-24 ${cell}`}>
            {label}
          </Button>
          <Tooltip placement={placement} arrow>
            {hint}
          </Tooltip>
        </TooltipTrigger>
      ))}
    </div>
  );
}
