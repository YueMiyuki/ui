"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { HTML_LANG, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_NAMES, type Locale } from "@/site/i18n/config";
import { useLocale } from "@/site/i18n/context";
import { localeHref, otherLocale } from "@/site/i18n/href";

function remember(locale: Locale) {
  // biome-ignore lint/suspicious/noDocumentCookie: the choice must be stored before the click navigates, and the async Cookie Store API is missing in some browsers
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

function SwitchLink({ target, href, className }: { target: Locale; href: string; className?: string }) {
  const router = useRouter();
  const name = LOCALE_NAMES[target];
  return (
    <Link
      href={href}
      prefetch={false}
      lang={HTML_LANG[target]}
      hrefLang={HTML_LANG[target]}
      aria-label={name.label}
      data-locale-switch=""
      onClick={(event) => {
        remember(target);
        const full = localeHref(target, window.location.pathname) + window.location.search + window.location.hash;
        if (full === href) return;
        event.preventDefault();
        router.push(full);
      }}
      className={cn(
        "inline-flex h-9 shrink-0 cursor-default items-center rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring data-[aim]:text-foreground",
        className,
      )}
    >
      {name.text}
    </Link>
  );
}

function CurrentSwitch({ target, className }: { target: Locale; className?: string }) {
  return <SwitchLink target={target} href={localeHref(target, usePathname() ?? "/")} className={className} />;
}

export function LanguageSwitch({ className }: { className?: string }) {
  const target = otherLocale(useLocale());
  return (
    <Suspense fallback={<SwitchLink target={target} href={localeHref(target, "/")} className={className} />}>
      <CurrentSwitch target={target} className={className} />
    </Suspense>
  );
}
