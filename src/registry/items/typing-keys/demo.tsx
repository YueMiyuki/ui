"use client";

import { TypingKeys } from "@/components/miyuki-ui/typing-keys";

export default function TypingKeysDemo() {
  return (
    <div className="w-full max-w-[45rem]">
      <TypingKeys />
      <p className="mt-5 text-center text-sm text-muted-foreground">Type something.</p>
    </div>
  );
}
