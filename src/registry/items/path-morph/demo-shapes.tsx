"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { MorphPath } from "@/components/miyuki-ui/path-morph";

function crystal() {
  const arm = [
    [24, -3.2],
    [32.5, -12.8],
    [29.5, -3],
    [39, -2.6],
    [47, 0],
    [39, 2.6],
    [29.5, 3],
    [32.5, 12.8],
    [24, 3.2],
    [10.4, 6],
  ];
  const points: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = ((k * 60 - 90) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    for (const [x, y] of arm)
      points.push(`${(50 + x * cos - y * sin).toFixed(2)} ${(50 + x * sin + y * cos).toFixed(2)}`);
  }
  return `M${points.at(-1)}L${points.join("L")}Z`;
}

const SHAPES = [
  { name: "Crystal", d: crystal() },
  { name: "Drop", d: "M50 9C50 9 77 39 77 60C77 75.5 65 88 50 88C35 88 23 75.5 23 60C23 39 50 9 50 9Z" },
  {
    name: "Cloud",
    d: "M30 72C20.6 72 14 65.4 14 57C14 49 20 42.6 28 42C30 32 38.6 25 49 25C59.4 25 67.6 32 69.6 41.6C78.6 42.4 86 49.6 86 57.5C86 65.8 79.4 72 71 72Z",
  },
  { name: "Mountain", d: "M7 80L35 33L45.5 47L60 22L93 80Z" },
  {
    name: "Wave",
    d: "M6 60C16 44 28 42 39 52C50 62 60 66 71 56C79 49 87 46 94 48L94 80L6 80Z",
  },
];

export default function PathMorphShapesDemo() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SHAPES.length), 2400);
    return () => window.clearInterval(timer);
  }, [reduce, paused]);

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 100 100" className="size-60 text-brand" aria-hidden="true">
        <MorphPath
          d={SHAPES[index].d}
          transition={{ stiffness: 140, damping: 22 }}
          fill="currentColor"
          fillOpacity={0.12}
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinejoin="round"
        />
      </svg>
      <ToggleButtonGroup
        aria-label="Shape"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[SHAPES[index].name]}
        onSelectionChange={(keys) => {
          const next = SHAPES.findIndex((s) => keys.has(s.name));
          if (next >= 0) {
            setIndex(next);
            setPaused(true);
          }
        }}
        className="flex flex-wrap justify-center gap-1"
      >
        {SHAPES.map((shape) => (
          <ToggleButton
            key={shape.name}
            id={shape.name}
            className="h-8 cursor-default rounded-full px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-150 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:text-foreground data-[selected]:bg-brand-soft data-[selected]:text-brand-strong"
          >
            {shape.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
