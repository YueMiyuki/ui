"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { PlayPauseButton } from "@/components/miyuki-ui/path-morph";
import { Slider } from "@/components/miyuki-ui/slider";
import { cn } from "@/lib/utils";

export type SoundscapeSource = "rain" | "wind" | "stream" | "fire";

export interface SoundscapeMixerProps extends Omit<ComponentProps<"section">, "title"> {
  title?: ReactNode;
  sources?: SoundscapeSource[];
  defaultLevels?: Partial<Record<SoundscapeSource, number>>;
  defaultVolume?: number;
}

const ALL: SoundscapeSource[] = ["rain", "wind", "stream", "fire"];
const NAMES: Record<SoundscapeSource, string> = { rain: "Rain", wind: "Wind", stream: "Stream", fire: "Fire" };
const NOTES: Record<SoundscapeSource, string> = {
  rain: "On the roof",
  wind: "In the pines",
  stream: "Under the bridge",
  fire: "In the stove",
};
const LEVELS: Record<SoundscapeSource, number> = { rain: 0.6, wind: 0.35, stream: 0.45, fire: 0.55 };
const TRIM: Record<SoundscapeSource, number> = { rain: 1.2, wind: 0.75, stream: 0.95, fire: 0.6 };
const TINT: Record<SoundscapeSource, string> = {
  rain: "var(--brand)",
  wind: "var(--chart-2)",
  stream: "var(--chart-1)",
  fire: "var(--chart-5)",
};

interface Blip {
  at: number;
  x: number;
  size: number;
}

interface Voice {
  bus: GainNode;
  analyser: AnalyserNode;
  data: Float32Array<ArrayBuffer>;
  blips: Blip[];
  rms: number;
}

interface Engine {
  ac: AudioContext;
  master: GainNode;
  voices: Partial<Record<SoundscapeSource, Voice>>;
  timers: number[];
  stop: () => void;
}

function makeNoise(ac: AudioContext, seconds: number, kind: "white" | "pink" | "brown") {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const d = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") d[i] = white * 0.5;
    else if (kind === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buffer;
}

function makePatter(ac: AudioContext, seconds: number) {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const d = buffer.getChannelData(0);
  const drops = Math.floor(seconds * 1100);
  for (let k = 0; k < drops; k++) {
    const start = Math.floor(Math.random() * length);
    const amp = 0.08 + Math.random() ** 4 * 0.9;
    const tau = ac.sampleRate * (0.0006 + Math.random() * 0.0018);
    const n = Math.min(length - start, Math.floor(tau * 6));
    for (let j = 0; j < n; j++) d[start + j] += amp * (Math.random() * 2 - 1) * Math.exp(-j / tau);
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const scale = peak ? 0.9 / peak : 1;
  for (let i = 0; i < length; i++) d[i] *= scale;
  return buffer;
}

function makeClick(ac: AudioContext, ms: number, decay: number) {
  const length = Math.floor((ac.sampleRate * ms) / 1000);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const d = buffer.getChannelData(0);
  const tau = (ac.sampleRate * decay) / 1000;
  for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / tau);
  return buffer;
}

function loop(ac: AudioContext, buffer: AudioBuffer, to: AudioNode) {
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(to);
  src.start(ac.currentTime, Math.random() * buffer.duration);
  return src;
}

function filter(ac: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[0];
}

function createEngine(
  sources: SoundscapeSource[],
  levels: Record<SoundscapeSource, number>,
  volume: number,
  levelOf: (source: SoundscapeSource) => number,
): Engine | null {
  const Ctor =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  const ac = new Ctor();
  const master = ac.createGain();
  master.gain.value = 0;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.25;
  const ceiling = ac.createWaveShaper();
  const curve = new Float32Array(2049);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    const m = Math.abs(x);
    curve[i] = Math.sign(x) * (m < 0.7 ? m : 0.7 + 0.28 * Math.tanh((m - 0.7) / 0.28));
  }
  ceiling.curve = curve;
  ceiling.oversample = "4x";
  master.connect(limiter);
  limiter.connect(ceiling);
  ceiling.connect(ac.destination);

  const white = makeNoise(ac, 5, "white");
  const pink = makeNoise(ac, 5, "pink");
  const brown = makeNoise(ac, 6, "brown");
  const click = makeClick(ac, 24, 1.6);
  const pop = makeClick(ac, 70, 7);
  const voices: Engine["voices"] = {};
  const timers: number[] = [];

  const voice = (source: SoundscapeSource) => {
    const bus = ac.createGain();
    bus.gain.value = TRIM[source] * levels[source] ** 2;
    const analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    bus.connect(master);
    bus.connect(analyser);
    const v: Voice = { bus, analyser, data: new Float32Array(analyser.fftSize), blips: [], rms: 0 };
    voices[source] = v;
    return v;
  };

  const every = (min: number, max: number, run: () => void) => {
    let id = 0;
    const tick = () => {
      run();
      id = window.setTimeout(tick, (min + Math.random() * (max - min)) * 1000);
      timers[slot] = id;
    };
    const slot = timers.length;
    timers.push(0);
    id = window.setTimeout(tick, Math.random() * min * 1000);
    timers[slot] = id;
  };

  const schedule = (rate: (v: Voice) => number, v: Voice, fire: (t: number, v: Voice) => void) => {
    let ahead = ac.currentTime + 0.05;
    const run = () => {
      const horizon = ac.currentTime + 0.18;
      if (ahead < ac.currentTime) ahead = ac.currentTime + 0.01;
      while (ahead < horizon) {
        const r = rate(v);
        if (r <= 0.01) {
          ahead = horizon;
          break;
        }
        ahead += -Math.log(1 - Math.random()) / r;
        if (ahead < horizon) fire(ahead, v);
      }
    };
    const id = window.setInterval(run, 60);
    timers.push(id);
  };

  if (sources.includes("rain")) {
    const v = voice("rain");
    const patter = makePatter(ac, 6);
    const bedGain = ac.createGain();
    bedGain.gain.value = 0.42;
    loop(ac, pink, chain(filter(ac, "highpass", 450), filter(ac, "lowpass", 6500), bedGain, v.bus));
    const patterGain = ac.createGain();
    patterGain.gain.value = 1.3;
    loop(ac, patter, chain(filter(ac, "highpass", 900), filter(ac, "peaking", 3200, 0.8), patterGain, v.bus));
    schedule(
      () => 1.5 + levelOf("rain") * 9,
      v,
      (t, x) => {
        const f0 = 1500 + Math.random() * 2200;
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.035);
        const g = ac.createGain();
        const amp = 0.05 + Math.random() ** 3 * 0.22;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.connect(g).connect(x.bus);
        osc.start(t);
        osc.stop(t + 0.07);
        x.blips.push({ at: t, x: Math.random(), size: amp });
        if (x.blips.length > 40) x.blips.shift();
      },
    );
  }

  if (sources.includes("wind")) {
    const v = voice("wind");
    const band = filter(ac, "bandpass", 480, 0.9);
    const gust = ac.createGain();
    gust.gain.value = 0.5;
    const body = ac.createGain();
    body.gain.value = 1.6;
    loop(ac, brown, chain(band, gust, body, v.bus));
    const whistle = filter(ac, "bandpass", 900, 9);
    const whistleGain = ac.createGain();
    whistleGain.gain.value = 0.12;
    loop(ac, pink, chain(whistle, whistleGain, gust));
    every(1.4, 3.6, () => {
      const now = ac.currentTime;
      const strength = 0.25 + Math.random() ** 1.5 * 0.85;
      band.frequency.setTargetAtTime(260 + strength * 700 + Math.random() * 120, now, 1.3);
      gust.gain.setTargetAtTime(strength, now, 1.1);
      whistle.frequency.setTargetAtTime(650 + strength * 1100, now, 1.6);
      whistleGain.gain.setTargetAtTime(0.04 + strength * 0.12, now, 1.4);
    });
  }

  if (sources.includes("stream")) {
    const v = voice("stream");
    const rush = ac.createGain();
    rush.gain.value = 0.9;
    loop(ac, white, chain(filter(ac, "highpass", 220), filter(ac, "lowpass", 1400), rush, v.bus));
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.27;
    const depth = ac.createGain();
    depth.gain.value = 0.2;
    lfo.connect(depth).connect(rush.gain);
    lfo.start();
    const ripple = ac.createGain();
    ripple.gain.value = 0.3;
    loop(ac, pink, chain(filter(ac, "bandpass", 2400, 1.4), ripple, v.bus));
    schedule(
      () => 8 + levelOf("stream") * 34,
      v,
      (t, x) => {
        const f0 = 380 + Math.random() ** 1.5 * 900;
        const dur = 0.03 + Math.random() * 0.06;
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f0 * (1.7 + Math.random() * 0.9), t + dur);
        const g = ac.createGain();
        const amp = 0.025 + Math.random() ** 2 * 0.09;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(x.bus);
        osc.start(t);
        osc.stop(t + dur + 0.01);
        if (Math.random() < 0.35) {
          x.blips.push({ at: t, x: Math.random(), size: amp * 8 });
          if (x.blips.length > 40) x.blips.shift();
        }
      },
    );
  }

  if (sources.includes("fire")) {
    const v = voice("fire");
    const roar = ac.createGain();
    roar.gain.value = 0.7;
    loop(ac, brown, chain(filter(ac, "lowpass", 380), roar, v.bus));
    const hiss = ac.createGain();
    hiss.gain.value = 0.025;
    loop(ac, white, chain(filter(ac, "highpass", 3500), hiss, v.bus));
    every(0.25, 0.7, () => {
      const now = ac.currentTime;
      roar.gain.setTargetAtTime(0.45 + Math.random() * 0.55, now, 0.25);
      hiss.gain.setTargetAtTime(0.012 + Math.random() * 0.03, now, 0.2);
    });
    const crackleBand = filter(ac, "highpass", 1800);
    crackleBand.connect(v.bus);
    const popBand = filter(ac, "bandpass", 1100, 1.2);
    popBand.connect(v.bus);
    let burst = 0;
    schedule(
      () => (3 + levelOf("fire") * 10) * (burst > 0 ? 4 : 1),
      v,
      (t, x) => {
        if (burst > 0) burst--;
        else if (Math.random() < 0.12) burst = 3 + Math.floor(Math.random() * 7);
        const big = Math.random() < 0.06;
        const src = ac.createBufferSource();
        src.buffer = big ? pop : click;
        src.playbackRate.value = big ? 0.8 + Math.random() * 0.5 : 0.6 + Math.random() * 1.4;
        const g = ac.createGain();
        const amp = big ? 0.5 + Math.random() * 0.3 : 0.06 + Math.random() ** 2 * 0.45;
        g.gain.value = amp;
        src.connect(g).connect(big ? popBand : crackleBand);
        src.start(t);
        x.blips.push({ at: t, x: 0.3 + Math.random() * 0.4, size: big ? 1 : amp });
        if (x.blips.length > 40) x.blips.shift();
      },
    );
  }

  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(volume ** 2, ac.currentTime + 0.5);

  return {
    ac,
    master,
    voices,
    timers,
    stop: () => {
      for (const id of timers) {
        window.clearTimeout(id);
        window.clearInterval(id);
      }
      void ac.close();
    },
  };
}

function css([r, g, b]: [number, number, number, number], a: number) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(3)})`;
}

export function SoundscapeMixer({
  title = "Soundscape",
  sources = ALL,
  defaultLevels,
  defaultVolume = 0.75,
  className,
  ...props
}: SoundscapeMixerProps) {
  const reduce = useReducedMotion() ?? false;
  const titleId = useId();
  const list = ALL.filter((s) => sources.includes(s));
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(defaultVolume);
  const [levels, setLevels] = useState<Record<SoundscapeSource, number>>(() => ({ ...LEVELS, ...defaultLevels }));
  const engine = useRef<Engine | null>(null);
  const suspendTimer = useRef(0);
  const canvases = useRef<Partial<Record<SoundscapeSource, HTMLCanvasElement | null>>>({});
  const live = useRef({ playing, levels, volume });

  useEffect(() => {
    live.current = { playing, levels, volume };
  });

  useEffect(() => () => engine.current?.stop(), []);

  function toggle(next: boolean) {
    setPlaying(next);
    window.clearTimeout(suspendTimer.current);
    if (next) {
      if (!engine.current) engine.current = createEngine(list, levels, volume, (k) => live.current.levels[k]);
      const e = engine.current;
      if (!e) return;
      void e.ac.resume();
      const now = e.ac.currentTime;
      e.master.gain.cancelScheduledValues(now);
      e.master.gain.setValueAtTime(e.master.gain.value, now);
      e.master.gain.linearRampToValueAtTime(volume ** 2, now + 0.4);
    } else {
      const e = engine.current;
      if (!e) return;
      const now = e.ac.currentTime;
      e.master.gain.cancelScheduledValues(now);
      e.master.gain.setValueAtTime(e.master.gain.value, now);
      e.master.gain.linearRampToValueAtTime(0, now + 0.25);
      suspendTimer.current = window.setTimeout(() => {
        if (!live.current.playing) void e.ac.suspend();
      }, 320);
    }
  }

  function setLevel(source: SoundscapeSource, value: number) {
    setLevels((prev) => ({ ...prev, [source]: value }));
    const v = engine.current?.voices[source];
    if (!v || !engine.current) return;
    v.bus.gain.setTargetAtTime(TRIM[source] * value ** 2, engine.current.ac.currentTime, 0.06);
  }

  function changeVolume(value: number) {
    setVolume(value);
    const e = engine.current;
    if (!e || !playing) return;
    e.master.gain.setTargetAtTime(value ** 2, e.ac.currentTime, 0.06);
  }

  const listKey = list.join(",");

  useEffect(() => {
    const keys = listKey.split(",").filter(Boolean) as SoundscapeSource[];
    const boxes = keys.map((k) => ({ key: k, canvas: canvases.current[k] ?? null, w: 0, h: 0, dpr: 1 }));
    const colors: Partial<
      Record<SoundscapeSource, { tint: [number, number, number, number]; warm: [number, number, number, number] }>
    > = {};
    let raf = 0;
    let last = 0;
    let clock = 0;
    let onScreen = true;
    const smooth: Record<SoundscapeSource, number> = { rain: 0, wind: 0, stream: 0, fire: 0 };

    const read = () => {
      for (const b of boxes) {
        if (!b.canvas) continue;
        colors[b.key] = { tint: toRgba(TINT[b.key], b.canvas), warm: toRgba("var(--chart-4)", b.canvas) };
      }
    };

    const size = () => {
      for (const b of boxes) {
        const c = b.canvas;
        if (!c) continue;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (c.clientWidth === b.w && c.clientHeight === b.h && dpr === b.dpr) continue;
        b.w = c.clientWidth;
        b.h = c.clientHeight;
        b.dpr = dpr;
        c.width = Math.max(1, Math.round(b.w * dpr));
        c.height = Math.max(1, Math.round(b.h * dpr));
      }
    };

    const draw = (dt: number) => {
      const e = engine.current;
      const state = live.current;
      const now = e ? e.ac.currentTime : 0;
      clock += reduce ? 0 : dt;
      for (const b of boxes) {
        const c = b.canvas;
        const g = c?.getContext("2d");
        const col = colors[b.key];
        if (!c || !g || !col || !b.w) continue;
        const v = e?.voices[b.key];
        let target = 0;
        if (v && state.playing) {
          v.analyser.getFloatTimeDomainData(v.data);
          let sum = 0;
          for (let i = 0; i < v.data.length; i++) sum += v.data[i] * v.data[i];
          v.rms = Math.sqrt(sum / v.data.length);
          target = Math.min(1, v.rms * 7);
        }
        const level = state.levels[b.key];
        const energy = state.playing ? target : level * 0.18;
        smooth[b.key] += (energy - smooth[b.key]) * (1 - Math.exp(-dt * 10));
        const amt = reduce ? Math.max(level * 0.5, energy) : smooth[b.key];
        g.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
        g.clearRect(0, 0, b.w, b.h);
        const W = b.w;
        const H = b.h;
        const tint = (a: number) => css(col.tint, a);
        const dim = state.playing ? 1 : 0.55;
        if (b.key === "rain") {
          const count = Math.round(6 + level * 34);
          g.strokeStyle = tint(0.55 * dim);
          g.lineWidth = 1;
          g.lineCap = "round";
          g.beginPath();
          for (let i = 0; i < count; i++) {
            const seed = (i * 0.6180339) % 1;
            const fall = reduce || !state.playing ? 0.35 : clock * (0.9 + seed * 0.6);
            const y = ((seed * 7.3 + fall) % 1) * (H + 14) - 10;
            const x = ((seed * 13.7) % 1) * (W + 12) - 6 - y * 0.18;
            const len = 5 + seed * 6 + amt * 6;
            g.moveTo(x, y);
            g.lineTo(x - len * 0.18, y + len);
          }
          g.stroke();
          if (v && state.playing && !reduce) {
            for (const blip of v.blips) {
              const age = now - blip.at;
              if (age < 0 || age > 0.6) continue;
              const k = age / 0.6;
              g.strokeStyle = tint((1 - k) * 0.8);
              g.beginPath();
              g.ellipse(
                6 + blip.x * (W - 12),
                H - 6,
                2 + k * (8 + blip.size * 30),
                1 + k * (2 + blip.size * 7),
                0,
                0,
                Math.PI * 2,
              );
              g.stroke();
            }
          }
        } else if (b.key === "wind") {
          g.lineCap = "round";
          for (let line = 0; line < 4; line++) {
            const base = H * (0.25 + line * 0.17);
            const amp = (2 + amt * 9) * (1 - line * 0.12);
            const phase = clock * (1.2 + amt * 2.4) + line * 1.7;
            const grad = g.createLinearGradient(0, 0, W, 0);
            grad.addColorStop(0, tint(0));
            grad.addColorStop(0.3, tint((0.35 + amt * 0.5) * dim));
            grad.addColorStop(0.7, tint((0.35 + amt * 0.5) * dim));
            grad.addColorStop(1, tint(0));
            g.strokeStyle = grad;
            g.lineWidth = 1.25;
            g.beginPath();
            for (let x = 0; x <= W; x += 3) {
              const y = base + Math.sin(x * 0.07 - phase * 2.2) * amp * 0.6 + Math.sin(x * 0.023 - phase) * amp;
              if (x === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.stroke();
          }
        } else if (b.key === "stream") {
          const surface = H * 0.42;
          g.fillStyle = tint(0.16 * dim);
          g.beginPath();
          g.moveTo(0, H);
          for (let x = 0; x <= W; x += 3) {
            const y =
              surface +
              Math.sin(x * 0.09 - clock * 4) * (1 + amt * 3) +
              Math.sin(x * 0.033 + clock * 2.3) * (1 + amt * 2);
            g.lineTo(x, y);
          }
          g.lineTo(W, H);
          g.closePath();
          g.fill();
          g.strokeStyle = tint(0.75 * dim);
          g.lineWidth = 1.25;
          g.beginPath();
          for (let x = 0; x <= W; x += 3) {
            const y =
              surface +
              Math.sin(x * 0.09 - clock * 4) * (1 + amt * 3) +
              Math.sin(x * 0.033 + clock * 2.3) * (1 + amt * 2);
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
          if (v && state.playing && !reduce) {
            g.lineWidth = 1;
            for (const blip of v.blips) {
              const age = now - blip.at;
              if (age < 0 || age > 0.9) continue;
              const k = age / 0.9;
              const r = 1 + blip.size * 2.2;
              const y = H - 4 - k * (H - 4 - surface);
              g.strokeStyle = tint((1 - k * k) * 0.8);
              g.beginPath();
              g.arc(6 + blip.x * (W - 12) + Math.sin(age * 18 + blip.x * 9) * 1.5, y, r, 0, Math.PI * 2);
              g.stroke();
            }
          }
        } else {
          const cx = W / 2;
          const base = H - 6;
          g.fillStyle = css(col.warm, 0.22 * dim);
          g.beginPath();
          g.ellipse(cx, base + 1, W * 0.22, 3, 0, 0, Math.PI * 2);
          g.fill();
          const flicker = (i: number) =>
            reduce || !state.playing
              ? 0
              : Math.sin(clock * (7 + i * 2.3) + i) * 0.5 + Math.sin(clock * (13 + i * 3.1)) * 0.3;
          for (let tongue = 0; tongue < 3; tongue++) {
            const scale = tongue === 1 ? 1 : 0.68;
            const offset = (tongue - 1) * W * 0.09;
            const tall = (H * 0.45 + amt * H * 0.4) * scale * (1 + flicker(tongue) * 0.12);
            const lean = flicker(tongue + 3) * 4;
            const width = W * 0.1 * scale;
            const grad = g.createLinearGradient(0, base - tall, 0, base);
            grad.addColorStop(0, css(col.tint, 0));
            grad.addColorStop(0.45, css(col.tint, 0.7 * dim));
            grad.addColorStop(1, css(col.warm, 0.95 * dim));
            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(cx + offset - width, base);
            g.bezierCurveTo(
              cx + offset - width,
              base - tall * 0.5,
              cx + offset + lean - width * 0.2,
              base - tall * 0.7,
              cx + offset + lean,
              base - tall,
            );
            g.bezierCurveTo(
              cx + offset + lean + width * 0.25,
              base - tall * 0.65,
              cx + offset + width,
              base - tall * 0.45,
              cx + offset + width,
              base,
            );
            g.closePath();
            g.fill();
          }
          if (v && state.playing && !reduce) {
            for (const blip of v.blips) {
              const age = now - blip.at;
              if (age < 0 || age > 0.8) continue;
              const k = age / 0.8;
              const x = cx + (blip.x - 0.5) * W * 0.5 + Math.sin(age * 9 + blip.x * 20) * 4 * k;
              const y = base - H * 0.25 - k * H * (0.4 + blip.size * 0.4);
              g.fillStyle = css(col.warm, (1 - k) * 0.95);
              g.fillRect(x, y, 1.6, 1.6);
            }
          }
        }
      }
    };

    const frame = (nowMs: number) => {
      raf = 0;
      const dt = last ? Math.max(0, Math.min(0.05, (nowMs - last) / 1000)) : 0;
      last = nowMs;
      draw(dt);
      if (live.current.playing && !reduce && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      size();
      draw(0);
    });
    for (const b of boxes) if (b.canvas) ro.observe(b.canvas);
    const first = boxes.find((b) => b.canvas)?.canvas;
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      if (onScreen) kick();
    });
    if (first) io.observe(first.parentElement?.parentElement ?? first);
    const onVisibility = () => !document.hidden && kick();
    document.addEventListener("visibilitychange", onVisibility);
    const offTheme = onThemeChange(() => {
      read();
      draw(0);
    });
    read();
    size();
    kick();
    const poll = window.setInterval(() => {
      if (live.current.playing && !reduce) kick();
      else draw(0);
    }, 250);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
    };
  }, [listKey, reduce]);

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
        <PlayPauseButton
          playing={playing}
          onChange={toggle}
          size={44}
          aria-label={playing ? "Pause soundscape" : "Play soundscape"}
          className="bg-brand text-brand-foreground data-[hovered]:bg-brand/90"
        />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="truncate text-base font-semibold tracking-[-0.01em]">
            {title}
          </h3>
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {playing ? `Playing ${list.length} sounds` : "Press play to start. Sound is made on the spot."}
          </p>
        </div>
        <Slider
          label="Volume"
          size="sm"
          value={volume}
          onChange={(v) => changeVolume(v as number)}
          minValue={0}
          maxValue={1}
          step={0.01}
          formatOptions={{ style: "percent" }}
          className="w-full sm:w-40"
        />
      </div>
      <div className={cn("mt-5 grid gap-3", list.length > 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
        {list.map((source) => (
          <div key={source} className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted p-3">
            <canvas
              ref={(el) => {
                canvases.current[source] = el;
              }}
              aria-hidden="true"
              className="h-14 w-full rounded-lg bg-background/70 dark:bg-background/40"
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] text-muted-foreground">{NOTES[source]}</p>
            </div>
            <Slider
              label={NAMES[source]}
              size="sm"
              value={levels[source]}
              onChange={(v) => setLevel(source, v as number)}
              minValue={0}
              maxValue={1}
              step={0.01}
              formatOptions={{ style: "percent" }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
