"use client";

import { Button } from "@/components/miyuki-ui/button";
import { Spinner, type SpinnerSize, type SpinnerVariant } from "@/components/miyuki-ui/spinner";

const variants: { variant: SpinnerVariant; name: string }[] = [
  { variant: "ring", name: "Ring" },
  { variant: "drops", name: "Drops" },
  { variant: "orbit", name: "Orbit" },
];

const sizes: SpinnerSize[] = ["xs", "sm", "md", "lg", "xl"];

export default function SpinnerDemo() {
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex items-end gap-12">
        {variants.map(({ variant, name }) => (
          <div key={variant} className="flex flex-col items-center gap-3">
            <Spinner variant={variant} />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-8">
        {sizes.map((size) => (
          <Spinner key={size} size={size} />
        ))}
      </div>
      <Button iconStart={<Spinner size="sm" className="text-current" aria-hidden />}>Saving</Button>
    </div>
  );
}
