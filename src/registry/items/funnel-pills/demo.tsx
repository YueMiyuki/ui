"use client";

import { Activity, Eye, Gem, UserPlus, Users } from "lucide-react";
import { FunnelPills } from "@/components/miyuki-ui/funnel-pills";

const stages = [
  { name: "Visits", value: 4_820, icon: <Eye /> },
  { name: "Sign-up", value: 3_260, icon: <UserPlus /> },
  { name: "Active", value: 2_010, icon: <Activity /> },
  { name: "Pro", value: 1_160, icon: <Gem /> },
  { name: "Team", value: 540, icon: <Users /> },
];

export default function FunnelPillsDemo() {
  return <FunnelPills className="w-full max-w-[440px]" label="Pipeline" value="4,820" delta={0.024} stages={stages} />;
}
