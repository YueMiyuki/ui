"use client";

import { createContext, type ReactNode, use, useMemo } from "react";
import type { Locale } from "@/site/i18n/config";
import { type Dictionary, en } from "@/site/i18n/en";

const LocaleContext = createContext<{ locale: Locale; dictionary: Dictionary }>({ locale: "en", dictionary: en });

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale() {
  return use(LocaleContext).locale;
}

export function useDictionary() {
  return use(LocaleContext).dictionary;
}
