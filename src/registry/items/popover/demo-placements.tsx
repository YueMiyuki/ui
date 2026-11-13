"use client";

import { Heading } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Popover, PopoverArrow, PopoverTrigger } from "@/components/miyuki-ui/popover";

const placements = [
  {
    placement: "top",
    label: "Top",
    text: "Opens above, and flips below near the top of the window.",
    cell: "col-start-2 row-start-1",
  },
  {
    placement: "left",
    label: "Left",
    text: "Opens to the left, and flips right near the edge.",
    cell: "col-start-1 row-start-2",
  },
  {
    placement: "right",
    label: "Right",
    text: "Opens to the right, and flips left near the edge.",
    cell: "col-start-3 row-start-2",
  },
  {
    placement: "bottom",
    label: "Bottom",
    text: "Opens below. This is the default.",
    cell: "col-start-2 row-start-3",
  },
] as const;

export default function PopoverPlacementsDemo() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2">
      {placements.map(({ placement, label, text, cell }) => (
        <PopoverTrigger key={placement}>
          <Button variant="secondary" className={`w-24 ${cell}`}>
            {label}
          </Button>
          <Popover placement={placement} className="w-56">
            <PopoverArrow />
            <Heading slot="title" className="text-sm leading-5 font-semibold text-foreground">
              {label}
            </Heading>
            <p className="mt-1 text-[13px] leading-5 text-pretty text-muted-foreground">{text}</p>
          </Popover>
        </PopoverTrigger>
      ))}
    </div>
  );
}
