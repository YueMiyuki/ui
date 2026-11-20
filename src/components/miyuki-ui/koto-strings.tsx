"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { onThemeChange, type Rgba, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export interface KotoStrumOptions {
  direction?: "down" | "up";
  at?: number;
  duration?: number;
  strength?: number;
}

export interface KotoStringsHandle {
  pluck: (index: number, strength?: number) => void;
  strum: (options?: KotoStrumOptions) => void;
}

export interface KotoStringsProps extends Omit<ComponentProps<"div">, "children" | "color" | "ref"> {
  strings?: number;
  sound?: boolean;
  color?: string;
  decay?: number;
  onPluck?: (index: number, strength: number) => void;
  ref?: Ref<KotoStringsHandle>;
}

interface Hold {
  id: string;
  dir: number;
  x: number;
  d: number;
  t: number;
  grip: number;
}

interface Str {
  y: number;
  yd: number;
  row: number;
  wd: number;
  w: number;
  omega: number;
  t0: number;
  a: number[];
  b: number[];
  res: Float32Array | null;
  env: Float32Array | null;
  live: boolean;
  hold: Hold | null;
}

interface Pointer {
  x: number;
  y: number;
  t: number;
  vy: number;
  grip: number;
}

interface Virtual {
  id: string;
  x: number;
  from: number;
  to: number;
  start: number;
  dur: number;
  ease: (u: number) => number;
  at: number;
}

interface Sim {
  pluck: (index: number, strength: number) => void;
  strum: (options: KotoStrumOptions) => void;
  mark: (index: number, visible: boolean) => void;
  recolor: () => void;
}

interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

interface Engine {
  ac: AudioContext;
  out: GainNode;
  voices: Map<number, Voice>;
}

type Activation = { hasBeenActive: boolean; isActive: boolean };

const SCALE = [0, 1, 5, 7, 8];
const LETTER = ["D", "E flat", "G", "A", "B flat"];
const MODES = 3;
const LEVEL = 0.5;
const ROUND = 18;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (u: number) => {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
};
const rgba = (c: Rgba, a: number) =>
  `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${clamp(a * c[3], 0, 1).toFixed(4)})`;

function note(step: number) {
  const octave = Math.floor(step / SCALE.length);
  const degree = step % SCALE.length;
  return {
    freq: 293.6648 * 2 ** ((octave * 12 + SCALE[degree]) / 12),
    name: `${LETTER[degree]} ${4 + octave}`,
  };
}

function activation() {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { userActivation?: Activation }).userActivation;
}

function createEngine(): Engine | null {
  const Ctor =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  const ac = new Ctor();
  const out = ac.createGain();
  out.gain.value = LEVEL;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -20;
  limiter.knee.value = 10;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  out.connect(limiter);
  limiter.connect(ac.destination);
  return { ac, out, voices: new Map() };
}

function karplus(sr: number, freq: number, strength: number, pos: number, seconds: number) {
  const period = Math.max(2, Math.round(sr / freq - 0.5));
  const length = Math.floor(sr * (seconds + 0.08));
  const out = new Float32Array(length);
  const burst = new Float32Array(period);
  const bright = 0.1 + 0.5 * strength;
  let lp = 0;
  for (let i = 0; i < period; i++) {
    lp += bright * (Math.random() * 2 - 1 - lp);
    burst[i] = lp;
  }
  const comb = Math.max(1, Math.round(period * clamp(pos, 0.08, 0.92)));
  for (let i = period - 1; i >= comb; i--) burst[i] -= burst[i - comb];
  let mean = 0;
  for (let i = 0; i < period; i++) mean += burst[i];
  mean /= period;
  let peak = 0;
  for (let i = 0; i < period; i++) {
    burst[i] -= mean;
    peak = Math.max(peak, Math.abs(burst[i]));
  }
  const scale = peak > 0 ? 1 / peak : 0;
  const rho = Math.min(0.99985, 10 ** (-3 / (seconds * freq)) / Math.cos((Math.PI * freq) / sr));
  for (let n = 0; n < length; n++) {
    const a = n >= period ? out[n - period] : 0;
    const b = n > period ? out[n - period - 1] : 0;
    out[n] = (n < period ? burst[n] * scale : 0) + rho * 0.5 * (a + b);
  }
  const fade = Math.min(length, Math.floor(sr * 0.08));
  for (let i = 0; i < fade; i++) out[length - 1 - i] *= i / fade;
  return { data: out, rate: (freq * (period + 0.5)) / sr };
}

export function KotoStrings({
  strings = 13,
  sound = false,
  color = "var(--brand)",
  decay = 1.8,
  onPluck,
  className,
  style,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  ...props
}: KotoStringsProps) {
  const count = Math.max(1, Math.min(25, Math.round(strings)));
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const sim = useRef<Sim | null>(null);
  const audio = useRef<Engine | null>(null);
  const gestured = useRef(false);
  const live = useRef({ onPluck, sound, color, decay });
  const [active, setActive] = useState(0);
  const marked = Math.min(active, count - 1);

  useEffect(() => {
    live.current = { onPluck, sound, color, decay };
  });

  useImperativeHandle(
    ref,
    () => ({
      pluck: (index, strength = 0.6) => sim.current?.pluck(index, strength),
      strum: (options = {}) => sim.current?.strum(options),
    }),
    [],
  );

  const ensureAudio = () => {
    if (!live.current.sound) return null;
    const ua = activation();
    if (ua ? !ua.hasBeenActive : !gestured.current) return null;
    audio.current ??= createEngine();
    const engine = audio.current;
    if (engine && engine.ac.state === "suspended") void engine.ac.resume();
    return engine;
  };

  const play = (index: number, strength: number, pos: number) => {
    const engine = ensureAudio();
    if (!engine) return;
    const { ac } = engine;
    const { freq } = note(count - 1 - index);
    const ring = clamp(live.current.decay, 0.4, 4) * (1.25 - 0.14 * Math.log2(freq / 293.6648));
    const { data, rate } = karplus(ac.sampleRate, freq, strength, pos, ring);
    const buffer = ac.createBuffer(1, data.length, ac.sampleRate);
    buffer.copyToChannel(data, 0);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const tone = ac.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = Math.min(ac.sampleRate * 0.45, 1100 + 3000 * strength + freq * 1.5);
    tone.Q.value = 0.5;
    const gain = ac.createGain();
    const now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035 + 0.17 * strength ** 1.2, now + 0.004);
    src.connect(tone).connect(gain);
    let tail: AudioNode = gain;
    if (typeof ac.createStereoPanner === "function") {
      const pan = ac.createStereoPanner();
      pan.pan.value = (pos - 0.5) * 0.5;
      gain.connect(pan);
      tail = pan;
    }
    tail.connect(engine.out);
    const prev = engine.voices.get(index);
    if (prev) {
      prev.gain.gain.setTargetAtTime(0, now, 0.012);
      prev.src.stop(now + 0.09);
    }
    engine.voices.set(index, { src, gain });
    src.onended = () => {
      src.disconnect();
      if (engine.voices.get(index)?.src === src) engine.voices.delete(index);
    };
    src.start(now);
  };
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });

  useEffect(() => {
    const engine = audio.current;
    if (sound) {
      if (!engine && activation()?.isActive) audio.current = createEngine();
      const e = audio.current;
      if (e) {
        void e.ac.resume();
        e.out.gain.setTargetAtTime(LEVEL, e.ac.currentTime, 0.02);
      }
      return;
    }
    if (!engine) return;
    engine.out.gain.setTargetAtTime(0, engine.ac.currentTime, 0.04);
    const id = window.setTimeout(() => {
      if (!live.current.sound && engine.ac.state === "running") void engine.ac.suspend();
    }, 400);
    return () => window.clearTimeout(id);
  }, [sound]);

  useEffect(
    () => () => {
      const engine = audio.current;
      audio.current = null;
      if (engine && engine.ac.state !== "closed") void engine.ac.close();
    },
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const n = count;
    const S: Str[] = [];
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      S.push({
        y: 0,
        yd: 0,
        row: 0,
        wd: 1,
        w: 1 + 0.65 * u,
        omega: 2 * Math.PI * (6.2 - 2.8 * u),
        t0: 0,
        a: [0, 0, 0],
        b: [0, 0, 0],
        res: null,
        env: null,
        live: false,
        hold: null,
      });
    }
    let W = 0;
    let H = 0;
    let dpr = 1;
    let x0 = 0;
    let x1 = 0;
    let L = 0;
    let N = 0;
    let limit = 8;
    let phi: Float32Array[] = [];
    let X = new Float32Array(0);
    let Y = new Float32Array(0);
    let E = new Float32Array(0);
    let T = new Float32Array(0);
    let ink: Rgba = [0, 0, 0, 1];
    let tint: Rgba = [0, 0, 0, 1];
    let night = false;
    let leftTail: CanvasGradient | null = null;
    let rightTail: CanvasGradient | null = null;
    let raf = 0;
    let visible = true;
    let lastDraw = 0;
    let prevFrame = 0;
    let serial = 0;
    const C = [0, 0, 0];
    const A = [0, 0, 0];
    let R = 0;
    const pointers = new Map<string, Pointer>();
    const virtuals: Virtual[] = [];
    const mk = { idx: 0, show: false, y: Number.NaN, v: 0, a: 0, acc: 0 };

    const inkAlpha = () => (night ? 0.58 : 0.66);
    const tauOf = (m: number) => (Math.max(0.2, live.current.decay) * 0.5) / (m + 1) ** 1.3;
    const omegaOf = (s: Str, m: number) => s.omega * (m + 1) * (1 + 0.006 * ((m + 1) ** 2 - 1));
    const dmaxAt = (x: number) => {
      const p = clamp((x - x0) / L, 0, 1);
      return limit * (0.2 + 0.8 * 4 * p * (1 - p));
    };

    const readColors = () => {
      ink = toRgba("var(--foreground)", canvas);
      tint = toRgba(live.current.color, canvas);
      night = 0.2126 * ink[0] + 0.7152 * ink[1] + 0.0722 * ink[2] > 0.5;
      tails();
    };

    const tails = () => {
      if (!W) return;
      const bx0 = Math.round(x0 * dpr);
      const bx1 = Math.round(x1 * dpr);
      const a = inkAlpha();
      leftTail = ctx.createLinearGradient(0, 0, bx0, 0);
      rightTail = ctx.createLinearGradient(canvas.width, 0, bx1, 0);
      for (const g of [leftTail, rightTail]) {
        g.addColorStop(0, rgba(ink, 0));
        g.addColorStop(0.3, rgba(ink, 0));
        g.addColorStop(0.7, rgba(ink, a * 0.55));
        g.addColorStop(1, rgba(ink, a));
      }
    };

    const geometry = () => {
      W = root.clientWidth;
      H = root.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      x0 = clamp(W * 0.075, 22, 56);
      x1 = W - x0;
      L = Math.max(1, x1 - x0);
      const pad = clamp(H * 0.1, 18, 40);
      const gap = n > 1 ? (H - pad * 2) / (n - 1) : 0;
      limit = n > 1 ? clamp(gap * 0.3, 3.5, 9) : 8;
      N = Math.round(clamp(L / 6, 24, 160));
      phi = [];
      for (let m = 0; m < MODES; m++) {
        const row = new Float32Array(N + 1);
        for (let k = 0; k <= N; k++) row[k] = Math.sin(((m + 1) * Math.PI * k) / N);
        phi.push(row);
      }
      const bx0 = Math.round(x0 * dpr);
      const bx1 = Math.round(x1 * dpr);
      X = new Float32Array(N + 1);
      for (let k = 0; k <= N; k++) X[k] = bx0 + ((bx1 - bx0) * k) / N;
      Y = new Float32Array(N + 1);
      E = new Float32Array(N + 1);
      T = new Float32Array(N + 1);
      for (let i = 0; i < n; i++) {
        const s = S[i];
        s.y = n > 1 ? pad + i * gap : H / 2;
        s.wd = Math.max(1, s.w * dpr);
        s.row = Math.round(s.y * dpr - s.wd / 2);
        s.yd = s.row + s.wd / 2;
        s.res = null;
        s.env = null;
        s.hold = null;
      }
      tails();
    };

    const modal = (s: Str, t: number) => {
      if (!s.live) return false;
      const D = Math.max(0.2, live.current.decay);
      const dt = Math.max(0, t - s.t0);
      if (dt >= D * 1.35) {
        s.live = false;
        s.res = null;
        s.env = null;
        return false;
      }
      const taper = 1 - smooth((dt - 0.55 * D) / (0.8 * D));
      for (let m = 0; m < MODES; m++) {
        const w = omegaOf(s, m);
        const k = Math.exp(-dt / tauOf(m)) * taper;
        C[m] = k * (s.a[m] * Math.cos(w * dt) + s.b[m] * Math.sin(w * dt));
        A[m] = k * Math.hypot(s.a[m], s.b[m]);
      }
      R = s.res ? Math.exp(-dt / 0.05) * taper : 0;
      return true;
    };

    const envAt = (s: Str, k: number) => {
      const r = s.res ? R * s.res[k] : 0;
      const p2 = A[1] * phi[1][k];
      const p3 = A[2] * phi[2][k];
      return Math.abs(A[0] * phi[0][k]) + Math.sqrt(p2 * p2 + p3 * p3 + r * r);
    };

    const holdShape = (s: Str, t: number, withEnv: boolean) => {
      const h = s.hold as Hold;
      const xc = clamp(h.x - x0, 2, L - 2);
      const kr = clamp((ROUND * L) / (xc * (L - xc)), 0.01, 0.8);
      const norm = 1 / (1 - kr * 0.25);
      const vib = modal(s, t);
      const m1 = Math.exp(-Math.max(0, t - h.t) / 0.07);
      const m2 = Math.exp(-Math.max(0, t - h.t) / 0.035);
      let pin = 0;
      if (vib) {
        const p = xc / L;
        for (let m = 0; m < MODES; m++) pin += C[m] * Math.sin((m + 1) * Math.PI * p);
        if (s.res) {
          const f = p * N;
          const k0 = Math.min(N - 1, Math.floor(f));
          pin += R * (s.res[k0] + (s.res[k0 + 1] - s.res[k0]) * (f - k0));
        }
      }
      for (let k = 0; k <= N; k++) {
        const x = (k / N) * L;
        const a = x / xc;
        const b = (L - x) / (L - xc);
        const q = Math.max(kr - Math.abs(a - b), 0) / kr;
        const tri = (Math.min(a, b) - q * q * kr * 0.25) * norm;
        T[k] = tri;
        let y = h.d * tri;
        if (vib) {
          let v = s.res ? R * s.res[k] : 0;
          for (let m = 0; m < MODES; m++) v += C[m] * phi[m][k];
          y += m1 * (v - (1 - m2) * pin * tri);
          if (withEnv) E[k] = m1 * envAt(s, k);
        } else if (withEnv) E[k] = 0;
        Y[k] = y;
      }
      if (vib && m1 < 0.002) {
        s.live = false;
        s.res = null;
      }
    };

    const release = (i: number, t: number, v: number, emit: boolean) => {
      const s = S[i];
      const h = s.hold;
      if (!h || !N) {
        s.hold = null;
        return;
      }
      holdShape(s, t, false);
      const a = [0, 0, 0];
      const tb = [0, 0, 0];
      for (let k = 1; k < N; k++) {
        for (let m = 0; m < MODES; m++) {
          a[m] += Y[k] * phi[m][k];
          tb[m] += T[k] * phi[m][k];
        }
      }
      for (let m = 0; m < MODES; m++) {
        a[m] *= 2 / N;
        tb[m] *= 2 / N;
      }
      const res = new Float32Array(N + 1);
      for (let k = 0; k <= N; k++) {
        let y = Y[k];
        for (let m = 0; m < MODES; m++) y -= a[m] * phi[m][k];
        res[k] = y;
      }
      const cap = 1.4 * limit * s.omega;
      const ve = cap * Math.tanh(v / cap);
      const b = [0, 0, 0];
      let energy = 0;
      for (let m = 0; m < MODES; m++) {
        b[m] = (ve * tb[m] + a[m] / tauOf(m)) / omegaOf(s, m);
        energy += a[m] * a[m] + b[m] * b[m];
      }
      s.a = a;
      s.b = b;
      s.res = reduce ? null : res;
      s.t0 = t;
      s.live = true;
      s.hold = null;
      if (reduce) {
        const env = new Float32Array(N + 1);
        for (let m = 0; m < MODES; m++) A[m] = Math.hypot(a[m], b[m]);
        R = 0;
        for (let k = 0; k <= N; k++) env[k] = envAt(s, k);
        s.env = env;
      }
      const strength = clamp(Math.sqrt(energy) / (1.5 * limit), 0, 1);
      if (emit && strength >= 0.03) {
        live.current.onPluck?.(i, strength);
        playRef.current(i, strength, (h.x - x0) / L);
      }
    };

    const follow = (i: number, fx: number, fy: number, ft: number, x: number, y: number, t: number, vy: number) => {
      const s = S[i];
      const h = s.hold as Hold;
      if (x <= x0 + 1 || x >= x1 - 1) {
        h.x = clamp(x, x0 + 2, x1 - 2);
        release(i, t, 0, true);
        return;
      }
      const lim = dmaxAt(x) * h.grip;
      const d = y - s.y;
      if (reduce) {
        h.x = x;
        h.d = h.dir * lim;
        release(i, h.t, vy, true);
        return;
      }
      if (h.dir * d >= lim) {
        const d0 = h.dir * (fy - s.y);
        const f = clamp((lim - d0) / Math.max(1e-6, h.dir * d - d0), 0, 1);
        h.x = fx + (x - fx) * f;
        h.d = h.dir * dmaxAt(h.x) * h.grip;
        release(i, Math.max(lastDraw, ft + (t - ft) * f), vy, true);
      } else if (h.dir * d < -0.5) {
        h.d = 0;
        h.x = x;
        release(i, t, 0, false);
      } else {
        h.d = d;
        h.x = x;
      }
    };

    const move = (id: string, x: number, y: number, t: number) => {
      const p = pointers.get(id);
      if (!p) {
        pointers.set(id, { x, y, t, vy: 0, grip: 1 });
        return;
      }
      const dt = Math.max(0.001, t - p.t);
      const vy = (y - p.y) / dt;
      p.vy = p.vy === 0 ? vy : p.vy * 0.35 + vy * 0.65;
      for (let i = 0; i < n; i++) {
        const s = S[i];
        if (s.hold) {
          if (s.hold.id === id) follow(i, p.x, p.y, p.t, x, y, t, p.vy);
          continue;
        }
        const s0 = p.y - s.y;
        const s1 = y - s.y;
        if (!((s0 < 0 && s1 >= 0) || (s0 > 0 && s1 <= 0))) continue;
        const f = s0 / (s0 - s1);
        const xc = p.x + (x - p.x) * f;
        if (xc <= x0 + 3 || xc >= x1 - 3) continue;
        const tc = Math.max(lastDraw, p.t + (t - p.t) * f);
        s.hold = { id, dir: s1 > s0 ? 1 : -1, x: xc, d: 0, t: tc, grip: p.grip };
        follow(i, xc, s.y, tc, x, y, t, p.vy);
      }
      p.x = x;
      p.y = y;
      p.t = t;
    };

    const end = (id: string, t: number) => {
      for (let i = 0; i < n; i++) if (S[i].hold?.id === id) release(i, t, 0, true);
      pointers.delete(id);
    };

    const advance = (t: number) => {
      for (let j = virtuals.length - 1; j >= 0; j--) {
        const v = virtuals[j];
        const stop = v.start + v.dur;
        let at = v.at;
        while (at < Math.min(t, stop)) {
          at = Math.min(at + 1 / 240, t, stop);
          const u = clamp((at - v.start) / v.dur, 0, 1);
          move(v.id, v.x, v.from + (v.to - v.from) * v.ease(u), at);
        }
        v.at = at;
        if (at >= stop) {
          end(v.id, at);
          virtuals.splice(j, 1);
        }
      }
    };

    const stepMarker = (dt: number) => {
      const want = mk.show ? 1 : 0;
      const target = S[clamp(mk.idx, 0, n - 1)].yd / dpr;
      if (Number.isNaN(mk.y) || reduce || mk.a < 0.01) {
        mk.y = target;
        mk.v = 0;
      } else {
        mk.acc += dt;
        let steps = 0;
        while (mk.acc >= 1 / 120 && steps < 4) {
          mk.v += (220 * (target - mk.y) - 26 * mk.v) / 120;
          mk.y += mk.v / 120;
          mk.acc -= 1 / 120;
          steps++;
        }
        if (steps >= 4) mk.acc = 0;
      }
      mk.a += (want - mk.a) * (1 - Math.exp(-dt / 0.08));
      const settled = Math.abs(target - mk.y) < 0.02 && Math.abs(mk.v) < 0.05 && Math.abs(mk.a - want) < 0.004;
      if (settled) {
        mk.y = target;
        mk.v = 0;
        mk.a = want;
      }
      return !settled;
    };

    const smoothPath = (sign: number, s: Str, src: Float32Array, reverse: boolean, offset = 0) => {
      const at = (k: number) => s.yd + offset + sign * src[k] * dpr;
      if (!reverse) {
        for (let k = 1; k < N; k++) ctx.quadraticCurveTo(X[k], at(k), (X[k] + X[k + 1]) / 2, (at(k) + at(k + 1)) / 2);
        ctx.lineTo(X[N], at(N));
      } else {
        for (let k = N - 1; k > 0; k--)
          ctx.quadraticCurveTo(X[k], at(k), (X[k] + X[k - 1]) / 2, (at(k) + at(k - 1)) / 2);
        ctx.lineTo(X[0], at(0));
      }
    };

    const draw = (t: number, dt: number) => {
      if (!W) return false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bx0 = Math.round(x0 * dpr);
      const bx1 = Math.round(x1 * dpr);
      const top = Math.round((S[0].y - Math.max(10, limit)) * dpr);
      const bottom = Math.round((S[n - 1].y + Math.max(10, limit)) * dpr);
      const bw = Math.max(2, Math.round(4 * dpr));
      ctx.fillStyle = rgba(ink, night ? 0.13 : 0.1);
      for (const bx of [bx0, bx1]) {
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(bx - bw / 2, top, bw, bottom - top, bw / 2);
        else ctx.rect(bx - bw / 2, top, bw, bottom - top);
        ctx.fill();
      }
      const inkStr = rgba(ink, inkAlpha());
      let busy = false;
      for (let i = 0; i < n; i++) {
        const s = S[i];
        if (leftTail && rightTail) {
          ctx.fillStyle = leftTail;
          ctx.fillRect(0, s.row, bx0, s.wd);
          ctx.fillStyle = rightTail;
          ctx.fillRect(bx1, s.row, canvas.width - bx1, s.wd);
        }
        let moving = false;
        if (s.hold) {
          holdShape(s, t, true);
          moving = true;
        } else if (s.live && modal(s, t)) {
          moving = true;
          if (!reduce) {
            for (let k = 0; k <= N; k++) {
              let v = s.res ? R * s.res[k] : 0;
              for (let m = 0; m < MODES; m++) v += C[m] * phi[m][k];
              Y[k] = v;
              E[k] = envAt(s, k);
            }
          }
        }
        if (moving) busy = true;
        if (moving && reduce && s.env) {
          const level =
            Math.hypot(A[0], A[1], A[2]) / Math.max(1e-6, Math.hypot(s.a[0], s.a[1], s.a[2], s.b[0], s.b[1], s.b[2]));
          const fade = 1 - Math.exp(-Math.max(0, t - s.t0) / 0.06);
          ctx.globalCompositeOperation = night ? "lighter" : "source-over";
          ctx.fillStyle = rgba(tint, (night ? 0.22 : 0.18) * level * fade);
          ctx.beginPath();
          ctx.moveTo(X[0], s.yd);
          smoothPath(-1, s, s.env, false);
          smoothPath(1, s, s.env, true);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
        if (!moving || reduce) {
          ctx.fillStyle = inkStr;
          ctx.fillRect(bx0, s.row, bx1 - bx0, s.wd);
          continue;
        }
        let eMax = 0;
        for (let k = 0; k <= N; k++) eMax = Math.max(eMax, E[k]);
        const energy = clamp(eMax / (0.8 * limit), 0, 1);
        if (eMax > 0.02) {
          const fade = s.hold ? 1 : 1 - Math.exp(-Math.max(0, t - s.t0) / 0.05);
          ctx.globalCompositeOperation = night ? "lighter" : "source-over";
          ctx.fillStyle = rgba(tint, (night ? 0.2 : 0.17) * energy * fade);
          ctx.beginPath();
          ctx.moveTo(X[0], s.yd);
          smoothPath(-1, s, E, false);
          smoothPath(1, s, E, true);
          ctx.fill();
        }
        if (night && eMax > 0.02) {
          ctx.beginPath();
          ctx.moveTo(X[0], s.yd + Y[0] * dpr);
          smoothPath(1, s, Y, false);
          ctx.lineCap = "butt";
          ctx.lineJoin = "round";
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgba(tint, 0.22 * energy);
          ctx.lineWidth = s.wd + 3 * dpr;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = inkStr;
        ctx.beginPath();
        ctx.moveTo(X[0], s.row + Y[0] * dpr);
        smoothPath(1, s, Y, false, -s.wd / 2);
        ctx.lineTo(X[N], s.row + s.wd + Y[N] * dpr);
        smoothPath(1, s, Y, true, s.wd / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = rgba(ink, night ? 0.7 : 0.62);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const s = S[i];
        const r = s.wd / 2 + 0.9 * dpr;
        for (const bx of [bx0, bx1]) {
          ctx.moveTo(bx + r, s.yd);
          ctx.arc(bx, s.yd, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      if (stepMarker(dt)) busy = true;
      if (mk.a > 0.002) {
        const mx = (x0 / 2) * dpr;
        const my = mk.y * dpr;
        ctx.fillStyle = rgba(tint, 0.18 * mk.a);
        ctx.beginPath();
        ctx.arc(mx, my, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(tint, mk.a);
        ctx.beginPath();
        ctx.arc(mx, my, 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      return busy || virtuals.length > 0;
    };

    const now = () => performance.now() / 1000;

    const frame = () => {
      raf = 0;
      const t = now();
      const dt = prevFrame ? clamp(t - prevFrame, 0, 0.1) : 0;
      prevFrame = t;
      advance(t);
      const busy = draw(t, dt);
      lastDraw = t;
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else prevFrame = 0;
    };

    const wake = () => {
      if (raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
    };

    const local = (clientX: number, clientY: number) => {
      const box = root.getBoundingClientRect();
      const k = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      return [(clientX - box.left) / k, (clientY - box.top) / k] as const;
    };

    const onMove = (e: globalThis.PointerEvent) => {
      const id = `p${e.pointerId}`;
      const t = now();
      const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      const samples = list.length > 0 ? list : [e];
      const p = pointers.get(id);
      const from = p ? p.t : t;
      for (let j = 0; j < samples.length; j++) {
        const [x, y] = local(samples[j].clientX, samples[j].clientY);
        move(id, x, y, from + ((t - from) * (j + 1)) / samples.length);
      }
      wake();
    };

    const onSeed = (e: globalThis.PointerEvent) => {
      const [x, y] = local(e.clientX, e.clientY);
      pointers.set(`p${e.pointerId}`, { x, y, t: now(), vy: 0, grip: 1 });
    };

    const onEnd = (e: globalThis.PointerEvent) => {
      end(`p${e.pointerId}`, Math.max(lastDraw, now()));
      wake();
    };

    const addVirtual = (
      x: number,
      from: number,
      to: number,
      dur: number,
      ease: (u: number) => number,
      grip: number,
    ) => {
      const id = `v${serial++}`;
      const t = now();
      pointers.set(id, { x, y: from, t, vy: 0, grip });
      virtuals.push({ id, x, from, to, start: t, dur, ease, at: t });
      wake();
    };

    sim.current = {
      pluck: (index, strength) => {
        if (!W || index < 0 || index >= n) return;
        const s = S[index];
        const q = clamp(strength, 0, 1);
        const x = x0 + L * 0.72;
        const grip = 0.4 + 0.6 * q;
        addVirtual(x, s.y - 3, s.y + dmaxAt(x) * grip + 4, 0.06 + 0.06 * (1 - q), (u) => u * u, grip);
      },
      strum: ({ direction = "down", at = 0.66, duration = 700, strength = 0.5 }) => {
        if (!W) return;
        const above = S[0].y - limit * 2.5;
        const below = S[n - 1].y + limit * 2.5;
        const down = direction !== "up";
        addVirtual(
          x0 + L * clamp(at, 0.05, 0.95),
          down ? above : below,
          down ? below : above,
          Math.max(0.05, duration / 1000),
          (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
          0.25 + 0.75 * clamp(strength, 0, 1),
        );
      },
      mark: (index, show) => {
        mk.idx = index;
        mk.show = show;
        wake();
      },
      recolor: () => {
        readColors();
        if (!raf) draw(now(), 0);
      },
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onSeed);
    root.addEventListener("pointerenter", onSeed);
    root.addEventListener("pointerup", onEnd);
    root.addEventListener("pointercancel", onEnd);
    root.addEventListener("pointerleave", onEnd);

    const ro = new ResizeObserver(() => {
      geometry();
      if (!raf) draw(now(), 0);
    });
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) wake();
    });
    io.observe(root);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      readColors();
      if (!raf) draw(now(), 0);
    }, root);
    geometry();
    readColors();
    draw(now(), 0);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      sim.current = null;
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onSeed);
      root.removeEventListener("pointerenter", onSeed);
      root.removeEventListener("pointerup", onEnd);
      root.removeEventListener("pointercancel", onEnd);
      root.removeEventListener("pointerleave", onEnd);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
    };
  }, [count, reduce]);

  useEffect(() => {
    if (color) sim.current?.recolor();
  }, [color]);

  const focusTo = (index: number) => {
    const j = clamp(index, 0, count - 1);
    setActive(j);
    buttons.current[j]?.focus();
    sim.current?.mark(j, true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    gestured.current = true;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        focusTo(marked + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        focusTo(marked - 1);
        break;
      case "Home":
        e.preventDefault();
        focusTo(0);
        break;
      case "End":
        e.preventDefault();
        focusTo(count - 1);
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        if (e.repeat) break;
        ensureAudio();
        sim.current?.pluck(marked, 0.7);
        break;
    }
  };

  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    const target = e.target as HTMLElement;
    const index = buttons.current.indexOf(target as HTMLButtonElement);
    let shown = true;
    try {
      shown = target.matches(":focus-visible");
    } catch {}
    sim.current?.mark(index >= 0 ? index : marked, shown);
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    onBlur?.(e);
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) sim.current?.mark(marked, false);
  };

  const labelled = props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Strings");

  return (
    <div
      {...props}
      ref={rootRef}
      role="toolbar"
      aria-orientation="vertical"
      aria-label={labelled}
      onKeyDown={handleKeyDown}
      onKeyUp={(e) => {
        onKeyUp?.(e);
        if (e.key === " ") e.preventDefault();
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        gestured.current = true;
        ensureAudio();
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      style={style}
      className={cn(
        "relative isolate h-80 w-full overflow-clip rounded-2xl outline-none select-none [-webkit-tap-highlight-color:transparent]",
        "bg-(--miyuki-koto-strings-well) inset-ring inset-ring-(--miyuki-koto-strings-edge)",
        "[--miyuki-koto-strings-edge:color-mix(in_oklab,var(--border-strong)_82%,var(--warning))] [--miyuki-koto-strings-well:color-mix(in_oklab,color-mix(in_oklab,var(--card)_94%,var(--warning))_97%,var(--foreground))]",
        "dark:[--miyuki-koto-strings-edge:color-mix(in_oklab,var(--border)_70%,var(--brand))] dark:[--miyuki-koto-strings-well:color-mix(in_oklab,var(--background)_88%,var(--brand))]",
        "dark:bg-[linear-gradient(180deg,var(--miyuki-koto-strings-well),color-mix(in_oklab,var(--background)_94%,var(--brand)))]",
        "transition-[box-shadow] duration-200 ease-settle has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring",
        className,
      )}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 touch-pinch-zoom"
        style={{ left: "clamp(22px, 7.5%, 56px)", right: "clamp(22px, 7.5%, 56px)" }}
      />
      {Array.from({ length: count }, (_, i) => {
        const { name } = note(count - 1 - i);
        const at = count > 1 ? i / (count - 1) : 0.5;
        return (
          <button
            key={name}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            tabIndex={i === marked ? 0 : -1}
            aria-label={`String ${i + 1}, ${name}`}
            onClick={() => {
              setActive(i);
              ensureAudio();
              sim.current?.pluck(i, 0.7);
            }}
            className="pointer-events-none absolute inset-x-0 h-4 -translate-y-1/2 appearance-none border-0 bg-transparent p-0 opacity-0 outline-none"
            style={{ top: `calc(clamp(18px, 10%, 40px) + (100% - 2 * clamp(18px, 10%, 40px)) * ${at})` }}
          />
        );
      })}
    </div>
  );
}
