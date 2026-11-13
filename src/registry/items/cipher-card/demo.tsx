"use client";

import { CipherCard } from "@/components/miyuki-ui/cipher-card";

export default function CipherCardDemo() {
  return (
    <div className="flex flex-col items-center gap-5">
      <CipherCard text="Sealed" className="h-[380px] w-80 max-w-full" />
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Route plans are encrypted on this device. Hover to read the cipher.
      </p>
    </div>
  );
}
