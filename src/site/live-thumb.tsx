"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DemoSurface, previewUrl } from "@/site/demo-surface";
import { useDictionary } from "@/site/i18n/context";
import { fill } from "@/site/i18n/format";
import { LAND_EVENT } from "@/site/intent";
import type { ItemSummary } from "@/site/registry";
import { ThumbFrame } from "@/site/thumb-frame";
import { thumbSize } from "@/site/thumb-size";

type ThumbPlayMode = "hover" | "always";

export function LiveThumb({ item, play = "hover" }: { item: ItemSummary; play?: ThumbPlayMode }) {
  return play === "always" ? <AlwaysLive item={item} /> : <HoverLive item={item} />;
}

function AlwaysLive({ item }: { item: ItemSummary }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([entry]) => entry.isIntersecting && setActive(true), {
      rootMargin: "480px 0px",
    });
    const far = new IntersectionObserver(([entry]) => !entry.isIntersecting && setActive(false), {
      rootMargin: "1800px 0px",
    });
    near.observe(el);
    far.observe(el);
    return () => {
      near.disconnect();
      far.disconnect();
    };
  }, []);

  const { slug, firstDemo, preview } = item;
  const t = useDictionary().demo;

  return (
    <div ref={ref} className="absolute inset-0">
      {active ? (
        <div
          inert
          className="pointer-events-none absolute top-0 left-0 h-[200%] w-[200%] select-none"
          style={{ transform: "scale(0.5)", transformOrigin: "0 0" }}
        >
          {preview.iframe ? (
            <iframe
              src={previewUrl(slug, firstDemo)}
              title={fill(t.previewTitle, { name: item.name })}
              tabIndex={-1}
              loading="lazy"
              className="block size-full border-0 bg-transparent"
            />
          ) : (
            <DemoSurface slug={slug} demo={firstDemo} layout={preview.layout} className="size-full" />
          )}
        </div>
      ) : null}
    </div>
  );
}

const REST_MS = 120;
const LAND_MS = 60;
const REST_PX = 6;
const SCROLL_QUIET_MS = 300;
const FADE_OUT_MS = 160;

let lastScroll = -Infinity;
let watchingScroll = false;

function watchScroll() {
  if (watchingScroll) return;
  watchingScroll = true;
  const mark = () => {
    lastScroll = performance.now();
  };
  window.addEventListener("scroll", mark, { capture: true, passive: true });
}

type Live = { phase: "off" | "loading" | "on" | "leaving"; run: number; scale: number };

function HoverLive({ item }: { item: ItemSummary }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Live>({ phase: "off", run: 0, scale: 1 });
  const { width, height } = thumbSize(item);
  const active = live.phase !== "off";

  useEffect(() => {
    const el = ref.current;
    const tile = el?.closest<HTMLElement>("[data-thumb-tile]") ?? el?.parentElement;
    if (!el || !tile) return;
    watchScroll();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let restTimer = 0;
    let leaveTimer = 0;
    let x = 0;
    let y = 0;
    let hovering = false;
    let focused = false;
    let landed = false;

    const start = () => {
      window.clearTimeout(leaveTimer);
      const scale = Math.max(el.clientWidth / width, el.clientHeight / height);
      setLive((s) =>
        s.phase === "off"
          ? { phase: "loading", run: s.run + 1, scale }
          : s.phase === "leaving"
            ? { ...s, phase: "on" }
            : s,
      );
    };
    const stop = () => {
      if (hovering || focused) return;
      window.clearTimeout(restTimer);
      setLive((s) =>
        s.phase === "loading" ? { ...s, phase: "off" } : s.phase === "on" ? { ...s, phase: "leaving" } : s,
      );
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(
        () => setLive((s) => (s.phase === "leaving" ? { ...s, phase: "off" } : s)),
        FADE_OUT_MS,
      );
    };
    const settle = () => {
      const quiet = performance.now() - lastScroll;
      if (quiet < SCROLL_QUIET_MS) {
        restTimer = window.setTimeout(settle, SCROLL_QUIET_MS - quiet);
        return;
      }
      if (!reduced.matches) start();
    };
    const rest = () => {
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(settle, REST_MS);
    };
    const usable = (event: PointerEvent) => event.pointerType === "mouse" || event.pointerType === "pen";

    const onEnter = (event: PointerEvent) => {
      if (!usable(event)) return;
      hovering = true;
      x = event.clientX;
      y = event.clientY;
      rest();
    };
    const onMove = (event: PointerEvent) => {
      if (!usable(event) || !hovering || landed) return;
      if (Math.hypot(event.clientX - x, event.clientY - y) < REST_PX) return;
      x = event.clientX;
      y = event.clientY;
      rest();
    };
    const onLeave = (event: PointerEvent) => {
      if (!usable(event)) return;
      hovering = false;
      landed = false;
      stop();
    };
    const onLand = () => {
      if (!hovering || reduced.matches || performance.now() - lastScroll < SCROLL_QUIET_MS) return;
      landed = true;
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(settle, LAND_MS);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(":focus-visible")) return;
      focused = true;
      rest();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && tile.contains(event.relatedTarget)) return;
      focused = false;
      stop();
    };

    tile.addEventListener("pointerenter", onEnter);
    tile.addEventListener("pointermove", onMove);
    tile.addEventListener("pointerleave", onLeave);
    tile.addEventListener(LAND_EVENT, onLand);
    tile.addEventListener("focusin", onFocusIn);
    tile.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(restTimer);
      window.clearTimeout(leaveTimer);
      tile.removeEventListener("pointerenter", onEnter);
      tile.removeEventListener("pointermove", onMove);
      tile.removeEventListener("pointerleave", onLeave);
      tile.removeEventListener(LAND_EVENT, onLand);
      tile.removeEventListener("focusin", onFocusIn);
      tile.removeEventListener("focusout", onFocusOut);
    };
  }, [width, height]);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const observer = new ResizeObserver(() => {
      const scale = Math.max(el.clientWidth / width, el.clientHeight / height);
      setLive((s) => (s.scale === scale ? s : { ...s, scale }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, width, height]);

  const ready = (run: number) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setLive((s) => (s.run === run && s.phase === "loading" ? { ...s, phase: "on" } : s))),
    );
  };

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {active ? (
        <div
          data-thumb-live={live.phase}
          className={cn(
            "absolute inset-0 transition-opacity ease-settle",
            live.phase === "on" ? "opacity-100 duration-200" : "opacity-0 duration-[120ms]",
          )}
        >
          <ThumbFrame key={live.run} item={item} scale={live.scale} onReady={() => ready(live.run)} />
        </div>
      ) : null}
    </div>
  );
}
