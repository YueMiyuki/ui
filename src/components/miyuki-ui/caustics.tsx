"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface CausticsProps extends ComponentProps<"div"> {
  speed?: number;
  scale?: number;
  intensity?: number;
  tint?: string;
}

const NIGHT = "--miyuki-caustics-night";
const WAVES = 10;
const UNIT = 64;
const STILL = 17.5;
const OWN_PRESS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";

type Vec3 = [number, number, number];

interface Look {
  floor: Vec3;
  light: Vec3;
  shade: Vec3;
  gain: number;
  knee: number;
  grain: number;
  soft: number;
}

interface Wave {
  dx: number;
  dy: number;
  k: number;
  a: number;
  c: number;
  p: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

function readLook(el: Element, tint: string, intensity: number): Look {
  const night = cssVar(NIGHT, el) === "1";
  const mix = (a: string, b: string, p: number) => rgb(`color-mix(in oklab, ${a} ${p}%, ${b})`, el);
  const k = clamp(intensity, 0, 1);
  if (night) {
    const water = `color-mix(in oklab, ${tint} 45%, var(--brand))`;
    const floor = mix(water, "var(--background)", 24);
    const silver = mix("var(--foreground)", water, 70);
    return {
      floor,
      light: [silver[0] - floor[0], silver[1] - floor[1], silver[2] - floor[2]],
      shade: [floor[0] * 0.3, floor[1] * 0.3, floor[2] * 0.26],
      gain: 0.7 * k,
      knee: 3.4,
      grain: 0.028,
      soft: 0.26,
    };
  }
  const floor = mix(tint, "var(--card)", 17);
  const bright = mix(tint, "white", 2);
  const deep = mix(tint, "var(--card)", 31);
  return {
    floor,
    light: [bright[0] - floor[0], bright[1] - floor[1], bright[2] - floor[2]],
    shade: [floor[0] - deep[0], floor[1] - deep[1], floor[2] - deep[2]],
    gain: 1.15 * k,
    knee: 2.8,
    grain: 0.04,
    soft: 0.2,
  };
}

function buildWaves(scale: number): { waves: Wave[]; focus: number; flow: number } {
  const rng = createRng("caustics:waves");
  const flow = rng.range(-0.4, 0.4);
  const waves: Wave[] = [];
  let curv = 0;
  for (let i = 0; i < WAVES; i++) {
    const angle = flow + i * 2.39996 + rng.range(-0.35, 0.35);
    const lambda = UNIT * Math.max(0.2, scale) * (0.75 + 2.2 * rng() ** 1.4);
    const k = (Math.PI * 2) / lambda;
    const a = (lambda / UNIT) ** 1.65;
    waves.push({
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      k,
      a,
      c: (8 + 9 * Math.sqrt(lambda / UNIT)) * rng.range(0.85, 1.15),
      p: rng() * Math.PI * 2,
    });
    curv += (a * a * k ** 4) / 2;
  }
  return { waves, focus: 1.3 / Math.sqrt(curv), flow };
}

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec2 u_view;
uniform vec2 u_shift;
uniform vec4 u_wave[${WAVES}];
uniform float u_phase[${WAVES}];
uniform float u_focus;
uniform vec4 u_bump;
uniform vec3 u_floor;
uniform vec3 u_light;
uniform vec3 u_shade;
uniform vec4 u_tone;
out vec4 o;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec2 grad(vec2 p) {
  vec2 q = p - u_shift;
  vec2 g = vec2(0.0);
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 w = u_wave[i];
    g += w.w * w.z * w.xy * cos(w.z * dot(w.xy, q) - u_phase[i]);
  }
  vec2 d = p - u_bump.xy;
  float r2 = u_bump.w * u_bump.w;
  g += -2.0 * u_bump.z * d / r2 * exp(-dot(d, d) / r2);
  return g;
}

vec3 hess(vec2 p) {
  vec2 q = p - u_shift;
  vec3 h = vec3(0.0);
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 w = u_wave[i];
    float s = -w.w * w.z * w.z * sin(w.z * dot(w.xy, q) - u_phase[i]);
    h += s * vec3(w.x * w.x, w.y * w.y, w.x * w.y);
  }
  vec2 d = p - u_bump.xy;
  float r2 = u_bump.w * u_bump.w;
  float e = 2.0 * u_bump.z * exp(-dot(d, d) / r2) / r2;
  h += e * vec3(2.0 * d.x * d.x / r2 - 1.0, 2.0 * d.y * d.y / r2 - 1.0, 2.0 * d.x * d.y / r2);
  return h;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) * (u_view / u_res);
  vec2 s = p + u_focus * grad(p);
  vec3 H = hess(s) * u_focus;
  float det = (1.0 - H.x) * (1.0 - H.y) - H.z * H.z;
  float I = 1.0 / sqrt(det * det + u_tone.w * u_tone.w);
  float knee = u_tone.y;
  float t = I / (1.0 + I / knee);
  float mid = 1.0 / (1.0 + 1.0 / knee);
  float d = t - mid;
  float wash = vnoise(p / 380.0) * 0.6 + vnoise(p / 150.0 + 7.0) * 0.4;
  vec3 col = u_floor * (0.97 + 0.06 * wash);
  col += u_light * max(d, 0.0) * u_tone.x / (knee - mid);
  col -= u_shade * clamp(-d / mid, 0.0, 1.0) * u_tone.x;
  col += (hash(floor(p * 1.5)) - 0.5) * u_tone.z;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
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

interface Frame {
  waves: Wave[];
  phases: Float32Array;
  shift: [number, number];
  focus: number;
  bump: [number, number, number, number];
  look: Look;
}

interface Renderer {
  resize(w: number, h: number, ratio: number): void;
  draw(frame: Frame): void;
  dispose(): void;
}

function createGl(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, alpha: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: U("u_res"),
    view: U("u_view"),
    shift: U("u_shift"),
    wave: U("u_wave"),
    phase: U("u_phase"),
    focus: U("u_focus"),
    bump: U("u_bump"),
    floor: U("u_floor"),
    light: U("u_light"),
    shade: U("u_shade"),
    tone: U("u_tone"),
  };
  const waveData = new Float32Array(WAVES * 4);
  let viewW = 1;
  let viewH = 1;

  return {
    resize(w, h, ratio) {
      viewW = w;
      viewH = h;
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw(frame) {
      if (gl.isContextLost()) return;
      for (let i = 0; i < WAVES; i++) {
        const wv = frame.waves[i];
        waveData[i * 4] = wv.dx;
        waveData[i * 4 + 1] = wv.dy;
        waveData[i * 4 + 2] = wv.k;
        waveData[i * 4 + 3] = wv.a;
      }
      const k = frame.look;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform2f(u.view, viewW, viewH);
      gl.uniform2f(u.shift, frame.shift[0], frame.shift[1]);
      gl.uniform4fv(u.wave, waveData);
      gl.uniform1fv(u.phase, frame.phases);
      gl.uniform1f(u.focus, frame.focus);
      gl.uniform4f(u.bump, frame.bump[0], frame.bump[1], frame.bump[2], frame.bump[3]);
      gl.uniform3fv(u.floor, k.floor);
      gl.uniform3fv(u.light, k.light);
      gl.uniform3fv(u.shade, k.shade);
      gl.uniform4f(u.tone, k.gain, k.knee, k.grain, k.soft);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function create2d(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const small = document.createElement("canvas");
  const sctx = small.getContext("2d");
  if (!sctx) return null;
  const CELL = 4;
  let cols = 1;
  let rows = 1;
  let image: ImageData | null = null;
  let grain = new Float32Array(0);
  let wNow = 1;
  let hNow = 1;
  const hv: [number, number, number] = [0, 0, 0];

  const grad = (f: Frame, x: number, y: number, out: [number, number]) => {
    const qx = x - f.shift[0];
    const qy = y - f.shift[1];
    let gx = 0;
    let gy = 0;
    for (let n = 0; n < WAVES; n++) {
      const wv = f.waves[n];
      const c = wv.a * wv.k * Math.cos(wv.k * (wv.dx * qx + wv.dy * qy) - f.phases[n]);
      gx += c * wv.dx;
      gy += c * wv.dy;
    }
    const dx = x - f.bump[0];
    const dy = y - f.bump[1];
    const r2 = f.bump[3] * f.bump[3];
    const e = (-2 * f.bump[2] * Math.exp(-(dx * dx + dy * dy) / r2)) / r2;
    out[0] = gx + e * dx;
    out[1] = gy + e * dy;
  };

  const hess = (f: Frame, x: number, y: number) => {
    const qx = x - f.shift[0];
    const qy = y - f.shift[1];
    let hxx = 0;
    let hyy = 0;
    let hxy = 0;
    for (let n = 0; n < WAVES; n++) {
      const wv = f.waves[n];
      const s = -wv.a * wv.k * wv.k * Math.sin(wv.k * (wv.dx * qx + wv.dy * qy) - f.phases[n]);
      hxx += s * wv.dx * wv.dx;
      hyy += s * wv.dy * wv.dy;
      hxy += s * wv.dx * wv.dy;
    }
    const dx = x - f.bump[0];
    const dy = y - f.bump[1];
    const r2 = f.bump[3] * f.bump[3];
    const e = (2 * f.bump[2] * Math.exp(-(dx * dx + dy * dy) / r2)) / r2;
    hv[0] = hxx + e * ((2 * dx * dx) / r2 - 1);
    hv[1] = hyy + e * ((2 * dy * dy) / r2 - 1);
    hv[2] = hxy + (e * 2 * dx * dy) / r2;
  };

  return {
    resize(w, h, ratio) {
      wNow = w;
      hNow = h;
      cols = Math.max(2, Math.ceil(w / CELL));
      rows = Math.max(2, Math.ceil(h / CELL));
      small.width = cols;
      small.height = rows;
      image = sctx.createImageData(cols, rows);
      grain = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grain[j * cols + i] = hash2(i, j) - 0.5;
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
    },
    draw(frame) {
      if (!image) return;
      const data = image.data;
      const { focus, look } = frame;
      const knee = look.knee;
      const mid = 1 / (1 + 1 / knee);
      const g: [number, number] = [0, 0];
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * (hNow / rows);
        for (let i = 0; i < cols; i++) {
          const x = (i + 0.5) * (wNow / cols);
          grad(frame, x, y, g);
          hess(frame, x + focus * g[0], y + focus * g[1]);
          const a = focus * hv[0];
          const b = focus * hv[1];
          const c = focus * hv[2];
          const det = (1 - a) * (1 - b) - c * c;
          const I = 1 / Math.sqrt(det * det + look.soft * look.soft);
          const t = I / (1 + I / knee);
          const d = t - mid;
          const up = (Math.max(d, 0) * look.gain) / (knee - mid);
          const down = clamp(-d / mid, 0, 1) * look.gain;
          const n = grain[j * cols + i] * look.grain;
          const o = (j * cols + i) * 4;
          data[o] = clamp(look.floor[0] + look.light[0] * up - look.shade[0] * down + n, 0, 1) * 255;
          data[o + 1] = clamp(look.floor[1] + look.light[1] * up - look.shade[1] * down + n, 0, 1) * 255;
          data[o + 2] = clamp(look.floor[2] + look.light[2] * up - look.shade[2] * down + n, 0, 1) * 255;
          data[o + 3] = 255;
        }
      }
      sctx.putImageData(image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, cols, rows, 0, 0, canvas.width, canvas.height);
    },
    dispose() {},
  };
}

export function Caustics({
  speed = 1,
  scale = 1,
  intensity = 0.6,
  tint = "color-mix(in oklab, var(--chart-2) 55%, var(--brand))",
  className,
  style,
  children,
  ...props
}: CausticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    if (!canvas || !root) return;

    const still = !!reduce;
    const pace = Math.max(0, speed);
    const { waves, focus, flow } = buildWaves(scale);
    const drift = 7 * Math.max(0.2, scale);
    const glr = createGl(canvas);
    let renderer = glr ?? create2d(canvas);
    if (!renderer) {
      canvas.style.display = "none";
      return;
    }
    const soft = !glr;

    const phases = new Float32Array(WAVES);
    const bump: [number, number, number, number] = [-9999, -9999, 0, 120];
    const shift: [number, number] = [0, 0];
    const pointer = { x: 0, y: 0, on: 0, target: 0, has: false };
    let look = readLook(canvas, tint, intensity);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let time = still ? STILL : 0;
    let last = 0;
    let lastDraw = -1;
    let raf = 0;
    let onScreen = false;

    const draw = () => {
      if (!renderer || w === 0 || h === 0) return;
      for (let i = 0; i < WAVES; i++) {
        const wv = waves[i];
        phases[i] = wv.k * wv.c * time + wv.p;
      }
      const depth = 0.6 / (focus * (2 / (bump[3] * bump[3])));
      bump[0] = pointer.x;
      bump[1] = pointer.y;
      bump[2] = -depth * pointer.on;
      shift[0] = Math.cos(flow) * drift * time;
      shift[1] = Math.sin(flow) * drift * time;
      renderer.draw({ waves, phases, shift, focus, bump, look });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt * pace;
      pointer.on += (pointer.target - pointer.on) * (1 - Math.exp(-dt * 2.2));
      if (soft && time - lastDraw < 1 / 30) return;
      lastDraw = time;
      draw();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && pace > 0;
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
      if (w === 0 || h === 0) return;
      renderer?.resize(w, h, soft ? dpr : Math.min(dpr, 1.5));
      draw();
    };

    const onMove = (event: PointerEvent) => {
      if (still) return;
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      if (event.pointerType === "mouse" || event.type === "pointerdown") pointer.target = 1;
      if (event.type === "pointerdown" && (event.target as Element | null)?.closest(OWN_PRESS)) pointer.target = 0;
    };
    const onLeave = (event: PointerEvent) => {
      if (event.type === "pointerleave" || event.pointerType !== "mouse") pointer.target = 0;
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      renderer = null;
      canvas.style.visibility = "hidden";
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      look = readLook(canvas, tint, intensity);
      draw();
    });
    canvas.addEventListener("webglcontextlost", onLost);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerup", onLeave);
    root.addEventListener("pointercancel", onLeave);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      canvas.removeEventListener("webglcontextlost", onLost);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerup", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      renderer?.dispose();
    };
  }, [speed, scale, intensity, tint, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-caustics-night:0] dark:[--miyuki-caustics-night:1]",
        className,
      )}
      style={
        {
          "--miyuki-caustics-tint": tint,
          backgroundColor: "color-mix(in oklab, var(--miyuki-caustics-tint) 15%, var(--card))",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <canvas ref={canvasRef} className="block size-full" />
      </div>
      {children}
    </div>
  );
}
