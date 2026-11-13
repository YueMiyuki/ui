import { type RefObject, useEffect, useState } from "react";

export interface Measured {
  size: number;
  leading: number | null;
  tracking: number;
  weight: string;
  family: string;
  width: number;
  perLine: number | null;
}

let canvas: HTMLCanvasElement | null = null;

function charactersPerLine(el: HTMLElement, style: CSSStyleDeclaration) {
  canvas ??= document.createElement("canvas");
  const context = canvas.getContext("2d");
  const text = el.textContent ?? "";
  if (!context || !text) return null;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const advance = context.measureText(text).width / text.length;
  return advance > 0 ? Math.round(el.clientWidth / advance) : null;
}

function measureAll(root: HTMLElement) {
  const out: Record<string, Measured> = {};
  for (const el of root.querySelectorAll<HTMLElement>("[data-measure]")) {
    const style = getComputedStyle(el);
    out[el.dataset.measure ?? ""] = {
      size: parseFloat(style.fontSize),
      leading: style.lineHeight === "normal" ? null : parseFloat(style.lineHeight),
      tracking: style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing),
      weight: style.fontWeight,
      family: style.fontFamily,
      width: el.clientWidth,
      perLine: charactersPerLine(el, style),
    };
  }
  return out;
}

export function useMeasured(ref: RefObject<HTMLElement | null>) {
  const [measured, setMeasured] = useState<Record<string, Measured>>({});

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    let last = "";
    let live = true;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measureAll(root);
        const key = JSON.stringify(next);
        if (key === last) return;
        last = key;
        setMeasured(next);
      });
    };
    const observer = new ResizeObserver(read);
    observer.observe(root);
    document.fonts?.ready.then(() => {
      if (live) read();
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);

  return measured;
}

const trim = (n: number, digits: number) => n.toFixed(digits).replace(/\.?0+$/, "");

export const px = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? "–" : trim(n, 1));

export function ratio(leading: number | null, size: number) {
  return leading == null ? "normal" : trim(leading / size, 2);
}

export function em(tracking: number, size: number) {
  const value = tracking / size;
  if (Math.abs(value) < 0.0005) return "0";
  return `${value < 0 ? "−" : ""}${trim(Math.abs(value), 3)}`;
}

export function familyName(stack: string) {
  const first = (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
  return first
    .replace(/^_+/, "")
    .replace(/_[0-9a-f]{4,}$/i, "")
    .replace(/\s*Fallback$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}
