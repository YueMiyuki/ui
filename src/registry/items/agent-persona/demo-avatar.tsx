"use client";

import { AgentAvatar, type AgentColor, type AgentMood } from "@/components/miyuki-ui/agent-persona";

const cast: { name: string; mood: AgentMood; color: AgentColor }[] = [
  { name: "Calm", mood: "calm", color: "water" },
  { name: "Happy", mood: "happy", color: "seafoam" },
  { name: "Focused", mood: "focused", color: "wisteria" },
  { name: "Sleepy", mood: "sleepy", color: "plum" },
  { name: "Surprised", mood: "surprised", color: "yuzu" },
];

export default function AgentAvatarDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <AgentAvatar size={160} mood="happy" color="water" label="Yuki, happy" />
      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-5">
        {cast.map((a) => (
          <li key={a.name} className="flex flex-col items-center gap-2">
            <AgentAvatar size={48} mood={a.mood} color={a.color} label={a.name} />
            <span className="text-xs text-muted-foreground">{a.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
