"use client";

import { useEffect } from "react";

function apply(theme: string | null) {
  const dark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function PreviewTheme() {
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced === "light" || forced === "dark") {
      apply(forced);
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === "miyuki-theme" || event.key === null) apply(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
