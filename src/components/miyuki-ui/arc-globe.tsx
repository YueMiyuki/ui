"use client";

import { type GeoPermissibleObjects, geoEquirectangular, geoPath } from "d3-geo";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface ArcGlobeArc {
  from: [lat: number, lng: number];
  to: [lat: number, lng: number];
  color?: string;
}

export interface ArcGlobeProps extends ComponentProps<"div"> {
  arcs?: ArcGlobeArc[];
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  initialRotation?: [lng: number, lat: number];
  dotColor?: string;
  arcColors?: string[];
  showAtmosphere?: boolean;
  density?: number;
}

const DEFAULT_ARC_COLORS = ["var(--brand)", "var(--chart-2)", "var(--chart-3)"];
const NIGHT = "--miyuki-arc-globe-night";
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const BUCKETS = 8;
const SAMPLES = 72;
const TAIL = 0.28;
const RING = 1.3;
const TILT = 60;
const MASK_W = 1440;
const MASK_H = 720;

type Topology = Parameters<typeof feature>[0];
let landCache: GeoPermissibleObjects | null = null;
let maskCache: Uint8Array | null = null;
const latticeCache = new Map<number, Float32Array>();

function landMask() {
  if (maskCache) return maskCache;
  const topo = landTopology as unknown as Topology;
  landCache ??= feature(topo, topo.objects.land) as GeoPermissibleObjects;
  const canvas = document.createElement("canvas");
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const mask = new Uint8Array(MASK_W * MASK_H);
  if (!ctx) return mask;
  const projection = geoEquirectangular()
    .scale(MASK_W / (2 * Math.PI))
    .translate([MASK_W / 2, MASK_H / 2])
    .precision(0.1);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  geoPath(projection, ctx)(landCache);
  ctx.fill();
  const data = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  maskCache = mask;
  return mask;
}

function lattice(density: number) {
  const hit = latticeCache.get(density);
  if (hit) return hit;
  const mask = landMask();
  const step = 1 / density;
  const out: number[] = [];
  let row = 0;
  for (let lat = -90 + step / 2; lat < 90; lat += step, row++) {
    const cosLat = Math.cos(lat * RAD);
    const sinLat = Math.sin(lat * RAD);
    const n = Math.max(1, Math.round(360 * density * cosLat));
    const my = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)));
    for (let k = 0; k < n; k++) {
      const lng = -180 + ((k + 0.5 + (row % 2) * 0.5) / n) * 360;
      const mx = ((Math.floor(((lng + 180) / 360) * MASK_W) % MASK_W) + MASK_W) % MASK_W;
      if (!mask[my * MASK_W + mx]) continue;
      out.push(cosLat * Math.cos(lng * RAD), cosLat * Math.sin(lng * RAD), sinLat);
    }
  }
  const points = new Float32Array(out);
  latticeCache.set(density, points);
  return points;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

function unit(lat: number, lng: number): [number, number, number] {
  const c = Math.cos(lat * RAD);
  return [c * Math.cos(lng * RAD), c * Math.sin(lng * RAD), Math.sin(lat * RAD)];
}

interface Flight {
  path: Float32Array;
  ring: Float32Array;
  from: [number, number, number];
  to: [number, number, number];
  tint: number;
  travel: number;
  period: number;
  offset: number;
}

function plan(arcs: ArcGlobeArc[], tints: string[]): { flights: Flight[]; colors: string[] } {
  const rng = createRng(`arc-globe:${arcs.length}`);
  const colors: string[] = [];
  const flights: Flight[] = [];
  arcs.forEach((arc, i) => {
    const a = unit(arc.from[0], arc.from[1]);
    const b = unit(arc.to[0], arc.to[1]);
    const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    const omega = Math.acos(dot);
    if (omega < 1e-3 || Math.PI - omega < 1e-3) return;
    const lift = Math.min(0.3, 0.05 + 0.34 * (omega / Math.PI));
    const path = new Float32Array(SAMPLES * 3);
    const s = Math.sin(omega);
    for (let k = 0; k < SAMPLES; k++) {
      const t = k / (SAMPLES - 1);
      const wa = Math.sin((1 - t) * omega) / s;
      const wb = Math.sin(t * omega) / s;
      const r = 1 + lift * Math.sin(Math.PI * t);
      path[k * 3] = (wa * a[0] + wb * b[0]) * r;
      path[k * 3 + 1] = (wa * a[1] + wb * b[1]) * r;
      path[k * 3 + 2] = (wa * a[2] + wb * b[2]) * r;
    }
    const pole: [number, number, number] = Math.abs(b[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
    let ux = b[1] * pole[2] - b[2] * pole[1];
    let uy = b[2] * pole[0] - b[0] * pole[2];
    let uz = b[0] * pole[1] - b[1] * pole[0];
    const ul = Math.hypot(ux, uy, uz);
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const ring = new Float32Array([
      b[0],
      b[1],
      b[2],
      ux,
      uy,
      uz,
      b[1] * uz - b[2] * uy,
      b[2] * ux - b[0] * uz,
      b[0] * uy - b[1] * ux,
    ]);
    const color = arc.color ?? tints[i % tints.length];
    let tint = colors.indexOf(color);
    if (tint < 0) tint = colors.push(color) - 1;
    const travel = 1.1 + 1.9 * (omega / Math.PI);
    flights.push({
      path,
      ring,
      from: a,
      to: b,
      tint,
      travel,
      period: travel * (1 + TAIL) + RING * 0.6 + rng.range(0.4, 2.2),
      offset: rng.range(0, 6),
    });
  });
  return { flights, colors };
}

export function ArcGlobe({
  arcs: arcsProp = [],
  autoRotate = true,
  autoRotateSpeed = 0.4,
  initialRotation = [130, 22],
  dotColor = "var(--foreground)",
  arcColors = DEFAULT_ARC_COLORS,
  showAtmosphere = true,
  density = 0.8,
  className,
  children,
  ...props
}: ArcGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const tints = arcColors.length > 0 ? arcColors : DEFAULT_ARC_COLORS;
  const tintKey = tints.join("|");
  const arcKey = JSON.stringify(arcsProp);
  const [startLng, startLat] = initialRotation;

  useEffect(() => {
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !handle || !ctx) return;

    const still = !!reduce;
    const points = lattice(clamp(density, 0.2, 2));
    const count = points.length / 3;
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const bucket = new Uint8Array(count);
    const { flights, colors: flightColors } = plan(JSON.parse(arcKey) as ArcGlobeArc[], tintKey.split("|"));
    const cities: [number, number, number, number][] = [];
    for (const f of flights) {
      for (const p of [f.from, f.to]) {
        if (!cities.some((c) => Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) + Math.abs(c[2] - p[2]) < 1e-4)) {
          cities.push([p[0], p[1], p[2], f.tint]);
        }
      }
    }
    const body = document.createElement("canvas");
    const bctx = body.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let R = 1;
    let night = false;
    let dotFills: string[] = [];
    let dotRadii = new Float32Array(BUCKETS);
    let tracks: string[] = [];
    let beams: string[] = [];
    let beamsClear: string[] = [];
    let heads: string[] = [];
    let cityFill = "";

    let viewLng = startLng;
    let viewLat = clamp(startLat, -TILT, TILT);
    let vLng = 0;
    let vLat = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    let cosV = 1;
    let sinV = 0;
    let cosP = 1;
    let sinP = 0;
    let px = 0;
    let py = 0;
    let pz = 0;
    const project = (x: number, y: number, z: number) => {
      const a = y * cosV - x * sinV;
      const c = x * cosV + y * sinV;
      const b = z * cosP - c * sinP;
      pz = z * sinP + c * cosP;
      px = a;
      py = b;
      return pz > 0 || a * a + b * b > 1;
    };

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      dotFills = [];
      dotRadii = new Float32Array(BUCKETS);
      const base = density >= 1 ? 0.95 : 1.15;
      for (let k = 0; k < BUCKETS; k++) {
        const z = (k + 0.5) / BUCKETS;
        const fade = smooth(0.02, 0.62, z);
        dotFills.push(rgba(dotColor, (night ? 0.78 : 0.62) * fade, canvas));
        dotRadii[k] = base * (0.6 + 0.4 * Math.sqrt(z)) * (0.8 / Math.max(0.5, density)) ** 0.5;
      }
      const ink = (c: string) => (night ? c : `color-mix(in oklab, ${c} 82%, var(--foreground))`);
      tracks = flightColors.map((c) => rgba(ink(c), night ? 0.32 : 0.42, canvas));
      beams = flightColors.map((c) => rgba(night ? `color-mix(in oklab, ${c} 75%, white)` : ink(c), 1, canvas));
      beamsClear = flightColors.map((c) => rgba(night ? `color-mix(in oklab, ${c} 75%, white)` : ink(c), 0, canvas));
      heads = flightColors.map((c) => rgba(night ? `color-mix(in oklab, ${c} 35%, white)` : ink(c), 1, canvas));
      cityFill = rgba(night ? "var(--foreground)" : "var(--background)", 1, canvas);
      paintBody();
    };

    const paintBody = () => {
      if (!bctx || w === 0) return;
      body.width = canvas.width;
      body.height = canvas.height;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, h);
      if (showAtmosphere) {
        const halo = bctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.2);
        const tone = night ? "var(--brand)" : "color-mix(in oklab, var(--brand) 70%, var(--background))";
        halo.addColorStop(0, rgba(tone, night ? 0.34 : 0.3, canvas));
        halo.addColorStop(0.28, rgba(tone, night ? 0.13 : 0.11, canvas));
        halo.addColorStop(1, rgba(tone, 0, canvas));
        bctx.fillStyle = halo;
        bctx.fillRect(cx - R * 1.25, cy - R * 1.25, R * 2.5, R * 2.5);
      }
      const lx = cx - R * 0.38;
      const ly = cy - R * 0.42;
      const sphere = bctx.createRadialGradient(lx, ly, 0, lx, ly, R * 1.5);
      if (night) {
        sphere.addColorStop(0, rgba("color-mix(in oklab, var(--brand) 22%, var(--background))", 1, canvas));
        sphere.addColorStop(0.55, rgba("color-mix(in oklab, var(--brand) 9%, var(--background))", 1, canvas));
        sphere.addColorStop(1, rgba("color-mix(in oklab, var(--background) 82%, black)", 1, canvas));
      } else {
        sphere.addColorStop(0, rgba("color-mix(in oklab, var(--brand-soft) 35%, white)", 1, canvas));
        sphere.addColorStop(0.5, rgba("var(--brand-soft)", 1, canvas));
        sphere.addColorStop(1, rgba("color-mix(in oklab, var(--brand-soft) 72%, var(--brand))", 1, canvas));
      }
      bctx.fillStyle = sphere;
      bctx.beginPath();
      bctx.arc(cx, cy, R, 0, Math.PI * 2);
      bctx.fill();
      const rim = bctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
      rim.addColorStop(0, rgba("var(--brand)", 0, canvas));
      rim.addColorStop(
        1,
        rgba(night ? "var(--brand)" : "color-mix(in oklab, var(--brand) 60%, white)", night ? 0.24 : 0.28, canvas),
      );
      bctx.fillStyle = rim;
      bctx.beginPath();
      bctx.arc(cx, cy, R, 0, Math.PI * 2);
      bctx.fill();
    };

    const paint = () => {
      cosV = Math.cos(viewLng * RAD);
      sinV = Math.sin(viewLng * RAD);
      cosP = Math.cos(viewLat * RAD);
      sinP = Math.sin(viewLat * RAD);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(body, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (let i = 0; i < count; i++) {
        const x = points[i * 3];
        const y = points[i * 3 + 1];
        const z = points[i * 3 + 2];
        const a = y * cosV - x * sinV;
        const c = x * cosV + y * sinV;
        const depth = z * sinP + c * cosP;
        if (depth <= 0.015) {
          bucket[i] = 255;
          continue;
        }
        sx[i] = cx + a * R;
        sy[i] = cy - (z * cosP - c * sinP) * R;
        bucket[i] = Math.min(BUCKETS - 1, (depth * BUCKETS) | 0);
      }
      for (let k = 0; k < BUCKETS; k++) {
        const r = dotRadii[k];
        ctx.fillStyle = dotFills[k];
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (bucket[i] !== k) continue;
          ctx.moveTo(sx[i] + r, sy[i]);
          ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (night) ctx.globalCompositeOperation = "lighter";

      for (const f of flights) {
        ctx.strokeStyle = tracks[f.tint];
        ctx.lineWidth = night ? 1 : 1.15;
        ctx.beginPath();
        let open = false;
        for (let k = 0; k < SAMPLES; k++) {
          if (!project(f.path[k * 3], f.path[k * 3 + 1], f.path[k * 3 + 2])) {
            open = false;
            continue;
          }
          const x = cx + px * R;
          const y = cy - py * R;
          if (open) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          open = true;
        }
        ctx.stroke();
      }

      if (!still) {
        for (const f of flights) {
          const local = (time + f.offset) % f.period;
          const u = local / f.travel;
          if (u <= 0 || u >= 1 + TAIL) continue;
          const head = Math.min(1, u);
          const tail = Math.max(0, u - TAIL);
          const k0 = tail * (SAMPLES - 1);
          const k1 = head * (SAMPLES - 1);
          let hx = 0;
          let hy = 0;
          let tx = 0;
          let ty = 0;
          let have = false;
          let headVisible = false;
          ctx.beginPath();
          let open = false;
          const steps = Math.max(2, Math.ceil(k1 - k0) + 1);
          for (let s = 0; s <= steps; s++) {
            const kk = k0 + ((k1 - k0) * s) / steps;
            const i0 = Math.min(SAMPLES - 2, Math.floor(kk));
            const fr = kk - i0;
            const x3 = f.path[i0 * 3] + (f.path[i0 * 3 + 3] - f.path[i0 * 3]) * fr;
            const y3 = f.path[i0 * 3 + 1] + (f.path[i0 * 3 + 4] - f.path[i0 * 3 + 1]) * fr;
            const z3 = f.path[i0 * 3 + 2] + (f.path[i0 * 3 + 5] - f.path[i0 * 3 + 2]) * fr;
            const visible = project(x3, y3, z3);
            if (s === steps) headVisible = visible;
            if (!visible) {
              open = false;
              continue;
            }
            const x = cx + px * R;
            const y = cy - py * R;
            if (!have) {
              tx = x;
              ty = y;
              have = true;
            }
            hx = x;
            hy = y;
            if (open) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
            open = true;
          }
          if (!have) continue;
          const fadeOut = u > 1 ? 1 - (u - 1) / TAIL : 1;
          const gradient = ctx.createLinearGradient(tx, ty, hx, hy);
          gradient.addColorStop(0, beamsClear[f.tint]);
          gradient.addColorStop(1, beams[f.tint]);
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = fadeOut;
          if (night) {
            ctx.lineWidth = 5;
            ctx.globalAlpha = fadeOut * 0.3;
            ctx.stroke();
            ctx.globalAlpha = fadeOut;
          }
          ctx.lineWidth = night ? 1.8 : 2.2;
          ctx.stroke();
          if (u < 1 && headVisible) {
            ctx.fillStyle = heads[f.tint];
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(hx, hy, 1.9, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          const age = local - f.travel;
          if (age > 0 && age < RING) {
            const t = age / RING;
            const rho = (0.6 + 5.4 * (1 - (1 - t) ** 3)) * RAD;
            const cr = Math.cos(rho);
            const sr = Math.sin(rho);
            const g = f.ring;
            ctx.strokeStyle = beams[f.tint];
            ctx.lineWidth = 1.3;
            ctx.globalAlpha = (1 - t) ** 1.5 * 0.9;
            ctx.beginPath();
            let ringOpen = false;
            for (let s = 0; s <= 40; s++) {
              const th = (s / 40) * Math.PI * 2;
              const ct = Math.cos(th) * sr;
              const st = Math.sin(th) * sr;
              const x3 = g[0] * cr + g[3] * ct + g[6] * st;
              const y3 = g[1] * cr + g[4] * ct + g[7] * st;
              const z3 = g[2] * cr + g[5] * ct + g[8] * st;
              project(x3, y3, z3);
              if (pz <= 0) {
                ringOpen = false;
                continue;
              }
              const x = cx + px * R;
              const y = cy - py * R;
              if (ringOpen) ctx.lineTo(x, y);
              else ctx.moveTo(x, y);
              ringOpen = true;
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      ctx.globalCompositeOperation = "source-over";
      for (const c of cities) {
        project(c[0], c[1], c[2]);
        if (pz <= 0) continue;
        const fade = smooth(0, 0.3, pz);
        const x = cx + px * R;
        const y = cy - py * R;
        ctx.globalAlpha = fade;
        ctx.fillStyle = cityFill;
        ctx.beginPath();
        ctx.arc(x, y, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = heads[c[3]];
        ctx.beginPath();
        ctx.arc(x, y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      time += dt;
      if (dragging) return;
      const cruise = autoRotate && !still ? -autoRotateSpeed * 60 : 0;
      vLng += (cruise - vLng) * (1 - Math.exp(-dt * (still ? 6 : 2.2)));
      vLat *= Math.exp(-dt * (still ? 6 : 3));
      viewLng += vLng * dt;
      viewLat = clamp(viewLat + vLat * dt, -TILT, TILT);
    };

    const idle = () => still && !dragging && Math.abs(vLng) < 0.05 && Math.abs(vLat) < 0.05;

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      paint();
      if (idle()) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !idle();
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      const first = w === 0;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      cx = w / 2;
      cy = h / 2;
      R = Math.max(1, Math.min(w, h) / 2 / (showAtmosphere ? 1.2 : 1.08));
      handle.style.left = `${cx - R}px`;
      handle.style.top = `${cy - R}px`;
      handle.style.width = `${R * 2}px`;
      handle.style.height = `${R * 2}px`;
      if (first) readColors();
      else paintBody();
      paint();
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      vLng = 0;
      vLat = 0;
      sync();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastT) / 1000;
      const dLng = -((e.clientX - lastX) / R) * DEG;
      const dLat = ((e.clientY - lastY) / R) * DEG;
      viewLng += dLng;
      viewLat = clamp(viewLat + dLat, -TILT, TILT);
      const k = Math.min(1, dt / 0.05);
      vLng += (dLng / dt - vLng) * k;
      vLat += (dLat / dt - vLat) * k;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      if (!raf) paint();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
      if (performance.now() - lastT > 90) {
        vLng = 0;
        vLat = 0;
      }
      if (still) {
        vLng *= 0.35;
        vLat *= 0.35;
      }
      sync();
    };
    const onKey = (e: KeyboardEvent) => {
      const kick = { ArrowLeft: [90, 0], ArrowRight: [-90, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] }[e.key];
      if (!kick) return;
      e.preventDefault();
      vLng += kick[0];
      vLat += kick[1];
      sync();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
    handle.addEventListener("keydown", onKey);
    const offTheme = onThemeChange(() => {
      readColors();
      paint();
    });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      handle.removeEventListener("keydown", onKey);
      offTheme();
    };
  }, [arcKey, tintKey, autoRotate, autoRotateSpeed, startLng, startLat, dotColor, showAtmosphere, density, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-arc-globe-night:0] dark:[--miyuki-arc-globe-night:1]",
        className,
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 block size-full"
      />
      <div
        ref={handleRef}
        tabIndex={0}
        role="group"
        aria-roledescription="globe"
        aria-label="Globe. Drag or use the arrow keys to turn it."
        className="absolute -z-10 cursor-grab touch-pan-y rounded-full outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing"
      />
      {children}
    </div>
  );
}
