"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface DriftingCloudsProps extends ComponentProps<"div"> {
  speed?: number;
  coverage?: number;
  softness?: number;
  skyTop?: string;
  skyBottom?: string;
  cloudColor?: string;
}

const NIGHT = "--miyuki-drifting-clouds-night";
const TOP = "var(--miyuki-drifting-clouds-top)";
const BOTTOM = "var(--miyuki-drifting-clouds-bottom)";
const CLOUD = "var(--miyuki-drifting-clouds-cloud)";
const SHADE = "var(--miyuki-drifting-clouds-shade)";
const START = 46;
const PIXEL_BUDGET = 900_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uCover;
uniform float uSoft;
uniform float uNight;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uCloud;
uniform vec3 uShade;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float depth = 1.0 / (0.32 + uv.y * 0.9);
  vec2 p = vec2((uv.x - 0.5) * aspect * depth * 0.8, depth * 1.35);
  float t = uTime;

  vec2 q = p * 1.7 + vec2(t * 0.045, 0.0);
  vec2 warp = vec2(
    fbm(q * 0.55 + vec2(0.0, t * 0.021)),
    fbm(q * 0.55 + vec2(5.2, 1.3) - vec2(t * 0.012, t * 0.017))
  );
  vec2 c = q + warp * 1.2 + vec2(t * 0.01, 0.0);
  float n = fbm(c);
  float above = fbm(c - vec2(0.0, 0.16));

  float edge = mix(0.72, 0.32, uCover);
  float soft = mix(0.02, 0.2, uSoft);
  float dens = smoothstep(edge - soft * 0.5, edge + soft, n);
  dens *= smoothstep(0.02, 0.3, uv.y);

  float light = clamp(0.62 + (n - above) * 7.0, 0.0, 1.0);
  light *= mix(1.0, 0.8, smoothstep(edge + 0.04, edge + 0.3, n));
  light = mix(light, pow(light, 1.5), uNight);

  vec3 sky = mix(uBottom, uTop, smoothstep(0.0, 1.0, pow(uv.y, 0.8)));
  vec2 moon = (uv - vec2(0.8, 1.12)) * vec2(aspect, 1.0);
  float glow = exp(-length(moon) * 2.2);
  sky += uNight * glow * 0.12 * uCloud;

  vec3 cloud = mix(uShade, uCloud, light);
  cloud += uNight * glow * 0.35 * light * uCloud;
  float haze = pow(1.0 - uv.y, 2.2);
  cloud = mix(cloud, uBottom, haze * 0.55);

  vec3 color = mix(sky, cloud, dens * 0.96);
  color += (hash(gl_FragCoord.xy + fract(t) * 91.7) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`;

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

function buildFallback() {
  const rng = createRng("drifting-clouds:fallback");
  const tops: string[] = [];
  const shades: string[] = [];
  const banks: [number, number, number][] = [
    [14, 20, 1],
    [72, 13, 1.1],
    [92, 42, 0.8],
    [30, 54, 0.75],
    [64, 66, 0.72],
    [10, 74, 0.6],
  ];
  for (const [cx, cy, size] of banks) {
    const puffs = rng.int(4, 6);
    const width = 22 * size;
    for (let k = 0; k < puffs; k++) {
      const t = puffs > 1 ? k / (puffs - 1) : 0.5;
      const x = cx + (t - 0.5) * width + rng.range(-2, 2) * size;
      const crown = Math.sin(t * Math.PI);
      const rx = rng.range(5.5, 8.5) * size * (0.75 + 0.35 * crown);
      const ry = rx * rng.range(1.15, 1.45) * (0.8 + 0.3 * crown);
      const y = cy - crown * ry * 0.35 + rng.range(-1, 1);
      tops.push(
        `radial-gradient(ellipse ${rx.toFixed(1)}% ${ry.toFixed(1)}% at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${CLOUD} 30%, transparent 70%)`,
      );
    }
    shades.push(
      `radial-gradient(ellipse ${(width * 0.62).toFixed(1)}% ${(9 * size).toFixed(1)}% at ${cx.toFixed(1)}% ${(cy + 6 * size).toFixed(1)}%, ${SHADE} 25%, transparent 72%)`,
    );
  }
  return { tops: tops.join(", "), shades: shades.join(", ") };
}

const FALLBACK = buildFallback();

export function DriftingClouds({
  speed = 1,
  coverage = 0.5,
  softness = 0.5,
  skyTop,
  skyBottom,
  cloudColor,
  className,
  style,
  children,
  ...props
}: DriftingCloudsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const cover = clamp(coverage, 0, 1);
  const soft = clamp(softness, 0, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!canvas || !fallback) return;

    const pace = Math.max(0, speed);
    const still = !!reduce;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let u: Record<string, WebGLUniformLocation | null> = {};
    let w = 0;
    let h = 0;
    let time = START;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let lost = false;

    const showFallback = (on: boolean) => {
      fallback.hidden = !on;
      canvas.style.visibility = on ? "hidden" : "";
    };

    const readColors = () => {
      if (!gl || !program) return;
      const set = (name: string, value: string) => {
        const [r, g, b] = toRgba(value, canvas);
        gl!.uniform3f(u[name], r, g, b);
      };
      gl.useProgram(program);
      set("uTop", TOP);
      set("uBottom", BOTTOM);
      set("uCloud", CLOUD);
      set("uShade", SHADE);
      gl.uniform1f(u.uNight, cssVar(NIGHT, canvas) === "1" ? 1 : 0);
    };

    const init = () => {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      if (!gl) return false;
      const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      if (!vs || !fs) return false;
      program = gl.createProgram();
      if (!program) return false;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      u = {};
      for (const name of ["uRes", "uTime", "uCover", "uSoft", "uNight", "uTop", "uBottom", "uCloud", "uShade"]) {
        u[name] = gl.getUniformLocation(program, name);
      }
      gl.uniform1f(u.uCover, cover);
      gl.uniform1f(u.uSoft, soft);
      readColors();
      return true;
    };

    const draw = () => {
      if (!gl || !program || lost || canvas.width < 2) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
      last = now;
      time += dt * pace;
      draw();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && pace > 0 && !lost && !!program;
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
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const scale = Math.min(dpr, Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h)));
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      draw();
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      showFallback(true);
      sync();
    };
    const onRestored = () => {
      lost = false;
      if (init()) {
        showFallback(false);
        draw();
      }
      sync();
    };

    if (!init()) {
      showFallback(true);
      return;
    }
    showFallback(false);

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      readColors();
      draw();
    });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      offTheme();
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [speed, cover, soft, reduce, skyTop, skyBottom, cloudColor]);

  const vars: Record<string, string> = {};
  if (skyTop) vars["--miyuki-drifting-clouds-top"] = skyTop;
  if (skyBottom) vars["--miyuki-drifting-clouds-bottom"] = skyBottom;
  if (cloudColor) vars["--miyuki-drifting-clouds-cloud"] = cloudColor;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-drifting-clouds-night:0] dark:[--miyuki-drifting-clouds-night:1]",
        "[--miyuki-drifting-clouds-top:color-mix(in_oklab,var(--brand)_40%,var(--background))]",
        "[--miyuki-drifting-clouds-bottom:color-mix(in_oklab,var(--brand)_5%,var(--background))]",
        "[--miyuki-drifting-clouds-cloud:color-mix(in_oklab,var(--chart-4)_6%,var(--card))]",
        "[--miyuki-drifting-clouds-shade:color-mix(in_oklab,var(--miyuki-drifting-clouds-cloud)_46%,color-mix(in_oklab,var(--brand)_38%,var(--muted-foreground)))]",
        "dark:[--miyuki-drifting-clouds-top:color-mix(in_oklab,var(--background)_76%,black)]",
        "dark:[--miyuki-drifting-clouds-bottom:color-mix(in_oklab,var(--brand)_16%,var(--background))]",
        "dark:[--miyuki-drifting-clouds-cloud:color-mix(in_oklab,var(--foreground)_58%,var(--background))]",
        "dark:[--miyuki-drifting-clouds-shade:color-mix(in_oklab,var(--brand)_8%,var(--background))]",
        className,
      )}
      style={{ ...vars, ...style } as CSSProperties}
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          ref={fallbackRef}
          className="absolute inset-0"
          style={{ backgroundImage: `linear-gradient(to bottom, ${TOP}, ${BOTTOM})` }}
        >
          <div className="absolute inset-0 opacity-90 blur-[14px]" style={{ backgroundImage: FALLBACK.shades }} />
          <div className="absolute inset-0 blur-[7px]" style={{ backgroundImage: FALLBACK.tops }} />
          <div
            className="absolute inset-x-0 bottom-0 h-1/3"
            style={{ backgroundImage: `linear-gradient(to top, ${BOTTOM}, transparent)` }}
          />
        </div>
        <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
      </div>
      {children}
    </div>
  );
}
