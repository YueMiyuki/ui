"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";

const css = "[data-idle] *,[data-idle] *::before,[data-idle] *::after{animation-play-state:paused!important}";

export function IdleStyle() {
  return (
    <style href="miyuki-home-idle" precedence="miyuki">
      {css}
    </style>
  );
}

export function useIdleOffscreen<T extends HTMLElement>(margin = "160px 0px") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => el.toggleAttribute("data-idle", !entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return ref;
}

export function IdleSection({ children, ...props }: ComponentPropsWithoutRef<"section">) {
  const ref = useIdleOffscreen<HTMLElement>();
  return (
    <section ref={ref} {...props}>
      <IdleStyle />
      {children}
    </section>
  );
}
