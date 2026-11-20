"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface SilkFoldsProps extends ComponentProps<"div"> {
  color?: string;
  speed?: number;
  scale?: number;
  depth?: number;
  interactive?: boolean;
}

type Vec3 = [number, number, number];

interface Look {
  shade: Vec3;
  body: Vec3;
  lit: Vec3;
  sheen: Vec3;
  ramp: [number, number, number, number];
  spec: [number, number, number, number];
  lobe: [number, number, number, number];
}

const NIGHT = "--miyuki-silk-folds-night";
const SHADE = "var(--miyuki-silk-folds-shade)";
const BODY = "var(--miyuki-silk-folds-body)";
const LIT = "var(--miyuki-silk-folds-lit)";
const SHEEN = "var(--miyuki-silk-folds-sheen)";
const START = 41;
const FLOW_PX = 16;
const UNIT_PX = 46;
const STEP = 1 / 120;
const PIXEL_BUDGET = 1_300_000;

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
uniform float uRatio;
uniform float uTime;
uniform float uFlow;
uniform float uUnit;
uniform float uSlope;
uniform vec3 uBump;
uniform vec3 uShade;
uniform vec3 uBody;
uniform vec3 uLit;
uniform vec3 uSheen;
uniform vec4 uRamp;
uniform vec4 uSpec;
uniform vec4 uLobe;

const vec2 DIR = vec2(0.848, -0.530);
const vec2 ACROSS = vec2(0.530, 0.848);
const vec2 N1 = vec2(0.530, 0.848);
const vec2 N2 = vec2(0.391, 0.920);
const vec2 N3 = vec2(0.629, 0.777);
const vec2 N4 = vec2(0.616, 0.788);
const vec3 L = vec3(-0.408, -0.589, 0.698);
const mat2 R = mat2(0.8, 0.6, -0.6, 0.8);
const float BUMP_R = 92.0;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec3 noised(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  float k = a - b - c + d;
  return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * (vec2(b - a, c - a) + k * u.yx));
}

vec3 warp(vec2 q, vec2 o, float flow) {
  vec3 a = noised(q * 0.11 - DIR * flow * 0.11 + o);
  vec3 b = noised(R * (q * 0.24) - (DIR * 1.3 + ACROSS * 0.2) * flow * 0.24 + o.yx * 1.7);
  return vec3((a.x - 0.5) + 0.35 * (b.x - 0.5), 0.11 * a.yz + 0.35 * 0.24 * (b.yz * R));
}

void fold(vec2 q, vec2 n, float k, float amp, float bend, vec3 w, float ph, float lean, inout vec4 f) {
  float phi = k * dot(q, n) + bend * w.x + ph;
  vec2 dphi = k * n + bend * w.yz;
  float sp = sin(phi);
  float arg = phi + lean * sp;
  float sa = sin(arg);
  float ca = cos(arg);
  float d1 = 1.0 + lean * cos(phi);
  f += amp * vec4(sa, ca * d1 * dphi, dot(dphi, dphi) * (-sa * d1 * d1 - ca * lean * sp));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRatio;
  vec2 q = px / uUnit;
  float t = uTime;

  vec3 wa = warp(q, vec2(3.7, 1.2), uFlow);
  vec3 wb = warp(q, vec2(-5.1, 8.3), uFlow * 1.17);

  vec4 f = vec4(0.0);
  fold(q, N1, 1.0, 1.0 + 0.12 * sin(t * 0.37), 3.2, wa, t * 0.045, 0.28, f);
  fold(q, N2, 1.86, 0.42 + 0.14 * sin(t * 0.23 + 1.7), 3.6, wb, 1.3 - t * 0.035, 0.25, f);
  fold(q, N3, 0.47, 0.75 + 0.15 * sin(t * 0.17 + 2.9), 1.6, wa, -t * 0.025, 0.0, f);

  vec3 c = noised(q * 0.16 + DIR * t * 0.006 + vec2(-7.7, 2.6));
  vec4 cf = vec4(0.0);
  fold(q, N4, 3.1, 1.0, 4.4, wb, 0.7 + t * 0.06, 0.2, cf);
  float cs = clamp((c.x - 0.35) / 0.45, 0.0, 1.0);
  float ca = 0.16 * cs * cs * (3.0 - 2.0 * cs);
  vec2 cag = 0.16 * 6.0 * cs * (1.0 - cs) / 0.45 * 0.16 * c.yz;
  f += vec4(ca * cf.x, ca * cf.yz + cf.x * cag, ca * cf.w);

  vec3 e = noised(q * 0.12 + vec2(t * 0.009, -t * 0.014) + vec2(11.3, 4.1));
  float env = 0.8 + 0.4 * e.x;
  f = vec4(env * f.x, env * f.yz + f.x * 0.4 * 0.12 * e.yz, env * f.w);

  vec2 dp = px - uBump.xy;
  float r2 = dot(dp, dp) / (BUMP_R * BUMP_R);
  float b = uBump.z * exp(-r2);
  vec2 gb = b * (-2.0 * dp / (BUMP_R * BUMP_R)) * uUnit;
  float lb = b * (4.0 * r2 - 4.0) * uUnit * uUnit / (BUMP_R * BUMP_R);
  float lift = 1.0 - 0.5 * b;
  f = vec4(f.x * lift + 1.1 * b, f.yz * lift + (1.1 - 0.5 * f.x) * gb, f.w * lift + 1.1 * lb);

  float h = f.x;
  float lap = f.w;
  vec3 N = normalize(vec3(-uSlope * f.yz, 1.0));
  float s = dot(N, L) - L.z;
  vec3 col = uBody;
  col = mix(col, uLit, uRamp.x * smoothstep(0.0, 0.28, s));
  col = mix(col, uShade, uRamp.y * smoothstep(0.0, -0.6, s));
  col = mix(col, uShade, uRamp.z * smoothstep(0.5, -2.0, h));
  col = mix(col, uShade, uRamp.w * smoothstep(0.2, 2.0, lap));

  vec2 d1 = N1 + 3.2 * wa.yz;
  vec3 B = vec3(normalize(vec2(-d1.y, d1.x) + 1e-5), 0.0);
  B = normalize(B - N * dot(B, N));
  vec3 T = cross(N, B);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float hn = max(dot(H, N), 0.05);
  float ht = dot(H, T);
  float hb = dot(H, B);
  float broad = exp(-(ht * ht * uLobe.z + hb * hb * uLobe.w) / (hn * hn));
  col = mix(col, uLit, clamp(broad * uSpec.y, 0.0, 1.0));

  vec3 S = normalize(vec3(DIR * 0.16 - ACROSS * 0.05, 1.0));
  float sn = max(dot(S, N), 0.05);
  float st = dot(S, T);
  float sb = dot(S, B);
  float tight = exp(-(st * st * uLobe.x + sb * sb * uLobe.y) / (sn * sn)) * smoothstep(0.0, 0.8, -lap);
  float k = tight * uSpec.x * (0.55 + 0.6 * e.x);
  col = mix(mix(col, uSheen, clamp(k, 0.0, 1.0)), col + uSheen * k, uSpec.z);

  col += (hash(gl_FragCoord.xy) + hash(gl_FragCoord.yx + 17.13) - 1.0) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const FALLBACK = [
  `linear-gradient(148deg, transparent 3%, color-mix(in oklab, ${SHADE} 70%, transparent) 14%, transparent 22%, color-mix(in oklab, ${LIT} 85%, transparent) 27%, color-mix(in oklab, ${SHEEN} 60%, transparent) 29%, transparent 35%, color-mix(in oklab, ${SHADE} 80%, transparent) 47%, transparent 56%, color-mix(in oklab, ${LIT} 85%, transparent) 62%, color-mix(in oklab, ${SHEEN} 55%, transparent) 64%, transparent 70%, color-mix(in oklab, ${SHADE} 70%, transparent) 82%, transparent 92%)`,
  `linear-gradient(132deg, transparent 8%, color-mix(in oklab, ${SHADE} 35%, transparent) 20%, transparent 30%, color-mix(in oklab, ${LIT} 50%, transparent) 40%, transparent 48%, color-mix(in oklab, ${SHADE} 40%, transparent) 66%, transparent 76%, color-mix(in oklab, ${LIT} 45%, transparent) 86%, transparent 94%)`,
  `radial-gradient(ellipse 70% 60% at 12% 100%, color-mix(in oklab, ${SHADE} 45%, transparent), transparent)`,
].join(", ");

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

function readLook(el: Element): Look {
  const night = cssVar(NIGHT, el) === "1";
  return {
    shade: rgb(SHADE, el),
    body: rgb(BODY, el),
    lit: rgb(LIT, el),
    sheen: rgb(SHEEN, el),
    ramp: night ? [0.75, 0.7, 0.45, 0.5] : [0.75, 0.8, 0.35, 0.4],
    spec: night ? [0.95, 0.6, 1, 0] : [1, 0.3, 0, 0],
    lobe: night ? [140, 18, 10, 1] : [90, 14, 8, 1],
  };
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

const UNIFORMS = [
  "uRes",
  "uRatio",
  "uTime",
  "uFlow",
  "uUnit",
  "uSlope",
  "uBump",
  "uShade",
  "uBody",
  "uLit",
  "uSheen",
  "uRamp",
  "uSpec",
  "uLobe",
] as const;

interface Frame {
  width: number;
  time: number;
  flow: number;
  unit: number;
  slope: number;
  bump: Vec3;
}

interface Renderer {
  setLook(look: Look): void;
  draw(frame: Frame): void;
  dispose(): void;
}

function createGl(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl || gl.isContextLost()) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(program, name);
  const at = (name: (typeof UNIFORMS)[number]) => u[name] ?? null;

  return {
    setLook(look) {
      if (gl.isContextLost()) return;
      gl.uniform3fv(at("uShade"), look.shade);
      gl.uniform3fv(at("uBody"), look.body);
      gl.uniform3fv(at("uLit"), look.lit);
      gl.uniform3fv(at("uSheen"), look.sheen);
      gl.uniform4fv(at("uRamp"), look.ramp);
      gl.uniform4fv(at("uSpec"), look.spec);
      gl.uniform4fv(at("uLobe"), look.lobe);
    },
    draw(frame) {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(at("uRes"), canvas.width, canvas.height);
      gl.uniform1f(at("uRatio"), canvas.width / frame.width);
      gl.uniform1f(at("uTime"), frame.time);
      gl.uniform1f(at("uFlow"), frame.flow);
      gl.uniform1f(at("uUnit"), frame.unit);
      gl.uniform1f(at("uSlope"), frame.slope);
      gl.uniform3fv(at("uBump"), frame.bump);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      if (gl.isContextLost()) return;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export function SilkFolds({
  color = "var(--brand)",
  speed = 1,
  scale = 1,
  depth = 1,
  interactive = true,
  className,
  style,
  children,
  ...props
}: SilkFoldsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const live = useRef({ speed, scale, depth, interactive });
  const poke = useRef<(() => void) | null>(null);
  const recolor = useRef<(() => void) | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    live.current = { speed, scale, depth, interactive };
    poke.current?.();
  }, [speed, scale, depth, interactive]);

  useEffect(() => {
    recolor.current?.();
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    const root = canvas?.parentElement?.parentElement;
    if (!canvas || !fallback || !root) return;

    const still = !!reduce;
    let r: Renderer | null = null;
    let look = readLook(root);
    let w = 0;
    let h = 0;
    let fit = 1;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let onScreen = false;
    let lost = false;
    let shown = false;

    const target = () => {
      const o = live.current;
      return {
        pace: Math.max(0, Number.isFinite(o.speed) ? o.speed : 1),
        scale: clamp(Number.isFinite(o.scale) ? o.scale : 1, 0.25, 4),
        depth: clamp(Number.isFinite(o.depth) ? o.depth : 1, 0, 3),
      };
    };
    const now0 = target();
    let pace = now0.pace;
    let scl = now0.scale;
    let dep = now0.depth;
    let time = START;
    let flow = (START * FLOW_PX) / UNIT_PX;

    const ptr = { x: 0, y: 0, inside: false };
    const bump = { x: 0, y: 0, vx: 0, vy: 0, s: 0, vs: 0 };

    const unit = () => UNIT_PX * scl * fit;

    const showFallback = (on: boolean) => {
      fallback.hidden = !on;
      canvas.style.visibility = on ? "hidden" : "";
    };

    const init = () => {
      r = createGl(canvas);
      r?.setLook(look);
      return !!r;
    };

    const draw = () => {
      if (!r || lost || w === 0 || h === 0) return;
      r.draw({
        width: w,
        time,
        flow,
        unit: unit(),
        slope: 0.36 * dep,
        bump: [bump.x, bump.y, still ? 0 : clamp(bump.s, 0, 1.05)],
      });
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
    };

    const stepPointer = (dt: number) => {
      const on = ptr.inside && live.current.interactive ? 1 : 0;
      const wp = 7;
      const zp = 0.9;
      bump.vx += (wp * wp * (ptr.x - bump.x) - 2 * zp * wp * bump.vx) * dt;
      bump.vy += (wp * wp * (ptr.y - bump.y) - 2 * zp * wp * bump.vy) * dt;
      bump.x += bump.vx * dt;
      bump.y += bump.vy * dt;
      const ws = on > bump.s ? 3.4 : 2.1;
      bump.vs += (ws * ws * (on - bump.s) - 2 * ws * bump.vs) * dt;
      bump.s += bump.vs * dt;
      if (bump.s < 0) {
        bump.s = 0;
        bump.vs = Math.max(0, bump.vs);
      }
    };

    const idle = () => target().pace === 0 && pace < 1e-3 && !ptr.inside && bump.s < 1e-3 && Math.abs(bump.vs) < 1e-3;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 0;
      last = now;
      const goal = target();
      const ease = 1 - Math.exp(-dt * 2.2);
      pace += (goal.pace - pace) * ease;
      scl += (goal.scale - scl) * ease;
      dep += (goal.depth - dep) * ease;
      time += dt * pace;
      flow += (dt * pace * FLOW_PX) / unit();
      acc = Math.min(acc + dt, STEP * 4);
      while (acc >= STEP) {
        acc -= STEP;
        stepPointer(STEP);
      }
      draw();
      if (idle()) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !still && !lost && !!r && !idle();
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
      fit = clamp(Math.sqrt(Math.max(1, w) / 960), 0.8, 1.2);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const ratio = Math.min(dpr, Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h)));
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      draw();
    };

    const local = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const sx = box.width > 0 ? w / box.width : 1;
      const sy = box.height > 0 ? h / box.height : 1;
      return [(event.clientX - box.left) * sx, (event.clientY - box.top) * sy] as const;
    };

    const onMove = (event: PointerEvent) => {
      if (still || !live.current.interactive) return;
      const [x, y] = local(event);
      ptr.x = x;
      ptr.y = y;
      if (!ptr.inside && bump.s < 0.02) {
        bump.x = x;
        bump.y = y;
        bump.vx = 0;
        bump.vy = 0;
      }
      ptr.inside = true;
      sync();
    };

    const onLeave = () => {
      ptr.inside = false;
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") ptr.inside = false;
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

    poke.current = () => {
      if (still) {
        const goal = target();
        scl = goal.scale;
        dep = goal.depth;
        draw();
      }
      sync();
    };

    recolor.current = () => {
      look = readLook(root);
      r?.setLook(look);
      draw();
    };

    if (!init()) {
      showFallback(true);
      return () => {
        poke.current = null;
        recolor.current = null;
      };
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
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onLeave);
    const offTheme = onThemeChange(() => recolor.current?.(), root);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      poke.current = null;
      recolor.current = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      offTheme();
      r?.dispose();
    };
  }, [reduce]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "[--miyuki-silk-folds-night:0] dark:[--miyuki-silk-folds-night:1]",
        "[--miyuki-silk-folds-body:color-mix(in_oklab,var(--miyuki-silk-folds-color)_12%,var(--background))]",
        "[--miyuki-silk-folds-shade:color-mix(in_oklab,var(--miyuki-silk-folds-color)_42%,var(--background))]",
        "[--miyuki-silk-folds-lit:color-mix(in_oklab,var(--miyuki-silk-folds-color)_8%,var(--card))]",
        "[--miyuki-silk-folds-sheen:var(--card)]",
        "dark:[--miyuki-silk-folds-body:color-mix(in_oklab,var(--miyuki-silk-folds-color)_20%,color-mix(in_oklab,var(--background)_88%,black))]",
        "dark:[--miyuki-silk-folds-shade:color-mix(in_oklab,var(--background)_42%,black)]",
        "dark:[--miyuki-silk-folds-lit:color-mix(in_oklab,var(--miyuki-silk-folds-color)_36%,var(--background))]",
        "dark:[--miyuki-silk-folds-sheen:color-mix(in_oklab,var(--miyuki-silk-folds-color)_85%,var(--foreground))]",
        className,
      )}
      style={
        {
          "--miyuki-silk-folds-color": color,
          backgroundColor: BODY,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div ref={fallbackRef} hidden className="absolute inset-0" style={{ backgroundImage: FALLBACK }} />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block size-full opacity-0 transition-opacity duration-700 ease-out"
        />
      </div>
      {children}
    </div>
  );
}
