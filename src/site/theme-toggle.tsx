"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "react-aria-components";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/site/i18n/context";
import { fill } from "@/site/i18n/format";
import { iconButtonClass } from "@/site/icon-button";
import { applyTheme, documentTheme, type SiteTheme, storedTheme, THEME_STORAGE_KEY } from "@/site/theme";

const nextTheme: Record<SiteTheme, SiteTheme> = { light: "dark", dark: "ink", ink: "light" };
const shapeOf: Record<SiteTheme, "sun" | "moon" | "disc"> = { light: "sun", dark: "moon", ink: "disc" };

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useTheme() {
  return useSyncExternalStore<SiteTheme | "unknown">(subscribe, documentTheme, () => "unknown");
}

function setTheme(theme: SiteTheme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const shapes = morphIcons.sunMoonDisc;
  const t = useDictionary().theme;
  const label = theme === "unknown" ? t.switch : fill(t.state, { current: t[theme], next: t[nextTheme[theme]] });

  return (
    <TooltipTrigger>
      <Button
        aria-label={label}
        onPress={() => setTheme(nextTheme[documentTheme()])}
        className={iconButtonClass(cn("size-9", className))}
      >
        {theme === "unknown" ? (
          <>
            <MorphIcon shapes={shapes} shape="sun" className="dark:hidden" />
            <MorphIcon shapes={shapes} shape="moon" className="hidden dark:block ink:hidden" />
            <MorphIcon shapes={shapes} shape="disc" className="hidden ink:block" />
          </>
        ) : (
          <MorphIcon shapes={shapes} shape={shapeOf[theme]} />
        )}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}

export function ThemeSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) applyTheme(storedTheme(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
