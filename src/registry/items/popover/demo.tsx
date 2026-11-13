"use client";

import { Info } from "lucide-react";
import { Heading } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Popover, PopoverArrow, PopoverTrigger } from "@/components/miyuki-ui/popover";

export default function PopoverDemo() {
  return (
    <PopoverTrigger>
      <Button variant="secondary" iconStart={<Info />}>
        Details
      </Button>
      <Popover>
        <PopoverArrow />
        <Heading slot="title" className="text-sm leading-5 font-semibold text-foreground">
          Net snowfall
        </Heading>
        <p className="mt-1.5 text-[13px] leading-5 text-pretty text-muted-foreground">
          New snow left on the board after settling and wind loss, over the past 24 hours.
        </p>
        <p className="mt-2 text-[13px] leading-5 text-pretty text-muted-foreground">
          Measured at 06:00 at the summit station, 1,831 m.
        </p>
      </Popover>
    </PopoverTrigger>
  );
}
