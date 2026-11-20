"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface SnowGlobeProps extends Omit<ComponentProps<"div">, "children"> {
  children?: ReactNode;
  flakes?: number;
  size?: number;
  shakeLabel?: string;
}

const FLOOR = 0.79;
const LIP = 0.035;
const BINS = 44;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Flake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  sink: number;
  glint: boolean;
  spin: number;
  rest: number;
  lift: number;
}

export function SnowGlobe({
  children,
  flakes = 220,
  size = 260,
  shakeLabel = "Shake",
  className,
  style,
  ...props
}: SnowGlobeProps) {
  const reduced = useReducedMotion() ?? false;
  const rigRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const engine = useRef<{ shake: () => void } | null>(null);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  });

  useEffect(() => {
    const rig = rigRef.current;
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const shadow = shadowRef.current;
    const ctx = canvas?.getContext("2d");
    if (!rig || !scene || !canvas || !shadow || !ctx) return;

    const S = size;
    const R = S / 2;
    const RI = R - 3;
    const floorY = S * FLOOR;
    const half = Math.sqrt(Math.max(0, RI * RI - (floorY - R) ** 2));
    const left = R - half;
    const binW = (half * 2) / BINS;
    const floorAt = (x: number) => {
      const u = clamp((x - R) / half, -1, 1);
      return floorY + S * LIP * (1 - u * u);
    };

    const rng = createRng(`snow-globe-${flakes}-${S}`);
    const pile = new Float32Array(BINS);
    const list: Flake[] = [];
    for (let i = 0; i < flakes; i++) {
      const glint = rng() < 0.12;
      const r = glint ? rng.range(0.7, 1.1) : rng.range(0.8, 2.1);
      list.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r,
        sink: glint ? rng.range(34, 46) : 11 + r * 6 + rng.range(-2, 3),
        glint,
        spin: rng() * 6.28,
        rest: -1,
        lift: rng.range(24, 70),
      });
    }
    const settle = (f: Flake, x: number) => {
      let b = clamp(Math.floor((x - left) / binW), 0, BINS - 1);
      for (let k = 0; k < 10; k++) {
        let low = b;
        for (let j = Math.max(0, b - 3); j <= Math.min(BINS - 1, b + 3); j++) {
          if (pile[j] + Math.abs(j - b) * 0.18 < pile[low] + Math.abs(low - b) * 0.18) low = j;
        }
        if (low === b || pile[low] > pile[b] - 0.3) break;
        b = low;
      }
      f.rest = b;
      f.x = left + (b + 0.2 + 0.6 * ((f.spin * 7.3) % 1)) * binW;
      f.y = floorAt(f.x) - pile[b] - f.r * 0.4;
      pile[b] += f.r * 0.62;
      f.vx = f.vy = 0;
    };
    const order = rng.shuffle(list.map((_, i) => i));
    for (const i of order) settle(list[i], left + rng() * half * 2);

    let colors = {
      flake: "rgb(250 252 255)",
      shade: "rgba(40 60 100 / 0.32)",
      glint: "rgb(255 255 255)",
      pileTop: "rgb(252 253 255)",
      pileLow: "rgb(214 226 240)",
    };
    const readColors = () => {
      const [r, g, b] = toRgba("var(--brand)", canvas);
      const dark = document.documentElement.classList.contains("dark") || !!canvas.closest(".dark");
      colors = {
        flake: "rgb(250 252 255)",
        shade: dark ? "rgba(4 10 24 / 0.45)" : "rgba(40 60 100 / 0.3)",
        glint: `rgb(${Math.round(200 + r * 55)} ${Math.round(220 + g * 35)} ${Math.round(235 + b * 20)})`,
        pileTop: dark ? "rgb(226 234 246)" : "rgb(252 253 255)",
        pileLow: dark ? "rgb(150 168 196)" : "rgb(205 219 236)",
      };
    };

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(S * dpr);
      canvas.height = Math.round(S * dpr);
    };

    const fluid = { w: 0, t: 0, swirlSign: 1, e: 0, kick: 0 };
    const g = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rot: 0, held: false, sx: 0, svx: 0, ax: 0, ay: 0 };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      ctx.beginPath();
      ctx.moveTo(left - 2, floorAt(left) + 6);
      let px = left;
      let py = floorAt(left) - pile[0] * 0.5;
      ctx.lineTo(px, py);
      for (let b = 0; b < BINS; b++) {
        const x = left + (b + 0.5) * binW;
        const h = (pile[Math.max(0, b - 1)] + 2 * pile[b] + pile[Math.min(BINS - 1, b + 1)]) / 4;
        const y = floorAt(x) - h - 0.5;
        ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        px = x;
        py = y;
      }
      ctx.quadraticCurveTo(px, py, left + half * 2, floorAt(left + half * 2) - pile[BINS - 1] * 0.5);
      ctx.lineTo(left + half * 2 + 2, floorAt(left + half * 2) + 6);
      ctx.lineTo(R, S);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, floorY - 8, 0, floorY + S * LIP + 4);
      grad.addColorStop(0, colors.pileTop);
      grad.addColorStop(1, colors.pileLow);
      ctx.fillStyle = grad;
      ctx.fill();
      for (const f of list) {
        if (f.glint) {
          const a = Math.abs(Math.cos(f.spin));
          ctx.globalAlpha = 0.25 + 0.75 * a ** 6;
          ctx.fillStyle = colors.glint;
          const s = f.r * (0.8 + 1.4 * a ** 6);
          ctx.fillRect(f.x - s, f.y - s * 0.35, s * 2, s * 0.7);
          ctx.fillRect(f.x - s * 0.35, f.y - s, s * 0.7, s * 2);
          continue;
        }
        ctx.globalAlpha = f.rest >= 0 ? 0.55 : 1;
        if (f.rest < 0) {
          ctx.fillStyle = colors.shade;
          ctx.beginPath();
          ctx.arc(f.x + 0.35, f.y + 0.6, f.r + 0.5, 0, 6.2832);
          ctx.fill();
        }
        ctx.fillStyle = colors.flake;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const K1 = (Math.PI * 2) / (S * 0.62);
    const K2 = (Math.PI * 2) / (S * 0.37);
    const psi = (x: number, y: number) => {
      const dx = x - R;
      const dy = y - R;
      const q = 1 - (dx * dx + dy * dy) / (RI * RI);
      if (q <= 0) return 0;
      const b = q * q;
      const t = fluid.t;
      const n =
        Math.sin(dx * K1 + t * 0.9) * Math.cos(dy * K1 * 0.9 - t * 0.7) +
        0.55 * Math.sin(dx * K2 * 0.8 - t * 1.3 + 1.7) * Math.sin(dy * K2 + t * 1.1) +
        0.35 * Math.cos((dx + dy) * K2 * 0.7 + t * 1.9);
      return b * (fluid.e * S * 34 * n + fluid.w * RI * RI * 0.5);
    };
    const flowAt = (x: number, y: number, out: [number, number]) => {
      const h = 1.5;
      out[0] = (psi(x, y + h) - psi(x, y - h)) / (2 * h);
      out[1] = -(psi(x + h, y) - psi(x - h, y)) / (2 * h);
    };

    const tmp: [number, number] = [0, 0];
    const step = (dt: number) => {
      fluid.t += dt;
      const pvx = g.vx;
      const pvy = g.vy;
      if (g.held) {
        g.vx += (-1100 * (g.x - g.tx) - 60 * g.vx) * dt;
        g.vy += (-1100 * (g.y - g.ty) - 60 * g.vy) * dt;
      } else {
        g.vx += (-260 * g.x - 15 * g.vx) * dt;
        g.vy += (-260 * g.y - 15 * g.vy) * dt;
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const ax = (g.vx - pvx) / dt;
      const ay = (g.vy - pvy) / dt;
      const acc = Math.hypot(ax, ay);
      g.ax = ax;
      g.ay = ay;
      fluid.kick = acc;
      const turn = (pvx * ay - pvy * ax) / (Math.hypot(pvx, pvy) * R + 1e3);
      fluid.w += turn * 0.35 * dt + (acc / R) * 0.0009 * fluid.swirlSign * dt * 60;
      fluid.w = clamp(fluid.w * Math.exp(-0.3 * dt), -1.6, 1.6);
      fluid.e = clamp(fluid.e * Math.exp(-0.42 * dt) + Math.max(0, acc - 600) * 0.0005 * dt, 0, 1);
      g.svx += (-180 * (g.sx + g.vx * 0.012) - 16 * g.svx) * dt;
      g.sx += g.svx * dt;
      g.rot += (clamp(g.vx * 0.018, -9, 9) - g.rot) * Math.min(1, dt * 10);

      for (const f of list) {
        f.spin += dt * (f.glint ? 5 + Math.abs(f.vx) * 0.05 : 0);
        if (f.rest >= 0) {
          flowAt(f.x, f.y, tmp);
          const sp = Math.hypot(tmp[0], tmp[1]);
          const jolt = fluid.kick > 2200 && Math.random() < dt * (fluid.kick / 700);
          if (sp > f.lift * 1.6 || jolt) {
            pile[f.rest] = Math.max(0, pile[f.rest] - f.r * 0.62);
            f.rest = -1;
            const p = Math.min(1.15, Math.max(fluid.kick / 6500, sp / 160));
            f.vx = tmp[0] * 0.7 + (Math.random() - 0.5) * 300 * p;
            f.vy = -(120 + Math.random() * 520) * p;
          }
          continue;
        }
        flowAt(f.x, f.y, tmp);
        const k = Math.min(1, (f.glint ? 2.6 : 3.6) * dt);
        f.vx += (tmp[0] - f.vx) * k;
        f.vy += (tmp[1] + f.sink - f.vy) * k;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const dx = f.x - R;
        const dy = f.y - R;
        const d = Math.hypot(dx, dy);
        const lim = RI - f.r - 1;
        if (d > lim) {
          const nx = dx / d;
          const ny = dy / d;
          f.x = R + nx * lim;
          f.y = R + ny * lim;
          const vn = f.vx * nx + f.vy * ny;
          if (vn > 0) {
            f.vx = (f.vx - vn * nx) * 0.85 - nx * 6;
            f.vy = (f.vy - vn * ny) * 0.85 - ny * 6;
          }
        }
        if (f.x > left && f.x < left + half * 2) {
          const b = clamp(Math.floor((f.x - left) / binW), 0, BINS - 1);
          const top = floorAt(f.x) - pile[b];
          if (f.y > top - f.r * 0.4) {
            if (Math.hypot(tmp[0], tmp[1]) < f.lift && f.vy > -4 && fluid.kick < 2200) settle(f, f.x);
            else {
              f.y = top - f.r * 0.4;
              f.vy = -Math.abs(f.vy) * 0.4;
            }
          }
        } else if (f.y > floorAt(f.x)) {
          f.x += (R - f.x) * 0.1;
          f.y = floorAt(f.x) - 1;
        }
      }
    };

    const place = () => {
      rig.style.transform = `translate3d(${g.x.toFixed(2)}px, ${g.y.toFixed(2)}px, 0) rotate(${g.rot.toFixed(3)}deg)`;
      scene.style.transform = `translate3d(${g.sx.toFixed(2)}px, ${(Math.abs(g.sx) * 0.15).toFixed(2)}px, 0)`;
      const lift = clamp(-g.y / 40, 0, 1);
      shadow.style.transform = `translate3d(${(g.x * 0.85).toFixed(2)}px, 0, 0) scale(${(1 - lift * 0.25).toFixed(3)})`;
      shadow.style.opacity = (1 - lift * 0.55).toFixed(3);
    };

    let raf = 0;
    let last = 0;
    let visible = true;
    let shakeUntil = 0;
    let shakeStart = 0;
    const busy = () =>
      g.held ||
      shakeUntil > 0 ||
      Math.abs(g.x) + Math.abs(g.y) + Math.abs(g.vx) + Math.abs(g.vy) + Math.abs(g.sx) + Math.abs(g.svx) > 0.05 ||
      list.some((f) => f.rest < 0);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
      last = now;
      if (shakeUntil) {
        const t = (now - shakeStart) / 1000;
        if (now > shakeUntil) {
          shakeUntil = 0;
          g.held = false;
        } else {
          const env = Math.sin(Math.min(1, t / 0.75) * Math.PI);
          g.tx = Math.sin(t * Math.PI * 2 * 3.1) * 24 * env;
          g.ty = Math.sin(t * Math.PI * 2 * 1.55 + 0.6) * 10 * env - 10 * env;
        }
      }
      const n = 3;
      for (let i = 0; i < n; i++) step(dt / n);
      place();
      draw();
      if (busy()) raf = requestAnimationFrame(frame);
      else {
        g.x = g.y = g.vx = g.vy = g.sx = g.svx = g.rot = 0;
        fluid.w = fluid.e = 0;
        place();
        last = 0;
      }
    };
    const wake = () => {
      if (!raf && visible && !reducedRef.current) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const stillFlurry = () => {
      const r2 = createRng("snow-globe-still");
      for (const f of list) {
        if (f.rest >= 0) pile[f.rest] = Math.max(0, pile[f.rest] - f.r * 0.62);
        f.rest = -1;
        const a = r2() * Math.PI * 2;
        const d = Math.sqrt(r2()) * (RI - 8);
        f.x = R + Math.cos(a) * d;
        f.y = Math.min(floorY - 6, R + Math.sin(a) * d);
      }
      draw();
      window.setTimeout(() => {
        for (const f of list) if (f.rest < 0) settle(f, f.x);
        canvas.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 220 });
        draw();
      }, 2600);
    };

    const shake = () => {
      if (reducedRef.current) {
        stillFlurry();
        return;
      }
      fluid.swirlSign = Math.random() < 0.5 ? -1 : 1;
      g.held = true;
      shakeStart = performance.now();
      shakeUntil = shakeStart + 760;
      wake();
    };
    engine.current = { shake };

    let drag: { id: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      if (reducedRef.current) return;
      rig.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      fluid.swirlSign = Math.random() < 0.5 ? -1 : 1;
      g.held = true;
      g.tx = g.x;
      g.ty = g.y;
      rig.toggleAttribute("data-held", true);
      wake();
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const soft = (v: number, m: number) => m * Math.tanh(v / m);
      g.tx = soft(e.clientX - drag.x, 70);
      g.ty = soft(e.clientY - drag.y, 46);
      wake();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      g.held = false;
      rig.toggleAttribute("data-held", false);
      wake();
    };

    resize();
    readColors();
    draw();
    rig.addEventListener("pointerdown", down);
    rig.addEventListener("pointermove", move);
    rig.addEventListener("pointerup", up);
    rig.addEventListener("pointercancel", up);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting) && !document.hidden;
      if (visible && busy()) wake();
    });
    io.observe(rig);
    const onVis = () => {
      visible = !document.hidden;
      if (visible && busy()) wake();
    };
    document.addEventListener("visibilitychange", onVis);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    const mq = window.matchMedia("(resolution: 2dppx)");
    const onDpr = () => {
      resize();
      draw();
    };
    mq.addEventListener("change", onDpr);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      offTheme();
      mq.removeEventListener("change", onDpr);
      rig.removeEventListener("pointerdown", down);
      rig.removeEventListener("pointermove", move);
      rig.removeEventListener("pointerup", up);
      rig.removeEventListener("pointercancel", up);
      engine.current = null;
    };
  }, [flakes, size]);

  const S = size;
  const vars = {
    "--miyuki-snow-globe-size": `${S}px`,
  } as CSSProperties;

  return (
    <div
      role="group"
      aria-roledescription="snow globe"
      {...props}
      className={cn(
        "relative isolate flex flex-col items-center select-none",
        "[--miyuki-snow-globe-lacquer:color-mix(in_oklab,var(--foreground)_90%,var(--brand))] [--miyuki-snow-globe-lacquer-lit:color-mix(in_oklab,var(--foreground)_58%,var(--brand))]",
        "dark:[--miyuki-snow-globe-lacquer:color-mix(in_oklab,var(--background)_70%,var(--brand)_6%)] dark:[--miyuki-snow-globe-lacquer-lit:color-mix(in_oklab,var(--foreground)_30%,var(--background))]",
        "[--miyuki-snow-globe-shade:oklch(0.42_0.09_250/0.3)] dark:[--miyuki-snow-globe-shade:oklch(0.02_0.02_250/0.75)] ink:[--miyuki-snow-globe-shade:oklch(0.02_0_0/0.75)]",
        className,
      )}
      style={{ ...vars, width: S, ...style }}
    >
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-[6%] h-[9%] w-[88%] rounded-[50%] bg-(--miyuki-snow-globe-shade) blur-[10px]"
        style={{ top: S * 1.08 }}
      />
      <div
        ref={rigRef}
        className="relative cursor-grab touch-none data-[held]:cursor-grabbing [&_img]:pointer-events-none"
        onDragStart={(e) => e.preventDefault()}
        style={{ width: S, height: S * 1.16, transformOrigin: "50% 100%" }}
      >
        <div className="absolute top-0 left-0 isolate overflow-clip rounded-full" style={{ width: S, height: S }}>
          <div ref={sceneRef} className="absolute -inset-[3%]">
            {children}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-brand/[0.06]" />
          <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: [
                "radial-gradient(ellipse 30% 20% at 30% 20%, oklch(1 0 0 / 0.55), oklch(1 0 0 / 0.12) 55%, transparent 72%)",
                "radial-gradient(ellipse 7% 4.5% at 26% 17%, oklch(1 0 0 / 0.85), transparent 80%)",
                "radial-gradient(circle at 50% 50%, transparent 60%, oklch(0.55 0.08 240 / 0.14) 69%, oklch(1 0 0 / 0.28) 70.3%, transparent 70.8%)",
                "radial-gradient(circle at 64% 70%, transparent 60%, oklch(1 0 0 / 0.32) 67%, transparent 70%)",
              ].join(", "),
              boxShadow:
                "inset 0 0 0 1px oklch(1 0 0 / 0.38), inset 0 -22px 36px -12px oklch(0.3 0.06 250 / 0.28), inset 10px 14px 34px -14px oklch(1 0 0 / 0.5)",
            }}
          />
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 100 40"
          className="pointer-events-none absolute left-0 overflow-visible"
          style={{ width: S, height: S * 0.4, top: S * 0.76 }}
        >
          <defs>
            <linearGradient id="miyuki-snow-globe-body" x1="0" x2="1">
              <stop offset="0" style={{ stopColor: "var(--miyuki-snow-globe-lacquer)" }} />
              <stop offset="0.3" style={{ stopColor: "var(--miyuki-snow-globe-lacquer-lit)" }} />
              <stop offset="0.48" style={{ stopColor: "var(--miyuki-snow-globe-lacquer)" }} />
              <stop offset="1" style={{ stopColor: "var(--miyuki-snow-globe-lacquer)" }} />
            </linearGradient>
            <linearGradient id="miyuki-snow-globe-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0.32" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 5 7.5 Q 50 15.5 95 7.5 L 99 33 Q 50 41 1 33 Z" fill="url(#miyuki-snow-globe-body)" />
          <path d="M 5 7.5 Q 50 15.5 95 7.5 L 95.6 11 Q 50 19 4.4 11 Z" fill="url(#miyuki-snow-globe-shine)" />
          <path d="M 5 7.5 Q 50 15.5 95 7.5" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.45" />
          <path d="M 1 33 Q 50 41 99 33" fill="none" stroke="black" strokeOpacity="0.25" strokeWidth="0.6" />
        </svg>
        <button
          type="button"
          onClick={() => engine.current?.shake()}
          className={cn(
            "absolute left-1/2 h-6 -translate-x-1/2 cursor-default rounded-[5px] px-3 text-xs font-medium outline-none",
            "bg-[color-mix(in_oklab,var(--warning)_62%,var(--card))] text-warning-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.5),0_1px_2px_oklch(0.1_0.03_250/0.45)] ink:shadow-[inset_0_1px_0_oklch(1_0_0/0.5),0_1px_2px_oklch(0.1_0_0/0.45)]",
            "transition-[transform,filter] duration-150 ease-settle hover:brightness-105 active:scale-[0.97]",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
          )}
          style={{ top: S * 0.98 }}
        >
          {shakeLabel}
        </button>
      </div>
    </div>
  );
}
