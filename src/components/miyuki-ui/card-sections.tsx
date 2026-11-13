"use client";

import { CloudSnow, Gauge, Thermometer, Waves, Wind } from "lucide-react";
import {
  animate,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { cn } from "@/lib/utils";

export interface Instrument {
  icon: ReactNode;
  label: string;
}

const DEFAULT_INSTRUMENTS: Instrument[] = [
  { icon: <Thermometer />, label: "Air" },
  { icon: <Wind />, label: "Wind" },
  { icon: <Gauge />, label: "Pressure" },
  { icon: <CloudSnow />, label: "Snowfall" },
  { icon: <Waves />, label: "River" },
];

export interface InstrumentsCardProps extends Omit<ComponentProps<"article">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  instruments?: Instrument[];
  duration?: number;
  pause?: number;
  color?: string;
}

export function InstrumentsCard({
  title,
  description,
  instruments = DEFAULT_INSTRUMENTS,
  duration = 2.8,
  pause = 1.6,
  color = "var(--brand)",
  className,
  style,
  ...props
}: InstrumentsCardProps) {
  const reduced = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  const inView = useInView(panel, { amount: 0.5 });
  const progress = useMotionValue(-0.15);
  const lineX = useTransform(progress, (v) => `${(v * 100).toFixed(3)}%`);

  useEffect(() => {
    if (reduced || !inView) return;
    progress.set(-0.15);
    const controls = animate(progress, [-0.15, 1.15], {
      duration,
      ease: [0.45, 0.05, 0.25, 1],
      repeat: Infinity,
      repeatDelay: pause,
    });
    return () => controls.stop();
  }, [reduced, inView, duration, pause, progress]);

  const count = instruments.length;

  return (
    <article
      {...props}
      className={cn(
        "w-full max-w-md overflow-clip rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      style={{ "--miyuki-card-sections-light": color, ...style } as CSSProperties}
    >
      <div
        ref={panel}
        className="relative overflow-clip border-b border-border bg-[radial-gradient(120%_90%_at_50%_100%,var(--muted),transparent_75%)] px-5 pt-10 pb-8"
      >
        <div className="relative">
          <span aria-hidden="true" className="absolute inset-x-[10%] top-6 h-px bg-border-strong/70" />
          <ul className="relative grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {instruments.map((instrument, i) => (
              <InstrumentDial
                key={instrument.label}
                instrument={instrument}
                at={(i + 0.5) / count}
                progress={progress}
              />
            ))}
          </ul>
        </div>
        {reduced ? null : (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-5 left-5"
            style={{ x: lineX }}
          >
            <span className="absolute inset-y-0 -left-10 w-20 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--miyuki-card-sections-light)_26%,transparent),transparent)] blur-md dark:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--miyuki-card-sections-light)_40%,transparent),transparent)] dark:mix-blend-plus-lighter" />
            <span className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-(--miyuki-card-sections-light) to-transparent dark:mix-blend-plus-lighter" />
            <span className="absolute inset-y-[30%] -left-px w-[3px] rounded-full bg-linear-to-b from-transparent via-(--miyuki-card-sections-light)/60 to-transparent blur-[2px]" />
          </motion.div>
        )}
      </div>
      <div className="px-6 pt-5 pb-6">
        <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em]">{title}</h3>
        {description ? <p className="mt-2 text-sm/6 text-pretty text-muted-foreground">{description}</p> : null}
      </div>
    </article>
  );
}

function InstrumentDial({
  instrument,
  at,
  progress,
}: {
  instrument: Instrument;
  at: number;
  progress: MotionValue<number>;
}) {
  const hit = useTransform(progress, (v) => {
    const t = Math.max(0, 1 - Math.abs(v - at) / 0.12);
    return t * t * (3 - 2 * t);
  });
  const scale = useTransform(hit, (h) => 1 + h * 0.16);

  return (
    <li className="flex flex-col items-center gap-3">
      <motion.span
        className="grid size-12 place-items-center rounded-full border bg-card [&_svg]:size-5"
        style={
          {
            scale,
            "--miyuki-card-sections-hit": hit,
            borderColor:
              "color-mix(in oklab, var(--miyuki-card-sections-light) calc(var(--miyuki-card-sections-hit) * 100%), var(--border-strong))",
            color:
              "color-mix(in oklab, var(--brand-strong) calc(var(--miyuki-card-sections-hit) * 100%), var(--muted-foreground))",
            boxShadow:
              "0 0 0 calc(var(--miyuki-card-sections-hit) * 5px) color-mix(in oklab, var(--miyuki-card-sections-light) calc(var(--miyuki-card-sections-hit) * 16%), transparent), 0 1px 2px oklch(0.42 0.09 250 / 0.08)",
          } as unknown as CSSProperties
        }
        aria-hidden="true"
      >
        {instrument.icon}
      </motion.span>
      <motion.span
        className="text-xs font-medium"
        style={
          {
            "--miyuki-card-sections-hit": hit,
            color:
              "color-mix(in oklab, var(--foreground) calc(var(--miyuki-card-sections-hit) * 100%), var(--muted-foreground))",
          } as unknown as CSSProperties
        }
      >
        {instrument.label}
      </motion.span>
    </li>
  );
}

const INK_FADE = "oklch(0.16 0.03 250";

export interface OverlayCardProps extends Omit<ComponentProps<"div">, "title"> {
  src: string;
  alt?: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  href?: string;
  colors?: string[];
}

export function OverlayCard({
  src,
  alt = "",
  title,
  description,
  meta,
  href,
  colors = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"],
  className,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: OverlayCardProps) {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(false);
  const [a, b, c] = [colors[0], colors[1] ?? colors[0], colors[2] ?? colors[1] ?? colors[0]];
  const panning = active && !reduced;

  return (
    <div
      {...props}
      data-active={active || undefined}
      className={cn(
        "relative isolate aspect-[4/5] w-full max-w-sm overflow-clip rounded-2xl bg-muted shadow-md",
        "transition-shadow duration-300 ease-settle data-[active]:shadow-lg",
        "has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring",
        className,
      )}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType !== "touch") setActive(true);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        setActive(false);
      }}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e);
        if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) setActive(true);
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(false);
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          "absolute inset-0 size-full object-cover transition-[scale,translate]",
          panning && "-translate-x-[3%] -translate-y-[1.5%] scale-[1.14]",
        )}
        style={{
          transitionDuration: panning ? "9s" : "0.7s",
          transitionTimingFunction: panning ? "cubic-bezier(0.25, 0.5, 0.35, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, #000 35%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 35%, transparent 78%)",
        }}
      >
        <motion.div
          className="absolute inset-y-[-10%] left-0 w-[200%] mix-blend-screen blur-xl"
          style={{
            background: `linear-gradient(100deg, transparent 24%, color-mix(in oklab, ${a} 72%, white) 38%, color-mix(in oklab, ${b} 70%, white) 49%, color-mix(in oklab, ${c} 72%, white) 60%, transparent 74%)`,
          }}
          initial={{ x: "-80%", opacity: 0 }}
          animate={
            reduced
              ? { opacity: active ? 0.35 : 0, x: "-30%" }
              : active
                ? { x: ["-80%", "0%"], opacity: [0, 0.7, 0.45] }
                : { opacity: 0 }
          }
          transition={
            reduced || !active
              ? { duration: 0.4 }
              : { duration: 3.4, ease: [0.22, 1, 0.36, 1], opacity: { duration: 3.4, times: [0, 0.35, 1] } }
          }
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to top, ${INK_FADE} / 0.78), ${INK_FADE} / 0.3) 45%, ${INK_FADE} / 0) 75%)`,
        }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 ease-settle",
          active && "opacity-100",
        )}
        style={{
          backgroundImage: `linear-gradient(to top, ${INK_FADE} / 0.55), ${INK_FADE} / 0.3) 40%, ${INK_FADE} / 0) 70%)`,
        }}
      />
      <div className="dark absolute inset-x-0 bottom-0 p-6 text-foreground">
        {meta ? (
          <p
            className={cn(
              "text-[13px] font-medium text-foreground/75 transition-colors duration-500",
              active && "text-foreground/90",
            )}
          >
            {meta}
          </p>
        ) : null}
        <h3
          className={cn(
            "mt-1.5 font-display text-2xl leading-[1.12] font-semibold tracking-[-0.02em] text-balance text-foreground/90 transition-colors duration-500",
            active && "text-foreground",
          )}
        >
          {href ? (
            <a href={href} className="outline-none after:absolute after:inset-0">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {description ? (
          <p
            className={cn(
              "mt-2.5 text-sm/6 text-pretty text-foreground/75 transition-colors duration-500",
              active && "text-foreground/95",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface ContentCardAuthor {
  name: string;
  avatar?: string;
}

export interface ContentCardProps extends Omit<ComponentProps<"article">, "title"> {
  src: string;
  alt?: string;
  title: ReactNode;
  excerpt: ReactNode;
  author: ContentCardAuthor;
  readingTime: string;
  href?: string;
}

export function ContentCard({
  src,
  alt = "",
  title,
  excerpt,
  author,
  readingTime,
  href,
  className,
  ...props
}: ContentCardProps) {
  return (
    <article
      {...props}
      className={cn(
        "group/content relative flex w-full max-w-sm flex-col rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-xs",
        "transition-shadow duration-200 ease-settle hover:shadow-md has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring",
        className,
      )}
    >
      <div className="aspect-[16/10] overflow-clip rounded-[10px] bg-muted">
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="size-full object-cover transition-[scale] duration-700 ease-settle group-hover/content:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="px-3 pt-4 pb-3">
        <div className="flex items-center gap-2 text-[13px]">
          <Avatar src={author.avatar} name={author.name} size="sm" />
          <span className="truncate font-medium">{author.name}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="shrink-0 text-muted-foreground">{readingTime}</span>
        </div>
        <h3 className="mt-3.5 font-display text-xl leading-[1.2] font-semibold tracking-[-0.02em] text-balance">
          {href ? (
            <a href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm/6 text-pretty text-muted-foreground">{excerpt}</p>
      </div>
    </article>
  );
}
