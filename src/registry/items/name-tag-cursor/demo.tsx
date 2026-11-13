"use client";

import { NameTagCursor } from "@/components/miyuki-ui/name-tag-cursor";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const author = people.find((p) => p.name === "Mateo Álvarez")!;

export default function NameTagCursorDemo() {
  return (
    <NameTagCursor title={author.name} className="w-full max-w-[380px] rounded-2xl">
      <article className="overflow-clip rounded-2xl border border-border bg-card shadow-sm">
        <img
          src={landscape("kiso-road", { mood: "snow", width: 760, height: 460 })}
          alt="Snow on the hills above the old post road"
          draggable={false}
          className="aspect-[38/23] w-full object-cover"
        />
        <div className="p-5">
          <p className="text-[13px] text-muted-foreground">Travel · 8 min read</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.01em]">A week on the Kiso road</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            Seven post towns, one forest trail and a snowfall that closed the pass behind us on the third night.
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <img src={author.avatar} alt="" className="size-8 rounded-full bg-muted" />
            <div className="min-w-0 text-[13px]">
              <p className="font-medium">{author.name}</p>
              <p className="text-muted-foreground">12 February</p>
            </div>
          </div>
        </div>
      </article>
    </NameTagCursor>
  );
}
