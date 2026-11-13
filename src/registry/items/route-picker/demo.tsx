"use client";

import { useState } from "react";
import { RoutePicker, type RouteStation, type RouteValue } from "@/components/miyuki-ui/route-picker";

const stations: RouteStation[] = [
  { id: "otaru", name: "Otaru", km: 0, min: 0 },
  { id: "chikko", name: "Otaru-Chikkō", km: 2.0, min: 3 },
  { id: "asari", name: "Asari", km: 5.8, min: 8 },
  { id: "zenibako", name: "Zenibako", km: 13.6, min: 17 },
  { id: "hoshimi", name: "Hoshimi", km: 15.6, min: 20 },
  { id: "inazumi", name: "Inazumi-Kōen", km: 19.3, min: 24 },
  { id: "teine", name: "Teine", km: 21.6, min: 27 },
  { id: "kotoni", name: "Kotoni", km: 30.5, min: 38 },
  { id: "sapporo", name: "Sapporo", km: 33.8, min: 43 },
];

export default function RoutePickerDemo() {
  const [route, setRoute] = useState<RouteValue | null>(["asari", "kotoni"]);
  return <RoutePicker label="Hakodate line, Otaru to Sapporo" stations={stations} value={route} onChange={setRoute} />;
}
