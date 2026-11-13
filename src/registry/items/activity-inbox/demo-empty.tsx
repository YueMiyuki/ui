"use client";

import { CloudSnow, RadioTower } from "lucide-react";
import { ActivityInbox, type ActivityItem } from "@/components/miyuki-ui/activity-inbox";

const items: ActivityItem[] = [
  {
    id: "niseko-snow",
    kind: "system",
    group: "Today",
    actor: "Niseko forecast",
    icon: <CloudSnow />,
    tone: "brand",
    message: "now expects 32 cm of new snow by Sunday morning.",
    time: "8 min ago",
    unread: true,
  },
  {
    id: "kiso-3",
    kind: "system",
    group: "Earlier",
    actor: "Kiso-3 station",
    icon: <RadioTower />,
    tone: "success",
    message: "is reporting again after 3 hours offline.",
    time: "Yesterday",
  },
];

export default function ActivityInboxEmptyDemo() {
  return (
    <ActivityInbox
      items={items}
      defaultTab="mentions"
      listHeight={300}
      emptyStates={{
        mentions: {
          title: "No mentions yet",
          description: "When someone tags you in a forecast note or a bulletin draft, it shows up here.",
        },
      }}
    />
  );
}
