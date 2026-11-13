"use client";

import { type GeoPermissibleObjects, geoPath, geoTransform } from "d3-geo";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-50m.json";
import { ContourPlot, type ContourPlotFrame } from "@/components/miyuki-ui/contour-plot";
import { createRng } from "@/components/miyuki-ui/lib/prng";

const WEST = 120;
const EAST = 156;
const NORTH = 50;
const SOUTH = 24;

type System = [lon: number, lat: number, sx: number, sy: number, amount: number];

const systems: System[] = [
  [123.5, 44.5, 8, 6.5, 30],
  [150, 46.5, 6.4, 5.4, -36],
  [141, 27.5, 8.5, 3.8, 9],
  [129.5, 32.5, 3, 2.4, -8],
];

const rng = createRng("pressure-0600");
const waves = Array.from({ length: 5 }, () => ({
  kx: rng.range(0.12, 0.32),
  ky: rng.range(0.12, 0.32),
  phase: rng.range(0, Math.PI * 2),
  amp: rng.range(0.4, 0.9),
}));

const pressure = Array.from({ length: NORTH - SOUTH + 1 }, (_, r) => {
  const lat = NORTH - r;
  return Array.from({ length: EAST - WEST + 1 }, (_, c) => {
    const lon = WEST + c;
    let p = 1012 - 0.22 * (lat - 37);
    for (const [x, y, sx, sy, a] of systems) p += a * Math.exp(-(((lon - x) / sx) ** 2 + ((lat - y) / sy) ** 2) / 2);
    for (const w of waves) p += w.amp * Math.sin(lon * w.kx + lat * w.ky + w.phase);
    return Math.round(p * 10) / 10;
  });
});

const lowest = Math.round(Math.min(...pressure.flat()));

type Ring = [number, number][];
type Shape = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

const topology = landTopology as unknown as Parameters<typeof feature>[0];
const land = feature(topology, topology.objects.land) as unknown as { features: { geometry: Shape }[] };
const nearby = (ring: Ring) =>
  ring.some(([lon, lat]) => lon > WEST - 6 && lon < EAST + 6 && lat > SOUTH - 6 && lat < NORTH + 6);
const coast = {
  type: "MultiPolygon",
  coordinates: land.features.flatMap(({ geometry: g }) =>
    (g.type === "Polygon" ? [g.coordinates] : g.coordinates).filter((poly) => nearby(poly[0])),
  ),
} as GeoPermissibleObjects;

function Coastline({ x, y }: ContourPlotFrame) {
  const path = geoPath(
    geoTransform({
      point(lon, lat) {
        this.stream.point(x(lon), y(lat));
      },
    }),
  );
  return (
    <path
      d={path(coast) ?? ""}
      strokeWidth={0.75}
      strokeLinejoin="round"
      className="fill-card/45 stroke-foreground/35 dark:fill-foreground/5"
    />
  );
}

const degrees = (suffix: [string, string]) => (v: number) =>
  `${Number(Math.abs(v).toFixed(1))}°${v >= 0 ? suffix[0] : suffix[1]}`;

export default function ContourPlotDemo() {
  return (
    <ContourPlot
      className="w-full max-w-[520px]"
      label="Surface pressure, 06:00"
      value={`${lowest} hPa`}
      caption="deepest low, east of the Kurils"
      values={pressure}
      levels={4}
      unit="hPa"
      name="Pressure"
      xDomain={[WEST, EAST]}
      yDomain={[NORTH, SOUTH]}
      formatX={degrees(["E", "W"])}
      formatY={degrees(["N", "S"])}
      underlay={(frame) => <Coastline {...frame} />}
    />
  );
}
