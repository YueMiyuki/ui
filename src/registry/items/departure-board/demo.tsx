"use client";

import { type Departure, DepartureBoard } from "@/components/miyuki-ui/departure-board";

const departures: Departure[] = [
  { time: "08:02", destination: "Kutchan", train: "Local", track: 4 },
  { time: "08:09", destination: "Airport", train: "Rapid", track: 1 },
  { time: "08:16", destination: "Sapporo", train: "Local", track: 2, delay: 6 },
  { time: "08:24", destination: "Yoichi", train: "Local", track: 4 },
  { time: "08:31", destination: "Airport", train: "Rapid", track: 1 },
  { time: "08:40", destination: "Iwamizawa", train: "Local", track: 2 },
  { time: "08:47", destination: "Oshamambe", train: "Local", track: 3 },
  { time: "08:53", destination: "Airport", train: "Rapid", track: 1 },
  { time: "09:02", destination: "Sapporo", train: "Local", track: 2, delay: 5 },
  { time: "09:11", destination: "Yoichi", train: "Local", track: 4 },
  { time: "09:20", destination: "Airport", train: "Rapid", track: 1 },
  { time: "09:31", destination: "Kutchan", train: "Local", track: 3 },
];

export default function DepartureBoardDemo() {
  return (
    <div className="w-full max-w-2xl">
      <DepartureBoard
        station="Otaru"
        caption="Departures, Saturday 13 February"
        departures={departures}
        time="07:58"
        interval={7000}
      />
    </div>
  );
}
