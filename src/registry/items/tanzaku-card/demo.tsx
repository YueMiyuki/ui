"use client";

import { Tanzaku, TanzakuLine, type TanzakuTone } from "@/components/miyuki-ui/tanzaku-card";

const wishes: { tone: TanzakuTone; text: string }[] = [
  { tone: "water", text: "First tracks of the new year" },
  { tone: "camellia", text: "A long soak at Nozawa with everyone" },
  { tone: "snow", text: "A clear night for the Geminids" },
  { tone: "yuzu", text: "The night train to Aomori, on time" },
  { tone: "wisteria", text: "Forty centimetres by morning" },
];

export default function TanzakuCardDemo() {
  return (
    <TanzakuLine aria-label="Wishes for the season" className="w-full max-w-[560px]">
      {wishes.map((w) => (
        <Tanzaku key={w.text} tone={w.tone}>
          {w.text}
        </Tanzaku>
      ))}
    </TanzakuLine>
  );
}
