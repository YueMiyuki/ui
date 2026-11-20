"use client";

import { HangingMobile, type HangingMobileItem } from "@/components/miyuki-ui/hanging-mobile";

const mobile: HangingMobileItem = {
  left: {
    left: { shape: "disc", color: "var(--brand)", weight: 2.6 },
    right: {
      left: { shape: "drop", color: "var(--chart-3)", weight: 0.9 },
      right: { shape: "leaf", color: "var(--chart-2)", weight: 1.1 },
    },
  },
  right: {
    left: {
      left: { shape: "crescent", color: "var(--foreground)", weight: 1.2 },
      right: { shape: "crystal", color: "var(--chart-6)", weight: 0.8 },
    },
    right: {
      left: { shape: "disc", color: "var(--chart-5)", weight: 0.45 },
      right: { shape: "drop", color: "var(--chart-2)", weight: 0.85 },
    },
  },
};

export default function HangingMobileDemo() {
  return <HangingMobile role="img" aria-label="A mobile of seven paper shapes turning in the air" items={mobile} />;
}
