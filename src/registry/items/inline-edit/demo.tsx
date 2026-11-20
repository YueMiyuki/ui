"use client";

import { InlineEdit } from "@/components/miyuki-ui/inline-edit";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function InlineEditDemo() {
  return (
    <header className="flex w-full max-w-xl flex-col gap-2">
      <InlineEdit
        as="h2"
        label="Trip title"
        placeholder="Add a title"
        defaultValue="Hakuba, late February"
        onSave={() => pause(900)}
        className="text-3xl leading-tight font-semibold tracking-[-0.02em] text-foreground"
      />
      <InlineEdit
        as="p"
        label="Trip description"
        placeholder="Add a description"
        defaultValue="Four days on the Happo-one ridge, with a night at the Tengu hut."
        onSave={() => pause(900)}
        className="text-base text-muted-foreground"
      />
      <p className="mt-2 text-[13px] text-muted-foreground">21 to 25 February · 4 people · 2 huts</p>
    </header>
  );
}
