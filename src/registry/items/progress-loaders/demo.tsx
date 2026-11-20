"use client";

import {
  CapsuleLoader,
  CheckLoader,
  CountLoader,
  PieLoader,
  SpokesLoader,
  StepsLoader,
} from "@/components/miyuki-ui/progress-loaders";

const items = [
  { name: "Spokes", node: <SpokesLoader size={32} label="Loading lift status" /> },
  { name: "Count", node: <CountLoader size={32} label="Downloading the snow report" /> },
  { name: "Capsule", node: <CapsuleLoader size={32} label="Charging the summit camera" /> },
  { name: "Pie", node: <PieLoader size={32} label="Checking the timetable" /> },
  { name: "Steps", node: <StepsLoader size={32} label="Booking the night train" /> },
  { name: "Check", node: <CheckLoader size={32} label="Saving your route" /> },
];

export default function ProgressLoadersDemo() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {items.map(({ name, node }) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div className="grid h-10 place-items-center">{node}</div>
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
}
