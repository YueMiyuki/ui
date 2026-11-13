"use client";

import { TextField } from "@/components/miyuki-ui/input";

export default function InputStatesDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <TextField
        label="Booking reference"
        defaultValue="OTR-55"
        isInvalid
        errorMessage="References are eight characters, for example OTR-5521."
      />
      <TextField label="Departure station" defaultValue="Otaru" isDisabled description="Set by your rail pass." />
      <TextField label="Member since" defaultValue="March 2019" isReadOnly />
    </div>
  );
}
