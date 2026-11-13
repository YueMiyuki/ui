"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";

export default function ButtonSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm">Filter</Button>
        <Button size="md">Send invite</Button>
        <Button size="lg">Reserve a room</Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" variant="secondary" iconStart={<Plus />}>
          Add stop
        </Button>
        <Button size="md" variant="secondary" iconStart={<Plus />}>
          Add stop
        </Button>
        <Button size="lg" variant="secondary" iconStart={<Plus />}>
          Add stop
        </Button>
        <Button size="md" variant="ghost" iconStart={<Search />} aria-label="Search timetable" />
      </div>
    </div>
  );
}
