"use client";

import { Button } from "@/components/miyuki-ui/button";
import { SilkFolds } from "@/components/miyuki-ui/silk-folds";

export default function SilkFoldsDemo() {
  return (
    <SilkFolds className="flex size-full items-center px-6 py-12 sm:px-12 lg:px-20">
      <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(ellipse_62%_80%_at_18%_52%,color-mix(in_oklab,var(--background)_55%,transparent),transparent)]" />
      <div className="relative max-w-[36rem]">
        <h2 className="font-display text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-[60px]">
          Woven in Kiso, worn everywhere.
        </h2>
        <p className="mt-5 max-w-sm text-base text-pretty text-foreground/75 sm:text-lg">
          Scarves and stoles in raw silk, dyed in small lots through the winter.
        </p>
        <Button size="lg" className="mt-8">
          See the collection
        </Button>
      </div>
    </SilkFolds>
  );
}
