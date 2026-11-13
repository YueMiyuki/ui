"use client";

import { KanbanBoard } from "@/components/miyuki-ui/kanban-board";
import { people } from "@/registry/lib/data";

const team = [people[2], people[8], people[5], people[6], people[9]];
const members = team.map((p) => ({ name: p.name, avatar: p.avatar }));

export default function KanbanBoardDemo() {
  return <KanbanBoard members={members} user={{ name: team[0].name, email: team[0].email, avatar: team[0].avatar }} />;
}
