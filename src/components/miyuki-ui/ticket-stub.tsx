"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface TicketStubProps extends Omit<ComponentProps<"div">, "children"> {
  children?: ReactNode;
  stub?: ReactNode;
  torn?: boolean;
  defaultTorn?: boolean;
  onTear?: () => void;
  side?: "right" | "bottom";
  tearLabel?: string;
  usedLabel?: ReactNode;
}

type Phase = "intact" | "tearing" | "free" | "gone";

const NOTCH = 11;
const HOLE = 2.1;
const PITCH = 8;
const STRETCH = 2.2;
const BREAK = 2.2;
const FREE = 20;
const KNEE = 1.5;
const TEAR_AT = 40;

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='a' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='8' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.3 -.5'/></filter><filter id='b' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='.03 .55' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .14 0 0 0 0 .18 0 0 0 0 .3 0 0 0 1.5 -.98'/></filter><rect width='220' height='220' filter='url(#a)'/><rect width='220' height='220' filter='url(#b)'/></svg>",
)}")`;

const GUILLOCHE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='7'><path d='M0 3.5 C 3 0.5, 9 0.5, 12 3.5 S 21 6.5, 24 3.5' fill='none' stroke='#000' stroke-width='.7'/></svg>",
)}")`;

const INK = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.9'/></filter><rect width='120' height='60' filter='url(#n)'/></svg>",
)}")`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function edgeMask(side: "right" | "bottom", part: "main" | "stub"): CSSProperties {
  const cut = (at: string) => `radial-gradient(circle at ${at}, #0000 ${NOTCH}px, #000 ${NOTCH + 0.5}px)`;
  if (side === "right") {
    const x = part === "main" ? "100%" : "0";
    return {
      maskImage: `${cut(`${x} 0`)}, ${cut(`${x} 100%`)}, radial-gradient(circle at ${x} 50%, #0000 ${HOLE}px, #000 ${HOLE + 0.5}px)`,
      maskSize: `100% 100%, 100% 100%, 100% ${PITCH}px`,
      maskRepeat: "no-repeat, no-repeat, repeat-y",
      maskPosition: "0 0, 0 0, 0 50%",
      maskComposite: "intersect",
    };
  }
  const y = part === "main" ? "100%" : "0";
  return {
    maskImage: `${cut(`0 ${y}`)}, ${cut(`100% ${y}`)}, radial-gradient(circle at 50% ${y}, #0000 ${HOLE}px, #000 ${HOLE + 0.5}px)`,
    maskSize: `100% 100%, 100% 100%, ${PITCH}px 100%`,
    maskRepeat: "no-repeat, no-repeat, repeat-x",
    maskPosition: "0 0, 0 0, 50% 0",
    maskComposite: "intersect",
  };
}

function rimShade(side: "right" | "bottom", part: "main" | "stub") {
  const tone = "var(--miyuki-ticket-stub-rim)";
  const ring = (at: string, r: number, w: number) =>
    `radial-gradient(circle at ${at}, ${tone} ${r}px, transparent ${r + w}px)`;
  if (side === "right") {
    const x = part === "main" ? "100%" : "0";
    return {
      backgroundImage: `${ring(`${x} 0`, NOTCH, 2.5)}, ${ring(`${x} 100%`, NOTCH, 2.5)}, ${ring(`${x} 50%`, HOLE, 1.6)}`,
      backgroundSize: `100% 100%, 100% 100%, 100% ${PITCH}px`,
      backgroundRepeat: "no-repeat, no-repeat, repeat-y",
      backgroundPosition: "0 0, 0 0, 0 50%",
    };
  }
  const y = part === "main" ? "100%" : "0";
  return {
    backgroundImage: `${ring(`0 ${y}`, NOTCH, 2.5)}, ${ring(`100% ${y}`, NOTCH, 2.5)}, ${ring(`50% ${y}`, HOLE, 1.6)}`,
    backgroundSize: `100% 100%, 100% 100%, ${PITCH}px 100%`,
    backgroundRepeat: "no-repeat, no-repeat, repeat-x",
    backgroundPosition: "0 0, 0 0, 50% 0",
  };
}

interface Bridge {
  a: number;
  b: number;
  tuft: [number, number][];
}

function makeBridges(length: number, seed: string): Bridge[] {
  const rng = createRng(seed);
  const mid = length / 2;
  const holes: number[] = [];
  for (let k = -200; k <= 200; k++) {
    const c = mid + k * PITCH;
    if (c - HOLE > NOTCH && c + HOLE < length - NOTCH) holes.push(c);
  }
  const edges = [NOTCH, ...holes.flatMap((c) => [c - HOLE, c + HOLE]), length - NOTCH];
  const out: Bridge[] = [];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    const tuft: [number, number][] = [];
    const n = 4;
    for (let j = 1; j < n; j++) tuft.push([a + ((b - a) * j) / n + rng.range(-0.4, 0.4), rng.range(0.6, 2.2)]);
    out.push({ a, b, tuft });
  }
  return out;
}

export function TicketStub({
  children,
  stub,
  torn,
  defaultTorn = false,
  onTear,
  side = "right",
  tearLabel = "Tear ticket",
  usedLabel = "Used",
  className,
  style,
  ...props
}: TicketStubProps) {
  const reduced = useReducedMotion() ?? false;
  const [inner, setInner] = useState<Phase>(defaultTorn ? "gone" : "intact");
  const controlled = torn !== undefined;
  const wantTorn = controlled ? torn : inner !== "intact";
  const [phase, setPhase] = useState<Phase>(wantTorn ? "gone" : "intact");
  const [box, setBox] = useState<{ w: number; h: number; cut: number } | null>(null);
  const stubId = useId();
  const seed = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const engine = useRef<{
    down: (e: PointerEvent<HTMLDivElement>) => void;
    move: (e: PointerEvent<HTMLDivElement>) => void;
    up: (e: PointerEvent<HTMLDivElement>) => void;
    script: () => void;
    reset: () => void;
  } | null>(null);
  const live = useRef({ reduced, onTear });
  useLayoutEffect(() => {
    live.current = { reduced, onTear };
  });

  const horizontal = side === "right";
  const length = box ? (horizontal ? box.h : box.w) : 0;
  const bridges = useMemo(() => (length ? makeBridges(length, seed) : []), [length, seed]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const main = mainRef.current;
    if (!root || !main) return;
    const measure = () =>
      setBox({ w: root.offsetWidth, h: root.offsetHeight, cut: horizontal ? main.offsetWidth : main.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [horizontal]);

  useEffect(() => {
    if (!box || phase === "gone") return;
    const main = mainRef.current;
    const stubEl = stubRef.current;
    const svg = svgRef.current;
    if (!main || !stubEl || !svg) return;
    const len = horizontal ? box.h : box.w;
    const cut = box.cut;
    const n: [number, number] = horizontal ? [1, 0] : [0, 1];
    const polys = Array.from(svg.querySelectorAll<SVGPolygonElement>("[data-bridge]"));
    const mainTufts = Array.from(svg.querySelectorAll<SVGPolygonElement>("[data-tuft-main]"));
    const stubTufts = Array.from(svg.querySelectorAll<SVGPolygonElement>("[data-tuft-stub]"));
    const stubGroup = svg.querySelector<SVGGElement>("[data-stub-group]");

    const e: [number, number] = horizontal ? [0, 1] : [1, 0];
    const turn = horizontal ? 1 : -1;
    const reach = 0.45 * len;
    const mids = bridges.map((br) => (br.a + br.b) / 2);
    const strength = bridges.map((_, i) => BREAK * (0.8 + 0.45 * (((i * 7919) % 13) / 12)));

    const s = {
      phase: "intact" as Phase,
      held: false,
      id: -1,
      start: [0, 0] as [number, number],
      grab: [0, 0] as [number, number],
      lever: [0, 0] as [number, number],
      base: 0,
      pull: [0, 0] as [number, number],
      script: 0,
      hover: 0,
      tx: 0,
      ty: 0,
      rot: 0,
      vx: 0,
      vy: 0,
      vr: 0,
      pivot: len - NOTCH,
      dir: 1,
      broken: bridges.map(() => false),
      count: 0,
      main: 0,
      mainV: 0,
      fade: 1,
      fallT: 0,
      samples: [] as [number, number, number][],
    };
    let raf = 0;
    let last = 0;

    const toLocal = (x: number, y: number) => {
      const r = rootRef.current!.getBoundingClientRect();
      return [x - r.left, y - r.top] as [number, number];
    };

    const pivotPoint = (): [number, number] => (horizontal ? [cut, s.pivot] : [s.pivot, cut]);
    const opening = () => s.rot * turn * s.dir;
    const give = (track: number) => (track <= 0 ? Math.max(-0.8, track * 0.15) : FREE * (track / FREE) ** KNEE);
    const ungive = (open: number) => FREE * (Math.max(0, open) / FREE) ** (1 / KNEE);

    const stubPoint = (along: number): [number, number] => {
      const [px, py] = pivotPoint();
      const x0 = horizontal ? cut : along;
      const y0 = horizontal ? along : cut;
      const a = (s.rot * Math.PI) / 180;
      const dx = x0 - px;
      const dy = y0 - py;
      return [px + dx * Math.cos(a) - dy * Math.sin(a) + s.tx, py + dx * Math.sin(a) + dy * Math.cos(a) + s.ty];
    };

    const paint = () => {
      const deg = s.rot.toFixed(3);
      const origin = horizontal ? `0px ${s.pivot.toFixed(1)}px` : `${s.pivot.toFixed(1)}px 0px`;
      stubEl.style.transformOrigin = origin;
      stubEl.style.transform = `translate(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px) rotate(${deg}deg)`;
      stubEl.style.opacity = s.fade.toFixed(3);
      const m = s.main;
      main.style.transform = m ? `translate(${(n[0] * m).toFixed(2)}px, ${(n[1] * m).toFixed(2)}px)` : "";
      if (stubGroup) {
        const [px, py] = pivotPoint();
        stubGroup.setAttribute(
          "transform",
          `translate(${s.tx.toFixed(2)} ${s.ty.toFixed(2)}) rotate(${deg} ${px.toFixed(1)} ${py.toFixed(1)})`,
        );
        stubGroup.style.opacity = s.fade.toFixed(3);
      }
      bridges.forEach((br, i) => {
        const gone = s.phase === "free" || s.broken[i];
        const poly = polys[i];
        mainTufts[i]?.setAttribute("visibility", gone ? "visible" : "hidden");
        stubTufts[i]?.setAttribute("visibility", gone ? "visible" : "hidden");
        if (!poly) return;
        const la: [number, number] = horizontal ? [cut + m, br.a] : [br.a, cut + m];
        const lb: [number, number] = horizontal ? [cut + m, br.b] : [br.b, cut + m];
        const ra = stubPoint(br.a);
        const rb = stubPoint(br.b);
        const gap = Math.hypot((ra[0] + rb[0]) / 2 - (la[0] + lb[0]) / 2, (ra[1] + rb[1]) / 2 - (la[1] + lb[1]) / 2);
        if (gone || gap < 0.35) {
          poly.setAttribute("visibility", "hidden");
          return;
        }
        const neck = Math.min(0.42, gap / 12) * (br.b - br.a) * 0.5;
        const mid = (p: [number, number], q: [number, number], inward: number): [number, number] => {
          const cx = (p[0] + q[0]) / 2;
          const cy = (p[1] + q[1]) / 2;
          return horizontal ? [cx, cy + inward] : [cx + inward, cy];
        };
        const ma = mid(la, ra, neck);
        const mb = mid(lb, rb, -neck);
        poly.setAttribute("visibility", "visible");
        poly.setAttribute(
          "points",
          [la, ma, ra, rb, mb, lb].map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" "),
        );
      });
    };

    const release = (fling: boolean) => {
      s.phase = "free";
      s.script = 0;
      s.mainV -= 40;
      if (fling) {
        s.vx = n[0] * 140 + (horizontal ? 0 : 40);
        s.vy = n[1] * 140 - (horizontal ? 60 : 0);
        s.vr = s.dir * (horizontal ? 70 : -70);
      } else {
        s.vx = s.vy = s.vr = 0;
      }
      live.current.onTear?.();
      setInner("gone");
    };

    const press = (p: [number, number]) => {
      const [px, py] = pivotPoint();
      const off = Math.max(6, horizontal ? p[0] - cut : p[1] - cut);
      const along = horizontal ? p[1] - py : p[0] - px;
      s.lever = [off, -s.dir * Math.max(Math.abs(along), reach)];
      s.base = ungive(opening());
      const a = (-s.rot * Math.PI) / 180;
      const dx = p[0] - s.tx - px;
      const dy = p[1] - s.ty - py;
      s.grab = [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)];
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60;
      last = now;
      const pulling = s.held || s.script > 0;
      if (s.phase !== "free" && pulling) {
        let a = s.pull[0] * n[0] + s.pull[1] * n[1];
        let b = s.pull[0] * e[0] + s.pull[1] * e[1];
        if (s.script) {
          const u = clamp((now - s.script) / 520, 0, 1);
          a = reach * 1.15 * u ** 1.7;
          b = 0;
        } else if (s.count === 0 && Math.abs(s.rot) < 0.5) {
          const at = horizontal ? s.grab[1] : s.grab[0];
          const shear = Math.abs(b) > 8 && Math.abs(b) > 1.5 * Math.max(a, 0);
          const dir = shear ? (b > 0 ? 1 : -1) : at <= len / 2 ? 1 : -1;
          if (dir !== s.dir) {
            s.dir = dir;
            s.pivot = dir > 0 ? len - NOTCH : NOTCH;
            press([s.grab[0] + s.tx, s.grab[1] + s.ty]);
          }
        }
        const out = a >= 0 ? STRETCH * (1 - Math.exp(-a / 10)) : Math.max(-1, a * 0.03);
        const toward = Math.max(0, b * s.dir);
        const raw =
          Math.atan2(s.lever[1] + b, Math.max(1, s.lever[0] + a - out + 0.7 * toward)) -
          Math.atan2(s.lever[1], s.lever[0]);
        const open = give(s.base + ((raw * 180) / Math.PI) * s.dir);
        const ease = Math.min(1, dt * 45);
        s.rot += (open * turn * s.dir - s.rot) * ease;
        const slip = 1.4 * Math.tanh(b / 40);
        s.tx += (n[0] * out + e[0] * slip - s.tx) * ease;
        s.ty += (n[1] * out + e[1] * slip - s.ty) * ease;
        s.vx = s.vy = 0;
        const turned = opening();
        const sine = Math.sin((Math.max(0, turned) * Math.PI) / 180);
        for (let i = 0; i < mids.length; i++) {
          if (s.broken[i] || Math.max(5.5, Math.abs(mids[i] - s.pivot)) * sine <= strength[i]) continue;
          s.broken[i] = true;
          s.count += 1;
          if (s.count === 1) {
            s.phase = "tearing";
            s.mainV -= 70;
          }
        }
        const spent = s.script > 0 && now - s.script >= 520;
        if (s.count === mids.length || turned >= FREE || spent) release(!s.held);
      } else if (s.phase === "intact") {
        s.vx += (-420 * (s.tx - n[0] * s.hover) - 20 * s.vx) * dt;
        s.vy += (-420 * (s.ty - n[1] * s.hover) - 20 * s.vy) * dt;
        s.tx += s.vx * dt;
        s.ty += s.vy * dt;
        s.rot += -s.rot * Math.min(1, dt * 18);
      } else if (s.phase === "tearing") {
        const hang = Math.min(opening(), 0.4 + (3.2 * s.count) / mids.length) * turn * s.dir;
        const ease = Math.min(1, dt * 10);
        s.rot += (hang - s.rot) * ease;
        s.tx += (n[0] * 0.5 - s.tx) * ease;
        s.ty += (n[1] * 0.5 - s.ty) * ease;
        s.vx = s.vy = 0;
      } else if (s.phase === "free") {
        if (s.held) {
          const [px, py] = pivotPoint();
          const a = (s.rot * Math.PI) / 180;
          const dx = s.grab[0] - px;
          const dy = s.grab[1] - py;
          const tx = s.grab[0] + s.pull[0] - (px + dx * Math.cos(a) - dy * Math.sin(a));
          const ty = s.grab[1] + s.pull[1] - (py + dx * Math.sin(a) + dy * Math.cos(a));
          s.vx += (-260 * (s.tx - tx) - 24 * s.vx) * dt;
          s.vy += (-260 * (s.ty - ty) - 24 * s.vy) * dt;
          s.vr += (-90 * (s.rot - clamp(s.vx * 0.02, -18, 18)) - 10 * s.vr) * dt;
        } else {
          s.fallT += dt;
          s.vy += 2400 * dt;
          s.vx *= Math.exp(-0.6 * dt);
          s.fade = clamp(1 - (s.fallT - 0.22) / 0.3, 0, 1);
        }
        s.tx += s.vx * dt;
        s.ty += s.vy * dt;
        s.rot += s.vr * dt;
      }
      s.mainV += (-520 * s.main - 18 * s.mainV) * dt;
      s.main += s.mainV * dt;
      paint();
      if (s.phase === "free" && !s.held && s.fade <= 0) {
        raf = 0;
        if (document.activeElement === stubEl) rootRef.current?.focus();
        setPhase("gone");
        return;
      }
      const still = Math.abs(s.vx) + Math.abs(s.vy) < 0.05 && Math.abs(s.main) + Math.abs(s.mainV) < 0.01;
      const resting =
        !pulling &&
        still &&
        (s.phase === "intact"
          ? Math.abs(s.tx - n[0] * s.hover) + Math.abs(s.ty - n[1] * s.hover) < 0.02 && Math.abs(s.rot) < 0.005
          : s.phase === "tearing" &&
            Math.abs(s.tx - n[0] * 0.5) + Math.abs(s.ty - n[1] * 0.5) < 0.02 &&
            Math.abs(opening() - Math.min(opening(), 0.4 + (3.2 * s.count) / mids.length)) < 0.01);
      if (resting) {
        s.main = s.mainV = 0;
        paint();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const tearNow = () => {
      if (s.phase === "free" || s.script) return;
      if (live.current.reduced) {
        s.phase = "free";
        stubEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out", fill: "forwards" });
        live.current.onTear?.();
        setInner("gone");
        window.setTimeout(() => {
          if (document.activeElement === stubEl) rootRef.current?.focus();
          setPhase("gone");
        }, 190);
        return;
      }
      s.held = false;
      s.lever = [28, -s.dir * reach];
      s.base = ungive(opening());
      s.script = performance.now();
      wake();
    };

    engine.current = {
      down: (ev) => {
        if (ev.button !== 0 || s.phase === "free" || s.script) return;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        s.held = true;
        s.id = ev.pointerId;
        s.start = [ev.clientX, ev.clientY];
        s.pull = [0, 0];
        press(toLocal(ev.clientX, ev.clientY));
        s.samples = [[performance.now(), ev.clientX, ev.clientY]];
        wake();
      },
      move: (ev) => {
        if (!s.held || ev.pointerId !== s.id) {
          if (ev.pointerType === "mouse" && s.phase === "intact" && !s.held && !live.current.reduced) {
            s.hover = 1.2;
            wake();
          }
          return;
        }
        s.pull = [ev.clientX - s.start[0], ev.clientY - s.start[1]];
        const t = performance.now();
        s.samples.push([t, ev.clientX, ev.clientY]);
        while (s.samples.length > 2 && t - s.samples[0][0] > 90) s.samples.shift();
        if (live.current.reduced) {
          if (s.phase !== "free" && s.pull[0] * n[0] + s.pull[1] * n[1] > TEAR_AT) tearNow();
          return;
        }
        wake();
      },
      up: (ev) => {
        if (!s.held || ev.pointerId !== s.id) return;
        s.held = false;
        if (s.phase === "free") {
          const t = performance.now();
          const [t0, x0, y0] = s.samples[0];
          const span = Math.max(16, t - t0);
          s.vx = clamp(((ev.clientX - x0) / span) * 1000, -1600, 1600);
          s.vy = clamp(((ev.clientY - y0) / span) * 1000, -1600, 600);
          s.vr = clamp(s.vx * 0.12, -300, 300) + 40 * s.dir;
        }
        wake();
      },
      script: tearNow,
      reset: () => {},
    };
    const leave = () => {
      s.hover = 0;
      wake();
    };
    stubEl.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      stubEl.removeEventListener("pointerleave", leave);
      engine.current = null;
    };
  }, [box, bridges, horizontal, phase]);

  const prevWant = useRef(wantTorn);
  useEffect(() => {
    const was = prevWant.current;
    prevWant.current = wantTorn;
    if (wantTorn && !was && phase === "intact") engine.current?.script();
    if (!wantTorn && was) setPhase("intact");
  }, [wantTorn, phase]);

  const stubGone = phase === "gone";
  const used = wantTorn;
  const shade =
    "drop-shadow(0 1px 1px var(--miyuki-ticket-stub-shade)) drop-shadow(0 8px 14px var(--miyuki-ticket-stub-shade))";

  return (
    <div
      role="group"
      {...props}
      ref={rootRef}
      tabIndex={-1}
      className={cn(
        "relative isolate flex w-[460px] max-w-full outline-none select-none",
        horizontal ? "flex-row" : "w-[300px] flex-col",
        "[--miyuki-ticket-stub-paper:color-mix(in_oklab,var(--card)_93%,var(--brand))] [--miyuki-ticket-stub-ink:var(--foreground)]",
        "dark:[--miyuki-ticket-stub-paper:color-mix(in_oklab,color-mix(in_oklab,var(--foreground)_91%,var(--background))_93%,var(--brand))] dark:[--miyuki-ticket-stub-ink:var(--primary-foreground)]",
        "[--miyuki-ticket-stub-print:var(--brand)] dark:[--miyuki-ticket-stub-print:color-mix(in_oklab,var(--brand)_62%,var(--background))]",
        "[--miyuki-ticket-stub-rim:oklch(0.42_0.09_250/0.22)] [--miyuki-ticket-stub-stamp:var(--destructive)] dark:[--miyuki-ticket-stub-stamp:color-mix(in_oklab,var(--destructive)_78%,var(--background))]",
        "[--miyuki-ticket-stub-shade:oklch(0.42_0.09_250/0.16)] dark:[--miyuki-ticket-stub-shade:oklch(0.05_0.02_250/0.6)]",
        className,
      )}
      style={{ filter: shade, ...style }}
    >
      <div ref={mainRef} className="relative min-w-0 flex-1">
        <div
          className={cn(
            "relative h-full bg-(--miyuki-ticket-stub-paper) text-(--miyuki-ticket-stub-ink)",
            horizontal ? "rounded-l-[10px] p-4 sm:p-5" : "rounded-t-[10px] p-4 sm:p-5",
          )}
          style={edgeMask(side, "main")}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-(--miyuki-ticket-stub-print) opacity-[0.12]"
            style={{ maskImage: GUILLOCHE, maskSize: "24px 7px" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.3] mix-blend-multiply dark:opacity-[0.22]"
            style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={rimShade(side, "main")} />
          <div className="relative">{children}</div>
          <span aria-live="polite" className="sr-only">
            {used ? usedLabel : null}
          </span>
          {used ? (
            <motion.div
              aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.35, rotate: -14 }}
              animate={{ opacity: 0.9, scale: 1, rotate: -9 }}
              transition={reduced ? { duration: 0.2 } : { type: "spring", stiffness: 520, damping: 26, delay: 0.08 }}
              className={cn(
                "pointer-events-none absolute grid place-items-center rounded-md border-[2.5px] border-(--miyuki-ticket-stub-stamp) px-2.5 py-0.5 text-xl font-semibold tracking-[-0.01em] text-(--miyuki-ticket-stub-stamp) mix-blend-multiply",
                horizontal ? "right-5 bottom-5" : "right-5 bottom-4",
              )}
              style={{ maskImage: INK, maskSize: "120px 60px" }}
            >
              {usedLabel}
            </motion.div>
          ) : null}
        </div>
      </div>
      {!stubGone ? (
        <div
          ref={stubRef}
          role="button"
          tabIndex={0}
          aria-label={tearLabel}
          aria-describedby={stubId}
          className={cn(
            "relative shrink-0 cursor-grab touch-none rounded-[10px] outline-none active:cursor-grabbing",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
            horizontal ? "w-20 rounded-l-none sm:w-24" : "h-20 rounded-t-none",
          )}
          onPointerDown={(e) => engine.current?.down(e)}
          onPointerMove={(e) => engine.current?.move(e)}
          onPointerUp={(e) => engine.current?.up(e)}
          onPointerCancel={(e) => engine.current?.up(e)}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            engine.current?.script();
          }}
        >
          <div
            id={stubId}
            className={cn(
              "relative grid h-full place-items-center bg-(--miyuki-ticket-stub-paper) p-3 text-(--miyuki-ticket-stub-ink)",
              horizontal ? "rounded-r-[10px]" : "rounded-b-[10px]",
            )}
            style={edgeMask(side, "stub")}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-(--miyuki-ticket-stub-print) opacity-[0.12]"
              style={{ maskImage: GUILLOCHE, maskSize: "24px 7px" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.3] mix-blend-multiply dark:opacity-[0.22]"
              style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={rimShade(side, "stub")} />
            <div className="relative">{stub}</div>
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className={cn("shrink-0", horizontal ? "w-20 sm:w-24" : "h-20")} />
      )}
      {box ? (
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible fill-(--miyuki-ticket-stub-paper)"
          width={box.w}
          height={box.h}
        >
          {bridges.map((br, i) => {
            const pts = (sign: number) =>
              [[0, br.a], ...br.tuft.map(([at, l]) => [sign * l, at]), [0, br.b]]
                .map(([o, at]) => (horizontal ? `${box.cut + o},${at}` : `${at},${box.cut + o}`))
                .join(" ");
            return (
              <g key={i}>
                <polygon data-tuft-main="" points={pts(1)} visibility={stubGone ? "visible" : "hidden"} />
                <polygon data-bridge="" visibility="hidden" />
              </g>
            );
          })}
          {!stubGone ? (
            <g data-stub-group="">
              {bridges.map((br, i) => (
                <polygon
                  key={i}
                  data-tuft-stub=""
                  visibility="hidden"
                  points={[[0, br.a], ...br.tuft.map(([at, l]) => [-l, at]), [0, br.b]]
                    .map(([o, at]) => (horizontal ? `${box.cut + o},${at}` : `${at},${box.cut + o}`))
                    .join(" ")}
                />
              ))}
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
