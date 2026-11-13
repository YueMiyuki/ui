"use client";

import { ChevronRight } from "lucide-react";
import { LinkButton } from "@/components/miyuki-ui/link-button";

export default function LinkButtonDemo() {
  return (
    <div className="flex max-w-md flex-col items-start gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <LinkButton href="#documentation">View documentation</LinkButton>
        <LinkButton href="#components" iconEnd={<ChevronRight />}>
          Browse components
        </LinkButton>
        <LinkButton href="#terms" tone="muted" size="sm">
          Terms
        </LinkButton>
      </div>
      <p className="text-sm leading-6 text-foreground">
        The Hakuba line runs every 30 minutes until the last service at 21:50.{" "}
        <LinkButton href="#timetable">Check the winter timetable</LinkButton> before you plan a late return from the
        slopes.
      </p>
    </div>
  );
}
