"use client";

import {
  BubbleLoader,
  LetterRollLoader,
  ParagraphLoader,
  SecondsLoader,
  SelectionLoader,
  TypingLoader,
} from "@/components/miyuki-ui/type-loaders";

const items = [
  { name: "Typing", node: <TypingLoader size={32} label="Loading the forecast" /> },
  { name: "Bubble", node: <BubbleLoader size={32} label="Waiting for a reply" /> },
  { name: "Roll", node: <LetterRollLoader size={32} label="Loading lift status" /> },
  { name: "Selection", node: <SelectionLoader size={32} label="Preparing the route notes" /> },
  { name: "Paragraph", node: <ParagraphLoader size={32} label="Reading the trail report" /> },
  { name: "Seconds", node: <SecondsLoader size={32} label="Checking the timetable" /> },
];

export default function TypeLoadersDemo() {
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
