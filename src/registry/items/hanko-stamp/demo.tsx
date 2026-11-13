"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { HankoStamp, type HankoStampHandle } from "@/components/miyuki-ui/hanko-stamp";

export default function HankoStampDemo() {
  const stamp = useRef<HankoStampHandle>(null);
  const [approved, setApproved] = useState(false);

  return (
    <article className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs text-muted-foreground">Expense claim 0417</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">Trip report, 14 February</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">Submitted by Haruka Mori</p>
      <dl className="mt-5 grid grid-cols-2 gap-y-2 border-t border-border pt-4 text-sm">
        <dt className="text-muted-foreground">Route</dt>
        <dd className="text-right text-foreground">Hakuba to Nozawa</dd>
        <dt className="text-muted-foreground">Nights</dt>
        <dd className="text-right text-foreground tabular-nums">3</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right font-medium text-foreground tabular-nums">¥84,260</dd>
      </dl>
      <div className="mt-6 flex items-center justify-between gap-3">
        <HankoStamp ref={stamp} sealClassName="absolute top-4 right-4" onStamp={() => setApproved(true)} />
        {approved ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              stamp.current?.reset();
              setApproved(false);
            }}
          >
            Undo
          </Button>
        ) : null}
      </div>
    </article>
  );
}
