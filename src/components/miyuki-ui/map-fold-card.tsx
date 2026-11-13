"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface MapFoldCardProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  columns?: number;
  rows?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: number;
  openLabel?: string;
  closeLabel?: string;
}

type Mat = number[];

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='21' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.03 .55' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.5 -.98'/></filter><rect width='220' height='220' filter='url(#a)'/><rect width='220' height='220' filter='url(#b)'/></svg>",
)}")`;

const CONTOURS = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><g fill='none' stroke='#000' stroke-width='.8'><path d='M20 60c10-28 52-34 70-18s40 6 52 24-18 40-52 34-80-12-70-40z'/><path d='M36 60c8-18 38-22 52-10s28 6 36 16-14 26-40 22-56-8-48-28z'/><path d='M54 60c6-9 22-11 32-5s16 3 20 8-8 13-22 11-34-4-30-14z'/><path d='M-30 10c30-6 60 8 80-2s50-10 70 4 50 0 70-6'/><path d='M-30 112c30-8 60 4 90-4s50-6 70 2 40 4 60-2'/></g></svg>",
)}")`;

const LIGHT = (() => {
  const v = [-0.4, -0.5, 0.77];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();

function mul(a: Mat, b: Mat): Mat {
  const o = new Array<number>(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}
const I: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const tr = (x: number, y: number, z: number): Mat => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const rotY = (t: number): Mat => [
  Math.cos(t),
  0,
  -Math.sin(t),
  0,
  0,
  1,
  0,
  0,
  Math.sin(t),
  0,
  Math.cos(t),
  0,
  0,
  0,
  0,
  1,
];
const rotX = (t: number): Mat => [
  1,
  0,
  0,
  0,
  0,
  Math.cos(t),
  Math.sin(t),
  0,
  0,
  -Math.sin(t),
  Math.cos(t),
  0,
  0,
  0,
  0,
  1,
];
const apply = (m: Mat, x: number, y: number, z = 0) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
const css = (m: Mat) => `matrix3d(${m.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(5))).join(",")})`;

function hinge(vertical: boolean, at: number, side: number, toward: number, angle: number, lift: number): Mat {
  if (!angle) return I;
  if (vertical) {
    const t = -side * toward * angle;
    return mul(tr(at, 0, lift), mul(rotY(t), tr(-at, 0, -lift)));
  }
  const t = side * toward * angle;
  return mul(tr(0, at, lift), mul(rotX(t), tr(0, -at, -lift)));
}

const RESIDUAL = 0.04;
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const easeOut = (u: number) => 1 - (1 - u) ** 3;

export function MapFoldCard({
  title,
  subtitle,
  children,
  columns = 3,
  rows = 2,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  width: widthProp = 480,
  openLabel = "Open map",
  closeLabel = "Fold map",
  className,
  style,
  ...props
}: MapFoldCardProps) {
  const reduced = useReducedMotion() ?? false;
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const N = Math.max(2, Math.min(5, Math.round(columns)));
  const M = Math.max(1, Math.min(3, Math.round(rows)));
  const [W, setW] = useState(widthProp);
  const H = Math.round((W / N) * 0.95 * M);
  const pw = W / N;
  const ph = H / M;
  const base = 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const assemblyRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const state = useRef({ c: open ? RESIDUAL : 1, r: open ? 0 : 1 });
  const [moving, setMoving] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setW(Math.max(200, root.offsetWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const panels = useMemo(() => {
    const list: { j: number; r: number }[] = [];
    for (let r = 0; r < M; r++) for (let j = 0; j < N; j++) list.push({ j, r });
    return list;
  }, [N, M]);

  const solve = useMemo(() => {
    const gr = 0.4;
    const stack = (M - 1) * 2 * gr + 0.4;
    const gc = 0.5;
    return (fc: number, fr: number) => {
      const rowM: Mat[] = [I];
      for (let r = 1; r < M; r++) {
        const toward = r % 2 === 1 ? 1 : -1;
        const lift = toward > 0 ? gr + (r - 1) * 2 * gr : -gr;
        rowM.push(mul(rowM[r - 1], hinge(false, r * ph, 1, toward, Math.PI * fr, lift)));
      }
      const colM: Mat[] = new Array(N);
      colM[base] = I;
      for (let j = base + 1; j < N; j++) {
        const toward = (j - base) % 2 === 1 ? -1 : 1;
        const lift = toward > 0 ? stack + gc : -gc;
        colM[j] = mul(colM[j - 1], hinge(true, j * pw, 1, toward, Math.PI * fc, lift));
      }
      for (let j = base - 1; j >= 0; j--) {
        const toward = (base - j) % 2 === 1 ? 1 : -1;
        const lift = toward > 0 ? stack + gc : -gc;
        colM[j] = mul(colM[j + 1], hinge(true, (j + 1) * pw, -1, toward, Math.PI * fc, lift));
      }
      return panels.map(({ j, r }) => mul(colM[j], mul(rowM[r], tr(j * pw, r * ph, 0))));
    };
  }, [panels, N, M, pw, ph]);

  const paint = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const assembly = assemblyRef.current;
    const shadow = shadowRef.current;
    if (!assembly || !shadow) return;
    const els = Array.from(assembly.querySelectorAll<HTMLElement>("[data-panel]"));
    paint.current = () => {
      const { c, r } = state.current;
      const mats = solve(c, r);
      const kc = (1 - Math.cos(Math.PI * Math.min(1, c))) / 2;
      const kr = (1 - Math.cos(Math.PI * r)) / 2;
      const ox = (W / 2 - (base * pw + pw / 2)) * kc;
      const oy = ((H - ph) / 2) * kr;
      assembly.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      mats.forEach((m, i) => {
        const el = els[i];
        if (!el) return;
        el.style.transform = css(m);
        for (const [cx, cy] of [
          [0, 0],
          [pw, 0],
          [0, ph],
          [pw, ph],
        ]) {
          const [x, y, z] = apply(m, cx, cy);
          if (Math.abs(z) > 10) continue;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
        const front = m[10] >= 0;
        const n = front ? [m[8], m[9], m[10]] : [-m[8], -m[9], -m[10]];
        const lit = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2];
        const shade = el.querySelector<HTMLElement>(front ? "[data-shade-front]" : "[data-shade-back]");
        if (shade) {
          shade.style.backgroundColor = lit < 1 ? "var(--miyuki-map-fold-card-dark)" : "oklch(1 0 0)";
          shade.style.opacity = (lit < 1 ? Math.min(0.6, (1 - lit) * 0.75) : Math.min(0.32, (lit - 1) * 1.1)).toFixed(
            3,
          );
        }
      });
      if (x0 < x1) {
        shadow.style.transform = `translate3d(${(x0 + ox).toFixed(1)}px, ${(y0 + oy).toFixed(1)}px, 0)`;
        shadow.style.width = `${(x1 - x0).toFixed(1)}px`;
        shadow.style.height = `${(y1 - y0).toFixed(1)}px`;
      }
    };
    paint.current();
  }, [solve, W, H, pw, ph]);

  const live = useRef({ reduced });
  useLayoutEffect(() => {
    live.current = { reduced };
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const s = state.current;
    const target = open ? { c: RESIDUAL, r: 0 } : { c: 1, r: 1 };
    if (live.current.reduced) {
      s.c = target.c;
      s.r = target.r;
      paint.current();
      rootRef.current?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      return;
    }
    const steps: { key: "c" | "r"; to: number; ms: number; ease: (u: number) => number }[] = open
      ? [
          { key: "c", to: 0, ms: 560, ease: easeInOut },
          { key: "r", to: 0, ms: 480, ease: easeInOut },
          { key: "c", to: RESIDUAL, ms: 360, ease: easeOut },
        ]
      : [
          { key: "c", to: 0, ms: 160, ease: easeOut },
          { key: "r", to: 1, ms: 460, ease: easeInOut },
          { key: "c", to: 1, ms: 520, ease: easeInOut },
        ];
    const queue = steps;
    setMoving(true);
    let raf = 0;
    let idx = 0;
    let start = 0;
    let from = s[queue[0].key];
    const frame = (now: number) => {
      if (!start) start = now;
      const st = queue[idx];
      const u = Math.min(1, (now - start) / st.ms);
      s[st.key] = from + (st.to - from) * st.ease(u);
      paint.current();
      if (u >= 1) {
        idx++;
        if (idx >= queue.length) {
          setMoving(false);
          return;
        }
        start = now + 30;
        from = s[queue[idx].key];
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };

  const sheet: CSSProperties = { width: W, height: H };
  const rowCrease = Array.from({ length: M - 1 }, (_, i) => (i + 1) * ph)
    .map(
      (y) =>
        `linear-gradient(180deg, transparent ${y - 7}px, var(--miyuki-map-fold-card-valley) ${y - 0.5}px, var(--miyuki-map-fold-card-lit) ${y + 0.5}px, transparent ${y + 5}px)`,
    )
    .join(", ");
  const settledOpen = open && !moving;

  return (
    <div
      role="group"
      {...props}
      ref={rootRef}
      className={cn(
        "group/map relative isolate max-w-full select-none",
        "[--miyuki-map-fold-card-dark:oklch(0.26_0.06_252)] dark:[--miyuki-map-fold-card-dark:oklch(0.07_0.03_252)]",
        "[--miyuki-map-fold-card-valley:oklch(0.42_0.09_250/0.14)] [--miyuki-map-fold-card-lit:oklch(1_0_0/0.6)] dark:[--miyuki-map-fold-card-valley:oklch(0.2_0.05_250/0.2)] dark:[--miyuki-map-fold-card-lit:oklch(1_0_0/0.25)]",
        "[--miyuki-map-fold-card-paper:color-mix(in_oklab,var(--card)_96%,var(--warning))] dark:[--miyuki-map-fold-card-paper:color-mix(in_oklab,var(--foreground)_86%,var(--background))]",
        "[--miyuki-map-fold-card-ink:var(--foreground)] dark:[--miyuki-map-fold-card-ink:var(--primary-foreground)]",
        "[--miyuki-map-fold-card-cover:color-mix(in_oklab,var(--brand-strong)_88%,var(--foreground))] dark:[--miyuki-map-fold-card-cover:color-mix(in_oklab,var(--brand)_70%,var(--background))]",
        className,
      )}
      style={{ width: widthProp, height: H, ...style }}
    >
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 rounded-[2px] shadow-[0_1px_2px_oklch(0.42_0.09_250/0.16),0_16px_30px_-12px_oklch(0.42_0.09_250/0.32)] dark:shadow-[0_1px_2px_oklch(0.02_0.02_250/0.6),0_16px_30px_-12px_oklch(0.02_0.02_250/0.8)]"
      />
      <div className="absolute inset-0" style={{ perspective: 1400 }}>
        <div ref={assemblyRef} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {panels.map(({ j, r }) => (
            <div
              key={`${j}-${r}`}
              data-panel=""
              className="absolute top-0 left-0"
              style={{ width: pw, height: ph, transformOrigin: "0 0", transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]">
                <div
                  inert
                  aria-hidden="true"
                  className="absolute bg-(--miyuki-map-fold-card-paper) text-(--miyuki-map-fold-card-ink)"
                  style={{ ...sheet, left: -j * pw, top: -r * ph }}
                >
                  <div className="absolute inset-0">{children}</div>
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-multiply dark:opacity-[0.14]"
                    style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
                  />
                  {rowCrease ? (
                    <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: rowCrease }} />
                  ) : null}
                </div>
                <div data-shade-front="" className="absolute inset-0 opacity-0" />
              </div>
              <div
                className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                style={{ transform: "rotateY(180deg)" }}
              >
                <div aria-hidden="true" className="absolute inset-0 bg-(--miyuki-map-fold-card-cover)">
                  <div
                    className="absolute inset-0 bg-brand-foreground opacity-[0.1] dark:opacity-[0.14]"
                    style={{ maskImage: CONTOURS, maskSize: "160px 120px", maskPosition: `${-j * 53}px ${-r * 41}px` }}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.3] mix-blend-multiply"
                    style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
                  />
                  {j === 0 && r === 0 ? (
                    <div className="@container absolute inset-0 flex flex-col justify-between p-[clamp(10px,9cqw,16px)] text-[oklch(0.98_0.005_236)]">
                      <svg
                        viewBox="0 0 40 24"
                        className="h-[clamp(16px,15cqw,24px)] w-auto self-start"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 23 L13 7 L19 14 L26 4 L39 23 Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M22 9.5 L26 4 L30 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div>
                        <p className="font-display text-[clamp(13px,11.5cqw,18px)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">
                          {title}
                        </p>
                        {subtitle != null ? (
                          <p className="mt-1.5 text-[clamp(10px,7.5cqw,12px)] opacity-80">{subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div data-shade-back="" className="absolute inset-0 opacity-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {settledOpen ? <div className="sr-only">{children}</div> : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? closeLabel : typeof title === "string" ? `${openLabel}: ${title}` : openLabel}
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute cursor-default rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          settledOpen &&
            "top-3 right-3 grid h-7 place-items-center rounded-md bg-card/90 px-2.5 text-xs font-medium text-foreground opacity-0 shadow-sm ring-1 ring-foreground/10 transition-opacity duration-150 group-hover/map:opacity-100 focus-visible:opacity-100 dark:bg-popover",
        )}
        style={settledOpen ? undefined : { left: (W - pw) / 2, top: (H - ph) / 2, width: pw, height: ph }}
      >
        {settledOpen ? closeLabel : null}
      </button>
    </div>
  );
}
