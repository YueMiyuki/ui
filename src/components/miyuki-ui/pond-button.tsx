"use client";

import { useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useRef } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  type PressEvent,
} from "react-aria-components";
import { type ButtonSize, buttonStyles } from "@/components/miyuki-ui/button";
import { resolveColor } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export type PondButtonVariant = "primary" | "brand" | "secondary";

export interface PondButtonProps extends AriaButtonProps {
  variant?: PondButtonVariant;
  size?: ButtonSize;
  rings?: number;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

interface Ring {
  x: number;
  y: number;
  start: number;
  reach: number;
  strength: number;
}

const PAD = 28;
const LIFE = 1150;
const STAGGER = 115;

const surfaces: Record<PondButtonVariant, string> = {
  primary: cn(
    "[--miyuki-pond-button-crest:rgb(255_255_255/0.34)] [--miyuki-pond-button-trough:rgb(0_0_0/0.5)] [--miyuki-pond-button-sheen:rgb(255_255_255/0.13)]",
    "dark:[--miyuki-pond-button-crest:rgb(255_255_255/0.9)] dark:[--miyuki-pond-button-trough:color-mix(in_oklab,var(--brand)_45%,transparent)] dark:[--miyuki-pond-button-sheen:color-mix(in_oklab,var(--brand)_16%,transparent)]",
  ),
  brand: cn(
    "[--miyuki-pond-button-crest:rgb(255_255_255/0.5)] [--miyuki-pond-button-trough:color-mix(in_oklab,var(--primary)_45%,transparent)] [--miyuki-pond-button-sheen:rgb(255_255_255/0.2)]",
    "dark:[--miyuki-pond-button-crest:rgb(255_255_255/0.6)] dark:[--miyuki-pond-button-trough:color-mix(in_oklab,var(--primary-foreground)_45%,transparent)] dark:[--miyuki-pond-button-sheen:rgb(255_255_255/0.22)]",
  ),
  secondary: cn(
    "[--miyuki-pond-button-crest:color-mix(in_oklab,var(--brand)_14%,transparent)] [--miyuki-pond-button-trough:color-mix(in_oklab,var(--brand)_38%,transparent)] [--miyuki-pond-button-sheen:color-mix(in_oklab,var(--brand)_9%,transparent)]",
    "dark:[--miyuki-pond-button-crest:color-mix(in_oklab,var(--brand-strong)_40%,transparent)] dark:[--miyuki-pond-button-trough:rgb(0_0_0/0.45)] dark:[--miyuki-pond-button-sheen:color-mix(in_oklab,var(--brand)_12%,transparent)]",
  ),
};

const OUTSIDE =
  "[--miyuki-pond-button-far-crest:rgb(255_255_255/0.9)] [--miyuki-pond-button-far-trough:color-mix(in_oklab,var(--brand)_55%,transparent)] dark:[--miyuki-pond-button-far-crest:color-mix(in_oklab,var(--brand-strong)_60%,transparent)] dark:[--miyuki-pond-button-far-trough:rgb(0_0_0/0.55)]";

function radiusOf(t: number) {
  return 1 - (1 - t) ** 2.4;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export function PondButton({
  variant = "primary",
  size = "md",
  rings = 3,
  iconStart,
  iconEnd,
  className,
  children,
  onPressStart,
  onHoverStart,
  ref,
  ...props
}: PondButtonProps) {
  const button = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const sheen = useRef<HTMLSpanElement>(null);
  const glint = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() === true;
  const live = useRef<{ rings: Ring[]; raf: number }>({ rings: [], raf: 0 });

  useEffect(() => {
    const state = live.current;
    return () => cancelAnimationFrame(state.raf);
  }, []);

  const ripple = (px: number, py: number) => {
    const el = button.current;
    const canvas = surface.current;
    const ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const W = w + PAD * 2;
    const H = h + PAD * 2;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const corner = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const color = (name: string) => resolveColor(`var(--miyuki-pond-button-${name})`, el);
    const ink = {
      crest: color("crest"),
      trough: color("trough"),
      farCrest: color("far-crest"),
      farTrough: color("far-trough"),
    };

    const x = PAD + px;
    const y = PAD + py;
    const reach = Math.max(
      Math.hypot(px, py),
      Math.hypot(w - px, py),
      Math.hypot(px, h - py),
      Math.hypot(w - px, h - py),
    );
    const now = performance.now();
    const count = Math.max(1, Math.min(5, Math.round(rings)));
    for (let k = 0; k < count; k++) {
      live.current.rings.push({
        x,
        y,
        start: now + k * STAGGER,
        reach: (reach + PAD * 0.9) * (1 - k * 0.1),
        strength: 1 - k * 0.22,
      });
    }

    const text = label.current;
    if (text) {
      const lr = text.getBoundingClientRect();
      const br = el.getBoundingClientRect();
      const k = br.width > 0 ? w / br.width : 1;
      const lx = (lr.left - br.left) * k + (lr.width * k) / 2;
      const ly = (lr.top - br.top) * k + (lr.height * k) / 2;
      const target = Math.min(1, Math.hypot(lx - px, ly - py) / (reach + PAD * 0.9));
      let t = 0;
      while (t < 1 && radiusOf(t) < target) t += 0.01;
      text.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-1px)", offset: 0.35 },
          { transform: "translateY(0.5px)", offset: 0.7 },
          { transform: "translateY(0)" },
        ],
        { duration: 420, delay: t * LIFE, easing: "ease-in-out" },
      );
    }

    const halo = document.createElement("canvas");
    halo.width = canvas.width;
    halo.height = canvas.height;
    const hx = halo.getContext("2d");
    const far = document.createElement("canvas");
    far.width = canvas.width;
    far.height = canvas.height;
    const fx = far.getContext("2d");
    if (!hx || !fx) return;
    const shape = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      c.roundRect(PAD, PAD, w, h, corner);
    };
    hx.scale(dpr, dpr);
    hx.shadowColor = "#000";
    hx.shadowBlur = PAD * 0.75;
    shape(hx);
    hx.fill();
    hx.shadowBlur = 0;
    shape(hx);
    hx.fill();

    const stroke = (c: CanvasRenderingContext2D, ring: Ring, r: number, alpha: number, color: string) => {
      c.strokeStyle = color;
      c.beginPath();
      c.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      c.globalAlpha = alpha * 0.35;
      c.lineWidth = 3;
      c.stroke();
      c.globalAlpha = alpha;
      c.lineWidth = 1.1;
      c.stroke();
    };
    const band = (c: CanvasRenderingContext2D, ring: Ring, r: number, alpha: number, crest: string, trough: string) => {
      stroke(c, ring, r, alpha, crest);
      if (r > 2.6) stroke(c, ring, r - 2.4, alpha, trough);
    };

    const draw = () => {
      const t0 = performance.now();
      const list = live.current.rings.filter((ring) => t0 - ring.start < LIFE);
      live.current.rings = list;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.globalCompositeOperation = "source-over";
      fx.clearRect(0, 0, far.width, far.height);
      if (list.length === 0) {
        live.current.raf = 0;
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      shape(ctx);
      ctx.clip();
      for (const ring of list) {
        const t = (t0 - ring.start) / LIFE;
        if (t < 0) continue;
        const r = ring.reach * radiusOf(t);
        band(ctx, ring, r, ring.strength * (1 - t) ** 1.3, ink.crest, ink.trough);
        band(fx, ring, r, ring.strength * 0.7 * (1 - t) ** 1.1, ink.farCrest, ink.farTrough);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      fx.globalAlpha = 1;
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.globalCompositeOperation = "destination-in";
      fx.drawImage(halo, 0, 0);
      fx.globalCompositeOperation = "destination-out";
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      shape(fx);
      fx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(far, 0, 0);
      live.current.raf = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(live.current.raf);
    live.current.raf = requestAnimationFrame(draw);
  };

  const handlePress = (e: PressEvent) => {
    onPressStart?.(e);
    if (reduce) {
      glint.current?.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out" });
      return;
    }
    const el = button.current;
    if (!el) return;
    const keyboard = e.pointerType === "keyboard" || e.pointerType === "virtual";
    ripple(keyboard ? el.offsetWidth / 2 : e.x, keyboard ? el.offsetHeight / 2 : e.y);
  };

  return (
    <AriaButton
      {...props}
      ref={mergeRefs(button, ref)}
      onPressStart={handlePress}
      onHoverStart={(e) => {
        onHoverStart?.(e);
        if (reduce) return;
        sheen.current?.animate(
          [
            { transform: "translateX(-110%) skewX(-18deg)", opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { opacity: 1, offset: 0.75 },
            { transform: "translateX(260%) skewX(-18deg)", opacity: 0 },
          ],
          { duration: 2000, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)" },
        );
      }}
      className={composeRenderProps(className, (cls) =>
        cn(buttonStyles({ variant, size }), "isolate", surfaces[variant], OUTSIDE, cls),
      )}
    >
      {composeRenderProps(children, (content) => (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <span
              ref={sheen}
              className="absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,var(--miyuki-pond-button-sheen),transparent)] opacity-0"
            />
            <span ref={glint} className="absolute inset-0 bg-(--miyuki-pond-button-crest) opacity-0" />
          </span>
          <canvas
            ref={surface}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ left: -PAD, top: -PAD, width: 0, height: 0 }}
          />
          <span ref={label} className="relative inline-flex items-center gap-2">
            {iconStart}
            {content}
            {iconEnd}
          </span>
        </>
      ))}
    </AriaButton>
  );
}
