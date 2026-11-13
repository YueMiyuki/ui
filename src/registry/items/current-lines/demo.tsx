"use client";

import { Input, Label, TextField } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { CurrentLines } from "@/components/miyuki-ui/current-lines";

export default function CurrentLinesDemo() {
  return (
    <CurrentLines className="flex size-full flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="max-w-lg font-display text-4xl leading-[1.08] font-semibold tracking-[-0.015em] text-balance sm:text-5xl">
        Join the first ascent
      </h2>
      <p className="mt-4 text-base text-muted-foreground">Routes open the morning the snow settles.</p>
      <form
        className="mt-8 flex w-full max-w-sm flex-col gap-2 sm:flex-row"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField type="email" name="email" isRequired className="flex-1" aria-label="Email address">
          <Label className="sr-only">Email address</Label>
          <Input
            placeholder="you@example.com"
            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground hover:border-border-strong focus:border-brand focus:ring-[3px] focus:ring-ring"
          />
        </TextField>
        <Button type="submit">Request a place</Button>
      </form>
    </CurrentLines>
  );
}
