"use client";

import { DotMatrixDisplay } from "@/components/miyuki-ui/dot-matrix-display";

export default function DotMatrixDisplayDemo() {
  return (
    <div className="w-full max-w-3xl">
      <DotMatrixDisplay
        cols={128}
        text={[
          "06:12 OTARU PLATFORM 2",
          { text: "The 06:40 to Sapporo is delayed by ten minutes", mode: "scroll", color: "var(--chart-4)" },
        ]}
      />
    </div>
  );
}
