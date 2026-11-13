"use client";

import { Camera, CameraOff } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export type CameraTilesMode = "water" | "color" | "mono";

export interface CameraTilesProps extends Omit<ComponentProps<"div">, "onError"> {
  cols?: number;
  mode?: CameraTilesMode;
  mirror?: boolean;
  gap?: number;
  maxElevation?: number;
  motionSensitivity?: number;
  smoothing?: number;
  autoStart?: boolean;
  onReady?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

type Status = "idle" | "starting" | "live";

const NIGHT = "--miyuki-camera-tiles-night";
const INK = "var(--miyuki-camera-tiles-ink)";
const WATER = "var(--miyuki-camera-tiles-water)";
const SNOW = "var(--miyuki-camera-tiles-snow)";
const SHADOW = "var(--miyuki-camera-tiles-shadow)";
const RAMP = 64;
const SPRITE = 64;
const SAMPLE_EVERY = 1 / 30;
const STILL = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function messageFor(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access was blocked.";
  if (name === "Unavailable") return "The camera is not available on this page.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError" || name === "AbortError") return "The camera is busy in another app.";
  return "The camera could not start.";
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng();
  const perm = Uint8Array.from(rng.shuffle(Array.from({ length: 256 }, (_, i) => i)));
  const at = (x: number, y: number) => table[perm[(perm[x & 255] + y) & 255]];
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
}

export function CameraTiles({
  cols = 48,
  mode = "water",
  mirror = true,
  gap = 0.12,
  maxElevation = 10,
  motionSensitivity = 0.5,
  smoothing = 0.6,
  autoStart = false,
  onReady,
  onError,
  className,
  children,
  ...props
}: CameraTilesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aliveRef = useRef(true);
  const callbacks = useRef({ onReady, onError });
  const reduce = !!useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    callbacks.current = { onReady, onError };
  });

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const start = useCallback(async () => {
    const fail = (error: Error) => {
      release();
      if (!aliveRef.current) return;
      setStatus("idle");
      setMessage(messageFor(error));
      callbacks.current.onError?.(error);
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error("This browser cannot open a camera here.");
      error.name = "Unavailable";
      fail(error);
      return;
    }
    setStatus("starting");
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("The video element is gone.");
      video.srcObject = stream;
      await video.play();
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current !== stream) return;
        release();
        setStatus("idle");
        setMessage("The camera stopped.");
      });
      setStatus("live");
      callbacks.current.onReady?.(stream);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  }, [release]);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
    setMessage(null);
  }, [release]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      release();
    };
  }, [release]);

  useEffect(() => {
    if (!autoStart) return;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [autoStart, start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;

    const sample = document.createElement("canvas");
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    const stage = document.createElement("canvas");
    const stx = stage.getContext("2d");
    if (!sctx || !stx) return;

    const still = reduce;
    const across = clamp(Math.round(cols), 4, 160);
    const spacing = clamp(gap, 0, 0.6);
    const lift = Math.max(0, maxElevation);
    const sense = clamp(motionSensitivity, 0, 1);
    const calm = clamp(smoothing, 0, 1);
    const threshold = 0.02 + 0.1 * (1 - sense);
    const gain = 3 + 12 * sense;
    const settle = 0.12 + calm * 0.9;
    const blend = 0.015 + calm * 0.16;
    const noise = makeNoise("camera-tiles");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let rows = 0;
    let n = 0;
    let cell = 0;
    let top = 0;
    let idle = new Float32Array(0);
    let crest = new Float32Array(0);
    let grain = new Float32Array(0);
    let shown = new Float32Array(0);
    let red = new Float32Array(0);
    let green = new Float32Array(0);
    let blue = new Float32Array(0);
    let raw = new Float32Array(0);
    let prev = new Float32Array(0);
    let kick = new Float32Array(0);
    let elev = new Float32Array(0);
    let night = false;
    let fills: string[] = [];
    let greys: string[] = [];
    let rampRgb = new Float32Array(RAMP * 3);
    const tints: (string | undefined)[] = new Array(32768);
    let shadow: HTMLCanvasElement | null = null;
    let lo = 0.2;
    let hi = 0.8;
    let mix = 0;
    let fresh = false;
    let time = STILL;
    let since = 0;
    let raf = 0;
    let last = 0;
    let onScreen = false;

    const readColors = () => {
      night = cssVar(NIGHT, canvas) === "1";
      fills = [];
      greys = [];
      rampRgb = new Float32Array(RAMP * 3);
      for (let i = 0; i < RAMP; i++) {
        const t = i / (RAMP - 1);
        const color =
          t < 0.5
            ? `color-mix(in oklab, ${WATER} ${(t * 200).toFixed(1)}%, ${INK})`
            : `color-mix(in oklab, ${SNOW} ${(((t - 0.5) * 2) ** 0.6 * 100).toFixed(1)}%, ${WATER})`;
        const [r, g, b] = toRgba(color, canvas);
        rampRgb[i * 3] = r;
        rampRgb[i * 3 + 1] = g;
        rampRgb[i * 3 + 2] = b;
        fills.push(`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`);
        const [gr, gg, gb] = toRgba(`color-mix(in oklab, ${SNOW} ${(t * 100).toFixed(1)}%, ${INK})`, canvas);
        greys.push(`rgb(${Math.round(gr * 255)}, ${Math.round(gg * 255)}, ${Math.round(gb * 255)})`);
      }
      const [sr, sg, sb, sa] = toRgba(SHADOW, canvas);
      shadow = document.createElement("canvas");
      shadow.width = shadow.height = SPRITE;
      const g = shadow.getContext("2d");
      if (g) {
        const c = SPRITE / 2;
        const gradient = g.createRadialGradient(c, c, 0, c, c, c);
        const tone = `${Math.round(sr * 255)}, ${Math.round(sg * 255)}, ${Math.round(sb * 255)}`;
        gradient.addColorStop(0, `rgba(${tone}, ${sa})`);
        gradient.addColorStop(0.45, `rgba(${tone}, ${(sa * 0.55).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${tone}, 0)`);
        g.fillStyle = gradient;
        g.fillRect(0, 0, SPRITE, SPRITE);
      }
    };

    const tintFor = (r: number, g: number, b: number) => {
      const key =
        (Math.round(clamp(r, 0, 1) * 31) << 10) |
        (Math.round(clamp(g, 0, 1) * 31) << 5) |
        Math.round(clamp(b, 0, 1) * 31);
      let hit = tints[key];
      if (!hit) {
        hit = `rgb(${((key >> 10) & 31) * 8 + 4}, ${((key >> 5) & 31) * 8 + 4}, ${(key & 31) * 8 + 4})`;
        tints[key] = hit;
      }
      return hit;
    };

    const layout = () => {
      cell = w / across;
      rows = Math.max(1, Math.ceil(h / cell));
      top = (h - rows * cell) / 2;
      n = across * rows;
      idle = new Float32Array(n);
      crest = new Float32Array(n);
      grain = new Float32Array(n);
      const jitter = createRng(`camera-tiles:${across}x${rows}`);
      for (let i = 0; i < n; i++) grain[i] = (jitter() - 0.5) * 0.05;
      shown = new Float32Array(n);
      red = new Float32Array(n);
      green = new Float32Array(n);
      blue = new Float32Array(n);
      raw = new Float32Array(n);
      prev = new Float32Array(n);
      kick = new Float32Array(n);
      elev = new Float32Array(n);
      sample.width = across;
      sample.height = rows;
      stage.width = across * 4;
      stage.height = rows * 4;
      fresh = false;
      pattern();
      shown.set(idle);
    };

    const pattern = () => {
      const t = time * 0.05;
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < across; c++, i++) {
          const x = c * 0.075;
          const y = r * 0.075;
          let v = noise(x + t, y - t * 0.55) * 0.65 + noise(x * 2.1 - t * 1.3, y * 2.1 + 17) * 0.35;
          v = clamp((v - 0.32) / 0.5, 0, 1);
          v = v * v * (3 - 2 * v);
          crest[i] = v;
          idle[i] = (night ? 0.05 + 0.45 * v : 0.95 - 0.42 * v) + grain[i];
        }
      }
    };

    const capture = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return false;
      const want = across / rows;
      let sw = vw;
      let sh = vh;
      if (vw / vh > want) sw = vh * want;
      else sh = vw / want;
      stx.imageSmoothingQuality = "high";
      stx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? stage.width : 0, 0);
      stx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, stage.width, stage.height);
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(stage, 0, 0, across, rows);
      const data = sctx.getImageData(0, 0, across, rows).data;
      let min = 1;
      let max = 0;
      for (let i = 0; i < n; i++) {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        red[i] = fresh ? red[i] + (r - red[i]) * 0.5 : r;
        green[i] = fresh ? green[i] + (g - green[i]) * 0.5 : g;
        blue[i] = fresh ? blue[i] + (b - blue[i]) * 0.5 : b;
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        prev[i] = fresh ? raw[i] : l;
        raw[i] = l;
        if (l < min) min = l;
        if (l > max) max = l;
        if (!still) {
          const change = Math.abs(l - prev[i]);
          const k = clamp((change - threshold) * gain, 0, 1);
          if (k > kick[i]) kick[i] = k;
        }
      }
      lo = fresh ? lo + (min - lo) * 0.08 : min;
      hi = fresh ? hi + (max - hi) * 0.08 : max;
      fresh = true;
      return true;
    };

    const advance = (dt: number) => {
      const live = streamRef.current !== null && video.readyState >= 2;
      mix = clamp(mix + (live && fresh ? dt : -dt) / 0.6, 0, 1);
      if (!live && mix <= 0) fresh = false;
      if (mix < 1) pattern();
      if (live) {
        since += dt;
        if (since >= SAMPLE_EVERY || !fresh) {
          since = 0;
          capture();
        }
      }
      const range = Math.max(0.28, hi - lo);
      const ease = 1 - Math.exp(-dt / blend);
      const rise = 1 - Math.exp(-dt * 28);
      const fall = 1 - Math.exp(-dt / settle);
      const decay = Math.exp(-dt / (settle * 0.5));
      for (let i = 0; i < n; i++) {
        const cam = fresh ? clamp((raw[i] - lo) / range, 0, 1) : idle[i];
        const target = idle[i] + (cam - idle[i]) * mix;
        shown[i] += (target - shown[i]) * (dt > 0 ? ease : 1);
        let goal = kick[i] * mix;
        if (mix < 1 && !still) {
          const swell = clamp((crest[i] - 0.72) / 0.28, 0, 1);
          goal = Math.max(goal, swell * 0.6 * (1 - mix));
        }
        const e = elev[i];
        elev[i] = goal > e ? e + (goal - e) * rise : e + (goal - e) * fall;
        kick[i] *= decay;
      }
    };

    let tile = 0;
    let radius = 0;
    let colorMode = false;
    let ramp: string[] = [];

    const paint = (i: number, x: number, y: number, size: number) => {
      if (colorMode) {
        const k = Math.round(clamp(idle[i], 0, 1) * (RAMP - 1)) * 3;
        ctx.fillStyle = tintFor(
          rampRgb[k] + (red[i] - rampRgb[k]) * mix,
          rampRgb[k + 1] + (green[i] - rampRgb[k + 1]) * mix,
          rampRgb[k + 2] + (blue[i] - rampRgb[k + 2]) * mix,
        );
      } else {
        ctx.fillStyle = ramp[Math.round(clamp(shown[i], 0, 1) * (RAMP - 1))];
      }
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius * (size / tile));
      ctx.fill();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (n === 0 || fills.length === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tile = cell * (1 - spacing);
      radius = tile * 0.26;
      colorMode = mode === "color" && mix > 0 && fresh;
      ramp = mode === "mono" ? greys : fills;
      const inset = (cell - tile) / 2;

      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < across; c++, i++) {
          if (elev[i] >= 0.03) continue;
          paint(i, c * cell + inset, top + r * cell + inset, tile);
        }
      }
      if (!shadow) return;
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < across; c++, i++) {
          const e = elev[i];
          if (e < 0.03) continue;
          const up = e * lift;
          const size = tile * (1 + 0.16 * e);
          const x = c * cell + cell / 2;
          const y = top + r * cell + cell / 2;
          const s = size * 1.6;
          ctx.globalAlpha = Math.min(1, e * 0.9);
          ctx.drawImage(shadow, x - s / 2, y - s / 2 + up * 0.55, s, s);
          ctx.globalAlpha = 1;
          paint(i, x - size / 2, y - size / 2 - up * 0.45, size);
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 1 / 60;
      last = now;
      if (!still || streamRef.current) time += dt;
      advance(dt);
      draw();
      if (still && !streamRef.current && mix <= 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const sync = () => {
      const run = onScreen && !document.hidden && (!still || streamRef.current !== null || mix > 0);
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
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (w > 0 && h > 0) layout();
      if (!still) for (let k = 0; k < 4; k++) advance(1 / 60);
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    video.addEventListener("playing", sync);
    video.addEventListener("emptied", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      if (!streamRef.current) {
        pattern();
        shown.set(idle);
      }
      draw();
    });
    readColors();
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.removeEventListener("playing", sync);
      video.removeEventListener("emptied", sync);
      offTheme();
    };
  }, [cols, mode, mirror, gap, maxElevation, motionSensitivity, smoothing, reduce]);

  const live = status === "live";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-camera-tiles-night:0] dark:[--miyuki-camera-tiles-night:1]",
        "[--miyuki-camera-tiles-ink:var(--foreground)] [--miyuki-camera-tiles-water:var(--brand)]",
        "[--miyuki-camera-tiles-snow:color-mix(in_oklab,var(--brand)_10%,var(--background))]",
        "[--miyuki-camera-tiles-shadow:color-mix(in_oklab,var(--brand)_55%,transparent)]",
        "dark:[--miyuki-camera-tiles-ink:color-mix(in_oklab,var(--brand)_8%,var(--card))]",
        "dark:[--miyuki-camera-tiles-snow:var(--foreground)]",
        "dark:[--miyuki-camera-tiles-shadow:color-mix(in_oklab,var(--brand)_70%,transparent)]",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full" />
      </div>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute size-px opacity-0"
      />
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-4 pb-6">
        <p
          role="status"
          className={cn(
            "rounded-full border border-border bg-card/90 px-3 py-1 text-[13px] text-foreground shadow-sm backdrop-blur-md",
            !message && "sr-only",
          )}
        >
          {message}
        </p>
        <Button
          variant="secondary"
          className="pointer-events-auto bg-card/90 backdrop-blur-md data-[hovered]:bg-card"
          iconStart={live ? <CameraOff /> : <Camera />}
          isPending={status === "starting"}
          onPress={live ? stop : () => void start()}
        >
          {live ? "Turn off camera" : "Turn on camera"}
        </Button>
      </div>
    </div>
  );
}
