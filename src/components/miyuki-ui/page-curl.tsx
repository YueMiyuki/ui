"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type AnimationPlaybackControls, animate, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { cn } from "@/lib/utils";

export interface PageCurlProps extends Omit<ComponentProps<"div">, "children"> {
  pages: ReactNode[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  "aria-label"?: string;
}

type Pt = [number, number];
type Mode = 0 | 1 | -1;

const ZONE = 96;
const EDGE = 44;
const SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
const HOVER = { type: "spring", stiffness: 420, damping: 30 } as const;
const TURN_MS = 0.42;

const r1 = (v: number) => Math.round(v * 10) / 10;

function cut(poly: Pt[], nx: number, ny: number, k: number, sign: 1 | -1): Pt[] {
  const out: Pt[] = [];
  const side = (p: Pt) => sign * (p[0] * nx + p[1] * ny - k);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

const polygon = (pts: Pt[]) =>
  pts.length < 3 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${pts.map(([x, y]) => `${r1(x)}px ${r1(y)}px`).join(", ")})`;

export function PageCurl({
  pages,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  className,
  onKeyDown,
  "aria-label": ariaLabel = "Booklet",
  ...props
}: PageCurlProps) {
  const reduced = useReducedMotion() ?? false;
  const count = pages.length;
  const [own, setOwn] = useState(defaultIndex);
  const index = Math.min(Math.max(0, indexProp ?? own), Math.max(0, count - 1));
  const [mode, setMode] = useState<Mode>(0);
  const [fade, setFade] = useState<{ from: number } | null>(null);
  const [announce, setAnnounce] = useState("");

  const sheet = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const bend = useRef<HTMLDivElement>(null);
  const flapWrap = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLDivElement>(null);
  const gloss = useRef<HTMLDivElement>(null);
  const cast = useRef<HTMLDivElement>(null);
  const beneath = useRef<HTMLDivElement>(null);

  const size = useRef({ w: 0, h: 0 });
  const corner = useRef<Pt>([0, 0]);
  const motionRef = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{
    id: number;
    dir: 1 | -1;
    grab: Pt;
    from: Pt;
    last: Pt;
    t: number;
    vx: number;
    moved: boolean;
  } | null>(null);
  const hovering = useRef(false);
  const modeRef = useRef<Mode>(0);

  const canForward = index < count - 1;
  const canBack = index > 0;

  const moving = mode === -1 ? index - 1 : index;
  const under = mode === -1 ? index : index + 1;

  function paint() {
    const { w, h } = size.current;
    const [px, py] = corner.current;
    const f = front.current;
    const fw = flapWrap.current;
    const fl = flap.current;
    const g = gloss.current;
    const c = cast.current;
    const b = bend.current;
    if (!f || !fw || !fl || !g || !c || !b || !w) return;
    const vx = w - px;
    const vy = h - py;
    const len = Math.hypot(vx, vy);
    if (len < 0.75) {
      f.style.clipPath = "none";
      fw.style.visibility = "hidden";
      c.style.visibility = "hidden";
      b.style.visibility = "hidden";
      return;
    }
    const nx = vx / len;
    const ny = vy / len;
    const mx = (w + px) / 2;
    const my = (h + py) / 2;
    const k = mx * nx + my * ny;
    const rect: Pt[] = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    f.style.clipPath = polygon(cut(rect, nx, ny, k, 1));
    fl.style.clipPath = polygon(cut(rect, nx, ny, k, -1));
    const a = 1 - 2 * nx * nx;
    const bxy = -2 * nx * ny;
    const d = 1 - 2 * ny * ny;
    fl.style.transform = `matrix(${a}, ${bxy}, ${bxy}, ${d}, ${r1(2 * k * nx)}, ${r1(2 * k * ny)})`;
    fw.style.visibility = "visible";

    const angle = (Math.atan2(ny, nx) * 180) / Math.PI;
    const depth = len / 2;
    const reach = Math.hypot(w, h) * 2;
    const at = `translate(${r1(mx)}px, ${r1(my)}px) rotate(${r1(angle)}deg) translateY(-50%)`;
    g.style.transform = at;
    g.style.width = `${r1(reach)}px`;
    g.style.height = `${r1(reach * 2)}px`;
    g.style.backgroundImage = `linear-gradient(to right, oklch(0.25 0.05 250 / 0.16) 0px, oklch(1 0 0 / 0) ${r1(
      Math.min(6, depth * 0.08) + 1,
    )}px, oklch(1 0 0 / 0.42) ${r1(depth * 0.16 + 4)}px, oklch(1 0 0 / 0) ${r1(depth * 0.42 + 8)}px, oklch(0.25 0.05 250 / 0.07) ${r1(
      depth + 8,
    )}px)`;

    const spread = 10 + Math.min(depth, w) * 0.16;
    const strength = Math.min(1, len / 60);
    c.style.visibility = "visible";
    c.style.transform = at;
    c.style.width = `${r1(reach)}px`;
    c.style.height = `${r1(reach * 2)}px`;
    c.style.backgroundImage = `linear-gradient(to right, oklch(0.2 0.04 250 / ${(0.34 * strength).toFixed(3)}) 0px, oklch(0.2 0.04 250 / ${(
      0.12 * strength
    ).toFixed(3)}) ${r1(spread * 0.35)}px, oklch(0.2 0.04 250 / 0) ${r1(spread)}px)`;

    b.style.visibility = "visible";
    b.style.transform = `translate(${r1(mx)}px, ${r1(my)}px) rotate(${r1(angle + 180)}deg) translateY(-50%)`;
    b.style.width = `${r1(reach)}px`;
    b.style.height = `${r1(reach * 2)}px`;
    b.style.backgroundImage = `linear-gradient(to right, oklch(0.25 0.05 250 / ${(0.1 * strength).toFixed(3)}) 0px, oklch(0.25 0.05 250 / 0) ${r1(
      14 + depth * 0.1,
    )}px)`;
  }

  function place(p: Pt) {
    const { w, h } = size.current;
    let [x, y] = p;
    y = Math.min(h, y);
    const db = Math.hypot(x, y - h);
    if (db > w) {
      x = (x / db) * w;
      y = h + ((y - h) / db) * w;
    }
    const diag = Math.hypot(w, h);
    const dt = Math.hypot(x, y);
    if (dt > diag) {
      x = (x / dt) * diag;
      y = (y / dt) * diag;
    }
    corner.current = [x, y];
    paint();
  }

  function stop() {
    motionRef.current?.stop();
    motionRef.current = null;
  }

  function glide(to: Pt, transition: typeof SPRING | typeof HOVER, done?: () => void) {
    stop();
    const [x0, y0] = corner.current;
    const controls = animate(0, 1, {
      ...transition,
      onUpdate: (t) => place([x0 + (to[0] - x0) * t, y0 + (to[1] - y0) * t]),
      onComplete: () => {
        if (motionRef.current === controls) motionRef.current = null;
        place(to);
        done?.();
      },
    });
    motionRef.current = controls;
  }

  function rest() {
    const { w, h } = size.current;
    corner.current = [w, h];
    paint();
  }

  function commit(next: number) {
    if (indexProp === undefined) setOwn(next);
    onIndexChange?.(next);
    setAnnounce(`Page ${next + 1} of ${count}`);
  }

  function finish(next: number | null) {
    if (next !== null) commit(next);
    setMode(0);
    modeRef.current = 0;
    rest();
  }

  function land(next: number | null) {
    const fw = flapWrap.current;
    if (!fw || corner.current[0] > 0 || reduced) {
      finish(next);
      return;
    }
    const fading = animate(fw, { opacity: 0 }, { duration: 0.16, ease: "easeOut" });
    motionRef.current = fading;
    fading.then(() => {
      if (motionRef.current !== fading) return;
      motionRef.current = null;
      finish(next);
    });
  }

  function begin(dir: 1 | -1) {
    const { w, h } = size.current;
    setMode(dir);
    modeRef.current = dir;
    corner.current = dir === 1 ? [w, h] : [-w, h];
    const fw = flapWrap.current;
    if (!fw) return;
    if (dir === 1 || reduced) fw.style.opacity = "1";
    else {
      fw.style.opacity = "0";
      animate(fw, { opacity: 1 }, { duration: 0.14, ease: "easeOut" });
    }
  }

  function turn(dir: 1 | -1) {
    if (drag.current) return;
    if (dir === 1 && !canForward) return;
    if (dir === -1 && !canBack) return;
    stop();
    const next = index + dir;
    if (reduced) {
      setFade({ from: index });
      commit(next);
      return;
    }
    const { w, h } = size.current;
    const start: Pt = dir === 1 && modeRef.current === 1 ? corner.current : dir === 1 ? [w, h] : [-w, h];
    const end: Pt = dir === 1 ? [-w, h] : [w, h];
    if (modeRef.current !== dir) begin(dir);
    corner.current = start;
    const [x0, y0] = start;
    const turning = animate(0, 1, {
      duration: TURN_MS,
      ease: [0.45, 0.05, 0.3, 1],
      onUpdate: (t) => {
        const lift = Math.sin(Math.PI * t) * h * 0.2;
        place([x0 + (end[0] - x0) * t, y0 + (end[1] - y0) * t - lift]);
      },
      onComplete: () => {
        if (motionRef.current === turning) motionRef.current = null;
        land(next);
      },
    });
    motionRef.current = turning;
  }

  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const measure = () => {
      size.current = { w: el.offsetWidth, h: el.offsetHeight };
      if (modeRef.current === 0 && !motionRef.current) rest();
      else paint();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => () => motionRef.current?.stop(), []);

  useEffect(() => {
    if (!fade) return;
    const timer = setTimeout(() => setFade(null), 180);
    return () => clearTimeout(timer);
  }, [fade]);

  function local(e: PointerEvent): Pt {
    const el = sheet.current;
    if (!el) return [0, 0];
    const box = el.getBoundingClientRect();
    const sx = box.width ? el.offsetWidth / box.width : 1;
    const sy = box.height ? el.offsetHeight / box.height : 1;
    return [(e.clientX - box.left) * sx, (e.clientY - box.top) * sy];
  }

  function zone(p: Pt): Mode {
    const { w, h } = size.current;
    if (canForward && (Math.hypot(w - p[0], h - p[1]) < ZONE || (p[0] > w - EDGE * 0.6 && p[1] > h * 0.4))) return 1;
    if (canBack && p[0] < EDGE && p[1] > h * 0.25) return -1;
    return 0;
  }

  function hover(p: Pt | null) {
    if (drag.current || reduced) return;
    if (motionRef.current && modeRef.current !== 0 && !hovering.current) return;
    const { w, h } = size.current;
    const z = p ? zone(p) : 0;
    if (z === 0) {
      if (!hovering.current) return;
      hovering.current = false;
      const dir = modeRef.current;
      glide(dir === -1 ? [-w, h] : [w, h], HOVER, () => {
        if (!drag.current && !hovering.current) land(null);
      });
      return;
    }
    if (modeRef.current !== z) {
      if (modeRef.current !== 0 && motionRef.current) return;
      begin(z);
    }
    hovering.current = true;
    if (!p) return;
    if (z === 1) {
      const dx = p[0] - w;
      const dy = p[1] - h;
      const pull = 0.45;
      const lift = Math.max(30, Math.min(64, Math.hypot(dx, dy) * pull + 32));
      const dir = Math.hypot(dx, dy) > 1 ? [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)] : [-0.7, -0.7];
      const to: Pt = [w + dir[0] * lift, h + Math.min(-8, dir[1] * lift)];
      glide(to, HOVER);
    } else {
      glide([-w + 26, h - 6], HOVER);
    }
  }

  return (
    <div {...props} className={cn("relative flex flex-col items-center gap-4", className)}>
      <div
        ref={sheet}
        role="group"
        aria-roledescription="booklet"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "ArrowRight" || e.key === "PageDown") turn(1);
          else if (e.key === "ArrowLeft" || e.key === "PageUp") turn(-1);
          else return;
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          const p = local(e);
          const d = drag.current;
          if (d && d.id === e.pointerId) {
            const dt = Math.max(1, e.timeStamp - d.t);
            d.vx = d.vx * 0.6 + ((p[0] - d.last[0]) / dt) * 1000 * 0.4;
            d.last = p;
            d.t = e.timeStamp;
            if (Math.hypot(p[0] - d.grab[0], p[1] - d.grab[1]) > 4) d.moved = true;
            const k = d.dir === 1 ? 1 : 2;
            place([d.from[0] + (p[0] - d.grab[0]) * k, d.from[1] + (p[1] - d.grab[1])]);
            return;
          }
          if (e.pointerType === "mouse") hover(p);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !drag.current) hover(null);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const p = local(e);
          const z = zone(p);
          if (z === 0) return;
          stop();
          if (modeRef.current !== z) begin(z);
          hovering.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            id: e.pointerId,
            dir: z,
            grab: p,
            from: corner.current,
            last: p,
            t: e.timeStamp,
            vx: 0,
            moved: false,
          };
          e.preventDefault();
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          drag.current = null;
          const { w, h } = size.current;
          const p = local(e);
          if (!d.moved) {
            const next = index + d.dir;
            const end: Pt = d.dir === 1 ? [-w, h] : [w, h];
            glide(end, SPRING, () => land(next));
            return;
          }
          const forward = d.dir === 1;
          const past = forward ? p[0] < w / 2 || d.vx < -650 : corner.current[0] > 0 || d.vx > 650;
          const to: Pt = forward ? (past ? [-w, h] : [w, h]) : past ? [w, h] : [-w, h];
          const transition = reduced ? ({ type: "spring", stiffness: 900, damping: 60 } as const) : SPRING;
          glide(to, transition as typeof SPRING, () => land(past ? index + d.dir : null));
        }}
        onPointerCancel={() => {
          if (!drag.current) return;
          drag.current = null;
          const { w, h } = size.current;
          glide(modeRef.current === -1 ? [-w, h] : [w, h], SPRING, () => land(null));
        }}
        className={cn(
          "relative isolate aspect-[4/5] w-full touch-pan-y select-none outline-none",
          "rounded-[4px] focus-visible:ring-[3px] focus-visible:ring-ring",
        )}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-[4px] border border-border bg-card shadow-sm"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-[2.5px] translate-y-[2.5px] rounded-[4px] border border-border bg-card"
        />

        <div
          ref={beneath}
          aria-hidden="true"
          inert
          className={cn(
            "absolute inset-0 overflow-clip rounded-[4px] border border-border bg-card",
            mode === 0 && "invisible",
          )}
        >
          <Paper>{under >= 0 && under < count ? pages[under] : null}</Paper>
          <div ref={cast} className="pointer-events-none invisible absolute top-0 left-0 origin-top-left" />
        </div>

        {fade && fade.from !== index ? (
          <div
            aria-hidden="true"
            inert
            className="absolute inset-0 overflow-clip rounded-[4px] border border-border bg-card"
          >
            <Paper>{pages[fade.from]}</Paper>
          </div>
        ) : null}

        <div
          ref={front}
          className={cn(
            "absolute inset-0 overflow-clip rounded-[4px] border border-border bg-card shadow-sm",
            fade && fade.from !== index && "animate-[miyuki-page-curl-in_160ms_ease-out]",
          )}
        >
          <Paper>{pages[moving]}</Paper>
          <div ref={bend} className="pointer-events-none invisible absolute top-0 left-0 origin-top-left" />
        </div>

        <div
          ref={flapWrap}
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-0 drop-shadow-[2px_3px_6px_oklch(0.2_0.04_250/0.28)] dark:drop-shadow-[2px_3px_8px_oklch(0.05_0.02_250/0.6)] ink:drop-shadow-[2px_3px_8px_oklch(0.05_0_0/0.6)]"
        >
          <div
            ref={flap}
            inert
            className="absolute inset-0 origin-top-left overflow-clip rounded-[4px] bg-[color-mix(in_oklab,var(--card)_93%,var(--foreground))] dark:bg-[color-mix(in_oklab,var(--card)_88%,var(--foreground))]"
          >
            <div className="absolute inset-0 opacity-[0.06]">
              <Paper>{pages[moving]}</Paper>
            </div>
            <div ref={gloss} className="absolute top-0 left-0 origin-top-left" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <IconButton aria-label="Previous page" variant="ghost" size="sm" isDisabled={!canBack} onPress={() => turn(-1)}>
          <ChevronLeft />
        </IconButton>
        <p className="min-w-[5.5rem] text-center text-[13px] text-muted-foreground tabular-nums">
          Page {index + 1} of {count}
        </p>
        <IconButton aria-label="Next page" variant="ghost" size="sm" isDisabled={!canForward} onPress={() => turn(1)}>
          <ChevronRight />
        </IconButton>
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>
      <style href="miyuki-page-curl" precedence="miyuki">{`
        @keyframes miyuki-page-curl-in { from { opacity: 0; } }
      `}</style>
    </div>
  );
}

function Paper({ children }: { children: ReactNode }) {
  return (
    <div className="relative size-full">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-linear-to-r from-[oklch(0.25_0.05_250/0.05)] to-transparent dark:from-[oklch(0.05_0.02_250/0.3)] ink:from-[oklch(0.05_0_0/0.3)]"
      />
    </div>
  );
}
