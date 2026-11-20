"use client";

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useRouter } from "next/navigation";
import { usePointerIntent } from "@/components/miyuki-ui/pointer-intent";
import { preloadDemo } from "@/site/demo-mount";

export const LAND_EVENT = "miyuki:land";

const fetched = new Set<string>();

function routeOf(link: HTMLAnchorElement) {
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href);
  if (url.origin !== location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return null;
  const route = url.pathname + url.search;
  return route === location.pathname + location.search ? null : route;
}

export function SiteIntent() {
  const router = useRouter();
  const warm = (element: Element) => {
    if (!(element instanceof HTMLAnchorElement) || element.hasAttribute("data-locale-switch")) return;
    const demo = element.dataset.thumbDemo;
    if (demo) preloadDemo(demo);
    const route = routeOf(element);
    if (!route || fetched.has(route)) return;
    fetched.add(route);
    router.prefetch(route, { kind: PrefetchKind.FULL });
  };
  usePointerIntent({
    selector: 'a[href^="/"]',
    onAim(element) {
      if (!element.closest("#nd-sidebar")) warm(element);
    },
    onIntent(element, { source }) {
      warm(element);
      if (source === "hover" && element instanceof HTMLAnchorElement && element.dataset.thumbDemo)
        element.dispatchEvent(new CustomEvent(LAND_EVENT, { bubbles: true }));
    },
  });
  return null;
}
