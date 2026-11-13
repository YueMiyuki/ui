"use client";

import { RidgeCard, type RidgeCardMood } from "@/components/miyuki-ui/ridge-card";

const moods: { mood: RidgeCardMood; place: string; line: string }[] = [
  { mood: "day", place: "Tateyama, 11:00", line: "Clear above 2,000 m" },
  { mood: "dusk", place: "Hakuba, 16:52", line: "Sunset over the Ushiro" },
  { mood: "night", place: "Norikura, 22:10", line: "Moonrise 21:48" },
  { mood: "aurora", place: "Shiretoko, 01:30", line: "Kp 6, faint to the north" },
  { mood: "snow", place: "Nozawa, 07:15", line: "Snowing, 22 cm overnight" },
  { mood: "dawn", place: "Yarigatake, 05:40", line: "First light at 06:21" },
];

export default function RidgeCardMoods() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
      {moods.map((m) => (
        <RidgeCard key={m.mood} seed={m.place} mood={m.mood}>
          <p className="text-[13px] text-foreground/85">{m.place}</p>
          <p className="mt-0.5 text-sm font-medium">{m.line}</p>
        </RidgeCard>
      ))}
    </div>
  );
}
