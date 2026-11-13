"use client";

import { LitFields } from "@/components/miyuki-ui/lit-fields";

export default function LitFieldsDemo() {
  return (
    <LitFields
      title="Create your Shirakaba account"
      description="Forecasts for the 38 resorts you follow."
      onSubmit={(values) => new Promise((resolve) => setTimeout(resolve, 900, values))}
    />
  );
}
