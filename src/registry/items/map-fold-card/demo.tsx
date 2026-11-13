"use client";

import { MapFoldCard } from "@/components/miyuki-ui/map-fold-card";
import { topo } from "@/registry/lib/art";

const trails = [
  {
    d: "M40 250 C90 230 110 180 160 170 S240 120 280 90 S360 60 420 52",
    color: "oklch(0.56 0.17 20)",
    label: "Happō ridge, 7.2 km",
    x: 300,
    y: 70,
  },
  {
    d: "M70 90 C110 70 150 80 170 110 S150 170 110 160 S60 120 70 90 Z",
    color: "oklch(0.5 0.13 244)",
    label: "Tsugaike loop, 5.5 km",
    x: 34,
    y: 186,
  },
  {
    d: "M200 290 C230 250 270 250 300 230 S380 200 450 210",
    color: "oklch(0.5 0.11 160)",
    label: "Valley path, 4.1 km",
    x: 318,
    y: 246,
  },
];

export default function MapFoldCardDemo() {
  return (
    <MapFoldCard title="Hakuba valley trails" subtitle="Scale 1:25,000" aria-label="Folded trail map">
      <div className="relative size-full bg-[oklch(0.9_0.04_178/0.35)]">
        <img
          src={topo("hakuba-valley", { width: 960, height: 608, color: "#7d97b0" })}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80"
        />
        <svg viewBox="0 0 480 304" className="absolute inset-0 size-full" aria-label="Trails">
          {trails.map((t) => (
            <g key={t.label}>
              <path
                d={t.d}
                fill="none"
                stroke="var(--miyuki-map-fold-card-paper)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path
                d={t.d}
                fill="none"
                stroke={t.color}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="7 4"
              />
              <text
                x={t.x}
                y={t.y}
                fontSize="11"
                fontWeight="600"
                fill="var(--miyuki-map-fold-card-ink)"
                stroke="var(--miyuki-map-fold-card-paper)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {t.label}
              </text>
            </g>
          ))}
          <path d="M268 101 l7 -12 l7 12 z" fill="var(--miyuki-map-fold-card-ink)" />
          <text
            x="286"
            y="104"
            fontSize="10"
            fill="var(--miyuki-map-fold-card-ink)"
            stroke="var(--miyuki-map-fold-card-paper)"
            strokeWidth="3"
            paintOrder="stroke"
          >
            Karamatsu hut
          </text>
          <g transform="translate(446 268)" fill="var(--miyuki-map-fold-card-ink)">
            <path d="M0 -14 L5 0 L0 -3 L-5 0 Z" />
            <text y="12" fontSize="10" textAnchor="middle">
              N
            </text>
          </g>
        </svg>
      </div>
    </MapFoldCard>
  );
}
