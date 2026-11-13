"use client";

import { ResortStatus } from "@/components/miyuki-ui/resort-status";
import { landscape, topo } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const lars = people.find((p) => p.name === "Lars Eriksen") ?? people[0];

const webcams = [
  {
    src: landscape("kamoshika-summit", { width: 640, height: 480, mood: "snow" }),
    name: "Summit",
    altitude: "1,690 m",
    time: "09:10",
  },
  {
    src: landscape("usagi-top", { width: 640, height: 480, mood: "snow" }),
    name: "Usagi express top",
    altitude: "1,420 m",
    time: "09:10",
  },
  {
    src: landscape("kamoshika-mid", { width: 640, height: 480, mood: "day" }),
    name: "Mid station",
    altitude: "1,380 m",
    time: "09:05",
  },
  {
    src: landscape("kamoshika-village", { width: 640, height: 480, mood: "dawn" }),
    name: "Village base",
    altitude: "820 m",
    time: "09:05",
  },
];

export default function ResortStatusDemo() {
  return (
    <ResortStatus
      webcams={webcams}
      trailMap={topo("kamoshika-trails", { width: 1400, height: 784 })}
      forecaster={{ name: lars.name, role: lars.role, avatar: lars.avatar }}
    />
  );
}
