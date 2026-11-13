"use client";

import { ThinkingGlyph } from "@/components/miyuki-ui/thinking-glyph";

export default function ThinkingGlyphDemo() {
  return (
    <div className="flex flex-col gap-5">
      <ThinkingGlyph variant="thinking" label="Thinking" showElapsed />
      <ThinkingGlyph variant="searching" label="Searching the bulletins" />
      <ThinkingGlyph variant="reading" label="Reading 6 files" />
      <ThinkingGlyph variant="writing" label="Writing the route" showElapsed />
    </div>
  );
}
