"use client";

import { DataGrid, type DataGridColumn } from "@/components/miyuki-ui/data-grid";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const stations = ["Asahidake", "Niseko", "Hakuba", "Nozawa", "Zaō", "Myōkō", "Tateyama", "Kiso", "Aso", "Yakushima"];
const sensors = [
  "Anemometer",
  "Snow gauge",
  "Thermometer",
  "Hygrometer",
  "Barometer",
  "Webcam",
  "Rain gauge",
  "Pyranometer",
];

const columns: DataGridColumn[] = [
  { id: "sensor", name: "Sensor", width: 220 },
  { id: "station", name: "Station", type: "select", width: 132, options: stations },
  {
    id: "health",
    name: "Health",
    type: "status",
    width: 124,
    options: [
      { value: "Online", tone: "success" },
      { value: "Drifting", tone: "warning" },
      { value: "Offline", tone: "destructive" },
      { value: "Spare", tone: "neutral" },
    ],
  },
  { id: "battery", name: "Battery %", type: "number", width: 104 },
  { id: "readings", name: "Readings today", type: "number", width: 140 },
];

const rng = createRng("sensors");
const rows = Array.from({ length: 400 }, (_, i) => ({
  sensor: `${rng.pick(sensors)} ${String(i + 1).padStart(3, "0")}`,
  station: rng.pick(stations),
  health: rng.pick(["Online", "Online", "Online", "Online", "Drifting", "Offline", "Spare"]),
  battery: rng.int(8, 100),
  readings: rng.int(0, 1440),
}));

export default function DataGridLargeDemo() {
  return (
    <div className="size-full p-4 sm:p-6">
      <DataGrid aria-label="Sensors" className="h-full" columns={columns} rows={rows} />
    </div>
  );
}
