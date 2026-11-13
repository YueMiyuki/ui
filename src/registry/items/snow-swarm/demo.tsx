"use client";

import { useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { SnowSwarm } from "@/components/miyuki-ui/snow-swarm";

type Region = { name: string; base: number; mountain: number; stations: string };

const regions: Region[] = [
  {
    name: "Hokkaido",
    base: 27,
    mountain: -20,
    stations:
      "Wakkanai, Rumoi, Asahikawa n, Abashiri, Kitami n, Monbetsu, Nemuro s, Kushiro s, Obihiro, Hiroo s, Urakawa s, Tomakomai s, Muroran s, Hakodate s, Esashi s, Suttsu s, Kutchan n, Otaru, Sapporo, Iwamizawa, Takikawa, Fukagawa, Nayoro n, Bifuka n, Haboro, Teshio, Horonobe n, Rebun, Rishiri, Shibetsu n, Furano n, Biei n, Kamikawa n, Sōunkyō m, Engaru n, Bihoro, Shari, Rausu, Nakashibetsu, Teshikaga n, Shintoku n, Ashoro n, Niseko m, Rusutsu m, Yakumo",
  },
  {
    name: "Tōhoku",
    base: 44,
    mountain: -20,
    stations:
      "Aomori, Hirosaki, Hachinohe s, Mutsu, Towada n, Sukayu m, Goshogawara, Ajigasawa, Fukaura s, Akita, Ōdate n, Noshiro, Yokote, Yuzawa n, Kakunodate, Tazawako n, Oga s, Honjō s, Morioka n, Shizukuishi n, Hachimantai m, Miyako s, Ichinoseki, Kitakami, Tōno n, Kuji s, Ōfunato s, Sendai s, Furukawa, Ishinomaki s, Shiroishi, Yamagata, Shinjō n, Sakata s, Tsuruoka s, Yonezawa n, Zaō m, Fukushima s, Aizuwakamatsu, Hinoemata m",
  },
  {
    name: "Hokuriku",
    base: 56,
    mountain: -34,
    stations:
      "Niigata s, Nagaoka, Jōetsu s, Tsunan n, Tokamachi n, Echigo-Yuzawa n, Myōkō m, Itoigawa s, Sado s, Murakami s, Toyama s, Takaoka s, Kurobe s, Tateyama m, Kanazawa s, Hakusan n, Wajima s, Fukui s, Ōno n, Katsuyama n, Nagano n, Iiyama n, Nozawa m, Hakuba m, Ōmachi n, Matsumoto, Kiso-Fukushima n, Kaida m, Karuizawa n, Shiga Kōgen m, Takayama n, Shirakawa-gō n, Kamikōchi m, Norikura m, Gujō",
  },
];

const shift: Record<string, number> = { n: -8, s: 9 };
const spread: Record<string, number> = { "": 9, n: 7, s: 7, m: 5 };
const triangle = (u: number) => (u < 0.5 ? -1 + Math.sqrt(2 * u) : 1 - Math.sqrt(2 * (1 - u)));

const points = regions.flatMap((region) => {
  const rng = createRng(`first-snow-${region.name}`);
  const entries = region.stations.split(", ").map((entry) => {
    const [label, tag = ""] = entry.split(/ (?=[nsm]$)/);
    return { label, tag };
  });
  const slots = new Map<string, number[]>();
  for (const tag of new Set(entries.map((e) => e.tag))) {
    const m = entries.filter((e) => e.tag === tag).length;
    slots.set(tag, rng.shuffle(Array.from({ length: m }, (_, k) => triangle((k + 0.5) / m))));
  }
  return entries.map(({ label, tag }) => {
    const offset = tag === "m" ? region.mountain : (shift[tag] ?? 0);
    const value = region.base + offset + spread[tag] * (slots.get(tag)?.pop() ?? 0) + rng.range(-0.4, 0.4);
    return { label, group: region.name, value: Math.round(Math.max(1, Math.min(75, value)) * 10) / 10 };
  });
});

const months = [
  ["Oct", 31],
  ["Nov", 30],
  ["Dec", 31],
] as const;

function date(offset: number) {
  let day = Math.round(offset);
  for (const [name, length] of months) {
    if (day < length) return `${day + 1} ${name}`;
    day -= length;
  }
  return `${day + 1} Jan`;
}

const sorted = points.map((p) => p.value).sort((a, b) => a - b);
const middle = (sorted[59] + sorted[60]) / 2;

export default function SnowSwarmDemo() {
  const [split, setSplit] = useState(false);
  return (
    <SnowSwarm
      className="w-full max-w-[560px]"
      label="First snowfall date, by station"
      value={date(middle)}
      caption="median of 120 stations"
      note="Average first snowfall, 1991 to 2020"
      points={points}
      groups={regions.map((r) => r.name)}
      split={split}
      domain={[0, 76]}
      ticks={[0, 14, 31, 45, 61, 75]}
      format={date}
      valueName="First snow"
      groupName="Region"
      height={236}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Arrange"
          selectedKeys={[split ? "region" : "all"]}
          onSelectionChange={(keys) => {
            const [key] = keys;
            if (key) setSplit(key === "region");
          }}
        >
          <Segment id="all">Together</Segment>
          <Segment id="region">By region</Segment>
        </SegmentedControl>
      }
    />
  );
}
