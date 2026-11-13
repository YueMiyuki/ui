"use client";

import { buttonStyles } from "@/components/miyuki-ui/button";
import { ShrinkingHeader } from "@/components/miyuki-ui/shrinking-header";
import { cn } from "@/lib/utils";
import { landscape } from "@/registry/lib/art";

const items = [
  { name: "Forecast", href: "#forecast", current: true },
  { name: "Maps", href: "#maps" },
  { name: "Pricing", href: "#pricing" },
  { name: "Journal", href: "#journal" },
];

export default function ShrinkingHeaderDemo() {
  return (
    <div className="min-h-full pb-24">
      <ShrinkingHeader
        items={items}
        logo={
          <a
            href="#home"
            className="flex items-center gap-2 rounded-lg text-[15px] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 4.5v8M8 2.5v11M11 5.5v6M8 6.5l2-1.5M5 8.5l-1.5-1" />
              </svg>
            </span>
            Shirakaba
          </a>
        }
        actions={
          <>
            <a href="#sign-in" className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "rounded-full")}>
              Sign in
            </a>
            <a href="#get-the-app" className={cn(buttonStyles({ size: "sm" }), "rounded-full px-4")}>
              Get the app
            </a>
          </>
        }
      />
      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-16 pb-12 text-center">
          <h1 className="mx-auto max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-6xl">
            Snow reports from the people who ski it
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-pretty text-muted-foreground">
            Scroll a little and the bar draws in to a pill that stays with you.
          </p>
        </section>
        <img
          src={landscape("shirakaba", { width: 1600, height: 760, mood: "dawn" })}
          alt="Dawn light over snowy ridges"
          className="aspect-[2/1] w-full rounded-3xl object-cover"
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {["Hakuba", "Nozawa", "Niseko"].map((name, i) => (
            <div key={name} className="rounded-2xl bg-muted p-5">
              <p className="text-sm font-medium">{name}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{[24, 31, 18][i]} cm of new snow overnight</p>
              <div className="mt-8 h-24 rounded-xl bg-background/70" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-[640px] rounded-3xl bg-muted" />
      </main>
    </div>
  );
}
