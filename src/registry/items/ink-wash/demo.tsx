"use client";

import { InkWash } from "@/components/miyuki-ui/ink-wash";

export default function InkWashDemo() {
  return (
    <InkWash className="flex size-full items-end p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">Press anywhere</p>
    </InkWash>
  );
}
