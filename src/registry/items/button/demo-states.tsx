"use client";

import { Download, Save, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";

export default function ButtonStatesDemo() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function send() {
    setSending(true);
    timer.current = setTimeout(() => {
      setSending(false);
      setSent((n) => n + 1);
    }, 1600);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="brand" iconStart={<Send />} isPending={sending} onPress={send}>
          Send invite
        </Button>
        <Button variant="secondary" iconEnd={<Download />}>
          Timetable PDF
        </Button>
        <Button isPending iconStart={<Save />}>
          Saving
        </Button>
        <Button variant="secondary" isPending>
          Checking seats
        </Button>
        <Button isDisabled>Sold out</Button>
      </div>
      <p className="text-[13px] text-muted-foreground tabular-nums" aria-live="polite">
        {sent === 0 ? "Press Send invite to see the pending state." : `${sent} invite${sent === 1 ? "" : "s"} sent.`}
      </p>
    </div>
  );
}
