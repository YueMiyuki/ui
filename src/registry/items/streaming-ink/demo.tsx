"use client";

import { MountainSnow, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { StreamingInk } from "@/components/miyuki-ui/streaming-ink";

const ANSWER = `Tomorrow, Sunday 14 February, the danger is considerable above 1,800 m and moderate below the tree line.

The main problem is wind slab on north- and east-facing slopes near the ridges. Last night's 42 cm of new snow came in on a strong westerly, so expect deeper pockets below cornices and in gullies.

Keep to slopes under 30° and plan to be off the ridge by early afternoon. The bulletin is filed as \`NA-2027-045\`, and the next update is at 06:00.`;

function tokens(seed: number) {
  const rng = createRng(seed);
  const out: string[] = [];
  for (let i = 0; i < ANSWER.length; ) {
    const n = rng.int(2, 7);
    out.push(ANSWER.slice(i, i + n));
    i += n;
  }
  return out;
}

export default function StreamingInkDemo() {
  const [run, setRun] = useState(1);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const parts = tokens(run);
    const rng = createRng(run * 7);
    let i = 0;
    let timer = window.setTimeout(function next() {
      i++;
      setText(parts.slice(0, i).join(""));
      if (i >= parts.length) setDone(true);
      else timer = window.setTimeout(next, 70 + rng() * 90);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [run]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <p className="ms-auto max-w-[85%] rounded-2xl rounded-ee-md bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
        What is the avalanche risk on the Hakuba ridges tomorrow?
      </p>
      <div className="flex gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
          <MountainSnow aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[13px] leading-5 text-muted-foreground">Mountain forecast</p>
          <div className="grid">
            <StreamingInk text={text} done={done} className="col-start-1 row-start-1" />
            <div aria-hidden="true" className="invisible col-start-1 row-start-1">
              <StreamingInk text={ANSWER} done />
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            iconStart={<RotateCcw aria-hidden="true" />}
            onPress={() => {
              setText("");
              setDone(false);
              setRun((r) => r + 1);
            }}
          >
            Ask again
          </Button>
        </div>
      </div>
    </div>
  );
}
