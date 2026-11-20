"use client";

import { CopyField } from "@/components/miyuki-ui/copy-field";

export default function CopyFieldDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg leading-7 font-semibold tracking-tight text-foreground">Share this trip</h3>
        <p className="text-sm text-muted-foreground">
          Hakuba, 21 to 25 February. Four people, two huts and the Happo-one ridge.
        </p>
      </div>
      <CopyField
        label="Invite link"
        value="https://kitakaze.example/trips/hakuba-february/join?code=K7PX-2Q4M"
        description="Anyone with the link can join until 14 February."
      />
      <CopyField
        label="Trip API key"
        value="kz_live_7Hq2Lw9nB4xZ0cR8tY3m6Pk1f3a9"
        masked
        copyLabel="Copy API key"
        description="Lets your own apps read the itinerary. Keep it out of shared code."
      />
    </div>
  );
}
