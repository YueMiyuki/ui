export type Rgba = [r: number, g: number, b: number, a: number];

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const VOID_TAGS = new Set(["CANVAS", "IMG", "INPUT", "VIDEO", "IFRAME", "svg", "SVG", "TEXTAREA"]);

function scopeFor(el?: Element | null): Element {
  let host: Element = el ?? document.documentElement;
  if (VOID_TAGS.has(host.tagName) && host.parentElement) host = host.parentElement;
  return host;
}

export function cssVar(name: string, el?: Element | null): string {
  if (!isBrowser()) return "";
  const prop = name.startsWith("--") ? name : `--${name}`;
  return getComputedStyle(el ?? document.documentElement)
    .getPropertyValue(prop)
    .trim();
}

export function resolveColor(value: string, el?: Element | null): string {
  if (!isBrowser()) return value;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
  probe.style.color = "rgba(0, 0, 0, 0)";
  probe.style.color = value;
  probe.setAttribute("aria-hidden", "true");
  const host = scopeFor(el);
  host.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return computed || value;
}

let paint: CanvasRenderingContext2D | null = null;
const rgbaCache = new Map<string, Rgba>();

export function toRgba(value: string, el?: Element | null): Rgba {
  if (!isBrowser()) return [0, 0, 0, 1];
  const resolved = resolveColor(value, el);
  const hit = rgbaCache.get(resolved);
  if (hit) return [...hit] as Rgba;

  if (!paint) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    paint = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!paint) return [0, 0, 0, 1];

  paint.clearRect(0, 0, 1, 1);
  paint.fillStyle = "#000";
  paint.fillStyle = resolved;
  paint.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
  const out: Rgba = [r / 255, g / 255, b / 255, a / 255];
  rgbaCache.set(resolved, out);
  return [...out] as Rgba;
}

export function withAlpha(value: string, alpha: number, el?: Element | null): string {
  const [r, g, b, a] = toRgba(value, el);
  const opacity = a * Math.min(1, Math.max(0, alpha));
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity.toFixed(3)})`;
}

const themeOf = (node: Element) =>
  `${node.classList.contains("dark") ? "dark" : ""}${node.classList.contains("ink") ? "ink" : ""}${node.classList.contains("light") ? "light" : ""}${node.getAttribute("data-theme") ?? ""}`;

export function onThemeChange(callback: () => void, el?: Element | null): () => void {
  if (!isBrowser() || typeof MutationObserver === "undefined") return () => {};
  const root = document.documentElement;
  const scopes: Element[] = [];
  for (let node = el ?? null; node && node !== root; node = node.parentElement) scopes.push(node);
  const read = () => [root.className, root.getAttribute("data-theme") ?? "", ...scopes.map(themeOf)].join("|");
  let last = read();
  const observer = new MutationObserver(() => {
    const next = read();
    if (next === last) return;
    last = next;
    callback();
  });
  for (const node of [root, ...scopes]) {
    observer.observe(node, { attributes: true, attributeFilter: ["class", "data-theme"] });
  }
  return () => observer.disconnect();
}
