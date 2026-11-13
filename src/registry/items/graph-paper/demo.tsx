"use client";

import { DotPaper, GridPaper } from "@/components/miyuki-ui/graph-paper";

export default function GraphPaperDemo() {
  return (
    <div className="grid size-full grid-rows-2 sm:grid-cols-2 sm:grid-rows-1">
      <GridPaper className="flex flex-col items-center justify-center gap-2 border-b border-border p-8 text-center sm:border-r sm:border-b-0">
        <h3 className="font-display text-3xl leading-tight font-semibold tracking-[-0.01em] text-balance sm:text-4xl">
          Fences in the snow
        </h3>
        <p className="text-[13px] text-muted-foreground">Grid, 32 px cells</p>
      </GridPaper>
      <DotPaper className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <h3 className="font-display text-3xl leading-tight font-semibold tracking-[-0.01em] text-balance sm:text-4xl">
          Frost on the glass
        </h3>
        <p className="text-[13px] text-muted-foreground">Dots, 20 px apart</p>
      </DotPaper>
    </div>
  );
}
