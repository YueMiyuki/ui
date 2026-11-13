"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface RouteStation {
  id: string;
  name: string;
  km: number;
  min?: number;
}

export type RouteValue = [string, string];

export interface RoutePickerProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  stations: readonly RouteStation[];
  value?: RouteValue | null;
  defaultValue?: RouteValue | null;
  onChange?: (value: RouteValue) => void;
  fare?: (km: number) => number;
  currency?: string;
  label?: ReactNode;
}

const FARE_STEPS: [number, number][] = [
  [3, 210],
  [6, 260],
  [10, 300],
  [15, 380],
  [20, 470],
  [25, 560],
  [30, 650],
  [35, 750],
  [40, 840],
];

function defaultFare(km: number) {
  for (const [limit, yen] of FARE_STEPS) if (km <= limit) return yen;
  return 840 + Math.ceil((km - 40) / 5) * 90;
}

function TrainShape() {
  return (
    <svg aria-hidden="true" viewBox="0 0 34 14" className="block h-3.5 w-[34px] overflow-visible">
      <path
        d="M3 1.5H25C29.2 1.5 32.5 4.3 32.5 7S29.2 12.5 25 12.5H3Q1.5 12.5 1.5 11V3Q1.5 1.5 3 1.5Z"
        className="fill-primary stroke-background"
        strokeWidth={1.5}
      />
      <path d="M5 4.6h4.2M11.4 4.6h4.2M17.8 4.6h4.2" className="stroke-brand" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M27 4.4Q29.6 5.1 30.3 7" className="stroke-brand" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RoutePicker({
  stations,
  value,
  defaultValue = null,
  onChange,
  fare = defaultFare,
  currency = "JPY",
  label = "Choose your journey",
  className,
  ...props
}: RoutePickerProps) {
  const id = useId();
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  const [inner, setInner] = useState<RouteValue | null>(defaultValue);
  const committed = value !== undefined ? value : inner;
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [run, setRun] = useState({ n: 0, span: 0 });
  const [arrived, setArrived] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const index = (sid: string | null | undefined) => (sid == null ? -1 : stations.findIndex((s) => s.id === sid));
  const n = stations.length;
  const pos = (i: number) => (n > 1 ? i / (n - 1) : 0.5);

  const fromI = pending != null ? index(pending) : index(committed?.[0]);
  const toI = pending != null ? -1 : index(committed?.[1]);
  const hasRoute = fromI >= 0 && toI >= 0;
  const previewI = pending != null && hover != null && hover !== pending ? index(hover) : -1;
  const lo = hasRoute ? Math.min(fromI, toI) : -1;
  const hi = hasRoute ? Math.max(fromI, toI) : -1;

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || run.n === 0) return;
    if (reduce) {
      el.style.setProperty("--t", "1");
      return;
    }
    const duration = Math.min(1500, 520 + run.span * 110);
    let start: number | null = null;
    let frame = 0;
    el.style.setProperty("--t", "0");
    const step = (now: number) => {
      start ??= now;
      const x = Math.min(1, (now - start) / duration);
      const eased = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
      el.style.setProperty("--t", eased.toFixed(4));
      if (x < 1) frame = requestAnimationFrame(step);
      else setArrived(true);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [run, reduce]);

  const commit = (next: RouteValue) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
    setArrived(!!reduce);
    setRun((r) => ({ n: r.n + 1, span: Math.abs(index(next[1]) - index(next[0])) }));
  };

  const press = (sid: string) => {
    if (pending == null) {
      setPending(sid);
      return;
    }
    if (pending === sid) {
      setPending(null);
      return;
    }
    const from = pending;
    setPending(null);
    setHover(null);
    commit([from, sid]);
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(n - 1, i + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, i - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "Escape" && pending != null) {
      event.preventDefault();
      setPending(null);
      return;
    } else return;
    event.preventDefault();
    const sid = stations[next].id;
    setFocusId(sid);
    if (pending != null) setHover(sid);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-station="${sid}"]`)?.focus();
  };

  const from = hasRoute ? stations[fromI] : null;
  const to = hasRoute ? stations[toI] : null;
  const km = from && to ? Math.abs(to.km - from.km) : 0;
  const stops = hasRoute ? hi - lo : 0;
  const minutesTaken =
    from && to
      ? from.min != null && to.min != null
        ? Math.abs(to.min - from.min)
        : Math.round(km / 0.78 + stops * 0.6)
      : 0;
  const tabId = focusId ?? pending ?? committed?.[0] ?? stations[0]?.id;
  const d = hasRoute ? pos(toI) - pos(fromI) : 0;
  const trackStyle = {
    "--a": hasRoute ? pos(fromI) : 0,
    "--d": d,
    "--neg": Math.min(0, d),
    "--len": Math.abs(d),
    "--pa": previewI >= 0 ? Math.min(pos(fromI), pos(previewI)) : 0,
    "--pl": previewI >= 0 ? Math.abs(pos(previewI) - pos(fromI)) : 0,
  } as CSSProperties;

  const status = pending
    ? `Getting on at ${stations[index(pending)]?.name}. Now choose where to get off.`
    : from && to
      ? `${from.name} to ${to.name}: ${km.toFixed(1)} kilometres, about ${minutesTaken} minutes, ${money.format(fare(km))}.`
      : "Choose where to get on.";

  return (
    <div {...props} className={cn("@container flex w-full max-w-[880px] flex-col gap-6 text-foreground", className)}>
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-[13px] text-muted-foreground" aria-hidden="true">
          {pending
            ? `On at ${stations[index(pending)]?.name}. Now choose where to get off.`
            : hasRoute
              ? "Choose a station to start again."
              : "Choose where to get on, then where to get off."}
        </span>
      </div>

      <div
        ref={groupRef}
        role="group"
        aria-labelledby={`${id}-label`}
        className={cn("px-11", "@max-[36rem]:px-0 @max-[36rem]:py-6")}
        onPointerLeave={() => setHover(null)}
      >
        <div
          ref={trackRef}
          className={cn("relative h-[124px]", "@max-[36rem]:h-(--rows)")}
          style={
            {
              ...trackStyle,
              "--t": 1,
              "--rows": `${(n - 1) * 52}px`,
              "--span": 1 / Math.max(1, n - 1),
            } as CSSProperties
          }
        >
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-[33px] h-1.5 rounded-full bg-border-strong",
              "@max-[36rem]:inset-x-auto @max-[36rem]:inset-y-0 @max-[36rem]:top-0 @max-[36rem]:left-[15px] @max-[36rem]:h-auto @max-[36rem]:w-1.5",
            )}
          />
          {previewI >= 0 && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute top-[33px] left-[calc(var(--pa)*100%)] h-1.5 w-[calc(var(--pl)*100%)] rounded-full bg-brand/35",
                "@max-[36rem]:top-[calc(var(--pa)*100%)] @max-[36rem]:left-[15px] @max-[36rem]:h-[calc(var(--pl)*100%)] @max-[36rem]:w-1.5",
              )}
            />
          )}
          {hasRoute && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute top-[33px] left-[calc((var(--a)+var(--neg)*var(--t))*100%)] h-1.5 w-[calc(var(--len)*var(--t)*100%)] rounded-full bg-brand",
                "@max-[36rem]:top-[calc((var(--a)+var(--neg)*var(--t))*100%)] @max-[36rem]:left-[15px] @max-[36rem]:h-[calc(var(--len)*var(--t)*100%)] @max-[36rem]:w-1.5",
              )}
            />
          )}
          {stations.map((s, i) => {
            const isFrom = i === fromI;
            const isTo = i === toI;
            const end = isFrom || isTo;
            const inside = hasRoute && i > lo && i < hi;
            const inPreview = previewI >= 0 && i > Math.min(fromI, previewI) && i < Math.max(fromI, previewI);
            const isPreviewEnd = i === previewI;
            const threshold = hasRoute && d !== 0 ? (pos(i) - pos(fromI)) / d : 0;
            return (
              <button
                key={s.id}
                type="button"
                data-station={s.id}
                tabIndex={s.id === tabId ? 0 : -1}
                aria-pressed={end}
                aria-label={`${s.name}, ${s.km.toFixed(1)} km${isFrom ? ", getting on" : isTo ? ", getting off" : ""}`}
                onClick={() => press(s.id)}
                onFocus={() => setFocusId(s.id)}
                onKeyDown={(event) => onKey(event, i)}
                onPointerEnter={() => pending != null && setHover(s.id)}
                className={cn(
                  "group/station absolute top-0 flex w-[min(96px,calc((100cqw-88px)*var(--span)))] -translate-x-1/2 cursor-default flex-col items-center rounded-lg pt-[22px] pb-1 outline-none select-none",
                  "left-[calc(var(--p)*100%)] focus-visible:ring-[3px] focus-visible:ring-ring",
                  "@max-[36rem]:top-[calc(var(--p)*100%)] @max-[36rem]:left-0 @max-[36rem]:h-11 @max-[36rem]:w-full @max-[36rem]:translate-x-0 @max-[36rem]:-translate-y-1/2 @max-[36rem]:flex-row @max-[36rem]:items-center @max-[36rem]:gap-3 @max-[36rem]:px-0 @max-[36rem]:py-0",
                )}
                style={{ "--p": pos(i) } as CSSProperties}
              >
                <span
                  className={cn("relative flex size-7 shrink-0 items-center justify-center", "@max-[36rem]:ms-[4.5px]")}
                >
                  <span
                    className={cn(
                      "rounded-full border-[2.5px] bg-card transition-[width,height,border-color,background-color,transform] duration-300 ease-settle",
                      "group-hover/station:scale-110 group-active/station:scale-95",
                      end ? "size-[22px] border-brand" : "size-4",
                      !end && !inside && (inPreview || isPreviewEnd ? "border-brand/60" : "border-foreground/75"),
                      i === 0 || i === n - 1 ? "rounded-[6px]" : "",
                    )}
                    style={
                      inside
                        ? {
                            borderColor: `color-mix(in oklab, var(--brand) calc(clamp(0, (var(--t) - ${threshold.toFixed(4)}) * 30, 1) * 100%), color-mix(in oklab, var(--foreground) 75%, transparent))`,
                          }
                        : undefined
                    }
                  />
                  {end && (
                    <span
                      className={cn(
                        "absolute size-2.5 rounded-full bg-brand transition-transform duration-300 ease-settle",
                        isTo && !arrived && !reduce ? "scale-0" : "scale-100",
                      )}
                    />
                  )}
                  {isTo && arrived && run.n > 0 && !reduce && (
                    <span
                      key={run.n}
                      className="absolute size-[22px] animate-[miyuki-route-picker-ring_700ms_cubic-bezier(0.22,1,0.36,1)_forwards] rounded-full border-2 border-brand"
                    />
                  )}
                  {end && (
                    <span
                      className={cn(
                        "absolute -top-5 rounded-[5px] bg-primary px-1.5 py-px text-[11px] leading-4 font-medium text-primary-foreground",
                        "@max-[36rem]:hidden",
                      )}
                    >
                      {isFrom ? "On" : "Off"}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 flex max-w-full flex-col items-center px-0.5 text-center",
                    "@max-[36rem]:mt-0 @max-[36rem]:max-w-none @max-[36rem]:flex-1 @max-[36rem]:flex-row @max-[36rem]:items-baseline @max-[36rem]:justify-between @max-[36rem]:gap-3 @max-[36rem]:text-start",
                  )}
                >
                  <span
                    className={cn(
                      "text-[13px] leading-4 text-balance",
                      end ? "font-semibold text-foreground" : "font-medium text-foreground",
                      "@max-[36rem]:text-sm",
                    )}
                  >
                    {s.name}
                    {end && (
                      <span className={cn("ms-2 hidden text-xs font-medium text-brand-strong", "@max-[36rem]:inline")}>
                        {isFrom ? "On" : "Off"}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground tabular-nums">{s.km.toFixed(1)} km</span>
                </span>
              </button>
            );
          })}
          {hasRoute && !reduce && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-[36px] left-[calc((var(--a)+var(--d)*var(--t))*100%)] z-10",
                "@max-[36rem]:top-[calc((var(--a)+var(--d)*var(--t))*100%)] @max-[36rem]:left-[18px]",
                arrived ? "opacity-0 transition-opacity duration-300" : "opacity-100",
              )}
            >
              <div
                className={cn("-translate-1/2 transition-transform duration-300 ease-settle", arrived && "scale-50")}
              >
                <div className={cn(d < 0 && "-scale-x-100", "@max-[36rem]:rotate-90")}>
                  <TrainShape />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {from && to ? (
          <>
            <div className="text-base font-semibold tracking-[-0.01em]">
              {from.name} <span className="font-normal text-muted-foreground">to</span> {to.name}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @min-[32rem]:grid-cols-4">
              {[
                ["Fare", money.format(fare(km))],
                ["Time", `${minutesTaken} min`],
                ["Distance", `${km.toFixed(1)} km`],
                ["Stops", `${stops}`],
              ].map(([term, detail]) => (
                <div key={term} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{term}</dt>
                  <dd className="text-lg leading-6 font-semibold tracking-[-0.01em] tabular-nums">{detail}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Fare and journey time appear here.</p>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      <style href="miyuki-route-picker" precedence="miyuki">{`
@keyframes miyuki-route-picker-ring { from { transform: scale(1); opacity: 0.9; } to { transform: scale(2.1); opacity: 0; } }
`}</style>
    </div>
  );
}
