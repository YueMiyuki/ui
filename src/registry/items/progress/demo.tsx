"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { ProgressBar, ProgressRing } from "@/components/miyuki-ui/progress";

export default function ProgressDemo() {
  const [value, setValue] = useState(64);

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ProgressBar label="Uploading" value={value} />
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          iconStart={<Plus />}
          isDisabled={value >= 100}
          onPress={() => setValue((v) => Math.min(100, v + 10))}
        >
          Add 10%
        </Button>
      </div>
      <ProgressBar label="Checking the route" isIndeterminate />
      <div className="flex items-center gap-6">
        <ProgressRing isIndeterminate label="Loading forecast" />
        <ProgressRing value={40} label="Photos synced" />
        <ProgressRing value={75} size="lg" showValue label="Trip packed" />
      </div>
    </div>
  );
}
