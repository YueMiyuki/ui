"use client";

import { useSyncExternalStore } from "react";
import { Button } from "react-aria-components";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import { iconButtonClass } from "@/site/icon-button";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useTheme() {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "unknown",
  );
}

function setTheme(next: "light" | "dark") {
  const root = document.documentElement;
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);
  root.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("miyuki-theme", next);
  } catch {}
  void getComputedStyle(root).opacity;
  requestAnimationFrame(() => freeze.remove());
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const shapes = morphIcons.sunMoon;

  return (
    <Button
      aria-label="Switch theme"
      onPress={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      className={iconButtonClass(cn("size-9", className))}
    >
      {theme === "unknown" ? (
        <>
          <MorphIcon shapes={shapes} shape="sun" className="dark:hidden" />
          <MorphIcon shapes={shapes} shape="moon" className="hidden dark:block" />
        </>
      ) : (
        <MorphIcon shapes={shapes} shape={theme === "dark" ? "moon" : "sun"} />
      )}
    </Button>
  );
}
