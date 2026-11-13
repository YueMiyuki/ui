"use client";

import { FunnelChart } from "@/components/miyuki-ui/funnel-chart";

const stages = [
  { name: "Link opened", value: 197 },
  { name: "Started", value: 110 },
  { name: "Completed", value: 77 },
  { name: "Subscribed", value: 38 },
];

export default function FunnelChartDemo() {
  return (
    <FunnelChart className="w-full max-w-[440px]" label="Sign-up funnel" value="197" delta={0.052} stages={stages} />
  );
}
