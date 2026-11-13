"use client";

import { Avatar, type AvatarStatus } from "@/components/miyuki-ui/avatar";
import { people } from "@/registry/lib/data";

const team: { index: number; status: AvatarStatus; note: string }[] = [
  { index: 0, status: "online", note: "On the Happo ridge" },
  { index: 5, status: "away", note: "Back at 14:30" },
  { index: 2, status: "busy", note: "Recording the forecast" },
  { index: 9, status: "offline", note: "Last seen yesterday" },
];

export default function AvatarStatusDemo() {
  return (
    <ul className="flex w-full max-w-xs flex-col gap-4">
      {team.map(({ index, status, note }) => {
        const p = people[index];
        return (
          <li key={p.handle} className="flex items-center gap-3">
            <Avatar size="lg" src={p.avatar} name={p.name} status={status} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
              <p className="truncate text-[13px] text-muted-foreground">{note}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
