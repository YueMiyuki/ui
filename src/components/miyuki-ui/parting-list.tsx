"use client";

import { cancelFrame, frame, type MotionValue, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Key = string | number;

export interface PartingListItem {
  id: Key;
}

export interface PartingListRenderState {
  dragging: boolean;
}

export type PartingListVariant = "cards" | "divided";

export interface PartingListProps<T extends PartingListItem> extends Omit<ComponentProps<"div">, "children"> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, state: PartingListRenderState) => ReactNode;
  itemLabel?: (item: T) => string;
  variant?: PartingListVariant;
}

type Spring = readonly [stiffness: number, damping: number];

const STEP = 1 / 120;
const BACKLOG = 4;
const FOLLOW: Spring = [600, 40];
const PART: Spring = [170, 24];
const LAND: Spring = [260, 26];
const LIFT: Spring = [320, 30];
const LEAN: Spring = [200, 20];
const LEAN_MAX = 2;
const LEAN_SPEED = 900;
const LIFTED = 1.02;
const WAVE = 0.03;
const WAVE_CAP = 0.18;
const HYSTERESIS = 6;
const DIP = 0.12;
const HOLD = 250;
const SLOP = 8;
const EDGE = 72;
const SCROLL = 1100;
const GIVE = 8;
const STRETCH = 16;

interface Axis {
  x: number;
  v: number;
  to: number;
  px: number;
  k: number;
  c: number;
}

const axis = (x: number, [k, c]: Spring): Axis => ({ x, v: 0, to: x, px: x, k, c });

function integrate(a: Axis, h: number) {
  a.px = a.x;
  a.v += (a.k * (a.to - a.x) - a.c * a.v) * h;
  a.x += a.v * h;
}

function snap(a: Axis) {
  a.x = a.to;
  a.px = a.to;
  a.v = 0;
}

function tune(a: Axis, [k, c]: Spring) {
  a.k = k;
  a.c = c;
}

const lerp = (a: Axis, t: number) => a.px + (a.x - a.px) * t;
const still = (a: Axis, eps: number) => Math.abs(a.x - a.to) < eps && Math.abs(a.v) < eps * 20;
const unit = (v: number) => Math.min(1, Math.max(0, v));

function rubber(v: number, lo: number, hi: number) {
  if (v < lo) return lo - STRETCH * (1 - Math.exp((v - lo) / STRETCH));
  if (v > hi) return hi + STRETCH * (1 - Math.exp((hi - v) / STRETCH));
  return v;
}

interface RowValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  lift: MotionValue<number>;
  opacity: MotionValue<number>;
  line: MotionValue<number>;
}

interface Sim {
  el: HTMLLIElement;
  values: RowValues;
  top: number;
  height: number;
  measured: boolean;
  x: Axis;
  y: Axis;
  lean: Axis;
  scale: Axis;
  lift: Axis;
  pending: { value: number; at: number } | null;
  dip: number;
  swapped: boolean;
  fade: number;
  level: number;
}

interface Carry {
  id: Key;
  pointer: boolean;
  pointerId: number;
  from: number;
  gap: number;
  span: number;
  landing: number;
  clientX: number;
  clientY: number;
  startX: number;
  grab: number;
  scroller: HTMLElement | Window | null;
  rest: number;
  order: string;
}

interface Press {
  id: Key;
  pointerId: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  timer: number;
}

interface Latest {
  ids: Key[];
  list: HTMLOListElement | null;
  reduced: boolean;
  divided: boolean;
  label: (id: Key) => string;
  commit: (ids: Key[]) => void;
  setDragging: (id: Key | null) => void;
  say: (text: string) => void;
}

const sig = (ids: Key[]) => ids.map(String).join("\u0000");

function findScroller(el: HTMLElement): HTMLElement | Window | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll" || o === "overlay") && p.scrollHeight > p.clientHeight + 1) return p;
  }
  const root = document.scrollingElement ?? document.documentElement;
  return root.scrollHeight > window.innerHeight + 1 ? window : null;
}

function edges(sc: HTMLElement | Window): [number, number] {
  if (sc === window) return [0, window.innerHeight];
  const r = (sc as HTMLElement).getBoundingClientRect();
  return [Math.max(0, r.top), Math.min(window.innerHeight, r.bottom)];
}

function scrollBy(sc: HTMLElement | Window, d: number) {
  if (sc === window) window.scrollBy(0, d);
  else (sc as HTMLElement).scrollTop += d;
}

function createEngine(latest: RefObject<Latest | null>) {
  const sims = new Map<Key, Sim>();
  let order: Key[] = [];
  let gapPx = 0;
  let carry: Carry | null = null;
  let press: Press | null = null;
  let expected: string | null = null;
  let refocus: Key | null = null;
  let running = false;
  let listening = false;
  let last = -1;
  let acc = 0;
  let clock = 0;
  let dir = 1;
  let ro: ResizeObserver | null = null;
  let saved: [string, string, string] | null = null;

  const live = () => latest.current as Latest;
  const sim = (id: Key) => sims.get(id) as Sim;

  function measure() {
    const { list, ids } = live();
    if (!list) return;
    gapPx = Number.parseFloat(getComputedStyle(list).rowGap) || 0;
    order = ids.filter((id) => sims.has(id));
    for (const id of order) {
      const s = sim(id);
      s.top = s.el.offsetTop;
      s.height = s.el.offsetHeight;
      s.measured = true;
    }
  }

  function schedule(s: Sim, value: number, delay: number) {
    const planned = s.pending ? s.pending.value : s.y.to;
    if (Math.abs(planned - value) < 0.01) return;
    if (Math.abs(s.y.to - value) < 0.01) {
      s.pending = null;
      return;
    }
    s.pending = { value, at: clock + delay };
  }

  function plan(c: Carry) {
    const self = sims.get(c.id);
    if (!self || !order.length) return;
    const reduced = live().reduced;
    let landing = sim(order[0]).top;
    let j = 0;
    order.forEach((id, i) => {
      if (id === c.id) return;
      const s = sim(id);
      const k = j < c.gap ? j : j + 1;
      const value = Math.sign(k - i) * c.span;
      const distance = j < c.gap ? c.gap - 1 - j : j - c.gap;
      schedule(s, value, reduced ? 0 : Math.min(WAVE_CAP, distance * WAVE));
      if (j === c.gap - 1) landing = s.top + value + s.height + gapPx;
      j++;
    });
    c.landing = landing - self.top;
  }

  function locate(c: Carry) {
    const list = live().list;
    const s = sims.get(c.id);
    if (!list || !s || !order.length) return;
    const r = list.getBoundingClientRect();
    const k = list.offsetHeight ? r.height / list.offsetHeight : 1;
    const head = sim(order[0]);
    const tail = sim(order[order.length - 1]);
    const want = (c.clientY - r.top) / k - c.grab;
    s.y.to = rubber(want, head.top, tail.top + tail.height - s.height) - s.top;
    s.x.to = GIVE * Math.tanh((c.clientX - c.startX) / k / 160);
  }

  function seek(c: Carry) {
    const self = sims.get(c.id);
    if (!self) return;
    const centre = self.top + self.y.x + self.height / 2;
    let gap = 0;
    let j = 0;
    for (const id of order) {
      if (id === c.id) continue;
      const s = sim(id);
      const mid = s.top + s.y.x + s.height / 2;
      if (centre > mid + (j < c.gap ? -HYSTERESIS : HYSTERESIS)) gap++;
      j++;
    }
    if (gap !== c.gap) {
      c.gap = gap;
      plan(c);
    }
  }

  function scroll(c: Carry, dt: number) {
    const sc = c.scroller;
    if (!sc) return;
    const [top, bottom] = edges(sc);
    const zone = Math.min(EDGE, (bottom - top) / 4);
    const y = c.clientY;
    let speed = 0;
    if (y < top + zone) speed = -(unit((top + zone - y) / zone) ** 2);
    else if (y > bottom - zone) speed = unit((y - bottom + zone) / zone) ** 2;
    if (!speed) {
      c.rest = 0;
      return;
    }
    c.rest += speed * SCROLL * dt;
    const d = Math.trunc(c.rest);
    if (!d) return;
    c.rest -= d;
    scrollBy(sc, d);
  }

  function reveal(c: Carry, dt: number) {
    const s = sims.get(c.id);
    const sc = c.scroller;
    if (!s || !sc) return;
    const [top, bottom] = edges(sc);
    const node = s.el.firstElementChild as HTMLElement | null;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const pad = 16;
    const over = r.top < top + pad ? r.top - top - pad : r.bottom > bottom - pad ? r.bottom - bottom + pad : 0;
    if (!over) {
      c.rest = 0;
      return;
    }
    c.rest += over * Math.min(1, dt * 10);
    const d = Math.trunc(c.rest);
    if (!d) return;
    c.rest -= d;
    scrollBy(sc, d);
  }

  function step(h: number) {
    const reduced = live().reduced;
    const held = carry?.pointer ? carry.id : null;
    for (const [id, s] of sims) {
      if (s.pending && clock >= s.pending.at) {
        s.y.to = s.pending.value;
        s.pending = null;
      }
      if (reduced) {
        if (id === held) {
          snap(s.y);
        } else {
          if (s.dip < 0 && Math.abs(s.y.x - s.y.to) > 0.01) {
            s.dip = clock;
            s.swapped = false;
          }
          if (s.dip >= 0) {
            const p = (clock - s.dip) / DIP;
            if (p >= 0.5 && !s.swapped) {
              snap(s.y);
              s.swapped = true;
            }
            s.fade = p >= 1 ? 1 : Math.abs(1 - 2 * p);
            if (p >= 1) s.dip = -1;
          }
        }
        s.x.to = 0;
        snap(s.x);
        s.lean.to = 0;
        snap(s.lean);
        s.scale.to = 1;
        snap(s.scale);
      } else {
        if (s.dip >= 0) {
          s.dip = -1;
          s.fade = 1;
        }
        integrate(s.y, h);
        integrate(s.x, h);
        s.lean.to = s.level === 3 ? -dir * LEAN_MAX * Math.tanh(s.y.v / LEAN_SPEED) : 0;
        integrate(s.lean, h);
        integrate(s.scale, h);
      }
      integrate(s.lift, h);
    }
  }

  function paint(t: number) {
    const divided = live().divided;
    const first = order.length ? sim(order[0]).top : 0;
    for (const s of sims.values()) {
      const y = lerp(s.y, t);
      const lift = unit(lerp(s.lift, t));
      s.values.y.set(y);
      s.values.x.set(lerp(s.x, t));
      s.values.rotate.set(lerp(s.lean, t));
      s.values.scale.set(lerp(s.scale, t));
      s.values.lift.set(lift);
      s.values.opacity.set(s.fade);
      if (divided) s.values.line.set(unit((s.top + y - first) / 12) * (1 - lift));
    }
  }

  function settled(s: Sim) {
    return (
      !s.pending &&
      s.dip < 0 &&
      still(s.y, 0.05) &&
      still(s.x, 0.05) &&
      still(s.lean, 0.005) &&
      still(s.scale, 0.0003) &&
      still(s.lift, 0.002)
    );
  }

  function raise(s: Sim, level: number) {
    s.level = level;
    const node = s.el.firstElementChild as HTMLElement | null;
    if (node) node.style.zIndex = String(level);
    s.el.setAttribute("data-lifted", "");
  }

  function lower(s: Sim) {
    s.level = 0;
    const node = s.el.firstElementChild as HTMLElement | null;
    if (node) node.style.zIndex = "";
    s.el.removeAttribute("data-lifted");
    tune(s.y, PART);
    tune(s.x, PART);
  }

  const tick = ({ timestamp }: { timestamp: number }) => {
    const now = timestamp / 1000;
    const dt = last < 0 ? STEP : Math.min(0.1, Math.max(0, now - last));
    last = now;
    acc = Math.min(acc + dt, STEP * BACKLOG);
    const c = carry;
    if (c?.pointer) {
      scroll(c, dt);
      locate(c);
    } else if (c) {
      reveal(c, dt);
    }
    while (acc >= STEP) {
      acc -= STEP;
      clock += STEP;
      step(STEP);
    }
    if (c?.pointer && carry === c) seek(c);
    paint(acc / STEP);
    let calm = carry === null;
    for (const s of sims.values()) {
      const done = settled(s);
      if (done && s.level === 2) lower(s);
      if (!done) calm = false;
    }
    if (calm) finish();
  };

  function finish() {
    for (const s of sims.values()) {
      snap(s.y);
      snap(s.x);
      snap(s.lean);
      snap(s.scale);
      snap(s.lift);
      if (s.level) lower(s);
    }
    if (expected !== null) {
      expected = null;
      let moving = false;
      for (const s of sims.values()) {
        schedule(s, 0, 0);
        if (s.pending) moving = true;
      }
      if (moving) return;
    }
    paint(1);
    running = false;
    cancelFrame(tick);
  }

  function wake() {
    if (running) return;
    running = true;
    last = -1;
    acc = 0;
    frame.update(tick, true);
  }

  const onMove = (e: PointerEvent) => {
    const c = carry;
    if (!c?.pointer || e.pointerId !== c.pointerId) return;
    c.clientX = e.clientX;
    c.clientY = e.clientY;
  };

  const onUp = (e: PointerEvent) => {
    if (!carry?.pointer || e.pointerId !== carry.pointerId) return;
    const stop = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("click", stop, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    drop(true);
  };

  const onCancel = (e: PointerEvent) => {
    if (carry?.pointer && e.pointerId === carry.pointerId) drop(false);
  };

  const onEscape = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !carry?.pointer) return;
    e.preventDefault();
    e.stopPropagation();
    drop(false);
  };

  const onMenu = (e: Event) => {
    if (carry?.pointer) e.preventDefault();
  };

  function listen() {
    if (listening) return;
    listening = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onEscape, true);
    window.addEventListener("contextmenu", onMenu);
    const b = document.body.style;
    saved = [b.userSelect, b.webkitUserSelect, b.cursor];
    b.userSelect = "none";
    b.webkitUserSelect = "none";
    b.cursor = "grabbing";
  }

  function unlisten() {
    if (!listening) return;
    listening = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onEscape, true);
    window.removeEventListener("contextmenu", onMenu);
    if (saved) {
      const b = document.body.style;
      [b.userSelect, b.webkitUserSelect, b.cursor] = saved;
      saved = null;
    }
  }

  const onPressMove = (e: PointerEvent) => {
    const p = press;
    if (!p || e.pointerId !== p.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > SLOP) endPress();
  };

  const endPress = () => {
    if (!press) return;
    window.clearTimeout(press.timer);
    press = null;
    window.removeEventListener("pointermove", onPressMove);
    window.removeEventListener("pointerup", endPress);
    window.removeEventListener("pointercancel", endPress);
  };

  function pickUp(id: Key, pointer: { pointerId: number; clientX: number; clientY: number } | null) {
    const { list, reduced, label, setDragging, say } = live();
    const s = sims.get(id);
    if (!list || !s) return;
    measure();
    const from = order.indexOf(id);
    if (from < 0) return;
    dir = getComputedStyle(list).direction === "rtl" ? -1 : 1;
    const c: Carry = {
      id,
      pointer: pointer !== null,
      pointerId: pointer?.pointerId ?? -1,
      from,
      gap: from,
      span: s.height + gapPx,
      landing: 0,
      clientX: pointer?.clientX ?? 0,
      clientY: pointer?.clientY ?? 0,
      startX: pointer?.clientX ?? 0,
      grab: 0,
      scroller: findScroller(list),
      rest: 0,
      order: sig(order),
    };
    if (pointer) {
      const r = list.getBoundingClientRect();
      const k = list.offsetHeight ? r.height / list.offsetHeight : 1;
      c.grab = (pointer.clientY - r.top) / k - (s.top + s.y.x);
    }
    carry = c;
    s.pending = null;
    tune(s.y, pointer ? FOLLOW : LAND);
    tune(s.x, FOLLOW);
    s.lift.to = 1;
    s.scale.to = reduced ? 1 : LIFTED;
    raise(s, 3);
    plan(c);
    if (!pointer) s.y.to = c.landing;
    if (pointer) {
      window.getSelection()?.removeAllRanges();
      listen();
    }
    setDragging(id);
    say(`Picked up ${label(id)}, position ${from + 1} of ${order.length}.`);
    wake();
  }

  function drop(commit: boolean) {
    const c = carry;
    if (!c) return;
    carry = null;
    unlisten();
    if (!commit) c.gap = c.from;
    const s = sims.get(c.id);
    if (s) {
      plan(c);
      tune(s.y, LAND);
      tune(s.x, LAND);
      s.y.to = c.landing;
      s.x.to = 0;
      s.lift.to = 0;
      s.scale.to = 1;
      raise(s, 2);
    }
    const next = order.filter((id) => id !== c.id);
    next.splice(c.gap, 0, c.id);
    const moved = next.some((id, i) => id !== order[i]);
    const { label, commit: send, setDragging, say } = live();
    const name = label(c.id);
    setDragging(null);
    if (moved) {
      expected = sig(next);
      if (!c.pointer) refocus = c.id;
      send(next);
    }
    if (commit) say(`Dropped ${name}, position ${c.gap + 1} of ${next.length}.`);
    else say(`Cancelled. ${name} is back at position ${c.from + 1} of ${next.length}.`);
    wake();
  }

  function abort() {
    if (!carry) return;
    carry = null;
    unlisten();
    live().setDragging(null);
  }

  function settle(s: Sim) {
    const planned = s.pending ? s.pending.value : s.y.to;
    if (Math.abs(planned) > 0.5) schedule(s, 0, 0);
    else if (s.pending) s.pending.value = 0;
    else s.y.to = 0;
  }

  function sync() {
    const before = new Map<Key, number>();
    for (const [id, s] of sims) if (s.measured) before.set(id, s.top);
    measure();
    const now = sig(order);
    if (expected === now) expected = null;
    if (carry && (carry.order !== now || !sims.has(carry.id))) abort();
    for (const id of order) {
      const s = sim(id);
      const old = before.get(id);
      const shift = old === undefined ? 0 : old - s.top;
      if (!shift) continue;
      s.y.x += shift;
      s.y.px += shift;
      s.y.to += shift;
      if (s.pending) s.pending.value += shift;
      const node = s.el.firstElementChild as HTMLElement | null;
      if (node) node.style.transform = `translateX(${s.x.x}px) translateY(${s.y.x}px)`;
      s.values.y.set(s.y.x);
    }
    if (carry) {
      carry.span = sim(carry.id).height + gapPx;
      plan(carry);
      if (!carry.pointer) sim(carry.id).y.to = carry.landing;
    } else {
      for (const id of order) settle(sim(id));
    }
    if (refocus !== null) {
      const grip = sims.get(refocus)?.el.querySelector<HTMLElement>("[data-grip]");
      refocus = null;
      if (grip && document.activeElement !== grip) grip.focus({ preventScroll: true });
    }
    wake();
  }

  function resized() {
    measure();
    if (!carry) return;
    carry.span = sim(carry.id).height + gapPx;
    plan(carry);
    if (!carry.pointer) sim(carry.id).y.to = carry.landing;
    wake();
  }

  return {
    attach(id: Key, el: HTMLLIElement, values: RowValues) {
      const s = sims.get(id);
      if (s) {
        s.el = el;
        s.values = values;
      } else {
        sims.set(id, {
          el,
          values,
          top: 0,
          height: 0,
          measured: false,
          x: axis(0, PART),
          y: axis(0, PART),
          lean: axis(0, LEAN),
          scale: axis(1, LIFT),
          lift: axis(0, LIFT),
          pending: null,
          dip: -1,
          swapped: false,
          fade: 1,
          level: 0,
        });
      }
      ro?.observe(el);
    },
    detach(id: Key, el: HTMLLIElement) {
      ro?.unobserve(el);
      const s = sims.get(id);
      if (!s || s.el !== el) return;
      sims.delete(id);
      if (carry?.id === id) abort();
      if (press?.id === id) endPress();
    },
    sync,
    start() {
      if (ro) return;
      ro = new ResizeObserver(resized);
      const list = live().list;
      if (list) ro.observe(list);
      for (const s of sims.values()) ro.observe(s.el);
    },
    stop() {
      ro?.disconnect();
      ro = null;
      endPress();
      abort();
      if (running) {
        running = false;
        cancelFrame(tick);
      }
    },
    touchMove(e: TouchEvent) {
      if (carry?.pointer && e.cancelable) e.preventDefault();
    },
    gripDown(e: ReactPointerEvent<HTMLElement>, id: Key) {
      if (!e.isPrimary || e.button !== 0 || carry?.pointer || expected !== null) return;
      endPress();
      if (carry) {
        drop(true);
        return;
      }
      pickUp(id, { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY });
    },
    rowDown(e: ReactPointerEvent<HTMLElement>, id: Key) {
      if (e.pointerType === "mouse" || !e.isPrimary || carry || press || expected !== null) return;
      if ((e.target as Element).closest("[data-grip]")) return;
      const p: Press = {
        id,
        pointerId: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        x: e.clientX,
        y: e.clientY,
        timer: 0,
      };
      p.timer = window.setTimeout(() => {
        if (press !== p) return;
        endPress();
        pickUp(p.id, { pointerId: p.pointerId, clientX: p.x, clientY: p.y });
      }, HOLD);
      press = p;
      window.addEventListener("pointermove", onPressMove);
      window.addEventListener("pointerup", endPress);
      window.addEventListener("pointercancel", endPress);
    },
    gripKey(e: ReactKeyboardEvent<HTMLElement>, id: Key) {
      const c = carry;
      if (c?.pointer) return;
      const key = e.key;
      const toggle = key === " " || key === "Enter";
      if (!c) {
        if (!toggle) return;
        e.preventDefault();
        if (!e.repeat && expected === null) pickUp(id, null);
        return;
      }
      if (c.id !== id) return;
      if (toggle) {
        e.preventDefault();
        if (!e.repeat) drop(true);
        return;
      }
      if (key === "Escape") {
        e.preventDefault();
        drop(false);
        return;
      }
      if (key === "Tab") {
        drop(true);
        return;
      }
      const n = order.length;
      let gap = c.gap;
      if (key === "ArrowUp") gap--;
      else if (key === "ArrowDown") gap++;
      else if (key === "Home") gap = 0;
      else if (key === "End") gap = n - 1;
      else return;
      e.preventDefault();
      gap = Math.max(0, Math.min(n - 1, gap));
      if (gap !== c.gap) {
        c.gap = gap;
        plan(c);
        sim(id).y.to = c.landing;
        wake();
      }
      live().say(`${live().label(id)}, position ${gap + 1} of ${n}`);
    },
    gripBlur(id: Key) {
      if (carry && !carry.pointer && carry.id === id) drop(true);
    },
  };
}

type Engine = ReturnType<typeof createEngine>;

function fallbackLabel(item: PartingListItem) {
  const record = item as unknown as Record<string, unknown>;
  for (const key of ["label", "name", "title"]) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return String(item.id);
}

export function PartingList<T extends PartingListItem>({
  items,
  onReorder,
  renderItem,
  itemLabel,
  variant = "cards",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: PartingListProps<T>) {
  const reduced = useReducedMotion() ?? false;
  const hint = useId();
  const list = useRef<HTMLOListElement>(null);
  const latest = useRef<Latest | null>(null);
  const flip = useRef(false);
  const [engine] = useState(() => createEngine(latest));
  const [dragging, setDragging] = useState<Key | null>(null);
  const [message, setMessage] = useState("");
  const name = itemLabel ?? fallbackLabel;
  const divided = variant === "divided";
  const key = sig(items.map((item) => item.id));

  useLayoutEffect(() => {
    latest.current = {
      ids: items.map((item) => item.id),
      list: list.current,
      reduced,
      divided,
      label: (id) => {
        const item = items.find((i) => i.id === id);
        return item ? name(item) : String(id);
      },
      commit: (ids) => {
        const byId = new Map(items.map((item) => [item.id, item]));
        onReorder(ids.map((id) => byId.get(id) as T));
      },
      setDragging,
      say: (text) => {
        flip.current = !flip.current;
        setMessage(flip.current ? text : `${text} `);
      },
    };
  });

  useLayoutEffect(() => {
    engine.sync();
  }, [engine, key, divided]);

  useEffect(() => {
    const el = list.current;
    engine.start();
    el?.addEventListener("touchmove", engine.touchMove, { passive: false });
    return () => {
      el?.removeEventListener("touchmove", engine.touchMove);
      engine.stop();
    };
  }, [engine]);

  return (
    <div {...props} className={cn("relative", className)}>
      <ol
        ref={list}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "relative flex flex-col",
          divided ? "rounded-xl border border-border bg-card shadow-xs" : "gap-2",
        )}
      >
        {items.map((item, index) => (
          <Row
            key={item.id}
            id={item.id}
            index={index}
            engine={engine}
            divided={divided}
            label={name(item)}
            hint={hint}
            dragging={dragging === item.id}
          >
            {renderItem(item, { dragging: dragging === item.id })}
          </Row>
        ))}
      </ol>
      <p id={hint} hidden>
        Press Space or Enter to pick up the row. Use the arrow keys to move it, Space or Enter to drop it, and Escape to
        put it back.
      </p>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </p>
    </div>
  );
}

interface RowProps {
  id: Key;
  index: number;
  engine: Engine;
  divided: boolean;
  label: string;
  hint: string;
  dragging: boolean;
  children: ReactNode;
}

function Row({ id, index, engine, divided, label, hint, dragging, children }: RowProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scale = useMotionValue(1);
  const lift = useMotionValue(0);
  const opacity = useMotionValue(1);
  const line = useMotionValue(index === 0 ? 0 : 1);
  const values = useMemo(
    () => ({ x, y, rotate, scale, lift, opacity, line }),
    [x, y, rotate, scale, lift, opacity, line],
  );
  const ref = useCallback(
    (el: HTMLLIElement | null) => {
      if (!el) return;
      engine.attach(id, el, values);
      return () => engine.detach(id, el);
    },
    [engine, id, values],
  );

  return (
    <li
      ref={ref}
      className="group/row relative [-webkit-touch-callout:none]"
      onPointerDown={(e) => engine.rowDown(e, id)}
    >
      <motion.div style={{ x, y, opacity }} className="relative">
        {divided && (
          <motion.span
            aria-hidden="true"
            style={{ opacity: line }}
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border"
          />
        )}
        <motion.div style={{ rotate }} className="origin-[19px_23px] rtl:origin-[calc(100%-19px)_23px]">
          <motion.div
            style={{ scale }}
            className={cn(
              "relative flex items-start gap-2 border py-3 ps-1.5 pe-4",
              divided
                ? "border-transparent transition-[border-color,border-radius] duration-200 ease-settle group-data-[lifted]/row:rounded-lg group-data-[lifted]/row:border-border group-data-[lifted]/row:bg-card"
                : "rounded-xl border-border bg-card shadow-xs",
            )}
          >
            <motion.span
              aria-hidden="true"
              style={{ opacity: lift }}
              className="pointer-events-none absolute -inset-px rounded-[inherit] shadow-lg"
            />
            <button
              type="button"
              data-grip=""
              aria-label={`Move ${label}`}
              aria-describedby={hint}
              aria-pressed={dragging || undefined}
              onPointerDown={(e) => engine.gripDown(e, id)}
              onKeyDown={(e) => engine.gripKey(e, id)}
              onBlur={() => engine.gripBlur(id)}
              className={cn(
                "relative -mt-1.5 grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md outline-none group-data-[lifted]/row:cursor-grabbing",
                "text-muted-foreground/65 transition-colors duration-150 ease-settle group-hover/row:text-muted-foreground",
                "hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
                "aria-pressed:text-brand aria-pressed:hover:text-brand",
                "after:absolute after:-inset-x-1.5 after:-inset-y-2",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 8 14" className="h-3.5 w-2" fill="currentColor">
                <circle cx="1.5" cy="1.5" r="1.25" />
                <circle cx="6.5" cy="1.5" r="1.25" />
                <circle cx="1.5" cy="7" r="1.25" />
                <circle cx="6.5" cy="7" r="1.25" />
                <circle cx="1.5" cy="12.5" r="1.25" />
                <circle cx="6.5" cy="12.5" r="1.25" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">{children}</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </li>
  );
}
