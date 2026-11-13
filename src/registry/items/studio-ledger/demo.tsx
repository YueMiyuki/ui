"use client";

import { StudioLedger } from "@/components/miyuki-ui/studio-ledger";
import { people } from "@/registry/lib/data";

const haruto = people[3];

export default function StudioLedgerDemo() {
  return <StudioLedger user={{ name: haruto.name, email: haruto.email, avatar: haruto.avatar }} />;
}
