"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface OutlineLetteringProps extends Omit<ComponentProps<"div">, "children"> {
  text: string;
  strokeWidth?: number;
  radius?: number;
  colors?: string[];
  duration?: number;
  ref?: Ref<HTMLDivElement>;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIZE = 100;
const DASH = SIZE * 5;
const deep = (token: string) => `oklch(from ${token} min(l, var(--miyuki-outline-lettering-l, 1)) c h)`;
const DEFAULT_COLORS = [deep("var(--brand)"), deep("var(--chart-2)"), deep("var(--chart-3)")];

const keyframes = `
@keyframes miyuki-outline-lettering-draw {
  from { stroke-dashoffset: var(--miyuki-outline-lettering-dash, ${DASH}); }
  to { stroke-dashoffset: 0; }
}
`;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function guess(text: string): Box {
  const w = Math.max(1, Array.from(text).length) * SIZE * 0.58;
  return { x: -4, y: -SIZE * 0.78, w: w + 8, h: SIZE * 1.02 };
}

export function OutlineLettering({
  text,
  strokeWidth = 1,
  radius = 0.2,
  colors = DEFAULT_COLORS,
  duration = 3,
  className,
  style,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ref,
  ...props
}: OutlineLetteringProps) {
  const id = `miyuki-thf-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const own = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const label = useRef<SVGTextElement>(null);
  const spot = useRef<SVGRadialGradientElement>(null);
  const reduced = useReducedMotion() === true;
  const inView = useInView(own, { once: true, amount: 0.3 });
  const [box, setBox] = useState<Box | null>(null);
  const [tracking, setTracking] = useState(0);
  const [unit, setUnit] = useState(1);
  const [dash, setDash] = useState(DASH);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });
  const presence = useMotionValue(0);
  const lit = useRef(false);
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;

  useLayoutEffect(() => {
    const node = label.current;
    const root = own.current;
    if (!node || !root) return;
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      const cs = getComputedStyle(node);
      const rootCs = getComputedStyle(root);
      const rootSize = parseFloat(rootCs.fontSize) || 16;
      const spacing = rootCs.letterSpacing === "normal" ? 0 : (parseFloat(rootCs.letterSpacing) / rootSize) * SIZE;
      setTracking(spacing);
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) {
        const b = node.getBBox();
        setBox({ x: b.x, y: b.y, w: b.width, h: b.height });
        return;
      }
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${SIZE}px ${cs.fontFamily}`;
      ctx.letterSpacing = `${spacing}px`;
      const m = ctx.measureText(text);
      const left = -m.actualBoundingBoxLeft;
      const right = m.actualBoundingBoxRight;
      setBox({
        x: left,
        y: -m.actualBoundingBoxAscent,
        w: Math.max(1, right - left),
        h: Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent),
      });
    };
    read();
    const fonts = document.fonts;
    fonts?.ready.then(read).catch(() => {});
    fonts?.addEventListener("loadingdone", read);
    return () => {
      cancelled = true;
      fonts?.removeEventListener("loadingdone", read);
    };
  }, [text]);

  const frame = box ?? guess(text);
  const pad = Math.max(2, strokeWidth * 3);
  const vb = { x: frame.x - pad, y: frame.y - pad, w: frame.w + pad * 2, h: frame.h + pad * 2 };

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    // Safari measures dashes on SVG text in device pixels, not user units
    const ua = navigator.userAgent;
    const devicePixelDashes = /AppleWebKit/.test(ua) && !/Chrome|Chromium/.test(ua);
    const read = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setUnit(1 / Math.min(w / vb.w, h / vb.h));
      const m = el.getScreenCTM();
      if (devicePixelDashes && m) setDash(DASH * Math.hypot(m.a, m.b) * (window.devicePixelRatio || 1));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [vb.w, vb.h]);

  useEffect(() => {
    const node = spot.current;
    if (!node) return;
    const a = sx.on("change", (v) => node.setAttribute("cx", v.toFixed(2)));
    const b = sy.on("change", (v) => node.setAttribute("cy", v.toFixed(2)));
    return () => {
      a();
      b();
    };
  }, [sx, sy]);

  const toLocal = (event: PointerEvent<HTMLDivElement>) => {
    const el = svg.current;
    const matrix = el?.getScreenCTM();
    if (!el || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return point;
  };

  const show = (event: PointerEvent<HTMLDivElement>, jump: boolean) => {
    const p = toLocal(event);
    if (!p) return;
    x.set(p.x);
    y.set(p.y);
    if (jump || reduced) {
      sx.jump(p.x);
      sy.jump(p.y);
    }
    if (!lit.current) {
      lit.current = true;
      animate(presence, 1, { duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] });
    }
  };

  const drawn = reduced || (box !== null && inView);
  const hairline = Math.max(0.5, strokeWidth) * 2 * unit;
  const colored = Math.max(1, strokeWidth * 1.8) * 2 * unit;
  const reach = Math.max(1, radius * frame.w);
  const draw: CSSProperties = reduced
    ? {}
    : ({
        "--miyuki-outline-lettering-dash": dash,
        strokeDasharray: `${dash} ${dash}`,
        strokeDashoffset: dash,
        animation: drawn
          ? `miyuki-outline-lettering-draw ${Math.max(0.1, duration)}s cubic-bezier(0.45, 0.05, 0.25, 1) forwards`
          : "none",
      } as CSSProperties);

  const textProps = {
    x: 0,
    y: 0,
    fontSize: SIZE,
    fill: "none",
    letterSpacing: tracking,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <div
      {...props}
      ref={mergeRefs(own, ref)}
      className={cn(
        "relative w-full touch-pan-y select-none",
        "[--miyuki-outline-lettering-l:0.6] dark:[--miyuki-outline-lettering-l:1]",
        className,
      )}
      style={{ ...style, "--miyuki-outline-lettering-glow": `url(#${id}-glow)` } as CSSProperties}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        show(event, true);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        show(event, false);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        lit.current = false;
        animate(presence, 0, { duration: reduced ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] });
      }}
    >
      <style href="miyuki-outline-lettering" precedence="miyuki">
        {keyframes}
      </style>
      <span className="sr-only">{text}</span>
      <svg
        ref={svg}
        aria-hidden="true"
        focusable="false"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block size-full overflow-visible"
      >
        <defs>
          <linearGradient
            id={`${id}-ink`}
            gradientUnits="userSpaceOnUse"
            x1={frame.x}
            x2={frame.x + frame.w}
            y1={0}
            y2={0}
          >
            {palette.map((color, i) => (
              <stop key={i} offset={palette.length > 1 ? i / (palette.length - 1) : 0} style={{ stopColor: color }} />
            ))}
          </linearGradient>
          <radialGradient ref={spot} id={`${id}-spot`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={reach}>
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.4" stopColor="#fff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask
            id={`${id}-mask`}
            maskUnits="userSpaceOnUse"
            x={vb.x - reach}
            y={vb.y - reach}
            width={vb.w + reach * 2}
            height={vb.h + reach * 2}
          >
            <rect
              x={vb.x - reach}
              y={vb.y - reach}
              width={vb.w + reach * 2}
              height={vb.h + reach * 2}
              fill={`url(#${id}-spot)`}
            />
          </mask>
          <mask
            id={`${id}-cut`}
            maskUnits="userSpaceOnUse"
            x={vb.x - pad}
            y={vb.y - pad}
            width={vb.w + pad * 2}
            height={vb.h + pad * 2}
          >
            <rect x={vb.x - pad} y={vb.y - pad} width={vb.w + pad * 2} height={vb.h + pad * 2} fill="#fff" />
            <text x={0} y={0} fontSize={SIZE} letterSpacing={tracking} fill="#000">
              {text}
            </text>
          </mask>
          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={SIZE * 0.02} result="soft" />
            <feComponentTransfer in="soft" result="halo">
              <feFuncA type="linear" slope="0.9" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g mask={`url(#${id}-cut)`}>
          <text
            ref={label}
            {...textProps}
            strokeWidth={hairline}
            className="stroke-muted-foreground/50 dark:stroke-muted-foreground/65"
            style={draw}
          >
            {text}
          </text>
        </g>
        <motion.g mask={`url(#${id}-mask)`} style={{ opacity: presence }}>
          <g className="dark:[filter:var(--miyuki-outline-lettering-glow)]">
            <g mask={`url(#${id}-cut)`}>
              <text {...textProps} strokeWidth={colored} stroke={`url(#${id}-ink)`} style={draw}>
                {text}
              </text>
            </g>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
