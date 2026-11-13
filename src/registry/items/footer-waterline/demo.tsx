"use client";

import { FooterWaterline } from "@/components/miyuki-ui/footer-waterline";

const links = [
  { label: "Rooms", href: "#rooms" },
  { label: "The onsen", href: "#onsen" },
  { label: "Getting here", href: "#getting-here" },
  { label: "Write to us", href: "#contact" },
];

export default function FooterWaterlineDemo() {
  return (
    <div className="flex min-h-svh w-full flex-col justify-end">
      <FooterWaterline word="Shirakaba" links={links}>
        <p>Shirakaba Lodge, 4-12 Hokujo, Hakuba, Nagano 399-9301.</p>
        <p>Check-in from 15:00. The last bus from Hakuba station leaves at 19:40. © 2026</p>
      </FooterWaterline>
    </div>
  );
}
