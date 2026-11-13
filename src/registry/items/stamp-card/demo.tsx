"use client";

import { StampCard, type StampSlot } from "@/components/miyuki-ui/stamp-card";

const stations: StampSlot[] = [
  { id: "niekawa", label: "Niekawa", motif: "peak" },
  { id: "narai", label: "Narai", motif: "lantern" },
  { id: "yabuhara", label: "Yabuhara", motif: "pine" },
  { id: "miyanokoshi", label: "Miyanokoshi", motif: "bridge" },
  { id: "fukushima", label: "Fukushima", motif: "train" },
  { id: "agematsu", label: "Agematsu", motif: "wave" },
  { id: "tsumago", label: "Tsumago", motif: "teacup" },
  { id: "magome", label: "Magome", motif: "wheel" },
];

export default function StampCardDemo() {
  return (
    <StampCard
      className="w-full max-w-[26rem]"
      title="Eight stations of the Kiso road"
      description="Nakasendō stamp rally, winter 2026"
      slots={stations}
      defaultStamped={["niekawa", "narai", "yabuhara"]}
    />
  );
}
