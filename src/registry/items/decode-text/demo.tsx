"use client";

import { DecodeText } from "@/components/miyuki-ui/decode-text";

const lines = ["Route plan decrypted.", "Summit window 05:40 to 07:15.", "Share with: Haruka, Jonas."];

export default function DecodeTextDemo() {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 font-mono text-[20px] leading-snug text-foreground">
        {lines.map((line) => (
          <p key={line}>
            <DecodeText text={line} />
          </p>
        ))}
      </div>
    </div>
  );
}
