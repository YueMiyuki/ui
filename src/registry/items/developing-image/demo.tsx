"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { DevelopingImage } from "@/components/miyuki-ui/developing-image";
import { landscape } from "@/registry/lib/art";

const prompts = [
  { text: "Lake Tōya at dusk, seen from the north shore", mood: "dusk" },
  { text: "First snow on the ridges above Hakuba", mood: "snow" },
  { text: "Aurora over the hills behind Niseko", mood: "aurora" },
  { text: "Morning light along the Kiso valley", mood: "dawn" },
] as const;

export default function DevelopingImageDemo() {
  const [run, setRun] = useState(0);
  const prompt = prompts[run % prompts.length];
  const src = useMemo(
    () => landscape(`generate-${run}`, { width: 1040, height: 780, mood: prompt.mood }),
    [run, prompt.mood],
  );

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-3">
      <DevelopingImage src={src} alt={prompt.text} className="aspect-[4/3] w-full rounded-2xl shadow-sm" />
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-[13px] text-muted-foreground">{prompt.text}</p>
        <Button size="sm" variant="secondary" iconStart={<RefreshCw />} onPress={() => setRun((n) => n + 1)}>
          Generate again
        </Button>
      </div>
    </div>
  );
}
