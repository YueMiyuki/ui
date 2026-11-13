"use client";

import { type GeoPermissibleObjects, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface PinnedGlobeMarker {
  lat: number;
  lng: number;
  src?: string;
  label: string;
}

export interface PinnedGlobeProps extends ComponentProps<"div"> {
  markers?: PinnedGlobeMarker[];
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  initialRotation?: [lng: number, lat: number];
  onMarkerClick?: (marker: PinnedGlobeMarker, index: number) => void;
  onMarkerHover?: (marker: PinnedGlobeMarker | null, index: number) => void;
  landColor?: string;
  seaColor?: string;
}

const NIGHT = "--miyuki-pinned-globe-night";
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const TILT = 60;
const ZOOM_MIN = 0.85;
const ZOOM_MAX = 2.2;

type Topology = Parameters<typeof feature>[0];
type Ring = number[][];

interface LandPart {
  polygon: { type: "Polygon"; coordinates: Ring[] };
  x: number;
  y: number;
  z: number;
  reach: number;
}

let landCache: LandPart[] | null = null;
let graticuleCache: GeoPermissibleObjects | null = null;

function landParts() {
  if (landCache) return landCache;
  const topo = landTopology as unknown as Topology;
  const land = feature(topo, topo.objects.land) as unknown as {
    features: { geometry: { type: string; coordinates: Ring[] | Ring[][] } }[];
  };
  const polygons: Ring[][] = [];
  for (const f of land.features) {
    if (f.geometry.type === "Polygon") polygons.push(f.geometry.coordinates as Ring[]);
    else if (f.geometry.type === "MultiPolygon") polygons.push(...(f.geometry.coordinates as Ring[][]));
  }
  landCache = polygons.map((coordinates) => {
    const outer = coordinates[0];
    let x = 0;
    let y = 0;
    let z = 0;
    for (const [lng, lat] of outer) {
      const c = Math.cos(lat * RAD);
      x += c * Math.cos(lng * RAD);
      y += c * Math.sin(lng * RAD);
      z += Math.sin(lat * RAD);
    }
    const len = Math.hypot(x, y, z);
    let reach = Math.PI;
    if (len > 1e-6 * outer.length) {
      x /= len;
      y /= len;
      z /= len;
      let least = 1;
      for (const [lng, lat] of outer) {
        const c = Math.cos(lat * RAD);
        least = Math.min(least, x * c * Math.cos(lng * RAD) + y * c * Math.sin(lng * RAD) + z * Math.sin(lat * RAD));
      }
      reach = Math.acos(clamp(least, -1, 1)) + 0.02;
    }
    return { polygon: { type: "Polygon", coordinates }, x, y, z, reach };
  });
  return landCache;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

function rgba(value: string, alpha: number, el: Element) {
  const [r, g, b, a] = toRgba(value, el);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${(a * alpha).toFixed(3)})`;
}

export function PinnedGlobe({
  markers = [],
  autoRotateSpeed = 0.25,
  enableZoom = false,
  initialRotation = [120, 24],
  onMarkerClick,
  onMarkerHover,
  landColor = "var(--miyuki-pinned-globe-land)",
  seaColor = "var(--miyuki-pinned-globe-sea)",
  className,
  children,
  ...props
}: PinnedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusRef = useRef<{ index: number; hover: number }>({ index: -1, hover: -1 });
  const reduce = useReducedMotion();
  const [startLng, startLat] = initialRotation;
  const markerKey = markers.map((m) => `${m.lat},${m.lng}`).join(";");

  useEffect(() => {
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !handle || !ctx) return;

    const still = !!reduce;
    const parts = landParts();
    const near: LandPart["polygon"][] = [];
    const land = { type: "GeometryCollection", geometries: near } as GeoPermissibleObjects;
    graticuleCache ??= geoGraticule().step([15, 15]).precision(5)();
    const graticule = graticuleCache;
    const projection = geoOrthographic().clipAngle(90).precision(0);
    const path = geoPath(projection, ctx);
    const pins = markerKey
      ? markerKey.split(";").map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          const c = Math.cos(lat * RAD);
          return { lat, lng, x: c * Math.cos(lng * RAD), y: c * Math.sin(lng * RAD), z: Math.sin(lat * RAD) };
        })
      : [];
    const shown = pins.map(() => ({ x: NaN, y: NaN, o: -1, s: -1, z: -1 }));
    const back = document.createElement("canvas");
    const front = document.createElement("canvas");
    const bctx = back.getContext("2d");
    const fctx = front.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let base = 1;
    let R = 1;
    let zoom = 1;
    let zoomTarget = 1;
    let painted = { R: 0 };
    let night = false;
    let landFill = "";
    let coast = "";
    let grid = "";

    let viewLng = startLng;
    let viewLat = clamp(startLat, -TILT, TILT);
    let vLng = 0;
    let vLat = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      landFill = rgba(landColor, 1, canvas);
      coast = night
        ? rgba("color-mix(in oklab, var(--foreground) 70%, var(--brand))", 0.35, canvas)
        : rgba("color-mix(in oklab, var(--brand-strong) 70%, var(--foreground))", 0.28, canvas);
      grid = night
        ? rgba("var(--foreground)", 0.07, canvas)
        : rgba("color-mix(in oklab, var(--brand-strong) 80%, white)", 0.2, canvas);
      paintStatic();
    };

    const paintStatic = () => {
      if (!bctx || !fctx || w === 0) return;
      painted = { R };
      for (const c of [back, front]) {
        c.width = canvas.width;
        c.height = canvas.height;
      }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const halo = bctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.16);
      halo.addColorStop(0, rgba("var(--brand)", night ? 0.3 : 0.24, canvas));
      halo.addColorStop(0.3, rgba("var(--brand)", night ? 0.11 : 0.08, canvas));
      halo.addColorStop(1, rgba("var(--brand)", 0, canvas));
      bctx.fillStyle = halo;
      bctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);

      const lx = cx - R * 0.4;
      const ly = cy - R * 0.45;
      const sea = bctx.createRadialGradient(lx, ly, 0, lx, ly, R * 1.55);
      if (night) {
        sea.addColorStop(0, rgba(`color-mix(in oklab, ${seaColor} 80%, var(--brand))`, 1, canvas));
        sea.addColorStop(0.55, rgba(seaColor, 1, canvas));
        sea.addColorStop(1, rgba(`color-mix(in oklab, ${seaColor} 55%, black)`, 1, canvas));
      } else {
        sea.addColorStop(0, rgba(`color-mix(in oklab, ${seaColor} 52%, white)`, 1, canvas));
        sea.addColorStop(0.5, rgba(`color-mix(in oklab, ${seaColor} 76%, white)`, 1, canvas));
        sea.addColorStop(1, rgba(`color-mix(in oklab, ${seaColor} 94%, var(--foreground))`, 1, canvas));
      }
      bctx.fillStyle = sea;
      bctx.beginPath();
      bctx.arc(cx, cy, R, 0, Math.PI * 2);
      bctx.fill();

      fctx.save();
      fctx.beginPath();
      fctx.arc(cx, cy, R, 0, Math.PI * 2);
      fctx.clip();
      const shade = night ? "color-mix(in oklab, var(--background) 70%, black)" : "oklch(0.36 0.1 252)";
      const light = fctx.createRadialGradient(lx, ly, 0, lx, ly, R * 2.05);
      light.addColorStop(0, rgba("white", night ? 0.1 : 0.3, canvas));
      light.addColorStop(0.22, rgba("white", 0, canvas));
      light.addColorStop(0.5, rgba(shade, night ? 0.08 : 0.04, canvas));
      light.addColorStop(0.78, rgba(shade, night ? 0.55 : 0.34, canvas));
      light.addColorStop(1, rgba(shade, night ? 0.75 : 0.5, canvas));
      fctx.fillStyle = light;
      fctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const limb = fctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
      limb.addColorStop(0, rgba(shade, 0, canvas));
      limb.addColorStop(1, rgba(shade, night ? 0.35 : 0.16, canvas));
      fctx.fillStyle = limb;
      fctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const rim = fctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
      rim.addColorStop(0, rgba("var(--brand)", 0, canvas));
      rim.addColorStop(
        1,
        rgba(night ? "var(--brand)" : "color-mix(in oklab, var(--brand) 55%, white)", night ? 0.32 : 0.34, canvas),
      );
      fctx.fillStyle = rim;
      fctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      fctx.restore();
    };

    const placeMarkers = () => {
      const cosV = Math.cos(viewLng * RAD);
      const sinV = Math.sin(viewLng * RAD);
      const cosP = Math.cos(viewLat * RAD);
      const sinP = Math.sin(viewLat * RAD);
      for (let i = 0; i < pins.length; i++) {
        const el = markerRefs.current[i];
        if (!el) continue;
        const p = pins[i];
        const a = p.y * cosV - p.x * sinV;
        const c = p.x * cosV + p.y * sinV;
        const b = p.z * cosP - c * sinP;
        const depth = p.z * sinP + c * cosP;
        const x = Math.round((cx + a * R) * 10) / 10;
        const y = Math.round((cy - b * R) * 10) / 10;
        const o = Math.round(smooth(0.04, 0.24, depth) * 100) / 100;
        const s = Math.round((0.72 + 0.28 * smooth(0, 0.55, depth)) * 100) / 100;
        const prev = shown[i];
        if (prev.x !== x || prev.y !== y || prev.s !== s) {
          el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${s})`;
        }
        if (prev.o !== o) {
          el.style.opacity = String(o);
          el.style.pointerEvents = o > 0.5 ? "auto" : "none";
        }
        const z = depth > 0 ? Math.round(depth * 100) + 1 : 0;
        if (prev.z !== z) el.style.zIndex = String(z);
        shown[i] = { x, y, o, s, z };
      }
    };

    const paint = () => {
      if (painted.R !== R) paintStatic();
      projection.scale(R).translate([cx, cy]).rotate([-viewLng, -viewLat]);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(back, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cosV = Math.cos(viewLng * RAD);
      const sinV = Math.sin(viewLng * RAD);
      const cosP = Math.cos(viewLat * RAD);
      const sinP = Math.sin(viewLat * RAD);
      const vx = cosP * cosV;
      const vy = cosP * sinV;
      near.length = 0;
      for (const part of parts) {
        if (part.reach >= Math.PI / 2 || part.x * vx + part.y * vy + part.z * sinP > -Math.sin(part.reach))
          near.push(part.polygon);
      }
      ctx.beginPath();
      path(land);
      ctx.fillStyle = landFill;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = coast;
      ctx.stroke();
      ctx.beginPath();
      path(graticule);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = grid;
      ctx.stroke();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(front, 0, 0);
      placeMarkers();
    };

    const step = (dt: number) => {
      zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt * (still ? 30 : 10)));
      if (Math.abs(zoomTarget - zoom) < 0.001) zoom = zoomTarget;
      const nextR = Math.max(1, base * zoom);
      if (nextR !== R) {
        R = nextR;
        sizeHandle();
      }
      if (dragging) return;
      const { index, hover } = focusRef.current;
      if (index >= 0 && pins[index]) {
        const k = 1 - Math.exp(-dt * (still ? 30 : 5));
        viewLng += wrap(pins[index].lng - viewLng) * k;
        viewLat += (clamp(pins[index].lat, -TILT, TILT) - viewLat) * k;
        vLng = 0;
        vLat = 0;
        return;
      }
      const cruise = !still && hover < 0 ? -autoRotateSpeed * 60 : 0;
      vLng += (cruise - vLng) * (1 - Math.exp(-dt * (still ? 6 : hover >= 0 ? 4 : 2.2)));
      vLat *= Math.exp(-dt * (still ? 6 : 3));
      viewLng = wrap(viewLng + vLng * dt);
      viewLat = clamp(viewLat + vLat * dt, -TILT, TILT);
    };

    const idle = () => {
      if (!still || dragging) return false;
      if (Math.abs(vLng) > 0.05 || Math.abs(vLat) > 0.05 || zoom !== zoomTarget) return false;
      const { index } = focusRef.current;
      if (index < 0 || !pins[index]) return true;
      return (
        Math.abs(wrap(pins[index].lng - viewLng)) < 0.05 &&
        Math.abs(clamp(pins[index].lat, -TILT, TILT) - viewLat) < 0.05
      );
    };

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

    const sizeHandle = () => {
      handle.style.left = `${cx - R}px`;
      handle.style.top = `${cy - R}px`;
      handle.style.width = `${R * 2}px`;
      handle.style.height = `${R * 2}px`;
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
      base = Math.max(1, Math.min(w, h) / 2 / 1.16);
      R = base * zoom;
      sizeHandle();
      if (first) readColors();
      else paintStatic();
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
      viewLng = wrap(viewLng + dLng);
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
      const kick = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] }[e.key];
      if (kick) {
        e.preventDefault();
        vLng += kick[0];
        vLat += kick[1];
      } else if (enableZoom && (e.key === "+" || e.key === "=" || e.key === "-")) {
        e.preventDefault();
        zoomTarget = clamp(zoomTarget * (e.key === "-" ? 1 / 1.2 : 1.2), ZOOM_MIN, ZOOM_MAX);
      } else return;
      sync();
    };
    const onWheel = (e: WheelEvent) => {
      if (!enableZoom) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomTarget = clamp(zoomTarget * Math.exp(-delta * 0.0016), ZOOM_MIN, ZOOM_MAX);
      sync();
    };
    const wake = () => sync();

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
    handle.addEventListener("wheel", onWheel, { passive: false });
    const root = handle.parentElement;
    root?.addEventListener("focusin", wake);
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
      handle.removeEventListener("wheel", onWheel);
      root?.removeEventListener("focusin", wake);
      offTheme();
    };
  }, [markerKey, autoRotateSpeed, enableZoom, startLng, startLat, landColor, seaColor, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-pinned-globe-night:0] dark:[--miyuki-pinned-globe-night:1]",
        "[--miyuki-pinned-globe-land:color-mix(in_oklab,var(--background)_55%,white)] [--miyuki-pinned-globe-sea:var(--brand)]",
        "dark:[--miyuki-pinned-globe-land:color-mix(in_oklab,var(--foreground)_80%,var(--brand))] dark:[--miyuki-pinned-globe-sea:color-mix(in_oklab,var(--brand)_30%,var(--background))]",
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
        aria-label={`Globe${markers.length ? ` with ${markers.length} ${markers.length === 1 ? "person" : "people"}` : ""}. Drag or use the arrow keys to turn it.`}
        className="absolute -z-10 cursor-grab touch-pan-y rounded-full outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring active:cursor-grabbing"
      />
      <ul className="pointer-events-none absolute inset-0 -z-10">
        {markers.map((marker, i) => (
          <li key={`${marker.lat},${marker.lng},${i}`}>
            <button
              ref={(el) => {
                markerRefs.current[i] = el;
              }}
              type="button"
              className="group/marker absolute top-0 left-0 rounded-full opacity-0 outline-none will-change-transform focus-visible:ring-[3px] focus-visible:ring-ring"
              style={{ pointerEvents: "none" }}
              onClick={() => {
                focusRef.current.index = i;
                onMarkerClick?.(marker, i);
              }}
              onPointerEnter={() => {
                focusRef.current.hover = i;
                onMarkerHover?.(marker, i);
              }}
              onPointerLeave={() => {
                focusRef.current.hover = -1;
                onMarkerHover?.(null, i);
              }}
              onFocus={(e) => {
                if (e.currentTarget.matches(":focus-visible")) focusRef.current.index = i;
              }}
              onBlur={() => {
                focusRef.current.index = -1;
              }}
            >
              {marker.src ? (
                <span className="block rounded-full bg-card p-0.5 shadow-md ring-[1.5px] ring-brand/70 transition-transform duration-200 ease-settle group-hover/marker:-translate-y-0.5">
                  <img src={marker.src} alt="" draggable={false} className="block size-8 rounded-full object-cover" />
                </span>
              ) : (
                <span className="block size-3.5 rounded-full bg-brand shadow-md ring-[3px] ring-card" />
              )}
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 translate-y-1 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-lg transition-[opacity,translate] duration-150 ease-settle group-hover/marker:translate-y-0 group-hover/marker:opacity-100 group-focus-visible/marker:translate-y-0 group-focus-visible/marker:opacity-100">
                {marker.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
