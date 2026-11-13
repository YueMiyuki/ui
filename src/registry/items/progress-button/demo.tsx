"use client";

import { Send } from "lucide-react";
import { ProgressButton } from "@/components/miyuki-ui/progress-button";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ProgressButtonDemo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <ProgressButton
          onClick={() => wait(1600)}
          labels={{ loading: "Sending invite", success: "Invite sent to Aiko Mori", error: "Try again" }}
        >
          <Send />
          Send invite
        </ProgressButton>
        <ProgressButton
          onClick={() => wait(1200).then(() => Promise.reject(new Error("Offline")))}
          labels={{ loading: "Publishing the trail notes", success: "Published", error: "Try again" }}
        >
          Publish
        </ProgressButton>
      </div>
      <p className="text-[13px] text-muted-foreground">The second one fails, to show the retry.</p>
    </div>
  );
}
