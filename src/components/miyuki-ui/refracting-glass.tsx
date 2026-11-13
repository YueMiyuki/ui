"use client";

import { type ComponentProps, type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface RefractingGlassProps extends ComponentProps<"div"> {
  radius?: number | "pill";
  bevel?: number;
  refraction?: number;
  aberration?: number;
  frost?: number;
  tint?: string;
}

interface Lens {
  url: string;
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const RED = "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0";
const GREEN = "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0";
const BLUE = "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0";

const RIM_MASK = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

function canRefract() {
  if (typeof navigator === "undefined") return false;
  const data = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  if (data?.brands?.some((entry) => entry.brand === "Chromium")) return true;
  return /\bChrome\/\d+/.test(navigator.userAgent) && !/\b(Firefox|FxiOS|CriOS)\//.test(navigator.userAgent);
}

function buildLens(width: number, height: number, corner: number, bevel: number) {
  const W = Math.max(2, Math.round(width));
  const H = Math.max(2, Math.round(height));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(W, H);
  const data = image.data;
  const hx = W / 2;
  const hy = H / 2;
  const r = clamp(corner, 0, Math.min(hx, hy));
  const band = clamp(bevel, 1, Math.min(hx, hy));
  for (let y = 0, i = 0; y < H; y++) {
    const py = y + 0.5 - hy;
    const qy = Math.abs(py) - (hy - r);
    for (let x = 0; x < W; x++, i += 4) {
      const px = x + 0.5 - hx;
      const qx = Math.abs(px) - (hx - r);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      const depth = -outside;
      let dx = 0;
      let dy = 0;
      if (depth < band) {
        let nx: number;
        let ny: number;
        if (qx > 0 && qy > 0) {
          const length = Math.hypot(qx, qy) || 1;
          nx = qx / length;
          ny = qy / length;
        } else if (qx > qy) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
        nx *= px < 0 ? -1 : 1;
        ny *= py < 0 ? -1 : 1;
        const u = clamp(1 - depth / band, 0, 0.999);
        const bend = Math.min(1, (0.26 * u ** 1.6) / Math.sqrt(1 - u * u));
        dx = -nx * bend;
        dy = -ny * bend;
      }
      data[i] = Math.round(128 + dx * 127);
      data[i + 1] = Math.round(128 + dy * 127);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL("image/png"), width: W, height: H };
}

export function RefractingGlass({
  radius = 24,
  bevel = 18,
  refraction = 34,
  aberration = 0.25,
  frost = 0,
  tint,
  className,
  style,
  children,
  ...props
}: RefractingGlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = `miyuki-refracting-glass-${useId().replace(/[^\w-]/g, "")}`;
  const [lens, setLens] = useState<Lens | null>(null);
  const [pillHeight, setPillHeight] = useState(0);
  const pill = radius === "pill";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const refract = canRefract();
    let width = 0;
    let height = 0;
    let frame = 0;

    const rebuild = () => {
      frame = 0;
      const nw = el.offsetWidth;
      const nh = el.offsetHeight;
      if (nw === width && nh === height) return;
      width = nw;
      height = nh;
      if (pill) setPillHeight(nh);
      if (!refract || nw < 2 || nh < 2) return;
      const corner = pill ? nh / 2 : Math.max(0, radius as number);
      setLens(buildLens(nw, nh, corner, bevel));
    };

    const ro = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(rebuild);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [radius, pill, bevel]);

  const strength = Math.max(0, refraction);
  const spread = clamp(aberration, 0, 1) * 0.4;
  const scale = strength * 2;
  const soft = Math.max(0, frost);
  const corner = pill ? (pillHeight ? pillHeight / 2 : 9999) : Math.max(0, radius);
  const filter = lens ? `url(#${id})` : `blur(${Math.max(soft, 14)}px) saturate(1.6)`;

  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden bg-(--miyuki-refracting-glass-tint) shadow-lg",
        "[--miyuki-refracting-glass-tint:color-mix(in_oklab,var(--card)_22%,transparent)]",
        "dark:[--miyuki-refracting-glass-tint:color-mix(in_oklab,var(--background)_34%,transparent)]",
        "[-webkit-backdrop-filter:var(--miyuki-refracting-glass-filter)] [backdrop-filter:var(--miyuki-refracting-glass-filter)]",
        "[@media(prefers-reduced-transparency:reduce)]:bg-card",
        "[@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none]",
        "[@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none]",
        className,
      )}
      style={
        {
          ...style,
          borderRadius: corner,
          "--miyuki-refracting-glass-filter": filter,
          ...(tint ? { "--miyuki-refracting-glass-tint": tint } : null),
        } as CSSProperties
      }
      {...props}
    >
      {lens ? (
        <svg aria-hidden="true" className="pointer-events-none absolute size-0 overflow-hidden">
          <filter
            id={id}
            x="0"
            y="0"
            width={lens.width}
            height={lens.height}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={soft} result="soft" />
            <feImage
              href={lens.url}
              x="0"
              y="0"
              width={lens.width}
              height={lens.height}
              preserveAspectRatio="none"
              result="lens"
            />
            <feDisplacementMap
              in="soft"
              in2="lens"
              scale={scale * (1 + spread)}
              xChannelSelector="R"
              yChannelSelector="G"
              result="shiftRed"
            />
            <feColorMatrix in="shiftRed" type="matrix" values={RED} result="red" />
            <feDisplacementMap
              in="soft"
              in2="lens"
              scale={scale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="shiftGreen"
            />
            <feColorMatrix in="shiftGreen" type="matrix" values={GREEN} result="green" />
            <feDisplacementMap
              in="soft"
              in2="lens"
              scale={scale * (1 - spread)}
              xChannelSelector="R"
              yChannelSelector="G"
              result="shiftBlue"
            />
            <feColorMatrix in="shiftBlue" type="matrix" values={BLUE} result="blue" />
            <feBlend in="red" in2="green" mode="screen" result="redGreen" />
            <feBlend in="redGreen" in2="blue" mode="screen" />
          </filter>
        </svg>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[inherit]",
          "bg-[radial-gradient(120%_90%_at_18%_0%,rgb(255_255_255/0.22),transparent_55%)] dark:bg-[radial-gradient(120%_90%_at_18%_0%,rgb(255_255_255/0.08),transparent_55%)]",
          "shadow-[inset_0_1px_1px_rgb(255_255_255/0.7),inset_0_-10px_18px_-14px_color-mix(in_oklab,var(--foreground)_30%,transparent),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
          "dark:shadow-[inset_0_1px_1px_rgb(255_255_255/0.28),inset_0_-10px_18px_-14px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(255_255_255/0.07)]",
          "[@media(prefers-reduced-transparency:reduce)]:hidden",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-transparent bg-[linear-gradient(140deg,rgb(255_255_255/0.85),rgb(255_255_255/0.08)_32%,rgb(255_255_255/0)_50%,rgb(255_255_255/0.08)_68%,rgb(255_255_255/0.6))] [background-origin:border-box] dark:opacity-55"
        style={{
          mask: RIM_MASK,
          WebkitMask: RIM_MASK,
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />
      {children}
    </div>
  );
}
