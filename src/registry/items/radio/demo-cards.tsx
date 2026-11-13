"use client";

import { RadioCard, RadioGroup } from "@/components/miyuki-ui/radio";

export default function RadioCardsDemo() {
  return (
    <RadioGroup label="Lift pass" defaultValue="five-days" className="w-full max-w-md">
      <RadioCard value="day" trailing="¥6,400" description="Every lift on one mountain, 8:30 to 16:30.">
        Day pass
      </RadioCard>
      <RadioCard value="five-days" trailing="¥28,000" description="Any five days this winter, across all ten resorts.">
        Five days
      </RadioCard>
      <RadioCard value="season" trailing="¥118,000" description="Unlimited riding until the lifts close in May.">
        Season
      </RadioCard>
    </RadioGroup>
  );
}
