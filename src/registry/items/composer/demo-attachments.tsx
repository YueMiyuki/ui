"use client";

import { Composer, type ComposerFile } from "@/components/miyuki-ui/composer";
import { landscape } from "@/registry/lib/art";

const attached: ComposerFile[] = [
  {
    id: "photo",
    name: "cornice-below-the-col.jpg",
    size: 2_412_544,
    type: "image/jpeg",
    src: landscape("kiso", { mood: "snow", width: 96, height: 96 }),
  },
  { id: "gear", name: "party-gear-list.pdf", size: 86_016, type: "application/pdf" },
];

export default function ComposerAttachmentsDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <div>
        <p className="text-sm leading-5 font-medium">Note to the warden</p>
        <p className="text-[13px] leading-5 text-muted-foreground">
          Kiso ridge hut. Replies usually come within a day.
        </p>
      </div>
      <Composer
        aria-label="Note to the warden"
        submitOn="mod-enter"
        minRows={3}
        maxLength={600}
        maxFiles={4}
        accept={["image/*", ".pdf", ".gpx"]}
        tools={["attach", "bold", "italic", "link"]}
        defaultFiles={attached}
        defaultValue="Hello, we are a party of four arriving on Friday 14 March at about half past three. Attached are our gear list and a photo of the cornice we passed last spring. Is it still that large, and could we have the later dinner sitting?"
        onSubmit={() => new Promise((resolve) => setTimeout(resolve, 900))}
      />
    </div>
  );
}
