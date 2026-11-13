"use client";

import { ChatShell } from "@/components/miyuki-ui/chat-shell";
import { people } from "@/registry/lib/data";

const aiko = people[0];

export default function ChatShellDemo() {
  return <ChatShell user={{ name: aiko.name, email: aiko.email, avatar: aiko.avatar }} />;
}
