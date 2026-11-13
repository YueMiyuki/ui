"use client";

import { NumberField } from "@/components/miyuki-ui/number-field";

export default function NumberFieldDemo() {
  return (
    <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-3">
      <NumberField label="Seats" defaultValue={5} minValue={1} maxValue={12} description="Up to 12 per booking." />
      <NumberField
        label="Discount"
        defaultValue={0.1}
        minValue={0}
        maxValue={0.5}
        step={0.05}
        formatOptions={{ style: "percent" }}
        description="Members get 10% off."
      />
      <NumberField
        label="Deposit"
        defaultValue={12000}
        minValue={0}
        step={1000}
        formatOptions={{ style: "currency", currency: "JPY" }}
        description="Refunded at checkout."
      />
    </div>
  );
}
