"use client";

import { AgentPersona } from "@/components/miyuki-ui/agent-persona";

export default function AgentPersonaDemo() {
  return (
    <AgentPersona
      className="max-w-[540px]"
      defaultValue={{
        name: "Yuki",
        role: "Route planner",
        description:
          "Plans day tours in the Northern Alps from the morning bulletin, hut bookings and the last train home.",
        language: "English",
        mood: "calm",
        color: "water",
      }}
    />
  );
}
