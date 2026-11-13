"use client";

import { type Hut, HutBooking } from "@/components/miyuki-ui/hut-booking";
import { landscape } from "@/registry/lib/art";

const hut: Hut = {
  name: "Shirouma ridge hut",
  region: "Northern Alps",
  altitude: 2730,
  image: landscape("shirouma", { width: 480, height: 270, mood: "snow" }),
  prices: { bunk: 9800, child: 6500, dinner: 2600, breakfast: 1400, lunch: 900 },
  open: { start: "2027-02-01", end: "2027-02-28" },
  booked: ["2027-02-06", "2027-02-07", "2027-02-20", "2027-02-21"],
};

export default function HutBookingDemo() {
  return (
    <div className="w-full max-w-3xl">
      <HutBooking
        hut={hut}
        defaultValue={{ start: "2027-02-12", end: "2027-02-14", adults: 2, dinner: true, breakfast: true }}
      />
    </div>
  );
}
