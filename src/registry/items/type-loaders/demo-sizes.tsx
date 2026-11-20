"use client";

import { Button } from "@/components/miyuki-ui/button";
import { BubbleLoader, TypingLoader } from "@/components/miyuki-ui/type-loaders";

const sizes = [16, 24, 32, 48];

export default function TypeLoadersSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-6">
        <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-3">
          {sizes.map((size) => (
            <TypingLoader key={size} size={size} label="Loading the forecast" />
          ))}
        </div>
        <div className="flex items-end gap-5">
          {sizes.map((size) => (
            <BubbleLoader key={size} size={size} label="Waiting for a reply" />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <TypingLoader size={32} className="text-foreground" label="Loading the forecast" />
        <BubbleLoader size={32} className="text-foreground" label="Waiting for a reply" />
        <TypingLoader size={32} className="text-muted-foreground" label="Loading the forecast" />
        <BubbleLoader size={32} className="text-muted-foreground" label="Waiting for a reply" />
      </div>
      <Button variant="secondary" iconStart={<BubbleLoader size={16} className="text-current" aria-hidden />}>
        Sending reply
      </Button>
    </div>
  );
}
