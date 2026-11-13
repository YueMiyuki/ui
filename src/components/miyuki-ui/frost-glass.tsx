"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface FrostGlassProps extends ComponentProps<"div"> {
  radius?: number;
  refreeze?: number;
  density?: number;
}

const NIGHT = "--miyuki-frost-glass-night";
const CELL = 5;
const GROW = 1.5;
const INTRO = 13;
const SEED = "frost-glass";
const DIRS: [number, number, number][] = [
  [-1, 0, Math.PI],
  [1, 0, 0],
  [0, -1, -Math.PI / 2],
  [0, 1, Math.PI / 2],
  [-1, -1, (-3 * Math.PI) / 4],
  [1, -1, -Math.PI / 4],
  [-1, 1, (3 * Math.PI) / 4],
  [1, 1, Math.PI / 4],
];

type Vec3 = [number, number, number];

interface Look {
  ice: Vec3;
  edge: Vec3;
  glint: Vec3;
  body: number;
  edgeAmt: number;
  glow: number;
  sparkle: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

function readLook(el: Element): Look {
  const night = cssVar(NIGHT, el) === "1";
  if (night) {
    return {
      ice: rgb(
        "color-mix(in oklab, color-mix(in oklab, var(--foreground) 72%, var(--background)) 80%, var(--brand))",
        el,
      ),
      edge: rgb("color-mix(in oklab, var(--brand) 70%, var(--foreground))", el),
      glint: rgb("color-mix(in oklab, var(--foreground) 85%, var(--brand))", el),
      body: 0.42,
      edgeAmt: 0,
      glow: 0.3,
      sparkle: 1,
    };
  }
  return {
    ice: rgb("color-mix(in oklab, var(--brand) 7%, var(--card))", el),
    edge: rgb("color-mix(in oklab, var(--brand) 55%, var(--foreground))", el),
    glint: rgb("var(--card)", el),
    body: 0.72,
    edgeAmt: 0.34,
    glow: 0,
    sparkle: 0.9,
  };
}

function makeNoise(seed: string) {
  const rng = createRng(seed);
  const table = new Float32Array(512);
  for (let i = 0; i < 512; i++) table[i] = rng();
  const at = (x: number, y: number) => table[((x & 255) + ((y * 57) & 255)) & 511];
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

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_frost;
uniform sampler2D u_vein;
uniform vec2 u_size;
uniform vec2 u_grid;
uniform float u_time;
uniform vec3 u_ice;
uniform vec3 u_edge;
uniform vec3 u_glint;
uniform vec4 u_look;
uniform float u_density;
in vec2 v_uv;
out vec4 o;

vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}

vec4 bicubic(sampler2D tex, vec2 uv) {
  vec2 size = vec2(textureSize(tex, 0));
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec4 s0 = texture(tex, off.xz);
  vec4 s1 = texture(tex, off.yz);
  vec4 s2 = texture(tex, off.xw);
  vec4 s3 = texture(tex, off.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float crystals(vec2 px, float theta, float size, float weight) {
  float best = 0.0;
  vec2 g = floor(px / size);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = g + vec2(float(i), float(j));
      float h1 = hash(c);
      float h2 = hash(c + 7.1);
      float h3 = hash(c + 3.7);
      float h4 = hash(c + 11.3);
      vec2 o = (c + vec2(h1, h2)) * size;
      float a = theta + (h3 - 0.5) * 0.45 + (h4 > 0.7 ? 1.0472 : (h4 < 0.3 ? -1.0472 : 0.0));
      vec2 d = vec2(cos(a), sin(a));
      float len = size * (0.45 + 0.8 * h3);
      float w = (0.5 + 0.45 * h2) * weight;
      float d0 = segment(px, o - d * len, o + d * len);
      best = max(best, exp(-d0 * d0 / (w * w)) * (0.55 + 0.45 * h1));
      vec2 m = o + d * len * (h1 - 0.5) * 1.4;
      float b = a + (h2 > 0.5 ? 1.0472 : -1.0472);
      float d1 = segment(px, m, m + vec2(cos(b), sin(b)) * len * 0.5);
      best = max(best, exp(-d1 * d1 / (w * w * 0.55)) * 0.6);
    }
  }
  return best;
}

void main() {
  vec2 px = v_uv * u_size;
  vec2 uv = px / u_grid;
  float f = bicubic(u_frost, uv).r;
  vec4 field = bicubic(u_vein, uv);
  float vein = field.r;
  float theta = 0.5 * atan(field.b * 2.0 - 1.0, field.g * 2.0 - 1.0);
  float needles = max(crystals(px, theta, 18.0, 1.0), 0.55 * crystals(px + 31.0, theta + 0.5, 8.0, 0.45));
  float grain = noise(px / 1.5);
  float fuzz = noise(px / 6.0 + 2.7);
  float n = 0.72 - 0.3 * vein - 0.26 * needles + 0.1 * (fuzz - 0.5) + 0.05 * (grain - 0.5);
  float cover = smoothstep(n - 0.018, n + 0.018, f);
  float inner = smoothstep(n, n + 0.3, f);
  float band = cover * (1.0 - smoothstep(0.0, 0.06, f - n));
  float body = u_look.x * u_density * (0.5 + 0.32 * needles + 0.12 * vein + 0.12 * (fuzz - 0.5) + 0.08 * (grain - 0.5));
  float a = cover * body * (0.62 + 0.38 * inner);
  vec3 col = u_ice * a;
  float ea = band * u_look.y * u_density;
  col = col * (1.0 - ea) + u_edge * ea;
  a = a + ea * (1.0 - a);
  col += u_glint * band * u_look.z * 0.55;
  col += u_glint * cover * needles * u_look.z * 0.22;
  float feather = needles;
  vec2 cell = floor(px / 7.0);
  float hs = hash(cell + 17.0);
  if (hs > 0.94) {
    vec2 center = (cell + 0.25 + 0.5 * vec2(hash(cell + 3.0), hash(cell + 9.0))) * 7.0;
    vec2 d = px - center;
    float tw = pow(max(0.0, sin(u_time * (0.5 + hs * 1.6) + hs * 80.0)), 14.0);
    float spark = exp(-dot(d, d) * 1.4) + 0.45 * exp(-(d.x * d.x * 0.12 + d.y * d.y * 5.0)) + 0.45 * exp(-(d.y * d.y * 0.12 + d.x * d.x * 5.0));
    float where = cover * clamp(0.25 + band * 2.5 + feather, 0.0, 1.0);
    col += u_glint * spark * tw * where * u_look.w;
  }
  o = vec4(min(col, vec3(1.0)), clamp(a, 0.0, 1.0));
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

interface Renderer {
  veins(data: Uint8Array, cols: number, rows: number): void;
  draw(
    frost: Uint8Array,
    cols: number,
    rows: number,
    w: number,
    h: number,
    time: number,
    look: Look,
    density: number,
  ): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, alpha: true });
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
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const texture = (unit: number) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const frostTex = texture(0);
  const veinTex = texture(1);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc2 = {
    frost: u("u_frost"),
    vein: u("u_vein"),
    size: u("u_size"),
    grid: u("u_grid"),
    time: u("u_time"),
    ice: u("u_ice"),
    edge: u("u_edge"),
    glint: u("u_glint"),
    look: u("u_look"),
    density: u("u_density"),
  };
  gl.uniform1i(loc2.frost, 0);
  gl.uniform1i(loc2.vein, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let fw = 0;
  let fh = 0;

  return {
    veins(data, cols, rows) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, veinTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    },
    draw(frost, cols, rows, w, h, time, look, density) {
      if (gl.isContextLost()) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frostTex);
      if (cols !== fw || rows !== fh) {
        fw = cols;
        fh = rows;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, frost);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RED, gl.UNSIGNED_BYTE, frost);
      }
      gl.uniform2f(loc2.size, w, h);
      gl.uniform2f(loc2.grid, cols * CELL, rows * CELL);
      gl.uniform1f(loc2.time, time);
      gl.uniform3fv(loc2.ice, look.ice);
      gl.uniform3fv(loc2.edge, look.edge);
      gl.uniform3fv(loc2.glint, look.glint);
      gl.uniform4f(loc2.look, look.body, look.edgeAmt, look.glow, look.sparkle);
      gl.uniform1f(loc2.density, density);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize(width, height) {
      gl.viewport(0, 0, width, height);
    },
    dispose() {
      gl.deleteTexture(frostTex);
      gl.deleteTexture(veinTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

export function FrostGlass({
  radius = 44,
  refreeze = 3500,
  density = 0.85,
  className,
  children,
  ...props
}: FrostGlassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const blur = blurRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !blur || !root) return;

    const still = !!reduce;
    const thick = clamp(density, 0, 1);
    const wipe = Math.max(8, radius);
    const wait = Math.max(0, refreeze) / 1000;
    const renderer = createRenderer(canvas);
    root.style.setProperty("--miyuki-frost-glass-tint", renderer ? "1" : "1.6");
    if (!renderer) canvas.style.display = "none";

    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");
    const noise = makeNoise(SEED);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let stride = 0;
    let frost = new Float32Array(0);
    let spare = new Float32Array(0);
    let hold = new Float32Array(0);
    let speed = new Float32Array(0);
    let weight = new Float32Array(0);
    let bytes = new Uint8Array(0);
    let image: ImageData | null = null;
    let look = readLook(canvas);

    let time = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let started = still;
    let intro = false;
    let focused = false;
    let busy = true;
    let lastPaint = 0;
    let maskUrl = "";
    const pointer = { x: 0, y: 0, has: false };

    const layout = () => {
      cols = Math.ceil(w / CELL) + 1;
      rows = Math.ceil(h / CELL) + 1;
      stride = cols + 2;
      const n = stride * (rows + 2);
      frost = new Float32Array(n);
      spare = new Float32Array(n);
      hold = new Float32Array(n);
      speed = new Float32Array(n);
      bytes = new Uint8Array(cols * rows);
      weight = new Float32Array(n * 8);
      const veins = new Uint8Array(cols * rows * 4);
      const jitter = createRng(`${SEED}:jitter`);
      const gw = cols * CELL;
      const gh = rows * CELL;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * CELL;
          const py = y * CELL;
          const wx = px + 30 * (noise(px / 90, py / 90) - 0.5);
          const wy = py + 30 * (noise(px / 90 + 7.3, py / 90 + 2.1) - 0.5);
          const a = 1 - Math.abs(noise(wx / 46, wy / 46) * 2 - 1);
          const b = 1 - Math.abs(noise(wx / 19 + 11, wy / 19 + 4) * 2 - 1);
          const v = clamp(a ** 3 * 0.7 + b ** 4 * 0.45, 0, 1);
          const cx = px < gw / 2 ? 0 : gw;
          const cy = py < gh / 2 ? 0 : gh;
          const theta = Math.atan2(py - cy, px - cx) + (noise(px / 70 + 3.3, py / 70 + 9.1) - 0.5) * 2.2;
          const o = (y * cols + x) * 4;
          veins[o] = Math.round(v * 255);
          veins[o + 1] = Math.round((Math.cos(2 * theta) * 0.5 + 0.5) * 255);
          veins[o + 2] = Math.round((Math.sin(2 * theta) * 0.5 + 0.5) * 255);
          veins[o + 3] = 255;
          const i = (y + 1) * stride + x + 1;
          speed[i] = 0.45 + 2.1 * v * v + 0.4 * jitter();
          for (let k = 0; k < 8; k++) {
            const c = Math.cos(DIRS[k][2] - theta);
            const c2 = c * c;
            weight[i * 8 + k] = (0.64 + 0.36 * c2 * c2) * (k < 4 ? 1 : 0.74);
          }
        }
      }
      renderer?.veins(veins, cols, rows);
      if (started) frost.fill(1);
      mask.width = cols;
      mask.height = rows;
      image = mctx ? mctx.createImageData(cols, rows) : null;
      blur.style.maskSize = `${cols * CELL}px ${rows * CELL}px`;
      blur.style.setProperty("-webkit-mask-size", `${cols * CELL}px ${rows * CELL}px`);
      setBoundary();
      busy = true;
    };

    const setBoundary = () => {
      const corner = Math.max(3, Math.round(Math.min(cols, rows) * 0.16));
      for (let y = 0; y < rows + 2; y++) {
        for (let x = 0; x < cols + 2; x++) {
          if (x > 0 && y > 0 && x < cols + 1 && y < rows + 1) continue;
          let v = 1;
          if (intro) {
            const nearX = Math.min(x, cols + 1 - x);
            const nearY = Math.min(y, rows + 1 - y);
            v = nearX < corner && nearY < corner ? 1 : 0;
          } else if (focused) {
            v = 0;
          }
          frost[y * stride + x] = v;
          spare[y * stride + x] = v;
        }
      }
    };

    const begin = () => {
      if (started || cols === 0) return;
      started = true;
      intro = true;
      setBoundary();
      busy = true;
      wake();
    };

    const grow = (dt: number) => {
      let changed = false;
      let pending = false;
      if (focused) {
        const k = Math.exp(-dt * 14);
        for (let y = 1; y <= rows; y++) {
          for (let x = 1; x <= cols; x++) {
            const i = y * stride + x;
            if (frost[i] > 0.002) {
              frost[i] *= k;
              changed = true;
            } else frost[i] = 0;
          }
        }
        return changed;
      }
      const rate = (intro ? GROW * INTRO : GROW) * dt;
      for (let y = 1; y <= rows; y++) {
        for (let x = 1; x <= cols; x++) {
          const i = y * stride + x;
          const f = frost[i];
          spare[i] = f;
          if (f >= 1) continue;
          if (time < hold[i]) {
            pending = true;
            continue;
          }
          if (still) {
            spare[i] = Math.min(1, f + dt * 4);
            changed = true;
            continue;
          }
          const b = i * 8;
          const src = Math.max(
            frost[i - 1] * weight[b],
            frost[i + 1] * weight[b + 1],
            frost[i - stride] * weight[b + 2],
            frost[i + stride] * weight[b + 3],
            frost[i - stride - 1] * weight[b + 4],
            frost[i - stride + 1] * weight[b + 5],
            frost[i + stride - 1] * weight[b + 6],
            frost[i + stride + 1] * weight[b + 7],
          );
          pending = true;
          if (src < 0.32) continue;
          const nf = Math.min(1, f + rate * speed[i] * (src - 0.26));
          spare[i] = nf;
          changed = true;
        }
      }
      const t = frost;
      frost = spare;
      spare = t;
      if (intro && !pending) {
        intro = false;
        setBoundary();
      }
      return changed;
    };

    const scrape = (x0: number, y0: number, x1: number, y1: number) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(len / (CELL * 0.8)));
      const r = wipe / CELL;
      const reach = Math.ceil(r);
      const until = time + wait;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = (x0 + dx * t) / CELL + 1;
        const cy = (y0 + dy * t) / CELL + 1;
        const ax = Math.max(1, Math.floor(cx - reach));
        const bx = Math.min(cols, Math.ceil(cx + reach));
        const ay = Math.max(1, Math.floor(cy - reach));
        const by = Math.min(rows, Math.ceil(cy + reach));
        for (let y = ay; y <= by; y++) {
          for (let x = ax; x <= bx; x++) {
            const d = Math.hypot(x - cx, y - cy) / r;
            if (d >= 1) continue;
            const k = d < 0.55 ? 1 : 1 - (d - 0.55) / 0.45;
            const clear = k * k * (3 - 2 * k);
            const i = y * stride + x;
            const next = Math.min(frost[i], 1 - clear);
            frost[i] = next;
            if (clear > 0.15) hold[i] = Math.max(hold[i], until + (1 - clear) * 0.25);
          }
        }
      }
      busy = true;
      wake();
    };

    const paintMask = () => {
      let o = 0;
      for (let y = 1; y <= rows; y++) {
        for (let x = 1; x <= cols; x++) {
          const f = frost[y * stride + x];
          bytes[o] = Math.round(f * 255);
          if (image) {
            const m = clamp((f - 0.12) / 0.55, 0, 1);
            const p = o * 4;
            image.data[p] = 255;
            image.data[p + 1] = 255;
            image.data[p + 2] = 255;
            image.data[p + 3] = Math.round(m * m * (3 - 2 * m) * 255);
          }
          o++;
        }
      }
      if (!mctx || !image) return;
      mctx.putImageData(image, 0, 0);
      const url = `url(${mask.toDataURL()})`;
      if (url === maskUrl) return;
      maskUrl = url;
      blur.style.maskImage = url;
      blur.style.setProperty("-webkit-mask-image", url);
    };

    const draw = () => {
      if (cols === 0) return;
      paintMask();
      renderer?.draw(bytes, cols, rows, w, h, time, look, thick);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt;
      if (started) busy = grow(dt) || busy;
      if (busy) {
        draw();
        busy = false;
        lastPaint = time;
      } else if (renderer && !still && time - lastPaint > 1 / 24) {
        renderer.draw(bytes, cols, rows, w, h, time, look, thick);
        lastPaint = time;
      }
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (onScreen && !document.hidden) {
        begin();
        wake();
      } else if (raf) {
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
      renderer?.resize(canvas.width, canvas.height);
      if (w === 0 || h === 0) return;
      layout();
      draw();
    };

    const local = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      if (!started || cols === 0) return;
      const [x, y] = local(event);
      if (!pointer.has) {
        pointer.has = true;
        pointer.x = x;
        pointer.y = y;
      }
      scrape(pointer.x, pointer.y, x, y);
      pointer.x = x;
      pointer.y = y;
    };

    const onLeave = () => {
      pointer.has = false;
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target?.matches(":focus-visible")) return;
      focused = true;
      intro = false;
      started = true;
      setBoundary();
      if (still) {
        frost.fill(0);
        setBoundary();
      }
      busy = true;
      wake();
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!focused || root.contains(event.relatedTarget as Node | null)) return;
      focused = false;
      hold.fill(time + wait);
      setBoundary();
      busy = true;
      wake();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      look = readLook(canvas);
      busy = true;
      if (!raf) draw();
    });
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      renderer?.dispose();
    };
  }, [radius, refreeze, density, reduce]);

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label="Frosted glass"
      className={cn(
        "relative isolate touch-pan-y overflow-clip rounded-2xl bg-muted shadow-md outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring",
        "[--miyuki-frost-glass-night:0] dark:[--miyuki-frost-glass-night:1]",
        className,
      )}
      {...props}
    >
      {children}
      <div
        ref={blurRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 [mask-repeat:no-repeat] [mask-position:0_0]",
          "backdrop-blur-[9px] backdrop-saturate-[1.15]",
          "bg-[color-mix(in_oklab,var(--card)_calc(26%*var(--miyuki-frost-glass-tint,1)),transparent)]",
          "dark:bg-[color-mix(in_oklab,color-mix(in_oklab,var(--foreground)_55%,var(--brand))_calc(14%*var(--miyuki-frost-glass-tint,1)),transparent)]",
        )}
        style={{
          maskImage: "linear-gradient(transparent, transparent)",
          WebkitMaskImage: "linear-gradient(transparent, transparent)",
        }}
      />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_45%,transparent)] dark:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent),inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)]"
      />
    </div>
  );
}
