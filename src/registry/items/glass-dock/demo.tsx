"use client";

import { Bell, Camera, CloudSnow, House, Map, Mountain, Settings } from "lucide-react";
import { GlassDock } from "@/components/miyuki-ui/glass-dock";

const items = [
  { title: "Home", icon: <House />, href: "#home", current: true },
  { title: "Map", icon: <Map />, href: "#map" },
  { title: "Snowfall", icon: <CloudSnow />, href: "#snowfall" },
  { title: "Peaks", icon: <Mountain />, href: "#peaks" },
  { title: "Webcams", icon: <Camera />, href: "#webcams" },
  { title: "Alerts", icon: <Bell />, href: "#alerts" },
  { title: "Settings", icon: <Settings />, href: "#settings" },
];

export default function GlassDockDemo() {
  return (
    <div className="flex h-[420px] items-end md:h-auto md:pt-16">
      <GlassDock items={items} />
    </div>
  );
}
