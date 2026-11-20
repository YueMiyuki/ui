"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { RibbonTrail } from "@/components/miyuki-ui/ribbon-trail";

const flourish = [
  [0.06, 0.84],
  [0.22, 0.56],
  [0.4, 0.36],
  [0.57, 0.46],
  [0.5, 0.63],
  [0.4, 0.48],
  [0.55, 0.27],
  [0.85, 0.18],
];

function along(t: number, end: number) {
  const n = flourish.length - 1;
  const u = Math.min(n - 1e-6, t * n);
  const i = Math.floor(u);
  const f = u - i;
  const [a, b, c, d] = [i - 1, i, i + 1, i + 2].map((k) => (k >= n ? [end, flourish[n][1]] : flourish[Math.max(0, k)]));
  return [0, 1].map(
    (k) =>
      b[k] +
      0.5 * f * (c[k] - a[k] + f * (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k] + f * (3 * b[k] - a[k] - 3 * c[k] + d[k]))),
  );
}

export default function RibbonTrailDemo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = Math.min(1, Math.max(0, (now - start - 300) / 1900));
      const box = root.getBoundingClientRect();
      const [x, y] = along(1 - (1 - t) ** 2.4, box.width < 560 ? 1 - 20 / box.width : 0.85);
      const at = { clientX: box.left + x * box.width, clientY: box.top + y * box.height };
      root.dispatchEvent(new PointerEvent("pointermove", { ...at, bubbles: true, pointerId: 9, pointerType: "mouse" }));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const stop = (e: PointerEvent) => e.isTrusted && cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    root.addEventListener("pointermove", stop);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", stop);
    };
  }, []);

  return (
    <RibbonTrail
      ref={ref}
      className="grid h-[360px] w-full max-w-[720px] place-items-center overflow-clip rounded-3xl border border-border bg-muted/70 px-8"
    >
      <div className="flex flex-col items-center text-center">
        <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">Draw with the pointer.</h3>
        <p className="mt-2 max-w-[34ch] text-sm text-muted-foreground">
          The ribbon follows, turns over, and comes to rest.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button>Order a sample</Button>
          <Button variant="secondary">See all colours</Button>
        </div>
      </div>
    </RibbonTrail>
  );
}
