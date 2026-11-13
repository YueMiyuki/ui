"use client";

import { useEffect } from "react";
import "@/site/art-files";

const KEEP = 120;
const AREA = 2_400_000;
const drawn = new Map<string, Promise<string | null>>();
const shown = new WeakMap<HTMLImageElement, string>();
const waiting: (() => Promise<void>)[] = [];
let busy = false;

const hold = `html[data-art-hold] img[src^="data:image/svg+xml"]:not([data-art-raster]){visibility:hidden}`;

const filtered = (src: string) =>
  src.length > 2000 && src.startsWith("data:image/svg+xml") && /(?:%3C|<)filter/i.test(src);

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

async function draw(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (w * h < 40_000) return null;
  const wanted = Math.max(1, Math.min(window.devicePixelRatio > 1 ? 2 : 1, Math.sqrt(AREA / (w * h))));
  const shared = gcd(w, h);
  const density = shared >= 8 ? Math.max(1, Math.round(wanted * shared) / shared) : Math.round(w * wanted) / w;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * density);
  canvas.height = Math.round(h * density);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? `${URL.createObjectURL(blob)} ${Number(density.toFixed(6))}x` : null;
}

function next() {
  if (busy) return;
  const job = waiting.shift();
  if (!job) return;
  busy = true;
  const run = () => {
    job().finally(() => {
      busy = false;
      next();
    });
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 120 });
  else setTimeout(run, 30);
}

function forget() {
  for (const [src, pending] of drawn) {
    if (drawn.size <= KEEP) return;
    drawn.delete(src);
    pending.then((set) => {
      const url = set?.split(" ")[0];
      if (url && !document.querySelector(`img[srcset^="${url}"]`)) URL.revokeObjectURL(url);
    });
  }
}

function swap(img: HTMLImageElement) {
  const src = img.getAttribute("src") ?? "";
  if (shown.get(img) === src) return;
  if (shown.has(img)) {
    shown.delete(img);
    img.removeAttribute("srcset");
    img.removeAttribute("data-art-raster");
  }
  if (!src.startsWith("data:image/svg+xml")) return;
  if (!filtered(src)) {
    shown.set(img, src);
    img.dataset.artRaster = "svg";
    return;
  }
  let pending = drawn.get(src);
  if (!pending) {
    pending = new Promise<string | null>((resolve) => {
      waiting.push(() =>
        draw(src)
          .catch(() => null)
          .then(resolve),
      );
      next();
    });
    drawn.set(src, pending);
    forget();
  }
  pending.then((set) => {
    if (!img.isConnected || img.getAttribute("src") !== src || shown.get(img) === src) return;
    shown.set(img, src);
    if (!set) {
      img.dataset.artRaster = "svg";
      return;
    }
    img.srcset = set;
    const reveal = () => {
      if (shown.get(img) === src) img.dataset.artRaster = "bitmap";
    };
    img.decode().then(reveal, reveal);
  });
}

export function ArtRaster() {
  useEffect(() => {
    if ((globalThis as { __miyukiArt?: unknown }).__miyukiArt instanceof Map) return;
    const scan = (root: ParentNode) => {
      for (const img of root.querySelectorAll("img")) swap(img);
    };
    scan(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          if (record.target instanceof HTMLImageElement) swap(record.target);
          continue;
        }
        for (const node of record.addedNodes) {
          if (node instanceof HTMLImageElement) swap(node);
          else if (node instanceof Element) scan(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    return () => observer.disconnect();
  }, []);
  return (
    <style href="miyuki-art-raster" precedence="miyuki">
      {hold}
    </style>
  );
}
