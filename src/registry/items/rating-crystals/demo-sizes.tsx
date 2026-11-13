"use client";

import { RatingCrystals } from "@/components/miyuki-ui/rating-crystals";

export default function RatingCrystalsSizesDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <RatingCrystals aria-label="Rating, 24 pixels" size={24} defaultValue={5} readOnly />
      <RatingCrystals aria-label="Rating, 36 pixels" size={36} defaultValue={3} />
      <RatingCrystals aria-label="Rating, 56 pixels" size={56} defaultValue={5} />
    </div>
  );
}
