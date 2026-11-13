"use client";

import { RouteCard, type RouteCardRoute, type RoutePoint } from "@/components/miyuki-ui/route-card";
import { topo } from "@/registry/lib/art";

const stops: [m: number, lat: number, lon: number][] = [
  [1830, 36.6985, 137.8045],
  [2060, 36.699, 137.7935],
  [2437, 36.6935, 137.77],
  [2696, 36.6869, 137.7569],
  [2560, 36.6955, 137.756],
  [2740, 36.708, 137.7575],
  [2610, 36.717, 137.756],
  [2903, 36.73, 137.758],
  [2770, 36.736, 137.7565],
  [2812, 36.742, 137.7555],
  [2700, 36.748, 137.757],
  [2932, 36.758, 137.759],
  [2832, 36.7545, 137.765],
  [2350, 36.7525, 137.776],
  [1780, 36.751, 137.79],
  [1450, 36.749, 137.801],
  [1250, 36.747, 137.8106],
];

const KM_LAT = 111.2;
const KM_LON = 111.32 * Math.cos((36.72 * Math.PI) / 180);
const DISTANCE = 18.4;

function trace(): RoutePoint[] {
  const raw = [{ m: stops[0][0], lat: stops[0][1], lon: stops[0][2], d: 0 }];
  for (let i = 1; i < stops.length; i++) {
    const [m0, lat0, lon0] = stops[i - 1];
    const [m1, lat1, lon1] = stops[i];
    const len = Math.hypot(lat1 - lat0, lon1 - lon0) || 1;
    for (let s = 1; s <= 5; s++) {
      const t = s / 5;
      const bend = Math.sin(Math.PI * t) * 0.0007 * (i % 2 ? 1 : -1);
      const lat = lat0 + (lat1 - lat0) * t - ((lon1 - lon0) / len) * bend;
      const lon = lon0 + (lon1 - lon0) * t + ((lat1 - lat0) / len) * bend;
      const prev = raw[raw.length - 1];
      const d = prev.d + Math.hypot((lat - prev.lat) * KM_LAT, (lon - prev.lon) * KM_LON);
      raw.push({ m: m0 + (m1 - m0) * (0.5 - 0.5 * Math.cos(Math.PI * t)), lat, lon, d });
    }
  }
  const total = raw[raw.length - 1].d;
  return raw.map((p) => ({
    km: (p.d / total) * DISTANCE,
    m: Math.round(p.m),
    lat: p.lat,
    lon: p.lon,
    x: 0.5 + ((p.lat - 36.72245) * KM_LAT) / 13,
    y: 0.5 + ((p.lon - 137.78305) * KM_LON) / 6.81,
  }));
}

const points = trace();
const at = (stop: number) => points[stop * 5].km;

const route: RouteCardRoute = {
  name: "Hakuba ridge traverse",
  region: "Northern Alps, from Happō-one to Sarukura",
  distance: DISTANCE,
  ascent: 1620,
  descent: 2200,
  time: "9 h 40 min",
  grade: { label: "Hard", level: 4 },
  points,
  waypoints: [
    { km: 0, name: "Happō-one", kind: "place" },
    { km: at(3), name: "Karamatsu-dake" },
    { km: at(7), name: "Hakuba-yari" },
    { km: at(9), name: "Shakushi-dake", label: false },
    { km: at(11), name: "Hakuba-dake" },
    { km: at(16), name: "Sarukura", kind: "place" },
  ],
  mapKm: 13,
  north: 90,
};

export default function RouteCardDemo() {
  return (
    <div className="w-full max-w-[420px]">
      <RouteCard route={route} map={topo("hakuba-ridge", { width: 840, height: 440, color: "#8aa2bb" })} />
    </div>
  );
}
