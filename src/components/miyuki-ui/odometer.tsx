"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface OdometerProps extends Omit<ComponentProps<"span">, "children" | "prefix"> {
  value: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  duration?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

interface Parsed {
  negative: boolean;
  lead: string;
  signAt: number;
  trail: string;
  int: string;
  frac: string;
  decimal: string;
  group: string;
  groups: number[];
}

interface Layout {
  fd: number;
  intLen: number;
  minInt: number;
  groups: Set<number>;
  group: string;
  decimal: string;
  lead: string;
  signAt: number;
  trail: string;
  signed: boolean;
  showFraction: boolean;
}

interface Wheel {
  pos: number;
  c: number | null;
  unit: number;
}

interface Track {
  k: number;
  at: (t: number) => number;
  end: number;
}

const PITCH = 1.06;
const RADIUS = PITCH / (2 * Math.tan(Math.PI / 10));
const LAG = 70;
const STEP_LIMIT = 12;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
const wrap = (x: number) => (((((x % 10) + 15) % 10) + 10) % 10) - 5;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const ZETA = 0.8;
const OMEGA = 5.3 / ZETA;
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);
const spring = (s: number) =>
  1 - Math.exp(-ZETA * OMEGA * s) * (Math.cos(OMEGA_D * s) + ((ZETA * OMEGA) / OMEGA_D) * Math.sin(OMEGA_D * s));
const SPRING_END = spring(1);
function settle(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return spring(t) + (1 - SPRING_END) * t ** 4;
}
const roll = (t: number) => {
  const x = clamp(t);
  return 0.55 * settle(x) + 0.45 * (1 - (1 - x) ** 3);
};

function parse(value: number, fmt: Intl.NumberFormat): Parsed {
  const out: Parsed = {
    negative: false,
    lead: "",
    signAt: 0,
    trail: "",
    int: "",
    frac: "",
    decimal: ".",
    group: ",",
    groups: [],
  };
  const marks: number[] = [];
  let digits = false;
  for (const p of fmt.formatToParts(Number.isFinite(value) ? value : 0)) {
    if (p.type === "minusSign") {
      out.negative = true;
      if (!digits) out.signAt = out.lead.length;
    } else if (p.type === "plusSign") {
    } else if (p.type === "integer") {
      out.int += p.value;
      digits = true;
    } else if (p.type === "group") {
      out.group = p.value;
      marks.push(out.int.length);
    } else if (p.type === "decimal") {
      out.decimal = p.value;
      digits = true;
    } else if (p.type === "fraction") {
      out.frac += p.value;
    } else if (!digits) out.lead += p.value;
    else out.trail += p.value;
  }
  out.groups = marks.map((n) => out.int.length - n);
  out.negative = out.negative && /[1-9]/.test(out.int + out.frac);
  return out;
}

function layoutOf(values: number[], fmt: Intl.NumberFormat): Layout {
  const parsed = values.map((v) => parse(v, fmt));
  const target = parsed[parsed.length - 1];
  const negative = parsed.find((p) => p.negative);
  return {
    fd: Math.max(0, ...parsed.map((p) => p.frac.length)),
    intLen: Math.max(1, ...parsed.map((p) => p.int.length)),
    minInt: fmt.resolvedOptions().minimumIntegerDigits ?? 1,
    groups: new Set(parsed.flatMap((p) => p.groups)),
    group: target.group,
    decimal: target.decimal,
    lead: target.lead,
    signAt: negative ? negative.signAt : 0,
    trail: target.trail,
    signed: !!negative,
    showFraction: target.frac.length > 0,
  };
}

function scaled(value: number, fmt: Intl.NumberFormat, fd: number) {
  const p = parse(value, fmt);
  const n = Number((p.int || "0") + p.frac.padEnd(fd, "0"));
  return p.negative ? -n : n;
}

function mech(x: number, j: number) {
  if (j <= 0) return x;
  const cycle = 10 ** j;
  const q = Math.floor(x / cycle);
  const r = x - q * cycle;
  return q + smooth(r - (cycle - 1));
}

function digitStyle(d: number, pos: number): CSSProperties {
  const a = wrap(d - pos) * (Math.PI / 5);
  if (Math.abs(a) >= Math.PI / 2) return { opacity: 0, transform: "translateY(0) scaleY(0)" };
  const cos = Math.cos(a);
  return {
    opacity: r4(0.18 + 0.82 * cos ** 1.5),
    transform: `translateY(${r4(RADIUS * Math.sin(a))}em) scaleY(${r4(cos)})`,
  };
}

function presenceStyle(p: number): CSSProperties {
  return p >= 1
    ? { width: "", marginInline: "", opacity: "" }
    : { width: `calc(${r4(p)} * 1ch)`, marginInline: `calc(${r4(p)} * ${WHEEL_M})`, opacity: r4(smooth(p * 1.4)) };
}

const WHEEL_M = "0.1em";

export function Odometer({
  value,
  format,
  locale = "en-US",
  duration = 1400,
  prefix,
  suffix,
  className,
  ref,
  ...props
}: OdometerProps) {
  const reduce = useReducedMotion() === true;
  const formatKey = JSON.stringify(format ?? {});
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        ...(JSON.parse(formatKey) as Intl.NumberFormatOptions),
        numberingSystem: "latn",
      }),
    [locale, formatKey],
  );
  const [anchors, setAnchors] = useState<number[]>([]);
  const [last, setLast] = useState(value);
  if (!Object.is(last, value)) {
    setLast(value);
    setAnchors((a) => [...a, last]);
  }
  const layout = useMemo(() => layoutOf([...anchors, value], fmt), [anchors, value, fmt]);

  const digitRefs = useRef(new Map<number, (HTMLSpanElement | null)[]>());
  const wheelRefs = useRef(new Map<number, HTMLSpanElement | null>());
  const sepRefs = useRef(new Map<number, HTMLSpanElement | null>());
  const signRef = useRef<HTMLSpanElement>(null);
  const wheels = useRef(new Map<number, Wheel>());
  const target = useRef<number | null>(null);
  const fdRef = useRef(layout.fd);
  const sign = useRef(0);
  const flight = useRef<number | null>(null);

  const { fd, intLen, minInt } = layout;
  const places = intLen + fd;
  const S = scaled(value, fmt, fd);
  const restPos = (k: number) => Math.floor(Math.abs(S) / 10 ** k);
  const restPresence = (j: number) => (j < minInt ? 1 : clamp(restPos(j + fd)));

  useLayoutEffect(() => {
    const prevValue = target.current;
    const prevFd = fdRef.current;
    if (prevValue !== null && Object.is(prevValue, value) && prevFd === fd) return;
    target.current = value;
    fdRef.current = fd;
    const S1 = scaled(value, fmt, fd);
    const B = Math.abs(S1);

    const presenceOf = (k: number, pos: number) => {
      const j = k - fd;
      return j < 0 || j < minInt ? 1 : clamp(pos);
    };
    const paint = (k: number, pos: number) => {
      const spans = digitRefs.current.get(k);
      spans?.forEach((el, d) => {
        if (!el) return;
        const st = digitStyle(d, pos);
        el.style.opacity = String(st.opacity);
        el.style.transform = String(st.transform);
      });
      const p = presenceOf(k, pos);
      const box = wheelRefs.current.get(k);
      if (box) Object.assign(box.style, presenceStyle(p));
      const sep = sepRefs.current.get(k - fd);
      if (sep) {
        sep.style.maxWidth = p >= 1 ? "" : `${r4(p * 0.5)}em`;
        sep.style.opacity = p >= 1 ? "" : String(r4(smooth(p * 1.4)));
      }
    };
    const paintSign = (n: number) => {
      sign.current = n;
      const el = signRef.current;
      if (!el) return;
      el.style.maxWidth = `${r4(n * 0.75)}em`;
      el.style.opacity = String(r4(smooth(n * 1.3)));
    };
    const rest = () => {
      flight.current = null;
      wheels.current = new Map();
      for (let k = 0; k < places; k++) {
        const pos = Math.floor(B / 10 ** k);
        wheels.current.set(k, { pos, c: null, unit: 1 });
        paint(k, pos);
      }
      paintSign(S1 < 0 ? 1 : 0);
    };

    if (prevValue === null || reduce || prevFd !== fd) {
      rest();
      if (anchors.length === 0) return;
      const id = requestAnimationFrame(() => setAnchors([]));
      return () => cancelAnimationFrame(id);
    }

    const S0 = scaled(prevValue, fmt, fd);
    const A = Math.abs(S0);
    const cross = S0 * S1 < 0;
    const travel = (k: number) =>
      cross
        ? Math.floor(A / 10 ** k) + Math.floor(B / 10 ** k)
        : Math.abs(Math.floor(B / 10 ** k) - Math.floor(A / 10 ** k));
    let L = 0;
    while (L < places - 1 && travel(L) > STEP_LIMIT) L++;
    if (flight.current !== null) L = Math.min(places - 1, Math.max(L, flight.current));
    flight.current = L;
    const unit = 10 ** L;
    const C1 = Math.sign(S1) * Math.floor(B / unit);
    const restC = Math.sign(S0) * Math.floor(A / unit);
    const dir = cross || B >= A ? 1 : -1;
    const tracks: Track[] = [];
    let driver: (t: number) => number = () => C1;

    for (let k = 0; k < places; k++) {
      const state = wheels.current.get(k) ?? { pos: 0, c: null, unit };
      if (k < L) {
        const p0 = state.pos;
        const want = Math.floor(B / 10 ** k) % 10;
        const phase = ((p0 % 10) + 10) % 10;
        const steps = dir > 0 ? ((((want - phase) % 10) + 10) % 10) + 10 : -(((((phase - want) % 10) + 10) % 10) + 10);
        const span = duration * 0.85;
        tracks.push({ k, at: (t) => p0 + steps * roll(t / span), end: span });
        state.c = null;
      } else {
        const j = k - L;
        const C0 =
          state.c === null
            ? restC
            : state.unit === unit
              ? state.c
              : Math.sign(state.c) * Math.floor((Math.abs(state.c) * state.unit) / unit);
        const lag = j * LAG;
        const span = duration * (1 + 0.14 * j);
        const c = (t: number) => C0 + (C1 - C0) * roll((t - lag) / span);
        if (k === L) driver = c;
        tracks.push({
          k,
          at: (t) => {
            const v = c(t);
            const st = wheels.current.get(k);
            if (st) {
              st.c = v;
              st.unit = unit;
            }
            return mech(Math.abs(v), j);
          },
          end: lag + span,
        });
      }
      state.unit = unit;
      wheels.current.set(k, state);
    }

    const total = Math.max(...tracks.map((tr) => tr.end));
    const signed = cross || sign.current !== (S1 < 0 ? 1 : 0);
    const step = (t: number) => {
      for (const tr of tracks) {
        const pos = tr.at(Math.min(t, tr.end));
        const st = wheels.current.get(tr.k);
        if (st) st.pos = pos;
        paint(tr.k, pos);
      }
      paintSign(signed ? smooth(-driver(t)) : S1 < 0 ? 1 : 0);
    };
    step(0);
    let begin = -1;
    let frame = requestAnimationFrame(function tick(now) {
      if (begin < 0) begin = now;
      const t = now - begin;
      step(t);
      if (t < total) frame = requestAnimationFrame(tick);
      else {
        rest();
        setAnchors([]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [value, fmt, reduce, duration, fd, places, minInt, anchors.length]);

  const order: { kind: "wheel" | "sep" | "decimal"; k: number }[] = [];
  for (let j = intLen - 1; j >= 0; j--) {
    order.push({ kind: "wheel", k: j + fd });
    if (j > 0 && layout.groups.has(j)) order.push({ kind: "sep", k: j });
  }
  if (fd > 0) {
    order.push({ kind: "decimal", k: -1 });
    for (let k = fd - 1; k >= 0; k--) order.push({ kind: "wheel", k });
  }

  const lead = layout.lead;
  const signAt = Math.min(layout.signAt, lead.length);

  return (
    <span
      ref={ref}
      {...props}
      className={cn(
        "inline-block font-display font-semibold whitespace-nowrap text-foreground tabular-nums",
        "[--miyuki-odometer-shade:color-mix(in_oklab,var(--brand-strong)_13%,transparent)]",
        "dark:[--miyuki-odometer-shade:color-mix(in_oklab,var(--background)_85%,transparent)]",
        className,
      )}
    >
      {prefix != null && <span className="me-[0.12em]">{prefix}</span>}
      <span className="sr-only">{fmt.format(value)}</span>
      <span aria-hidden="true">
        {lead.slice(0, signAt)}
        {layout.signed && (
          <span
            ref={signRef}
            className="inline-block [clip-path:inset(0)]"
            style={{ maxWidth: S < 0 ? "0.75em" : "0em", opacity: S < 0 ? 1 : 0 }}
          >
            −
          </span>
        )}
        {lead.slice(signAt)}
        {order.map((item) => {
          if (item.kind === "sep") {
            const p = restPresence(item.k);
            return (
              <span
                key={`s${item.k}`}
                ref={(el) => {
                  sepRefs.current.set(item.k, el);
                }}
                className="inline-block [clip-path:inset(0)]"
                style={p >= 1 ? undefined : { maxWidth: `${r4(p * 0.5)}em`, opacity: r4(p) }}
              >
                {layout.group}
              </span>
            );
          }
          if (item.kind === "decimal") {
            return (
              <span key="d" className={cn(!layout.showFraction && "hidden")}>
                {layout.decimal}
              </span>
            );
          }
          const k = item.k;
          const j = k - fd;
          const pos = restPos(k);
          return (
            <span
              key={`w${k}`}
              ref={(el) => {
                wheelRefs.current.set(k, el);
              }}
              className="relative mx-[0.1em] inline-block text-center leading-none"
              style={presenceStyle(j >= 0 ? restPresence(j) : 1)}
            >
              <span className="invisible">0</span>
              <span className="absolute -inset-x-[0.07em] -inset-y-[0.05em] overflow-hidden rounded-[0.1em] bg-card ring-1 ring-border ring-inset dark:bg-background/60">
                <span className="absolute inset-x-[0.07em] inset-y-[0.05em]">
                  {Array.from({ length: 10 }, (_, d) => (
                    <span
                      key={d}
                      ref={(el) => {
                        const list = digitRefs.current.get(k) ?? [];
                        list[d] = el;
                        digitRefs.current.set(k, list);
                      }}
                      className="absolute inset-0 origin-center will-change-transform"
                      style={digitStyle(d, pos)}
                    >
                      {d}
                    </span>
                  ))}
                </span>
                <span className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--miyuki-odometer-shade),transparent_30%,transparent_70%,var(--miyuki-odometer-shade))]" />
              </span>
            </span>
          );
        })}
        {layout.trail}
      </span>
      {suffix != null && <span className="ms-[0.16em]">{suffix}</span>}
    </span>
  );
}
