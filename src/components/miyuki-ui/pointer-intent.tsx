"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

export type IntentSource = "pointer" | "hover" | "focus" | "touch";

export interface IntentDetail {
  source: IntentSource;
}

export interface PointerIntentOptions {
  selector?: string;
  onIntent?: (element: Element, detail: IntentDetail) => void;
  onIntentEnd?: (element: Element) => void;
  onAim?: (element: Element) => void;
  onAimEnd?: (element: Element) => void;
  lead?: number;
  horizon?: number;
  dwell?: number;
  minSpeed?: number;
  maxReach?: number;
  disabled?: boolean;
}

export interface UsePointerIntentOptions extends PointerIntentOptions {
  root?: RefObject<Element | null>;
}

type TraceFrame = { x: number; y: number; fx: number; fy: number; locked: boolean };
type TraceDraw = (frame: TraceFrame | null) => void;
type TraceChannel = RefObject<TraceDraw | null>;

interface Watcher {
  measure(now: number, fresh: boolean): void;
  apply(now: number, dt: number): void;
  rest(): void;
  leave(): void;
  press(target: Element | null, touch: boolean): void;
  cancel(): void;
  focus(target: Element | null): void;
  blur(target: Element | null, next: Element | null): void;
  dispose(): void;
}

const SELECTOR = "[data-intent-target]";
const WINDOW = 100;
const AIM = 50;
const STALE = 40;
const STILL = 80;
const CAP = 64;
const START = 80;
const PRIOR = Math.log(0.4 / 0.6);
const NEED = 1.2;
const FADE = 0.2;
const HOLD = 50;
const GAP = 30;
const LAND = 1.25;
const LEAVE = 20;
const LET_GO = 2;
const W = [3.056, -0.548, 0.161, 0.366, 0.116, 1.723, 0.9, -3.476, -0.163, 0.4];

const times = new Float64Array(CAP);
const xs = new Float64Array(CAP);
const ys = new Float64Array(CAP);
const kin = { x: 0, y: 0, vx: 0, vy: 0, ux: 0, uy: 0, speed: 0, along: 0, peak: 0, dip: 0, moving: false };
const watchers = new Set<Watcher>();
let head = 0;
let size = 0;
let wall = 0;
let fresh = false;
let raf = 0;
let tick = 0;
let under: Element | null = null;
const probeX = new Float64Array(4);
const probeY = new Float64Array(4);
const probeEl: (Element | null)[] = [null, null, null, null];
let probes = 0;

function hit(x: number, y: number) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  for (let i = 0; i < probes; i++) if (probeX[i] === rx && probeY[i] === ry) return probeEl[i];
  const el = document.elementFromPoint(rx, ry);
  if (probes < 4) {
    probeX[probes] = rx;
    probeY[probes] = ry;
    probeEl[probes] = el;
    probes++;
  }
  return el;
}

function fit() {
  const end = (head - 1 + CAP) % CAP;
  const tl = times[end];
  const px = xs[end];
  const py = ys[end];
  let n = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let x0 = 0;
  let x1 = 0;
  let x2 = 0;
  let y0 = 0;
  let y1 = 0;
  let y2 = 0;
  let m = 0;
  let m1 = 0;
  let m2 = 0;
  let mx = 0;
  let my = 0;
  let mxu = 0;
  let myu = 0;
  for (let k = 0; k < size; k++) {
    const i = (end - k + CAP) % CAP;
    const u = (times[i] - tl) / 1000;
    if (u < -WINDOW / 1000) break;
    const u2 = u * u;
    const dx = xs[i] - px;
    const dy = ys[i] - py;
    n++;
    s1 += u;
    s2 += u2;
    s3 += u2 * u;
    s4 += u2 * u2;
    x0 += dx;
    x1 += dx * u;
    x2 += dx * u2;
    y0 += dy;
    y1 += dy * u;
    y2 += dy * u2;
    if (u >= -AIM / 1000) {
      m++;
      m1 += u;
      m2 += u2;
      mx += dx;
      my += dy;
      mxu += dx * u;
      myu += dy * u;
    }
  }
  let vx = 0;
  let vy = 0;
  let ax = 0;
  let ay = 0;
  const det = n * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
  if (n >= 3 && Math.abs(det) > 1e-18) {
    const a = s1 * s4 - s3 * s2;
    const b = s1 * s3 - s2 * s2;
    vx = (n * (x1 * s4 - s3 * x2) - x0 * a + s2 * (s1 * x2 - x1 * s2)) / det;
    vy = (n * (y1 * s4 - s3 * y2) - y0 * a + s2 * (s1 * y2 - y1 * s2)) / det;
    ax = (2 * (n * (s2 * x2 - x1 * s3) - s1 * (s1 * x2 - x1 * s2) + x0 * b)) / det;
    ay = (2 * (n * (s2 * y2 - y1 * s3) - s1 * (s1 * y2 - y1 * s2) + y0 * b)) / det;
  } else if (n >= 2) {
    const j = (end - 1 + CAP) % CAP;
    const dt = (tl - times[j]) / 1000;
    if (dt > 0) {
      vx = (px - xs[j]) / dt;
      vy = (py - ys[j]) / dt;
    }
  }
  const speed = Math.hypot(vx, vy);
  kin.x = px;
  kin.y = py;
  kin.vx = vx;
  kin.vy = vy;
  kin.speed = speed;
  kin.along = speed > 0 ? (ax * vx + ay * vy) / speed : 0;
  kin.ux = speed > 0 ? vx / speed : 0;
  kin.uy = speed > 0 ? vy / speed : 0;
  const den = m * m2 - m1 * m1;
  if (m >= 3 && Math.abs(den) > 1e-12) {
    const lx = (m * mxu - m1 * mx) / den;
    const ly = (m * myu - m1 * my) / den;
    const len = Math.hypot(lx, ly);
    if (len > 1e-9) {
      kin.ux = lx / len;
      kin.uy = ly / len;
    }
  }
  if (!kin.moving) {
    if (speed >= START) {
      kin.moving = true;
      kin.peak = speed;
      kin.dip = speed;
    }
  } else if (speed > kin.peak) {
    kin.peak = speed;
    kin.dip = speed;
  } else {
    kin.dip = Math.min(kin.dip, speed);
    if (kin.dip < 0.5 * kin.peak && speed > kin.dip * 1.4 + 20) {
      kin.peak = speed;
      kin.dip = speed;
    }
  }
}

function frame() {
  raf = 0;
  const now = performance.now();
  const dt = Math.min(Math.max(now - tick, 0), 34);
  tick = now;
  if (now - wall > STILL) {
    size = 0;
    kin.moving = false;
    for (const w of watchers) w.rest();
    return;
  }
  const isFresh = fresh;
  if (isFresh) fit();
  fresh = false;
  probes = 0;
  for (const w of watchers) w.measure(now, isFresh);
  for (const w of watchers) w.apply(now, dt);
  raf = requestAnimationFrame(frame);
}

function region(el: Element, x: number, y: number) {
  const own = el.getBoundingClientRect();
  let r = own;
  let box: Element | null = el;
  for (let i = 0; i < 4; i++) {
    if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1) return r;
    box = box.parentElement;
    if (!box) break;
    r = box.getBoundingClientRect();
  }
  return own;
}

function weigh(box: Element, fx: number, fy: number, reach: number, over: boolean) {
  const r = region(box, fx, fy);
  const s = kin.speed;
  const ux = kin.ux;
  const uy = kin.uy;
  const tx = ux > 0 ? (r.right - fx) / ux : ux < 0 ? (r.left - fx) / ux : Number.POSITIVE_INFINITY;
  const ty = uy > 0 ? (r.bottom - fy) / uy : uy < 0 ? (r.top - fy) / uy : Number.POSITIVE_INFINITY;
  const depth = Math.max(0, Math.min(tx, ty));
  const margin = Math.min(fx - r.left, r.right - fx, fy - r.top, r.bottom - fy);
  const span = Math.max(reach, 1);
  const ls = Math.log(s);
  const slowing = kin.along < 0 ? 1 : 0;
  let z =
    W[0] +
    W[1] * ls +
    W[2] * Math.min(depth / span, 3) +
    W[3] * slowing +
    W[4] * (kin.peak > 0 ? Math.min(1, s / kin.peak) : 1) +
    W[5] * Math.min(margin / span, 1) +
    (W[6] * Math.min(margin, 100)) / 100;
  if (over) z += W[7] + W[8] * slowing + W[9] * ls;
  return z - PRIOR;
}

function onMove(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  const t = e.timeStamp || performance.now();
  const last = (head - 1 + CAP) % CAP;
  if (size && t < times[last]) return;
  times[head] = t;
  xs[head] = e.clientX;
  ys[head] = e.clientY;
  head = (head + 1) % CAP;
  if (size < CAP) size++;
  wall = performance.now();
  under = e.target instanceof Element ? e.target : null;
  fresh = true;
  if (!raf) raf = requestAnimationFrame(frame);
}

function onOut(e: PointerEvent) {
  if (e.pointerType === "touch" || e.relatedTarget) return;
  size = 0;
  under = null;
  for (const w of watchers) w.leave();
}

function onDown(e: PointerEvent) {
  const target = e.target instanceof Element ? e.target : null;
  for (const w of watchers) w.press(target, e.pointerType === "touch");
}

function onCancel(e: PointerEvent) {
  if (e.pointerType !== "touch") return;
  for (const w of watchers) w.cancel();
}

function onFocusIn(e: FocusEvent) {
  const target = e.target instanceof Element ? e.target : null;
  for (const w of watchers) w.focus(target);
}

function onFocusOut(e: FocusEvent) {
  const target = e.target instanceof Element ? e.target : null;
  const next = e.relatedTarget instanceof Element ? e.relatedTarget : null;
  for (const w of watchers) w.blur(target, next);
}

const LISTEN = { passive: true, capture: true } as const;

function subscribe(w: Watcher) {
  watchers.add(w);
  if (watchers.size === 1) {
    document.addEventListener("pointermove", onMove, LISTEN);
    document.addEventListener("pointerout", onOut, LISTEN);
    document.addEventListener("pointerdown", onDown, LISTEN);
    document.addEventListener("pointercancel", onCancel, LISTEN);
    document.addEventListener("focusin", onFocusIn, LISTEN);
    document.addEventListener("focusout", onFocusOut, LISTEN);
  }
  return () => {
    watchers.delete(w);
    if (watchers.size) return;
    document.removeEventListener("pointermove", onMove, LISTEN);
    document.removeEventListener("pointerout", onOut, LISTEN);
    document.removeEventListener("pointerdown", onDown, LISTEN);
    document.removeEventListener("pointercancel", onCancel, LISTEN);
    document.removeEventListener("focusin", onFocusIn, LISTEN);
    document.removeEventListener("focusout", onFocusOut, LISTEN);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    size = 0;
    under = null;
  };
}

function createWatcher(
  opts: RefObject<UsePointerIntentOptions>,
  root: Element | null,
  selector: string,
  trace: TraceChannel | null,
): Watcher {
  let current: Element | null = null;
  let source: IntentSource = "pointer";
  let hold = 0;
  let inside = false;
  let slow = true;
  let settle = false;
  let forecast: Element | null = null;
  let aimed: Element | null = null;
  let ahead: Element | null = null;
  let aim: Element | null = null;
  let gapAt = 0;
  let stayAt = 0;
  let held = false;
  let span = 1;
  let weight = 0;
  let here: Element | null = null;
  let hereFrom: Element | null = null;
  let drawn = false;
  const cand: (Element | null)[] = [null, null, null];
  const score = [0, 0, 0];
  const view = { x: 0, y: 0, fx: 0, fy: 0, locked: false };

  const target = (el: Element | null) => {
    const t = el?.closest(selector) ?? null;
    return t && (!root || root.contains(t)) ? t : null;
  };

  const forget = () => {
    for (let i = 0; i < 3; i++) {
      cand[i] = null;
      score[i] = 0;
    }
  };

  const end = () => {
    const el = current;
    if (!el) return;
    current = null;
    el.removeAttribute("data-intent");
    opts.current.onIntentEnd?.(el);
  };

  const commit = (el: Element, from: IntentSource) => {
    for (let i = 0; i < 3; i++) {
      if (cand[i] !== el) continue;
      cand[i] = null;
      score[i] = 0;
    }
    if (el === current) {
      if (from !== "hover" || source !== "pointer") return;
      source = from;
      el.setAttribute("data-intent", from);
      opts.current.onIntent?.(el, { source: from });
      return;
    }
    end();
    current = el;
    source = from;
    hold = HOLD / 2;
    el.setAttribute("data-intent", from);
    opts.current.onIntent?.(el, { source: from });
  };

  const fromPointer = () => current !== null && (source === "pointer" || source === "hover");

  const point = (el: Element | null) => {
    if (el === aim) return;
    const was = aim;
    aim = el;
    if (was) {
      was.removeAttribute("data-aim");
      opts.current.onAimEnd?.(was);
    }
    if (el) {
      el.setAttribute("data-aim", "");
      opts.current.onAim?.(el);
    }
  };

  const hide = () => {
    forget();
    forecast = null;
    aimed = null;
    ahead = null;
    if (drawn) trace?.current?.(null);
    drawn = false;
  };

  const gather = (dt: number) => {
    for (let i = 0; i < 3; i++) {
      if (cand[i] === null || cand[i] === forecast) continue;
      score[i] -= (forecast ? FADE : 0) * dt;
      if (score[i] > 0) continue;
      cand[i] = null;
      score[i] = 0;
    }
    if (!forecast || forecast === current) return false;
    let j = cand.indexOf(forecast);
    if (j < 0) {
      j = cand.indexOf(null);
      if (j < 0) {
        j = 0;
        for (let i = 1; i < 3; i++) if (score[i] < score[j]) j = i;
      }
      cand[j] = forecast;
      score[j] = 0;
    }
    score[j] = Math.max(0, score[j] + (weight * dt) / 16.67);
    if (score[j] < (NEED * (opts.current.dwell ?? 40)) / 40) return false;
    commit(forecast, "pointer");
    return true;
  };

  return {
    measure(now, isFresh) {
      inside = !root || (under !== null && root.contains(under));
      if (under !== hereFrom) {
        hereFrom = under;
        const next = target(under);
        if (next !== here) stayAt = 0;
        here = next;
      }
      const o = opts.current;
      slow = now - wall > STALE || kin.speed < (o.minSpeed ?? 80);
      settle = false;
      if (slow) {
        forecast = null;
        aimed = null;
        ahead = null;
        weight = 0;
        return;
      }
      const s = kin.speed;
      const horizon = o.horizon ?? 100;
      const maxReach = o.maxReach ?? 480;
      const reach = Math.min((s * horizon) / 1000, maxReach);
      const fx = kin.x + kin.ux * reach;
      const fy = kin.y + kin.uy * reach;
      const near = Math.min((s * (o.lead ?? 50)) / 1000, maxReach);
      let exit = Number.POSITIVE_INFINITY;
      if (here) {
        const r = region(here, kin.x, kin.y);
        const tx =
          kin.ux > 0 ? (r.right - kin.x) / kin.ux : kin.ux < 0 ? (r.left - kin.x) / kin.ux : Number.POSITIVE_INFINITY;
        const ty =
          kin.uy > 0 ? (r.bottom - kin.y) / kin.uy : kin.uy < 0 ? (r.top - kin.y) / kin.uy : Number.POSITIVE_INFINITY;
        exit = Math.min(tx, ty);
      }
      held = here !== null && exit > (s * LEAVE) / 1000;
      if (isFresh) {
        aimed = target(hit(fx, fy));
        forecast = aimed === here || held ? null : aimed;
        weight = forecast ? weigh(forecast, fx, fy, reach, here !== null) : 0;
        const mid = target(hit(kin.x + kin.ux * near * 0.5, kin.y + kin.uy * near * 0.5));
        span = mid && mid !== here ? 0.5 : 1;
        ahead = span < 1 ? mid : target(hit(kin.x + kin.ux * near, kin.y + kin.uy * near));
      }
      const lead = held && ahead !== here ? 0 : near * span;
      const nx = kin.x + kin.ux * lead;
      const ny = kin.y + kin.uy * lead;
      if (here && (here !== current || source === "pointer")) {
        const far = kin.along < 0 ? 4.2 * Math.sqrt(s) : 0.75 * s ** 0.8;
        if (exit < far) stayAt = 0;
        else if (!stayAt) stayAt = now;
        settle = stayAt > 0 && now - stayAt >= LAND * (o.dwell ?? 40);
      }
      const draw = trace?.current;
      if (draw && (inside || ahead) && root instanceof HTMLElement) {
        const box = root.getBoundingClientRect();
        const k = root.offsetWidth ? box.width / root.offsetWidth : 1;
        view.x = (kin.x - box.left) / k - root.clientLeft;
        view.y = (kin.y - box.top) / k - root.clientTop;
        view.fx = (nx - box.left) / k - root.clientLeft;
        view.fy = (ny - box.top) / k - root.clientTop;
      }
    },
    apply(now, dt) {
      let took = false;
      if (here && (slow || settle) && (here !== current || source === "pointer")) {
        commit(here, "hover");
        took = true;
      } else if (!slow) took = gather(dt);
      if (!took && fromPointer()) {
        if (!slow && forecast === current) hold = Math.min(HOLD, hold + Math.max(0, weight) * dt);
        else if (source === "hover" ? here !== current : !slow && (forecast !== null || here !== current))
          hold -= LET_GO * dt;
        if (hold <= 0) end();
      }
      if (slow || (held && ahead !== here)) point(here);
      else if (ahead) {
        gapAt = now;
        point(ahead);
      } else if (now - gapAt >= GAP) point(here);
      const draw = trace?.current;
      if (!draw) return;
      if (slow || !(inside || ahead)) {
        if (drawn) draw(null);
        drawn = false;
        return;
      }
      view.locked = aim !== null && (ahead === aim || held);
      draw(view);
      drawn = true;
    },
    rest() {
      const at = target(under);
      if (at && at !== current) commit(at, "hover");
      else if (fromPointer() && !(under && current?.contains(under))) end();
      point(at);
      hide();
    },
    leave() {
      if (fromPointer()) end();
      point(null);
      inside = false;
      hereFrom = null;
      here = null;
      hide();
    },
    press(el, touch) {
      const t = target(el);
      if (t) commit(t, touch ? "touch" : "hover");
      else if (touch && current && source === "touch") end();
    },
    cancel() {
      if (current && source === "touch") end();
    },
    focus(el) {
      const t = target(el);
      if (t && t !== current) commit(t, "focus");
    },
    blur(el, next) {
      if (!current || source !== "focus" || !el || !current.contains(el)) return;
      if (next && (current.contains(next) || target(next))) return;
      end();
    },
    dispose() {
      end();
      point(null);
      hide();
    },
  };
}

function useWatcher(options: UsePointerIntentOptions, trace: TraceChannel | null) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  const { disabled = false, selector = SELECTOR, root } = options;
  useEffect(() => {
    if (disabled) return;
    const scope = root ? root.current : null;
    if (root && !scope) return;
    const w = createWatcher(opts, scope, selector, trace);
    const off = subscribe(w);
    return () => {
      off();
      w.dispose();
    };
  }, [disabled, selector, root, trace]);
}

export function usePointerIntent(options: UsePointerIntentOptions = {}) {
  useWatcher(options, null);
}

const TraceContext = createContext<TraceChannel | null>(null);

export interface PointerIntentProps
  extends PointerIntentOptions,
    Omit<ComponentProps<"div">, keyof PointerIntentOptions> {}

export function PointerIntent({
  selector,
  onIntent,
  onIntentEnd,
  onAim,
  onAimEnd,
  lead,
  horizon,
  dwell,
  minSpeed,
  maxReach,
  disabled,
  ref,
  className,
  children,
  ...props
}: PointerIntentProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trace = useRef<TraceDraw | null>(null);
  useWatcher(
    {
      selector,
      onIntent,
      onIntentEnd,
      onAim,
      onAimEnd,
      lead,
      horizon,
      dwell,
      minSpeed,
      maxReach,
      disabled,
      root: rootRef,
    },
    trace,
  );
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <TraceContext value={trace}>
      <div ref={setRef} className={cn("relative", className)} {...props}>
        {children}
      </div>
    </TraceContext>
  );
}

export interface IntentTraceProps extends ComponentProps<"svg"> {
  color?: string;
}

const f1 = (n: number) => n.toFixed(1);

export function IntentTrace({ color = "var(--brand)", className, style, ...props }: IntentTraceProps) {
  const channel = useContext(TraceContext);
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const groupRef = useRef<SVGGElement>(null);
  const gradRef = useRef<SVGLinearGradientElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    const grad = gradRef.current;
    const line = lineRef.current;
    const ring = ringRef.current;
    if (!channel || reduce || !group || !grad || !line || !ring) return;
    let shown = false;
    let px = 0;
    let py = 0;
    let r = 9;
    const draw: TraceDraw = (f) => {
      if (!f) {
        if (shown) group.style.opacity = "0";
        shown = false;
        return;
      }
      if (!shown) {
        px = f.fx;
        py = f.fy;
        r = 9;
        group.style.opacity = "1";
        shown = true;
      }
      px += (f.fx - px) * 0.55;
      py += (f.fy - py) * 0.55;
      r += ((f.locked ? 4.5 : 9) - r) * 0.3;
      const dx = px - f.x;
      const dy = py - f.y;
      const len = Math.hypot(dx, dy);
      if (len > r + 2) {
        const ux = dx / len;
        const uy = dy / len;
        const ex = px - ux * (r + 2);
        const ey = py - uy * (r + 2);
        const w0 = 1.4;
        const w1 = 0.35;
        line.setAttribute(
          "d",
          `M${f1(f.x + uy * w0)} ${f1(f.y - ux * w0)}L${f1(ex + uy * w1)} ${f1(ey - ux * w1)}L${f1(ex - uy * w1)} ${f1(ey + ux * w1)}L${f1(f.x - uy * w0)} ${f1(f.y + ux * w0)}Z`,
        );
        grad.setAttribute("x1", f1(f.x));
        grad.setAttribute("y1", f1(f.y));
        grad.setAttribute("x2", f1(ex));
        grad.setAttribute("y2", f1(ey));
      } else line.setAttribute("d", "");
      ring.setAttribute("cx", f1(px));
      ring.setAttribute("cy", f1(py));
      ring.setAttribute("r", f1(r));
      ring.style.opacity = f.locked ? "0.95" : "0.5";
    };
    channel.current = draw;
    return () => {
      if (channel.current === draw) channel.current = null;
      group.style.opacity = "0";
    };
  }, [channel, reduce]);

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      style={{ color, ...style }}
      {...props}
    >
      <defs>
        <linearGradient ref={gradRef} id={id} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g ref={groupRef} className="transition-opacity duration-150 ease-out" style={{ opacity: 0 }}>
        <path ref={lineRef} fill={`url(#${id})`} />
        <circle
          ref={ringRef}
          r="9"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="1.5"
          className="transition-opacity duration-150"
        />
      </g>
    </svg>
  );
}
