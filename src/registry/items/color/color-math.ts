import { toRgba } from "@/components/miyuki-ui/lib/color";

type Vec = [number, number, number];

export interface Oklab {
  l: number;
  a: number;
  b: number;
  alpha: number;
}

const mul = (m: Vec[], [x, y, z]: Vec): Vec => m.map((r) => r[0] * x + r[1] * y + r[2] * z) as Vec;

const D50_TO_D65: Vec[] = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];
const XYZ_TO_LMS: Vec[] = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_OKLAB: Vec[] = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const OKLAB_TO_LMS: Vec[] = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
];
const LMS_TO_SRGB: Vec[] = [
  [4.0767416360759583, -3.3077115392580629, 0.2309699031821043],
  [-1.2684379732850315, 2.6097573492876882, -0.341319376002657],
  [-0.0041960761386756, -0.7034186179359363, 1.7076146940746117],
];
const SRGB_TO_LMS: Vec[] = [
  [0.4122214694707629, 0.5363325372617349, 0.0514459932675022],
  [0.2119034958178251, 0.6806995506452344, 0.1073969535369406],
  [0.0883024591900564, 0.2817188391361215, 0.6299787016738223],
];

function fromLab(L: number, a: number, b: number): Vec {
  const k = 24389 / 27;
  const e = 216 / 24389;
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const xyz: Vec = [
    (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * (0.3457 / 0.3585),
    L > k * e ? fy ** 3 : L / k,
    (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * ((1 - 0.3457 - 0.3585) / 0.3585),
  ];
  const lms = mul(XYZ_TO_LMS, mul(D50_TO_D65, xyz)).map(Math.cbrt) as Vec;
  return mul(LMS_TO_OKLAB, lms);
}

function fromSrgb(r: number, g: number, b: number): Vec {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lms = mul(SRGB_TO_LMS, [lin(r), lin(g), lin(b)]).map(Math.cbrt) as Vec;
  return mul(LMS_TO_OKLAB, lms);
}

function num(token: string | undefined, percentOf = 1) {
  if (!token || token === "none") return 0;
  const n = parseFloat(token);
  return token.endsWith("%") ? (n / 100) * percentOf : n;
}

export function parse(value: string, el: Element): Oklab {
  const match = /^(oklch|oklab|lab)\(\s*([^)]*)\)$/i.exec(value.trim());
  if (match) {
    const [main, alphaPart] = match[2].split("/");
    const [p, q, r] = main.trim().split(/[\s,]+/);
    const alpha = alphaPart ? num(alphaPart.trim()) : 1;
    const kind = match[1].toLowerCase();
    if (kind === "oklch") {
      const l = num(p, 1);
      const c = num(q, 0.4);
      const h = (num(r) * Math.PI) / 180;
      return { l, a: c * Math.cos(h), b: c * Math.sin(h), alpha };
    }
    if (kind === "oklab") return { l: num(p, 1), a: num(q, 0.4), b: num(r, 0.4), alpha };
    const [l, a, b] = fromLab(num(p, 100), num(q, 125), num(r, 125));
    return { l, a, b, alpha };
  }
  const [r, g, b, alpha] = toRgba(value, el);
  const [l, a, bb] = fromSrgb(r, g, b);
  return { l, a, b: bb, alpha };
}

const trim = (n: number, digits: number) => {
  const s = n.toFixed(digits).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};

export function formatOklch({ l, a, b, alpha }: Oklab) {
  const c = Math.hypot(a, b);
  const h = c < 0.0005 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const body = `${trim(l, 3)} ${trim(c, 3)} ${trim(h, 1)}`;
  return `oklch(${body}${alpha < 1 ? ` / ${trim(alpha, 2)}` : ""})`;
}

function luminance({ l, a, b }: Oklab) {
  const lms = mul(OKLAB_TO_LMS, [l, a, b]).map((x) => x ** 3) as Vec;
  const [r, g, bl] = mul(LMS_TO_SRGB, lms).map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

export function contrast(x: Oklab, y: Oklab) {
  const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}
