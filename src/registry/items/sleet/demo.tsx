"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { Sleet } from "@/components/miyuki-ui/sleet";

export default function SleetDemo() {
  return (
    <Sleet className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-md">
      <h3 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">Geminids peak tonight</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Best seen from the Hakuba observatory after 23:00. Cloud cover 8%.
      </p>
      <Button variant="secondary" className="mt-6" iconStart={<CalendarPlus />}>
        Add to calendar
      </Button>
    </Sleet>
  );
}
