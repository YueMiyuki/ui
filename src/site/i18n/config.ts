export const LOCALES = ["en", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "miyuki-locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };

export const LOCALE_NAMES: Record<Locale, { text: string; label?: string }> = {
  en: { text: "EN", label: "English" },
  zh: { text: "中文" },
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}
