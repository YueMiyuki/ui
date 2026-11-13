"use client";

import { AgentTeamChat } from "@/components/miyuki-ui/agent-team-chat";
import { people } from "@/registry/lib/data";

const aiko = people[0];

export default function AgentTeamChatDemo() {
  return <AgentTeamChat user={{ name: aiko.name, email: aiko.email, avatar: aiko.avatar }} />;
}
