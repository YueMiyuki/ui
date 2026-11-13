"use client";

import { PaperPlaneSend } from "@/components/miyuki-ui/paper-plane-send";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PaperPlaneSendDemo() {
  return (
    <PaperPlaneSend size="lg" onPress={() => wait(1800)} labels={{ sending: "Sending to Aiko", sent: "Report sent" }}>
      Send report
    </PaperPlaneSend>
  );
}
