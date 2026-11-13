"use client";

import { FieldJournal, type FieldJournalImage } from "@/components/miyuki-ui/field-journal";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const images: Record<FieldJournalImage, string> = {
  "kiso-road": landscape("kiso-road", { mood: "snow", width: 1600, height: 800 }),
  "otaru-glass": landscape("otaru-canal", { mood: "dusk", width: 1200, height: 800 }),
  "tea-altitude": landscape("tea-ridge", { mood: "day", width: 900, height: 700 }),
  "snow-plough": landscape("ranshima", { mood: "night", width: 900, height: 1000 }),
  "fukushima-river": landscape("kiso-fukushima", { mood: "snow", width: 800, height: 1000 }),
  "tsumago-morning": landscape("tsumago", { mood: "dawn", width: 800, height: 1000 }),
  "archive-shirakawa": landscape("shirakawa", { mood: "night", width: 800, height: 1000 }),
  "archive-nozawa": landscape("nozawa", { mood: "snow", width: 1200, height: 600 }),
  "archive-aomori": landscape("aomori", { mood: "dawn", width: 800, height: 600 }),
  "archive-yakushima": landscape("yakushima", { mood: "dusk", width: 800, height: 600 }),
};

const avatars = Object.fromEntries(people.map((p) => [p.name, p.avatar]));

export default function FieldJournalDemo() {
  return <FieldJournal images={images} avatars={avatars} />;
}
