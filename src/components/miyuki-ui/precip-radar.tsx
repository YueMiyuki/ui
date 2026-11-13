"use client";

import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  formatNumber,
  useChartSize,
} from "@/components/miyuki-ui/lib/chart";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { PlayPauseButton } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export interface PrecipRadarWind {
  from: number;
  speed?: number;
}

export interface PrecipRadarProps extends Omit<ChartCardProps, "children"> {
  frames?: number;
  interval?: number;
  wind?: PrecipRadarWind;
  seed?: number | string;
  times?: string[];
  height?: number;
  autoPlay?: boolean;
  coverage?: number;
  legend?: boolean;
  summary?: string;
  children?: ReactNode;
  overlay?: ReactNode;
}

const LEVELS = [
  { at: 0.5, name: "Light" },
  { at: 2, name: "Moderate" },
  { at: 8, name: "Heavy" },
  { at: 20, name: "Very heavy" },
];
const LEVEL_COLORS = [
  "var(--brand)",
  "var(--brand)",
  "color-mix(in oklab, var(--brand) 45%, var(--chart-3))",
  "var(--chart-3)",
];
const ALPHA = { light: [0.26, 0.5, 0.68, 0.84], dark: [0.34, 0.58, 0.76, 0.9] };
const CELL = 3;
const SOFT = 0.2;
const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

function makeField(seed: number | string, wind: PrecipRadarWind, coverage: number, aspect: number, middle: number) {
  const rng = createRng(`precip-radar:${seed}`);
  const table = new Float32Array(4096);
  for (let i = 0; i < table.length; i++) table[i] = rng();
  const hash = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return table[(h ^ (h >>> 16)) & 4095];
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
  };
  const ox = rng.range(0, 60);
  const oy = rng.range(0, 60);
  const sx = rng.range(0, 60);
  const sy = rng.range(0, 60);
  const toward = ((wind.from + 180) * Math.PI) / 180;
  const mx = Math.sin(toward);
  const my = -Math.cos(toward);
  const speed = wind.speed ?? 0.024;
  const raw = (u: number, v: number, t: number) => {
    const d = speed * t;
    const su = u - mx * d;
    const sv = v - my * d;
    const along = su * mx + sv * my;
    const across = su * my - sv * mx;
    const envelope = noise((u - mx * d * 0.7) * 1.25 + ox, (v - my * d * 0.7) * 1.25 + oy);
    const wa = along * 1.7 + sx;
    const wc = across * 5.4 + sy;
    const warp = noise(wa * 0.9 + 4, wc * 0.7) - 0.5;
    const streak = noise(wa, wc + warp * 1.6);
    const fine = noise(wa * 2.4 + 9, wc * 2.2 + warp * 2);
    const cells = noise((u - mx * d * 1.25) * 10 + 3, (v - my * d * 1.25) * 10 + 7);
    return (streak * 0.5 + fine * 0.3 + cells * 0.2) * (0.45 + 0.8 * envelope);
  };
  const sample: number[] = [];
  for (let j = 0; j < 28; j++)
    for (let i = 0; i < 48; i++) sample.push(raw(((i + 0.5) / 48) * aspect, (j + 0.5) / 28, middle));
  sample.sort((a, b) => a - b);
  const quantile = (q: number) => sample[Math.max(0, Math.min(sample.length - 1, Math.floor(q * sample.length)))];
  const floor = quantile(1 - Math.max(0.02, Math.min(0.95, coverage)));
  const span = Math.max(1e-4, quantile(0.975) - floor);
  return (u: number, v: number, t: number) => {
    const x = raw(u, v, t) - floor;
    return x <= 0 ? 0 : Math.min(60, 0.2 * 40 ** (x / span));
  };
}

const levelOf = (rate: number) => {
  let k = -1;
  for (let i = 0; i < LEVELS.length; i++) if (rate >= LEVELS[i].at) k = i;
  return k;
};

function defaultTimes(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const ago = (n - 1 - i) * 10;
    if (ago === 0) return "Now";
    const h = Math.floor(ago / 60);
    const m = ago % 60;
    return `−${h ? `${h} h${m ? " " : ""}` : ""}${m ? `${m} min` : ""}`;
  });
}

export function PrecipRadar({
  frames = 12,
  interval = 1000,
  wind = { from: 300, speed: 0.024 },
  seed = 1,
  times,
  height = 300,
  autoPlay = true,
  coverage = 0.36,
  legend = true,
  summary,
  label,
  footer,
  className,
  children,
  overlay,
  ...props
}: PrecipRadarProps) {
  const n = Math.max(2, Math.round(frames));
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { width } = useChartSize(plotRef);
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(n - 1);
  const [chosen, setPlaying] = useState<boolean | null>(null);
  const playing = chosen ?? (autoPlay && !reduce);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  const run = playing && !reduce;
  const labels = times && times.length >= n ? times : defaultTimes(n);
  const current = Math.min(frame, n - 1);
  const windFrom = wind.from;
  const windSpeed = wind.speed ?? 0.024;

  const aspect = width > 0 ? Math.round((width / height) * 10) / 10 : 1.8;
  const field = useMemo(
    () => makeField(seed, { from: windFrom, speed: windSpeed }, coverage, aspect, (n - 1) / 2),
    [seed, windFrom, windSpeed, coverage, aspect, n],
  );

  const stats = useMemo(() => {
    const cols = 48;
    const rows = Math.max(12, Math.round(48 / aspect));
    return Array.from({ length: n }, (_, f) => {
      let wet = 0;
      let heavy = 0;
      let peak = 0;
      let sx = 0;
      let sy = 0;
      let sw = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = ((i + 0.5) / cols) * aspect;
          const v = (j + 0.5) / rows;
          const r = field(u, v, f);
          if (r >= LEVELS[0].at) wet++;
          if (r >= LEVELS[2].at) heavy++;
          peak = Math.max(peak, r);
          sx += r * (u - aspect / 2);
          sy += r * (v - 0.5);
          sw += r;
        }
      }
      const cells = cols * rows;
      const bearing = sw > 0 ? ((Math.atan2(sx / sw, -(sy / sw)) * 180) / Math.PI + 360) % 360 : 0;
      return {
        wet: wet / cells,
        heavy: heavy / cells,
        peak,
        where: COMPASS[Math.round(bearing / 45) % 8],
        centred: sw > 0 && Math.hypot(sx / sw, sy / sw) < 0.08,
      };
    });
  }, [field, n, aspect]);

  const state = useRef({
    frames: new Map<number, HTMLCanvasElement>(),
    colors: [] as [number, number, number, number][],
    sweepColor: [0, 0, 0, 1] as [number, number, number, number],
    w: 0,
    h: 0,
    dpr: 1,
    from: n - 1,
    to: n - 1,
    angle: -1,
    draw: undefined as (() => void) | undefined,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = state.current;

    const readColors = () => {
      const card = toRgba("var(--card)", canvas);
      const dark = 0.2126 * card[0] + 0.7152 * card[1] + 0.0722 * card[2] < 0.4;
      const alpha = dark ? ALPHA.dark : ALPHA.light;
      s.colors = LEVEL_COLORS.map((c, k) => {
        const [r, g, b] = toRgba(c, canvas);
        return [r, g, b, alpha[k]];
      });
      s.sweepColor = toRgba("var(--brand)", canvas);
      s.frames.clear();
    };

    const frameCanvas = (f: number) => {
      const hit = s.frames.get(f);
      if (hit) return hit;
      const cols = Math.ceil(s.w / CELL) + 1;
      const rows = Math.ceil(s.h / CELL) + 1;
      const small = document.createElement("canvas");
      small.width = cols;
      small.height = rows;
      const sctx = small.getContext("2d");
      if (!sctx) return small;
      const img = sctx.createImageData(cols, rows);
      const a = s.w / s.h;
      const edges = LEVELS.map((l) => Math.log(l.at));
      const ramp = (x: number, e: number) => {
        const k = Math.max(0, Math.min(1, (x - e + SOFT) / (2 * SOFT)));
        return k * k * (3 - 2 * k);
      };
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const rate = field((i / (cols - 1)) * a, j / (rows - 1), f);
          if (rate <= 0) continue;
          const lr = Math.log(rate);
          const w0 = ramp(lr, edges[0]);
          if (w0 <= 0) continue;
          let [r, g, b, al] = s.colors[0];
          al *= w0;
          for (let k = 1; k < edges.length; k++) {
            const w = ramp(lr, edges[k]);
            if (w <= 0) break;
            const c = s.colors[k];
            r += (c[0] - r) * w;
            g += (c[1] - g) * w;
            b += (c[2] - b) * w;
            al += (c[3] - al) * w;
          }
          const o = (j * cols + i) * 4;
          img.data[o] = Math.round(r * 255);
          img.data[o + 1] = Math.round(g * 255);
          img.data[o + 2] = Math.round(b * 255);
          img.data[o + 3] = Math.round(al * 255);
        }
      }
      sctx.putImageData(img, 0, 0);
      s.frames.set(f, small);
      return small;
    };

    const paintFrame = (f: number) => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(frameCanvas(f), 0, 0, s.w, s.h);
    };

    s.draw = () => {
      if (!s.w || !s.h) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      paintFrame(s.from);
      if (s.angle < 0 || s.from === s.to) {
        if (s.from !== s.to) {
          ctx.clearRect(0, 0, s.w, s.h);
          paintFrame(s.to);
        }
        return;
      }
      const cx = s.w / 2;
      const cy = s.h / 2;
      const reach = Math.hypot(cx, cy) + 4;
      const start = -Math.PI / 2;
      const end = start + s.angle;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, reach, start, end);
      ctx.closePath();
      ctx.clip();
      ctx.clearRect(0, 0, s.w, s.h);
      paintFrame(s.to);
      ctx.restore();
      const [r, g, b] = s.sweepColor;
      const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
      const trail = Math.min(s.angle, 0.9);
      if ("createConicGradient" in ctx) {
        const cone = ctx.createConicGradient(end - trail, cx, cy);
        cone.addColorStop(0, `rgba(${rgb}, 0)`);
        cone.addColorStop(trail / (Math.PI * 2), `rgba(${rgb}, 0.22)`);
        cone.addColorStop(Math.min(1, trail / (Math.PI * 2) + 0.0001), `rgba(${rgb}, 0)`);
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, reach, end - trail, end);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${rgb}, 0.75)`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(end) * reach, cy + Math.sin(end) * reach);
      ctx.stroke();
    };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === s.w && h === s.h && dpr === s.dpr) return;
      s.w = w;
      s.h = h;
      s.dpr = dpr;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      s.frames.clear();
      s.draw?.();
    };

    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const offTheme = onThemeChange(() => {
      readColors();
      s.draw?.();
    });
    resize();
    return () => {
      ro.disconnect();
      offTheme();
      s.draw = undefined;
    };
  }, [field]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    let onScreen = false;
    const update = () => setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!run || !visible) {
      s.from = current;
      s.to = current;
      s.angle = -1;
      s.draw?.();
      if (!playing || !reduce || !visible) return;
      const timer = window.setTimeout(() => setFrame((f) => (f + 1) % n), current === n - 1 ? interval * 2 : interval);
      return () => window.clearTimeout(timer);
    }
    const last = current === n - 1;
    let raf = 0;
    let t0 = -1;
    const hold = last ? interval * 1.5 : 0;
    const next = (current + 1) % n;
    s.from = current;
    s.to = current;
    s.angle = -1;
    s.draw?.();
    const tick = (now: number) => {
      if (t0 < 0) t0 = now;
      const elapsed = Math.max(0, now - t0);
      if (last) {
        if (elapsed >= hold) {
          setFrame(0);
          return;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / interval);
      s.from = current;
      s.to = next;
      s.angle = p * Math.PI * 2;
      s.draw?.();
      if (p >= 1) {
        s.from = next;
        s.angle = -1;
        setFrame(next);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, visible, current, n, interval, playing, reduce]);

  useEffect(() => {
    inputRef.current?.setAttribute("aria-valuetext", labels[current]);
  });

  const scrubTo = (f: number) => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(n - 1, f)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: n - 1 };
    if (event.key in map) {
      event.preventDefault();
      scrubTo(map[event.key]);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setPlaying(!playing);
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = rect.width > 0 ? el.offsetWidth / rect.width : 1;
    setProbe({ x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sx });
  };

  const rate = probe && width > 0 ? field((probe.x / width) * aspect, probe.y / height, current) : 0;
  const level = levelOf(rate);
  const st = stats[current];
  const toward = COMPASS[Math.round(((((windFrom + 180) % 360) + 360) % 360) / 45) % 8];
  const pct = (v: number) => `${formatNumber(v * 100)}%`;
  const description =
    summary ??
    `Precipitation radar loop of ${n} frames, ${labels[0]} to ${labels[n - 1]}, moving toward the ${toward}. ` +
      `Showing ${labels[current]}: precipitation over ${pct(st.wet)} of the area, heavy over ${pct(st.heavy)}, ` +
      `strongest ${formatNumber(st.peak, 1)} mm/h` +
      (st.wet > 0 ? (st.centred ? ", centred on the radar." : `, mostly ${st.where} of the radar.`) : ".");

  return (
    <ChartCard
      label={label}
      footer={
        footer ??
        (legend ? (
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <p className="text-[13px] leading-5 text-muted-foreground">Precipitation, mm/h</p>
            <div aria-hidden="true" className="flex gap-0.5">
              {LEVELS.map((l, k) => (
                <div key={k} className="flex w-11 flex-col gap-1" title={l.name}>
                  <span
                    className={cn(
                      "h-2 rounded-[2px]",
                      k === 0 && "rounded-l-full",
                      k === LEVELS.length - 1 && "rounded-r-full",
                    )}
                    style={{
                      background: `color-mix(in oklab, ${LEVEL_COLORS[k]} ${[38, 62, 80, 94][k]}%, var(--card))`,
                    }}
                  />
                  <span className="text-[11px] leading-none text-muted-foreground tabular-nums">
                    {formatNumber(l.at, l.at < 1 ? 1 : 0)}
                    {k === LEVELS.length - 1 ? "+" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : undefined)
      }
      {...props}
      className={className}
    >
      <ChartPlot
        ref={plotRef}
        summary={description}
        height={height}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={() => setProbe(null)}
        onBlur={() => setProbe(null)}
        className="overflow-clip rounded-lg border border-border bg-muted focus-visible:ring-offset-2"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {children}
        </div>
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
        {overlay != null && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {overlay}
          </div>
        )}
        {width > 0 && (
          <svg aria-hidden="true" width={width} height={height} className="pointer-events-none absolute inset-0">
            {[0.3, 0.6].map((k) => (
              <circle
                key={k}
                cx={width / 2}
                cy={height / 2}
                r={k * height}
                fill="none"
                strokeWidth={1}
                strokeDasharray="2 4"
                className="stroke-foreground/20"
              />
            ))}
            <circle cx={width / 2} cy={height / 2} r={4} strokeWidth={1.5} className="fill-card stroke-foreground/70" />
            <circle cx={width / 2} cy={height / 2} r={1.25} className="fill-foreground/70" />
          </svg>
        )}
        {width > 0 && probe && (
          <ChartTooltip
            x={probe.x}
            y={probe.y}
            title={labels[current]}
            items={[
              level < 0
                ? { label: "Dry", value: "" }
                : {
                    label: LEVELS[level].name,
                    value: `${formatNumber(Math.floor(rate * 10) / 10, 1)} mm/h`,
                    color: LEVEL_COLORS[level],
                    marker: "square" as const,
                  },
            ]}
          />
        )}
      </ChartPlot>
      <div className="mt-3 flex items-center gap-3">
        <PlayPauseButton size={32} playing={playing} onChange={setPlaying} />
        <Slider
          aria-label="Frame time"
          minValue={0}
          maxValue={n - 1}
          step={1}
          value={current}
          onChange={(v) => scrubTo(Array.isArray(v) ? v[0] : v)}
          className="min-w-0 flex-1"
        >
          <SliderTrack className="relative h-8 w-full cursor-default">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted ring-1 ring-border ring-inset"
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-brand"
              style={{ width: `${(current / (n - 1)) * 100}%` }}
            />
            {Array.from({ length: n }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2",
                  i <= current ? "bg-brand-foreground/70" : "bg-border-strong",
                  (i === 0 || i === n - 1) && "h-3.5",
                )}
                style={{ left: `${(i / (n - 1)) * 100}%` }}
              />
            ))}
            <SliderThumb
              inputRef={inputRef}
              className="top-1/2 size-4 rounded-full border-2 border-brand bg-card shadow-sm outline-none data-[dragging]:scale-110 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring motion-safe:transition-transform"
            />
          </SliderTrack>
        </Slider>
        <span
          aria-hidden="true"
          className="w-16 shrink-0 text-right text-[13px] font-medium text-foreground tabular-nums"
        >
          {labels[current]}
        </span>
      </div>
      <ChartTable
        caption={typeof label === "string" ? label : "Precipitation radar"}
        columns={["Time", "Area with precipitation", "Area heavy or more", "Strongest"]}
        rows={stats.map((r, i) => [labels[i], pct(r.wet), pct(r.heavy), `${formatNumber(r.peak, 1)} mm/h`])}
      />
    </ChartCard>
  );
}
