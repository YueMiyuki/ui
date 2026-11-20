"use client";

import Link from "next/link";
import { useState } from "react";
import { useDictionary, useLocale } from "@/site/i18n/context";
import { localeHref } from "@/site/i18n/href";
import { Wordmark } from "@/site/mark";

export function HomeLink() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const locale = useLocale();
  const t = useDictionary();

  return (
    <Link
      href={localeHref(locale, "/")}
      aria-label={t.nav.home}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="-mx-1 rounded-md px-1 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Wordmark melted={hovered || focused} />
    </Link>
  );
}
