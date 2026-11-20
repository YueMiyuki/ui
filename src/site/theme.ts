export type SiteTheme = "light" | "dark" | "ink";

export const THEME_STORAGE_KEY = "miyuki-theme";

export const themeNames: Record<SiteTheme, string> = { light: "Light", dark: "Night", ink: "Dark" };

export function isSiteTheme(value: unknown): value is SiteTheme {
  return value === "light" || value === "dark" || value === "ink";
}

export function storedTheme(value: string | null): SiteTheme {
  if (isSiteTheme(value)) return value;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function documentTheme(): SiteTheme {
  const classes = document.documentElement.classList;
  if (!classes.contains("dark")) return "light";
  return classes.contains("ink") ? "ink" : "dark";
}

export function applyTheme(theme: SiteTheme, { freeze = true }: { freeze?: boolean } = {}) {
  const root = document.documentElement;
  const still = freeze ? document.createElement("style") : null;
  if (still) {
    still.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(still);
  }
  root.classList.toggle("dark", theme !== "light");
  root.classList.toggle("ink", theme === "ink");
  if (still) {
    void getComputedStyle(root).opacity;
    requestAnimationFrame(() => still.remove());
  }
}
