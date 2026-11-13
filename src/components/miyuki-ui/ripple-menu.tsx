"use client";

import { Ellipsis } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface RippleMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  ring?: number;
  tone?: "default" | "destructive";
}

export interface RippleMenuProps extends Omit<ComponentProps<"div">, "children"> {
  items: readonly RippleMenuItem[];
  onAction?: (id: string, point: { x: number; y: number }) => void;
  children: ReactNode;
  "aria-label"?: string;
  trigger?: boolean;
  triggerLabel?: string;
  holdDelay?: number;
  isDisabled?: boolean;
}

type Mode = "hold" | "click" | "keyboard";

interface Placed {
  item: RippleMenuItem;
  ring: number;
  angle: number;
  x: number;
  y: number;
  size: number;
}

interface OpenState {
  key: number;
  cx: number;
  cy: number;
  ox: number;
  oy: number;
  mode: Mode;
  placed: Placed[];
  radii: number[];
}

const RADII = [66, 124, 176];
const SIZES = [48, 42, 40];
const MARGIN = 10;
const DEAD = 22;

function ringsOf(items: readonly RippleMenuItem[]) {
  const n = items.length;
  const inner = n <= 4 ? n : Math.min(5, Math.ceil(n / 2));
  const rings: RippleMenuItem[][] = [];
  items.forEach((item, i) => {
    const r = Math.max(0, Math.min(RADII.length - 1, item.ring ?? (i < inner ? 0 : 1)));
    (rings[r] ??= []).push(item);
  });
  return rings.filter((r) => r && r.length > 0);
}

function labelBox(x: number, y: number, angle: number, size: number, label: string) {
  const w = label.length * 7 + 22;
  const h = 26;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ax = x + c * (size / 2 + 6);
  const ay = y + s * (size / 2 + 6);
  const left = ax + ((c - 1) / 2) * w;
  const top = ay + ((s - 1) / 2) * h;
  return { left, top, right: left + w, bottom: top + h };
}

function fits(x: number, y: number, angle: number, size: number, label: string, vw: number, vh: number) {
  const b = labelBox(x, y, angle, size, label);
  const half = size / 2;
  return (
    x - half >= MARGIN &&
    y - half >= MARGIN &&
    x + half <= vw - MARGIN &&
    y + half <= vh - MARGIN &&
    b.left >= MARGIN &&
    b.top >= MARGIN &&
    b.right <= vw - MARGIN &&
    b.bottom <= vh - MARGIN
  );
}

function largestArc(valid: boolean[]) {
  const n = valid.length;
  if (valid.every(Boolean)) return { start: 0, length: n, full: true };
  let best = { start: 0, length: 0, full: false };
  for (let i = 0; i < n; i++) {
    if (!valid[i] || valid[(i - 1 + n) % n]) continue;
    let len = 0;
    while (len < n && valid[(i + len) % n]) len++;
    if (len > best.length) best = { start: i, length: len, full: false };
  }
  return best;
}

function layout(items: readonly RippleMenuItem[], px: number, py: number, vw: number, vh: number) {
  const rings = ringsOf(items);
  const STEP = 3;
  const samples = 360 / STEP;
  let cx = px;
  let cy = py;
  const toward = { x: vw / 2 - px, y: vh / 2 - py };
  const dist = Math.hypot(toward.x, toward.y) || 1;
  const outer = RADII[rings.length - 1] + SIZES[rings.length - 1] / 2 + MARGIN;
  for (let attempt = 0; attempt < 24; attempt++) {
    const placed: Placed[] = [];
    let ok = true;
    for (let r = 0; r < rings.length; r++) {
      const list = rings[r];
      const radius = RADII[r];
      const size = SIZES[r];
      const valid: boolean[] = [];
      for (let i = 0; i < samples; i++) {
        const a = ((i * STEP - 180) * Math.PI) / 180;
        const longest = list.reduce((m, it) => (it.label.length > m.length ? it.label : m), "");
        valid.push(fits(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, a, size, longest, vw, vh));
      }
      const arc = largestArc(valid);
      const need = list.length * (((size + 18) / radius) * (180 / Math.PI));
      if (!arc.full && arc.length * STEP < need) {
        ok = false;
        break;
      }
      let angles: number[];
      if (arc.full) {
        if (r === 0) {
          const step = 360 / list.length;
          angles = list.map((_, i) => -90 + i * step);
        } else {
          const inner = placed.filter((p) => p.ring === 0).length || 1;
          const step0 = 360 / inner;
          if (list.length <= inner) {
            const gaps = Array.from({ length: inner }, (_, m) => -90 + step0 * (m + 0.5));
            gaps.sort((a, b) => Math.abs(((a + 450) % 360) - 180) - Math.abs(((b + 450) % 360) - 180));
            angles = gaps.slice(0, list.length).sort((a, b) => ((a + 450) % 360) - ((b + 450) % 360));
          } else {
            const step = 360 / list.length;
            angles = list.map((_, i) => -90 + step / 2 + i * step);
          }
        }
      } else {
        const start = arc.start * STEP - 180;
        const span = (arc.length - 1) * STEP;
        const pad = Math.min(14, span * 0.08);
        angles = list.map((_, i) =>
          list.length === 1 ? start + span / 2 : start + pad + ((span - pad * 2) * i) / (list.length - 1),
        );
        if (r > 0) {
          const rel = (d: number) => (((d - start) % 360) + 360) % 360;
          const validAt = (d: number) => {
            const i = Math.round(((((d + 180) % 360) + 360) % 360) / STEP) % samples;
            return valid[i] && rel(d) <= span;
          };
          const prev = placed
            .filter((p) => p.ring === r - 1)
            .map((p) => (p.angle * 180) / Math.PI)
            .sort((a, b) => rel(a) - rel(b));
          if (prev.length > 0) {
            const gap = prev.length > 1 ? rel(prev[1]) - rel(prev[0]) : 44;
            const candidates = [
              prev[0] - gap / 2,
              ...prev.slice(0, -1).map((a, i) => a + (rel(prev[i + 1]) - rel(a)) / 2),
              prev[prev.length - 1] + gap / 2,
            ].filter(validAt);
            const mid = start + span / 2;
            candidates.sort((a, b) => Math.abs(rel(a) - rel(mid)) - Math.abs(rel(b) - rel(mid)));
            if (candidates.length >= list.length)
              angles = candidates.slice(0, list.length).sort((a, b) => rel(a) - rel(b));
          }
        }
      }
      list.forEach((item, i) => {
        const a = (angles[i] * Math.PI) / 180;
        placed.push({ item, ring: r, angle: a, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, size });
      });
    }
    if (ok) return { cx, cy, placed, radii: RADII.slice(0, rings.length) };
    cx = Math.max(outer * 0.5, Math.min(vw - outer * 0.5, cx + (toward.x / dist) * 14));
    cy = Math.max(outer * 0.5, Math.min(vh - outer * 0.5, cy + (toward.y / dist) * 14));
  }
  const cxx = Math.max(outer, Math.min(vw - outer, px));
  const cyy = Math.max(outer, Math.min(vh - outer, py));
  const placed: Placed[] = [];
  rings.forEach((list, r) => {
    list.forEach((item, i) => {
      const a = ((-90 + (360 / list.length) * i + (r ? 180 / list.length : 0)) * Math.PI) / 180;
      placed.push({
        item,
        ring: r,
        angle: a,
        x: cxx + Math.cos(a) * RADII[r],
        y: cyy + Math.sin(a) * RADII[r],
        size: SIZES[r],
      });
    });
  });
  return { cx: cxx, cy: cyy, placed, radii: RADII.slice(0, rings.length) };
}

function pick(open: OpenState, x: number, y: number) {
  const dx = x - open.cx;
  const dy = y - open.cy;
  const d = Math.hypot(dx, dy);
  if (d < DEAD) return null;
  const a = Math.atan2(dy, dx);
  const diff = (p: Placed) => Math.abs(Math.atan2(Math.sin(p.angle - a), Math.cos(p.angle - a)));
  const ring = open.radii.length > 1 && d > (open.radii[0] + open.radii[1]) / 2 + 4 ? 1 : 0;
  const pool = open.placed.filter((p) => p.ring === ring);
  let best: Placed | null = null;
  for (const p of pool.length ? pool : open.placed) if (!best || diff(p) < diff(best)) best = p;
  if (best && diff(best) > 1.2) {
    let near: Placed | null = null;
    for (const p of open.placed)
      if (!near || Math.hypot(p.x - x, p.y - y) < Math.hypot(near.x - x, near.y - y)) near = p;
    return near;
  }
  return best;
}

const keyframes = `
@keyframes miyuki-ripple-menu-ripple {
  0% { transform: translate(-50%, -50%) scale(0.06); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
@keyframes miyuki-ripple-menu-pulse {
  0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; }
}
@keyframes miyuki-ripple-menu-fade { from { opacity: 0; } }
`;

export function RippleMenu({
  items,
  onAction,
  children,
  "aria-label": ariaLabel = "Actions",
  trigger = true,
  triggerLabel = "Open actions",
  holdDelay = 380,
  isDisabled = false,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onContextMenu,
  onKeyDown,
  ...props
}: RippleMenuProps) {
  const id = useId();
  const [open, setOpen] = useState<OpenState | null>(null);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ x: number; y: number; id: number; timer: number } | null>(null);
  const gesture = useRef<{ pointer: number; moved: boolean; button: number } | null>(null);
  const restore = useRef<HTMLElement | null>(null);
  const openRef = useRef<OpenState | null>(null);
  const seq = useRef(0);
  const reduced = useRef(false);
  const closeTimer = useRef(0);

  useLayoutEffect(() => {
    openRef.current = open;
  }, [open]);

  const finishClose = useCallback(() => {
    setOpen(null);
    setClosing(false);
    setShown(false);
    setActive(null);
    setChosen(null);
    gesture.current = null;
  }, []);

  const close = useCallback(
    (refocus = true) => {
      if (!openRef.current) return;
      setClosing(true);
      if (refocus) {
        const target = restore.current;
        if (target && document.contains(target)) target.focus({ preventScroll: true });
      }
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(finishClose, reduced.current ? 90 : 170);
    },
    [finishClose],
  );

  const openAt = (x: number, y: number, mode: Mode, origin?: { x: number; y: number }) => {
    if (isDisabled || items.length === 0) return;
    window.clearTimeout(closeTimer.current);
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const active = document.activeElement as HTMLElement | null;
    if (!openRef.current) restore.current = active && active !== document.body ? active : areaRef.current;
    const placed = layout(items, x, y, window.innerWidth, window.innerHeight);
    seq.current += 1;
    setClosing(false);
    setShown(false);
    setChosen(null);
    setActive(mode === "keyboard" ? (placed.placed[0]?.item.id ?? null) : null);
    setOpen({ key: seq.current, ox: origin?.x ?? x, oy: origin?.y ?? y, mode, ...placed });
  };

  const choose = useCallback(
    (itemId: string) => {
      const o = openRef.current;
      if (!o) return;
      setChosen(itemId);
      const rect = areaRef.current?.getBoundingClientRect();
      onAction?.(itemId, rect ? { x: o.ox - rect.left, y: o.oy - rect.top } : { x: 0, y: 0 });
      window.setTimeout(() => close(), reduced.current ? 0 : 140);
    },
    [onAction, close],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    if (open.mode === "keyboard") {
      const first = open.placed[0]?.item.id;
      menuRef.current?.querySelector<HTMLElement>(`[data-item="${first}"]`)?.focus({ preventScroll: true });
    } else {
      menuRef.current?.focus({ preventScroll: true });
    }
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = (event: globalThis.PointerEvent) => {
      const o = openRef.current;
      if (!o || closing) return;
      const g = gesture.current;
      if (g && event.pointerId === g.pointer && Math.hypot(event.clientX - o.ox, event.clientY - o.oy) > 6)
        g.moved = true;
      const hit = pick(o, event.clientX, event.clientY);
      const next = hit?.item.id ?? null;
      setActive((prev) => {
        if (prev !== next && next) {
          menuRef.current?.querySelector<HTMLElement>(`[data-item="${next}"]`)?.focus({ preventScroll: true });
        }
        return next ?? (g ? null : prev);
      });
    };
    const onUp = (event: globalThis.PointerEvent) => {
      const g = gesture.current;
      const o = openRef.current;
      if (!g || !o || event.pointerId !== g.pointer) return;
      gesture.current = null;
      if (!g.moved) return;
      const hit = pick(o, event.clientX, event.clientY);
      if (hit) choose(hit.item.id);
    };
    const onResize = () => close(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, closing, choose, close]);

  useEffect(
    () => () => {
      window.clearTimeout(press.current?.timer);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const focusItem = (itemId: string) => {
    setActive(itemId);
    menuRef.current?.querySelector<HTMLElement>(`[data-item="${itemId}"]`)?.focus({ preventScroll: true });
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const o = openRef.current;
    if (!o) return;
    const list = o.placed;
    const current = list.find((p) => p.item.id === active) ?? null;
    const ringItems = (r: number) =>
      list
        .filter((p) => p.ring === r)
        .sort((a, b) => ((a.angle + Math.PI * 2.5) % (Math.PI * 2)) - ((b.angle + Math.PI * 2.5) % (Math.PI * 2)));
    const nearestOn = (r: number, angle: number) => {
      let best: Placed | null = null;
      for (const p of list.filter((q) => q.ring === r)) {
        const d = Math.abs(Math.atan2(Math.sin(p.angle - angle), Math.cos(p.angle - angle)));
        if (!best || d < Math.abs(Math.atan2(Math.sin(best.angle - angle), Math.cos(best.angle - angle)))) best = p;
      }
      return best;
    };
    let next: Placed | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowLeft": {
        if (!current) {
          next = ringItems(0)[0] ?? list[0];
          break;
        }
        const ring = ringItems(current.ring);
        const i = ring.indexOf(current);
        next = ring[(i + (event.key === "ArrowRight" ? 1 : -1) + ring.length) % ring.length];
        break;
      }
      case "ArrowUp":
      case "ArrowDown": {
        if (!current) {
          next = ringItems(0)[0] ?? list[0];
          break;
        }
        const rings = o.radii.length;
        const dir = event.key === "ArrowUp" ? 1 : -1;
        const target = current.ring + dir;
        if (target >= 0 && target < rings) next = nearestOn(target, current.angle);
        else {
          const ring = ringItems(current.ring);
          const i = ring.indexOf(current);
          next = ring[(i + dir + ring.length) % ring.length];
        }
        break;
      }
      case "Home":
        next = ringItems(0)[0] ?? list[0];
        break;
      case "End": {
        const last = ringItems(o.radii.length - 1);
        next = last[last.length - 1] ?? list[list.length - 1];
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (current) choose(current.item.id);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        event.preventDefault();
        close();
        return;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const k = event.key.toLowerCase();
          const start = current ? list.indexOf(current) + 1 : 0;
          for (let i = 0; i < list.length; i++) {
            const p = list[(start + i) % list.length];
            if (p.item.label.toLowerCase().startsWith(k)) {
              next = p;
              break;
            }
          }
          if (!next) return;
          break;
        }
        return;
    }
    event.preventDefault();
    if (next) focusItem(next.item.id);
  };

  const highlighted = open?.placed.find((p) => p.item.id === active) ?? null;
  const span = open ? open.radii[open.radii.length - 1] + 40 : 0;
  const live = shown && !closing;

  return (
    <>
      <div
        {...props}
        ref={areaRef}
        aria-describedby={`${id}-hint`}
        data-open={open ? "" : undefined}
        className={cn("relative touch-none select-none [-webkit-touch-callout:none]", className)}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          onPointerDown?.(event);
          if (isDisabled || event.defaultPrevented || !event.isPrimary || event.button !== 0) return;
          if ((event.target as Element).closest("button, a, input, textarea, select, [data-ripple-trigger]")) return;
          cancelPress();
          const { clientX: x, clientY: y, pointerId } = event;
          press.current = {
            x,
            y,
            id: pointerId,
            timer: window.setTimeout(() => {
              press.current = null;
              gesture.current = { pointer: pointerId, moved: false, button: 0 };
              openAt(x, y, "hold");
            }, holdDelay),
          };
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          onPointerMove?.(event);
          const p = press.current;
          if (p && event.pointerId === p.id && Math.hypot(event.clientX - p.x, event.clientY - p.y) > 8) cancelPress();
        }}
        onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
          onPointerUp?.(event);
          cancelPress();
        }}
        onPointerCancel={(event: PointerEvent<HTMLDivElement>) => {
          onPointerCancel?.(event);
          cancelPress();
        }}
        onContextMenu={(event) => {
          onContextMenu?.(event);
          if (isDisabled || event.defaultPrevented) return;
          event.preventDefault();
          if (openRef.current?.mode === "hold" && gesture.current) return;
          cancelPress();
          const pointer = (event.nativeEvent as globalThis.PointerEvent).pointerId ?? 1;
          gesture.current = (event.buttons & 2) !== 0 ? { pointer, moved: false, button: 2 } : null;
          openAt(event.clientX, event.clientY, "click");
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (isDisabled || event.defaultPrevented) return;
          if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
            event.preventDefault();
            const target = event.target as HTMLElement;
            const r = (
              target === areaRef.current || !areaRef.current?.contains(target) ? areaRef.current : target
            )?.getBoundingClientRect();
            if (r) openAt(r.left + r.width / 2, r.top + r.height / 2, "keyboard");
          }
        }}
      >
        {children}
        {trigger && (
          <button
            ref={triggerRef}
            type="button"
            data-ripple-trigger=""
            aria-haspopup="menu"
            aria-expanded={open != null}
            aria-label={triggerLabel}
            disabled={isDisabled}
            onClick={(event) => {
              const r = event.currentTarget.getBoundingClientRect();
              const keyboard = event.detail === 0;
              openAt(r.left + r.width / 2, r.top + r.height / 2, keyboard ? "keyboard" : "click");
            }}
            className={cn(
              "absolute right-3 bottom-3 z-10 flex size-10 cursor-default items-center justify-center rounded-full",
              "border border-border bg-popover/90 text-foreground shadow-md backdrop-blur-sm outline-none",
              "transition-[transform,background-color] duration-150 ease-settle hover:bg-accent active:scale-95",
              "focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              "[&_svg]:size-[18px]",
            )}
          >
            <Ellipsis aria-hidden="true" />
          </button>
        )}
        <span id={`${id}-hint`} className="sr-only">
          Press and hold, or right-click, for {ariaLabel.toLowerCase()}. From the keyboard, press Shift F10.
        </span>
      </div>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] touch-none select-none"
            onPointerDown={(event) => {
              if ((event.target as Element).closest("[data-item]")) return;
              const o = openRef.current;
              if (o && Math.hypot(event.clientX - o.cx, event.clientY - o.cy) < span - 10) return;
              close(false);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              const r = areaRef.current?.getBoundingClientRect();
              if (
                r &&
                event.clientX >= r.left &&
                event.clientX <= r.right &&
                event.clientY >= r.top &&
                event.clientY <= r.bottom
              )
                openAt(event.clientX, event.clientY, "click");
              else close(false);
            }}
          >
            <style href="miyuki-ripple-menu" precedence="miyuki">
              {keyframes}
            </style>
            <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: open.cx, top: open.cy }}>
              <div
                className={cn(
                  "absolute top-0 left-0 rounded-full bg-popover/70 backdrop-blur-[6px] dark:bg-popover/75",
                  "[mask-image:radial-gradient(closest-side,#000_70%,transparent)]",
                  "transition-[transform,opacity] duration-300 ease-settle motion-reduce:transition-opacity",
                  live ? "opacity-100" : "opacity-0",
                )}
                style={{
                  width: span * 2 + 40,
                  height: span * 2 + 40,
                  transform: `translate(-50%, -50%) scale(${live ? 1 : 0.4})`,
                }}
              />
              {open.radii.map((r, i) => (
                <div
                  key={r}
                  className={cn(
                    "absolute top-0 left-0 rounded-full border border-dashed border-border-strong",
                    "transition-[transform,opacity] duration-[420ms] ease-settle motion-reduce:transition-opacity",
                    live ? "opacity-100" : "opacity-0",
                  )}
                  style={{
                    width: r * 2,
                    height: r * 2,
                    transform: `translate(-50%, -50%) scale(${live ? 1 : 0.3})`,
                    transitionDelay: live ? `${40 + i * 80}ms` : "0ms",
                  }}
                />
              ))}
              {[0, 1, 2].map((i) => (
                <div
                  key={`${open.key}-${i}`}
                  className="absolute top-0 left-0 rounded-full border-[1.5px] border-brand opacity-0 motion-reduce:hidden"
                  style={{
                    width: span * 2,
                    height: span * 2,
                    animation: `miyuki-ripple-menu-ripple 900ms cubic-bezier(0.22,1,0.36,1) ${i * 130}ms both`,
                  }}
                />
              ))}
              <div
                className={cn(
                  "absolute top-0 left-0 size-2.5 -translate-1/2 rounded-full bg-brand ring-4 ring-brand/20 transition-opacity duration-200",
                  live ? "opacity-100" : "opacity-0",
                )}
              />
              {highlighted && live && (
                <svg className="absolute overflow-visible" style={{ left: 0, top: 0 }} width={1} height={1}>
                  <path
                    d={(() => {
                      const r = open.radii[highlighted.ring];
                      const half = (highlighted.size / 2 + 14) / r;
                      const a0 = highlighted.angle - half;
                      const a1 = highlighted.angle + half;
                      return `M${Math.cos(a0) * r} ${Math.sin(a0) * r}A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}`;
                    })()}
                    fill="none"
                    className="stroke-brand"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={Math.cos(highlighted.angle) * (open.radii[highlighted.ring] - highlighted.size / 2 - 4)}
                    y2={Math.sin(highlighted.angle) * (open.radii[highlighted.ring] - highlighted.size / 2 - 4)}
                    className="stroke-brand/50"
                    strokeWidth={1.5}
                    strokeDasharray="2 4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div
              ref={menuRef}
              role="menu"
              aria-label={ariaLabel}
              tabIndex={-1}
              onKeyDown={onMenuKey}
              className="absolute inset-0 outline-none"
            >
              {open.placed.map((p, i) => {
                const isActive = p.item.id === active;
                const isChosen = p.item.id === chosen;
                const destructive = p.item.tone === "destructive";
                const c = Math.cos(p.angle);
                const s = Math.sin(p.angle);
                const delay = p.ring * 90 + (i % 5) * 22;
                return (
                  <div
                    key={p.item.id}
                    data-item={p.item.id}
                    role="menuitem"
                    tabIndex={isActive ? 0 : -1}
                    aria-label={p.item.label}
                    onClick={() => choose(p.item.id)}
                    onFocus={() => setActive(p.item.id)}
                    className={cn(
                      "group/item absolute top-0 left-0 cursor-default rounded-full outline-none",
                      "transition-[transform,opacity] motion-reduce:transition-opacity",
                      live ? "opacity-100" : "opacity-0",
                    )}
                    style={
                      {
                        width: p.size,
                        height: p.size,
                        transform: live
                          ? `translate(${p.x - p.size / 2}px, ${p.y - p.size / 2}px) scale(${isActive ? 1.08 : 1})`
                          : `translate(${open.cx - p.size / 2 + (p.x - open.cx) * (closing ? 0.7 : 0.15)}px, ${open.cy - p.size / 2 + (p.y - open.cy) * (closing ? 0.7 : 0.15)}px) scale(0.5)`,
                        transitionDuration: closing ? "140ms" : isActive ? "180ms" : "460ms",
                        transitionTimingFunction: closing ? "ease-in" : "cubic-bezier(0.34, 1.36, 0.64, 1)",
                        transitionDelay: live && !isActive ? `${delay}ms` : "0ms",
                      } as CSSProperties
                    }
                  >
                    <span
                      className={cn(
                        "flex size-full items-center justify-center rounded-full border shadow-md transition-colors duration-150 [&_svg]:size-[18px]",
                        isActive
                          ? destructive
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-brand bg-brand text-brand-foreground"
                          : cn("border-border bg-popover", destructive ? "text-destructive" : "text-foreground"),
                        "group-focus-visible/item:ring-[3px] group-focus-visible/item:ring-ring",
                      )}
                    >
                      {p.item.icon}
                    </span>
                    {isChosen && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 size-full rounded-full border-2 border-brand motion-reduce:hidden"
                        style={{ animation: "miyuki-ripple-menu-pulse 360ms ease-out both" }}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute rounded-md border px-2 py-[3px] text-xs leading-[18px] font-medium whitespace-nowrap shadow-sm transition-colors duration-150",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-popover/95 text-foreground",
                      )}
                      style={{
                        left: p.size / 2 + c * (p.size / 2 + 6),
                        top: p.size / 2 + s * (p.size / 2 + 6),
                        transform: `translate(${((c - 1) / 2) * 100}%, ${((s - 1) / 2) * 100}%)`,
                      }}
                    >
                      {p.item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
