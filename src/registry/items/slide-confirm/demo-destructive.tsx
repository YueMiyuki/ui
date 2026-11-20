"use client";

import { useRef, useState } from "react";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { SlideConfirm } from "@/components/miyuki-ui/slide-confirm";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SlideConfirmDestructiveDemo() {
  const attempts = useRef(0);
  const [note, setNote] = useState<"none" | "failed" | "done">("none");
  const [round, setRound] = useState(0);

  return (
    <article className="w-full max-w-[360px] rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">Cancel the Hakuba booking</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Hakuba Sanso, two nights from 14 February.</p>
      <p className="mt-0.5 text-sm text-muted-foreground">The ¥38,400 deposit is refunded in five days.</p>
      <SlideConfirm
        className="mt-5"
        tone="destructive"
        label="Slide to cancel"
        confirmedLabel="Booking cancelled"
        resetKey={round}
        onConfirm={async () => {
          setNote("none");
          attempts.current += 1;
          await wait(1300);
          if (attempts.current === 1) {
            setNote("failed");
            throw new Error("The lodge did not answer");
          }
          setNote("done");
        }}
      />
      <div className="mt-3 flex min-h-5 items-center justify-between gap-3 text-[13px]" aria-live="polite">
        {note === "failed" ? (
          <p className="text-destructive">The lodge did not answer. Slide again to retry.</p>
        ) : note === "done" ? (
          <>
            <p className="text-muted-foreground">A receipt is on its way.</p>
            <LinkButton
              tone="muted"
              size="sm"
              onPress={() => {
                setNote("none");
                setRound((r) => r + 1);
              }}
            >
              Undo
            </LinkButton>
          </>
        ) : (
          <p className="text-muted-foreground">Free to rebook until 10 February.</p>
        )}
      </div>
    </article>
  );
}
