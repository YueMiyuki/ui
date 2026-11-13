"use client";

import { TextStream } from "@/components/miyuki-ui/text-stream";

export default function TextStreamDemo() {
  return (
    <TextStream
      className="size-full font-display font-semibold tracking-[-0.02em]"
      text={["Snow from the north-west by evening", "Freezing level 400 metres", "Summit wind easing after midnight"]}
    />
  );
}
