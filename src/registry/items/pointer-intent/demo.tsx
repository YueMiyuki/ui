"use client";

import { useEffect, useRef, useState } from "react";
import { IntentTrace, PointerIntent } from "@/components/miyuki-ui/pointer-intent";
import { cn } from "@/lib/utils";

type Status = "idle" | "fetching" | "ready";

const routes = [
  { port: "Otaru", line: "Overnight sailing, cabins", next: "13:40" },
  { port: "Aomori", line: "Tsugaru Strait, 3\u00a0h\u00a040\u00a0min", next: "14:05" },
  { port: "Hakodate", line: "Car ferry, twice a day", next: "14:30" },
  { port: "Rishiri", line: "Two boats from Wakkanai", next: "15:10" },
  { port: "Lake Tōya", line: "Island cruise every 30\u00a0min", next: "15:30" },
  { port: "Yakushima", line: "High-speed boat, 1\u00a0h\u00a050\u00a0min", next: "16:15" },
];

const labels: Record<Status, string> = { idle: "Timetable", fetching: "Fetching", ready: "Ready" };

const portOf = (el: Element) => (el as HTMLElement).dataset.port ?? "";

export default function PointerIntentDemo() {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [note, setNote] = useState("Timetables start loading while the pointer is on its way");
  const timers = useRef(new Map<string, number>());
  const began = useRef(new Map<string, number>());

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const id of map.values()) window.clearTimeout(id);
    };
  }, []);

  const set = (port: string, next: Status) => setStatus((s) => ({ ...s, [port]: next }));

  const begin = (el: Element) => {
    const port = portOf(el);
    if (timers.current.has(port)) return;
    began.current.set(port, performance.now());
    set(port, "fetching");
    timers.current.set(
      port,
      window.setTimeout(() => set(port, "ready"), 300),
    );
  };

  const drop = (el: Element) => {
    const port = portOf(el);
    if (el.hasAttribute("data-aim") || el.hasAttribute("data-intent")) return;
    window.clearTimeout(timers.current.get(port));
    timers.current.delete(port);
    began.current.delete(port);
    set(port, "idle");
  };

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-3 text-sm font-medium">Sailings this afternoon</p>
      <PointerIntent
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
        onAim={begin}
        onAimEnd={drop}
        onIntent={(el, { source }) => {
          if (source === "focus") setNote("Fetching began on keyboard focus");
          if (source === "touch") setNote("Fetching began on touch");
          begin(el);
        }}
        onIntentEnd={drop}
      >
        {routes.map((r) => {
          const s = status[r.port] ?? "idle";
          return (
            <button
              key={r.port}
              type="button"
              data-intent-target
              data-port={r.port}
              onPointerEnter={(e) => {
                if (e.pointerType === "touch") return;
                const at = began.current.get(r.port);
                const ms = at === undefined ? 0 : Math.round(performance.now() - at);
                setNote(
                  ms > 0
                    ? `Fetching began ${ms} ms before the pointer arrived`
                    : "Fetching began as the pointer arrived",
                );
              }}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-4 text-left shadow-xs outline-none transition-[border-color,box-shadow,transform] duration-200 ease-settle focus-visible:ring-[3px] focus-visible:ring-ring active:scale-[0.98] data-[aim]:border-brand data-[aim]:shadow-sm data-[intent]:border-brand data-[intent]:shadow-sm"
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{r.port}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{r.next}</span>
              </span>
              <span className="text-[13px] text-muted-foreground">{r.line}</span>
              <span
                className={cn(
                  "mt-auto flex items-center gap-1.5 pt-3 text-xs transition-colors duration-200",
                  s === "idle" ? "text-muted-foreground" : "text-brand-strong",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-colors duration-200",
                    s === "idle" && "bg-border-strong",
                    s === "fetching" && "animate-pulse bg-brand motion-reduce:animate-none",
                    s === "ready" && "bg-brand",
                  )}
                />
                {labels[s]}
              </span>
            </button>
          );
        })}
        <IntentTrace />
      </PointerIntent>
      <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">{note}</p>
    </div>
  );
}
