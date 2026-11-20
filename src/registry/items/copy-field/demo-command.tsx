"use client";

import { CopyField } from "@/components/miyuki-ui/copy-field";

export default function CopyFieldCommandDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <CopyField
        label="Install the forecast client"
        prefix="$"
        value="pnpm add @kitakaze/forecast"
        copyLabel="Copy install command"
      />
      <CopyField
        label="Fetch tomorrow's snow report"
        prefix="$"
        value="kitakaze forecast --station hakuba-happo --days 1"
        copyLabel="Copy forecast command"
        description="Runs against the public feed. No key needed."
      />
    </div>
  );
}
