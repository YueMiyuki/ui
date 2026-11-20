import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import "../globals.css";
import { zhFontStyle } from "@/site/fonts/pixel-cjk";
import { HTML_LANG, isLocale, LOCALES } from "@/site/i18n/config";
import { LocaleProvider } from "@/site/i18n/context";
import { dictionaries } from "@/site/i18n/dictionaries";
import { siteMetadata } from "@/site/i18n/metadata";
import { getLocale } from "@/site/i18n/server";
import { ArtRaster, rootClassName, ThemeScript } from "@/site/root-document";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return siteMetadata(await getLocale());
}

export default async function LocaleLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return (
    <html
      lang={HTML_LANG[locale]}
      data-scroll-behavior="smooth"
      className={rootClassName}
      style={locale === "zh" ? zhFontStyle : undefined}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <LocaleProvider locale={locale} dictionary={dictionaries[locale]}>
          {children}
        </LocaleProvider>
        <ArtRaster />
      </body>
    </html>
  );
}
