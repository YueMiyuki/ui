"use client";

import { type Departure, TimetablePicker, type TrainKind } from "@/components/miyuki-ui/timetable-picker";

const ride: Record<TrainKind, number> = { local: 47, rapid: 38, express: 32 };
const bound: Record<TrainKind, string> = { local: "Sapporo", rapid: "Iwamizawa", express: "New Chitose Airport" };

const plan: [string, TrainKind][] = [
  ["05:32", "local"],
  ["05:51", "local"],
  ["06:05", "local"],
  ["06:18", "rapid"],
  ["06:29", "local"],
  ["06:41", "express"],
  ["06:53", "local"],
  ["07:02", "rapid"],
  ["07:12", "local"],
  ["07:21", "express"],
  ["07:29", "local"],
  ["07:38", "rapid"],
  ["07:44", "local"],
  ["07:58", "express"],
  ["08:07", "local"],
  ["08:15", "rapid"],
  ["08:26", "local"],
  ["08:34", "express"],
  ["08:46", "local"],
  ["08:55", "rapid"],
  ["09:04", "local"],
  ["09:17", "express"],
  ["09:28", "local"],
  ["09:39", "rapid"],
  ["09:51", "local"],
  ["10:06", "express"],
  ["10:19", "local"],
  ["10:36", "rapid"],
  ["10:48", "local"],
];

function add(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const departures: Departure[] = plan.map(([time, kind], i) => ({
  time,
  kind,
  arrives: add(time, ride[kind] + (i % 3 === 0 ? 1 : 0)),
  to: bound[kind],
  platform: kind === "local" ? "2" : "1",
}));

export default function TimetablePickerDemo() {
  return (
    <TimetablePicker
      label="Otaru to Sapporo"
      description="Weekdays · Hakodate line"
      from="Otaru"
      to="Sapporo"
      now="07:52"
      departures={departures}
      defaultValue="08:15"
    />
  );
}
