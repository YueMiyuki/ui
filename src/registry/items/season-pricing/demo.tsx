"use client";

import { SeasonPricing } from "@/components/miyuki-ui/season-pricing";

const seasons = [
  { id: "early", label: "Early", dates: "12 December to 22 December" },
  { id: "peak", label: "Peak", dates: "23 December to 1 March" },
  { id: "spring", label: "Spring", dates: "2 March to 6 May" },
];

const plans = [
  {
    id: "day",
    name: "Day pass",
    description: "One day on the mountain, from the first lift to the last.",
    prices: { early: 6800, peak: 8400, spring: 5900 },
    per: "for one day",
    features: ["All 34 lifts, 08:30 to 16:30", "Night skiing on Friday and Saturday", "A locker at the base station"],
    action: "Buy a day pass",
  },
  {
    id: "five",
    name: "Five days",
    description: "Any five days within seven, for a week in the valley.",
    prices: { early: 29600, peak: 36800, spring: 24400 },
    per: "for five days",
    features: [
      "All lifts and night skiing every evening",
      "Entry to the Ōyu hot spring each day",
      "One morning with a guide on the ridge",
      "Change your days until 18:00 the night before",
    ],
    action: "Buy five days",
    recommended: "Most chosen",
  },
  {
    id: "season",
    name: "Season",
    description: "Every day the lifts run, opening to closing.",
    prices: { early: 98500, peak: 112000, spring: 46500 },
    per: "for the season",
    features: [
      "Every lift, every day, night skiing included",
      "Ten guest days at half price",
      "Parking at Nagasaka all winter",
    ],
    action: "Buy the season",
  },
];

export default function SeasonPricingDemo() {
  return (
    <SeasonPricing
      className="max-w-4xl"
      title="Lift passes for the 2026–27 winter"
      description="Prices follow the snow. Choose the season you will ride in to see what each pass costs."
      seasons={seasons}
      plans={plans}
      defaultValue="peak"
    >
      Prices are per adult and include tax. Children under 12 ride free with a paying adult. A spring season pass is
      valid from 2 March. Passes bought online are collected from the machines at Nagasaka or Gondola base with the code
      in your email.
    </SeasonPricing>
  );
}
