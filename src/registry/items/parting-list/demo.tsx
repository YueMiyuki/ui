"use client";

import { Bath, BusFront, type LucideIcon, TrainFront } from "lucide-react";
import { useId, useState } from "react";
import { PartingList, type PartingListVariant } from "@/components/miyuki-ui/parting-list";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { cn } from "@/lib/utils";

interface Stop {
  id: string;
  time: string;
  place: string;
  line: string;
  note?: { icon: LucideIcon; text: string };
}

const tomorrow: Stop[] = [
  { id: "kiso", time: "06:40", place: "Kiso", line: "First light on the post road at Tsumago." },
  {
    id: "matsumoto",
    time: "09:15",
    place: "Matsumoto",
    line: "Castle grounds as the gates open.",
    note: { icon: TrainFront, text: "Ōito line 10:12, car 2, seat 7A" },
  },
  { id: "hakuba", time: "11:30", place: "Hakuba", line: "Gondola to the pond trail before the cloud." },
  {
    id: "nozawa",
    time: "14:20",
    place: "Nozawa",
    line: "Late lunch, then the Ōyu bath.",
    note: { icon: Bath, text: "Bring a towel, the baths are free" },
  },
  { id: "shirakawa", time: "17:05", place: "Shirakawa", line: "Farmhouse lights from the lookout." },
  {
    id: "aomori",
    time: "21:50",
    place: "Aomori",
    line: "Overnight coach north.",
    note: { icon: BusFront, text: "Seat 9C, arrives 06:25" },
  },
];

export default function PartingListDemo() {
  const title = useId();
  const [stops, setStops] = useState(tomorrow);
  const [variant, setVariant] = useState<PartingListVariant>("cards");

  return (
    <div className="w-full max-w-md">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 id={title} className="text-base font-semibold tracking-[-0.01em]">
            Tomorrow, in order
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Drag a stop by its handle.</p>
        </div>
        <SegmentedControl
          size="sm"
          aria-label="Style"
          selectedKeys={[variant]}
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (next === "cards" || next === "divided") setVariant(next);
          }}
        >
          <Segment id="cards">Cards</Segment>
          <Segment id="divided">Divided</Segment>
        </SegmentedControl>
      </div>
      <PartingList
        aria-labelledby={title}
        items={stops}
        onReorder={setStops}
        itemLabel={(stop) => stop.place}
        variant={variant}
        renderItem={(stop, { dragging }) => (
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                "w-10 shrink-0 text-[13px] font-medium tabular-nums transition-colors duration-200",
                dragging ? "text-brand-strong" : "text-muted-foreground",
              )}
            >
              {stop.time}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{stop.place}</p>
              <p className="mt-0.5 text-[13px] text-pretty text-muted-foreground">{stop.line}</p>
              {stop.note && (
                <p className="mt-2 flex w-fit max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  <stop.note.icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{stop.note.text}</span>
                </p>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
