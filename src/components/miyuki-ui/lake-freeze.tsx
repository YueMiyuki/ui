"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

export interface LakeFreezeProps extends ComponentProps<"div"> {
  frozen?: boolean;
  speed?: number;
  seed?: number | string;
}

type Vec3 = [number, number, number];

const NIGHT = "--miyuki-lake-freeze-night";
const CELL = 3;
const MASK = 4;
const PLATES = 32;
const GROW = 3.8;
const MELT = 4.6;
const REFREEZE = 2.2;
const DONE = 1.08;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

interface Look {
  ice: Vec3;
  glint: Vec3;
  crack: Vec3;
  wet: Vec3;
  body: number;
  night: number;
}

function readLook(el: Element): Look {
  const night = cssVar(NIGHT, el) === "1";
  if (night) {
    return {
      ice: rgb(
        "color-mix(in oklab, color-mix(in oklab, var(--foreground) 62%, var(--brand)) 80%, var(--background))",
        el,
      ),
      glint: rgb("color-mix(in oklab, var(--foreground) 92%, var(--brand))", el),
      crack: rgb("color-mix(in oklab, var(--background) 70%, var(--brand))", el),
      wet: rgb("color-mix(in oklab, var(--background) 55%, var(--brand))", el),
      body: 0.3,
      night: 1,
    };
  }
  return {
    ice: rgb("color-mix(in oklab, var(--card) 86%, var(--brand))", el),
    glint: rgb("var(--card)", el),
    crack: rgb("color-mix(in oklab, var(--brand) 60%, var(--foreground))", el),
    wet: rgb("color-mix(in oklab, var(--brand) 55%, var(--card))", el),
    body: 0.46,
    night: 0,
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
uniform sampler2D u_arrive;
uniform sampler2D u_vein;
uniform vec2 u_size;
uniform vec2 u_grid;
uniform float u_grow;
uniform float u_melt;
uniform float u_fade;
uniform vec3 u_ice;
uniform vec3 u_glint;
uniform vec3 u_crack;
uniform vec3 u_wet;
uniform vec2 u_look;
uniform vec2 u_seed[${PLATES}];
uniform vec2 u_drift[${PLATES}];
uniform vec2 u_rate[${PLATES}];
uniform int u_count;
in vec2 v_uv;
out vec4 o;

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

float fine(vec2 p, float scale) {
  vec2 g = floor(p / scale);
  float f1 = 1e9;
  float f2 = 1e9;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = g + vec2(float(i), float(j));
      vec2 s = (c + vec2(hash(c), hash(c + 9.1))) * scale;
      float d = length(p - s);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

void main() {
  vec2 p = v_uv * u_size;
  float arrive = texture(u_arrive, (p / ${CELL.toFixed(1)} + 0.5) / u_grid).r;
  float grain = noise(p / 6.0) * 0.6 + noise(p / 2.2) * 0.4;
  float t = arrive + (grain - 0.5) * 0.03;
  vec3 vt = texture(u_vein, v_uv).rgb;
  float va = vt.b;
  float vtime = va > 0.03 ? vt.g / va : 9.0;
  float vint = va > 0.03 ? vt.r / va : 0.0;
  float fill = 1.0 - smoothstep(u_grow - 0.005, u_grow + 0.005, t);
  float needle = va * (1.0 - smoothstep(u_grow - 0.004, u_grow + 0.004, vtime));
  float cover = max(fill, needle * 0.95);
  if (cover < 0.004) { o = vec4(0.0); return; }

  float k = smoothstep(0.05, 0.55, u_melt);
  int owner = 0;
  float best = 1e9;
  for (int j = 0; j < ${PLATES}; j++) {
    if (j >= u_count) break;
    float d = length(p - (u_seed[j] + u_drift[j] * k));
    if (d < best) { best = d; owner = j; }
  }
  vec2 q = p - u_drift[owner] * k;
  vec2 si = u_seed[owner];
  float sum = 0.0;
  float hard = 1e9;
  for (int j = 0; j < ${PLATES}; j++) {
    if (j >= u_count) break;
    if (j == owner) continue;
    vec2 sj = u_seed[j];
    vec2 dir = normalize(sj - si);
    float e = -dot(q - (si + sj) * 0.5, dir);
    hard = min(hard, e);
    sum += exp(-0.32 * e);
  }
  float edge = min(-log(max(sum, 1e-6)) / 0.32, hard);

  float rate = u_rate[owner].x;
  float delay = u_rate[owner].y;
  float m = clamp(u_melt * rate - delay, 0.0, 1.0);
  float open = k * 1.6;
  float melt = open + m * m * 54.0 + (noise(p / 4.5) - 0.5) * 6.0 * smoothstep(0.0, 0.08, m);
  float plate = u_melt > 0.0 ? smoothstep(melt - 0.7, melt + 0.7, edge) : 1.0;
  float wet = u_melt > 0.0 ? plate * (1.0 - smoothstep(melt, melt + 3.5, edge)) * smoothstep(0.0, 0.1, u_melt) : 0.0;

  float formed = smoothstep(0.1, 0.32, u_grow - arrive) * (1.0 - smoothstep(0.0, 0.25, u_melt));
  float crack = exp(-hard * hard / 0.28) * formed;
  float crackShade = exp(-(hard - 0.9) * (hard - 0.9) / 0.35) * formed;
  float hair = fine(p + vec2(17.0, 3.0), 26.0);
  float hairMask = smoothstep(0.55, 0.75, noise(p / 40.0 + 3.0));
  float fineCrack = exp(-hair * hair / 0.35) * hairMask * formed * 0.7;

  float mottle = noise(p / 18.0) * 0.6 + noise(p / 7.0) * 0.4;
  float thin = 1.0 - 0.32 * smoothstep(0.0, 0.3, u_melt);
  float front = fill * (1.0 - smoothstep(0.0, 0.045, u_grow - t));

  vec2 cell = floor(p / 9.0);
  float hb = hash(cell + 31.0);
  float bubble = 0.0;
  if (hb > 0.9) {
    vec2 c = (cell + 0.2 + 0.6 * vec2(hash(cell + 3.0), hash(cell + 7.0))) * 9.0;
    float r = 0.6 + hash(cell + 11.0) * 1.1;
    bubble = 1.0 - smoothstep(r - 0.5, r + 0.5, length(p - c));
  }

  float fresh = 1.0 - smoothstep(0.0, 0.14, u_grow - vtime);
  float vein = needle * vint * (0.2 + 0.8 * fresh);
  float a = u_look.x * (0.72 + 0.28 * mottle) * thin;
  a += front * 0.22;
  a += vein * 0.25;
  a = clamp(a, 0.0, 1.0);
  vec3 col = u_ice * a;
  float shine = vein * (0.55 + 0.25 * u_look.y) + front * 0.35 + bubble * 0.55 * fill;
  col = mix(col, u_glint * max(a, shine), clamp(shine, 0.0, 1.0));
  a = max(a, shine * 0.9);
  float lines = clamp(crack + fineCrack, 0.0, 1.0);
  col = mix(col, u_glint * max(a, 0.8), lines * (0.7 - 0.2 * u_look.y));
  a = max(a, lines * 0.75);
  col = mix(col, u_crack * a, crackShade * 0.22);
  col = mix(col, u_wet * max(a, 0.5), wet * 0.55);
  a = max(a, wet * 0.5);

  float alpha = clamp(a * cover * plate * u_fade, 0.0, 1.0);
  o = vec4(col / max(a, 1e-4) * alpha, alpha);
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

interface Field {
  cols: number;
  rows: number;
  arrive: Float32Array;
  seeds: Float32Array;
  drift: Float32Array;
  rate: Float32Array;
  count: number;
}

interface Renderer {
  field(field: Field, vein: HTMLCanvasElement): void;
  draw(field: Field, w: number, h: number, grow: number, melt: number, fade: number, look: Look): void;
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
  const arriveTex = texture(0);
  const veinTex = texture(1);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const at = {
    arrive: u("u_arrive"),
    vein: u("u_vein"),
    size: u("u_size"),
    grid: u("u_grid"),
    grow: u("u_grow"),
    melt: u("u_melt"),
    fade: u("u_fade"),
    ice: u("u_ice"),
    glint: u("u_glint"),
    crack: u("u_crack"),
    wet: u("u_wet"),
    look: u("u_look"),
    seed: u("u_seed"),
    drift: u("u_drift"),
    rate: u("u_rate"),
    count: u("u_count"),
  };
  gl.uniform1i(at.arrive, 0);
  gl.uniform1i(at.vein, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return {
    field(field, vein) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, arriveTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, field.cols, field.rows, 0, gl.RED, gl.FLOAT, field.arrive);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, veinTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, vein);
      gl.uniform2fv(at.seed, field.seeds);
      gl.uniform2fv(at.drift, field.drift);
      gl.uniform2fv(at.rate, field.rate);
      gl.uniform1i(at.count, field.count);
    },
    draw(field, w, h, grow, melt, fade, look) {
      if (gl.isContextLost()) return;
      gl.uniform2f(at.size, w, h);
      gl.uniform2f(at.grid, field.cols, field.rows);
      gl.uniform1f(at.grow, grow);
      gl.uniform1f(at.melt, melt);
      gl.uniform1f(at.fade, fade);
      gl.uniform3fv(at.ice, look.ice);
      gl.uniform3fv(at.glint, look.glint);
      gl.uniform3fv(at.crack, look.crack);
      gl.uniform3fv(at.wet, look.wet);
      gl.uniform2f(at.look, look.body, look.night);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize(width, height) {
      gl.viewport(0, 0, width, height);
    },
    dispose() {
      gl.deleteTexture(arriveTex);
      gl.deleteTexture(veinTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

function buildField(w: number, h: number, seed: number | string, dpr: number) {
  const rng = createRng(`lake-freeze:${seed}:${Math.round(w)}x${Math.round(h)}`);
  const cols = Math.ceil(w / CELL) + 2;
  const rows = Math.ceil(h / CELL) + 2;
  const arrive = new Float32Array(cols * rows).fill(Infinity);
  const segs: number[] = [];
  const speeds = [1, 0.78, 0.6];
  const lateral = 0.2;

  const branch = (sx: number, sy: number, theta: number, t: number, len: number, depth: number) => {
    let x = sx;
    let y = sy;
    let a = theta;
    let time = t;
    let since = 0;
    let side = rng() < 0.5 ? 1 : -1;
    const step = 3;
    const gap = depth === 0 ? 8 + rng() * 7 : 6 + rng() * 5;
    for (let s = 0; s < len; s += step) {
      a += (rng() - 0.5) * (0.14 + depth * 0.1);
      const nx = x + Math.cos(a) * step;
      const ny = y + Math.sin(a) * step;
      if (nx < -2 || ny < -2 || nx > w + 2 || ny > h + 2) break;
      const nt = time + step / speeds[depth];
      segs.push(x, y, nx, ny, time, nt, depth);
      x = nx;
      y = ny;
      time = nt;
      since += step;
      if (depth < 2 && since > gap) {
        since = 0;
        const rest = len - s;
        const sideLen = rest * (depth === 0 ? rng.range(0.22, 0.42) : rng.range(0.25, 0.5));
        if (sideLen > 6) branch(x, y, a + side * (1.05 + (rng() - 0.5) * 0.25), time, sideLen, depth + 1);
        if (depth === 0 && rng() < 0.45 && sideLen > 10)
          branch(x, y, a - side * (1.05 + (rng() - 0.5) * 0.25), time + 2, sideLen * 0.8, depth + 1);
        side = -side;
      }
    }
  };

  const reach = Math.min(w, h);
  const edges: [number, number, number, number, number][] = [
    [0, 0, 1, 0, Math.PI / 2],
    [0, h, 1, 0, -Math.PI / 2],
    [0, 0, 0, 1, 0],
    [w, 0, 0, 1, Math.PI],
  ];
  for (const [ox, oy, dx, dy, inward] of edges) {
    const span = dx ? w : h;
    let at = rng() * 14;
    while (at < span) {
      const sx = ox + dx * at;
      const sy = oy + dy * at;
      const len = reach * rng.range(0.28, 0.62);
      branch(sx, sy, inward + (rng() - 0.5) * 0.9, rng() * 24, len, 0);
      at += 15 + rng() * 16;
    }
  }

  for (let i = 0; i < segs.length; i += 7) {
    const x0 = segs[i];
    const y0 = segs[i + 1];
    const x1 = segs[i + 2];
    const y1 = segs[i + 3];
    const t0 = segs[i + 4];
    const t1 = segs[i + 5];
    const depth = segs[i + 6];
    const r = depth === 0 ? 26 : depth === 1 ? 18 : 12;
    const c0 = Math.max(0, Math.floor((Math.min(x0, x1) - r) / CELL));
    const c1 = Math.min(cols - 1, Math.ceil((Math.max(x0, x1) + r) / CELL));
    const r0 = Math.max(0, Math.floor((Math.min(y0, y1) - r) / CELL));
    const r1 = Math.min(rows - 1, Math.ceil((Math.max(y0, y1) + r) / CELL));
    const ex = x1 - x0;
    const ey = y1 - y0;
    const ll = ex * ex + ey * ey || 1;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const px = col * CELL;
        const py = row * CELL;
        const u = clamp(((px - x0) * ex + (py - y0) * ey) / ll, 0, 1);
        const d = Math.hypot(px - x0 - ex * u, py - y0 - ey * u);
        if (d > r) continue;
        const v = t0 + (t1 - t0) * u + d / lateral;
        const k = row * cols + col;
        if (v < arrive[k]) arrive[k] = v;
      }
    }
  }

  let max = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = col * CELL;
      const py = row * CELL;
      const edge = Math.min(px, py, w - px, h - py);
      const k = row * cols + col;
      const v = Math.min(arrive[k], Math.max(0, edge) / 0.26 + 18);
      arrive[k] = v;
      if (v > max) max = v;
    }
  }
  for (let k = 0; k < arrive.length; k++) arrive[k] = arrive[k] / max;

  const vein = document.createElement("canvas");
  vein.width = Math.max(1, Math.round(w * dpr));
  vein.height = Math.max(1, Math.round(h * dpr));
  const g = vein.getContext("2d");
  if (g) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, vein.width, vein.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = "round";
    const widths = [1.15, 0.8, 0.55];
    const strength = [1, 0.72, 0.5];
    for (let i = 0; i < segs.length; i += 7) {
      const depth = segs[i + 6];
      const tn = clamp(segs[i + 4] / max, 0, 1);
      g.strokeStyle = `rgb(${Math.round(255 * strength[depth])}, ${Math.round(255 * tn)}, 255)`;
      g.lineWidth = widths[depth];
      g.beginPath();
      g.moveTo(segs[i], segs[i + 1]);
      g.lineTo(segs[i + 2], segs[i + 3]);
      g.stroke();
    }
  }

  const count = clamp(Math.round((w * h) / 5200), 8, PLATES);
  const seeds = new Float32Array(PLATES * 2);
  const drift = new Float32Array(PLATES * 2);
  const rate = new Float32Array(PLATES * 2);
  let n = 0;
  while (n < count) {
    let sx = 0;
    let sy = 0;
    let far = -1;
    for (let k = 0; k < 14; k++) {
      const cx = (rng() * 1.1 - 0.05) * w;
      const cy = (rng() * 1.1 - 0.05) * h;
      let near = Infinity;
      for (let j = 0; j < n; j++) near = Math.min(near, Math.hypot(cx - seeds[j * 2], cy - seeds[j * 2 + 1]));
      if (near > far) {
        far = near;
        sx = cx;
        sy = cy;
      }
    }
    {
      seeds[n * 2] = sx;
      seeds[n * 2 + 1] = sy;
      const dx = sx - w / 2;
      const dy = sy - h / 2;
      const l = Math.hypot(dx, dy) || 1;
      const push = 3 + rng() * 5;
      drift[n * 2] = (dx / l) * push + (rng() - 0.5) * 3;
      drift[n * 2 + 1] = (dy / l) * push + (rng() - 0.5) * 3;
      rate[n * 2] = 0.8 + rng() * 0.6;
      rate[n * 2 + 1] = rng() * 0.22;
      n++;
    }
  }
  for (let i = n; i < PLATES; i++) {
    seeds[i * 2] = -1e5;
    seeds[i * 2 + 1] = -1e5;
  }

  return { field: { cols, rows, arrive, seeds, drift, rate, count: n }, vein };
}

function coverage(field: Field, x: number, y: number, grow: number, melt: number) {
  const col = clamp(x / CELL, 0, field.cols - 1.001);
  const row = clamp(y / CELL, 0, field.rows - 1.001);
  const c = Math.floor(col);
  const r = Math.floor(row);
  const fx = col - c;
  const fy = row - r;
  const a = field.arrive;
  const i = r * field.cols + c;
  const t =
    (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + field.cols] * (1 - fx) + a[i + field.cols + 1] * fx) * fy;
  const fill = clamp((grow - t) / 0.02 + 0.5, 0, 1);
  if (fill <= 0 || melt <= 0) return fill;
  const k = clamp((melt - 0.05) / 0.5, 0, 1);
  const kk = k * k * (3 - 2 * k);
  let owner = 0;
  let best = Infinity;
  for (let j = 0; j < field.count; j++) {
    const d = Math.hypot(
      x - (field.seeds[j * 2] + field.drift[j * 2] * kk),
      y - (field.seeds[j * 2 + 1] + field.drift[j * 2 + 1] * kk),
    );
    if (d < best) {
      best = d;
      owner = j;
    }
  }
  const qx = x - field.drift[owner * 2] * kk;
  const qy = y - field.drift[owner * 2 + 1] * kk;
  const sx = field.seeds[owner * 2];
  const sy = field.seeds[owner * 2 + 1];
  let edge = Infinity;
  for (let j = 0; j < field.count; j++) {
    if (j === owner) continue;
    const tx = field.seeds[j * 2];
    const ty = field.seeds[j * 2 + 1];
    const dl = Math.hypot(tx - sx, ty - sy) || 1;
    const e = -((qx - (sx + tx) / 2) * (tx - sx) + (qy - (sy + ty) / 2) * (ty - sy)) / dl;
    if (e < edge) edge = e;
  }
  const m = clamp(melt * field.rate[owner * 2] - field.rate[owner * 2 + 1], 0, 1);
  const gone = kk * 1.6 + m * m * 54;
  return fill * clamp((edge - gone) / 1.4 + 0.5, 0, 1);
}

export function LakeFreeze({ frozen = false, speed = 1, seed = 1, className, children, ...props }: LakeFreezeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const want = useRef(frozen);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    want.current = frozen;
    kick.current();
  }, [frozen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const blur = blurRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !blur || !root) return;

    const still = !!reduce;
    const pace = Math.max(0.05, speed);
    const renderer = createRenderer(canvas);
    const flat = renderer ? null : canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let field: Field | null = null;
    let look = readLook(canvas);
    let grow = want.current ? DONE : 0;
    let melt = 0;
    let fade = still ? (want.current ? 1 : 0) : 1;
    let started = !want.current || still;
    let raf = 0;
    let last = 0;
    let onScreen = false;
    let lastMask = -1;
    let maskUrl = "";
    let flatImage: ImageData | null = null;

    const paintMask = (force: boolean) => {
      if (!field || !mctx) return;
      const now = performance.now();
      if (!force && now - lastMask < 48) return;
      lastMask = now;
      const mw = Math.ceil(w / MASK) + 1;
      const mh = Math.ceil(h / MASK) + 1;
      if (mask.width !== mw || mask.height !== mh) {
        mask.width = mw;
        mask.height = mh;
      }
      const image = mctx.createImageData(mw, mh);
      let any = 0;
      for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
          const c = still
            ? fade * (grow > 0 ? 1 : 0)
            : coverage(field, x * MASK, y * MASK, grow, melt) * (1 - 0.3 * clamp(melt / 0.3, 0, 1));
          const o = (y * mw + x) * 4;
          image.data[o] = 255;
          image.data[o + 1] = 255;
          image.data[o + 2] = 255;
          image.data[o + 3] = Math.round(c * 255);
          any += c;
        }
      }
      mctx.putImageData(image, 0, 0);
      const url = any > 0 ? `url(${mask.toDataURL()})` : "linear-gradient(transparent, transparent)";
      if (url === maskUrl) return;
      maskUrl = url;
      blur.style.maskImage = url;
      blur.style.setProperty("-webkit-mask-image", url);
      blur.style.maskSize = `${mw * MASK}px ${mh * MASK}px`;
      blur.style.setProperty("-webkit-mask-size", `${mw * MASK}px ${mh * MASK}px`);
    };

    const paintFlat = () => {
      if (!flat || !field) return;
      const cw = Math.ceil(w / 2);
      const ch = Math.ceil(h / 2);
      if (!flatImage || flatImage.width !== cw || flatImage.height !== ch) flatImage = flat.createImageData(cw, ch);
      const [r, g, b] = look.ice;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const c = coverage(field, x * 2, y * 2, grow, melt) * look.body * fade;
          const o = (y * cw + x) * 4;
          flatImage.data[o] = r * 255;
          flatImage.data[o + 1] = g * 255;
          flatImage.data[o + 2] = b * 255;
          flatImage.data[o + 3] = c * 255;
        }
      }
      canvas.width = cw;
      canvas.height = ch;
      flat.putImageData(flatImage, 0, 0);
    };

    const draw = (force = false) => {
      if (!field || w === 0 || h === 0) return;
      if (renderer) renderer.draw(field, w, h, grow, melt, fade, look);
      else paintFlat();
      paintMask(force);
    };

    const settled = () => {
      if (want.current) return grow >= DONE && melt <= 0 && fade >= 1;
      return grow <= 0 && melt <= 0;
    };

    const advance = (dt: number) => {
      if (still) {
        if (want.current) {
          grow = DONE;
          melt = 0;
          fade = Math.min(1, fade + dt / 0.25);
        } else {
          fade = Math.max(0, fade - dt / 0.25);
          if (fade <= 0) grow = 0;
        }
        return;
      }
      if (want.current) {
        if (melt > 0) melt = Math.max(0, melt - (dt * pace) / REFREEZE);
        grow = Math.min(DONE, grow + (dt * pace) / GROW);
      } else if (grow > 0) {
        melt = Math.min(1, melt + (dt * pace) / MELT);
        if (melt >= 1) {
          melt = 0;
          grow = 0;
        }
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      advance(dt);
      const done = settled();
      draw(done);
      raf = done ? 0 : requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || !onScreen || document.hidden || !started) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    kick.current = () => {
      started = true;
      wake();
    };

    const sync = () => {
      if (onScreen && !document.hidden) {
        if (!started && want.current) {
          started = true;
          grow = 0;
        }
        wake();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const nw = root.clientWidth;
      const nh = root.clientHeight;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      if (w === 0 || h === 0) return;
      if (renderer) {
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        renderer.resize(canvas.width, canvas.height);
      }
      const built = buildField(w, h, seed, dpr);
      field = built.field;
      renderer?.field(built.field, built.vein);
      if (!started && want.current) grow = 0;
      draw(true);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    const offTheme = onThemeChange(() => {
      look = readLook(canvas);
      draw(true);
    });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      kick.current = () => {};
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      renderer?.dispose();
    };
  }, [speed, seed, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-clip",
        "[--miyuki-lake-freeze-night:0] dark:[--miyuki-lake-freeze-night:1]",
        className,
      )}
      {...props}
    >
      {children}
      <div
        ref={blurRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 [mask-position:0_0] [mask-repeat:no-repeat]",
          "bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] backdrop-blur-[1.6px] backdrop-saturate-[0.6]",
          "dark:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]",
        )}
        style={{
          maskImage: "linear-gradient(transparent, transparent)",
          WebkitMaskImage: "linear-gradient(transparent, transparent)",
        }}
      />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />
    </div>
  );
}
