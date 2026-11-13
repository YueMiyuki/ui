"use client";

import { WeatherStation } from "@/components/miyuki-ui/weather-station";
import { topo } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const yuna = people.find((p) => p.name === "Yuna Sato") ?? people[0];

export default function WeatherStationDemo() {
  return (
    <WeatherStation
      user={{ name: yuna.name, email: "yuna@shirakaba.example", avatar: yuna.avatar }}
      radarMap={topo("hakuba-radar", { width: 1200, height: 520 })}
    />
  );
}
