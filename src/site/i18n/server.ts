import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/site/i18n/config";
import { dictionaries } from "@/site/i18n/dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
