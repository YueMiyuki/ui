"use client";

import { PaperPlaneSend } from "@/components/miyuki-ui/paper-plane-send";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PaperPlaneSendStatesDemo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <PaperPlaneSend variant="secondary">Send</PaperPlaneSend>
        <PaperPlaneSend variant="brand" onPress={() => wait(1400)}>
          Send log
        </PaperPlaneSend>
        <PaperPlaneSend onPress={() => wait(1600).then(() => Promise.reject(new Error("Offline")))}>
          Send from the hut
        </PaperPlaneSend>
      </div>
      <p className="text-[13px] text-muted-foreground">The last one has no signal, to show a failed send.</p>
    </div>
  );
}
