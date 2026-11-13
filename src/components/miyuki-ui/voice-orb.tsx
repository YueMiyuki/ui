"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef } from "react";
import { cssVar, onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceOrbProps extends Omit<ComponentProps<"div">, "children"> {
  state?: VoiceOrbState;
  level?: number;
  useMic?: boolean;
  size?: number;
  color?: string;
  label?: string;
  onMicError?: (error: unknown) => void;
}

const STATES: VoiceOrbState[] = ["idle", "listening", "thinking", "speaking"];
const SPOKEN: Record<VoiceOrbState, string> = {
  idle: "ready",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
};
const EXTENT = 1.9;
const RINGS = 4;
const NIGHT = "--miyuki-voice-orb-night";

type Vec3 = [number, number, number];

interface Palette {
  water: Vec3;
  deep: Vec3;
  light: Vec3;
  night: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function rgb(value: string, el: Element): Vec3 {
  const [r, g, b] = toRgba(value, el);
  return [r, g, b];
}

function readPalette(el: Element, color: string): Palette {
  const night = cssVar(NIGHT, el) === "1";
  if (night) {
    return {
      water: rgb(color, el),
      deep: rgb(`color-mix(in oklab, ${color} 34%, var(--background))`, el),
      light: rgb(`color-mix(in oklab, ${color} 42%, white)`, el),
      night: 1,
    };
  }
  return {
    water: rgb(color, el),
    deep: rgb(`color-mix(in oklab, ${color} 72%, var(--foreground))`, el),
    light: rgb(`color-mix(in oklab, ${color} 14%, white)`, el),
    night: 0,
  };
}

function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

function envelope(t: number, seed: number, rate: number) {
  const phrase = clamp((noise1(t * 0.42 + seed) - 0.3) / 0.22, 0, 1);
  const wobble = 1.6 * Math.sin(t * 1.3 + seed);
  const syllable = Math.abs(Math.sin(t * rate + wobble)) ** 1.4;
  const grain = 0.55 + 0.45 * noise1(t * 3.3 + seed * 3);
  return clamp(phrase * phrase * (3 - 2 * phrase) * syllable * grain * 1.15, 0, 1);
}

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_unit;
uniform float u_time;
uniform vec4 u_w;
uniform float u_level;
uniform float u_voice;
uniform float u_radius;
uniform float u_spin;
uniform vec4 u_rings[${RINGS}];
uniform vec3 u_water;
uniform vec3 u_deep;
uniform vec3 u_light;
uniform float u_night;
uniform float u_strict;
out vec4 o;

float hash3(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(hash3(i), hash3(i + vec3(1, 0, 0)), u.x);
  float b = mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), u.x);
  float c = mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), u.x);
  float d = mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int k = 0; k < 4; k++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    a *= 0.5;
  }
  return s / 0.9375;
}

vec2 hash2(vec2 p) {
  vec3 a = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  a += dot(a, a.yzx + 33.33);
  return fract((a.xx + a.yz) * a.zy);
}

float cells(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 h = hash2(i + g);
      vec2 c = g + 0.5 + 0.4 * sin(t * (0.5 + 0.7 * h) + 6.2831 * h) - f;
      float e = dot(c, c);
      if (e < f1) {
        f2 = f1;
        f1 = e;
      } else if (e < f2) {
        f2 = e;
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_unit;
  float r = length(p);
  float ang = atan(p.y, p.x);
  float t = u_time;
  float lv = u_level * u_w.y;
  float vc = u_voice * u_w.w;

  float wob = u_w.x * 0.011 * sin(2.0 * ang + t * 0.55)
    + u_w.y * (0.005 + 0.03 * u_level) * (0.5 * sin(3.0 * ang + t * 2.7) + 0.32 * sin(5.0 * ang - t * 4.1 + 1.3) + 0.18 * sin(8.0 * ang + t * 6.6 + 2.0))
    + u_w.z * 0.018 * sin(2.0 * ang - u_spin * 2.0)
    + u_w.w * (0.004 + 0.012 * u_voice) * (0.6 * sin(3.0 * ang + t * 1.7) + 0.4 * sin(5.0 * ang - t * 2.3 + 0.8));
  float R = u_radius * (1.0 + wob);
  float px = 1.0 / u_unit;
  float body = 1.0 - smoothstep(R - px * 1.2, R + px * 0.8, r);

  vec2 q = p / R;
  float d = min(length(q), 1.0);
  float z = sqrt(max(1.0 - d * d, 0.0));
  vec2 dir = q / max(length(q), 1e-4);

  float ripEnv = (0.2 + 0.8 * d) * smoothstep(0.0, 0.3, d) * (1.0 - smoothstep(0.86, 1.0, d));
  float rip = sin(d * 17.0 - t * 6.5) * ripEnv;
  float ripAmp = 0.1 * lv + 0.008 * vc;
  vec3 n = normalize(vec3(q + dir * cos(d * 17.0 - t * 6.5) * ripEnv * ripAmp * 2.5, z + 0.0001));
  float fres = pow(1.0 - n.z, 2.2);

  vec2 uv = q * (0.6 + 0.4 * z);
  float twist = u_spin + (0.45 + 2.1 * u_w.z) * (1.0 - d) * (1.0 - d);
  float cs = cos(twist);
  float sn = sin(twist);
  vec2 sw = mat2(cs, -sn, sn, cs) * uv;
  float drift = t * (0.045 + 0.05 * u_w.y + 0.03 * u_w.w);
  float c1 = fbm(vec3(sw * 1.55, drift));
  float c2 = fbm(vec3(sw * 1.7 + vec2(c1, -c1) * 1.3, drift * 1.4 + 3.0));
  float current = smoothstep(0.38, 0.72, c2);
  float streak = smoothstep(0.0, 0.08, abs(c2 - 0.55));
  float contrast = mix(0.55, 1.0, u_w.z);

  vec2 cu = sw * 2.2;
  cu += (vec2(vnoise(vec3(cu * 1.4, t * 0.3)), vnoise(vec3(cu * 1.4 + 5.2, t * 0.3 + 1.7))) - 0.5) * 0.95;
  float caus = 1.0 - smoothstep(0.0, 0.26, cells(cu, t * (0.6 + 1.4 * lv)));
  caus *= caus * caus * smoothstep(0.98, 0.55, d);

  vec2 cpos = vec2(0.03 * sin(t * 0.4), -0.24) + vec2(c1 - 0.5, c2 - 0.5) * 0.22;
  float core = exp(-dot(q - cpos, q - cpos) * 3.0);
  float breath = 0.5 + 0.5 * sin(t * 1.25);
  float inner = 0.48 + 0.16 * breath * u_w.x + 0.75 * lv + 0.65 * vc + 0.18 * u_w.z;

  float orbit = u_spin * 1.6;
  vec2 od = vec2(cos(orbit), sin(orbit));
  float along = dot(dir, od);
  float ahead = dot(dir, vec2(-od.y, od.x));
  float tail = smoothstep(-0.2, 1.0, along) * (1.0 - smoothstep(0.0, 0.9, abs(ahead) * (ahead > 0.0 ? 4.0 : 1.2)));
  float comet = u_w.z * tail * smoothstep(0.55, 0.88, d) * (1.0 - smoothstep(0.9, 0.99, d));

  float crescent = smoothstep(0.6, 0.93, d) * (1.0 - smoothstep(0.94, 1.0, d)) * pow(max(dot(dir, normalize(vec2(0.5, -0.86))), 0.0), 2.0);
  float arc = smoothstep(0.8, 0.92, d) * (1.0 - smoothstep(0.945, 0.99, d)) * smoothstep(0.45, 0.95, dot(dir, normalize(vec2(-0.56, 0.83))));
  vec3 L = normalize(vec3(-0.48, 0.6, 0.64));
  vec3 refl = vec3(0.0, 0.0, -1.0) + 2.0 * n.z * n;
  float spec = pow(max(dot(refl, L), 0.0), 70.0);
  float sheen = pow(max(dot(refl, L), 0.0), 7.0) * 0.18;
  float rim = smoothstep(0.86, 1.0, d);

  float lower = smoothstep(0.1, -0.9, q.y);
  vec3 col;
  if (u_night > 0.5) {
    col = mix(u_deep * 0.8, u_water * 0.5, 0.15 + 0.5 * fres);
    col += u_water * current * 0.2 * contrast;
    col += u_light * (1.0 - streak) * 0.06 * contrast;
    col += u_light * core * inner * 0.8;
    col += u_light * caus * (0.012 + 0.1 * lv + 0.025 * vc);
    col += u_light * crescent * (0.4 + 0.4 * vc);
    col += u_light * comet * 0.8;
    col += u_water * fres * (0.5 + 0.2 * lower);
    col += u_light * max(rip, 0.0) * ripAmp * 6.0 - u_water * max(-rip, 0.0) * ripAmp * 1.8;
    col += vec3(1.0) * (arc * 0.38 + spec * 0.85 + sheen * 0.5);
  } else {
    col = mix(u_light, u_water, 0.14 + 0.58 * fres);
    col = mix(col, u_deep, rim * (0.38 + 0.28 * lower));
    col = mix(col, u_water, current * 0.24 * contrast);
    col = mix(col, u_light, (1.0 - streak) * 0.2 * contrast);
    col = mix(col, vec3(1.0), clamp(core * inner * 0.6, 0.0, 0.9));
    col = mix(col, vec3(1.0), clamp(caus * (0.06 + 0.3 * lv + 0.06 * vc), 0.0, 0.7));
    col = mix(col, vec3(1.0), crescent * (0.6 + 0.3 * vc));
    col = mix(col, vec3(1.0), clamp(comet * 0.8, 0.0, 1.0));
    col = mix(col, u_deep, clamp(-rip * ripAmp * 3.8, 0.0, 0.24));
    col = mix(col, vec3(1.0), clamp(rip * ripAmp * 5.5, 0.0, 0.45));
    col = mix(col, vec3(1.0), clamp(arc * 0.85 + spec + sheen, 0.0, 1.0));
  }

  float beyond = max(r - R, 0.0);
  float edge = 1.0 - smoothstep(EXTENT_IN - 0.55, EXTENT_IN - 0.02, r);
  float glow = edge * (u_night > 0.5
    ? exp(-beyond * 3.6) * (0.2 + 0.1 * breath * u_w.x + 0.42 * lv + 0.32 * vc + 0.12 * u_w.z)
    : exp(-beyond * 5.5) * (0.07 + 0.03 * breath * u_w.x + 0.15 * lv + 0.11 * vc + 0.04 * u_w.z));

  float ringA = 0.0;
  for (int i = 0; i < ${RINGS}; i++) {
    vec4 rg = u_rings[i];
    if (rg.y <= 0.001) continue;
    float x = (r - rg.x) / rg.z;
    float band = exp(-x * x);
    float trail = exp(-(x + 2.2) * (x + 2.2) * 0.35) * 0.35;
    ringA += rg.y * (band + trail);
  }
  ringA *= smoothstep(0.0, 0.06, r - R) * edge;

  vec3 acc;
  float al;
  if (u_night > 0.5) {
    acc = u_water * glow + (u_water * 0.8 + u_light * 0.35) * ringA * 0.75;
    al = u_strict > 0.5 ? clamp(max(acc.r, max(acc.g, acc.b)), 0.0, 1.0) : 0.0;
  } else {
    float ra = clamp(ringA * 0.7, 0.0, 0.85);
    acc = u_water * glow;
    al = glow;
    acc = acc * (1.0 - ra) + u_water * ra;
    al = al + ra * (1.0 - al);
  }
  acc = mix(acc, col, body);
  al = mix(al, 1.0, body);
  float presence = max(al, max(acc.r, max(acc.g, acc.b)));
  acc += (hash3(vec3(gl_FragCoord.xy, t)) - 0.5) / 255.0 * smoothstep(0.0, 0.08, presence);
  o = vec4(max(acc, 0.0), al);
}`.replace(/EXTENT_IN/g, EXTENT.toFixed(2));

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
  time: number;
  w: number[];
  level: number;
  voice: number;
  radius: number;
  spin: number;
  rings: Float32Array;
}

interface Renderer {
  draw(frame: Frame, palette: Palette): void;
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
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uni = {
    res: u("u_res"),
    unit: u("u_unit"),
    time: u("u_time"),
    w: u("u_w"),
    level: u("u_level"),
    voice: u("u_voice"),
    radius: u("u_radius"),
    spin: u("u_spin"),
    rings: u("u_rings"),
    water: u("u_water"),
    deep: u("u_deep"),
    light: u("u_light"),
    night: u("u_night"),
    strict: u("u_strict"),
  };
  // Safari drops colour written with zero alpha into a premultiplied canvas, so the night glow needs real alpha there
  const ua = navigator.userAgent;
  const strict = /AppleWebKit/.test(ua) && !/Chrome|Chromium/.test(ua) ? 1 : 0;
  gl.clearColor(0, 0, 0, 0);
  return {
    draw(frame, palette) {
      if (gl.isContextLost()) return;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uni.res, w, h);
      gl.uniform1f(uni.unit, w / (2 * EXTENT));
      gl.uniform1f(uni.time, frame.time);
      gl.uniform4f(uni.w, frame.w[0], frame.w[1], frame.w[2], frame.w[3]);
      gl.uniform1f(uni.level, frame.level);
      gl.uniform1f(uni.voice, frame.voice);
      gl.uniform1f(uni.radius, frame.radius);
      gl.uniform1f(uni.spin, frame.spin);
      gl.uniform4fv(uni.rings, frame.rings);
      gl.uniform3fv(uni.water, palette.water);
      gl.uniform3fv(uni.deep, palette.deep);
      gl.uniform3fv(uni.light, palette.light);
      gl.uniform1f(uni.night, palette.night);
      gl.uniform1f(uni.strict, strict);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize(width, height) {
      gl.viewport(0, 0, width, height);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

interface Ring {
  age: number;
  life: number;
  strength: number;
}

function stillFrame(state: VoiceOrbState): Frame {
  const w = STATES.map((s) => (s === state ? 1 : 0));
  const rings = new Float32Array(RINGS * 4);
  if (state === "speaking") {
    rings.set([1.22, 0.62, 0.035, 0, 1.6, 0.32, 0.06, 0], 0);
  }
  return {
    time: 2.4,
    w,
    level: state === "listening" ? 0.62 : 0,
    voice: state === "speaking" ? 0.55 : 0,
    radius:
      0.9 * (1 + (state === "listening" ? 0.025 : state === "speaking" ? 0.022 : state === "thinking" ? -0.018 : 0)),
    spin: 0.9,
    rings,
  };
}

export function VoiceOrb({
  state = "idle",
  level,
  useMic = false,
  size = 160,
  color = "var(--brand)",
  label = "Voice assistant",
  onMicError,
  className,
  style,
  ...props
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef<number | undefined>(level);
  const micRef = useRef<(() => number) | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const errorRef = useRef(onMicError);
  const reduce = useReducedMotion() === true;

  useEffect(() => {
    stateRef.current = state;
    drawRef.current();
  }, [state]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    errorRef.current = onMicError;
  }, [onMicError]);

  useEffect(() => {
    if (!useMic || state !== "listening") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let audio: AudioContext | null = null;

    const start = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        audio = new AudioContext();
        const source = audio.createMediaStreamSource(media);
        const analyser = audio.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        micRef.current = () => {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
          const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-7);
          return clamp((db + 54) / 40, 0, 1);
        };
      } catch (error) {
        micRef.current = null;
        if (!cancelled) errorRef.current?.(error);
      }
    };

    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    const once = () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      void start();
    };
    if (!activation || activation.hasBeenActive) void start();
    else {
      window.addEventListener("pointerdown", once);
      window.addEventListener("keydown", once);
    }

    return () => {
      cancelled = true;
      micRef.current = null;
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      stream?.getTracks().forEach((track) => track.stop());
      void audio?.close().catch(() => {});
    };
  }, [useMic, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !root) return;
    const renderer = createRenderer(canvas);
    if (!renderer) return;

    let palette = readPalette(root, color);
    const rings: Ring[] = Array.from({ length: RINGS }, () => ({ age: 0, life: 1, strength: 0 }));
    const ringData = new Float32Array(RINGS * 4);
    const sim = {
      time: 0,
      w: STATES.map((s) => (s === stateRef.current ? 1 : 0)),
      level: 0,
      voice: 0,
      radius: 0.9,
      spin: 0,
      sinceRing: 10,
      armed: true,
    };
    let raf = 0;
    let last = 0;
    let onScreen = false;
    let shown = false;

    const show = () => {
      if (shown) return;
      shown = true;
      if (fallbackRef.current) fallbackRef.current.style.opacity = "0";
    };

    const emit = (strength: number) => {
      let slot = rings[0];
      for (const ring of rings) {
        if (ring.strength <= 0) {
          slot = ring;
          break;
        }
        if (ring.age / ring.life > slot.age / slot.life) slot = ring;
      }
      slot.age = 0;
      slot.life = 2.3;
      slot.strength = strength;
    };

    const advance = (dt: number) => {
      sim.time += dt;
      const t = sim.time;
      const current = stateRef.current;
      const k = 1 - Math.exp(-dt / 0.42);
      STATES.forEach((s, i) => {
        sim.w[i] += ((s === current ? 1 : 0) - sim.w[i]) * k;
      });
      const [wIdle, wListen, wThink, wSpeak] = sim.w;
      const given = levelRef.current;
      const mic = micRef.current;
      const heard = mic ? mic() : given != null ? clamp(given, 0, 1) : envelope(t, 3.1, 7.6);
      const said = given != null ? clamp(given, 0, 1) : envelope(t * 0.94, 11.7, 8.4);
      const up = (target: number, value: number) =>
        value + (target - value) * (1 - Math.exp(-dt / (target > value ? 0.045 : 0.17)));
      sim.level = up(heard, sim.level);
      sim.voice = up(said, sim.voice);
      sim.spin += dt * (0.14 + 0.78 * wThink);
      sim.radius =
        0.9 *
        (1 +
          wIdle * 0.024 * Math.sin(t * 1.25) +
          wListen * (0.008 + 0.04 * sim.level) +
          wThink * (-0.02 + 0.006 * Math.sin(t * 2.1)) +
          wSpeak * (0.004 + 0.045 * sim.voice));

      sim.sinceRing += dt;
      if (said < 0.28) sim.armed = true;
      if (wSpeak > 0.35 && ((sim.armed && said > 0.52 && sim.sinceRing > 0.3) || sim.sinceRing > 1.15)) {
        emit(clamp(wSpeak * (0.42 + 0.5 * sim.voice), 0, 1));
        sim.armed = false;
        sim.sinceRing = 0;
      }
      for (let i = 0; i < RINGS; i++) {
        const ring = rings[i];
        if (ring.strength > 0) {
          ring.age += dt;
          if (ring.age >= ring.life) ring.strength = 0;
        }
        const p = ring.age / ring.life;
        const fade = ring.strength > 0 ? (1 - p) ** 1.6 * Math.min(1, ring.age / 0.12) : 0;
        ringData[i * 4] = sim.radius * 1.02 + ring.age * 0.46;
        ringData[i * 4 + 1] = ring.strength * fade;
        ringData[i * 4 + 2] = 0.022 + 0.05 * p;
        ringData[i * 4 + 3] = 0;
      }
    };

    const draw = () => {
      if (canvas.width === 0 || canvas.height === 0) return;
      if (reduce) renderer.draw(stillFrame(stateRef.current), palette);
      else
        renderer.draw(
          {
            time: sim.time,
            w: sim.w,
            level: sim.level,
            voice: sim.voice,
            radius: sim.radius,
            spin: sim.spin,
            rings: ringData,
          },
          palette,
        );
      show();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 1 / 60;
      last = now;
      advance(dt);
      draw();
    };

    const sync = () => {
      const run = onScreen && !document.hidden && !reduce;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w;
      canvas.height = h;
      renderer.resize(w, h);
      draw();
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      canvas.style.visibility = "hidden";
      if (fallbackRef.current) fallbackRef.current.style.opacity = "1";
    };

    advance(0);
    drawRef.current = () => {
      if (reduce) draw();
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
      palette = readPalette(root, color);
      draw();
    });
    canvas.addEventListener("webglcontextlost", onLost);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      drawRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offTheme();
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer.dispose();
    };
  }, [color, reduce]);

  const canvasSize = size * EXTENT;
  const inset = (canvasSize - size) / 2;

  return (
    <div
      role="status"
      {...props}
      className={cn(
        "relative inline-block shrink-0 align-middle",
        "[--miyuki-voice-orb-night:0] dark:[--miyuki-voice-orb-night:1]",
        className,
      )}
      style={{ width: size, height: size, "--miyuki-voice-orb-color": color, ...style } as CSSProperties}
    >
      <span className="sr-only">{`${label}, ${SPOKEN[state]}`}</span>
      <div
        ref={fallbackRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5%] rounded-full transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(circle at 36% 30%, color-mix(in oklab, var(--miyuki-voice-orb-color) 10%, white) 0 6%, transparent 18%), radial-gradient(circle at 50% 62%, color-mix(in oklab, var(--miyuki-voice-orb-color) 18%, white), color-mix(in oklab, var(--miyuki-voice-orb-color) 70%, transparent) 72%, color-mix(in oklab, var(--miyuki-voice-orb-color) 80%, var(--foreground)) 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute block"
        style={{ left: -inset, top: -inset, width: canvasSize, height: canvasSize }}
      />
    </div>
  );
}
