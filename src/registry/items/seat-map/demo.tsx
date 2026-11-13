"use client";

import { useState } from "react";
import { SeatMap, type SeatMapCar } from "@/components/miyuki-ui/seat-map";

const cars: SeatMapCar[] = [
  { id: "1", rows: 11, price: 5220, taken: ["1A", "1B", "2D", "4A", "5C", "5D", "7B", "9A", "9B", "10D", "11C"] },
  { id: "2", rows: 13, price: 5220, taken: ["2A", "3C", "3D", "6A", "6B", "8D", "10A", "12B", "12C", "13D"] },
  {
    id: "3",
    rows: 13,
    price: 5220,
    name: "Reserved",
    taken: [
      "1A",
      "1B",
      "2C",
      "2D",
      "3A",
      "4D",
      "5B",
      "6A",
      "6B",
      "7C",
      "9A",
      "9D",
      "10B",
      "10C",
      "12A",
      "12D",
      "13C",
      "13D",
    ],
  },
  { id: "4", rows: 9, price: 8250, name: "Green", layout: "A BC", taken: ["1A", "2B", "2C", "5A", "7B", "7C"] },
  { id: "5", rows: 13, price: 5220, taken: ["1C", "1D", "4A", "4B", "5D", "8A", "8C", "11B", "11D"] },
  { id: "6", rows: 11, price: 5220, taken: ["2A", "3B", "3C", "6D", "7A", "8B", "10C", "10D"] },
];

export default function SeatMapDemo() {
  const [seats, setSeats] = useState<string[]>(["3-8C", "3-8D"]);
  return (
    <SeatMap
      label="Limited express 12, Sapporo to Asahikawa"
      towards="Asahikawa"
      cars={cars}
      defaultCar="3"
      value={seats}
      onChange={setSeats}
    />
  );
}
