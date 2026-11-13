export type Point = [number, number];

const TAU = Math.PI * 2;
const r2 = (v: number) => String(Math.round(v * 100) / 100);
const pt = (p: Point) => `${r2(p[0])} ${r2(p[1])}`;
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface Drop {
  cx: number;
  cy: number;
  w: number;
  h: number;
  m: number;
}

function dropAt(d: Drop, t: number): Point {
  const s = Math.sin(t / 2);
  return [d.cx + d.w * Math.sin(t) * Math.abs(s) ** d.m, d.cy - d.h * Math.cos(t)];
}

function dropDeriv(d: Drop, t: number): Point {
  const e = 1e-4;
  const a = dropAt(d, t - e);
  const b = dropAt(d, t + e);
  return [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e)];
}

function dropSegment(d: Drop, ta: number, tb: number) {
  const a = dropAt(d, ta);
  const b = dropAt(d, tb);
  const k = (tb - ta) / 3;
  const da = Math.abs(Math.sin(ta / 2)) < 1e-6 ? [0, 0] : dropDeriv(d, ta);
  const db = Math.abs(Math.sin(tb / 2)) < 1e-6 ? [0, 0] : dropDeriv(d, tb);
  return `C${pt([a[0] + da[0] * k, a[1] + da[1] * k])} ${pt([b[0] - db[0] * k, b[1] - db[1] * k])} ${pt(b)}`;
}

const anchorT = (k: number) => -TAU / 12 + (k * TAU) / 12;

export function dropOutline(d: Drop): string {
  let s = `M${pt(dropAt(d, anchorT(0)))}`;
  for (let k = 0; k < 12; k++) s += dropSegment(d, anchorT(k), anchorT(k + 1));
  return `${s}Z`;
}

const straight = (a: Point, b: Point) =>
  `C${pt([a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3])} ${pt([a[0] + ((b[0] - a[0]) * 2) / 3, a[1] + ((b[1] - a[1]) * 2) / 3])} ${pt(b)}`;

function armDir(i: number): Point {
  const a = rad(-90 + i * 60);
  return [Math.cos(a), Math.sin(a)];
}

export function starOutline(cx: number, cy: number, r: number, inner = 0): string {
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const v = rad(-120 + i * 60);
    const [ux, uy] = armDir(i);
    points.push([cx + inner * Math.cos(v), cy + inner * Math.sin(v)], [cx + r * ux, cy + r * uy]);
  }
  let s = `M${pt(points[0])}`;
  for (let k = 1; k <= 12; k++) s += straight(points[k - 1], points[k % 12]);
  return `${s}Z`;
}

export interface Branch {
  at: number;
  length: number;
  angle: number;
}

export function branchPoints(cx: number, cy: number, r: number, branches: Branch[]) {
  const out: { arm: number; branch: number; root: Point; left: Point; right: Point }[] = [];
  for (let i = 0; i < 6; i++) {
    const [ux, uy] = armDir(i);
    branches.forEach((b, j) => {
      const root: Point = [cx + ux * r * b.at, cy + uy * r * b.at];
      const a = rad(b.angle);
      const len = r * b.length;
      const left: Point = [
        root[0] + len * (ux * Math.cos(a) + uy * Math.sin(a)),
        root[1] + len * (uy * Math.cos(a) - ux * Math.sin(a)),
      ];
      const right: Point = [
        root[0] + len * (ux * Math.cos(a) - uy * Math.sin(a)),
        root[1] + len * (uy * Math.cos(a) + ux * Math.sin(a)),
      ];
      out.push({ arm: i, branch: j, root, left, right });
    });
  }
  return out;
}

export function branchPath(points: ReturnType<typeof branchPoints>): string {
  return points.map(({ left, root, right }) => `M${pt(left)}L${pt(root)}L${pt(right)}`).join("");
}

export function collapsedBranches(targets: Point[]): string {
  return targets.map((p) => `M${pt(p)}L${pt(p)}L${pt(p)}`).join("");
}
