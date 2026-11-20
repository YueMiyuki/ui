"use client";

import { useEffect } from "react";
import { applyTheme, isSiteTheme, storedTheme, THEME_STORAGE_KEY } from "@/site/theme";

export function PreviewTheme() {
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (isSiteTheme(forced)) {
      applyTheme(forced, { freeze: false });
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null)
        applyTheme(storedTheme(event.newValue), { freeze: false });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
