"use client";

import { RadioTower, Receipt, TriangleAlert } from "lucide-react";
import { ActivityInbox, type ActivityItem } from "@/components/miyuki-ui/activity-inbox";
import { people } from "@/registry/lib/data";

const [, kenji, yuna, , , lars, ingrid, , amara] = people;

const reply = [
  { id: "reply", label: "Reply" },
  { id: "thread", label: "View thread" },
];

const items: ActivityItem[] = [
  {
    id: "hakuba-mention",
    kind: "mention",
    group: "Today",
    actor: yuna.name,
    avatar: yuna.avatar,
    message: (
      <>
        mentioned you in <span className="font-medium text-foreground">Hakuba ridge outlook</span>
      </>
    ),
    quote: "Can you check the wind loading on the north bowl before the 06:00 bulletin?",
    time: "12 min ago",
    unread: true,
    actions: reply,
  },
  {
    id: "kiso-3",
    kind: "system",
    group: "Today",
    actor: "Kiso-3 station",
    icon: <RadioTower />,
    tone: "destructive",
    message: "stopped reporting at 05:40. Readings are filled from Kiso-1 for now.",
    time: "38 min ago",
    unread: true,
    actions: [{ id: "station", label: "View station" }],
  },
  {
    id: "otaru-share",
    kind: "activity",
    group: "Today",
    actor: kenji.name,
    avatar: kenji.avatar,
    message: (
      <>
        shared <span className="font-medium text-foreground">Otaru line closures</span> with your team
      </>
    ),
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "toya-reply",
    kind: "mention",
    group: "Today",
    actor: amara.name,
    avatar: amara.avatar,
    message: (
      <>
        replied to your note on <span className="font-medium text-foreground">Lake Tōya ice cover</span>
      </>
    ),
    quote: "Ice is 4 cm at the north shore, not 9. I would hold the walking advisory until Friday.",
    time: "2 hr ago",
    unread: true,
    actions: reply,
  },
  {
    id: "niseko-danger",
    kind: "system",
    group: "Earlier",
    actor: "Niseko bulletin",
    icon: <TriangleAlert />,
    tone: "warning",
    message: "raised avalanche danger to considerable above 1,000 m.",
    time: "Yesterday",
    unread: true,
  },
  {
    id: "patrol-invite",
    kind: "activity",
    group: "Earlier",
    actor: lars.name,
    avatar: lars.avatar,
    message: (
      <>
        joined <span className="font-medium text-foreground">Kitakaze ski patrol</span>
      </>
    ),
    time: "Yesterday",
  },
  {
    id: "nozawa-mention",
    kind: "mention",
    group: "Earlier",
    actor: ingrid.name,
    avatar: ingrid.avatar,
    message: (
      <>
        mentioned you in <span className="font-medium text-foreground">Nozawa route grading</span>
      </>
    ),
    quote: "Grading looks right to me. I have added the new contour data to the map.",
    time: "Thu",
  },
  {
    id: "invoice",
    kind: "system",
    group: "Earlier",
    actor: "Invoice HW-2027-02",
    icon: <Receipt />,
    tone: "success",
    message: "for ¥48,400 was paid from the card ending 4821.",
    time: "Feb 9",
  },
];

export default function ActivityInboxDemo() {
  return <ActivityInbox items={items} />;
}
