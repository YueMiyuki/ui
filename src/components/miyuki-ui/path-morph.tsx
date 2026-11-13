"use client";

import { useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, type SVGProps, useCallback, useEffect, useRef, useState } from "react";
import { Button, type ButtonProps, composeRenderProps } from "react-aria-components";
import { cn } from "@/lib/utils";

interface Command {
  c: string;
  a: number[];
}

const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

function tokenize(d: string): Command[] {
  const out: Command[] = [];
  const n = d.length;
  let i = 0;
  let cmd = "";
  const skip = () => {
    while (i < n) {
      const ch = d.charCodeAt(i);
      if (ch === 32 || ch === 44 || (ch >= 9 && ch <= 13)) i++;
      else break;
    }
  };
  for (;;) {
    skip();
    if (i >= n) break;
    const ch = d[i];
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
      const up = ch.toUpperCase();
      if (!(up in ARITY)) break;
      cmd = ch;
      i++;
      if (up === "Z") out.push({ c: "z", a: [] });
      continue;
    }
    if (!cmd || cmd === "Z" || cmd === "z") break;
    const up = cmd.toUpperCase();
    const a: number[] = [];
    for (let k = 0; k < ARITY[up]; k++) {
      skip();
      if (up === "A" && (k === 3 || k === 4)) {
        const flag = d[i];
        if (flag !== "0" && flag !== "1") return out;
        a.push(flag === "1" ? 1 : 0);
        i++;
        continue;
      }
      NUMBER.lastIndex = i;
      const m = NUMBER.exec(d);
      if (!m) return out;
      a.push(parseFloat(m[0]));
      i = NUMBER.lastIndex;
    }
    out.push({ c: cmd, a });
    if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
  }
  return out;
}

function absolute(cmds: Command[]): Command[] {
  const out: Command[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  for (const { c, a } of cmds) {
    const up = c.toUpperCase();
    const ox = c !== up ? x : 0;
    const oy = c !== up ? y : 0;
    switch (up) {
      case "M":
        x = sx = a[0] + ox;
        y = sy = a[1] + oy;
        out.push({ c: "M", a: [x, y] });
        break;
      case "L":
      case "T":
        x = a[0] + ox;
        y = a[1] + oy;
        out.push({ c: up, a: [x, y] });
        break;
      case "H":
        x = a[0] + ox;
        out.push({ c: "H", a: [x] });
        break;
      case "V":
        y = a[0] + oy;
        out.push({ c: "V", a: [y] });
        break;
      case "C":
        out.push({ c: "C", a: [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy] });
        x = a[4] + ox;
        y = a[5] + oy;
        break;
      case "S":
      case "Q":
        out.push({ c: up, a: [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy] });
        x = a[2] + ox;
        y = a[3] + oy;
        break;
      case "A":
        out.push({ c: "A", a: [a[0], a[1], a[2], a[3], a[4], a[5] + ox, a[6] + oy] });
        x = a[5] + ox;
        y = a[6] + oy;
        break;
      case "Z":
        x = sx;
        y = sy;
        out.push({ c: "Z", a: [] });
        break;
    }
  }
  return out;
}

const round = (v: number) => String(Math.round(v * 100) / 100);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sameCommands(a: Command[], b: Command[]) {
  if (a.length === 0 || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].c !== b[i].c) return false;
    if (a[i].c === "A" && (a[i].a[3] !== b[i].a[3] || a[i].a[4] !== b[i].a[4])) return false;
  }
  return true;
}

function lerpCommands(a: Command[], b: Command[]) {
  return (t: number) => {
    let s = "";
    for (let i = 0; i < a.length; i++) {
      const from = a[i];
      const to = b[i].a;
      s += from.c;
      for (let k = 0; k < from.a.length; k++) {
        let v = from.c === "A" && (k === 3 || k === 4) ? from.a[k] : lerp(from.a[k], to[k], t);
        if (from.c === "A" && k < 2) v = Math.abs(v);
        s += (k ? " " : "") + round(v);
      }
    }
    return s;
  };
}

interface Sub {
  p: number[];
  closed: boolean;
}

function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angle: number,
  large: number,
  sweep: number,
  x2: number,
  y2: number,
): number[] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0)
    return [lerp(x1, x2, 1 / 3), lerp(y1, y2, 1 / 3), lerp(x1, x2, 2 / 3), lerp(y1, y2, 2 / 3), x2, y2];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const theta = ang(1, 0, ux, uy);
  let delta = ang(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const pieces = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / pieces;
  const k = (4 / 3) * Math.tan(step / 4);
  const map = (px: number, py: number): [number, number] => [
    cx + rx * px * cos - ry * py * sin,
    cy + rx * px * sin + ry * py * cos,
  ];
  const out: number[] = [];
  for (let i = 0; i < pieces; i++) {
    const a1 = theta + i * step;
    const a2 = a1 + step;
    const c1 = map(Math.cos(a1) - k * Math.sin(a1), Math.sin(a1) + k * Math.cos(a1));
    const c2 = map(Math.cos(a2) + k * Math.sin(a2), Math.sin(a2) - k * Math.cos(a2));
    const end = i === pieces - 1 ? ([x2, y2] as [number, number]) : map(Math.cos(a2), Math.sin(a2));
    out.push(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  }
  return out;
}

function toSubs(cmds: Command[]): Sub[] {
  const subs: Sub[] = [];
  let cur: Sub | null = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let qx = 0;
  let qy = 0;
  let c2x = 0;
  let c2y = 0;
  let prev = "";
  const open = (): Sub => {
    if (!cur) {
      cur = { p: [x, y], closed: false };
      subs.push(cur);
    }
    return cur;
  };
  const cubic = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    open().p.push(a, b, c, d, e, f);
    x = e;
    y = f;
  };
  const line = (ex: number, ey: number) =>
    cubic(lerp(x, ex, 1 / 3), lerp(y, ey, 1 / 3), lerp(x, ex, 2 / 3), lerp(y, ey, 2 / 3), ex, ey);
  const quad = (cx: number, cy: number, ex: number, ey: number) =>
    cubic(x + ((cx - x) * 2) / 3, y + ((cy - y) * 2) / 3, ex + ((cx - ex) * 2) / 3, ey + ((cy - ey) * 2) / 3, ex, ey);

  for (const { c, a } of cmds) {
    switch (c) {
      case "M":
        cur = { p: [a[0], a[1]], closed: false };
        subs.push(cur);
        x = sx = a[0];
        y = sy = a[1];
        break;
      case "L":
        line(a[0], a[1]);
        break;
      case "H":
        line(a[0], y);
        break;
      case "V":
        line(x, a[0]);
        break;
      case "C":
        cubic(a[0], a[1], a[2], a[3], a[4], a[5]);
        c2x = a[2];
        c2y = a[3];
        break;
      case "S": {
        const smooth = prev === "C" || prev === "S";
        cubic(smooth ? 2 * x - c2x : x, smooth ? 2 * y - c2y : y, a[0], a[1], a[2], a[3]);
        c2x = a[0];
        c2y = a[1];
        break;
      }
      case "Q":
        qx = a[0];
        qy = a[1];
        quad(qx, qy, a[2], a[3]);
        break;
      case "T": {
        const smooth = prev === "Q" || prev === "T";
        qx = smooth ? 2 * x - qx : x;
        qy = smooth ? 2 * y - qy : y;
        quad(qx, qy, a[0], a[1]);
        break;
      }
      case "A": {
        const seg = arcToCubics(x, y, a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
        for (let i = 0; i < seg.length; i += 6)
          cubic(seg[i], seg[i + 1], seg[i + 2], seg[i + 3], seg[i + 4], seg[i + 5]);
        break;
      }
      case "Z": {
        const sub: Sub | null = cur;
        if (sub) {
          if (x !== sx || y !== sy) line(sx, sy);
          sub.closed = true;
        }
        x = sx;
        y = sy;
        cur = null;
        break;
      }
    }
    prev = c;
  }
  return subs;
}

function sameSegments(a: Sub[], b: Sub[]) {
  return (
    a.length > 0 && a.length === b.length && a.every((s, i) => s.p.length === b[i].p.length && s.closed === b[i].closed)
  );
}

function lerpSubs(a: Sub[], b: Sub[]) {
  return (t: number) => {
    let s = "";
    for (let i = 0; i < a.length; i++) {
      const p = a[i].p;
      const q = b[i].p;
      s += `M${round(lerp(p[0], q[0], t))} ${round(lerp(p[1], q[1], t))}`;
      for (let k = 2; k < p.length; k += 6) {
        s += "C";
        for (let j = 0; j < 6; j++) s += (j ? " " : "") + round(lerp(p[k + j], q[k + j], t));
      }
      if (a[i].closed) s += "Z";
    }
    return s;
  };
}

interface Poly {
  pts: number[];
  cum: number[];
  corners: number[];
  length: number;
  closed: boolean;
}

const STEPS = 20;
const CORNER = Math.cos((14 * Math.PI) / 180);

function cubicPoint(p: number[], k: number, x0: number, y0: number, t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * x0 + b * p[k] + c * p[k + 2] + d * p[k + 4], a * y0 + b * p[k + 1] + c * p[k + 3] + d * p[k + 5]];
}

function tangents(p: number[], k: number, x0: number, y0: number) {
  const pts = [x0, y0, p[k], p[k + 1], p[k + 2], p[k + 3], p[k + 4], p[k + 5]];
  const dir = (ax: number, ay: number, bx: number, by: number) => {
    const l = Math.hypot(bx - ax, by - ay);
    return l > 1e-6 ? [(bx - ax) / l, (by - ay) / l] : null;
  };
  let start: number[] | null = null;
  for (let i = 1; i < 4 && !start; i++) start = dir(pts[0], pts[1], pts[i * 2], pts[i * 2 + 1]);
  let end: number[] | null = null;
  for (let i = 2; i >= 0 && !end; i--) end = dir(pts[i * 2], pts[i * 2 + 1], pts[6], pts[7]);
  return { start, end };
}

function flatten(sub: Sub): Poly {
  const p = sub.p;
  const pts = [p[0], p[1]];
  const cum = [0];
  const corners: number[] = [];
  let length = 0;
  let lastEnd: number[] | null = null;
  let firstStart: number[] | null = null;
  let x0 = p[0];
  let y0 = p[1];
  for (let k = 2; k < p.length; k += 6) {
    const { start, end } = tangents(p, k, x0, y0);
    if (start && !firstStart) firstStart = start;
    if (k > 2 && lastEnd && start && lastEnd[0] * start[0] + lastEnd[1] * start[1] < CORNER) corners.push(length);
    if (end) lastEnd = end;
    for (let s = 1; s <= STEPS; s++) {
      const [x, y] = cubicPoint(p, k, x0, y0, s / STEPS);
      length += Math.hypot(x - pts[pts.length - 2], y - pts[pts.length - 1]);
      pts.push(x, y);
      cum.push(length);
    }
    x0 = p[k + 4];
    y0 = p[k + 5];
  }
  if (sub.closed && lastEnd && firstStart && lastEnd[0] * firstStart[0] + lastEnd[1] * firstStart[1] < CORNER) {
    corners.push(0);
  }
  return { pts, cum, corners, length, closed: sub.closed };
}

function pointAt(poly: Poly, s: number): [number, number] {
  const { pts, cum } = poly;
  if (cum.length < 2 || s <= 0) return [pts[0], pts[1]];
  if (s >= poly.length) return [pts[pts.length - 2], pts[pts.length - 1]];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const t = span > 0 ? (s - cum[lo]) / span : 0;
  return [lerp(pts[lo * 2], pts[hi * 2], t), lerp(pts[lo * 2 + 1], pts[hi * 2 + 1], t)];
}

function sample(poly: Poly, n: number, loop: boolean, sharp: boolean[] = []): number[] {
  const out: number[] = [];
  const step = loop ? poly.length / n : poly.length / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) out.push(...pointAt(poly, i * step));
  if (step > 0) {
    const taken = new Set<number>();
    if (!loop) taken.add(0).add(n - 1);
    for (const c of poly.corners) {
      let j = Math.round(c / step);
      if (loop) j %= n;
      if (j < 0 || j >= n || taken.has(j)) continue;
      taken.add(j);
      sharp[j] = true;
      const [x, y] = pointAt(poly, c);
      out[j * 2] = x;
      out[j * 2 + 1] = y;
    }
  }
  return out;
}

function curveThrough(p: number[], sharp: boolean[], closed: boolean) {
  const n = p.length / 2;
  let s = `M${round(p[0])} ${round(p[1])}`;
  const wrap = (i: number) => (closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)));
  const handle = (i: number, out: boolean): [number, number] => {
    const a = wrap(i - 1);
    const b = wrap(i + 1);
    if (sharp[i] || a === i || b === i) {
      const o = out ? b : a;
      const sign = out ? 1 : -1;
      return [((p[o * 2] - p[i * 2]) * sign) / 3, ((p[o * 2 + 1] - p[i * 2 + 1]) * sign) / 3];
    }
    return [(p[b * 2] - p[a * 2]) / 6, (p[b * 2 + 1] - p[a * 2 + 1]) / 6];
  };
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const j = (i + 1) % n;
    const [ox, oy] = handle(i, true);
    const [ix, iy] = handle(j, false);
    s += `C${round(p[i * 2] + ox)} ${round(p[i * 2 + 1] + oy)} ${round(p[j * 2] - ix)} ${round(p[j * 2 + 1] - iy)} ${round(p[j * 2])} ${round(p[j * 2 + 1])}`;
  }
  return closed ? `${s}Z` : s;
}

function signedArea(p: number[]) {
  let a = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  return a / 2;
}

function bestShift(a: number[], b: number[]) {
  const n = a.length / 2;
  let best = 0;
  let bestCost = Infinity;
  for (let k = 0; k < n; k++) {
    let cost = 0;
    for (let i = 0; i < n && cost < bestCost; i++) {
      const j = ((i + k) % n) * 2;
      const dx = a[i * 2] - b[j];
      const dy = a[i * 2 + 1] - b[j + 1];
      cost += dx * dx + dy * dy;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  return best;
}

function shift(p: number[], k: number) {
  return [...p.slice(k * 2), ...p.slice(0, k * 2)];
}

function reverseLoop(p: number[]) {
  const out = [p[0], p[1]];
  for (let i = p.length / 2 - 1; i > 0; i--) out.push(p[i * 2], p[i * 2 + 1]);
  return out;
}

function centroid(p: number[]): [number, number] {
  let x = 0;
  let y = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    x += p[i * 2];
    y += p[i * 2 + 1];
  }
  return [x / n, y / n];
}

function resample(fromSubs: Sub[], toSubs: Sub[]) {
  const a = fromSubs.map(flatten);
  const b = toSubs.map(flatten);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of [...a, ...b]) {
    for (let i = 0; i < poly.pts.length; i += 2) {
      minX = Math.min(minX, poly.pts[i]);
      maxX = Math.max(maxX, poly.pts[i]);
      minY = Math.min(minY, poly.pts[i + 1]);
      maxY = Math.max(maxY, poly.pts[i + 1]);
    }
  }
  const spacing = Math.max(Math.hypot(maxX - minX, maxY - minY), 1e-3) / 72;
  const pairs: { from: number[]; to: number[]; sharp: boolean[]; closed: boolean }[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const pa = a[i];
    const pb = b[i];
    const longest = Math.max(pa?.length ?? 0, pb?.length ?? 0);
    const n = Math.min(320, Math.max(16, Math.ceil(longest / spacing)));
    if (pa && pb) {
      const closed = pa.closed && pb.closed;
      const sharpFrom: boolean[] = [];
      const sharpTo: boolean[] = [];
      const from = sample(pa, n, closed, sharpFrom);
      let to = sample(pb, n, closed, sharpTo);
      let order = Array.from({ length: n }, (_, k) => k);
      if (closed) {
        if (signedArea(from) * signedArea(to) < 0) {
          to = reverseLoop(to);
          order = [0, ...order.slice(1).reverse()];
        }
        const k = bestShift(from, to);
        to = shift(to, k);
        order = [...order.slice(k), ...order.slice(0, k)];
      }
      const sharp = order.map((j, k) => Boolean(sharpFrom[k] || sharpTo[j]));
      pairs.push({ from, to, sharp, closed });
    } else {
      const only = (pa ?? pb) as Poly;
      const sharp: boolean[] = [];
      const pts = sample(only, n, only.closed, sharp);
      const [cx, cy] = centroid(pts);
      const dot = Array.from({ length: n * 2 }, (_, k) => (k % 2 ? cy : cx));
      pairs.push(
        pa ? { from: pts, to: dot, sharp, closed: only.closed } : { from: dot, to: pts, sharp, closed: only.closed },
      );
    }
  }
  return (t: number) => {
    let s = "";
    for (const { from, to, sharp, closed } of pairs) {
      s += curveThrough(
        from.map((v, k) => lerp(v, to[k], t)),
        sharp,
        closed,
      );
    }
    return s;
  };
}

export function interpolatePath(from: string, to: string): (t: number) => string {
  if (from === to) return () => to;
  const a = absolute(tokenize(from));
  const b = absolute(tokenize(to));
  let between: (t: number) => string;
  if (sameCommands(a, b)) {
    between = lerpCommands(a, b);
  } else {
    const sa = toSubs(a);
    const sb = toSubs(b);
    if (sa.length === 0 && sb.length === 0) return (t) => (t < 0.5 ? from : to);
    between = sameSegments(sa, sb) ? lerpSubs(sa, sb) : resample(sa, sb);
  }
  return (t) => (t === 0 ? from : t === 1 ? to : between(t));
}

export interface MorphTransition {
  type?: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
}

const SETTLE = { stiffness: 420, damping: 34, mass: 1 };

function springCurve(transition: MorphTransition | undefined) {
  const k = transition?.stiffness ?? SETTLE.stiffness;
  const c = transition?.damping ?? SETTLE.damping;
  const m = transition?.mass ?? SETTLE.mass;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  let at: (t: number) => number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    at = (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    at = (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const r = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - r);
    const r2 = -w0 * (zeta + r);
    const A = r2 / (r1 - r2);
    at = (t) => 1 + A * Math.exp(r1 * t) + (-1 - A) * Math.exp(r2 * t);
  }
  let duration = 0;
  for (let t = 1 / 120; t < 4; t += 1 / 120) {
    if (Math.abs(1 - at(t)) < 0.0015 && Math.abs(at(t) - at(t - 1 / 120)) < 0.0004) {
      duration = t;
      break;
    }
  }
  return { at, duration: duration || 4 };
}

function runSpring(transition: MorphTransition | undefined, frame: (p: number) => void, done: () => void) {
  const { at, duration } = springCurve(transition);
  let start = -1;
  let raf = requestAnimationFrame(function tick() {
    const now = performance.now();
    if (start < 0) start = now;
    const t = Math.max(0, (now - start) / 1000);
    if (t >= duration) {
      done();
      return;
    }
    frame(at(t));
    raf = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(raf);
}

const isEmpty = (d: string) => d.trim() === "";

export interface MorphPathProps extends Omit<SVGProps<SVGPathElement>, "d" | "ref"> {
  d: string;
  transition?: MorphTransition;
  ref?: Ref<SVGPathElement>;
}

export function MorphPath({ d, transition, ref, ...props }: MorphPathProps) {
  const node = useRef<SVGPathElement | null>(null);
  const [first] = useState(d);
  const shown = useRef(d);
  const reduce = useReducedMotion();
  const stiffness = transition?.stiffness;
  const damping = transition?.damping;
  const mass = transition?.mass;

  const setRef = useCallback(
    (el: SVGPathElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useEffect(() => {
    const el = node.current;
    if (!el || shown.current === d) return;
    const from = shown.current;
    const growing = isEmpty(from);
    const leaving = isEmpty(d);
    const opacity = el.style.opacity;
    const finish = () => {
      el.setAttribute("d", d);
      if (growing || leaving) el.style.opacity = opacity;
      shown.current = d;
    };
    if (reduce) {
      finish();
      return;
    }
    const between = interpolatePath(from, d);
    const stop = runSpring(
      { stiffness, damping, mass },
      (p) => {
        const next = between(p);
        el.setAttribute("d", next);
        shown.current = next;
        if (growing) el.style.opacity = String(Math.min(1, p * 3));
        else if (leaving) el.style.opacity = String(Math.max(0, Math.min(1, (1 - p) * 3)));
      },
      finish,
    );
    return () => {
      stop();
      if (growing || leaving) el.style.opacity = opacity;
    };
  }, [d, reduce, stiffness, damping, mass]);

  return <path ref={setRef} d={first} {...props} />;
}

export type MorphShapePath = string | { d: string; fill?: boolean };
export type MorphShape = MorphShapePath | MorphShapePath[] | { paths: MorphShapePath[]; rotate?: number };
export type MorphShapes = Record<string, MorphShape>;

function pathsOf(shape: MorphShape | undefined): MorphShapePath[] {
  if (shape == null) return [];
  if (typeof shape === "string") return [shape];
  if (Array.isArray(shape)) return shape;
  if ("paths" in shape) return shape.paths;
  return [shape];
}

function rotationOf(shape: MorphShape | undefined) {
  return shape != null && typeof shape === "object" && !Array.isArray(shape) && "paths" in shape
    ? (shape.rotate ?? 0)
    : 0;
}

function Turn({ angle, transition, children }: { angle: number; transition?: MorphTransition; children: ReactNode }) {
  const node = useRef<SVGGElement>(null);
  const [first] = useState(angle);
  const shown = useRef(angle);
  const reduce = useReducedMotion();
  const stiffness = transition?.stiffness;
  const damping = transition?.damping;
  const mass = transition?.mass;

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const from = shown.current;
    let delta = ((((angle - from) % 360) + 540) % 360) - 180;
    if (delta === -180) delta = 180;
    if (Math.abs(delta) < 0.01) return;
    const to = from + delta;
    const set = (a: number) => {
      el.setAttribute("transform", `rotate(${round(a)} 12 12)`);
      shown.current = a;
    };
    if (reduce) {
      set(to);
      return;
    }
    return runSpring(
      { stiffness, damping, mass },
      (p) => set(lerp(from, to, p)),
      () => set(to),
    );
  }, [angle, reduce, stiffness, damping, mass]);

  return (
    <g ref={node} transform={first ? `rotate(${first} 12 12)` : undefined}>
      {children}
    </g>
  );
}

export interface MorphIconProps extends Omit<SVGProps<SVGSVGElement>, "ref" | "fill"> {
  shapes: MorphShapes;
  shape: string;
  size?: number | string;
  strokeWidth?: number;
  filled?: boolean;
  label?: string;
  transition?: MorphTransition;
  ref?: Ref<SVGSVGElement>;
}

export function MorphIcon({
  shapes,
  shape,
  size = 24,
  strokeWidth = 1.75,
  filled = false,
  label,
  transition,
  className,
  ...props
}: MorphIconProps) {
  const all = Object.values(shapes).map(pathsOf);
  const count = Math.max(1, ...all.map((p) => p.length));
  const current = pathsOf(shapes[shape]);
  const fills = Array.from({ length: count }, (_, i) =>
    all.some((p) => {
      const entry = p[i];
      return entry != null && typeof entry === "object" && entry.fill === true;
    }),
  );
  const paths = Array.from({ length: count }, (_, i) => {
    const entry = current[i];
    const d = entry == null ? "" : typeof entry === "string" ? entry : entry.d;
    return <MorphPath key={i} d={d} fill={filled || fills[i] ? "currentColor" : "none"} transition={transition} />;
  });
  const turns = all.length > 0 && Object.values(shapes).some((s) => rotationOf(s) !== 0);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {turns ? (
        <Turn angle={rotationOf(shapes[shape])} transition={transition}>
          {paths}
        </Turn>
      ) : (
        paths
      )}
    </svg>
  );
}

const P = (x: number, y: number) => `${round(x)} ${round(y)}`;
const rad = (deg: number) => (deg * Math.PI) / 180;

function arc(cx: number, cy: number, r: number, a0: number, a1: number, pieces: number) {
  let s = "";
  const step = (a1 - a0) / pieces;
  const k = (4 / 3) * Math.tan(rad(step) / 4);
  for (let i = 0; i < pieces; i++) {
    const t0 = rad(a0 + i * step);
    const t1 = rad(a0 + (i + 1) * step);
    s += `C${P(cx + r * (Math.cos(t0) - k * Math.sin(t0)), cy + r * (Math.sin(t0) + k * Math.cos(t0)))} ${P(
      cx + r * (Math.cos(t1) + k * Math.sin(t1)),
      cy + r * (Math.sin(t1) - k * Math.cos(t1)),
    )} ${P(cx + r * Math.cos(t1), cy + r * Math.sin(t1))}`;
  }
  return s;
}

const still = (x: number, y: number) => `C${P(x, y)} ${P(x, y)} ${P(x, y)}`;
const straight = (ax: number, ay: number, bx: number, by: number) =>
  `C${P(lerp(ax, bx, 1 / 3), lerp(ay, by, 1 / 3))} ${P(lerp(ax, bx, 2 / 3), lerp(ay, by, 2 / 3))} ${P(bx, by)}`;

const SUN_R = 4.25;
const MOON_R = 8.5;
const BITE = { x: 17.5, y: 6.5 };
const BITE_R = Math.hypot(12 - BITE.x, 12 - MOON_R - BITE.y);
const biteFrom = (Math.atan2(12 - BITE.y, 12 + MOON_R - BITE.x) * 180) / Math.PI;
const biteTo = (Math.atan2(12 - MOON_R - BITE.y, 12 - BITE.x) * 180) / Math.PI + 360;
const disc = `M12 ${round(12 - SUN_R)}${arc(12, 12, SUN_R, -90, -360, 3)}${arc(12, 12, SUN_R, 0, -90, 1)}Z`;
const crescent = `M12 ${round(12 - MOON_R)}${arc(12, 12, MOON_R, -90, -360, 3)}${arc(BITE.x, BITE.y, BITE_R, biteFrom, biteTo, 1)}Z`;
function onMoon(deg: number): [number, number] {
  const ux = Math.cos(rad(deg));
  const uy = Math.sin(rad(deg));
  if (deg % 360 > -90 && deg % 360 < 0) {
    const fx = 12 - BITE.x;
    const fy = 12 - BITE.y;
    const b = fx * ux + fy * uy;
    const c = fx * fx + fy * fy - BITE_R * BITE_R;
    const t = -b - Math.sqrt(Math.max(0, b * b - c));
    return [12 + ux * Math.max(0, t), 12 + uy * Math.max(0, t)];
  }
  return [12 + ux * MOON_R, 12 + uy * MOON_R];
}
const RAYS = [0, -45, -90, -135, -180, -225, -270, -315];
const sunRays = RAYS.map(
  (a) =>
    `M${P(12 + 6.85 * Math.cos(rad(a)), 12 + 6.85 * Math.sin(rad(a)))}L${P(12 + 9.25 * Math.cos(rad(a)), 12 + 9.25 * Math.sin(rad(a)))}`,
).join("");
const moonRays = RAYS.map((a) => {
  const [x, y] = onMoon(a);
  return `M${P(x, y)}L${P(x, y)}`;
}).join("");

const CHECK = { a: [4.5, 12.5], b: [9.5, 17.5], c: [19.5, 7.5], m: [14.5, 12.5] } as const;
const sheet =
  "M8.5 10.5L8.5 17.5C8.5 18.6 9.4 19.5 10.5 19.5L17.5 19.5C18.6 19.5 19.5 18.6 19.5 17.5L19.5 10.5C19.5 9.4 18.6 8.5 17.5 8.5L10.5 8.5C9.4 8.5 8.5 9.4 8.5 10.5Z";
const foldedCheck = `M${P(CHECK.a[0], CHECK.a[1])}L${P(CHECK.b[0], CHECK.b[1])}${still(CHECK.b[0], CHECK.b[1])}L${P(CHECK.m[0], CHECK.m[1])}${straight(CHECK.m[0], CHECK.m[1], CHECK.c[0], CHECK.c[1])}L${P(CHECK.c[0], CHECK.c[1])}${straight(CHECK.c[0], CHECK.c[1], CHECK.m[0], CHECK.m[1])}L${P(CHECK.b[0], CHECK.b[1])}${straight(CHECK.b[0], CHECK.b[1], CHECK.a[0], CHECK.a[1])}Z`;

const lid = (y0: number, cy: number) => `M2.5 ${round(y0)}C5.5 ${round(cy)} 18.5 ${round(cy)} 21.5 ${round(y0)}`;
const lidPoint = (y0: number, cy: number, t: number) => {
  const u = 1 - t;
  return [
    u * u * u * 2.5 + 3 * u * u * t * 5.5 + 3 * u * t * t * 18.5 + t * t * t * 21.5,
    (u * u * u + t * t * t) * y0 + 3 * u * t * cy,
  ];
};
const LASHES = [0.2, 0.4, 0.6, 0.8];
const lashes = (y0: number, cy: number, length: number) =>
  LASHES.map((t) => {
    const [x, y] = lidPoint(y0, cy, t);
    const lean = (t - 0.5) * 1.6;
    return `M${P(x, y)}L${P(x + lean * length * 0.6, y + length)}`;
  }).join("");
const pupil = (r: number, cx: number, cy: number) =>
  r > 0 ? `M${P(cx, cy - r)}${arc(cx, cy, r, -90, 270, 4)}Z` : `M${P(cx, cy)}${still(cx, cy).repeat(4)}Z`;
const closedLid = { y0: 10.75, cy: 15.25 };
const [, lidMid] = lidPoint(closedLid.y0, closedLid.cy, 0.5);

const heart =
  "M12 20C7.4 16.6 3.5 13.5 3.5 9.25C3.5 6.6 5.6 4.5 8.25 4.5C9.85 4.5 11.2 5.35 12 6.6C12.8 5.35 14.15 4.5 15.75 4.5C18.4 4.5 20.5 6.6 20.5 9.25C20.5 13.5 16.6 16.6 12 20Z";
const ribbon = "M8.5 3.5L15.5 3.5C16.6 3.5 17.5 4.4 17.5 5.5L17.5 20L12 16.25L6.5 20L6.5 5.5C6.5 4.4 7.4 3.5 8.5 3.5Z";
const ribbonRolled =
  "M8.5 3.5L15.5 3.5C15.5 3.5 15.5 3.5 15.5 3.5L15.5 3.5L12 3.5L8.5 3.5L8.5 3.5C8.5 3.5 8.5 3.5 8.5 3.5Z";
const lockBody =
  "M7 11L17 11C18.1 11 19 11.9 19 13L19 18C19 19.1 18.1 20 17 20L7 20C5.9 20 5 19.1 5 18L5 13C5 11.9 5.9 11 7 11Z";

export const morphIcons = {
  playPause: {
    play: ["M8.5 5.5L8.5 18.5", "M8.5 5.5L19 12L8.5 18.5"],
    pause: ["M8.75 6L8.75 18", "M15.25 6L15.25 12L15.25 18"],
  },
  menuClose: {
    menu: ["M4 6L12 6L20 6M4 18L12 18L20 18", "M4 12L20 12"],
    close: ["M6 6L12 12L18 6M6 18L12 12L18 18"],
  },
  plusMinus: {
    plus: "M5 12L19 12M12 5L12 19",
    minus: "M5 12L19 12M12 12L12 12",
  },
  plusCheck: {
    plus: "M12 5L12 19M5 12L19 12",
    check: `M${P(CHECK.c[0], CHECK.c[1])}L${P(CHECK.b[0], CHECK.b[1])}M${P(CHECK.a[0], CHECK.a[1])}L${P(CHECK.b[0], CHECK.b[1])}`,
  },
  copyCheck: {
    copy: [sheet, "M5.5 15.5L5.5 7.5C5.5 6.4 6.4 5.5 7.5 5.5L15.5 5.5"],
    check: [
      foldedCheck,
      `M${P(CHECK.a[0], CHECK.a[1])}L${P(CHECK.a[0], CHECK.a[1])}${still(CHECK.a[0], CHECK.a[1])}L${P(CHECK.a[0], CHECK.a[1])}`,
    ],
  },
  sunMoon: {
    sun: [disc, sunRays],
    moon: [crescent, moonRays],
  },
  chevron: {
    down: { paths: ["M6 9L12 15L18 9"], rotate: 0 },
    left: { paths: ["M6 9L12 15L18 9"], rotate: 90 },
    up: { paths: ["M6 9L12 15L18 9"], rotate: 180 },
    right: { paths: ["M6 9L12 15L18 9"], rotate: -90 },
  },
  arrow: {
    right: { paths: ["M5 12L19 12M13 6L19 12L13 18"], rotate: 0 },
    down: { paths: ["M5 12L19 12M13 6L19 12L13 18"], rotate: 90 },
    "up-right": { paths: ["M5 12L19 12M13 6L19 12L13 18"], rotate: -45 },
  },
  soundOnOff: {
    on: [
      "M3.5 9.5L7 9.5L11.5 5.5L11.5 18.5L7 14.5L3.5 14.5Z",
      "M15.25 9.25C16.9 10.9 16.9 13.1 15.25 14.75M17.75 6.25C21.3 9.4 21.3 14.6 17.75 17.75",
    ],
    off: [
      "M3.5 9.5L7 9.5L11.5 5.5L11.5 18.5L7 14.5L3.5 14.5Z",
      `M15.75 9.25${straight(15.75, 9.25, 21.25, 14.75)}M21.25 9.25${straight(21.25, 9.25, 15.75, 14.75)}`,
    ],
  },
  eyeOpenClosed: {
    open: [lid(12, 6.75), lid(12, 17.25), pupil(3, 12, 12), lashes(12, 17.25, 0)],
    closed: [
      lid(closedLid.y0, closedLid.cy),
      lid(closedLid.y0, closedLid.cy),
      pupil(0, 12, lidMid),
      lashes(closedLid.y0, closedLid.cy, 2.4),
    ],
  },
  lockUnlock: {
    locked: [lockBody, "M8 11L8 8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8L16 11"],
    unlocked: [lockBody, "M8 11L8 6.5C8 4.29 9.79 2.5 12 2.5C14.21 2.5 16 4.29 16 6.5L16 7.75"],
  },
  heartFilled: {
    outline: [heart],
    filled: [heart, { d: heart, fill: true }],
  },
  bookmark: {
    off: [ribbon, { d: ribbonRolled, fill: true }],
    on: [ribbon, { d: ribbon, fill: true }],
  },
  filterClose: {
    filter: "M3.5 5L12 5L20.5 5L14 12.5L14 19.5L12 19.5L10 19.5L10 12.5Z",
    close: "M6 6L12 12L18 6L12 12L18 18L12 12L6 18L12 12Z",
  },
} satisfies Record<string, MorphShapes>;

export type MorphIconSet = keyof typeof morphIcons;

export interface PlayPauseButtonProps extends Omit<ButtonProps, "children" | "onPress"> {
  playing?: boolean;
  defaultPlaying?: boolean;
  onChange?: (playing: boolean) => void;
  size?: number;
}

export function PlayPauseButton({
  playing,
  defaultPlaying = false,
  onChange,
  size = 48,
  className,
  style,
  ...props
}: PlayPauseButtonProps) {
  const [own, setOwn] = useState(defaultPlaying);
  const on = playing ?? own;

  return (
    <Button
      aria-label={on ? "Pause" : "Play"}
      {...props}
      onPress={() => {
        if (playing === undefined) setOwn(!on);
        onChange?.(!on);
      }}
      style={composeRenderProps(style, (s) => ({ width: size, height: size, ...s }))}
      className={composeRenderProps(className, (cls) =>
        cn(
          "inline-grid shrink-0 cursor-default place-items-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none",
          "transition-[transform,background-color,box-shadow] duration-150 ease-settle",
          "data-[hovered]:bg-primary/90 data-[pressed]:scale-[0.96]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      <MorphIcon
        shapes={morphIcons.playPause}
        shape={on ? "pause" : "play"}
        size={Math.round(size * 0.44)}
        strokeWidth={2.75}
        filled
      />
    </Button>
  );
}
