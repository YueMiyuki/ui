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

export type OrigamiTone = "water" | "camellia" | "wisteria" | "seafoam" | "yuzu";

export interface OrigamiCardProps extends Omit<ComponentProps<"div">, "children"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  folds?: 2 | 3 | 4;
  size?: number;
  label?: ReactNode;
  closeLabel?: string;
  tone?: OrigamiTone;
}

type Mat = number[];

const TONES: Record<OrigamiTone, string> = {
  water: "[--miyuki-origami-card-tone:var(--brand)]",
  camellia: "[--miyuki-origami-card-tone:var(--chart-5)]",
  wisteria: "[--miyuki-origami-card-tone:var(--chart-3)]",
  seafoam: "[--miyuki-origami-card-tone:var(--chart-2)]",
  yuzu: "[--miyuki-origami-card-tone:var(--chart-4)]",
};

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='12' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.03 .55' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.5 -.98'/></filter><rect width='220' height='220' filter='url(#a)'/><rect width='220' height='220' filter='url(#b)'/></svg>",
)}")`;

const WAVES = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='14'><g fill='none' stroke='#000' stroke-width='1'><path d='M0 14a14 14 0 0 1 28 0M4 14a10 10 0 0 1 20 0M8 14a6 6 0 0 1 12 0M-14 7a14 14 0 0 1 28 0M14 7a14 14 0 0 1 28 0M-10 7a10 10 0 0 1 20 0M18 7a10 10 0 0 1 20 0'/></g></svg>",
)}")`;

const LIGHT = (() => {
  const v = [-0.35, -0.55, 0.76];
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

interface Fold {
  vertical: boolean;
  at: number;
  lift: number;
  shift: number;
}

interface Panel {
  px: number;
  py: number;
  moves: boolean[];
}

function plan(w: number, h: number, n: number) {
  const cols = 2 ** Math.ceil(n / 2);
  const rows = 2 ** Math.floor(n / 2);
  const pw = w / cols;
  const ph = h / rows;
  const folds: Fold[] = [];
  let cw = w;
  let ch = h;
  let z = 0;
  for (let i = 0; i < n; i++) {
    const vertical = i % 2 === 0;
    const lift = z + 0.35;
    z = 2 * lift;
    if (vertical) {
      folds.push({ vertical, at: cw / 2, lift, shift: cw / 4 });
      cw /= 2;
    } else {
      folds.push({ vertical, at: ch / 2, lift, shift: ch / 4 });
      ch /= 2;
    }
  }
  const hinge = (f: Fold, a: number) => {
    const c = f.at - f.lift * 0.45;
    return f.vertical
      ? mul(tr(c, 0, f.lift), mul(rotY(-a), tr(-c, 0, -f.lift)))
      : mul(tr(0, c, f.lift), mul(rotX(a), tr(0, -c, -f.lift)));
  };
  const panels: Panel[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const px = c * pw;
      const py = r * ph;
      const moves: boolean[] = [];
      let m = tr(px, py, 0);
      for (const f of folds) {
        const [cx, cy] = apply(m, pw / 2, ph / 2);
        const go = f.vertical ? cx > f.at : cy > f.at;
        moves.push(go);
        if (go) m = mul(hinge(f, Math.PI), m);
      }
      panels.push({ px, py, moves });
    }
  const matrix = (p: Panel, angles: number[]) => {
    let m = tr(p.px, p.py, 0);
    folds.forEach((f, i) => {
      if (p.moves[i] && angles[i] > 0) m = mul(hinge(f, angles[i]), m);
    });
    return m;
  };
  const closed = folds.map(() => Math.PI);
  let top = 0;
  let best = -Infinity;
  panels.forEach((p, i) => {
    const z0 = apply(matrix(p, closed), pw / 2, ph / 2)[2];
    if (z0 > best) {
      best = z0;
      top = i;
    }
  });
  const tm = matrix(panels[top], closed);
  const label = [-tm[0], -tm[1], tm[4], tm[5]].map((v) => Math.round(v));
  const creases: { vertical: boolean; at: number; valley: boolean }[] = [];
  for (let c = 1; c < cols; c++) creases.push({ vertical: true, at: c * pw, valley: c % 2 === 1 });
  for (let r = 1; r < rows; r++) creases.push({ vertical: false, at: r * ph, valley: r % 2 === 0 });
  return { cols, rows, pw, ph, folds, panels, matrix, top, label, creases, packet: [cw, ch] as const };
}

function creaseImage(creases: { vertical: boolean; at: number; valley: boolean }[]) {
  return creases
    .map(({ vertical, at, valley }) => {
      const dir = vertical ? "90deg" : "180deg";
      const a = valley ? "var(--miyuki-origami-card-crease-dark)" : "var(--miyuki-origami-card-crease-lit)";
      const b = valley ? "var(--miyuki-origami-card-crease-lit)" : "var(--miyuki-origami-card-crease-dark)";
      return `linear-gradient(${dir}, transparent ${at - 2.5}px, ${a} ${at - 0.5}px, ${b} ${at + 0.5}px, transparent ${at + 2.5}px)`;
    })
    .join(", ");
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export function OrigamiCard({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  folds = 4,
  size = 340,
  label = "Open me",
  closeLabel = "Fold it up",
  tone = "water",
  className,
  style,
  ...props
}: OrigamiCardProps) {
  const reduced = useReducedMotion() ?? false;
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const [width, setWidth] = useState(size);
  const [settled, setSettled] = useState<"open" | "closed" | "moving">(open ? "open" : "closed");
  const rootRef = useRef<HTMLDivElement>(null);
  const assemblyRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const angles = useRef<number[]>([]);
  const n = Math.max(2, Math.min(4, folds));
  const geo = useMemo(() => plan(width, width, n), [width, n]);
  const openRef = useRef(open);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setWidth(Math.max(120, root.offsetWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const paint = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const assembly = assemblyRef.current;
    const shadow = shadowRef.current;
    if (!assembly || !shadow) return;
    const els = Array.from(assembly.querySelectorAll<HTMLElement>("[data-panel]"));
    if (angles.current.length !== geo.folds.length)
      angles.current = geo.folds.map(() => (openRef.current ? 0 : Math.PI));
    paint.current = () => {
      const a = angles.current;
      let ox = 0;
      let oy = 0;
      geo.folds.forEach((f, i) => {
        const k = (1 - Math.cos(a[i])) / 2;
        if (f.vertical) ox += k * f.shift;
        else oy += k * f.shift;
      });
      assembly.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      geo.panels.forEach((p, i) => {
        const el = els[i];
        if (!el) return;
        const m = geo.matrix(p, a);
        el.style.transform = css(m);
        for (const [cx, cy] of [
          [0, 0],
          [geo.pw, 0],
          [0, geo.ph],
          [geo.pw, geo.ph],
        ]) {
          const [x, y, z] = apply(m, cx, cy);
          if (z > 4) continue;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
        const nz = [m[8], m[9], m[10]];
        const front = nz[2] >= 0;
        const nn = front ? nz : nz.map((v) => -v);
        const lit = (nn[0] * LIGHT[0] + nn[1] * LIGHT[1] + nn[2] * LIGHT[2]) / LIGHT[2];
        const shade = el.querySelector<HTMLElement>(front ? "[data-shade-front]" : "[data-shade-back]");
        if (shade) {
          shade.style.backgroundColor = lit < 1 ? "var(--miyuki-origami-card-dark)" : "oklch(1 0 0)";
          shade.style.opacity = (lit < 1 ? Math.min(0.62, (1 - lit) * 0.7) : Math.min(0.3, (lit - 1) * 0.9)).toFixed(3);
        }
      });
      if (x0 < x1) {
        shadow.style.transform = `translate3d(${(x0 + ox).toFixed(1)}px, ${(y0 + oy).toFixed(1)}px, 0)`;
        shadow.style.width = `${(x1 - x0).toFixed(1)}px`;
        shadow.style.height = `${(y1 - y0).toFixed(1)}px`;
      }
    };
    paint.current();
  }, [geo, settled]);

  const live = useRef({ reduced });
  useLayoutEffect(() => {
    live.current = { reduced };
    openRef.current = open;
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = open ? 0 : Math.PI;
    const a = angles.current;
    if (live.current.reduced) {
      a.fill(target);
      setSettled(open ? "open" : "closed");
      rootRef.current?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      return;
    }
    setSettled("moving");
    const order = open ? a.map((_, i) => a.length - 1 - i) : a.map((_, i) => i);
    const queue = order.filter((i) => Math.abs(a[i] - target) > 1e-3);
    const D = 400;
    const GAP = 50;
    let raf = 0;
    let start = 0;
    let idx = 0;
    let from = queue.length ? a[queue[0]] : target;
    const frame = (now: number) => {
      if (!start) start = now;
      if (idx >= queue.length) {
        setSettled(open ? "open" : "closed");
        return;
      }
      const i = queue[idx];
      const u = Math.min(1, (now - start) / D);
      a[i] = from + (target - from) * ease(u);
      paint.current();
      if (u >= 1) {
        a[i] = target;
        idx++;
        start = now + GAP;
        if (idx < queue.length) from = a[queue[idx]];
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

  const { pw, ph, packet } = geo;
  const lightVars =
    "[--miyuki-origami-card-dark:oklch(0.28_0.06_252)] dark:[--miyuki-origami-card-dark:oklch(0.08_0.03_252)] ink:[--miyuki-origami-card-dark:oklch(0.08_0_0)] [--miyuki-origami-card-crease-dark:oklch(0.42_0.09_250/0.1)] [--miyuki-origami-card-crease-lit:oklch(1_0_0/0.75)] dark:[--miyuki-origami-card-crease-dark:oklch(0.2_0.05_250/0.14)] ink:[--miyuki-origami-card-crease-dark:oklch(0.2_0_0/0.14)] dark:[--miyuki-origami-card-crease-lit:oklch(1_0_0/0.28)]";
  const inside: CSSProperties = { width, height: width };
  const creases = creaseImage(geo.creases);
  const insidePaper = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.24] mix-blend-multiply dark:opacity-[0.14]"
        style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: creases }} />
    </>
  );
  const labelText = typeof label === "string" ? label : "Open";
  const isOpen = settled === "open";

  return (
    <div
      role="group"
      {...props}
      ref={rootRef}
      className={cn(
        "group/origami relative isolate aspect-square max-w-full select-none",
        lightVars,
        TONES[tone],
        className,
      )}
      style={{ width: size, ...style }}
    >
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 rounded-[3px] shadow-[0_1px_2px_oklch(0.42_0.09_250/0.16),0_14px_28px_-10px_oklch(0.42_0.09_250/0.3)] dark:shadow-[0_1px_2px_oklch(0.02_0.02_250/0.6),0_14px_28px_-10px_oklch(0.02_0.02_250/0.8)] ink:shadow-[0_1px_2px_oklch(0.02_0_0/0.6),0_14px_28px_-10px_oklch(0.02_0_0/0.8)]"
      />
      <div className="absolute inset-0" style={{ perspective: 1300 }}>
        <div
          ref={assemblyRef}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", visibility: isOpen ? "hidden" : "visible" }}
        >
          {geo.panels.map((p, i) => (
            <div
              key={`${n}-${i}`}
              data-panel=""
              className="absolute top-0 left-0"
              style={{ width: pw, height: ph, transformOrigin: "0 0", transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]">
                <div
                  inert
                  aria-hidden="true"
                  className="absolute bg-[color-mix(in_oklab,var(--card)_97%,var(--warning))] text-foreground dark:bg-[color-mix(in_oklab,var(--foreground)_88%,var(--background))] dark:text-primary-foreground"
                  style={{ ...inside, left: -p.px, top: -p.py }}
                >
                  {insidePaper}
                  <div className="relative size-full">{children}</div>
                </div>
                <div data-shade-front="" className="absolute inset-0 opacity-0" />
              </div>
              <div
                className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                style={{ transform: "rotateY(180deg)" }}
              >
                <div
                  aria-hidden="true"
                  className="absolute bg-[color-mix(in_oklab,var(--miyuki-origami-card-tone)_78%,var(--foreground))] dark:bg-[color-mix(in_oklab,var(--miyuki-origami-card-tone)_82%,var(--background))]"
                  style={{ ...inside, left: -(width - p.px - pw), top: -p.py }}
                >
                  <div
                    className="absolute inset-0 bg-[color-mix(in_oklab,var(--miyuki-origami-card-tone)_45%,var(--card))] opacity-35 dark:opacity-25"
                    style={{ maskImage: WAVES, maskSize: "28px 14px" }}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.3] mix-blend-multiply"
                    style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
                  />
                </div>
                {i === geo.top ? (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 grid place-items-center"
                    style={{ transform: `matrix(${geo.label.join(",")},0,0)` }}
                  >
                    <span className="rounded-[2px] bg-[color-mix(in_oklab,var(--card)_94%,var(--warning))] px-2 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-[0_1px_1px_oklch(0.2_0.05_250/0.3)] ink:shadow-[0_1px_1px_oklch(0.2_0_0/0.3)] dark:bg-[color-mix(in_oklab,var(--foreground)_90%,var(--background))] dark:text-primary-foreground">
                      {label}
                    </span>
                  </div>
                ) : null}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 shadow-[inset_0_0_0_0.5px_oklch(1_0_0/0.18),inset_0_-1.5px_2px_oklch(0.15_0.04_250/0.18),inset_1.5px_0_2px_oklch(1_0_0/0.12)] ink:shadow-[inset_0_0_0_0.5px_oklch(1_0_0/0.18),inset_0_-1.5px_2px_oklch(0.15_0_0/0.18),inset_1.5px_0_2px_oklch(1_0_0/0.12)]"
                />
                <div data-shade-back="" className="absolute inset-0 opacity-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {isOpen ? (
        <div className="absolute inset-0 overflow-hidden rounded-[2px] bg-[color-mix(in_oklab,var(--card)_97%,var(--warning))] text-foreground dark:bg-[color-mix(in_oklab,var(--foreground)_88%,var(--background))] dark:text-primary-foreground">
          {insidePaper}
          <div className="relative size-full">{children}</div>
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? closeLabel : labelText}
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute cursor-default rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          isOpen &&
            "top-3 right-3 grid h-7 place-items-center rounded-md bg-card/90 px-2.5 text-xs font-medium text-foreground opacity-0 shadow-sm ring-1 ring-foreground/10 transition-opacity duration-150 group-hover/origami:opacity-100 focus-visible:opacity-100 dark:bg-popover",
        )}
        style={
          isOpen
            ? undefined
            : { left: (width - packet[0]) / 2, top: (width - packet[1]) / 2, width: packet[0], height: packet[1] }
        }
      >
        {isOpen ? closeLabel : null}
      </button>
    </div>
  );
}
