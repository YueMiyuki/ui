"use client";

import { CheckboxCard, CheckboxGroup } from "@/components/miyuki-ui/checkbox";

export default function CheckboxCardsDemo() {
  return (
    <CheckboxGroup label="Trip add-ons" defaultValue={["onsen"]} className="w-full max-w-md">
      <CheckboxCard value="gear" description="Skis, boots and poles, ¥3,200 a day">
        Gear rental
      </CheckboxCard>
      <CheckboxCard value="guide" description="Half day with a local guide, ¥9,500">
        Guide
      </CheckboxCard>
      <CheckboxCard value="onsen" description="Unlimited entry to three baths, ¥1,800">
        Onsen pass
      </CheckboxCard>
    </CheckboxGroup>
  );
}
