import type { Locale } from "@/site/i18n/config";
import { type Dictionary, en } from "@/site/i18n/en";
import { zh } from "@/site/i18n/zh";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { en, zh };
