"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface StillWaterProps extends ComponentProps<"div"> {
  damping?: number;
  strength?: number;
  rain?: boolean;
  rainInterval?: number;
  resolution?: number;
  tint?: string;
}

const NIGHT = "--miyuki-still-water-night";
const WAVE_SPEED = 150;
const SPONGE = 7;
const VISCOSITY = 0.012;
const OWN_CLICKS =
  "a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true']";

type Vec3 = [number, number, number];

interface Look {
  top: Vec3;
  bottom: Vec3;
  crest: Vec3;
  trough: Vec3;
  spec: Vec3;
  crestAmt: number;
  troughAmt: number;
  heightAmt: number;
  specAmt: number;
  shine: number;
  slope: number;
  light: Vec3;
  view: Vec3;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function half(a: Vec3, b: Vec3): Vec3 {
  return norm([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}

function readLook(el: Element, tint: string): Look {
  const night = cssVar(NIGHT, el) === "1";
  const mix = (a: string, b: string, p: number) => rgb(`color-mix(in oklab, ${a} ${p}%, ${b})`, el);
  if (night) {
    return {
      top: mix(tint, "var(--background)", 13),
      bottom: mix("var(--background)", "black", 84),
      crest: mix(tint, "var(--foreground)", 30),
      trough: mix("var(--background)", "black", 55),
      spec: mix(tint, "var(--foreground)", 18),
      crestAmt: 0.9,
      troughAmt: 1.4,
      heightAmt: 0.04,
      specAmt: 0.5,
      shine: 160,
      slope: 1.15,
      light: norm([0.16, -0.62, 0.77]),
      view: norm([0, 0.42, 0.9]),
    };
  }
  return {
    top: mix(tint, "var(--card)", 4),
    bottom: mix(tint, "var(--background)", 12),
    crest: rgb("var(--card)", el),
    trough: mix(tint, "var(--background)", 40),
    spec: rgb("var(--card)", el),
    crestAmt: 3.4,
    troughAmt: 3.8,
    heightAmt: 0.07,
    specAmt: 0.35,
    shine: 22,
    slope: 1,
    light: norm([-0.3, -0.72, 0.62]),
    view: norm([0, 0.42, 0.9]),
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
uniform sampler2D u_field;
uniform vec2 u_span;
uniform vec3 u_top;
uniform vec3 u_bottom;
uniform vec3 u_crest;
uniform vec3 u_trough;
uniform vec3 u_spec;
uniform vec3 u_light;
uniform vec3 u_half;
uniform vec4 u_amt;
uniform vec2 u_shine;
in vec2 v_uv;
out vec4 o;

vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) / 6.0;
}

vec4 bicubic(vec2 uv) {
  vec2 size = vec2(textureSize(u_field, 0));
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec4 s0 = texture(u_field, off.xz);
  vec4 s1 = texture(u_field, off.yz);
  vec4 s2 = texture(u_field, off.xw);
  vec4 s3 = texture(u_field, off.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 f = bicubic(v_uv * u_span);
  vec2 g = f.gb * u_amt.w;
  vec3 n = normalize(vec3(-g.x, -g.y, 1.0));
  float depth = v_uv.y;
  float near = mix(0.62, 1.0, smoothstep(0.0, 0.9, depth));
  vec3 col = mix(u_top, u_bottom, smoothstep(-0.1, 1.05, depth));
  float lit = dot(n, u_light) - u_light.z;
  float crest = clamp(lit * u_amt.x * near + max(f.r, 0.0) * u_amt.z, 0.0, 0.85);
  float trough = clamp(-lit * u_amt.y * near + max(-f.r, 0.0) * u_amt.z, 0.0, 0.85);
  col = mix(col, u_crest, crest);
  col = mix(col, u_trough, trough);
  float flat_ = pow(u_half.z, u_shine.x);
  float sp = max(pow(max(dot(n, u_half), 0.0), u_shine.x) - flat_, 0.0);
  col += u_spec * sp * u_shine.y * near;
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  o = vec4(col, 1.0);
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

interface GlRenderer {
  draw(field: Float32Array, cols: number, rows: number, spanX: number, spanY: number, look: Look): void;
  resize(width: number, height: number): void;
  lost(): boolean;
  dispose(): void;
}

function createGl(canvas: HTMLCanvasElement): GlRenderer | null {
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

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    field: u("u_field"),
    span: u("u_span"),
    top: u("u_top"),
    bottom: u("u_bottom"),
    crest: u("u_crest"),
    trough: u("u_trough"),
    spec: u("u_spec"),
    light: u("u_light"),
    half: u("u_half"),
    amt: u("u_amt"),
    shine: u("u_shine"),
  };
  gl.uniform1i(uniforms.field, 0);

  let texW = 0;
  let texH = 0;

  return {
    draw(field, cols, rows, spanX, spanY, look) {
      if (gl.isContextLost()) return;
      if (cols !== texW || rows !== texH) {
        texW = cols;
        texH = rows;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, cols, rows, 0, gl.RGBA, gl.FLOAT, field);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA, gl.FLOAT, field);
      }
      const h = half(look.light, look.view);
      gl.uniform2f(uniforms.span, spanX, spanY);
      gl.uniform3fv(uniforms.top, look.top);
      gl.uniform3fv(uniforms.bottom, look.bottom);
      gl.uniform3fv(uniforms.crest, look.crest);
      gl.uniform3fv(uniforms.trough, look.trough);
      gl.uniform3fv(uniforms.spec, look.spec);
      gl.uniform3fv(uniforms.light, look.light);
      gl.uniform3fv(uniforms.half, h);
      gl.uniform4f(uniforms.amt, look.crestAmt, look.troughAmt, look.heightAmt, look.slope);
      gl.uniform2f(uniforms.shine, look.shine, look.specAmt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize(width, height) {
      gl.viewport(0, 0, width, height);
    },
    lost() {
      return gl.isContextLost();
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

function shadeCell(f: Float32Array, i: number, look: Look, depth: number, out: Uint8ClampedArray, o: number) {
  const gx = f[i + 1] * look.slope;
  const gy = f[i + 2] * look.slope;
  const il = 1 / Math.sqrt(gx * gx + gy * gy + 1);
  const nx = -gx * il;
  const ny = -gy * il;
  const nz = il;
  const near = 0.62 + 0.38 * clamp(depth / 0.9, 0, 1);
  const t = clamp((depth + 0.1) / 1.15, 0, 1);
  const s = t * t * (3 - 2 * t);
  const L = look.light;
  const lit = nx * L[0] + ny * L[1] + nz * L[2] - L[2];
  const hgt = f[i];
  const crest = clamp(lit * look.crestAmt * near + Math.max(hgt, 0) * look.heightAmt, 0, 0.85);
  const trough = clamp(-lit * look.troughAmt * near + Math.max(-hgt, 0) * look.heightAmt, 0, 0.85);
  const H = half(look.light, look.view);
  const flat = H[2] ** look.shine;
  const sp = Math.max(Math.max(nx * H[0] + ny * H[1] + nz * H[2], 0) ** look.shine - flat, 0) * look.specAmt * near;
  for (let c = 0; c < 3; c++) {
    let v = look.top[c] + (look.bottom[c] - look.top[c]) * s;
    v += (look.crest[c] - v) * crest;
    v += (look.trough[c] - v) * trough;
    v += look.spec[c] * sp;
    out[o + c] = v * 255;
  }
  out[o + 3] = 255;
}

export function StillWater({
  damping = 0.985,
  strength = 1,
  rain = true,
  rainInterval = 2600,
  resolution = 160,
  tint = "var(--brand)",
  className,
  style,
  children,
  ...props
}: StillWaterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement?.parentElement;
    if (!canvas || !root) return;

    const still = !!reduce;
    const force = Math.max(0, strength);
    const every = Math.max(200, rainInterval);
    const glr = createGl(canvas);
    const ctx = glr ? null : canvas.getContext("2d");
    if (!glr && !ctx) {
      canvas.style.display = "none";
      return;
    }
    const small = ctx ? document.createElement("canvas") : null;
    const sctx = small?.getContext("2d") ?? null;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let stride = 0;
    let cell = 1;
    let c2 = 0.3;
    let substeps = 1;
    let stepDamp = damping;
    let prev = new Float32Array(0);
    let cur = new Float32Array(0);
    let next = new Float32Array(0);
    let damp = new Float32Array(0);
    let field = new Float32Array(0);
    let image: ImageData | null = null;
    let look = readLook(canvas, tint);

    let time = 0;
    let acc = 0;
    let last = 0;
    let raf = 0;
    let onScreen = false;
    let energy = 0;
    let nextRain = 0.8;
    const pointer = { x: 0, y: 0, t: 0, has: false };

    const layout = () => {
      cols = clamp(Math.round(Math.min(resolution, w / 4)), 16, 480);
      cell = w / cols;
      rows = Math.max(8, Math.ceil(h / cell));
      stride = cols + 2;
      const n = stride * (rows + 2);
      prev = new Float32Array(n);
      cur = new Float32Array(n);
      next = new Float32Array(n);
      damp = new Float32Array(n);
      field = new Float32Array(cols * rows * 4);
      const courant = WAVE_SPEED / cell / 60;
      substeps = Math.max(1, Math.ceil(courant / 0.62));
      const c = courant / substeps;
      c2 = c * c;
      stepDamp = clamp(damping, 0.8, 0.9999) ** (1 / substeps);
      for (let y = 1; y <= rows; y++) {
        for (let x = 1; x <= cols; x++) {
          const edge = Math.min(x - 1, cols - x, y - 1, rows - y);
          const k = edge < SPONGE ? 1 - (1 - edge / SPONGE) ** 2 * 0.09 : 1;
          damp[y * stride + x] = stepDamp * k;
        }
      }
      if (small && sctx) {
        small.width = cols;
        small.height = rows;
        image = sctx.createImageData(cols, rows);
      }
    };

    const press = (px: number, py: number, radius: number, amount: number, settle: boolean) => {
      const cx = px / cell + 0.5;
      const cy = py / cell + 0.5;
      const r = Math.max(1.2, radius / cell);
      const reach = Math.ceil(r * 2.8);
      const x0 = Math.max(1, Math.floor(cx - reach));
      const x1 = Math.min(cols, Math.ceil(cx + reach));
      const y0 = Math.max(1, Math.floor(cy - reach));
      const y1 = Math.min(rows, Math.ceil(cy + reach));
      const inv = 1 / (r * r);
      const a = amount * (cell / 4);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const q = (dx * dx + dy * dy) * inv;
          const v = a * (1 - 0.55 * q) * Math.exp(-q);
          const i = y * stride + x;
          cur[i] -= v;
          if (settle) prev[i] -= v;
        }
      }
      energy = Math.max(energy, Math.abs(a));
    };

    const step = () => {
      const k = c2 / 6;
      const nu = VISCOSITY / 6;
      let peak = 0;
      for (let y = 1; y <= rows; y++) {
        let i = y * stride + 1;
        for (let x = 1; x <= cols; x++, i++) {
          const c = cur[i];
          const lap =
            4 * (cur[i - 1] + cur[i + 1] + cur[i - stride] + cur[i + stride]) +
            cur[i - stride - 1] +
            cur[i - stride + 1] +
            cur[i + stride - 1] +
            cur[i + stride + 1] -
            20 * c;
          const lapPrev =
            4 * (prev[i - 1] + prev[i + 1] + prev[i - stride] + prev[i + stride]) +
            prev[i - stride - 1] +
            prev[i - stride + 1] +
            prev[i + stride - 1] +
            prev[i + stride + 1] -
            20 * prev[i];
          const v = (2 * c - prev[i] + k * lap + nu * (lap - lapPrev)) * damp[i];
          next[i] = v;
          const a = v < 0 ? -v : v;
          if (a > peak) peak = a;
        }
      }
      const t = prev;
      prev = cur;
      cur = next;
      next = t;
      energy = peak;
    };

    const pack = () => {
      const inv = 1 / (2 * cell);
      let o = 0;
      for (let y = 1; y <= rows; y++) {
        let i = y * stride + 1;
        for (let x = 1; x <= cols; x++, i++) {
          field[o] = cur[i];
          field[o + 1] = (cur[i + 1] - cur[i - 1]) * inv;
          field[o + 2] = (cur[i + stride] - cur[i - stride]) * inv;
          field[o + 3] = 0;
          o += 4;
        }
      }
    };

    const draw = () => {
      if (w === 0 || h === 0) return;
      pack();
      if (glr) {
        glr.draw(field, cols, rows, w / (cols * cell), h / (rows * cell), look);
        return;
      }
      if (!ctx || !image || !small || !sctx) return;
      const data = image.data;
      for (let y = 0; y < rows; y++) {
        const depth = ((y + 0.5) * cell) / h;
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          shadeCell(field, i, look, depth, data, i);
        }
      }
      sctx.putImageData(image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, cols, rows, 0, 0, cols * cell * dpr, rows * cell * dpr);
    };

    const drop = (px: number, py: number, amount: number, radius: number) => {
      press(px, py, radius, amount, true);
      wake();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      time += dt;
      if (rain && time >= nextRain) {
        nextRain = time + (every / 1000) * (0.55 + Math.random() * 0.9);
        drop(w * (0.06 + Math.random() * 0.88), h * (0.08 + Math.random() * 0.84), 2.2 + Math.random() * 1.2, 5.5);
      }
      acc = Math.min(acc + dt, 0.1);
      let ran = 0;
      while (acc >= 1 / 60) {
        acc -= 1 / 60;
        for (let s = 0; s < substeps; s++) step();
        ran++;
      }
      if (ran > 0) draw();
      if (!rain && energy < 0.002) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const wake = () => {
      if (still || raf || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      if (onScreen && !document.hidden) wake();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const stillFrame = () => {
      prev.fill(0);
      cur.fill(0);
      const spots: [number, number, number, number][] = [
        [0.78, 0.3, 6, 0],
        [0.6, 0.74, 4, 26],
        [0.9, 0.82, 3, 48],
      ];
      for (let s = 0; s < 74 * substeps; s++) {
        for (const [x, y, a, at] of spots) if (s === at * substeps) press(w * x, h * y, 12, a, true);
        step();
      }
      draw();
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
      glr?.resize(canvas.width, canvas.height);
      if (w === 0 || h === 0) return;
      layout();
      if (still) stillFrame();
      else draw();
    };

    const local = (event: PointerEvent | MouseEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      if (still || force === 0) return;
      const [x, y] = local(event);
      const now = event.timeStamp;
      if (!pointer.has) {
        pointer.x = x;
        pointer.y = y;
        pointer.t = now;
        pointer.has = true;
        return;
      }
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) return;
      const held = clamp((now - pointer.t) / 1000, 0.004, 0.05) * 60;
      pointer.t = now;
      const gap = Math.max(cell * 1.2, 4);
      const n = Math.min(60, Math.ceil(dist / gap));
      const amount = (0.7 * force * held * clamp(dist / 3, 0.3, 1)) / n;
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        press(pointer.x + dx * t, pointer.y + dy * t, 7, amount, false);
      }
      pointer.x = x;
      pointer.y = y;
      wake();
    };

    const onLeave = () => {
      pointer.has = false;
    };

    const onClick = (event: MouseEvent) => {
      if (still || force === 0) return;
      const target = event.target as Element | null;
      if (target?.closest(OWN_CLICKS)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) return;
      const [x, y] = local(event);
      drop(x, y, 7 * Math.min(force, 2), 13);
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
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
      look = readLook(canvas, tint);
      draw();
    });
    canvas.addEventListener("webglcontextlost", onLost);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("click", onClick);
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
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("click", onClick);
      glr?.dispose();
    };
  }, [damping, strength, rain, rainInterval, resolution, tint, reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-still-water-night:0] dark:[--miyuki-still-water-night:1]",
        className,
      )}
      style={
        {
          "--miyuki-still-water-tint": tint,
          backgroundImage:
            "linear-gradient(to bottom, color-mix(in oklab, var(--miyuki-still-water-tint) 5%, var(--background)), color-mix(in oklab, var(--miyuki-still-water-tint) 12%, var(--background)))",
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
