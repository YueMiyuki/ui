"use client";

import { Button } from "@/components/miyuki-ui/button";
import { HeroSimple } from "@/components/miyuki-ui/hero-sections";
import { landscape } from "@/registry/lib/art";

const hours = [
  ["06:00", "−11°"],
  ["09:00", "−8°"],
  ["12:00", "−5°"],
  ["15:00", "−7°"],
];

export default function HeroSectionsSimpleDemo() {
  return (
    <HeroSimple
      brand={
        <a
          href="#home"
          className="flex items-center gap-2 rounded-md text-[15px] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <svg viewBox="0 0 20 20" className="size-5 text-brand" aria-hidden="true">
            <path d="M1.5 16.5 7.25 6.75l3.1 5.1 2.15-3.1 6 7.75Z" fill="currentColor" />
            <path d="m5.6 9.55 1.65-2.8 1.7 2.8-.85-.55-.85.55-.8-.5Z" fill="var(--card)" />
          </svg>
          Kitakaze
        </a>
      }
      links={[
        { label: "Forecasts", href: "#forecasts" },
        { label: "Huts", href: "#huts" },
        { label: "Pricing", href: "#pricing" },
      ]}
      signIn={
        <Button variant="secondary" size="sm">
          Sign in
        </Button>
      }
      title={"Know the mountain\nbefore you leave the valley"}
      description="Hour-by-hour forecasts for 214 peaks, written by people who climb them."
      actions={
        <>
          <Button size="lg">Start free</Button>
          <Button size="lg" variant="secondary">
            See a sample forecast
          </Button>
        </>
      }
      preview={
        <div className="@container relative aspect-[16/9]">
          <img
            src={landscape("hero-shirouma", { mood: "dawn", width: 1600, height: 900 })}
            alt="Dawn over the Northern Alps"
            className="size-full object-cover"
          />
          <div className="absolute bottom-5 left-5 hidden w-72 rounded-2xl border border-foreground/10 bg-card/80 p-4 text-left shadow-lg backdrop-blur-md @lg:block">
            <p className="text-xs text-muted-foreground">Shirouma-dake, 2,932 m</p>
            <p className="mt-0.5 text-sm font-semibold">Clear above 1,800 m until 14:00</p>
            <dl className="mt-3.5 grid grid-cols-4 gap-2 border-t border-border pt-3">
              {hours.map(([time, temp]) => (
                <div key={time}>
                  <dt className="text-[11px] text-muted-foreground tabular-nums">{time}</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums">{temp}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      }
    />
  );
}
