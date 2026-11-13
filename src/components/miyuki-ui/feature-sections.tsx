"use client";

import { curveMonotoneX, line } from "d3-shape";
import { Thermometer } from "lucide-react";
import { AnimatePresence, motion, type Transition, useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };

function SectionHeading({
  title,
  description,
  action,
  align = "start",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", align === "center" && "items-center text-center", className)}>
      <h2 className="max-w-[18ch] font-display text-[2.25rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance @3xl:text-5xl">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 max-w-[34rem] text-base/7 text-muted-foreground",
            align === "center" ? "text-balance" : "text-pretty",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-7 flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

export interface FeatureBentoTile {
  title: string;
  description: string;
  visual: ReactNode;
  surface?: "card" | "well" | "picture";
}

export interface FeatureBentoProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tiles: FeatureBentoTile[];
}

const BENTO_PLACEMENT = [
  "@2xl:col-span-2 @4xl:col-span-7 @4xl:col-start-6 @4xl:row-span-2 @4xl:row-start-1 min-h-[22rem]",
  "@4xl:col-span-5 @4xl:col-start-1 @4xl:row-start-2",
  "@4xl:col-span-5 @4xl:col-start-8 @4xl:row-start-3",
  "@2xl:col-span-2 @4xl:col-span-7 @4xl:col-start-1 @4xl:row-start-3",
];

export function FeatureBento({ title, description, action, tiles, className, ...props }: FeatureBentoProps) {
  return (
    <section
      {...props}
      className={cn("@container mx-auto w-full max-w-6xl px-6 py-20 @3xl:px-8 @3xl:py-24", className)}
    >
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-12">
        <SectionHeading
          title={title}
          description={description}
          action={action}
          className="pb-8 @2xl:col-span-2 @4xl:col-span-5 @4xl:col-start-1 @4xl:row-start-1 @4xl:pr-6 @4xl:pb-10"
        />
        {tiles.map((tile, i) => (
          <BentoTile key={tile.title} tile={tile} className={BENTO_PLACEMENT[i] ?? "@2xl:col-span-1 @4xl:col-span-6"} />
        ))}
      </div>
    </section>
  );
}

function BentoTile({ tile, className }: { tile: FeatureBentoTile; className?: string }) {
  const surface = tile.surface ?? "card";
  if (surface === "picture") {
    return (
      <article
        className={cn("relative isolate flex flex-col justify-end overflow-clip rounded-3xl bg-muted", className)}
      >
        <div className="absolute inset-0 -z-10">{tile.visual}</div>
        <div className="dark relative bg-linear-to-t from-[oklch(0.16_0.03_250/0.82)] via-[oklch(0.16_0.03_250/0.45)] to-transparent px-6 pt-24 pb-6 text-foreground">
          <h3 className="text-base font-semibold tracking-[-0.01em]">{tile.title}</h3>
          <p className="mt-1.5 max-w-sm text-sm/6 text-pretty text-foreground/80">{tile.description}</p>
        </div>
      </article>
    );
  }
  return (
    <article
      className={cn(
        "flex flex-col overflow-clip",
        surface === "well" ? "rounded-2xl bg-muted" : "rounded-2xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="relative min-h-[11.5rem] flex-1">{tile.visual}</div>
      <div className="px-6 pt-5 pb-6">
        <h3 className="text-base font-semibold tracking-[-0.01em]">{tile.title}</h3>
        <p className="mt-1.5 max-w-sm text-sm/6 text-pretty text-muted-foreground">{tile.description}</p>
      </div>
    </article>
  );
}

export interface FeatureBentoAlert {
  title: string;
  detail: string;
  tone?: "brand" | "success" | "warning" | "destructive";
}

export interface FeatureBentoAlertsProps extends ComponentProps<"div"> {
  alerts: FeatureBentoAlert[];
  interval?: number;
  ages?: string[];
}

const TONE_DOT: Record<NonNullable<FeatureBentoAlert["tone"]>, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function FeatureBentoAlerts({
  alerts,
  interval = 3.6,
  ages = ["now", "6 min ago", "19 min ago"],
  className,
  ...props
}: FeatureBentoAlertsProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.4 });
  const [count, setCount] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!inView || reduced || alerts.length === 0 || (held && count >= 3)) return;
    const wait = count === 0 ? 250 : count < 3 ? 420 : interval * 1000;
    const id = window.setTimeout(() => setCount((c) => c + 1), wait);
    return () => window.clearTimeout(id);
  }, [inView, reduced, held, count, interval, alerts.length]);

  const total = reduced ? Math.min(3, alerts.length) : count;
  const shown = Array.from({ length: Math.min(3, total, alerts.length) }, (_, k) => {
    const n = total - 1 - k;
    return { key: n, alert: alerts[n % alerts.length] };
  });

  return (
    <div
      ref={root}
      {...props}
      className={cn("px-4 pt-4 @md:px-5 @md:pt-5", className)}
      onPointerEnter={(e) => {
        props.onPointerEnter?.(e);
        if (e.pointerType !== "touch") setHeld(true);
      }}
      onPointerLeave={(e) => {
        props.onPointerLeave?.(e);
        setHeld(false);
      }}
    >
      <ul className="relative flex min-h-[11.25rem] flex-col gap-2" aria-label="Recent alerts">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map(({ key, alert }, i) => (
            <motion.li
              key={key}
              layout={!reduced}
              initial={{ opacity: 0, y: -10, scale: 0.985 }}
              animate={{ opacity: 1 - i * 0.14, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.14 } }}
              transition={SETTLE}
              className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 shadow-xs ring-1 ring-foreground/5"
            >
              <span aria-hidden="true" className="relative grid size-2 shrink-0 place-items-center">
                <span className={cn("size-2 rounded-full", TONE_DOT[alert.tone ?? "brand"])} />
                {i === 0 ? (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full opacity-0 motion-safe:animate-[miyuki-feature-sections-ping_2.4s_ease-out_infinite]",
                      TONE_DOT[alert.tone ?? "brand"],
                    )}
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium">{alert.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{alert.detail}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{ages[i] ?? ""}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <FeatureSectionsKeyframes />
    </div>
  );
}

export interface FeatureBentoPictureProps extends ComponentProps<"div"> {
  src: string;
  alt?: string;
  place: string;
  temperature: number;
  unit?: string;
}

export function FeatureBentoPicture({
  src,
  alt = "",
  place,
  temperature,
  unit = "°C",
  className,
  ...props
}: FeatureBentoPictureProps) {
  const reduced = useReducedMotion() ?? false;
  const [reading, setReading] = useState(temperature);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setReading(Math.round((temperature + (Math.random() - 0.5) * 0.8) * 10) / 10);
    }, 3800);
    return () => window.clearInterval(id);
  }, [temperature, reduced]);

  const shown = reduced ? temperature : reading;
  const text = `${shown < 0 ? "−" : ""}${Math.abs(shown).toFixed(1)} ${unit}`;

  return (
    <div {...props} className={cn("relative size-full", className)}>
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 size-full object-cover" />
      <div className="absolute top-5 left-5 flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card/80 py-2 pr-4 pl-3 shadow-md backdrop-blur-md">
        <Thermometer aria-hidden="true" className="size-4 shrink-0 text-brand-strong" strokeWidth={1.75} />
        <span className="leading-tight">
          <span className="relative block h-5 overflow-clip text-[15px] font-semibold tabular-nums">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={text}
                className="block"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                transition={SETTLE}
              >
                {text}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="relative size-1.5 shrink-0 rounded-full bg-success">
              <span className="absolute inset-0 rounded-full bg-success opacity-0 motion-safe:animate-[miyuki-feature-sections-ping_2.4s_ease-out_infinite]" />
            </span>
            {place}
          </span>
        </span>
      </div>
      <FeatureSectionsKeyframes />
    </div>
  );
}

export interface FeatureBentoStation {
  name: string;
  x: number;
  y: number;
}

export interface FeatureBentoStationsProps extends ComponentProps<"div"> {
  map?: string;
  stations: FeatureBentoStation[];
  color?: string;
}

export function FeatureBentoStations({
  map,
  stations,
  color = "var(--brand)",
  className,
  style,
  ...props
}: FeatureBentoStationsProps) {
  const route = stations.map((s) => `${s.x},${s.y}`).join(" ");
  return (
    <div
      {...props}
      className={cn("relative size-full overflow-clip", className)}
      style={{ "--miyuki-feature-sections-dot": color, ...style } as CSSProperties}
    >
      {map ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-foreground opacity-[0.16] dark:opacity-[0.2]"
          style={{
            maskImage: `url("${map}"), linear-gradient(to bottom, #000 55%, transparent)`,
            WebkitMaskImage: `url("${map}"), linear-gradient(to bottom, #000 55%, transparent)`,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            maskSize: "cover, 100% 100%",
            WebkitMaskSize: "cover, 100% 100%",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      ) : null}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        <polyline
          points={route}
          fill="none"
          stroke="var(--miyuki-feature-sections-dot)"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          strokeDasharray="3 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ul aria-label="Stations">
        {stations.map((s, i) => (
          <li key={s.name} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            <span aria-hidden="true" className="absolute -top-[5px] -left-[5px] block size-2.5">
              <span
                className="absolute inset-0 rounded-full bg-(--miyuki-feature-sections-dot) opacity-0 motion-safe:animate-[miyuki-feature-sections-ping_3.2s_ease-out_infinite]"
                style={{ animationDelay: `${(i * 0.28).toFixed(2)}s` }}
              />
              <span className="absolute inset-0 rounded-full bg-(--miyuki-feature-sections-dot) ring-[3px] ring-card" />
            </span>
            <span className="absolute top-3 left-0 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              {s.name}
            </span>
          </li>
        ))}
      </ul>
      <FeatureSectionsKeyframes />
    </div>
  );
}

export interface FeatureBentoSparklineProps extends ComponentProps<"div"> {
  values: number[];
  value: string;
  label: string;
  change?: string;
  from?: string;
  to?: string;
  points?: string[];
  format?: (value: number) => string;
  color?: string;
}

export function FeatureBentoSparkline({
  values,
  value,
  label,
  change,
  from,
  to,
  points,
  format = String,
  color = "var(--brand)",
  className,
  ...props
}: FeatureBentoSparklineProps) {
  const reduced = useReducedMotion() ?? false;
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.6 });
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const gradient = `miyuki-feature-sections-fill-${useId().replace(/[^\w-]/g, "")}`;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = 6;
  let pts: [number, number][] = [];
  let path = "";
  let area = "";
  if (size && values.length > 1) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    pts = values.map((v, i): [number, number] => [
      pad + (i / (values.length - 1)) * (size.w - pad * 2),
      pad + (1 - (v - min) / (max - min || 1)) * (size.h - pad * 2),
    ]);
    path = line().curve(curveMonotoneX)(pts) ?? "";
    area = `${path}L${pts[pts.length - 1][0]},${size.h}L${pts[0][0]},${size.h}Z`;
  }
  const end = pts.length > 0 ? pts[pts.length - 1] : null;
  const at = scrub != null && pts[scrub] ? pts[scrub] : null;
  const drawn = reduced || inView;
  const settled = reduced || ready;

  return (
    <div {...props} className={cn("flex h-full flex-col px-6 pt-6", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-[2rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {scrub != null ? format(values[scrub]) : value}
        </p>
        {change ? (
          <p
            className={cn(
              "text-[13px] font-medium text-brand-strong tabular-nums transition-opacity duration-200",
              scrub != null && "opacity-0",
            )}
          >
            {change}
          </p>
        ) : null}
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground tabular-nums">
        {scrub != null && points?.[scrub] ? `${label}, ${points[scrub]}` : label}
      </p>
      <div
        ref={box}
        className="relative mt-4 min-h-20 flex-1 touch-pan-y"
        onPointerMove={(e) => {
          if (!size || values.length < 2) return;
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
          const i = Math.round(((x - pad) / (size.w - pad * 2)) * (values.length - 1));
          setScrub(Math.min(values.length - 1, Math.max(0, i)));
        }}
        onPointerLeave={() => setScrub(null)}
      >
        {size ? (
          <svg aria-hidden="true" width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={0}
                x2={size.w}
                y1={size.h * f}
                y2={size.h * f}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
            ))}
            <motion.path
              d={area}
              fill={`url(#${gradient})`}
              initial={false}
              animate={{ opacity: drawn ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.9 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 1.5, ease: [0.45, 0.05, 0.25, 1] }}
              onAnimationComplete={() => {
                if (drawn) setReady(true);
              }}
            />
            {at ? (
              <g>
                <line x1={at[0]} x2={at[0]} y1={0} y2={size.h} stroke={color} strokeOpacity={0.45} />
                <circle cx={at[0]} cy={at[1]} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />
              </g>
            ) : null}
            {end ? (
              <motion.g
                initial={false}
                animate={{ opacity: settled && !at ? 1 : 0, scale: settled ? 1 : 0.4 }}
                transition={reduced ? { duration: 0 } : { ...SETTLE, opacity: { duration: 0.15 } }}
                style={{ transformOrigin: `${end[0]}px ${end[1]}px` }}
              >
                <circle cx={end[0]} cy={end[1]} r={8} fill={color} opacity={0.18} />
                <circle cx={end[0]} cy={end[1]} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
              </motion.g>
            ) : null}
          </svg>
        ) : null}
      </div>
      {from || to ? (
        <div className="flex justify-between pt-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{from}</span>
          <span>{to}</span>
        </div>
      ) : null}
    </div>
  );
}

function FeatureSectionsKeyframes() {
  return (
    <style href="miyuki-feature-sections" precedence="miyuki">{`
@keyframes miyuki-feature-sections-ping {
  0% { transform: scale(1); opacity: 0.5; }
  70%, 100% { transform: scale(3.4); opacity: 0; }
}
`}</style>
  );
}

export interface FeatureItem {
  title: string;
  description: string;
  icon?: ReactNode;
  href?: string;
}

export interface FeatureGridProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  features: FeatureItem[];
  texture?: string;
  textureColor?: string;
}

export function FeatureGrid({
  title,
  description,
  features,
  texture,
  textureColor = "var(--brand)",
  className,
  ...props
}: FeatureGridProps) {
  const rng = createRng(`miyuki-feature-grid-${features.length}`);
  const offsets = features.map(() => [rng.int(0, 360), rng.int(0, 260)] as const);

  return (
    <section
      {...props}
      className={cn("@container mx-auto w-full max-w-6xl px-6 py-20 @3xl:px-8 @3xl:py-24", className)}
    >
      <div className="grid gap-6 @3xl:grid-cols-12 @3xl:items-end">
        <h2 className="max-w-[20ch] font-display text-[2.25rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance @3xl:col-span-7 @3xl:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-md text-base/7 text-pretty text-muted-foreground @3xl:col-span-5 @3xl:justify-self-end">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-14 flow-root overflow-clip">
        <ul className="-mt-px -ml-px grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-4">
          {features.map((feature, i) => {
            const Tag = feature.href ? "a" : "div";
            return (
              <li key={feature.title} className="border-t border-l border-border">
                <Tag
                  {...(feature.href ? { href: feature.href } : {})}
                  className={cn(
                    "group/cell relative isolate flex h-full min-h-[10.5rem] flex-col justify-end overflow-clip p-6 @xl:min-h-[13.5rem] @4xl:p-7",
                    feature.href &&
                      "outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                  )}
                >
                  {texture ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -top-4 -right-4 -z-10 h-40 w-56 opacity-[0.32] dark:opacity-[0.42]",
                        "transition-[opacity,translate] duration-500 ease-settle",
                        "group-hover/cell:-translate-x-1.5 group-hover/cell:translate-y-1.5 group-hover/cell:opacity-80 dark:group-hover/cell:opacity-95",
                        "group-focus-visible/cell:opacity-80 dark:group-focus-visible/cell:opacity-95",
                      )}
                      style={{
                        backgroundColor: textureColor,
                        maskImage: `url("${texture}"), radial-gradient(ellipse 100% 100% at 100% 0%, #000 15%, transparent 72%)`,
                        WebkitMaskImage: `url("${texture}"), radial-gradient(ellipse 100% 100% at 100% 0%, #000 15%, transparent 72%)`,
                        maskComposite: "intersect",
                        WebkitMaskComposite: "source-in",
                        maskSize: "560px auto, 100% 100%",
                        WebkitMaskSize: "560px auto, 100% 100%",
                        maskPosition: `-${offsets[i][0]}px -${offsets[i][1]}px, 0 0`,
                        WebkitMaskPosition: `-${offsets[i][0]}px -${offsets[i][1]}px, 0 0`,
                        maskRepeat: "repeat, no-repeat",
                        WebkitMaskRepeat: "repeat, no-repeat",
                      }}
                    />
                  ) : null}
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{feature.title}</h3>
                  <p className="mt-2 text-sm/6 text-pretty text-muted-foreground">{feature.description}</p>
                </Tag>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export interface FeatureHoverProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  features: FeatureItem[];
}

export function FeatureHover({ title, description, features, className, ...props }: FeatureHoverProps) {
  return (
    <section
      {...props}
      className={cn("@container mx-auto w-full max-w-6xl px-6 py-20 @3xl:px-8 @3xl:py-24", className)}
    >
      <SectionHeading title={title} description={description} align="center" className="mx-auto" />
      <ul className="mt-14 grid grid-cols-1 gap-y-3 @xl:grid-cols-2 @4xl:mt-16 @4xl:grid-cols-4 @4xl:gap-y-4">
        {features.map((feature) => {
          const Tag = feature.href ? "a" : "div";
          return (
            <li key={feature.title}>
              <Tag
                {...(feature.href ? { href: feature.href } : {})}
                className={cn(
                  "group/cell relative isolate flex h-full flex-col overflow-clip py-7 pr-6 pl-7 outline-none",
                  feature.href && "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                )}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-0.5 origin-bottom scale-y-0 bg-brand",
                    "transition-transform duration-300 ease-settle",
                    "group-hover/cell:scale-y-100 group-focus-visible/cell:scale-y-100 motion-reduce:transition-none",
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 -z-10 bg-linear-to-t from-brand/14 via-brand/5 to-transparent [mask-image:linear-gradient(to_right,#000_35%,transparent)] dark:from-brand/18 dark:via-brand/6",
                    "translate-y-full opacity-0 transition-[translate,opacity] duration-500 ease-settle",
                    "group-hover/cell:translate-y-0 group-hover/cell:opacity-100 group-focus-visible/cell:translate-y-0 group-focus-visible/cell:opacity-100",
                    "motion-reduce:translate-y-0 motion-reduce:transition-opacity",
                  )}
                />
                {feature.icon ? (
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-colors duration-200 group-hover/cell:text-brand-strong group-focus-visible/cell:text-brand-strong [&_svg]:size-5"
                  >
                    {feature.icon}
                  </span>
                ) : null}
                <h3
                  className={cn(
                    "mt-8 text-[15px] font-semibold tracking-[-0.01em]",
                    "transition-transform duration-300 ease-settle group-hover/cell:translate-x-1 group-focus-visible/cell:translate-x-1 motion-reduce:transition-none",
                  )}
                >
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm/6 text-pretty text-muted-foreground">{feature.description}</p>
              </Tag>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
