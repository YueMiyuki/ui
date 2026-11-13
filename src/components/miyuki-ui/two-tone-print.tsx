"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useRef, useState } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type PrintMode = "bayer" | "halftone" | "noise" | "crosshatch";
export type PrintColorMode = "duotone" | "grayscale" | "original";
export type PrintObjectFit = "cover" | "contain" | "fill";

export interface TwoTonePrintProps extends Omit<ComponentProps<"div">, "children"> {
  src: string;
  alt: string;
  gridSize?: number;
  mode?: PrintMode;
  colorMode?: PrintColorMode;
  primaryColor?: string;
  secondaryColor?: string;
  threshold?: number;
  brightness?: number;
  contrast?: number;
  invert?: boolean;
  animated?: boolean;
  animationSpeed?: number;
  objectFit?: PrintObjectFit;
  ref?: Ref<HTMLDivElement>;
}

const INK = "color-mix(in oklab, var(--brand-strong) 40%, var(--foreground))";
const PAPER = "var(--background)";
const MODES: Record<PrintMode, number> = { bayer: 0, halftone: 1, noise: 2, crosshatch: 3 };
const COLORS: Record<PrintColorMode, number> = { duotone: 0, grayscale: 1, original: 2 };

const VERTEX = `
attribute vec2 a_pos;
uniform vec2 u_view;
varying vec2 v_pos;
void main() {
  v_pos = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5) * u_view;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec2 v_pos;
uniform sampler2D u_image;
uniform vec2 u_view;
uniform vec4 u_fit;
uniform float u_grid;
uniform float u_px;
uniform int u_mode;
uniform int u_color;
uniform vec3 u_ink;
uniform vec3 u_paper;
uniform float u_li;
uniform float u_lp;
uniform float u_bias;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_invert;
uniform vec2 u_shift;
uniform vec2 u_levels;

const float S = 0.70710678;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec4 pick(vec2 p) {
  vec2 uv = p / u_view * u_fit.xy + u_fit.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(u_image, uv);
}

float cover(vec4 s) {
  if (s.a < 0.02) return 0.0;
  float t = (luma(s.rgb) - u_levels.x) / max(0.05, u_levels.y - u_levels.x);
  t = (t - 0.5) * u_contrast + 0.5 + u_brightness;
  t = clamp(mix(t, 1.0 - t, u_invert), 0.0, 1.0);
  float d = u_li - u_lp;
  float c = abs(d) < 0.01 ? 1.0 - t : (pow(t, 2.2) - u_lp) / d;
  return clamp(c - u_bias, 0.0, 1.0);
}

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float ign(vec2 a) { return fract(52.9829189 * fract(dot(a, vec2(0.06711056, 0.00583715)))); }

float line(float v, float period, float hw) {
  float d = abs(fract(v / period) - 0.5) * period;
  return (1.0 - smoothstep(hw - u_px * 0.6, hw + u_px * 0.6, d)) * step(u_px * 0.35, hw);
}

void main() {
  vec2 p = v_pos;
  float ink = 0.0;
  vec3 tint = u_ink;
  if (u_mode == 1) {
    float cell = u_grid * 1.6;
    vec2 off = u_shift * u_grid;
    vec2 q = vec2(S * (p.x + p.y), S * (p.y - p.x)) + off;
    vec2 base = floor(q / cell);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c0 = (base + vec2(float(i), float(j)) + 0.5) * cell;
        vec2 cq = c0 - off;
        vec4 s = pick(vec2(S * (cq.x - cq.y), S * (cq.x + cq.y)));
        float k = cover(s);
        float r = sqrt(k) * cell * 0.68;
        float a = (1.0 - smoothstep(r - u_px * 0.7, r + u_px * 0.7, length(q - c0))) * step(0.002, k);
        if (a > ink) { ink = a; tint = s.rgb; }
      }
    }
  } else if (u_mode == 3) {
    vec4 s = pick(p);
    float k = cover(s);
    tint = s.rgb;
    vec2 q = p + u_shift * u_grid;
    float period = max(2.5, u_grid * 1.3);
    float hw = mix(0.3, 0.56, k) * period * 0.5;
    float a1 = line((q.x + q.y) * S, period, hw * smoothstep(0.05, 0.2, k));
    float a2 = line((q.x - q.y) * S, period, hw * smoothstep(0.33, 0.48, k));
    float a3 = line((q.x - q.y) * S + period * 0.5, period, hw * smoothstep(0.6, 0.75, k));
    float a4 = line((q.x + q.y) * S + period * 0.5, period, hw * smoothstep(0.8, 0.94, k));
    ink = max(max(a1, a2), max(a3, a4));
  } else {
    vec2 id = floor(p / u_grid);
    vec4 s = pick((id + 0.5) * u_grid);
    float k = cover(s);
    tint = s.rgb;
    vec2 at = id + floor(u_shift);
    float th = u_mode == 2 ? ign(at) : bayer8(at) + 0.0078125;
    ink = step(th, k) * step(0.002, k);
  }
  vec3 inkColor = u_ink;
  vec3 paper = u_paper;
  if (u_color == 1) {
    inkColor = vec3(luma(u_ink));
    paper = vec3(luma(u_paper));
  } else if (u_color == 2) {
    inkColor = tint;
  }
  gl_FragColor = vec4(mix(paper, inkColor, ink), 1.0);
}
`;

interface Settings {
  mode: number;
  color: number;
  grid: number;
  bias: number;
  brightness: number;
  contrast: number;
  invert: number;
  fit: PrintObjectFit;
}

function fitFor(fit: PrintObjectFit, vw: number, vh: number, iw: number, ih: number): [number, number, number, number] {
  if (fit === "fill" || iw <= 0 || ih <= 0) return [1, 1, 0, 0];
  const va = vw / vh;
  const ia = iw / ih;
  if (fit === "cover") {
    return va > ia ? [1, ia / va, 0, (1 - ia / va) / 2] : [va / ia, 1, (1 - va / ia) / 2, 0];
  }
  return va > ia ? [va / ia, 1, -(va / ia - 1) / 2, 0] : [1, ia / va, 0, -(ia / va - 1) / 2];
}

const luma = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function bayer2(x: number, y: number) {
  x = Math.floor(x);
  y = Math.floor(y);
  const v = x / 2 + y * y * 0.75;
  return v - Math.floor(v);
}
const bayer4 = (x: number, y: number) => bayer2(x / 2, y / 2) * 0.25 + bayer2(x, y);
const bayer8 = (x: number, y: number) => bayer4(x / 2, y / 2) * 0.25 + bayer2(x, y);
const fract = (v: number) => v - Math.floor(v);
const ign = (x: number, y: number) => fract(52.9829189 * fract(0.06711056 * x + 0.00583715 * y));
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function paintCpu(
  out: CanvasRenderingContext2D,
  source: ImageData,
  s: Settings,
  ink: number[],
  paper: number[],
  levels: [number, number],
) {
  const { width: W, height: H, data } = source;
  const result = out.createImageData(W, H);
  const px = result.data;
  const li = luma(ink) ** 2.2;
  const lp = luma(paper) ** 2.2;
  const sample = (x: number, y: number) => {
    const ix = Math.min(W - 1, Math.max(0, Math.floor(x)));
    const iy = Math.min(H - 1, Math.max(0, Math.floor(y)));
    const o = (iy * W + ix) * 4;
    return [data[o] / 255, data[o + 1] / 255, data[o + 2] / 255, data[o + 3] / 255];
  };
  const cover = (c: number[]) => {
    if (c[3] < 0.02) return 0;
    let t = (luma(c) - levels[0]) / Math.max(0.05, levels[1] - levels[0]);
    t = (t - 0.5) * s.contrast + 0.5 + s.brightness;
    if (s.invert) t = 1 - t;
    t = Math.min(1, Math.max(0, t));
    const d = li - lp;
    const k = Math.abs(d) < 0.01 ? 1 - t : (t ** 2.2 - lp) / d;
    return Math.min(1, Math.max(0, k - s.bias));
  };
  const R = Math.SQRT1_2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0;
      let tint = ink;
      if (s.mode === 1) {
        const cell = s.grid * 1.6;
        const qx = R * (x + y);
        const qy = R * (y - x);
        const bx = Math.floor(qx / cell);
        const by = Math.floor(qy / cell);
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const cx = (bx + i + 0.5) * cell;
            const cy = (by + j + 0.5) * cell;
            const c = sample(R * (cx - cy), R * (cx + cy));
            const k = cover(c);
            if (k <= 0.002) continue;
            const r = Math.sqrt(k) * cell * 0.68;
            if (Math.hypot(qx - cx, qy - cy) < r && a < 1) {
              a = 1;
              tint = c;
            }
          }
        }
      } else if (s.mode === 3) {
        const c = sample(x, y);
        const k = cover(c);
        tint = c;
        const period = Math.max(2.5, s.grid * 1.3);
        const hw = (0.3 + 0.26 * k) * period * 0.5;
        const on = (v: number, from: number) =>
          Math.abs(fract(v / period) - 0.5) * period < hw * smooth(from, from + 0.15, k);
        if (
          on((x + y) * R, 0.05) ||
          on((x - y) * R, 0.33) ||
          on((x - y) * R + period * 0.5, 0.6) ||
          on((x + y) * R + period * 0.5, 0.8)
        )
          a = 1;
      } else {
        const ix = Math.floor(x / s.grid);
        const iy = Math.floor(y / s.grid);
        const c = sample((ix + 0.5) * s.grid, (iy + 0.5) * s.grid);
        const k = cover(c);
        tint = c;
        const th = s.mode === 2 ? ign(ix, iy) : bayer8(ix, iy) + 0.0078125;
        a = k > th && k > 0.002 ? 1 : 0;
      }
      let inkColor = ink;
      let paperColor = paper;
      if (s.color === 1) {
        const gi = luma(ink);
        const gp = luma(paper);
        inkColor = [gi, gi, gi];
        paperColor = [gp, gp, gp];
      } else if (s.color === 2) inkColor = tint;
      const o = (y * W + x) * 4;
      px[o] = Math.round((paperColor[0] + (inkColor[0] - paperColor[0]) * a) * 255);
      px[o + 1] = Math.round((paperColor[1] + (inkColor[1] - paperColor[1]) * a) * 255);
      px[o + 2] = Math.round((paperColor[2] + (inkColor[2] - paperColor[2]) * a) * 255);
      px[o + 3] = 255;
    }
  }
  out.putImageData(result, 0, 0);
}

function measureLevels(source: HTMLCanvasElement): [number, number] {
  const probe = document.createElement("canvas");
  probe.width = 96;
  probe.height = 64;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0, 1];
  ctx.drawImage(source, 0, 0, probe.width, probe.height);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, probe.width, probe.height).data;
  } catch {
    return [0, 1];
  }
  const values: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    values.push(luma([data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]));
  }
  if (values.length < 16) return [0, 1];
  values.sort((a, b) => a - b);
  const lo = values[Math.floor(values.length * 0.01)];
  const hi = values[Math.min(values.length - 1, Math.floor(values.length * 0.99))];
  return hi - lo < 0.1 ? [0, 1] : [lo, hi];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function TwoTonePrint({
  src,
  alt,
  gridSize = 4,
  mode = "bayer",
  colorMode = "duotone",
  primaryColor = INK,
  secondaryColor = PAPER,
  threshold = 0.5,
  brightness = 0,
  contrast = 1,
  invert = false,
  animated = false,
  animationSpeed = 1,
  objectFit = "cover",
  className,
  style,
  ref,
  ...props
}: TwoTonePrintProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [plain, setPlain] = useState(false);
  const engine = useRef<{ redraw: () => void } | null>(null);
  const settings = useRef<Settings>({
    mode: MODES[mode],
    color: COLORS[colorMode],
    grid: Math.max(1, gridSize),
    bias: threshold - 0.5,
    brightness,
    contrast,
    invert: invert ? 1 : 0,
    fit: objectFit,
  });
  const colors = useRef({ primary: primaryColor, secondary: secondaryColor });
  const motionRef = useRef({ animated: animated && !reduce, speed: animationSpeed });

  useEffect(() => {
    settings.current = {
      mode: MODES[mode] ?? 0,
      color: COLORS[colorMode] ?? 0,
      grid: Math.max(1, gridSize),
      bias: threshold - 0.5,
      brightness,
      contrast,
      invert: invert ? 1 : 0,
      fit: objectFit,
    };
    colors.current = { primary: primaryColor, secondary: secondaryColor };
    motionRef.current = { animated: animated && !reduce, speed: animationSpeed };
    engine.current?.redraw();
  }, [
    mode,
    colorMode,
    gridSize,
    threshold,
    brightness,
    contrast,
    invert,
    objectFit,
    primaryColor,
    secondaryColor,
    animated,
    animationSpeed,
    reduce,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let disposed = false;
    let raf = 0;
    let visible = true;
    let image: HTMLCanvasElement | null = null;
    let ink = [0, 0, 0];
    let paper = [1, 1, 1];
    let W = 0;
    let H = 0;
    let ratio = 1;
    let levels: [number, number] = [0, 1];
    const started = performance.now();

    const readColors = () => {
      const a = toRgba(colors.current.primary, root);
      const b = toRgba(colors.current.secondary, root);
      ink = [a[0], a[1], a[2]];
      paper = [b[0], b[1], b[2]];
    };

    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    const loc: Record<string, WebGLUniformLocation | null> = {};

    if (gl) {
      const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram();
      if (vs && fs && program) {
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) program = null;
      } else program = null;
      if (program) {
        gl.useProgram(program);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, "a_pos");
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        for (const name of [
          "u_image",
          "u_view",
          "u_fit",
          "u_grid",
          "u_px",
          "u_mode",
          "u_color",
          "u_ink",
          "u_paper",
          "u_li",
          "u_lp",
          "u_bias",
          "u_brightness",
          "u_contrast",
          "u_invert",
          "u_shift",
          "u_levels",
        ])
          loc[name] = gl.getUniformLocation(program, name);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    }
    const cpu = !program ? (canvas.getContext("2d") as CanvasRenderingContext2D | null) : null;
    if (!program && !cpu) {
      queueMicrotask(() => setPlain(true));
      return;
    }

    const draw = (now: number) => {
      if (!image || W === 0 || H === 0) return;
      const s = settings.current;
      if (program && gl) {
        const time = motionRef.current.animated ? ((now - started) / 1000) * motionRef.current.speed : 0;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(loc.u_view, W, H);
        gl.uniform4f(loc.u_fit, ...fitFor(s.fit, W, H, image.width, image.height));
        gl.uniform1f(loc.u_grid, s.grid);
        gl.uniform1f(loc.u_px, 1 / ratio);
        gl.uniform1i(loc.u_mode, s.mode);
        gl.uniform1i(loc.u_color, s.color);
        gl.uniform3f(loc.u_ink, ink[0], ink[1], ink[2]);
        gl.uniform3f(loc.u_paper, paper[0], paper[1], paper[2]);
        gl.uniform1f(loc.u_li, luma(ink) ** 2.2);
        gl.uniform1f(loc.u_lp, luma(paper) ** 2.2);
        gl.uniform1f(loc.u_bias, s.bias);
        gl.uniform1f(loc.u_brightness, s.brightness);
        gl.uniform1f(loc.u_contrast, s.contrast);
        gl.uniform1f(loc.u_invert, s.invert);
        gl.uniform2f(loc.u_shift, time * 0.9, time * 0.45);
        gl.uniform2f(loc.u_levels, levels[0], levels[1]);
        gl.uniform1i(loc.u_image, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return;
      }
      if (cpu) {
        const w = Math.max(1, Math.round(W));
        const h = Math.max(1, Math.round(H));
        canvas.width = w;
        canvas.height = h;
        const scratch = document.createElement("canvas");
        scratch.width = w;
        scratch.height = h;
        const sctx = scratch.getContext("2d", { willReadFrequently: true });
        if (!sctx) return;
        const [fx, fy, ox, oy] = fitFor(s.fit, w, h, image.width, image.height);
        const dw = w / fx;
        const dh = h / fy;
        sctx.drawImage(image, (-ox / fx) * w, (-oy / fy) * h, dw, dh);
        try {
          paintCpu(cpu, sctx.getImageData(0, 0, w, h), s, ink, paper, levels);
        } catch {
          setPlain(true);
        }
      }
    };

    const loop = (now: number) => {
      raf = 0;
      draw(now);
      if (program && motionRef.current.animated && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const redraw = () => {
      if (disposed) return;
      readColors();
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    engine.current = { redraw };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const k = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1;
      W = root.offsetWidth;
      H = root.offsetHeight;
      ratio = Math.min(2, (window.devicePixelRatio || 1) * k);
      if (program) {
        canvas.width = Math.max(1, Math.round(W * ratio));
        canvas.height = Math.max(1, Math.round(H * ratio));
      }
      redraw();
    };

    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      const iw = img.naturalWidth || 1280;
      const ih = img.naturalHeight || 800;
      const scale = Math.min(1, 2048 / Math.max(iw, ih));
      const raster = document.createElement("canvas");
      raster.width = Math.max(1, Math.round(iw * scale));
      raster.height = Math.max(1, Math.round(ih * scale));
      const rctx = raster.getContext("2d");
      if (!rctx) return setPlain(true);
      rctx.drawImage(img, 0, 0, raster.width, raster.height);
      try {
        if (program && gl) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster);
        } else rctx.getImageData(0, 0, 1, 1);
      } catch {
        setPlain(true);
        return;
      }
      image = raster;
      levels = measureLevels(raster);
      redraw();
    };
    img.onerror = () => {
      if (!disposed) setPlain(true);
    };
    img.src = src;

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) redraw();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden) redraw();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(redraw);
    resize();

    return () => {
      disposed = true;
      engine.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
      img.onload = null;
      img.onerror = null;
      if (gl) {
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
      }
    };
  }, [src]);

  return (
    <div
      {...props}
      ref={(el) => {
        rootRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      role="img"
      aria-label={alt}
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: secondaryColor, ...style }}
    >
      {plain ? (
        <img src={src} alt="" className="absolute inset-0 size-full grayscale" style={{ objectFit }} />
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full [image-rendering:pixelated]" />
      )}
    </div>
  );
}
