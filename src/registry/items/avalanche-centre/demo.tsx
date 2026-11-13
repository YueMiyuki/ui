"use client";

import { AvalancheCentre } from "@/components/miyuki-ui/avalanche-centre";
import { avatar, topo } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const yuna = people.find((p) => p.name === "Yuna Sato") ?? people[0];

const avatars = {
  "Yuna Sato": yuna.avatar,
  "Kenta Hoshino": avatar("kenta.hoshino"),
  "Mio Arai": avatar("mio.arai"),
  "Daichi Kudo": avatar("daichi.kudo"),
};

export default function AvalancheCentreDemo() {
  return <AvalancheCentre avatars={avatars} map={topo("northern-alps-zones", { width: 700, height: 800 })} />;
}
