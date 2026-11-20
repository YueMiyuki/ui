"use client";

import { LetterRollLoader, SelectionLoader, TypingLoader } from "@/components/miyuki-ui/type-loaders";

export default function TypeLoadersTextDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
      <TypingLoader size={28} text="Reading the forecast" />
      <LetterRollLoader size={28} text="Yuki" label="Checking snow depth" />
      <SelectionLoader size={28} text="Otaru" label="Finding stops in Otaru" />
    </div>
  );
}
