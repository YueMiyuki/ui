import { DEFAULT_LOCALE, isLocale, type Locale } from "@/site/i18n/config";

const outside = new Set([
  "_next",
  "_vercel",
  "api",
  "r",
  "art",
  "thumbs",
  "preview",
  "thumb",
  "review",
  "opengraph-image",
  "twitter-image",
  "icon",
  "apple-icon",
]);

function split(href: string): [string, string] {
  const at = href.search(/[?#]/);
  return at === -1 ? [href, ""] : [href.slice(0, at), href.slice(at)];
}

export function localeOf(pathname: string): Locale {
  const first = split(pathname)[0].split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function stripLocale(pathname: string): string {
  const [path, rest] = split(pathname);
  const first = path.split("/")[1];
  if (!isLocale(first)) return pathname;
  return (path.slice(first.length + 1) || "/") + rest;
}

export function localeHref(locale: Locale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [path, rest] = split(href);
  if (outside.has(path.split("/")[1] ?? "") || /\.[^/]*$/.test(path)) return href;
  const bare = stripLocale(path);
  if (locale === DEFAULT_LOCALE) return bare + rest;
  return (bare === "/" ? `/${locale}` : `/${locale}${bare}`) + rest;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export function localeAlternates(locale: Locale, path: string) {
  const en = localeHref("en", path);
  return {
    canonical: localeHref(locale, path),
    languages: { en, "zh-CN": localeHref("zh", path), "x-default": en },
  };
}
