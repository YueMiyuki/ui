"use client";

import { useState } from "react";
import { PullCord } from "@/components/miyuki-ui/pull-cord";
import { cn } from "@/lib/utils";

export default function PullCordDemo() {
  const [on, setOn] = useState(false);

  return (
    <div className="flex items-start gap-3">
      <div className="relative w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_30%,color-mix(in_oklab,var(--chart-4)_30%,transparent),transparent_70%)] transition-opacity",
            on ? "opacity-100 duration-300 ease-out" : "opacity-0 duration-500",
          )}
        />
        <svg viewBox="0 0 256 150" aria-hidden="true" className="relative block w-full">
          <defs>
            <linearGradient id="pull-cord-demo-cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--chart-4)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--chart-4)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="pull-cord-demo-bulb">
              <stop offset="0" stopColor="oklch(0.99 0.03 95)" />
              <stop offset="0.5" stopColor="var(--chart-4)" stopOpacity="0.8" />
              <stop offset="1" stopColor="var(--chart-4)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M100 70L156 70L214 150L42 150Z"
            fill="url(#pull-cord-demo-cone)"
            className={cn("transition-opacity", on ? "opacity-100 duration-300" : "opacity-0 duration-500")}
          />
          <line x1="128" y1="0" x2="128" y2="40" className="stroke-muted-foreground" strokeWidth="1.5" />
          <circle
            cx="128"
            cy="72"
            r="26"
            fill="url(#pull-cord-demo-bulb)"
            className={cn("transition-opacity", on ? "opacity-100 duration-300" : "opacity-0 duration-500")}
          />
          <circle
            cx="128"
            cy="70"
            r="7"
            className={cn("transition-[fill] duration-300", on ? "fill-[oklch(0.98_0.04_95)]" : "fill-muted")}
          />
          <path d="M96 70C96 50 110 40 128 40C146 40 160 50 160 70Z" className="fill-primary" />
          <path d="M96 70L160 70" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M108 48C112 44 118 42 124 42"
            fill="none"
            stroke="white"
            strokeOpacity="0.25"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative flex items-end justify-between gap-3 px-5 pt-1 pb-4">
          <div>
            <p className="text-sm font-medium">Reading lamp</p>
            <p className="text-[13px] text-muted-foreground">Kiso hut, room 4</p>
          </div>
          <p className="text-[13px] text-muted-foreground tabular-nums">{on ? "On, 2,700 K" : "Off"}</p>
        </div>
      </div>
      <PullCord pulled={on} onPull={setOn} length={110} label="Reading lamp" />
    </div>
  );
}
