"use client";

import { TextField } from "@/components/miyuki-ui/input";

export default function InputAddonsDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <TextField label="Website" prefix="https://" suffix=".jp" defaultValue="ryokan-shizuku" autoComplete="url" />
      <TextField label="Price per night" prefix="¥" defaultValue="18,400" inputMode="numeric" />
    </div>
  );
}
